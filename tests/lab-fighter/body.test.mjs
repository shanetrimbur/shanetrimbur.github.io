// node --test tests/lab-fighter/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKELETON, JOINT, PARENT, ACTIONS, ROM, STANCE, STANCE_ROOT, VMAX, TICK, STALE_MS,
  romOf, clampAngles, anglesToLocals, forwardKinematics, springStep, puppetTargets, Puppet,
} from '../../public/lab/fighter/body.js';
import { measure, makeHand, HandStream, NeutralCapture } from '../../public/lab/fighter/hand.js';
import { rng, between } from './rng.mjs';

const at = (pos, name) => [pos[JOINT[name] * 3], pos[JOINT[name] * 3 + 1], pos[JOINT[name] * 3 + 2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function assertInRom(angles, msg = '') {
  for (const k of ACTIONS) {
    const [lo, hi] = romOf(k);
    assert.ok(Number.isFinite(angles[k]), `${msg} ${k} not finite`);
    assert.ok(angles[k] >= lo - 1e-9 && angles[k] <= hi + 1e-9, `${msg} ${k}=${angles[k]} outside [${lo}, ${hi}]`);
  }
}

test('skeleton is the 22-joint canonical humanoid', () => {
  assert.equal(SKELETON.length, 22);
  assert.equal(PARENT[0], -1);
  PARENT.slice(1).forEach((p, j) => assert.ok(p >= 0 && p < j + 1, `parent of ${SKELETON[j + 1].name} comes first`));
});

test('G1: forward kinematics never changes a bone length', () => {
  const r = rng(11);
  for (let i = 0; i < 500; i++) {
    const a = Object.fromEntries(ACTIONS.map(k => [k, between(r, -400, 400)]));
    const { pos } = forwardKinematics(anglesToLocals(a), [between(r, -2, 2), between(r, 0, 2), between(r, -2, 2)]);
    for (let j = 1; j < SKELETON.length; j++) {
      const rest = Math.hypot(...SKELETON[j].offset);
      const got = dist(at(pos, SKELETON[j].name), at(pos, SKELETON[PARENT[j]].name));
      assert.ok(Math.abs(got - rest) < 1e-9, `${SKELETON[j].name}: ${got} vs ${rest}`);
    }
  }
});

test('stance stands on the ground, upright, facing +Z', () => {
  const { pos } = forwardKinematics(anglesToLocals(STANCE), STANCE_ROOT);
  const low = Math.min(at(pos, 'ball_l')[1], at(pos, 'ball_r')[1]);
  assert.ok(Math.abs(low) < 1e-9, `lowest sole at ${low}`);
  assert.ok(at(pos, 'head')[1] > 1.5, 'head up');
  assert.ok(at(pos, 'ball_l')[2] > at(pos, 'foot_l')[2], 'toes forward');
  assert.ok(at(pos, 'hand_l')[1] > at(pos, 'lowerarm_l')[1], 'fists above elbows in the guard');
  assert.ok(at(pos, 'hand_l')[0] > 0 && at(pos, 'hand_r')[0] < 0, 'left is +X');
});

test('joint directions: hip flexion goes forward, abduction outward, elbow bends forward', () => {
  const base = forwardKinematics(anglesToLocals({ ...STANCE, hipFlex_l: 0, hipAbd_l: 0, knee_l: 0 })).pos;
  const flexed = forwardKinematics(anglesToLocals({ ...STANCE, hipFlex_l: 60, hipAbd_l: 0, knee_l: 0 })).pos;
  const abducted = forwardKinematics(anglesToLocals({ ...STANCE, hipFlex_l: 0, hipAbd_l: 30, knee_l: 0 })).pos;
  assert.ok(at(flexed, 'foot_l')[2] > at(base, 'foot_l')[2] + 0.3);
  assert.ok(at(abducted, 'foot_l')[0] > at(base, 'foot_l')[0] + 0.2);
  const armDown = forwardKinematics(anglesToLocals({ ...STANCE, shElev_r: 0, elbow_r: 90 })).pos;
  assert.ok(at(armDown, 'hand_r')[2] > at(armDown, 'lowerarm_r')[2] + 0.2, 'forearm forward');
  const raised = forwardKinematics(anglesToLocals({ ...STANCE, shElev_r: 180, elbow_r: 0 })).pos;
  assert.ok(at(raised, 'hand_r')[1] > at(raised, 'head')[1], 'arm overhead at 180');
});

test('G2: clamping keeps every action in ROM and replaces non-numbers with the stance', () => {
  const r = rng(3);
  for (let i = 0; i < 1000; i++) {
    const a = Object.fromEntries(ACTIONS.map(k => [k, [NaN, Infinity, -1e9, 1e9, undefined, 'x', between(r, -500, 500)][i % 7]]));
    assertInRom(clampAngles(a));
  }
  assert.deepEqual(clampAngles(null), { ...STANCE });
  assertInRom(STANCE, 'stance');
  assert.equal(Object.keys(ROM).length, 6);
});

test('G2: the puppet map stays in ROM for any features and gains', () => {
  const r = rng(5);
  const keys = ['roll', 'thumb.open', 'thumb.curl', ...['index', 'middle', 'ring', 'pinky'].flatMap(f => [f + '.flex', f + '.curl', f + '.spread'])];
  for (let i = 0; i < 2000; i++) {
    const feat = Object.fromEntries(keys.map(k => [k, i % 13 === 0 ? NaN : between(r, -1e4, 1e4)]));
    const neutral = Object.fromEntries(keys.map(k => [k, between(r, -90, 90)]));
    const gains = { legs: between(r, -50, 50), arms: i % 11 === 0 ? NaN : between(r, -50, 50) };
    const sides = { legLeftDigit: r() < 0.5 ? 'index' : 'middle', armLeftDigit: r() < 0.5 ? 'thumb' : 'pinky' };
    assertInRom(puppetTargets(feat, neutral, sides, gains));
  }
});

test('G4: a step target never moves a joint faster than VMAX', () => {
  const s = { angles: { ...STANCE }, vel: Object.fromEntries(ACTIONS.map(k => [k, 0])) };
  const far = Object.fromEntries(ACTIONS.map(k => [k, romOf(k)[1]]));
  for (let i = 0; i < 120; i++) {
    const before = { ...s.angles };
    springStep(s, i < 60 ? far : STANCE, TICK, 60, VMAX);
    for (const k of ACTIONS) assert.ok(Math.abs(s.angles[k] - before[k]) <= VMAX * TICK + 1e-9, `${k} jumped`);
  }
});

function neutralPuppet() {
  const p = new Puppet();
  const stream = new HandStream(), cap = new NeutralCapture(5);
  let t = 0;
  while (!cap.ready) {
    const h = makeHand();
    const m = measure(h.image, h.world);
    cap.add(stream.push(m, t), m);
    t += 16;
  }
  p.setNeutral(cap.value, cap.sides);
  return { p, stream, t };
}

test('G5: targets return to stance 100 ms after the last valid hand and the pose settles in 0.3 s', () => {
  const { p, stream, t: t0 } = neutralPuppet();
  const kick = makeHand({ digits: { index: { flex: 75, curl: 90, spread: 4 } } });
  let t = t0;
  for (let i = 0; i < 30; i++, t += 16) { p.feed(stream.push(measure(kick.image, kick.world), t), t); p.update(0.016, t); }
  const last = t - 16;
  assert.ok(p.targets(last + STALE_MS - 1).hipFlex_r > STANCE.hipFlex_r + 30, 'kick is mapped while fresh');
  assert.deepEqual(p.targets(last + STALE_MS + 1), { ...STANCE });
  for (; t <= last + STALE_MS + 300; t += 16) { p.feed(null, t); p.update(0.016, t); }
  for (const k of ACTIONS) assert.ok(Math.abs(p.angles[k] - STANCE[k]) < 2, `${k} settled at ${p.angles[k]}`);
});

test('G3 + G6 fuzz: 10,000 frames of garbage, teleports and dropouts', () => {
  const r = rng(42);
  const { p, stream } = neutralPuppet();
  let t = 1000;
  const rest = SKELETON.map((j, i) => (i ? Math.hypot(...j.offset) : 0));
  for (let i = 0; i < 10000; i++) {
    const kind = Math.floor(r() * 6);
    let image, world;
    if (kind === 0) { const h = makeHand({ digits: { index: { flex: between(r, 0, 89), curl: between(r, 0, 170), spread: between(r, -40, 40) }, thumb: { open: between(r, 0, 120), curl: between(r, 0, 170) } }, roll: between(r, -180, 180), chirality: r() < 0.5 ? 'left' : 'right', cx: between(r, -0.5, 1.5), cy: between(r, -0.5, 1.5), scale: between(r, 0.2, 8) }); ({ image, world } = h); }
    else if (kind === 1) { image = Array.from({ length: 21 }, () => ({ x: between(r, -5, 5), y: between(r, -5, 5), z: between(r, -5, 5) })); world = Array.from({ length: 21 }, () => ({ x: between(r, -0.1, 0.1), y: between(r, -0.1, 0.1), z: between(r, -0.1, 0.1) })); }
    else if (kind === 2) { const h = makeHand(); image = h.image.map(q => (r() < 0.2 ? { x: NaN, y: q.y } : q)); world = h.world; }
    else if (kind === 3) { image = []; world = undefined; }
    else if (kind === 4) { const h = makeHand(); image = h.image.slice(0, Math.floor(r() * 21)); world = h.world; }
    else { image = null; world = null; }
    const m = measure(image, world, { mirror: r() < 0.5 });
    p.feed(stream.push(m, t), t);
    const dt = r() < 0.02 ? between(r, 0.2, 3) : between(r, 0, 0.05); // occasional long stall
    t += dt * 1000;
    p.update(dt, t);
    assertInRom(p.angles, `frame ${i}`);
    for (const k of ACTIONS) assert.ok(Math.abs(p.vel[k]) <= VMAX + 1e-9);
    const { pos } = p.pose();
    assert.deepEqual(at(pos, 'pelvis'), [...STANCE_ROOT], 'root never moves in M0');
    if (i % 97 === 0) {
      for (let j = 1; j < SKELETON.length; j++) {
        assert.ok(Math.abs(dist(at(pos, SKELETON[j].name), at(pos, SKELETON[PARENT[j]].name)) - rest[j]) < 1e-9);
      }
    }
  }
});
