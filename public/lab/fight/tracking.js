import { clamp } from "./controller.js";
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function handFeatures(lm) {
  if (
    !Array.isArray(lm) ||
    lm.length !== 21 ||
    lm.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return null;
  const size = distance(lm[0], lm[9]);
  if (
    size < 0.035 ||
    size > 0.65 ||
    lm.some((p) => p.x < 0.015 || p.x > 0.985 || p.y < 0.015 || p.y > 0.985)
  )
    return null;
  const curl = [8, 12, 16, 20].map((i) =>
    clamp((2 - distance(lm[i], lm[0]) / size) / 1.1, 0, 1),
  );
  return {
    x: (lm[0].x + lm[9].x) / 2,
    y: (lm[0].y + lm[9].y) / 2,
    size,
    curl: curl.reduce((s, x) => s + x, 0) / 4,
    tilt: Math.atan2(lm[9].x - lm[0].x, lm[0].y - lm[9].y),
  };
}
export class HandTracker {
  constructor(video, status, onPoints) {
    this.video = video;
    this.status = status;
    this.onPoints = onPoints;
    this.lastSeen = -Infinity;
    this.stream = null;
    this.worker = null;
    this.detector = null;
    this.latest = null;
    this.neutral = null;
    this.samples = [];
    this.busy = false;
    this.lastFrame = 0;
    this.generation = 0;
    this.frames = 0;
  }
  async initDetector() {
    if (this.worker || this.detector) return;
    let worker;
    try {
      worker = new Worker(new URL("./tracker-worker.js", import.meta.url));
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Worker initialization timed out")),
          22000,
        );
        worker.onerror = () => {
          clearTimeout(timer);
          reject(Error("Worker unavailable"));
        };
        worker.onmessage = ({ data }) => {
          if (data.type === "ready") {
            clearTimeout(timer);
            resolve();
          } else if (data.type === "error") {
            clearTimeout(timer);
            reject(Error(data.message));
          }
        };
        worker.postMessage({ type: "init" });
      });
      this.worker = worker;
      worker.onerror = () =>
        this.fail("Hand tracking stopped. Open Menu and restart the camera.");
      worker.onmessage = ({ data }) => {
        if (
          data.generation !== undefined &&
          data.generation !== this.generation
        )
          return;
        this.busy = false;
        if (data.type === "result" && this.stream)
          this.accept(data.landmarks, data.time);
        else if (data.type === "error")
          this.fail("Hand tracking stopped. Open Menu and restart the camera.");
      };
    } catch {
      worker?.terminate();
      // Older browsers without worker/offscreen support use a rate-limited main-thread detector.
      const mp = await import(MP + "/vision_bundle.mjs");
      const files = await mp.FilesetResolver.forVisionTasks(MP + "/wasm");
      const options = {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      };
      try {
        this.detector = await mp.HandLandmarker.createFromOptions(
          files,
          options,
        );
      } catch {
        options.baseOptions.delegate = "CPU";
        this.detector = await mp.HandLandmarker.createFromOptions(
          files,
          options,
        );
      }
    }
  }
  async start(facing = "environment") {
    if (this.starting) return this.starting;
    this.starting = this.startInternal(facing).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }
  async startInternal(facing) {
    this.stop();
    const generation = this.generation;
    try {
      if (!isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw Error("Open the HTTPS link in Safari to use the camera.");
      this.status("Allow the rear camera. No video is uploaded.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode:
            facing === "environment" ? { exact: "environment" } : "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      const track = stream.getVideoTracks()[0];
      track.onended = () =>
        this.fail("Camera disconnected. Open Menu to restart.");
      this.status("Loading hand tracking… first launch needs a connection.");
      await this.initDetector();
      if (generation !== this.generation) return false;
      this.calibrate();
      this.lastVideoTime = -1;
      return true;
    } catch (error) {
      this.stop();
      this.status(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Try again from Menu, or use touch practice."
          : error.name === "OverconstrainedError"
            ? "Rear camera unavailable. Choose another camera in Menu."
            : error.message,
      );
      return false;
    }
  }
  fail(message) {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.detector?.close();
    this.detector = null;
    this.status(message);
  }
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stream = null;
    this.video.srcObject = null;
    this.lastSeen = -Infinity;
    this.latest = null;
    this.neutral = null;
    this.samples = [];
    this.busy = false;
    this.onPoints(null);
  }
  calibrate() {
    this.samples = [];
    this.neutral = null;
    this.latest = null;
    this.status(
      "Show your whole hand behind the phone. Hold it still to calibrate.",
    );
  }
  accept(landmarks, time) {
    const features = handFeatures(landmarks);
    this.onPoints(features ? landmarks : null);
    if (!features || performance.now() - time > 350) return;
    this.frames++;
    this.lastSeen = performance.now();
    this.latest = features;
    if (!this.neutral) {
      this.samples.push(features);
      if (this.samples.length > 20) this.samples.shift();
      if (this.samples.length === 20) {
        const span = (key) =>
          Math.max(...this.samples.map((x) => x[key])) -
          Math.min(...this.samples.map((x) => x[key]));
        if (span("x") < 0.065 && span("y") < 0.065) {
          this.neutral = Object.fromEntries(
            ["x", "y", "size", "tilt"].map((k) => [
              k,
              this.samples.reduce((s, x) => s + x[k], 0) / 20,
            ]),
          );
          this.status(
            "Ready. Move sideways to extend; return to center to recover.",
          );
        }
      }
    }
  }
  async tick(now) {
    if (
      !this.stream ||
      (!this.worker && !this.detector) ||
      this.busy ||
      this.video.readyState < 2 ||
      now - this.lastFrame < (this.worker ? 50 : 80) ||
      this.video.currentTime === this.lastVideoTime
    )
      return;
    this.lastFrame = now;
    this.lastVideoTime = this.video.currentTime;
    this.busy = true;
    const generation = this.generation;
    try {
      if (this.worker) {
        const bitmap = await createImageBitmap(this.video);
        if (generation !== this.generation) {
          bitmap.close();
          this.busy = false;
          return;
        }
        this.worker.postMessage(
          { type: "frame", bitmap, time: now, generation },
          [bitmap],
        );
      } else {
        const r = this.detector.detectForVideo(this.video, now);
        this.accept(r.landmarks[0] || null, now);
        this.busy = false;
      }
    } catch {
      this.busy = false;
      this.fail("Tracking interrupted. Open Menu to restart the camera.");
    }
  }
  input(now) {
    if (!this.neutral || !this.latest || now - this.lastSeen > 220)
      return { active: false };
    const a = this.latest,
      n = this.neutral;
    return {
      active: true,
      extension: clamp(
        (Math.abs(a.x - n.x) / Math.max(0.1, n.size) - 0.14) / 1.15,
        0,
        1,
      ),
      aim: clamp(
        1.3 - ((a.y - n.y) / Math.max(0.12, n.size)) * 0.48,
        0.75,
        1.55,
      ),
      lean: clamp((a.tilt - n.tilt) * 0.1, -0.1, 0.1),
    };
  }
}
