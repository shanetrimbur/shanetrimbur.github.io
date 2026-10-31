// Hand Fighter — render. Canvas 2D projection of the skeleton guy.
import { SKELETON, JOINT, PARENT, qRotate } from './body.js';

export const VIEWS = {
  '3/4': { yaw: 0.55, pitch: 0.12 },
  front: { yaw: 0, pitch: 0.08 },
  side: { yaw: Math.PI / 2, pitch: 0.08 },
};

// Bone half-width in metres, keyed by the child joint of the bone. Clavicles and hips are thinner girdle bones.
const WIDTH = {
  spine_01: 0.026, spine_02: 0.026, spine_03: 0.028, neck: 0.018, head: 0.017,
  clavicle_l: 0.011, clavicle_r: 0.011, upperarm_l: 0.013, upperarm_r: 0.013,
  lowerarm_l: 0.02, lowerarm_r: 0.02, hand_l: 0.017, hand_r: 0.017,
  thigh_l: 0.016, thigh_r: 0.016, calf_l: 0.025, calf_r: 0.025, foot_l: 0.021, foot_r: 0.021,
  ball_l: 0.016, ball_r: 0.016,
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = '3/4';
    this.colors = { bone: '#e9e4d4', far: '#b9b3a2', line: '#0c0d0e', socket: '#0c0d0e', floor: '#24292c', shadow: 'rgba(0,0,0,0.45)', accent: '#d9875f' };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const k = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * k)), h = Math.max(1, Math.round(r.height * k));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  camera() {
    const v = VIEWS[this.view] || VIEWS['3/4'];
    const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    const W = this.canvas.width, H = this.canvas.height;
    const target = [0, 0.88, 0], dist = 3.6;
    return {
      eye: [target[0] + dist * sy * cp, target[1] + dist * sp, target[2] + dist * cy * cp],
      right: [cy, 0, -sy], up: [-sy * sp, cp, -cy * sp], back: [sy * cp, sp, cy * cp],
      f: 1.25 * Math.min(H, W * 1.45), W, H,
    };
  }

  project(c, p) {
    const d = [p[0] - c.eye[0], p[1] - c.eye[1], p[2] - c.eye[2]];
    const x = d[0] * c.right[0] + d[1] * c.right[1] + d[2] * c.right[2];
    const y = d[0] * c.up[0] + d[1] * c.up[1] + d[2] * c.up[2];
    const z = -(d[0] * c.back[0] + d[1] * c.back[1] + d[2] * c.back[2]);
    const s = c.f / Math.max(0.1, z);
    return [c.W / 2 + x * s, c.H * 0.56 - y * s, z, s];
  }

  draw({ pos, world }) {
    this.resize();
    const { ctx } = this, c = this.camera(), col = this.colors;
    ctx.clearRect(0, 0, c.W, c.H);
    const P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const local = (i, o) => { const r = qRotate(world[i], o); const b = P(i); return [b[0] + r[0], b[1] + r[1], b[2] + r[2]]; };

    // Floor: a few perspective lines and a soft shadow under the pelvis.
    ctx.lineWidth = Math.max(1, c.H / 600);
    ctx.strokeStyle = col.floor;
    for (let g = -2; g <= 2; g += 0.5) {
      this.segment(c, [g, 0, -1.5], [g, 0, 1.5]);
      this.segment(c, [-2, 0, g * 0.75], [2, 0, g * 0.75]);
    }
    const pel = P(JOINT.pelvis);
    const sh = this.project(c, [pel[0], 0, pel[2]]);
    ctx.fillStyle = col.shadow;
    ctx.beginPath();
    ctx.ellipse(sh[0], sh[1], 0.32 * sh[3], 0.32 * sh[3] * Math.max(0.12, Math.abs(Math.sin(VIEWS[this.view].pitch)) * 2), 0, 0, Math.PI * 2);
    ctx.fill();

    // Everything is a capsule or a disc; draw far to near.
    const items = [];
    for (let j = 1; j < SKELETON.length; j++) {
      const a = this.project(c, P(PARENT[j])), b = this.project(c, P(j));
      items.push({ z: (a[2] + b[2]) / 2, kind: 'bone', a, b, r: WIDTH[SKELETON[j].name] || 0.03 });
    }
    for (const side of ['l', 'r']) {
      // Fist just past the wrist, along the forearm.
      const h = P(JOINT['hand_' + side]), e = P(JOINT['lowerarm_' + side]);
      const dir = [h[0] - e[0], h[1] - e[1], h[2] - e[2]], n = Math.hypot(...dir) || 1;
      const fist = this.project(c, [h[0] + dir[0] / n * 0.05, h[1] + dir[1] / n * 0.05, h[2] + dir[2] / n * 0.05]);
      items.push({ z: fist[2], kind: 'disc', a: fist, r: 0.042 });
      // Ribs: three arcs per side, back to front around the chest.
      for (let k = 0; k < 3; k++) {
        const s = side === 'l' ? 1 : -1, y = 0.11 - k * 0.06, w = 0.13 - k * 0.008;
        const pts = [[0, y + 0.01, -0.04], [s * w * 0.75, y, -0.03], [s * w, y - 0.025, 0.02], [s * w * 0.7, y - 0.05, 0.075], [s * 0.025, y - 0.06, 0.095]]
          .map(o => this.project(c, local(JOINT.spine_03, o)));
        items.push({ z: pts.reduce((m, p) => m + p[2], 0) / pts.length, kind: 'rib', pts, r: 0.007 });
      }
    }
    const st = [this.project(c, local(JOINT.spine_03, [0, 0.12, 0.085])), this.project(c, local(JOINT.spine_03, [0, 0.0, 0.1]))];
    items.push({ z: (st[0][2] + st[1][2]) / 2, kind: 'rib', pts: st, r: 0.012 }); // sternum
    const skull = this.project(c, local(JOINT.head, [0, 0.09, 0.01]));
    items.push({ z: skull[2], kind: 'skull', a: skull, r: 0.1, eyes: [-1, 1].map(s => this.project(c, local(JOINT.head, [s * 0.036, 0.1, 0.085]))), jaw: this.project(c, local(JOINT.head, [0, 0.02, 0.06])) });

    items.sort((p, q) => q.z - p.z);
    const zMid = items.reduce((m, it) => m + it.z, 0) / items.length;
    for (const it of items) {
      const fill = it.z > zMid + 0.06 ? col.far : col.bone;
      if (it.kind === 'bone') this.capsule(it.a, it.b, it.r, fill);
      else if (it.kind === 'disc') this.disc(it.a, it.r, fill);
      else if (it.kind === 'rib') this.polyline(it.pts, it.r, fill);
      else if (it.kind === 'skull') this.skullAt(it, fill);
    }
  }

  segment(c, p, q) {
    const a = this.project(c, p), b = this.project(c, q);
    if (a[2] < 0.2 || b[2] < 0.2) return;
    this.ctx.beginPath(); this.ctx.moveTo(a[0], a[1]); this.ctx.lineTo(b[0], b[1]); this.ctx.stroke();
  }

  capsule(a, b, r, fill) {
    const { ctx } = this, ra = r * a[3], rb = r * b[3], w = (ra + rb);
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.colors.line; ctx.lineWidth = w + Math.max(2, w * 0.35);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // Knobbly joint ends
    for (const p of [a, b]) this.disc(p, r * 1.45, fill);
  }

  polyline(pts, r, fill) {
    const { ctx } = this, w = 2 * r * pts[0][3];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [style, lw] of [[this.colors.line, w + Math.max(2, w * 0.5)], [fill, w]]) {
      ctx.strokeStyle = style; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
  }

  disc(p, r, fill) {
    const { ctx } = this, rr = r * p[3];
    ctx.fillStyle = this.colors.line;
    ctx.beginPath(); ctx.arc(p[0], p[1], rr + Math.max(1, rr * 0.18), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); ctx.fill();
  }

  skullAt(it, fill) {
    const { ctx } = this;
    this.disc(it.a, it.r, fill);
    this.disc(it.jaw, it.r * 0.55, fill);
    // Eye sockets only when the face is toward the camera.
    for (const e of it.eyes) {
      if (e[2] > it.a[2]) continue;
      ctx.fillStyle = this.colors.socket;
      ctx.beginPath(); ctx.arc(e[0], e[1], 0.024 * e[3], 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Draw landmarks on the camera thumbnail overlay (picture coordinates, mirroring done by CSS).
export function drawLandmarks(canvas, image, w, h, color = '#d9875f') {
  const ctx = canvas.getContext('2d');
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } else ctx.clearRect(0, 0, w, h);
  if (!image) return;
  const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]];
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, w / 160); ctx.lineCap = 'round';
  for (const ch of CHAINS) {
    ctx.beginPath();
    ch.forEach((i, k) => (k ? ctx.lineTo(image[i].x * w, image[i].y * h) : ctx.moveTo(image[i].x * w, image[i].y * h)));
    ctx.stroke();
  }
  ctx.fillStyle = '#e6e8e6';
  for (const p of image) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, Math.max(2, w / 110), 0, Math.PI * 2); ctx.fill(); }
}
