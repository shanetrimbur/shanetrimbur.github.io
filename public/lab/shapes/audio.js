// Shape Lab audio: derives harmony, rhythm and timbre from the rendered image, drives the AudioWorklet synth.
(function () {
'use strict';
const $ = id => document.getElementById(id);
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const TN = 512;

const SOUND_PARAMS = [
  ['Sound','bpm','Tempo (BPM)',40,180,1,84],
  ['Sound','masterVol','Volume',0,1,0.01,0.6],
  ['Sound','padVol','Pad level (wave terrain)',0,1,0.01,0.6],
  ['Sound','leadVol','Pluck level',0,1,0.01,0.5],
  ['Sound','bassVol','Bass level',0,1,0.01,0.45],
  ['Sound','percVol','Percussion level',0,1,0.01,0.3],
  ['Sound','reverb','Space (reverb)',0,1,0.01,0.35],
  ['Sound','root','Key center (MIDI note)',24,60,1,45],
  ['Sound','chordTones','Chord tones from hue',2,5,1,3],
  ['Sound','orbitR','Orbit radius',0.05,0.95,0.01,0.45],
  ['Sound','orbitShape','Orbit shape: circle → Lissajous 3:2',0,1,0.01,0],
  ['Sound','primRoot','Melody root g (primitive mod 13: 2, 6, 7, 11)',2,12,1,2],
  ['Sound','melSteps','Melody loop length (16ths)',3,16,1,16],
  ['Sound','percSteps','Percussion loop length (coprime → long cycles)',3,16,1,7],
  ['Sound','density','Rhythm density bias',-1,1,0.01,0],
  ['Sound','lockVisuals','Lock spin and ripple to tempo (0/1)',0,1,1,1]
];

const DEF_F = {
  HUE_TO_PC: '(i * 7) % 12',
  MELODY: '(Math.pow(g, (k % 12) + 1) % 13) - 1',
  RHYTHM: 'Math.floor((i + 1) * hits / steps) !== Math.floor(i * hits / steps)'
};
const F_ARGS = { HUE_TO_PC: ['i'], MELODY: ['k', 'g'], RHYTHM: ['i', 'hits', 'steps'] };
const F_DOC = {
  HUE_TO_PC: 'i (hue bin 0–11, red → magenta) → pitch class 0–11. Default walks the circle of fifths.',
  MELODY: 'k (note index), g (melody root) → scale degree. Default: powers of g mod 13, an all-interval row.',
  RHYTHM: 'i (step), hits, steps → true/false. Default: Euclidean rhythm (Bresenham form of Bjorklund).'
};

const A = {
  running: false, ctx: null, node: null, wet: null, dry: null, beat: 0, lastAn: 0, last: null,
  params: SOUND_PARAMS, fns: {}, src: Object.assign({}, DEF_F)
};

function compileF(id, src) {
  const fn = new Function(...F_ARGS[id], '"use strict"; return (' + src + ');');
  const test = id === 'HUE_TO_PC' ? fn(3) : id === 'MELODY' ? fn(5, 2) : fn(1, 3, 8);
  if (id !== 'RHYTHM' && !isFinite(test)) throw new Error('returned ' + test);
  return fn;
}
function loadFormulas() {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('lab-shapes-sound-formulas') || '{}') || {}; } catch (e) {}
  Object.keys(DEF_F).forEach(id => {
    const src = typeof saved[id] === 'string' ? saved[id] : DEF_F[id];
    try { A.fns[id] = compileF(id, src); A.src[id] = src; } catch (e) { A.fns[id] = compileF(id, DEF_F[id]); A.src[id] = DEF_F[id]; }
  });
}
function sStatus(t, cls) { const el = $('sStatus'); el.textContent = t; el.className = 'status' + (cls ? ' ' + cls : ''); }

