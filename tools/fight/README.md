# Hand Fighter — finger puppet prototype (v0.2)

Static entry: `public/lab/fight/index.html`, published by the existing Astro Pages workflow at `/lab/fight/`. Pages is configured for **GitHub Actions**, not branch publishing. Do not re-enable the competing legacy branch publisher.

No backend or camera upload. The shared BodyParts3D geometry is 2,542,600 bytes for both fighters. Three.js is pinned and minified; MediaPipe 0.10.14 and its hand model load only after Start camera. Classic-worker CPU tracking is preferred (its WASM loader requires importScripts); rate-limited GPU/CPU main-thread fallback remains available. HTTPS and camera permission are required.

## Controls

- **Index / middle:** independently bend and extend the lead/rear arm. Curl retracts; straighten extends. Spreading fingers changes the arm target and elbow bend plane. Both arms can move at once. Hold the palm a little forward and alternate finger curls for jabs/crosses.
- **Ring / little:** curl to lift the lead/rear leg; move the hand toward the opponent to extend the kick. One foot remains grounded. If both are curled, the first active leg retains priority until lowered.
- **Palm / wrist / thumb:** palm height aims; lowering it also crouches. Wrist tilt leans the torso; thumb spread twists it. Bone lengths and reach remain bounded.
- **Direction:** signed screen displacement multiplied by fighter facing. Left fighter punches toward screen-right; right fighter punches toward screen-left. Moving away retracts; no absolute-value mapping. Optional mirror setting applies to BOTH preview and input. Front-camera selection enables mirroring by default.
- **Thumb drag:** floating joystick anywhere in the camera arena or on the lower strip. Drag right/left moves right/left on screen, regardless of fighter side; release/cancel/blur stops. No step buttons.
- **Top menu:** choose left/right fighter (starts a fresh round), dummy/sparring partner, camera, mirroring, recalibration, touch practice, reset. Opening it pauses and releases held input.
- **Touch practice:** arena drag strikes in the direction of the opponent; the lower strip moves. Select one of four practice limbs. Keyboard 1–4 selects; A/D moves left/right, J strikes, G guards, up/down aims.

## Files and boundaries

- `puppet.js`: 21-landmark joint-angle features, finger spread, signed and mirrored mapping, pure thumb mapping.
- `tracking.js` / `tracker-worker.js`: camera, stable neutral calibration, stale/lost tracking rejection, worker, background cleanup. Tracking loss retracts all four limbs to guard.
- `controller.js`: fixed 60 Hz update, four independent limb channels, AI/player shared rules, ground support selection, capped target speeds, root separation, one hit per extension, bounded damage and combo feedback. Thumb travel is allowed during strikes. No raw landmark impulses.
- `rig.js`: original MSKIN001 GPU skinning and source inverse bind matrices; analytic two-link IK. All four limb targets, crouch and torso lean/twist drive the existing anatomy. Targets stop at the opponent's body. This remains kinematic arcade movement, not dynamic balance/ragdoll or validated biomechanics; walking can slide at contact transitions.
- `main.js` / HTML / CSS: renderer, camera preview, floating joystick, finger meters, side selection, menu, feedback.
- `assets/`: derived licensed anatomy only; provenance and limitations in CREDITS.md. No source videos, purchased assets, textbooks or Tracer app code.

First-party runtime imports and CSS carry `v=0.2.0` URLs to avoid old/new module mixtures in phone caches. Bump this together for future releases. Three.js and the unchanged mesh stay cacheable.

## Verification

`node --test tools/fight/controller.test.mjs`

The tests cover signed/mirrored controls, independent fingers, both player sides, screen-relative thumb movement/release, tracking loss, simultaneous attacks, damage/guard/rearm, hostile inputs, clock suspension, and the actual anatomy across 288 pose combinations. Fixed limb lengths and a supporting foot are checked with the real mesh.

Optional browser smoke test, using Playwright installed separately:
`node tools/fight/browser-check.cjs`

Environment options: `PLAYWRIGHT_MODULE`, `CHROME_EXECUTABLE`, `PLAYWRIGHT_BROWSERS_PATH`, `SCREENSHOT_DIR`, and `TEST_BROWSER=chromium|webkit`. Default local files are intercepted, so no preview server is needed. `FIGHT_URL` tests a deployed URL. Browser tests exercise actual UI/control/rig readers; synthetic media acquisition and landmark worker results replace hardware/ML only. They do not establish real-camera accuracy. The actual MediaPipe worker separately initialized and inferred a blank frame in both Chromium and WebKit during v0.1 verification; that worker is unchanged.

The static demo and tests are excluded from Astro's TypeScript project to avoid type-inferencing the vendored renderer; controller/rig tests run in the Pages workflow. Asset export is reproducible via `tools/fight/export_anatomy.py` from the private runtime inputs.

## Orange acceptance still required

1. Rear-camera ergonomics, neutral calibration and correct physical right/left alignment. If needed, mirror preview and input together in Menu.
2. Index/middle independence, then ring/little knee lift and kicks. Check wrist/torso control and combinations.
3. Thumb drag/release during punches/kicks, both player sides, menu pause, tracking loss, background/restart and rotation.
4. Frame rate, latency and heat after five minutes; acceptable shoulder/wrist deformation and foot contact.

Online multiplayer, recording export, finger-bone rendering, dynamic ragdolls and production biomechanics remain outside this prototype. Shapes and Tracer remain unchanged.
