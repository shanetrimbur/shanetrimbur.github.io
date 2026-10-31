import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  makeGame,
  stepGame,
  safeInput,
  STEP,
  FixedClock,
} from "../../public/lab/fight/controller.js";
import { handFeatures } from "../../public/lab/fight/tracking.js";
import {
  loadAnatomy,
  AnatomyFighter,
  solveTwoLink,
} from "../../public/lab/fight/rig.js";
import * as T from "../../public/lab/fight/vendor/three.module.js";

test("hostile input cannot change root height, escape arena, or cross fighters", () => {
  const game = makeGame();
  game.mode = "spar";
  let seed = 1234;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 30000; i++) {
    if (game.ended)
      game.fighters.forEach((f) => (f.health = 100)), (game.ended = false);
    const last = game.fighters.map((f) => f.extension);
    stepGame(
      game,
      {
        active: random() > 0.1,
        extension: (random() - 0.5) * 20,
        aim: (random() - 0.5) * 100,
        lean: Infinity,
        move: (random() - 0.5) * 500,
        limb: ["lead", "rear", "kick", "bad"][i % 4],
      },
      STEP,
    );
    assert.ok(game.fighters[1].x - game.fighters[0].x >= 0.57 - 1e-10);
    game.fighters.forEach((f, j) => {
      for (const key of ["x", "extension", "aim", "lean", "health"])
        assert.ok(Number.isFinite(f[key]));
      assert.ok(f.x >= -1.45 && f.x <= 1.45);
      assert.ok(f.extension >= 0 && f.extension <= 1);
      assert.ok(Math.abs(f.extension - last[j]) <= 4.8 * STEP + 1e-9);
      assert.equal("y" in f, false);
    });
  }
});
test("tracking loss guards and retracts; changing limb cannot teleport extension", () => {
  const game = makeGame();
  for (let i = 0; i < 30; i++)
    stepGame(game, { active: true, extension: 1, limb: "lead" });
  assert.ok(game.fighters[0].extension > 0.9);
  stepGame(game, { active: true, extension: 1, limb: "kick" });
  assert.equal(game.fighters[0].limb, "lead");
  for (let i = 0; i < 30; i++)
    stepGame(game, { active: false, extension: 1, limb: "kick" });
  assert.equal(game.fighters[0].extension, 0);
  assert.equal(game.fighters[0].guard, true);
  assert.equal(safeInput({ active: true, extension: NaN }).extension, 0);
});
test("one extension cannot repeatedly damage; guard reduces damage; retract rearms", () => {
  function run(guard) {
    const g = makeGame();
    g.fighters[0].x = -0.3;
    g.fighters[1].x = 0.3;
    // Dummy does not guard; use the player as defender for explicit guard comparison below.
    for (let i = 0; i < 100; i++)
      stepGame(g, { active: true, extension: 1, guard });
    return g;
  }
  const g = run(false);
  assert.equal(g.fighters[0].landed, 1);
  assert.equal(g.fighters[1].health, 92);
  for (let i = 0; i < 30; i++) stepGame(g, { active: true, extension: 0 });
  for (let i = 0; i < 30; i++) stepGame(g, { active: true, extension: 1 });
  assert.equal(g.fighters[0].landed, 2);
  const guarded = makeGame(),
    open = makeGame();
  for (const game of [guarded, open]) {
    game.mode = "spar";
    game.fighters[0].x = -0.3;
    game.fighters[1].x = 0.3;
  }
  for (let i = 0; i < 120; i++) {
    stepGame(guarded, { active: true, guard: true });
    stepGame(open, { active: true });
  }
  assert.ok(guarded.fighters[0].health > open.fighters[0].health);
});
test("fixed timestep does not replay a backgrounded minute", () => {
  const clock = new FixedClock();
  let n = 0;
  clock.advance(0, () => n++);
  clock.advance(60000, () => n++);
  assert.ok(n <= 5);
  clock.reset();
  assert.equal(
    clock.advance(70000, () => n++),
    0,
  );
});
test("malformed or clipped hand landmarks are rejected", () => {
  assert.equal(handFeatures(null), null);
  assert.equal(handFeatures([]), null);
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  lm[0].y = 0.7;
  assert.ok(handFeatures(lm));
  lm[4].x = 1.1;
  assert.equal(handFeatures(lm), null);
});
test("two-link IK preserves lengths even with impossible targets", () => {
  const start = new T.Vector3(0, 1, 0);
  for (const target of [
    new T.Vector3(),
    start.clone(),
    new T.Vector3(100, 100, -100),
    new T.Vector3(0, -100, 0),
  ]) {
    const s = solveTwoLink(
      start,
      target,
      new T.Vector3(0.5, 0.5, 1),
      0.27,
      0.23,
    );
    assert.ok(Math.abs(s.middle.distanceTo(start) - 0.27) < 1e-8);
    assert.ok(Math.abs(s.end.distanceTo(s.middle) - 0.23) < 1e-8);
  }
});
test("actual anatomy rig: fixed lengths, finite deformations, planted support across extreme controls", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const b = await fs.readFile(
      new URL("../../public/lab/fight/" + url, import.meta.url),
    );
    return new Response(b);
  };
  try {
    const asset = await loadAnatomy(),
      fighter = new AnatomyFighter(asset, 0x993333);
    const game = makeGame();
    let min = Infinity,
      max = -Infinity;
    for (const distance of [0.57, 0.85, Infinity])
      for (const limb of ["lead", "rear", "kick"])
        for (const extension of [0, 0.3, 0.7, 1])
          for (const aim of [0.75, 1.3, 1.55]) {
            const f = { ...game.fighters[0], limb, extension, aim };
            fighter.update(f, distance);
            fighter.skeleton.update();
            for (const [a, b] of [
              [7, 8],
              [8, 9],
              [11, 12],
              [12, 13],
              [14, 15],
              [15, 16],
              [18, 19],
              [19, 20],
            ]) {
              assert.ok(
                Math.abs(
                  fighter.position(a).distanceTo(fighter.position(b)) -
                    fighter.offsets[b].length(),
                ) < 1e-6,
              );
            }
            assert.ok(Math.abs(fighter.position(20).y - 0.095) < 1e-6);
            fighter.mesh.computeBoundingBox();
            const box = fighter.mesh.boundingBox;
            assert.ok(Number.isFinite(box.min.x));
            assert.ok(box.max.y < 2.0);
            assert.ok(box.min.y > -0.1);
            min = Math.min(min, box.min.y);
            max = Math.max(max, box.max.y);
          }
    console.log("Skin bounds across 108 pose/distance combinations:", {
      minY: min,
      maxY: max,
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("kick support stays planted even when a movement pad is held", () => {
  const g = makeGame();
  for (let i = 0; i < 30; i++)
    stepGame(g, { active: true, limb: "kick", extension: 1 });
  const x = g.fighters[0].x;
  for (let i = 0; i < 60; i++)
    stepGame(g, { active: true, limb: "kick", extension: 1, move: 1 });
  assert.equal(g.fighters[0].x, x);
  assert.equal(g.fighters[0].contact, "right");
});