function makeIR(ctx, secs) {
  const len = Math.round(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

A.start = async function () {
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const AC = window.AudioContext || window.webkitAudioContext;
    A.ctx = new AC();
    if (!A.ctx.audioWorklet) throw new Error('this browser has no AudioWorklet support');
    await A.ctx.audioWorklet.addModule('audio-worklet.js');
    A.node = new AudioWorkletNode(A.ctx, 'lab-synth', { outputChannelCount: [2] });
    const conv = A.ctx.createConvolver(); conv.buffer = makeIR(A.ctx, 2.8);
    A.dry = A.ctx.createGain(); A.wet = A.ctx.createGain();
    A.node.connect(A.dry).connect(A.ctx.destination);
    A.node.connect(conv).connect(A.wet).connect(A.ctx.destination);
    A.node.port.onmessage = e => { if (e.data.beat != null) A.beat = e.data.beat; };
    await A.ctx.resume();
    A.running = true;
    sStatus('Listening to the image…', 'ok');
    return true;
  } catch (e) {
    A.running = false;
    sStatus('Sound didn’t start (' + ((e && e.message) || e) + ').', 'bad');
    return false;
  }
};
A.stop = function () {
  if (A.ctx) { try { A.ctx.close(); } catch (e) {} }
  A.ctx = null; A.node = null; A.running = false;
  sStatus('Sound is off.');
};
A.time = () => (A.ctx ? A.ctx.currentTime : performance.now() / 1000);

// visuals locked to tempo: one kaleidoscope fold per bar, one ripple per beat
A.overrides = function (v) {
  if (!A.running || !(v.lockVisuals > 0.5)) return null;
  const beat = 60 / v.bpm, bar = beat * 4;
  const k = v.kal >= 2 ? Math.floor(v.kal) : 0;
  const o = {};
  o.spinSpeed = k ? (2 * Math.PI / k) / bar * (v.spinSpeed < 0 ? -1 : 1) : v.spinSpeed;
  o.rippleSpeed = v.ripple > 0 ? 2 * Math.PI / beat : v.rippleSpeed;
  o.waveSpeed = v.wave > 0 ? Math.PI / beat : v.waveSpeed;
  return o;
};

function euclid(steps, hits) {
  const f = A.fns.RHYTHM, p = [];
  for (let i = 0; i < steps; i++) { let x = false; try { x = !!f(i, hits, steps); } catch (e) {} p.push(x ? 1 : 0); }
  return p;
}

// px: RGBA Uint8Array S×S (row 0 = bottom); center: pixel coords of the warp center
A.analyze = function (px, S, v, center) {
  if (!A.running || !A.node) return;
  const now = performance.now(); if (now - A.lastAn < 66) return; A.lastAn = now;
  const hist = new Float32Array(12), lum = new Float32Array(S * S);
  let bright = 0, sat = 0;
  for (let i = 0, j = 0; i < S * S; i++, j += 4) {
    const r = px[j] / 255, g = px[j + 1] / 255, b = px[j + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const s = mx > 0 ? d / mx : 0;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    bright += mx; sat += s;
    if (s > 0.12 && mx > 0.12) {
      let h = 0;
      if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; }
      h = (h / 6 + 1) % 1;
      hist[Math.floor(h * 12) % 12] += s * mx;
    }
  }
  bright /= S * S; sat /= S * S;
  let edge = 0, ec = 0;
  for (let y = 1; y < S - 1; y += 2) for (let x = 1; x < S - 1; x += 2) {
    const i = y * S + x; edge += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + S] - lum[i - S]); ec++;
  }
  edge /= Math.max(1, ec);

  // wave terrain: luminance along an orbit around the warp centre
  const table = new Float32Array(TN), R = v.orbitR * S * 0.5, sh = v.orbitShape;
  const at = (x, y) => {
    x = Math.min(S - 1.001, Math.max(0, x)); y = Math.min(S - 1.001, Math.max(0, y));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * S + x0;
    return (lum[i] * (1 - fx) + lum[i + 1] * fx) * (1 - fy) + (lum[i + S] * (1 - fx) + lum[i + S + 1] * fx) * fy;
  };
  let mean = 0;
  for (let i = 0; i < TN; i++) {
    const t = 2 * Math.PI * i / TN;
    const ox = (1 - sh) * Math.cos(t) + sh * Math.cos(3 * t), oy = (1 - sh) * Math.sin(t) + sh * Math.sin(2 * t);
    table[i] = at(center[0] + R * ox, center[1] + R * oy); mean += table[i];
  }
  mean /= TN;
  let peak = 1e-4;
  const sm = new Float32Array(TN);
  for (let i = 0; i < TN; i++) { sm[i] = (table[(i + TN - 1) % TN] + 2 * table[i] + table[(i + 1) % TN]) / 4 - mean; peak = Math.max(peak, Math.abs(sm[i])); }
  const flat = peak < 0.01;
  for (let i = 0; i < TN; i++) sm[i] = flat ? Math.sin(2 * Math.PI * i / TN) : sm[i] / peak;

  // harmony from hue
  const bins = [...hist.keys()].sort((a, b) => hist[b] - hist[a]);
  const maxH = hist[bins[0]];
  const pcOf = i => { try { const p = Math.round(A.fns.HUE_TO_PC(i)); return ((p % 12) + 12) % 12; } catch (e) { return (i * 7) % 12; } };
  const picks = [];
  if (maxH > 0.5) for (const i of bins) { if (hist[i] < maxH * 0.05) break; const pc = pcOf(i); if (!picks.includes(pc)) picks.push(pc); }
  // chord: strongest hues first, skipping tones a semitone or tritone from ones already chosen
  let chord = [];
  for (const pc of picks) {
    if (chord.length >= Math.round(v.chordTones)) break;
    if (chord.every(c => { const d = Math.abs(c - pc) % 12; const iv = Math.min(d, 12 - d); return iv !== 1 && iv !== 6; })) chord.push(pc);
  }
  if (chord.length < 2) chord = bright > 0.45 ? [0, 4, 7] : [0, 3, 7];
  for (const add of [7, bright > 0.45 ? 4 : 3, 10]) { if (chord.length >= Math.round(v.chordTones)) break; const pc = (chord[0] + add) % 12; if (!chord.includes(pc)) chord.push(pc); }
  let scale = picks.slice(0, 7);
  if (scale.length < 5) scale = Array.from(new Set(scale.concat(bright > 0.45 ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]))).slice(0, 7);
  scale.sort((a, b) => a - b);
  const bassPc = chord[0];

  // rhythm from edges and brightness
  const mSteps = Math.round(v.melSteps), pSteps = Math.round(v.percSteps);
  const mHits = Math.max(1, Math.min(mSteps, Math.round(mSteps * Math.min(1, Math.max(0.06, edge * 4 + 0.12 + v.density * 0.4)))));
  const pHits = Math.max(1, Math.min(pSteps, Math.round(pSteps * Math.min(1, Math.max(0.1, 0.25 + bright * 0.4 + v.density * 0.3)))));
  const melSeq = [];
  const g = Math.round(v.primRoot);
  for (let k = 0; k < 24; k++) { let d = 0; try { d = Math.round(A.fns.MELODY(k, g)); } catch (e) {} melSeq.push(isFinite(d) ? d : 0); }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  const root = Math.round(v.root);
  const pad = chord.map(pc => midi(root + 12 + pc));
  A.node.port.postMessage({
    table: sm,
    state: {
      bpm: v.bpm, pad, scale, melSeq, melPat: euclid(mSteps, mHits), percPat: euclid(pSteps, pHits), root, bassPc,
      padVol: v.padVol * (0.5 + 0.5 * Math.min(1, sat * 2)), leadVol: v.leadVol, bassVol: v.bassVol, percVol: v.percVol,
      cutoff: 0.015 + bright * 0.2, master: v.masterVol
    }
  });
  if (A.dry && A.ctx) { A.dry.gain.setTargetAtTime(1 - v.reverb * 0.5, A.ctx.currentTime, 0.1); A.wet.gain.setTargetAtTime(v.reverb * 0.9, A.ctx.currentTime, 0.1); }
  const nm = pc => NAMES[(root + pc) % 12];
  sStatus('♩ ' + Math.round(v.bpm) + ' · chord ' + chord.map(nm).join(' ') + ' · melody ' + mHits + '/' + mSteps + ' · percussion ' + pHits + '/' + pSteps +
    ' · cycle ' + lcm(mSteps, pSteps) + ' steps · bar ' + (Math.floor(A.beat / 4) + 1), 'ok');
};
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return a / gcd(a, b) * b; }

