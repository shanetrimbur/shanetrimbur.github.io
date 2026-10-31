// Hand Fighter — hand. Pure module: landmarks in, digit angles out. No DOM.
//
// Landmarks are MediaPipe Hand Landmarker output: `image` (21 points, x and y normalised to the
// video width and height) and `world` (21 points in metres around the hand centre). Angles are
// degrees. "Screen" quantities use the picture as the player sees it: when the thumbnail is
// mirrored (desktop webcam), screen-left is image-right, so pass `mirror: true`.
//
// Features (SPEC §5)
//   <finger>.flex    out-of-palm-plane angle of the proximal bone (unsigned: hyperextension
//                    reads as a little flexion, which only matters below hip extension's -20)
//   <finger>.curl    PIP + DIP bends
//   <finger>.spread  in-picture angle of the proximal bone from the palm axis, + toward screen-left
//   thumb.open       angle between the thumb metacarpal and the index metacarpal
//   thumb.curl       MCP + IP bends
//   roll             in-picture angle of wrist -> middle MCP from straight down, + toward screen-left

export const WRIST = 0;
export const FINGERS = { index: 5, middle: 9, ring: 13, pinky: 17 }; // MCP index; +1 PIP, +2 DIP, +3 tip
export const DIGITS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const DEG = 180 / Math.PI;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => { const l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const angle3 = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(unit(a), unit(b))))) * DEG;
// in-picture angle from straight down (+y), positive toward screen-left (-x)
const angle2 = v => Math.atan2(-v[0], v[1]) * DEG;
export const wrap = v => ((((v + 180) % 360) + 360) % 360) - 180;

function toPoints(list) {
  if (!Array.isArray(list) || list.length !== 21) return null;
  const pts = new Array(21);
  for (let i = 0; i < 21; i++) {
    const p = list[i];
    if (!p) return null;
    const x = +p.x, y = +p.y, z = p.z === undefined ? 0 : +p.z;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    pts[i] = [x, y, z];
  }
  return pts;
}

export const FRAMING = { edge: 0.02, tooClose: 0.42, tooFar: 0.1 };

// One frame. Never throws; a frame that fails a check comes back { valid: false, reason } (G6).
export function measure(image, world, { aspect = 4 / 3, mirror = false } = {}) {
  const im = toPoints(image), w = toPoints(world);
  if (!im || !w) return { valid: false, reason: 'missing or non-finite landmarks' };
  if (!(aspect > 0) || !Number.isFinite(aspect)) return { valid: false, reason: 'bad aspect' };

  // Screen coordinates in picture-height units.
  const sc = im.map(p => [(mirror ? 1 - p[0] : p[0]) * aspect, p[1], 0]);
  const palmImg = len(sub(sc[9], sc[WRIST]));
  const palmWorld = len(sub(w[9], w[WRIST]));
  if (!(palmImg > 0.01)) return { valid: false, reason: 'hand too small in the picture' };
  if (!(palmWorld > 0.03 && palmWorld < 0.2)) return { valid: false, reason: 'implausible hand size' };

  const n0 = cross(sub(w[5], w[17]), sub(w[9], w[WRIST]));
  if (!(len(n0) > 1e-8)) return { valid: false, reason: 'degenerate palm' };
  const normal = unit(n0);
  const palmAxis = angle2(sub(sc[9], sc[WRIST]));
  const pxPerMetre = palmImg / palmWorld;

  const digits = {};
  for (const [name, m] of Object.entries(FINGERS)) {
    const d1 = sub(w[m + 1], w[m]), d2 = sub(w[m + 2], w[m + 1]), d3 = sub(w[m + 3], w[m + 2]);
    if (!(len(d1) > 1e-6 && len(d2) > 1e-6 && len(d3) > 1e-6)) return { valid: false, reason: 'degenerate finger' };
    const flex = Math.asin(Math.min(1, Math.abs(dot(unit(d1), normal)))) * DEG;
    const curl = angle3(d1, d2) + angle3(d2, d3);
    const p1 = sub(sc[m + 1], sc[m]);
    // Spread is only defined while the bone is not pointing at the camera.
    const seen = len(p1) / (len(d1) * pxPerMetre);
    const spread = seen > 0.35 ? wrap(angle2(p1) - palmAxis) : null;
    digits[name] = { flex, curl, spread };
  }
  const t1 = sub(w[2], w[1]), t2 = sub(w[3], w[2]), t3 = sub(w[4], w[3]);
  if (!(len(t1) > 1e-6 && len(t2) > 1e-6 && len(t3) > 1e-6)) return { valid: false, reason: 'degenerate thumb' };
  digits.thumb = { open: angle3(t1, sub(w[5], w[WRIST])), curl: angle3(t1, t2) + angle3(t2, t3) };

  let out = 'ok';
  const e = FRAMING.edge;
  if (palmImg > FRAMING.tooClose) out = 'too close';
  else if (im.some(p => p[0] < e || p[0] > 1 - e || p[1] < e || p[1] > 1 - e)) out = 'near edge';
  else if (palmImg < FRAMING.tooFar) out = 'too far';
  const palm = [0, 5, 9, 13, 17];
  const framing = {
    cx: palm.reduce((s, i) => s + im[i][0], 0) / 5,
    cy: palm.reduce((s, i) => s + im[i][1], 0) / 5,
    size: palmImg,
    status: out,
  };
  const screenX = { thumb: sc[2][0], index: sc[5][0], middle: sc[9][0], ring: sc[13][0], pinky: sc[17][0] };
  return { valid: true, digits, roll: palmAxis, framing, screenX };
}

