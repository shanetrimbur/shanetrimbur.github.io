// Hand Fighter — app. Camera (or demo) -> hand features -> puppet -> skeleton.
import { Puppet, STANCE } from './body.js';
import { measure, HandStream, NeutralCapture, makeHand, REST_DIGITS } from './hand.js';
import { Stage, VIEWS, drawLandmarks } from './render.js';
import { Tracker } from './tracker.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('lab-fighter:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lab-fighter:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

const stage = new Stage($('view'));
const puppet = new Puppet();
let stream = new HandStream();
let capture = null;          // NeutralCapture while recording the neutral pose
let mode = 'idle';           // 'idle' | 'camera' | 'demo'
let last = { m: null, image: null, w: 640, h: 480 };
let wakeLock = null;

function status(text, cls) {
  const el = $('status');
  el.textContent = text;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

const tracker = new Tracker($('cam'), {
  onResult: r => onHand(r.image, r.world, r.t, tracker.aspect, tracker.mirror, $('cam').videoWidth, $('cam').videoHeight),
  onStatus: status,
});

// ------------------------------------------------------------------
// One hand frame from either source
// ------------------------------------------------------------------
function onHand(image, world, t, aspect, mirror, w, h) {
  const m = image ? measure(image, world, { aspect, mirror }) : { valid: false, reason: 'no hand in view' };
  const flat = stream.push(m, t);
  if (flat && (capture || !puppet.neutral)) {
    if (!capture) capture = new NeutralCapture(12);
    if (capture.add(flat, m)) {
      puppet.setNeutral(capture.value, capture.sides);
      capture = null;
      status('Neutral set. Move your fingers: index and middle kick, thumb and pinky punch.', 'ok');
    }
  }
  puppet.feed(flat, t);
  last = { m, image, w: w || 640, h: h || 480 };
  drawLandmarks($('camOverlay'), image, last.w, last.h);
}

// ------------------------------------------------------------------
// Demo: a scripted synthetic hand (no camera)
// ------------------------------------------------------------------
let demoAt = 0;
function demoHand(t) {
  const s = t / 1000, TAU = Math.PI * 2;
  const walk = Math.sin(s * TAU * 0.7);
  const jab = Math.max(0, Math.sin(s * TAU * 0.45)) ** 3;
  const cross = Math.max(0, Math.sin(s * TAU * 0.45 + Math.PI)) ** 3;
  const kick = Math.max(0, Math.sin(s * TAU * 0.16)) ** 6;
  return makeHand({
    chirality: 'right',
    roll: 12 * Math.sin(s * TAU * 0.21),
    cx: 0.5 + 0.04 * Math.sin(s * 1.3),
    cy: 0.4 + 0.03 * Math.sin(s * 1.7),
    digits: {
      thumb: { open: 40 + 42 * jab, curl: 25 },
      index: { flex: 15 + 14 * Math.max(0, walk) + 48 * kick, curl: 20 + 26 * Math.max(0, walk) * (1 - kick), spread: 4 },
      middle: { flex: 15 + 14 * Math.max(0, -walk), curl: 20 + 26 * Math.max(0, -walk), spread: 0 },
      ring: { ...REST_DIGITS.ring },
      pinky: { flex: 20, curl: 25, spread: -8 - 24 * cross },
    },
  });
}

function startDemo() {
  stopCamera();
  mode = 'demo';
  stream = new HandStream();
  const cap = new NeutralCapture(12), t0 = performance.now();
  for (let i = 0; i < 12; i++) {
    const h = makeHand();
    const m = measure(h.image, h.world);
    cap.add(stream.push(m, t0 - (12 - i) * 33), m);
  }
  puppet.setNeutral(cap.value, cap.sides);
  capture = null;
  $('camBox').classList.remove('mirror');
  $('cam').hidden = true;
  $('startCard').hidden = true;
  $('btnDemo').setAttribute('aria-pressed', 'true');
  $('btnNeutral').disabled = true;
  status('Demo: a synthetic right hand walks, jabs, crosses and kicks. Nothing is read from the camera.', 'ok');
}

function stopDemo() {
  if (mode !== 'demo') return;
  mode = 'idle';
  $('btnDemo').setAttribute('aria-pressed', 'false');
  drawLandmarks($('camOverlay'), null, 640, 480);
  last = { m: null, image: null, w: 640, h: 480 };
  status('Demo stopped.');
}

// ------------------------------------------------------------------
// Camera
// ------------------------------------------------------------------
async function startCamera() {
  stopDemo();
  $('startCard').hidden = true;
  $('cam').hidden = false;
  stream = new HandStream();
  puppet.neutral = null;   // auto-capture from the first steady frames
  capture = null;
  const ok = await tracker.start();
  if (!ok) { $('startCard').hidden = false; return; }
  mode = 'camera';
  $('camBox').classList.toggle('mirror', tracker.mirror);
  $('btnCam').textContent = 'Stop camera';
  $('btnNeutral').disabled = false;
  $('btnSwitch').hidden = false;
  try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
  if (!tracker.mirror) status('Rear camera on. Hold your hand behind the phone: fingers down, palm toward the camera.');
  else status('Using a ' + (tracker.facing === 'user' ? 'front' : 'desktop') + ' camera (picture mirrored). On a phone, the rear camera is the one to use.');
}

function stopCamera() {
  if (mode !== 'camera') return;
  tracker.stopStream();
  mode = 'idle';
  $('btnCam').textContent = 'Start camera';
  $('btnNeutral').disabled = true;
  $('btnSwitch').hidden = true;
  drawLandmarks($('camOverlay'), null, 640, 480);
  last = { m: null, image: null, w: 640, h: 480 };
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  status('Camera off.');
}

// ------------------------------------------------------------------
// Readouts
// ------------------------------------------------------------------
const ROWS = [
  ['thumb', 'Thumb'], ['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky'],
];
$('digits').innerHTML = ROWS.map(([k, label]) =>
  `<div class="digit" id="d-${k}"><div class="who"><b>${label}</b><span id="dw-${k}"></span></div>` +
  `<div class="meter"><i id="dm-${k}"></i></div><code id="dc-${k}">–</code></div>`).join('');

function role(k) {
  const s = puppet.sides;
  if (k === 'ring') return 'not used';
  if (k === 'index' || k === 'middle') return 'leg on the ' + (s.legLeftDigit === k ? 'left' : 'right');
  return 'arm on the ' + (s.armLeftDigit === k ? 'left' : 'right');
}

const HINT = {
  'too close': 'Too close: move your hand further from the lens.',
  'too far': 'Too far: bring your hand closer.',
  'near edge': 'Near the edge: centre your hand in the picture.',
};

function updateUi() {
  const m = last.m;
  for (const [k] of ROWS) {
    $('dw-' + k).textContent = role(k);
    $('d-' + k).classList.toggle('off', k === 'ring');
    const d = m && m.valid ? m.digits[k] : null;
    let fill = 0, text = '–';
    if (d && k === 'thumb') { fill = d.open / 90; text = `open ${d.open.toFixed(0)}° · curl ${d.curl.toFixed(0)}°`; }
    else if (d) {
      fill = k === 'pinky' ? Math.abs(d.spread ?? 0) / 40 : k === 'ring' ? d.curl / 180 : d.flex / 90;
      text = `flex ${d.flex.toFixed(0)}° · curl ${d.curl.toFixed(0)}° · spread ${d.spread === null ? 'hidden' : d.spread.toFixed(0) + '°'}`;
    }
    $('dm-' + k).style.width = (Math.min(1, Math.max(0, fill)) * 100).toFixed(1) + '%';
    $('dc-' + k).textContent = text;
  }

  const light = $('light');
  let hint = '';
  if (mode === 'idle') { light.className = 'light'; }
  else if (!m || !m.valid) { light.className = 'light bad'; hint = 'No hand: back to guard.'; }
  else if (m.framing.status !== 'ok') { light.className = 'light warn'; hint = HINT[m.framing.status]; }
  else { light.className = 'light ok'; }
  if (capture) hint = 'Hold your relaxed puppet pose still: setting neutral…';
  else if (mode === 'camera' && !puppet.neutral && m && m.valid) hint = 'Hold still: setting neutral…';
  $('hint').textContent = hint;

  if (mode === 'camera') {
    const st = tracker.stats();
    $('rFps').textContent = st.camFps + ' fps';
    $('rMs').textContent = st.detectMs ? st.detectMs.toFixed(0) + ' ms' : '–';
    $('rTracked').textContent = Math.round(st.tracked * 100) + '%';
  } else if (mode === 'demo') {
    $('rFps').textContent = '30 fps'; $('rMs').textContent = 'demo'; $('rTracked').textContent = '100%';
  } else {
    $('rFps').textContent = '–'; $('rMs').textContent = '–'; $('rTracked').textContent = '–';
  }
  $('rFrame').textContent = m && m.valid ? m.framing.status : '–';
}

// ------------------------------------------------------------------
// Controls
// ------------------------------------------------------------------
$('startCam').addEventListener('click', startCamera);
$('startDemo').addEventListener('click', startDemo);
$('btnCam').addEventListener('click', () => (mode === 'camera' ? stopCamera() : startCamera()));
$('btnDemo').addEventListener('click', () => (mode === 'demo' ? stopDemo() : startDemo()));
$('btnNeutral').addEventListener('click', () => { capture = new NeutralCapture(12); status('Hold your relaxed puppet pose still…'); });
$('btnSwitch').addEventListener('click', async () => {
  const label = await tracker.switchCamera();
  if (label) {
    $('camBox').classList.toggle('mirror', tracker.mirror);
    stream = new HandStream(); puppet.neutral = null; capture = null;
    status('Using ' + label + '.');
  }
});

const viewNames = Object.keys(VIEWS);
function setView(v) {
  stage.view = viewNames.includes(v) ? v : '3/4';
  $('btnView').textContent = 'View: ' + stage.view;
  store.set('view', stage.view);
}
$('btnView').addEventListener('click', () => setView(viewNames[(viewNames.indexOf(stage.view) + 1) % viewNames.length]));
setView(store.get('view', '3/4'));

for (const [id, out, key, apply] of [
  ['gLegs', 'oLegs', 'legs', v => { puppet.gains.legs = v; }],
  ['gArms', 'oArms', 'arms', v => { puppet.gains.arms = v; }],
  ['gSmooth', 'oSmooth', 'smooth', v => { puppet.smoothing = v; }],
]) {
  const input = $(id);
  const set = v => { input.value = String(v); $(out).textContent = Number(v).toFixed(2); apply(Number(v)); store.set(key, Number(v)); };
  set(store.get(key, Number(input.value)));
  input.addEventListener('input', () => set(input.value));
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && mode === 'camera' && navigator.wakeLock && !wakeLock) {
    navigator.wakeLock.request('screen').then(l => { wakeLock = l; }).catch(() => {});
  }
});

// ------------------------------------------------------------------
// Frame loop
// ------------------------------------------------------------------
let prev = performance.now(), lastUi = 0;
function frame(now) {
  const dt = Math.min(0.25, Math.max(0, (now - prev) / 1000));
  prev = now;
  if (mode === 'demo' && now - demoAt >= 33) {
    demoAt = now;
    const h = demoHand(now);
    onHand(h.image, h.world, now, 4 / 3, false, 640, 480);
  }
  puppet.update(dt, now);
  stage.draw(puppet.pose());
  if (now - lastUi > 100) { lastUi = now; updateUi(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (location.hash === '#demo') startDemo();
window.addEventListener('hashchange', () => { if (location.hash === '#demo') startDemo(); });

// For the headless check and debugging in the console.
window.handFighter = { puppet, stage, get mode() { return mode; }, get last() { return last; }, STANCE };
