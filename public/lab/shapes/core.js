// Shape Lab runtime. See docs/lab-shapes/SPEC.md for the module format.
(function () {
'use strict';
const MODS = window.LAB_MODULES || [];
const $ = id => document.getElementById(id);

// ------------------------------------------------------------------
// WebGL
// ------------------------------------------------------------------
const canvas = $('c'), stage = $('stage');
const gl = canvas.getContext('webgl', { antialias: false });
if (!gl) { $('err').hidden = false; return; }
const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

// ------------------------------------------------------------------
// Shared GLSL
// ------------------------------------------------------------------
const LIB = `
float hash(vec2 p){ p += uSeed; return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float hash3(vec3 p){ p += uSeed; return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)))*43758.5453); }
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1.0,0.0,0.0)), f.x), mix(hash3(i + vec3(0.0,1.0,0.0)), hash3(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0.0,0.0,1.0)), hash3(i + vec3(1.0,0.0,1.0)), f.x), mix(hash3(i + vec3(0.0,1.0,1.0)), hash3(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*noise3(p); p *= 2.03; a *= 0.5; } return s; }
float noise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x), mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y); }
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*noise2(p); p *= 2.03; a *= 0.5; } return s; }
float smin(float a, float b, float k){ if (k <= 0.0) return min(a, b); float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0 - h); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdBox2(vec2 p, vec2 b){ vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float sdOct2(vec2 p, float r){
  const vec3 k = vec3(-0.9238795325, 0.3826834323, 0.4142135623);
  p = abs(p);
  p -= 2.0*min(dot(vec2(k.x, k.y), p), 0.0)*vec2(k.x, k.y);
  p -= 2.0*min(dot(vec2(-k.x, k.y), p), 0.0)*vec2(-k.x, k.y);
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}
float sdArch(vec2 p, float w, float y0, float y1){
  float rect = sdBox2(vec2(p.x, p.y - (y0 + y1)*0.5), vec2(w, (y1 - y0)*0.5));
  return min(rect, length(vec2(p.x, p.y - y1)) - w);
}
float sdPointedArch(vec2 p, float w, float y0, float y1){
  float rect = sdBox2(vec2(p.x, p.y - (y0 + y1)*0.5), vec2(w, (y1 - y0)*0.5));
  float pt = max(max(length(p - vec2(-w, y1)) - 2.0*w, length(p - vec2(w, y1)) - 2.0*w), y1 - p.y);
  return min(rect, pt);
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h) - r; }
vec2 opU(vec2 a, vec2 b){ return a.x < b.x ? a : b; }
`;

const DEFORM_PARAMS = [
  ['Deform','dTwist','Twist (rad per unit height)',-1.5,1.5,0.005,0],
  ['Deform','dPivot','Pivot height',-2,12,0.05,0],
  ['Deform','dBend','Bend curvature',-0.3,0.3,0.001,0],
  ['Deform','dTaper','Taper',-0.15,0.15,0.001,0],
  ['Deform','dBulge','Bulge amount',-1,1,0.01,0],
  ['Deform','dBulgeY','Bulge height',0,12,0.05,3],
  ['Deform','dBulgeW','Bulge width',0.2,6,0.05,1.5],
  ['Deform','dWave','Wave shear',0,0.6,0.005,0],
  ['Deform','dWaveF','Wave frequency',0.2,8,0.05,1.5],
  ['Deform','dMelt','Melt',0,1,0.01,0],
  ['Deform','dMeltF','Melt frequency',0.2,6,0.05,1.5],
  ['Deform','dExplode','Explode',0,1.5,0.01,0],
  ['Deform','dCell','Explode cell size',0.2,3,0.01,0.8],
  ['Deform','dPolar','Polar copies (mod k)',1,24,1,1],
  ['Deform','dPolarR','Polar copy radius',0,15,0.05,6],
  ['Deform','dRepeat','Grid repeat spacing (0 = off)',0,20,0.1,0],
  ['Deform','dRepeatN','Grid repeat count',1,9,1,3],
  ['Deform','dSafety','Distance safety factor',0.2,1,0.01,1]
];
const DEFORM_SLOT = ['DEFORM','Custom deformer (runs last)','p (vec3, after the built-in deformers) → vec3. Try p + vec3(0.0, 0.3*sin(p.x*2.0), 0.0)','p'];

const SDF_CORE_A = `
vec3 deformP(vec3 p){
  if (P_dRepeat > 0.0){ float n = floor(P_dRepeatN*0.5); vec2 id = clamp(floor(p.xz/P_dRepeat + 0.5), -n, n); p.xz -= P_dRepeat*id; }
  if (P_dPolar >= 2.0){ float k = floor(P_dPolar); float s = 6.2831853/k; float a = atan(p.z, p.x); a = mod(a + 0.5*s, s) - 0.5*s; float r = length(p.xz); p.xz = r*vec2(cos(a), sin(a)); p.x -= P_dPolarR; }
  float y = p.y - P_dPivot;
  float ta = P_dTwist*y; float c = cos(ta), s = sin(ta);
  p.xz = vec2(c*p.x - s*p.z, s*p.x + c*p.z);
  float ba = P_dBend*y; c = cos(ba); s = sin(ba);
  vec2 xy = vec2(c*p.x - s*y, s*p.x + c*y); p.x = xy.x; p.y = xy.y + P_dPivot;
  p.xz /= max(1.0 + P_dTaper*(p.y - P_dPivot), 0.1);
  p.xz /= max(1.0 + P_dBulge*exp(-pow((p.y - P_dBulgeY)/P_dBulgeW, 2.0)), 0.1);
  p.x += P_dWave*sin(p.y*P_dWaveF); p.z += P_dWave*cos(p.y*P_dWaveF*1.3);
  if (P_dMelt > 0.0) p += P_dMelt*(vec3(noise3(p*P_dMeltF), noise3(p*P_dMeltF + 5.2), noise3(p*P_dMeltF + 9.7)) - 0.5);
  return ({{DEFORM}});
}
float deformLip(){
  return P_dSafety/(1.0 + abs(P_dTwist)*2.0 + abs(P_dBend)*6.0 + abs(P_dTaper)*4.0 + abs(P_dBulge)*0.8 + P_dWave*P_dWaveF + P_dMelt*P_dMeltF*1.2 + P_dExplode);
}
vec3 explodeP(vec3 p){
  if (P_dExplode <= 0.0) return p;
  vec3 cc = (floor(p/P_dCell) + 0.5)*P_dCell;
  return cc + (p - cc)*(1.0 + P_dExplode);
}
vec3 subjectLocal(vec3 p){ return deformP(explodeP(p)); }
vec2 subjectAt(vec3 p){
  float lip = deformLip();
  if (P_dExplode > 0.0){
    float e = 1.0 + P_dExplode;
    vec3 cc = (floor(p/P_dCell) + 0.5)*P_dCell;
    vec2 s = subjectMap(deformP(cc + (p - cc)*e));
    s.x = max(s.x*lip/e, sdBox(p - cc, vec3(P_dCell*0.5/e)));
    float far = subjectMap(deformP(p)).x*lip - P_dCell*2.0;
    s.x = min(s.x, max(P_dCell*0.35, far));
    return s;
  }
  vec2 s = subjectMap(deformP(p)); s.x *= lip; return s;
}
vec2 map(vec3 p){ vec2 s = subjectAt(p); s.y += 100.0; return opU(s, contextMap(p)); }
vec2 march(vec3 ro, vec3 rd){
  float t = 0.05; float m = -1.0;
  for (int i = 0; i < 220; i++){
    if (float(i) >= P_maxSteps) break;
    vec2 h = map(ro + rd*t);
    if (abs(h.x) < 0.0005*t){ m = h.y; break; }
    t += h.x*P_stepScale;
    if (t > 90.0) break;
  }
  return vec2(t, t > 90.0 ? -1.0 : m);
}
vec3 calcNormal(vec3 p, float t){
  float e = 0.0008 + 0.0003*t; vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy*map(p + k.xyy*e).x + k.yyx*map(p + k.yyx*e).x + k.yxy*map(p + k.yxy*e).x + k.xxx*map(p + k.xxx*e).x);
}
vec3 calcNormalS(vec3 p, float t){
  float e = 0.0008 + 0.0003*t; vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy*subjectMap(p + k.xyy*e).x + k.yyx*subjectMap(p + k.yyx*e).x + k.yxy*subjectMap(p + k.yxy*e).x + k.xxx*subjectMap(p + k.xxx*e).x);
}
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 48; i++){
    float h = map(ro + rd*t).x;
    res = min(res, P_shadowK*h/t);
    t += clamp(h, 0.01, 0.6);
    if (res < 0.002 || t > 30.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float calcAO(vec3 p, vec3 n){
  float o = 0.0, s = 1.0;
  for (int i = 0; i < 5; i++){ float h = 0.02 + 0.08*float(i); o += (h - map(p + n*h).x)*s; s *= 0.75; }
  return clamp(1.0 - 2.0*o, 0.0, 1.0);
}
`;
const SDF_MAIN = `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/(0.5*uRes.y);
  vec3 ta = vec3(0.0, P_camTY, 0.0);
  vec3 ro = ta + P_camDist*vec3(sin(P_camYaw)*cos(P_camPitch), sin(P_camPitch), cos(P_camYaw)*cos(P_camPitch));
  ro.y = max(ro.y, 0.2);
  vec3 fw = normalize(ta - ro); vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0))); vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x*rt + uv.y*up + fw/tan(radians(P_fov)*0.5));
  vec2 h = march(ro, rd);
  vec3 col;
  if (h.y < 0.0){ col = finishColor(background(rd), rd, 1e5, false); }
  else {
    vec3 pos = ro + rd*h.x;
    vec3 n = calcNormal(pos, h.x);
    bool subj = h.y > 99.5;
    vec3 sp = subj ? subjectLocal(pos) : pos;
    vec3 ln = subj ? calcNormalS(sp, h.x) : n;
    col = finishColor(shade(pos, sp, n, ln, rd, subj ? h.y - 100.0 : h.y, h.x), rd, h.x, true);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------
// Module state
// ------------------------------------------------------------------
let mod = null, PARAMS = [], SLOTS = [], DEF_P = {}, DEF_S = {};
let values = {}, applied = {}, prog = null, locs = {};
let seed = 0, dirty = true, interacting = false, lastInteract = 0;
const poke = () => { interacting = true; lastInteract = performance.now(); dirty = true; };
const storeKey = () => 'lab-shapes:' + mod.id;

function fill(src, slots) { return src.replace(/\{\{(\w+)\}\}/g, (m, k) => '(' + (slots[k] ?? DEF_S[k]) + ')'); }
function uniHeader() {
  return 'precision highp float;\n' + PARAMS.map(p => 'uniform float P_' + p[1] + ';').join('\n') +
    '\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uSeed;\nuniform sampler2D uTex;\nuniform vec2 uTexRes;\nuniform float uMirror;\n';
}
function fragSource(slots) {
  if (mod.kind === 'sdf') return uniHeader() + LIB + fill(mod.geo + SDF_CORE_A + mod.shade + SDF_MAIN, slots);
  return uniHeader() + LIB + fill(mod.frag, slots);
}
function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s) || 'Unknown compile error'; gl.deleteShader(s); return { err: log }; }
  return { sh: s };
}
function checkOnly(slots) { const r = compile(gl.FRAGMENT_SHADER, fragSource(slots)); if (r.sh) gl.deleteShader(r.sh); return r.err || ''; }
function buildProgram(slots) {
  const v = compile(gl.VERTEX_SHADER, VS);
  const f = compile(gl.FRAGMENT_SHADER, fragSource(slots));
  if (f.err) return { err: f.err };
  const p = gl.createProgram();
  gl.attachShader(p, v.sh); gl.attachShader(p, f.sh);
  gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p);
  gl.deleteShader(v.sh); gl.deleteShader(f.sh);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return { err: gl.getProgramInfoLog(p) || 'Link failed' };
  return { prog: p };
}
function install(p) {
  if (prog) gl.deleteProgram(prog);
  prog = p; locs = {};
  PARAMS.forEach(x => locs[x[1]] = gl.getUniformLocation(prog, 'P_' + x[1]));
  ['uRes', 'uTime', 'uSeed', 'uTex', 'uTexRes', 'uMirror'].forEach(k => locs[k] = gl.getUniformLocation(prog, k));
}

// ------------------------------------------------------------------
// Control rack
// ------------------------------------------------------------------
const decimals = step => { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; };
let rows = [], groups = {}, slotTA = {};
const RANGE = {};

function buildRack() {
  $('groups').innerHTML = ''; $('slots').innerHTML = '';
  rows = []; groups = {}; slotTA = {};
  PARAMS.forEach(([g, id, label, min, max, step]) => {
    RANGE[id] = [min, max];
    if (!groups[g]) {
      const d = document.createElement('details');
      if (Object.keys(groups).length === 0) d.open = true;
      d.innerHTML = '<summary>' + g + ' <span class="count"></span></summary><div class="grp"></div>';
      $('groups').appendChild(d);
      groups[g] = { el: d, body: d.querySelector('.grp'), n: 0 };
    }
    const row = document.createElement('div');
    row.className = 'prm';
    row.dataset.key = (label + ' P_' + id + ' ' + g).toLowerCase();
    row.innerHTML = '<label for="p-' + id + '"><span>' + label + '</span><code>P_' + id + '</code></label>' +
      '<input type="range" id="p-' + id + '" min="' + min + '" max="' + max + '" step="' + step + '">' +
      '<input type="number" id="n-' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" aria-label="' + label + ' value">';
    groups[g].body.appendChild(row); groups[g].n++;
    const r = row.querySelector('input[type=range]'), n = row.querySelector('input[type=number]');
    const dp = decimals(step);
    const set = (val, from, quiet) => {
      val = Math.min(max, Math.max(min, +val)); if (!isFinite(val)) return;
      values[id] = val;
      if (from !== r) r.value = val;
      if (from !== n) n.value = (+val).toFixed(dp);
      if (!quiet) { poke(); save(); }
    };
    r.addEventListener('input', () => set(r.value, r));
    n.addEventListener('change', () => set(n.value, n));
    rows.push({ row, id, g, set });
  });
  Object.entries(groups).forEach(([g, gr]) => {
    gr.el.querySelector('.count').textContent = gr.n;
    const b = document.createElement('button'); b.className = 'grp-reset'; b.textContent = 'Reset group';
    b.addEventListener('click', () => rows.filter(x => x.g === g).forEach(x => x.set(DEF_P[x.id])));
    gr.body.appendChild(b);
  });
  SLOTS.forEach(([id, label, locals, def]) => {
    const w = document.createElement('div'); w.className = 'slot';
    w.innerHTML = '<div class="slot-head"><b>' + label + '</b><button type="button">Reset</button></div>' +
      '<p>Locals: <code></code></p>' +
      '<textarea id="s-' + id + '" spellcheck="false" aria-label="' + label + ' formula"></textarea>';
    w.querySelector('code').textContent = locals;
    $('slots').appendChild(w);
    const ta = w.querySelector('textarea'); ta.value = def;
    ta.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') applyFormulas(); });
    w.querySelector('button').addEventListener('click', () => { ta.value = DEF_S[id]; ta.classList.remove('bad'); });
    slotTA[id] = ta;
  });
  $('slotCount').textContent = SLOTS.length;
  $('filter').value = '';
}
const setParam = (id, v, quiet) => { const r = rows.find(x => x.id === id); if (r) r.set(v, null, quiet); };

$('filter').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  Object.entries(groups).forEach(([g, gr]) => {
    let hits = 0;
    rows.filter(x => x.g === g).forEach(x => { const m = !q || x.row.dataset.key.includes(q); x.row.hidden = !m; if (m) hits++; });
    gr.el.hidden = hits === 0;
    if (q && hits) gr.el.open = true;
  });
});

// ------------------------------------------------------------------
// Formulas
// ------------------------------------------------------------------
function currentSlots() { const o = {}; SLOTS.forEach(s => o[s[0]] = slotTA[s[0]].value.trim() || DEF_S[s[0]]); return o; }
function status(msg, cls) { const s = $('status'); s.textContent = msg; s.className = 'status' + (cls ? ' ' + cls : ''); }
function applyFormulas(quiet) {
  const next = currentSlots();
  Object.values(slotTA).forEach(t => t.classList.remove('bad'));
  const res = buildProgram(next);
  if (res.err) {
    const bad = [];
    SLOTS.forEach(([id]) => {
      if (next[id] === applied[id]) return;
      if (checkOnly(Object.assign({}, applied, { [id]: next[id] }))) bad.push(id);
    });
    bad.forEach(id => slotTA[id].classList.add('bad'));
    const names = bad.map(id => SLOTS.find(x => x[0] === id)[1]);
    status('Not applied. ' + (names.length ? 'Problem in: ' + names.join(', ') + '.\n' : '') +
      res.err.split('\n').filter(Boolean).slice(0, 3).join('\n'), 'bad');
    return false;
  }
  install(res.prog); applied = next; dirty = true;
  status(quiet ? '' : 'Applied. Shader compiled.', 'ok'); save();
  return true;
}
$('apply').addEventListener('click', () => applyFormulas());
$('resetSlots').addEventListener('click', () => { SLOTS.forEach(([id]) => slotTA[id].value = DEF_S[id]); applyFormulas(); });

// ------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------
let saveT = 0;
function snapshot() { return { module: mod.id, params: Object.assign({}, values), slots: applied }; }
function save() { clearTimeout(saveT); const k = storeKey(), s = snapshot(); saveT = setTimeout(() => { try { localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }, 400); }
function loadPreset(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.params) Object.keys(obj.params).forEach(k => { if (k in DEF_P) setParam(k, obj.params[k], true); });
  if (obj.slots) SLOTS.forEach(([id]) => { if (typeof obj.slots[id] === 'string') slotTA[id].value = obj.slots[id]; });
}
$('copyPreset').addEventListener('click', () => {
  const txt = JSON.stringify(snapshot(), null, 2); $('presetBox').value = txt;
  const ok = () => { $('presetStatus').textContent = 'Preset copied to the clipboard.'; $('presetStatus').className = 'status ok'; };
  const fail = () => { $('presetBox').select(); $('presetStatus').textContent = 'Preset is in the box below, selected. Copy it from there.'; $('presetStatus').className = 'status'; };
  try { navigator.clipboard.writeText(txt).then(ok, fail); } catch (e) { fail(); }
});
$('loadPreset').addEventListener('click', () => {
  let obj;
  try { obj = JSON.parse($('presetBox').value); } catch (e) { $('presetStatus').textContent = 'That text isn’t valid JSON. Paste a preset copied from this page.'; $('presetStatus').className = 'status bad'; return; }
  if (obj.module && obj.module !== mod.id) { $('presetStatus').textContent = 'That preset is for "' + obj.module + '". Switch to that shape first.'; $('presetStatus').className = 'status bad'; return; }
  loadPreset(obj); const ok = applyFormulas(); dirty = true; save();
  $('presetStatus').textContent = ok ? 'Preset loaded.' : 'Values loaded, but a formula failed to compile. See Formulas.';
  $('presetStatus').className = 'status ' + (ok ? 'ok' : 'bad');
});
let armReset = false;
$('resetAll').addEventListener('click', e => {
  if (!armReset) { armReset = true; e.currentTarget.textContent = 'Tap again to confirm'; setTimeout(() => { armReset = false; $('resetAll').textContent = 'Reset everything'; }, 3000); return; }
  armReset = false; e.currentTarget.textContent = 'Reset everything';
  loadPreset({ params: DEF_P, slots: DEF_S }); applyFormulas(true); dirty = true; save();
  $('presetStatus').textContent = 'Everything reset to defaults.'; $('presetStatus').className = 'status ok';
});
$('seed').addEventListener('click', () => { seed = Math.random() * 100; dirty = true; });
$('resetView').addEventListener('click', () => { (mod.viewParams || []).forEach(k => setParam(k, DEF_P[k])); });

// ------------------------------------------------------------------
// Image texture sources (image modules)
// ------------------------------------------------------------------
const tex = gl.createTexture();
let texW = 1, texH = 1, texFromCam = false;
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
function uploadTex(src, w, h) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); texW = w; texH = h; } catch (e) {}
  dirty = true;
}
function defaultArt() {
  // modular times table (NT-001) as the default photo
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(512, 512, 40, 512, 512, 720);
  g.addColorStop(0, '#1d3a5f'); g.addColorStop(1, '#0a0f18');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  const N = 360, R = 440;
  const pt = k => [512 + R * Math.cos(2 * Math.PI * k / N - Math.PI / 2), 512 + R * Math.sin(2 * Math.PI * k / N - Math.PI / 2)];
  [[2, '#f0b07a'], [7, '#7fd1c0'], [34, '#e86f6f']].forEach(([a, col], j) => {
    x.strokeStyle = col; x.globalAlpha = j === 0 ? 0.55 : 0.3; x.lineWidth = 1.2;
    x.beginPath();
    for (let k = 0; k < N; k++) { const p = pt(k), q = pt((a * k) % N); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); }
    x.stroke();
  });
  x.globalAlpha = 1; x.strokeStyle = '#ffffff55'; x.lineWidth = 3;
  x.beginPath(); x.arc(512, 512, R, 0, Math.PI * 2); x.stroke();
  return c;
}
let defaultCanvas = null;
function useDefaultTex() { if (!defaultCanvas) defaultCanvas = defaultArt(); texFromCam = false; syncCamTex(); uploadTex(defaultCanvas, 1024, 1024); }
$('photoIn').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f); const img = new Image();
  img.onload = () => {
    // downscale large photos to keep upload fast
    const s = Math.min(1, 2048 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    texFromCam = false; syncCamTex(); uploadTex(c, c.width, c.height); URL.revokeObjectURL(url);
  };
  img.onerror = () => { gStatus('That file couldn’t be read as an image.', 'bad'); URL.revokeObjectURL(url); };
  img.src = url; e.target.value = '';
});
function syncCamTex() { const b = $('camTex'); b.setAttribute('aria-pressed', String(texFromCam)); b.textContent = texFromCam ? 'Warping live camera' : 'Warp live camera'; }
$('camTex').addEventListener('click', async () => {
  if (texFromCam) { useDefaultTex(); return; }
  if (!G.stream) { const ok = await startCam(); if (!ok) return; }
  texFromCam = true; syncCamTex();
});

// ------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------
function render(mul) {
  if (!prog) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = (values.renderScale ?? 1) * mul;
  const w = Math.max(64, Math.round(stage.clientWidth * dpr * s));
  const h = Math.max(64, Math.round(stage.clientHeight * dpr * s));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, w, h);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const AU = window.LAB_AUDIO, audioOn = AU && AU.running && mod.kind === 'image';
  const ovr = audioOn ? AU.overrides(values) : null;
  PARAMS.forEach(x => { if (locs[x[1]]) gl.uniform1f(locs[x[1]], ovr && x[1] in ovr ? ovr[x[1]] : values[x[1]]); });
  gl.uniform2f(locs.uRes, w, h);
  gl.uniform1f(locs.uTime, audioOn ? AU.time() : performance.now() / 1000);
  gl.uniform1f(locs.uSeed, seed);
  if (mod.kind === 'image') {
    if (texFromCam && G.stream && vid.readyState >= 2) uploadTex(vid, vid.videoWidth, vid.videoHeight);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(locs.uTex, 0);
    gl.uniform2f(locs.uTexRes, texW, texH);
    gl.uniform1f(locs.uMirror, texFromCam ? 1 : 0);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (audioOn) analysisPass();
}
// 128×128 copy of the image for sound analysis
const AS = 128;
let aFB = null, aTex = null; const aPx = new Uint8Array(AS * AS * 4); let aLast = 0;
function analysisPass() {
  const now = performance.now(); if (now - aLast < 66) return; aLast = now;
  if (!aFB) {
    aTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, aTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AS, AS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    aFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, aFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, aTex, 0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, aFB);
  gl.viewport(0, 0, AS, AS);
  gl.uniform2f(locs.uRes, AS, AS);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.readPixels(0, 0, AS, AS, gl.RGBA, gl.UNSIGNED_BYTE, aPx);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // warp centre in analysis pixels: screen z = (c + pan)·zoom
  const zx = (values.cx + values.panX) * values.zoom, zy = (values.cy + values.panY) * values.zoom;
  window.LAB_AUDIO.analyze(aPx, AS, values, [AS / 2 + zx * AS / 2, AS / 2 + zy * AS / 2]);
}
function loop(now) {
  gestureTick(now);
  if (interacting && now - lastInteract > 200) { interacting = false; dirty = true; }
  const animated = (mod.kind === 'image' && texFromCam) || (mod.animatedBy || []).some(k => values[k] !== 0);
  if (handActive || animated || (window.LAB_AUDIO && window.LAB_AUDIO.running && mod.kind === 'image')) dirty = true;
  if (dirty) { dirty = false; render(mod.kind === 'sdf' && (interacting || handActive || animated) ? 0.45 : 1); }
  requestAnimationFrame(loop);
}
new ResizeObserver(() => { dirty = true; }).observe(stage);

// orbit / pan / zoom
const pointers = new Map(); let pinch0 = 0, pinchV0 = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); pinchV0 = values[mod.zoomParam]; }
});
canvas.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId); if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY }; pointers.set(e.pointerId, cur);
  const dx = cur.x - prev.x, dy = cur.y - prev.y;
  if (pointers.size === 1) {
    if (mod.kind === 'sdf') { setParam('camYaw', values.camYaw - dx * 0.006, true); setParam('camPitch', values.camPitch + dy * 0.004, true); }
    else { const k = 2 / Math.min(stage.clientWidth, stage.clientHeight) / values.zoom; setParam('panX', values.panX + dx * k, true); setParam('panY', values.panY - dy * k, true); }
  } else if (pointers.size === 2 && pinch0 > 0) {
    const [a, b] = [...pointers.values()]; const r = Math.hypot(a.x - b.x, a.y - b.y) / pinch0;
    setParam(mod.zoomParam, mod.kind === 'sdf' ? pinchV0 / Math.max(0.1, r) : pinchV0 * r, true);
  }
  poke();
});
const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; save(); };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => {
  e.preventDefault(); const f = 1 + Math.sign(e.deltaY) * 0.07;
  setParam(mod.zoomParam, mod.kind === 'sdf' ? values[mod.zoomParam] * f : values[mod.zoomParam] / f, true); poke(); save();
}, { passive: false });

// ------------------------------------------------------------------
// Hand control
// ------------------------------------------------------------------
let handActive = false;
const G = { on: true, freeze: false, landmarker: null, stream: null, lastVT: -1, hands: [], samples: [], filt: {}, lastA: null, lastB: null, starting: null };
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const vid = $('cam'), ov = $('camOverlay'), octx = ov.getContext('2d');
const clamp01 = t => Math.min(1, Math.max(0, t));
function gStatus(t, cls) { const el = $('gStatus'); el.textContent = t; el.className = 'status' + (cls ? ' ' + cls : ''); }
const poseKey = () => 'lab-shapes-poses:' + mod.id;
function loadSamples() { try { G.samples = JSON.parse(localStorage.getItem(poseKey()) || '[]') || []; } catch (e) { G.samples = []; } updateCount(); }
function saveSamples() { try { localStorage.setItem(poseKey(), JSON.stringify(G.samples)); } catch (e) {} updateCount(); }
function updateCount() {
  const n = G.samples.length;
  $('gCount').textContent = n === 0 ? 'No learned poses for this shape. Using the starter mapping.'
    : n === 1 ? '1 learned pose. Learn one more to switch to your poses.'
    : n + ' learned poses. Your hands blend between them.';
  $('mapLegend').hidden = n >= 2;
}
const pending = {};
function setLive(id, v) {
  const r = RANGE[id]; if (!r) return;
  v = Math.min(r[1], Math.max(r[0], v)); values[id] = v; pending[id] = v;
}
setInterval(() => { for (const id in pending) { const row = rows.find(x => x.id === id); if (row) row.set(pending[id], null, true); delete pending[id]; } }, 120);
setInterval(() => { if (handActive) save(); }, 2000);

class OneEuro {
  constructor(minCut, beta) { this.mc = minCut; this.b = beta; this.x = null; this.dx = 0; this.t = 0; }
  a(c, dt) { const r = 2 * Math.PI * c * dt; return r / (r + 1); }
  f(x, t) {
    if (this.x === null) { this.x = x; this.t = t; return x; }
    const dt = Math.max(1e-3, (t - this.t) / 1000); this.t = t;
    this.dx += this.a(1, dt) * ((x - this.x) / dt - this.dx);
    this.x += this.a(this.mc + this.b * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}
function smoothF(pre, f, t) {
  const o = {};
  for (const k in f) { const key = pre + k; if (!G.filt[key]) G.filt[key] = new OneEuro(1.0, 0.05); o[k] = G.filt[key].f(f[k], t); }
  return o;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function features(lm) {
  const s = dist(lm[0], lm[9]) || 1e-3;
  const curl = i => clamp01((2.0 - dist(lm[i], lm[0]) / s) / 1.1);
  const open = 1 - (curl(8) + curl(12) + curl(16) + curl(20)) / 4;
  const pinch = clamp01((dist(lm[4], lm[8]) / s - 0.2) / 1.0);
  const vx = -(lm[9].x - lm[0].x), vy = lm[9].y - lm[0].y;
  return { x: 1 - lm[9].x, y: lm[9].y, open, pinch, tilt: Math.atan2(vx, -vy), size: s };
}
function vecOf(A, B) {
  return [A.x, A.y, A.open, A.pinch, A.tilt / 1.5, (A.size - 0.1) * 4,
    B ? 2 : 0, B ? B.x : 0, B ? B.y : 0, B ? B.open : 0, B ? B.pinch : 0, B ? B.tilt / 1.5 : 0];
}
function applyStarter(A, B) {
  (mod.starter || []).forEach(([feat, id, o0, o1, i0, i1]) => {
    const [h, k] = feat.split('.');
    const src = h === 'A' ? A : B; if (!src) return;
    const t = (src[k] - i0) / (i1 - i0);
    let v = o0 + (o1 - o0) * clamp01(t);
    if (RANGE[id] && PARAMS.find(p => p[1] === id)[5] >= 1) v = Math.round(v);
    setLive(id, v);
  });
}
function applyLearned(v) {
  const S = G.samples; const ws = new Array(S.length); let sum = 0;
  for (let i = 0; i < S.length; i++) {
    let d2 = 0; for (let k = 0; k < v.length; k++) { const d = v[k] - S[i].v[k]; d2 += d * d; }
    if (d2 < 1e-6) { ws.fill(0); ws[i] = 1; sum = 1; break; }
    ws[i] = 1 / Math.pow(d2, 1.5); sum += ws[i];
  }
  Object.keys(S[0].p).forEach(id => {
    if (!(id in DEF_P)) return;
    let acc = 0; for (let i = 0; i < S.length; i++) acc += ws[i] * (S[i].p[id] ?? DEF_P[id]);
    setLive(id, acc / sum);
  });
}
function drawOverlay(hs) {
  const w = vid.videoWidth || 160, h = vid.videoHeight || 120;
  if (ov.width !== w || ov.height !== h) { ov.width = w; ov.height = h; } else octx.clearRect(0, 0, w, h);
  const r = Math.max(2.5, w / 100);
  hs.forEach((hd, i) => {
    octx.fillStyle = i === 0 ? '#d9875f' : '#7fb7a8';
    for (const p of hd.lm) { octx.beginPath(); octx.arc(p.x * w, p.y * h, r, 0, 6.2832); octx.fill(); }
  });
}
function gestureTick(now) {
  if (!G.on || !G.landmarker || !G.stream || vid.readyState < 2) { handActive = false; return; }
  if (vid.currentTime !== G.lastVT) {
    G.lastVT = vid.currentTime;
    let res;
    try { res = G.landmarker.detectForVideo(vid, now); } catch (e) { return; }
    const hs = (res.landmarks || []).map(lm => ({ lm, f: features(lm) })).sort((a, b) => b.f.x - a.f.x);
    G.hands = hs; drawOverlay(hs);
    const n = hs.length;
    if (G.freeze) gStatus('Frozen. Tap Unfreeze to keep shaping.');
    else gStatus(n ? 'Tracking ' + n + ' hand' + (n > 1 ? 's' : '') + '.' : 'No hands in view.', n ? 'ok' : '');
  }
  handActive = G.hands.length > 0 && !G.freeze;
  if (!G.hands.length) return;
  const A = smoothF('A', G.hands[0].f, now);
  const B = G.hands[1] ? smoothF('B', G.hands[1].f, now) : null;
  G.lastA = A; G.lastB = B;
  if (G.freeze) return;
  if (G.samples.length >= 2) applyLearned(vecOf(A, B)); else applyStarter(A, B);
}
function startCam() {
  if (G.starting) return G.starting;
  G.starting = (async () => {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      gStatus('Camera needs this page opened from an https link in Safari or Chrome.', 'bad'); return false;
    }
    if (!G.stream) {
      gStatus('Starting camera…');
      try {
        G.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        vid.srcObject = G.stream; await vid.play();
      } catch (e) {
        G.stream = null; $('camStart').hidden = false;
        gStatus(e && e.name === 'NotAllowedError'
          ? 'Camera permission is off. Tap Start camera, or allow camera for this site in browser settings.'
          : 'The camera didn’t start (' + ((e && e.message) || e) + '). Tap Start camera to retry.', 'bad');
        return false;
      }
    }
    $('camStart').hidden = true; $('camBox').hidden = !G.on;
    if (G.on && !G.landmarker) {
      gStatus('Loading the hand model (about 8 MB, first time only)…');
      try {
        const mp = await import(MP + '/vision_bundle.mjs');
        const fs = await mp.FilesetResolver.forVisionTasks(MP + '/wasm');
        const mk = d => mp.HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate: d }, runningMode: 'VIDEO', numHands: 2 });
        try { G.landmarker = await mk('GPU'); } catch (e) { G.landmarker = await mk('CPU'); }
      } catch (e) {
        gStatus('The hand model didn’t load (' + ((e && e.message) || e) + '). Check your connection, then turn Hand control off and on.', 'bad');
        return true;
      }
    }
    if (G.on) gStatus('Show your hand to the camera.');
    return true;
  })().finally(() => { G.starting = null; });
  return G.starting;
}
function stopCam() {
  if (!texFromCam && G.stream) { G.stream.getTracks().forEach(t => t.stop()); G.stream = null; vid.srcObject = null; }
  $('camBox').hidden = true; handActive = false; G.hands = []; $('camStart').hidden = true;
  gStatus('Hand control is off. The sliders work as normal.');
}
const sw = $('gSwitch');
function setOn(v) {
  G.on = v; sw.setAttribute('aria-checked', String(v));
  try { localStorage.setItem('lab-shapes-hand', v ? '1' : '0'); } catch (e) {}
  if (v) startCam(); else stopCam();
}
sw.addEventListener('click', () => setOn(!G.on));
$('camStart').addEventListener('click', () => startCam());
$('gFreeze').addEventListener('click', e => { G.freeze = !G.freeze; e.currentTarget.textContent = G.freeze ? 'Unfreeze' : 'Freeze'; e.currentTarget.setAttribute('aria-pressed', String(G.freeze)); if (G.freeze) save(); });
$('gLearn').addEventListener('click', () => {
  if (!G.lastA || !G.hands.length) { gStatus('Hold your hand in view, then tap Learn pose.', 'bad'); return; }
  const p = {}; PARAMS.forEach(x => { if (!(mod.noLearnGroups || []).includes(x[0])) p[x[1]] = values[x[1]]; });
  G.samples.push({ v: vecOf(G.lastA, G.lastB), p }); saveSamples();
  gStatus('Pose learned. Change the sliders, hold a different pose, and learn again.', 'ok');
});
let armClear = false;
$('gClear').addEventListener('click', e => {
  if (!G.samples.length) return;
  if (!armClear) { armClear = true; e.currentTarget.textContent = 'Tap again to clear'; setTimeout(() => { armClear = false; $('gClear').textContent = 'Clear poses'; }, 3000); return; }
  armClear = false; e.currentTarget.textContent = 'Clear poses';
  G.samples = []; saveSamples(); gStatus('Poses cleared. Back to the starter mapping.');
});

// ------------------------------------------------------------------
// Module switching
// ------------------------------------------------------------------
function buildTabs() {
  const nav = $('tabs'); nav.innerHTML = '';
  MODS.forEach(m => { const a = document.createElement('a'); a.href = '#' + m.id; a.textContent = m.name; a.dataset.id = m.id; nav.appendChild(a); });
  const eye = document.createElement('a'); eye.href = '../procedural-iris/'; eye.textContent = 'Procedural Iris ↗'; nav.appendChild(eye);
}
function selectModule(id) {
  const m = MODS.find(x => x.id === id) || MODS[0];
  if (mod && mod.id === m.id) return;
  if (mod) save();
  mod = m;
  PARAMS = m.params.concat(m.kind === 'sdf' ? DEFORM_PARAMS : (window.LAB_AUDIO ? window.LAB_AUDIO.params : []));
  SLOTS = m.slots.concat(m.kind === 'sdf' ? [DEFORM_SLOT] : []);
  DEF_P = {}; PARAMS.forEach(p => DEF_P[p[1]] = p[6]);
  DEF_S = {}; SLOTS.forEach(s => DEF_S[s[0]] = s[3]);
  values = Object.assign({}, DEF_P); applied = Object.assign({}, DEF_S);
  buildRack();
  PARAMS.forEach(p => setParam(p[1], p[6], true));
  let saved = null; try { saved = JSON.parse(localStorage.getItem(storeKey()) || 'null'); } catch (e) {}
  if (saved) loadPreset(saved);
  if (!applyFormulas(true)) { SLOTS.forEach(([sid]) => slotTA[sid].value = DEF_S[sid]); applied = {}; applyFormulas(true); }
  status('');
  document.title = m.name + ' · Shape Lab';
  $('title').textContent = m.name;
  $('desc').textContent = m.description;
  $('hint').textContent = m.kind === 'sdf' ? 'Drag to orbit · pinch or scroll to zoom' : 'Drag to pan · pinch or scroll to zoom';
  $('mapLegend').innerHTML = '<b>Starter mapping.</b> ' + m.starterText +
    '<br><b>Learn pose:</b> set the sliders to a look, hold a hand pose, tap Learn pose. With two or more learned poses, your hands blend between them and every parameter moves at once.';
  $('photoBtn').hidden = m.kind !== 'image'; $('camTex').hidden = m.kind !== 'image';
  $('soundOn').hidden = m.kind !== 'image'; $('sSwitch').hidden = m.kind !== 'image'; $('soundLater').hidden = m.kind === 'image';
  if (m.kind !== 'image' && window.LAB_AUDIO && window.LAB_AUDIO.running) { window.LAB_AUDIO.stop(); $('sSwitch').setAttribute('aria-checked', 'false'); }
  [...$('tabs').children].forEach(a => { if (a.dataset.id) a.toggleAttribute('aria-current', a.dataset.id === m.id); if (a.dataset.id === m.id) a.setAttribute('aria-current', 'page'); });
  G.filt = {}; loadSamples();
  dirty = true;
}
window.addEventListener('hashchange', () => selectModule(location.hash.slice(1)));

// boot
buildTabs();
useDefaultTex();
selectModule(location.hash.slice(1));
let handPref = '1'; try { handPref = localStorage.getItem('lab-shapes-hand') || '1'; } catch (e) {}
setOn(handPref !== '0');
requestAnimationFrame(loop);
})();