// Which digit is on the left of the screen, for the screen-side-consistent mapping.
export function sidesOf(m) {
  return {
    legLeftDigit: m.screenX.index <= m.screenX.middle ? 'index' : 'middle',
    armLeftDigit: m.screenX.thumb <= m.screenX.pinky ? 'thumb' : 'pinky',
  };
}

// '<digit>.<feature>' -> number (or null for a spread that is not visible this frame)
export function flatten(m) {
  const f = { roll: m.roll, 'thumb.open': m.digits.thumb.open, 'thumb.curl': m.digits.thumb.curl };
  for (const name of Object.keys(FINGERS)) {
    const d = m.digits[name];
    f[name + '.flex'] = d.flex;
    f[name + '.curl'] = d.curl;
    f[name + '.spread'] = d.spread;
  }
  return f;
}

// ------------------------------------------------------------------
// One Euro filter (same constants and form as Shape Lab's core.js)
// ------------------------------------------------------------------
export class OneEuro {
  constructor(minCut = 1.0, beta = 0.05) { this.mc = minCut; this.b = beta; this.x = null; this.dx = 0; this.t = 0; }
  a(c, dt) { const r = 2 * Math.PI * c * dt; return r / (r + 1); }
  f(x, t) {
    if (this.x === null) { this.x = x; this.t = t; return x; }
    const dt = Math.max(1e-3, (t - this.t) / 1000); this.t = t;
    this.dx += this.a(1, dt) * ((x - this.x) / dt - this.dx);
    this.x += this.a(this.mc + this.b * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}

// Filters a stream of measurements. Invalid frames return null; a spread that is hidden this
// frame holds its last value. Roll is unwrapped first so the filter never averages across ±180.
export class HandStream {
  constructor({ minCut = 1.5, beta = 0.08 } = {}) {
    this.opts = { minCut, beta };
    this.filters = {};
    this.last = {};
    this.rollUnwrapped = null;
  }

  push(m, tMs) {
    if (!m || !m.valid || !Number.isFinite(tMs)) return null;
    const raw = flatten(m);
    if (this.rollUnwrapped === null) this.rollUnwrapped = raw.roll;
    else this.rollUnwrapped += wrap(raw.roll - wrap(this.rollUnwrapped));
    raw.roll = this.rollUnwrapped;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === null) { out[k] = k in this.last ? this.last[k] : 0; continue; }
      if (!this.filters[k]) this.filters[k] = new OneEuro(this.opts.minCut, this.opts.beta);
      out[k] = this.filters[k].f(v, tMs);
    }
    out.roll = wrap(out.roll);
    this.last = out;
    return out;
  }

  reset() { this.filters = {}; this.last = {}; this.rollUnwrapped = null; }
}

