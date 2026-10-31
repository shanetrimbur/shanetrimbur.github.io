// Hand Fighter — tracker. Rear camera + MediaPipe Hand Landmarker (same pin and model as Shape Lab).
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class Tracker {
  constructor(video, { onResult, onStatus }) {
    this.video = video;
    this.onResult = onResult;
    this.onStatus = onStatus;
    this.stream = null;
    this.landmarker = null;
    this.deviceId = null;
    this.mirror = false;
    this.running = false;
    this.lastVT = -1;
    this.frames = [];   // timestamps of camera frames seen in the last second
    this.seen = [];     // [t, hadHand] over the last 3 s
    this.detectMs = 0;
    this.delegate = '';
    this.gen = 0;       // bumps on every restart so an old frame loop stops
  }

  get aspect() { return (this.video.videoWidth || 4) / (this.video.videoHeight || 3); }

  stats() {
    const now = performance.now();
    this.frames = this.frames.filter(t => now - t < 1000);
    this.seen = this.seen.filter(([t]) => now - t < 3000);
    const hit = this.seen.filter(([, h]) => h).length;
    return {
      camFps: this.frames.length,
      detectMs: this.detectMs,
      tracked: this.seen.length ? hit / this.seen.length : 0,
      delegate: this.delegate,
    };
  }

  async start(deviceId = null) {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatus('The camera needs this page opened from an https link in Safari or Chrome.', 'bad');
      return false;
    }
    this.stopStream();
    this.onStatus('Starting the camera…');
    const video = deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (e) {
      this.stream = null;
      this.onStatus(e && e.name === 'NotAllowedError'
        ? 'Camera permission is off. Allow the camera for this site in your browser settings, then tap Start camera.'
        : 'The camera didn’t start (' + ((e && e.message) || e) + ').', 'bad');
      return false;
    }
    const track = this.stream.getVideoTracks()[0];
    const settings = (track && track.getSettings && track.getSettings()) || {};
    this.deviceId = settings.deviceId || deviceId || null;
    // Rear camera: show the picture as it is. Anything else (laptop webcam, front camera): mirror.
    this.mirror = settings.facingMode !== 'environment';
    this.facing = settings.facingMode || 'unknown';
    this.video.srcObject = this.stream;
    try { await this.video.play(); } catch (e) { /* autoplay with muted+playsinline normally succeeds */ }

    if (!this.landmarker) {
      this.onStatus('Loading the hand model (about 8 MB, first time only)…');
      try {
        const mp = await import(MP + '/vision_bundle.mjs');
        const fs = await mp.FilesetResolver.forVisionTasks(MP + '/wasm');
        const make = delegate => mp.HandLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        try { this.landmarker = await make('GPU'); this.delegate = 'GPU'; }
        catch (e) { this.landmarker = await make('CPU'); this.delegate = 'CPU'; }
      } catch (e) {
        this.onStatus('The hand model didn’t load (' + ((e && e.message) || e) + '). Check your connection and tap Start camera again.', 'bad');
        return false;
      }
    }
    this.running = true;
    this.loop();
    this.onStatus('Hold your hand behind the phone: fingers down, palm toward the camera.');
    return true;
  }

  async switchCamera() {
    let cams = [];
    try { cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch (e) { cams = []; }
    if (cams.length < 2) { this.onStatus('Only one camera found.'); return null; }
    const i = cams.findIndex(c => c.deviceId === this.deviceId);
    const next = cams[(i + 1) % cams.length];
    await this.start(next.deviceId);
    return next.label || 'camera ' + ((i + 1) % cams.length + 1);
  }

  loop() {
    const gen = ++this.gen;
    const v = this.video;
    const tick = () => {
      if (!this.running || gen !== this.gen) return;
      if (v.readyState >= 2 && v.currentTime !== this.lastVT && this.landmarker) {
        this.lastVT = v.currentTime;
        const now = performance.now();
        this.frames.push(now);
        let res = null;
        try { res = this.landmarker.detectForVideo(v, now); } catch (e) { res = null; }
        const ms = performance.now() - now;
        this.detectMs = this.detectMs ? this.detectMs * 0.9 + ms * 0.1 : ms;
        const image = res && res.landmarks && res.landmarks[0];
        const world = res && res.worldLandmarks && res.worldLandmarks[0];
        this.seen.push([now, !!image]);
        this.onResult(image ? { image, world, t: now } : { image: null, world: null, t: now });
      }
      this.schedule(tick);
    };
    this.schedule(tick);
  }

  schedule(fn) {
    if (this.video.requestVideoFrameCallback) this.video.requestVideoFrameCallback(() => fn());
    else requestAnimationFrame(fn);
  }

  stopStream() {
    this.running = false;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
