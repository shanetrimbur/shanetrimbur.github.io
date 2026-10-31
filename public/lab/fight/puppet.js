import { clamp } from "./controller.js?v=0.2.0";
const vsub = (a, b) => [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)];
const length = (v) => Math.hypot(...v);
const angle = (a, b) =>
  Math.acos(
    clamp(
      a.reduce((s, x, i) => s + x * b[i], 0) /
        Math.max(1e-8, length(a) * length(b)),
      -1,
      1,
    ),
  );
export function handFeatures(lm) {
  if (
    !Array.isArray(lm) ||
    lm.length !== 21 ||
    lm.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return null;
  const size = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
  if (
    size < 0.035 ||
    size > 0.65 ||
    [0, 5, 9, 13, 17].some(
      (i) => lm[i].x < 0 || lm[i].x > 1 || lm[i].y < 0 || lm[i].y > 1,
    )
  )
    return null;
  const up = vsub(lm[9], lm[0]),
    upLength = Math.hypot(up[0], up[1]);
  const across = [-up[1] / upLength, up[0] / upLength];
  const fingers = [5, 9, 13, 17].map((base) => {
    const a = vsub(lm[base + 1], lm[base]),
      b = vsub(lm[base + 2], lm[base + 1]),
      c = vsub(lm[base + 3], lm[base + 2]);
    const tip = vsub(lm[base + 3], lm[base]);
    return {
      curl: clamp((angle(a, b) + angle(b, c)) / 2.4, 0, 1),
      spread: clamp((tip[0] * across[0] + tip[1] * across[1]) / size, -1, 1),
    };
  });
  const thumb = vsub(lm[4], lm[2]);
  return {
    x: (lm[0].x + lm[9].x) / 2,
    y: (lm[0].y + lm[9].y) / 2,
    size,
    tilt: Math.atan2(lm[9].x - lm[0].x, lm[0].y - lm[9].y),
    thumb: clamp((thumb[0] * across[0] + thumb[1] * across[1]) / size, -1, 1),
    fingers,
  };
}
// The same horizontal transform is used by the preview and the controls.
// Screen-right is forward only for the left fighter. Never take abs(dx).
export function forwardDisplacement(dx, facing = 1, mirrored = false) {
  return dx === 0 ? 0 : dx * (mirrored ? -1 : 1) * (facing === -1 ? -1 : 1);
}
export function mapHand(a, n, { facing = 1, mirrored = false } = {}) {
  const forward = clamp(
    (forwardDisplacement(a.x - n.x, facing, mirrored) / Math.max(0.1, n.size)) *
      1.4,
    -1,
    1,
  );
  const aim = clamp(
    1.3 - ((a.y - n.y) / Math.max(0.12, n.size)) * 0.62,
    0.65,
    1.8,
  );
  const fingers =
    a.fingers || Array.from({ length: 4 }, () => ({ curl: 0.8, spread: 0 }));
  const limbs = {};
  ["lead", "rear"].forEach((name, i) => {
    const f = fingers[i],
      spread = f.spread - (n.fingers?.[i]?.spread || 0);
    limbs[name] = {
      extension: clamp(
        (0.04 + (1 - f.curl) * 0.55) * (1 + Math.max(0, forward) * 0.85) +
          Math.min(0, forward) * 0.8,
        0,
        1,
      ),
      aim,
      spread: clamp(spread, -1, 1),
      bend: f.curl,
      lift: 0,
    };
  });
  ["kick", "rearKick"].forEach((name, i) => {
    const f = fingers[i + 2],
      lift = clamp((f.curl - 0.2) / 0.65, 0, 1);
    limbs[name] = {
      extension: lift * clamp(0.18 + Math.max(0, forward) * 0.95, 0, 1),
      lift,
      aim,
      spread: clamp(f.spread - (n.fingers?.[i + 2]?.spread || 0), -1, 1),
      bend: f.curl,
    };
  });
  return {
    active: true,
    limbs,
    forward,
    lean: clamp(
      forwardDisplacement(
        Math.atan2(Math.sin(a.tilt - n.tilt), Math.cos(a.tilt - n.tilt)),
        facing,
        mirrored,
      ) * 0.3,
      -0.28,
      0.28,
    ),
    twist: clamp((a.thumb - (n.thumb || 0)) * 0.45, -0.35, 0.35),
    crouch: clamp(((a.y - n.y) / Math.max(0.12, n.size)) * 0.16, 0, 0.2),
  };
}
export function thumbMovement(dx, facing = 1) {
  return clamp(dx / 60, -1, 1) * (facing === -1 ? -1 : 1);
}
