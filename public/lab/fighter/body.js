// Hand Fighter — body. Pure module: no DOM, so Node tests import it directly.
//
// Skeleton: canonical_humanoid/v1, 22 joints, metres, +Y up, +Z forward, +X character-left,
// T-pose rest, quaternions [x, y, z, w]. Copied from shanetrimbur/movement-capture @ 0bfe4c8,
// src/movement_capture/data/skeletons/canonical_humanoid_v1.json.
// Limits: the rig ROM for the driven joints from canonical_humanoid_v1.rig.json at the same
// commit (AAOS normative ranges; shoulder and elbow from the MoBL/MyoArm model).
//
// Grounding rules (docs/lab-fighter/SPEC.md §4): poses come from rotations through FK (G1),
// angles stay in ROM (G2), the root is never set from the hand (G3), springs limit speed (G4),
// stale input eases back to stance (G5), bad numbers never get through (G6).

export const SKELETON = [
  ['pelvis', null, [0.0, 0.95, 0.0], 'C'],
  ['spine_01', 'pelvis', [0.0, 0.1, 0.0], 'C'],
  ['spine_02', 'spine_01', [0.0, 0.12, 0.0], 'C'],
  ['spine_03', 'spine_02', [0.0, 0.12, 0.0], 'C'],
  ['neck', 'spine_03', [0.0, 0.16, 0.0], 'C'],
  ['head', 'neck', [0.0, 0.1, 0.0], 'C'],
  ['clavicle_l', 'spine_03', [0.02, 0.13, 0.0], 'L'],
  ['upperarm_l', 'clavicle_l', [0.17, 0.0, 0.0], 'L'],
  ['lowerarm_l', 'upperarm_l', [0.29, 0.0, 0.0], 'L'],
  ['hand_l', 'lowerarm_l', [0.26, 0.0, 0.0], 'L'],
  ['clavicle_r', 'spine_03', [-0.02, 0.13, 0.0], 'R'],
  ['upperarm_r', 'clavicle_r', [-0.17, 0.0, 0.0], 'R'],
  ['lowerarm_r', 'upperarm_r', [-0.29, 0.0, 0.0], 'R'],
  ['hand_r', 'lowerarm_r', [-0.26, 0.0, 0.0], 'R'],
  ['thigh_l', 'pelvis', [0.09, -0.03, 0.0], 'L'],
  ['calf_l', 'thigh_l', [0.0, -0.42, 0.0], 'L'],
  ['foot_l', 'calf_l', [0.0, -0.42, 0.0], 'L'],
  ['ball_l', 'foot_l', [0.0, -0.08, 0.13], 'L'],
  ['thigh_r', 'pelvis', [-0.09, -0.03, 0.0], 'R'],
  ['calf_r', 'thigh_r', [0.0, -0.42, 0.0], 'R'],
  ['foot_r', 'calf_r', [0.0, -0.42, 0.0], 'R'],
  ['ball_r', 'foot_r', [0.0, -0.08, 0.13], 'R'],
].map(([name, parent, offset, side]) => ({ name, parent, offset, side }));

export const JOINT = Object.fromEntries(SKELETON.map((j, i) => [j.name, i]));
export const PARENT = SKELETON.map(j => (j.parent === null ? -1 : JOINT[j.parent]));

// ------------------------------------------------------------------
// Quaternions [x, y, z, w]; Hamilton product a * b applies b first (same as the inspector core).
// ------------------------------------------------------------------
export const Q_ID = Object.freeze([0, 0, 0, 1]);
const RAD = Math.PI / 180;

export function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function qAxis(axis, deg) {
  const h = (deg * RAD) / 2, s = Math.sin(h);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
}

