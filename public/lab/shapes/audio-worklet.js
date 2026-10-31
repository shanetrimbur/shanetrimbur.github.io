// Shape Lab synth: step clock + voices, driven by state derived from the image.
const N = 512;
class LabSynth extends AudioWorkletProcessor {
  constructor() {
    super();
    this.tabA = new Float32Array(N); this.tabB = new Float32Array(N); this.xf = 1;
    for (let i = 0; i < N; i++) { this.tabA[i] = this.tabB[i] = Math.sin(2 * Math.PI * i / N); }
    this.s = { bpm: 84, pad: [], scale: [0, 2, 4, 7, 9], melSeq: [0], melPat: [1, 0, 0, 0], percPat: [1, 0, 0], root: 45, bassPc: 0,
      padVol: 0.6, leadVol: 0.5, bassVol: 0.5, percVol: 0.3, cutoff: 0.1, master: 0.6 };
    this.pv = [];
    this.ks = [];
    this.bass = { ph: 0, f: 55, env: 0 };
    this.perc = { env: 0, prev: 0 };
    this.lastStep = -1; this.melK = 0; this.lp = [0, 0];
    this.port.onmessage = e => this.msg(e.data);
  }
  msg(d) {
    if (d.table) {
      const cur = new Float32Array(N);
      for (let i = 0; i < N; i++) cur[i] = this.tabA[i] * (1 - this.xf) + this.tabB[i] * this.xf;
      this.tabA = cur; this.tabB = Float32Array.from(d.table); this.xf = 0;
    }
    if (d.state) {
      Object.assign(this.s, d.state);
      if (d.state.pad) {
        const f = d.state.pad;
        for (let j = 0; j < Math.max(f.length, this.pv.length); j++) {
          if (!this.pv[j]) this.pv[j] = { ph: Math.random(), f: f[j] || 110, tf: f[j] || 110, amp: 0, tAmp: 0 };
          if (j < f.length) { this.pv[j].tf = f[j]; this.pv[j].tAmp = 1 / f.length; } else this.pv[j].tAmp = 0;
        }
      }
    }
  }
  midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  step(n) {
    const s = this.s;
    if (s.melPat.length && s.melPat[n % s.melPat.length]) {
      const L = s.scale.length || 1;
      const deg = s.melSeq.length ? s.melSeq[this.melK % s.melSeq.length] : 0;
      this.melK++;
      const d = ((deg % (2 * L)) + 2 * L) % (2 * L);
      const pc = s.scale[d % L];
      this.pluck(this.midi(s.root + 24 + pc + 12 * Math.floor(d / L)), 0.75 + 0.25 * Math.random());
    }
    if (n % 16 === 0) { this.bass.f = this.midi(s.root + s.bassPc); this.bass.env = 1; }
    if (s.percPat.length && s.percPat[n % s.percPat.length]) this.perc.env = 1;
  }
  pluck(f, a) {
    const len = Math.max(2, Math.round(sampleRate / f));
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) buf[i] = (Math.random() * 2 - 1) * a;
    this.ks.push({ buf, i: 0, life: sampleRate * 2.5 });
    if (this.ks.length > 10) this.ks.shift();
  }
  process(_, outputs) {
    const out = outputs[0], L = out[0], R = out[1] || out[0], s = this.s, n = L.length;
    const sps = sampleRate * 60 / s.bpm / 4;
    const A = this.tabA, B = this.tabB;
    for (let i = 0; i < n; i++) {
      const st = Math.floor((currentFrame + i) / sps);
      if (st !== this.lastStep) { this.lastStep = st; this.step(st); if (st % 4 === 0) this.port.postMessage({ beat: st / 4 }); }
      if (this.xf < 1) this.xf = Math.min(1, this.xf + 1 / 4096);
      let pl = 0, pr = 0;
      for (let j = 0; j < this.pv.length; j++) {
        const v = this.pv[j];
        v.f += (v.tf - v.f) * 0.0005; v.amp += (v.tAmp - v.amp) * 0.0003;
        v.ph += v.f / sampleRate; if (v.ph >= 1) v.ph -= 1;
        const x = v.ph * N, k = x | 0, fr = x - k, k1 = (k + 1) & (N - 1);
        const a = A[k] + (A[k1] - A[k]) * fr, b = B[k] + (B[k1] - B[k]) * fr;
        const smp = (a * (1 - this.xf) + b * this.xf) * v.amp;
        const pan = 0.5 + 0.35 * Math.sin(j * 2.1);
        pl += smp * (1 - pan); pr += smp * pan;
      }
      this.lp[0] += s.cutoff * (pl - this.lp[0]); this.lp[1] += s.cutoff * (pr - this.lp[1]);
      let l = this.lp[0] * s.padVol, r = this.lp[1] * s.padVol;
      let k = 0;
      for (let j = 0; j < this.ks.length; j++) {
        const q = this.ks[j], b = q.buf, idx = q.i, nx = idx + 1 === b.length ? 0 : idx + 1;
        const y = b[idx]; b[idx] = (b[idx] + b[nx]) * 0.4985; q.i = nx; q.life--; k += y;
      }
      l += k * s.leadVol * 0.5; r += k * s.leadVol * 0.5;
      const bs = this.bass;
      bs.ph += bs.f / sampleRate; if (bs.ph >= 1) bs.ph -= 1; bs.env *= 0.99993;
      const bv = Math.sin(2 * Math.PI * bs.ph) * bs.env * s.bassVol * 0.6; l += bv; r += bv;
      const pc = this.perc;
      if (pc.env > 1e-4) {
        const w = Math.random() * 2 - 1, hp = w - pc.prev; pc.prev = w; pc.env *= 0.9985;
        const p = hp * pc.env * s.percVol * 0.22; l += p * 0.8; r += p;
      }
      L[i] = Math.tanh(l * s.master * 3.2); R[i] = Math.tanh(r * s.master * 3.2);
    }
    if (this.ks.length) this.ks = this.ks.filter(q => q.life > 0);
    return true;
  }
}
registerProcessor('lab-synth', LabSynth);
