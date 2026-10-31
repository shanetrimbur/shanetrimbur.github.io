# Hand Fighter prototype

Static entry: `public/lab/fight/index.html`, published by the existing Astro Pages workflow at `/lab/fight/`.

No new production packages or backend. Three.js is pinned and vendored; MediaPipe 0.10.14 and its hand model load only after Start camera. Classic-worker CPU tracking (MediaPipe’s WASM loader uses importScripts) is preferred; a rate-limited GPU/CPU main-thread fallback supports browsers without the worker path. No camera frames leave the device. HTTPS and user camera permission required.

## Rules and boundaries

- `controller.js`: pure 60 Hz kinematic game state. Root Y is not driven by hand tracking. Separate root collision/separation, clamped controls, capped extension/aim speeds, tracking-loss guard, retract-before-limb-switch, one damage event per extension, fixed damage, bounded catch-up after suspension. Computer and player use the same update rules.
- `rig.js`: reads the existing MSKIN001 mesh; GPU skinning with the original inverse bind transforms. Two-link IK keeps bone lengths constant and fixes bend planes. Right support foot stays grounded during a left kick. This is NOT a dynamic balance solver, ragdoll, or biomechanically validated animation.
- `tracking.js` / `tracker-worker.js`: rear camera by default (no silent front-camera substitution), whole-hand visibility checks, 20 stable samples to calibrate, 220 ms tracking timeout, bounded relative palm input. Moving sideways extends; returning to neutral retracts. Vertical palm displacement aims; wrist tilt adds slight lean. Individual fingers do not directly control separate limbs in this first experiment.
- `main.js`: arena, touch and keyboard fallback, hold-to-move pads, top pause menu, camera cleanup on background, opponent selection and round reset.
- Assets: same BodyParts3D mesh as Tracer, closed-hand corrections baked once; no video. Characters share geometry. Separate source attribution in CREDITS.md and the menu.

## Verification

`node --test tools/fight/controller.test.mjs`

Serve `public/` locally with a static HTTP server, then open `/lab/fight/`. Localhost is a secure camera context. Public iPhone testing requires the Pages HTTPS URL. Diagnostic snapshot: `window.handFighter.snapshot()`.

Device acceptance on Orange remains manual:
1. Rear camera permission and real hand tracking; whole-hand visibility at a comfortable distance.
2. Calibrate, extend/retract and aim, switch each limb, step and guard with the holding thumb.
3. Hide labels, use the top menu, rotate the phone, lose tracking, background/return, restart camera.
4. Confirm no foot skating unacceptable for play, mesh twisting, head/limb clipping, or excessive heat after 5 minutes.
5. Sparring: contact and blocking, health, round end, reset. Frame rate and perceived response with tracking enabled.

All asset URLs are relative so this can be hosted beneath `/lab/fight/`. Existing Shapes and Tracer are unchanged. Online multiplayer, recording export, finger-per-limb mapping, and production biomechanics are outside this first prototype.

The static demo and its tests are excluded from Astro’s TypeScript project to avoid type-inferencing the vendored renderer. Their controller/rig tests and browser checks run separately.

## Verified 2026-10-31

- Eight Node tests passed, including 30,000 hostile-input updates and 108 actual mesh pose/distance combinations; skin bounds remained above the floor and finite.
- Chromium and WebKit: 390×844 portrait and 844×390 landscape, real anatomy render, stepping, hit/health, kick, hide/show pad labels, pause, round reset and opponent selection; no uncaught browser exceptions.
- Actual MediaPipe model initialized in a classic worker and inferred a blank 640×480 frame in both engines. This verifies loading and inference infrastructure, not accuracy with a physical hand.
- Astro production build passed (existing hints in Shapes/portfolio files).
- Orange camera ergonomics, hand accuracy, heat, and real-device frame rate still need testing.

Optional browser smoke test (requires Playwright installed separately):
`node tools/fight/browser-check.cjs`

Use `PLAYWRIGHT_MODULE` to point at an existing Playwright install, `CHROME_EXECUTABLE` for installed Chrome, `PLAYWRIGHT_BROWSERS_PATH` for an existing WebKit download, and `SCREENSHOT_DIR` for images. By default local file responses are intercepted so no preview server is required. Set `FIGHT_URL` to test the published URL instead. Tests use no real camera.

The mesh export is reproducible with `tools/fight/export_anatomy.py`; byte-for-byte re-export was checked. Original inputs stay in Motion-Runtime.