export function qRotate(q, v) {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

// ------------------------------------------------------------------
// Actions, limits, stance
// ------------------------------------------------------------------
// Driven actions in degrees. Sides are the character's own left and right.
export const ACTIONS = [
  'hipFlex_l', 'hipAbd_l', 'knee_l', 'hipFlex_r', 'hipAbd_r', 'knee_r',
  'shElev_l', 'elbow_l', 'shElev_r', 'elbow_r', 'lean',
];

// Rig ROM (degrees). Lean is spine lateral flexion summed over spine_01..03 (12 + 12 + 11);
// positive leans toward the character's left.
export const ROM = {
  hipFlex: [-20, 125],
  hipAbd: [-30, 45],
  knee: [0, 140],
  shElev: [0, 180],
  elbow: [0, 130],
  lean: [-35, 35],
};
export const SPINE_LEAN_SPLIT = [12, 12, 11];
export const SHOULDER_PLANE = 60; // plane of elevation: 0 = out to the side, 90 = straight forward

export function romOf(action) {
  return ROM[action.split('_')[0]];
}

// The guard: slight knee bend, fists up.
export const STANCE = Object.freeze({
  hipFlex_l: 14, hipAbd_l: 7, knee_l: 24,
  hipFlex_r: 14, hipAbd_r: 7, knee_r: 24,
  shElev_l: 38, elbow_l: 124,
  shElev_r: 38, elbow_r: 124,
  lean: 0,
});

// Clamp every action into its ROM; anything that is not a finite number becomes the stance value.
export function clampAngles(a) {
  const out = {};
  for (const k of ACTIONS) {
    const v = a ? a[k] : undefined;
    const [lo, hi] = romOf(k);
    out[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : STANCE[k];
  }
  return out;
}

// ------------------------------------------------------------------
// Angles -> local rotations -> forward kinematics
// ------------------------------------------------------------------
// One axis per action, applied from the standing neutral (arms down). Arms are relative to the
// chest; legs to the pelvis. See SPEC §6: this is a small angle model, not full keypose decoding.
export function anglesToLocals(input) {
  const a = clampAngles(input);
  const q = SKELETON.map(() => Q_ID);

  // Spine: split the lean by ROM share, each segment within its own limit.
  let leanUsed = 0;
  ['spine_01', 'spine_02', 'spine_03'].forEach((name, i) => {
    const lim = SPINE_LEAN_SPLIT[i];
    const seg = Math.min(lim, Math.max(-lim, (a.lean * lim) / 35));
    leanUsed += seg;
    q[JOINT[name]] = qAxis(Z, -seg);
  });
  // Keep the head nearer upright (neck lateral flexion ROM ±25).
  q[JOINT.neck] = qAxis(Z, Math.min(25, Math.max(-25, 0.6 * leanUsed)));

  for (const side of ['l', 'r']) {
    const s = side === 'l' ? 1 : -1;
    const flex = a['hipFlex_' + side], abd = a['hipAbd_' + side], knee = a['knee_' + side];
    q[JOINT['thigh_' + side]] = qMul(qAxis(Z, s * abd), qAxis(X, -flex));
    q[JOINT['calf_' + side]] = qAxis(X, knee);
    // Keep the sole roughly level against the shin's pitch (ankle range ±45 here).
    const ankle = Math.min(45, Math.max(-45, -(knee - flex)));
    q[JOINT['foot_' + side]] = qAxis(X, ankle);

    // Shoulder: elevation in a fixed plane, from arms-down neutral. The swing axis is
    // perpendicular to the plane, so it is defined all the way to 180 degrees.
    const elev = a['shElev_' + side];
    const phi = SHOULDER_PLANE * RAD;
    const h = [s * Math.cos(phi), 0, Math.sin(phi)];
    const swing = qAxis([-h[2], 0, h[0]], elev);
    const neutral = qAxis(Z, -90 * s); // T-pose arm (±X) -> hanging (-Y)
    q[JOINT['upperarm_' + side]] = qMul(swing, neutral);
    q[JOINT['lowerarm_' + side]] = qAxis(Y, -s * a['elbow_' + side]);
  }
  return q;
}

// World positions (flat, 3 per joint) and world rotations. Bone lengths are fixed by
// construction: every child sits at its rest offset rotated by its parent (G1).
export function forwardKinematics(locals, root = SKELETON[0].offset) {
  const n = SKELETON.length;
  const pos = new Float64Array(n * 3);
  const world = new Array(n);
  for (let j = 0; j < n; j++) {
    const p = PARENT[j];
    if (p < 0) {
      world[j] = locals[j];
      pos[0] = root[0]; pos[1] = root[1]; pos[2] = root[2];
    } else {
      world[j] = qMul(world[p], locals[j]);
      const o = qRotate(world[p], SKELETON[j].offset);
      pos[j * 3] = pos[p * 3] + o[0];
      pos[j * 3 + 1] = pos[p * 3 + 1] + o[1];
      pos[j * 3 + 2] = pos[p * 3 + 2] + o[2];
    }
  }
  return { pos, world };
}

// Pelvis height that puts the stance's soles on the ground. M0 keeps the root here (G3).
export const STANCE_ROOT = (() => {
  const { pos } = forwardKinematics(anglesToLocals(STANCE), [0, 0.95, 0]);
  const low = Math.min(pos[JOINT.ball_l * 3 + 1], pos[JOINT.ball_r * 3 + 1]);
  return Object.freeze([0, 0.95 - low, 0]);
})();

// ------------------------------------------------------------------
// Springs (G4)
// ------------------------------------------------------------------
export const TICK = 1 / 60;
export const VMAX = 900; // deg/s, hard cap on any joint

// Critically damped spring toward each target with a hard angular speed cap (deg/s).
export function springStep(state, targets, dt, omega, vmax) {
  const t = clampAngles(targets);
  for (const k of ACTIONS) {
    const x = state.angles[k], v = state.vel[k];
    const acc = omega * omega * (t[k] - x) - 2 * omega * v;
    let nv = v + acc * dt;
    nv = Math.min(vmax, Math.max(-vmax, nv));
    let nx = x + nv * dt;
    const [lo, hi] = romOf(k);
    if (nx < lo) { nx = lo; nv = Math.max(0, nv); }
    if (nx > hi) { nx = hi; nv = Math.min(0, nv); }
    state.angles[k] = nx;
    state.vel[k] = nv;
  }
  return state;
}

// ------------------------------------------------------------------
// Puppet map (SPEC §5)
// ------------------------------------------------------------------
// Feature keys come from hand.js `flatten`: '<digit>.<feature>' plus 'roll'.
export const GAINS = Object.freeze({ legs: 1, arms: 1 });
export const STALE_MS = 100;

// sides: which digit sits on the left of the screen. The character faces the viewer, so the
// screen-left limb is the character's right. legLeftDigit is 'index' or 'middle'; armLeftDigit
// is 'thumb' or 'pinky'.
export function puppetTargets(feat, neutral, sides, gains = GAINS) {
  const d = key => {
    const v = feat[key] - neutral[key];
    return Number.isFinite(v) ? v : 0;
  };
  const wrap = v => ((((v + 180) % 360) + 360) % 360) - 180;
  const gl = Number.isFinite(gains.legs) ? gains.legs : 1;
  const ga = Number.isFinite(gains.arms) ? gains.arms : 1;
  const out = { ...STANCE };

  const legLeft = sides.legLeftDigit === 'middle' ? 'middle' : 'index';
  const legRight = legLeft === 'index' ? 'middle' : 'index';
  // screen-left -> character right ('r'): abduction moves it further screen-left (+spread).
  for (const [digit, side, sign] of [[legLeft, 'r', 1], [legRight, 'l', -1]]) {
    out['hipFlex_' + side] += gl * 1.5 * d(digit + '.flex');
    out['hipAbd_' + side] += gl * 1.0 * sign * d(digit + '.spread');
    out['knee_' + side] += gl * 1.0 * d(digit + '.curl');
  }

  // Arms punch: swinging the thumb (or pinky) outward is "reach", which raises the arm and
  // straightens the guard's bent elbow together. Curling the digit bends the elbow on top.
  const armLeft = sides.armLeftDigit === 'pinky' ? 'pinky' : 'thumb';
  for (const [digit, side, sign] of [[armLeft, 'r', 1], [armLeft === 'thumb' ? 'pinky' : 'thumb', 'l', -1]]) {
    const reach = digit === 'thumb' ? d('thumb.open') : 1.8 * sign * d('pinky.spread');
    out['shElev_' + side] += ga * 1.2 * reach;
    out['elbow_' + side] += ga * (d(digit + '.curl') - 2.6 * reach);
  }

  // Fingertips swinging screen-left tip the top of the puppet screen-right: the character's left.
  const roll = feat.roll - neutral.roll;
  out.lean += 0.6 * (Number.isFinite(roll) ? wrap(roll) : 0);
  return clampAngles(out);
}

// ------------------------------------------------------------------
// Puppet: features in, pose out, at a fixed 60 Hz tick.
// ------------------------------------------------------------------
export class Puppet {
  constructor() {
    this.angles = { ...STANCE };
    this.vel = Object.fromEntries(ACTIONS.map(k => [k, 0]));
    this.feat = null;
    this.lastValidMs = -Infinity;
    this.neutral = null;
    this.sides = { legLeftDigit: 'index', armLeftDigit: 'thumb' };
    this.gains = { ...GAINS };
    this.smoothing = 0.5;
    this.acc = 0;
    this.root = STANCE_ROOT;
  }

  // flat features (or null for a frame without a valid hand) at time tMs
  feed(flat, tMs) {
    if (flat && this.neutral) { this.feat = flat; this.lastValidMs = tMs; }
  }

  setNeutral(flat, sides) {
    this.neutral = { ...flat };
    if (sides) this.sides = { ...sides };
  }

  targets(tMs) {
    if (!this.feat || !this.neutral || !(tMs - this.lastValidMs <= STALE_MS)) return { ...STANCE };
    return puppetTargets(this.feat, this.neutral, this.sides, this.gains);
  }

  get omega() { return 60 - 48 * Math.min(1, Math.max(0, this.smoothing)); } // 60 .. 12 rad/s

  // Advance by real elapsed seconds in fixed ticks (at most 8 per call).
  update(dtSeconds, tMs) {
    this.acc = Math.min(this.acc + (Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0), 8 * TICK);
    const target = this.targets(tMs);
    while (this.acc >= TICK) {
      springStep(this, target, TICK, this.omega, VMAX);
      this.acc -= TICK;
    }
    return this.angles;
  }

  pose() {
    return forwardKinematics(anglesToLocals(this.angles), this.root);
  }
}

