import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  makeGame,
  stepGame,
  safeInput,
  STEP,
  FixedClock,
  LIMBS,
} from "../../public/lab/fight/controller.js";
import {
  handFeatures,
  mapHand,
  forwardDisplacement,
  thumbMovement,
} from "../../public/lab/fight/puppet.js";
import {
  loadAnatomy,
  AnatomyFighter,
  solveTwoLink,
} from "../../public/lab/fight/rig.js";
import * as T from "../../public/lab/fight/vendor/three.module.js";
const neutral = {
  x: 0.5,
  y: 0.5,
  size: 0.15,
  tilt: 0,
  thumb: 0,
  fingers: Array.from({ length: 4 }, () => ({ curl: 0, spread: 0 })),
};
const pose = (x = 0.5, curls = [0, 0, 0, 0]) => ({
  ...neutral,
  x,
  fingers: curls.map((curl) => ({ curl, spread: 0 })),
});
function run(g, input, n = 30) {
  for (let i = 0; i < n; i++) stepGame(g, input);
  return g;
}

test("direction: left fighter punches right; right fighter punches left; retreat never becomes a punch", () => {
  for (const facing of [1, -1]) {
    const forward = mapHand(pose(0.5 + 0.13 * facing), neutral, { facing });
    const back = mapHand(pose(0.5 - 0.13 * facing), neutral, { facing });
    assert.ok(forward.limbs.lead.extension > 0.9);
    assert.equal(back.limbs.lead.extension, 0);
  }
  assert.equal(forwardDisplacement(0.2, -1), -0.2);
});
test("mirroring changes input once, consistently with the preview", () => {
  for (const facing of [1, -1]) {
    const raw = mapHand(pose(0.62), neutral, { facing, mirrored: false });
    const mirrored = mapHand(pose(0.38), neutral, { facing, mirrored: true });
    assert.deepEqual(raw, mirrored);
  }
});
test("index and middle move separate arm channels; curled finger can retract even at full palm reach", () => {
  const left = mapHand(pose(0.64, [0, 1, 0, 0]), neutral);
  const right = mapHand(pose(0.64, [1, 0, 0, 0]), neutral);
  assert.ok(left.limbs.lead.extension > 0.9);
  assert.ok(left.limbs.rear.extension < 0.1);
  assert.ok(right.limbs.rear.extension > 0.9);
  assert.ok(right.limbs.lead.extension < 0.1);
  const g = run(makeGame(), left);
  assert.ok(g.fighters[0].limbs.lead.extension > 0.9);
  assert.ok(g.fighters[0].limbs.rear.extension < 0.1);
});
test("ring and little select independent leg targets, with one grounded support even when both curl", () => {
  for (const [curls, selected, support] of [
    [[0, 0, 1, 0], "kick", "right"],
    [[0, 0, 0, 1], "rearKick", "left"],
  ]) {
    const input = mapHand(pose(0.64, curls), neutral),
      g = run(makeGame(), input);
    assert.equal(g.fighters[0].activeLeg, selected);
    assert.equal(g.fighters[0].contact, support);
    assert.ok(g.fighters[0].limbs[selected].extension > 0.9);
  }
  const g = run(makeGame(), mapHand(pose(0.64, [0, 0, 1, 1]), neutral));
  assert.ok(
    g.fighters[0].limbs.kick.lift === 0 ||
      g.fighters[0].limbs.rearKick.lift === 0,
  );
});
test("thumb drag is screen-relative on either fighter; releasing stops it", () => {
  for (const index of [0, 1]) {
    const g = makeGame(index),
      f = g.fighters[index],
      x = f.x;
    run(g, { active: true, move: thumbMovement(60, f.facing) }, 8);
    assert.ok(f.x > x);
    const moved = f.x;
    run(g, { active: true, move: 0 }, 10);
    assert.equal(f.x, moved);
    run(g, { active: true, move: thumbMovement(-60, f.facing) }, 8);
    assert.ok(f.x < moved);
  }
});
test("right-side ownership sends human control to the right fighter", () => {
  const g = run(makeGame(1), { active: true, extension: 1, limb: "rear" });
  assert.equal(g.fighters[0].extension, 0);
  assert.equal(g.fighters[1].limbs.rear.extension, 1);
});
test("tracking loss fades all limbs to guard without teleporting", () => {
  const g = run(makeGame(), mapHand(pose(0.64, [0, 0, 1, 1]), neutral));
  const before = g.fighters[0].limbs.lead.extension;
  stepGame(g, { active: false });
  assert.ok(before - g.fighters[0].limbs.lead.extension <= 9 * STEP + 1e-9);
  run(g, { active: false });
  assert.equal(g.fighters[0].guard, true);
  for (const p of Object.values(g.fighters[0].limbs)) {
    assert.equal(p.extension, 0);
    assert.equal(p.lift, 0);
  }
  assert.equal(
    safeInput({ active: true, extension: NaN }).limbs.lead.extension,
    0,
  );
});
test("one extension damages once; independent arms can combo; retraction rearms", () => {
  const g = makeGame();
  g.fighters[0].x = -0.3;
  g.fighters[1].x = 0.3;
  const punch = {
    active: true,
    limbs: { lead: { extension: 1 }, rear: { extension: 1 } },
  };
  run(g, punch, 90);
  assert.equal(g.fighters[0].landed, 2);
  assert.equal(g.fighters[1].health, 88);
  run(g, { active: true });
  run(g, punch);
  assert.equal(g.fighters[0].landed, 4);
});
test("guard reduces incoming damage with the same AI rules", () => {
  const a = makeGame(),
    b = makeGame();
  for (const g of [a, b]) {
    g.mode = "spar";
    g.fighters[0].x = -0.3;
    g.fighters[1].x = 0.3;
  }
  run(a, { active: true, guard: true }, 120);
  run(b, { active: true }, 120);
  assert.ok(a.fighters[0].health > b.fighters[0].health);
});
test("30,000 hostile inputs retain finite bounded state, limb speeds and fighter separation", () => {
  const g = makeGame();
  g.mode = "spar";
  let seed = 7;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 30000; i++) {
    if (g.ended) {
      g.ended = false;
      g.fighters.forEach((f) => (f.health = 100));
    }
    const before = g.fighters.map((f) =>
      LIMBS.map((n) => f.limbs[n].extension),
    );
    stepGame(g, {
      active: random() > 0.1,
      move: (random() - 0.5) * 50,
      lean: Infinity,
      twist: NaN,
      crouch: 200,
      limbs: Object.fromEntries(
        LIMBS.map((n) => [
          n,
          {
            extension: (random() - 0.5) * 40,
            aim: (random() - 0.5) * 50,
            spread: random() * 50,
            bend: random(),
            lift: random(),
          },
        ]),
      ),
    });
    assert.ok(g.fighters[1].x - g.fighters[0].x >= 0.57 - 1e-9);
    g.fighters.forEach((f, j) => {
      assert.ok(f.x >= -1.45 && f.x <= 1.45);
      assert.ok(f.crouch <= 0.2);
      assert.equal("y" in f, false);
      LIMBS.forEach((name, k) => {
        const p = f.limbs[name];
        assert.ok(
          Object.values(p).every(
            (v) => typeof v !== "number" || Number.isFinite(v),
          ),
        );
        assert.ok(Math.abs(p.extension - before[j][k]) <= 9 * STEP + 1e-9);
      });
    });
  }
});
test("a backgrounded minute cannot replay delayed attacks", () => {
  const c = new FixedClock();
  let n = 0;
  c.advance(0, () => n++);
  c.advance(60000, () => n++);
  assert.ok(n <= 5);
  c.reset();
  assert.equal(
    c.advance(61000, () => n++),
    0,
  );
});
test("landmark validation tolerates a clipped fingertip but rejects an offscreen palm", () => {
  assert.equal(handFeatures(null), null);
  assert.equal(handFeatures([]), null);
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[0].y = 0.7;
  assert.ok(handFeatures(lm));
  lm[4].x = 1.05;
  assert.ok(handFeatures(lm));
  lm[9].x = 1.1;
  assert.equal(handFeatures(lm), null);
});
test("two-link solve preserves bone lengths for unreachable and zero-distance targets", () => {
  const start = new T.Vector3(0, 1, 0);
  for (const target of [
    start.clone(),
    new T.Vector3(100, 100, -100),
    new T.Vector3(0, -100, 0),
  ]) {
    const r = solveTwoLink(
      start,
      target,
      new T.Vector3(0.5, 0.5, 1),
      0.27,
      0.23,
    );
    assert.ok(Math.abs(r.middle.distanceTo(start) - 0.27) < 1e-8);
    assert.ok(Math.abs(r.end.distanceTo(r.middle) - 0.23) < 1e-8);
  }
});
test("actual anatomy remains finite and supported across 288 puppet pose combinations", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (url) =>
    new Response(
      await fs.readFile(
        new URL("../../public/lab/fight/" + url, import.meta.url),
      ),
    );
  try {
    const rig = new AnatomyFighter(await loadAnatomy(), 0x993333);
    let min = Infinity,
      max = -Infinity,
      count = 0;
    for (const side of [0, 1])
      for (const gap of [0.57, 0.85, 2])
        for (const name of LIMBS)
          for (const aim of [0.65, 1.3, 1.8])
            for (const crouch of [0, 0.2])
              for (const ext of [0.3, 1]) {
                const g = makeGame(side),
                  f = g.fighters[side];
                run(g, {
                  active: true,
                  crouch,
                  lean: 0.28,
                  twist: 0.35,
                  limbs: {
                    [name]: {
                      extension: ext,
                      lift: ext,
                      aim,
                      spread: -0.8,
                      bend: 0.3,
                    },
                  },
                });
                rig.update(f, gap);
                rig.skeleton.update();
                for (const [a, b] of [
                  [7, 8],
                  [8, 9],
                  [11, 12],
                  [12, 13],
                  [14, 15],
                  [15, 16],
                  [18, 19],
                  [19, 20],
                ])
                  assert.ok(
                    Math.abs(
                      rig.position(a).distanceTo(rig.position(b)) -
                        rig.offsets[b].length(),
                    ) < 1e-6,
                  );
                const support = f.activeLeg === "rearKick" ? 16 : 20;
                assert.ok(Math.abs(rig.position(support).y - 0.095) < 1e-5);
                rig.mesh.computeBoundingBox();
                const box = rig.mesh.boundingBox;
                assert.ok(Number.isFinite(box.min.x));
                assert.ok(box.max.y < 2.1);
                assert.ok(box.min.y > -0.1);
                min = Math.min(min, box.min.y);
                max = Math.max(max, box.max.y);
                count++;
              }
    console.log("Anatomy puppet bounds:", { count, minY: min, maxY: max });
  } finally {
    globalThis.fetch = old;
  }
});

test("wrist lean follows fighter facing and preview mirroring without angle-wrap jumps", () => {
  const a = { ...pose(), tilt: 0.4 };
  assert.ok(mapHand(a, neutral, { facing: 1 }).lean > 0);
  assert.ok(mapHand(a, neutral, { facing: -1 }).lean < 0);
  assert.ok(mapHand(a, neutral, { facing: 1, mirrored: true }).lean < 0);
  assert.ok(
    Math.abs(
      mapHand(
        { ...pose(), tilt: -Math.PI + 0.01 },
        { ...neutral, tilt: Math.PI - 0.01 },
      ).lean,
    ) < 0.01,
  );
});