// Averages a few valid frames into the neutral pose.
export class NeutralCapture {
  constructor(frames = 12) { this.frames = frames; this.sum = null; this.count = 0; this.sides = null; }
  add(flat, m) {
    if (!flat) return false;
    if (!this.sum) this.sum = Object.fromEntries(Object.keys(flat).map(k => [k, 0]));
    for (const k of Object.keys(this.sum)) this.sum[k] += k === 'roll' ? 0 : flat[k];
    this.rollRef = flat.roll; // roll is circular: keep the latest instead of averaging
    if (m && m.valid) this.sides = sidesOf(m);
    this.count++;
    return this.ready;
  }
  get ready() { return this.count >= this.frames; }
  get value() {
    const v = {};
    for (const k of Object.keys(this.sum)) v[k] = this.sum[k] / this.count;
    v.roll = this.rollRef;
    return v;
  }
}

// ------------------------------------------------------------------
// Synthetic hand (tests and #demo)
// ------------------------------------------------------------------
// A right hand, fingers pointing down, palm toward the camera, built from the same angles that
// `measure` returns, then mirrored for a left hand. Orthographic projection, so a round trip is
// exact. Camera axes: x right, y down, z away from the camera.
const BASES = { index: [-0.028, 0.088], middle: [-0.008, 0.092], ring: [0.012, 0.088], pinky: [0.03, 0.078] };
const BONES = { index: [0.045, 0.025, 0.02], middle: [0.05, 0.03, 0.022], ring: [0.045, 0.028, 0.02], pinky: [0.035, 0.02, 0.018] };
const THUMB = { cmc: [-0.022, 0.028, -0.006], bones: [0.04, 0.032, 0.027] };

const rot2 = (v, deg) => {
  const r = deg / DEG, c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const bend = (u, deg) => { const r = deg / DEG; return add(mul(u, Math.cos(r)), mul([0, 0, -1], Math.sin(r))); };

export const REST_DIGITS = Object.freeze({
  thumb: { open: 40, curl: 25 },
  index: { flex: 15, curl: 20, spread: 4 },
  middle: { flex: 15, curl: 20, spread: 0 },
  ring: { flex: 18, curl: 25, spread: -3 },
  pinky: { flex: 20, curl: 25, spread: -8 },
});

export function makeHand({ digits = REST_DIGITS, roll = 0, chirality = 'right', cx = 0.5, cy = 0.35, scale = 2.2, aspect = 4 / 3 } = {}) {
  const left = chirality === 'left';
  const sg = left ? -1 : 1; // build mirrored angles so the measured values equal the inputs
  const P = new Array(21);
  P[WRIST] = [0, 0, 0];
  for (const [name, m] of Object.entries(FINGERS)) P[m] = [BASES[name][0], BASES[name][1], 0];
  const axis = unit(sub(P[9], P[WRIST]));
  for (const [name, m] of Object.entries(FINGERS)) {
    const g = { ...REST_DIGITS[name], ...(digits[name] || {}) };
    const u = rot2(axis, sg * g.spread);
    const [b1, b2] = [0.55 * g.curl, 0.45 * g.curl];
    const L = BONES[name];
    P[m + 1] = add(P[m], mul(bend(u, g.flex), L[0]));
    P[m + 2] = add(P[m + 1], mul(bend(u, g.flex + b1), L[1]));
    P[m + 3] = add(P[m + 2], mul(bend(u, g.flex + b1 + b2), L[2]));
  }
  const th = { ...REST_DIGITS.thumb, ...(digits.thumb || {}) };
  const meta = unit(sub(P[5], P[WRIST]));
  const t1 = rot2(meta, th.open); // toward the thumb side (screen-left for a right hand)
  P[1] = THUMB.cmc.slice();
  P[2] = add(P[1], mul(t1, THUMB.bones[0]));
  P[3] = add(P[2], mul(bend(t1, 0.5 * th.curl), THUMB.bones[1]));
  P[4] = add(P[3], mul(bend(t1, th.curl), THUMB.bones[2]));

  // Mirror for a left hand, then roll the whole hand in the picture about the wrist.
  const pts = P.map(p => rot2([sg * p[0], p[1], p[2]], roll));
  const c = mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / 21);
  const world = pts.map(p => ({ x: p[0] - c[0], y: p[1] - c[1], z: p[2] - c[2] }));
  const image = pts.map(p => ({ x: cx + ((p[0] - c[0]) * scale) / aspect, y: cy + (p[1] - c[1]) * scale, z: p[2] * scale }));
  return { image, world };
}
