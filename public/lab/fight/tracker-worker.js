let detector;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const { FilesetResolver, HandLandmarker } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
      );
      const files = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      detector = await HandLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
      postMessage({ type: "ready" });
    } catch (error) {
      postMessage({ type: "error", message: String(error) });
    }
  } else if (data.type === "frame") {
    try {
      const result = detector.detectForVideo(data.bitmap, data.time);
      postMessage({
        type: "result",
        time: data.time,
        generation: data.generation,
        landmarks: result.landmarks[0] || null,
      });
    } catch (error) {
      postMessage({
        type: "error",
        generation: data.generation,
        message: String(error),
      });
    } finally {
      data.bitmap.close();
    }
  }
};