// ---- UI ----
function buildFormulaUI() {
  const box = $('sFormulas'); box.innerHTML = '';
  Object.keys(DEF_F).forEach(id => {
    const w = document.createElement('div'); w.className = 'slot';
    w.innerHTML = '<div class="slot-head"><b>' + id + '</b><button type="button">Reset</button></div><p></p><textarea spellcheck="false"></textarea>';
    w.querySelector('p').textContent = F_DOC[id];
    const ta = w.querySelector('textarea'); ta.id = 'sf-' + id; ta.value = A.src[id]; ta.setAttribute('aria-label', id + ' formula');
    w.querySelector('button').addEventListener('click', () => { ta.value = DEF_F[id]; ta.classList.remove('bad'); });
    box.appendChild(w);
  });
}
function applySoundFormulas() {
  const errs = [];
  Object.keys(DEF_F).forEach(id => {
    const ta = $('sf-' + id); ta.classList.remove('bad');
    try { A.fns[id] = compileF(id, ta.value.trim() || DEF_F[id]); A.src[id] = ta.value.trim() || DEF_F[id]; }
    catch (e) { ta.classList.add('bad'); errs.push(id + ': ' + e.message); }
  });
  try { localStorage.setItem('lab-shapes-sound-formulas', JSON.stringify(A.src)); } catch (e) {}
  const st = $('sfStatus');
  st.textContent = errs.length ? 'Kept the previous version of: ' + errs.join(' · ') : 'Applied.';
  st.className = 'status ' + (errs.length ? 'bad' : 'ok');
}

loadFormulas();
window.LAB_AUDIO = A;
document.addEventListener('DOMContentLoaded', () => {
  buildFormulaUI();
  $('sfApply').addEventListener('click', applySoundFormulas);
  const sw = $('sSwitch');
  sw.addEventListener('click', async () => {
    if (A.running) { A.stop(); sw.setAttribute('aria-checked', 'false'); return; }
    sw.setAttribute('aria-checked', 'true');
    sStatus('Starting sound…');
    const ok = await A.start();
    if (!ok) sw.setAttribute('aria-checked', 'false');
  });
});
})();
