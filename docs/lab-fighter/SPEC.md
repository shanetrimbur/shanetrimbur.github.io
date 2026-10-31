---
title: Hand Fighter — Specification
version: 0.1
date: 2026-10-31
owner: Shane Trimbur
status: M0 built, phone check pending
deploy_path: /lab/fighter/
source_path: public/lab/fighter/
related:
  - /lab/shapes/            # MediaPipe loader, One Euro filter and hand features come from here
tags: [game, fighting, skeleton, kinematics, gesture, mediapipe, rear-camera]
---

# Hand Fighter — Specification

<a id="purpose"></a>
## 1. Purpose

A browser fighting game for the phone. One hand holds the phone and its thumb works the front
screen; the other hand reaches in front of the **rear** camera and puppets the fighter's arms and
legs. The fighter is a skinless skeleton guy on the canonical 22-joint humanoid. Opponents are the
same kind of fighter driven by a CPU instead of a hand, so both sides obey the same body and the
same physics. Static files on GitHub Pages; no cloud inference, no build step.

<a id="pipeline"></a>
## 2. Pipeline and where inference happens

| Stage | Runs | Inference |
|---|---|---|
| Rear camera → 21 hand landmarks | Every camera frame | Small on-device model (MediaPipe Hand Landmarker, same pin as Shape Lab) |
| Landmarks → digit angles, roll, framing | Every camera frame | None (geometry + One Euro filter) |
| Digit angles → joint targets (puppet map) | Every frame | None |
| Joint springs, limits, forward kinematics | Fixed 60 Hz tick | None |
| Render | Every display frame | None |

<a id="architecture"></a>
## 3. Architecture

Static ES modules served by GitHub Pages from `public/lab/fighter/`. The pure modules (`hand.js`,
`body.js`) import nothing from the browser, so Node runs their tests with `node --test`.

| File | Role |
|---|---|
| `index.html` | Shell, styles, layout: top bar, stage, camera thumbnail, readouts |
| `app.js` | Wiring: camera → tracker → features → puppet → body → render; UI |
| `tracker.js` | Rear camera (with fallback and camera switch), MediaPipe loader (GPU, then CPU), detect loop, fps and timing stats |
| `hand.js` | Pure. Palm frame, digit angles, roll, framing checks, One Euro filter, synthetic hand builder for tests and demo |
| `body.js` | Pure. Canonical skeleton, quaternion math, forward kinematics, range-of-motion table, joint springs, puppet map |
| `render.js` | Canvas 2D projection of the skeleton guy: capsule bones, joint dots, ground line, shadow |
| `tests/lab-fighter/*.test.mjs` | `node --test` suites (outside `public/`, never deployed) |

```
rear camera → tracker.js → hand.js (angles, filter, validity) ─┐
                                                               ├→ body.js puppet map → joint targets
demo script (synthetic hand) ──────────────────────────────────┘           ↓
                                         springs + ROM clamp + FK (60 Hz) → render.js
```

Later milestones add `fighter.js` (grounded controller), `ai.js`, `pads.js` and character files,
all behind the same seam: anything that produces joint targets and buttons can drive a fighter.

<a id="grounded"></a>
## 4. Rules that keep him grounded (binding)

These are the anti-spaghetti contract. Each one is enforced by a test; cite the id in commits.

| Id | Rule | M0 |
|---|---|---|
| G1 | Poses come from joint rotations through forward kinematics. Nothing sets a bone position, so bone lengths never change. | yes |
| G2 | Every driven joint angle stays inside the rig's range of motion (table in §6). | yes |
| G3 | The hand never owns the root. Pelvis position comes only from the controller (fixed in M0). | yes |
| G4 | Joint targets pass through a critically damped spring with a maximum angular speed. No single-frame snaps. | yes |
| G5 | No valid hand for 100 ms → targets ease back to the stance pose. When the hand returns, it blends in through the same springs. | yes |
| G6 | NaN, missing or degenerate landmarks never reach the body; the feature layer rejects the frame. | yes |
| G7 | Pelvis height stays in a band, the stance foot is locked, at most one foot leaves the ground except in an explicit jump, knockback is horizontal. | M1 |

<a id="mapping"></a>
## 5. Hand puppet mapping (M0)

Pose: hand behind the phone, about 25–40 cm from the lens, **fingers pointing down, palm toward
the camera**. Index and middle are the legs (finger walking), thumb and pinky are the arms, the
ring finger is shown but not used (it moves with the pinky). Mapping is screen-side consistent:
the digit on the left of the camera image drives the limb on the left of the screen, so it works
with either hand. "Set neutral" records the relaxed puppet pose; everything maps from the change
against neutral.

Features, from MediaPipe world landmarks (metres, hand-centred). Palm frame: `y` = wrist (0) →
middle MCP (9), `x` = pinky MCP (17) → index MCP (5) made orthogonal to `y`, `n = x × y`.

| Feature | Definition |
|---|---|
| `mcp[d]` | Angle of the proximal bone of digit `d` out of the palm plane (signed along `n`) |
| `spread[d]` | Angle of that bone inside the palm plane from `y` (signed along `x`) |
| `curl[d]` | Sum of the two distal joint bends (PIP + DIP; thumb: MCP + IP) |
| `thumbOpen` | Angle between thumb (1 → 4) and index metacarpal (0 → 5) |
| `roll` | Image-space angle of wrist → middle MCP from vertical |
| `framing` | Palm centre and size in the image → `ok`, `too close`, `too far`, `near edge` |

| Body joint (rig action) | Driven by | Gain (default) |
|---|---|---|
| Hip flexion, left/right leg | `mcp` of index / middle | leg gain × 1.5 |
| Hip abduction | `spread` of index / middle | leg gain × 1.0 |
| Knee flexion | `curl` of index / middle | leg gain × 1.0 |
| Shoulder elevation | reach: `thumbOpen`, or 1.8 × pinky `spread` away from the hand | arm gain × 1.2 |
| Elbow flexion | `curl` of thumb / pinky, minus 2.6 × reach | arm gain × 1.0 |

Reach couples the arm so swinging the thumb or pinky outward reads as a punch: the arm rises and
the guard's bent elbow (124°) straightens together. Mapping curl alone could only straighten the
elbow by the relaxed digit's curl (about 25°).
| Spine lateral flexion (split over 3 segments) | `roll` | 0.6 |

Stance (the pose at neutral and after tracking loss): slight knee bend, fists up in a guard. In M0
the pelvis is fixed, so raising both legs leaves him sitting in the air; grounding is M1.

<a id="data"></a>
## 6. Skeleton and limits (copied data)

Copied into `body.js` with a provenance comment, from `shanetrimbur/movement-capture` at
`0bfe4c8`: `canonical_humanoid_v1.json` (22 joints, metres, +Y up, +Z forward, T-pose rest) and
the rig ROM for the driven joints. The ROM values come from published sources (AAOS normative
ranges, the MoBL/MyoArm arm model), which the rig file cites.

| Joint | Action | ROM (deg) |
|---|---|---|
| thigh | flexion / abduction | −20…125 / −30…45 |
| calf | flexion | 0…140 |
| upperarm | elevation (plane fixed per mapping) | 0…180 |
| lowerarm | flexion | 0…130 |
| spine_01/02/03 | lateral flexion (each) | ±12 / ±12 / ±11 |

M0 uses a small angle model (one axis per action, applied from the standing neutral) with these
limits. Full keypose decoding (shoulder plane-of-elevation triple, clavicle coupling) is out of
scope.

<a id="screen"></a>
## 7. Screen (M0)

Portrait first; landscape lays out side by side. Top bar: Start camera, Set neutral, Demo, View
(3/4, front, side), Switch camera. Stage: the skeleton guy. Corner thumbnail of the camera with
landmarks and a framing light. Under the stage: five digit bars, readouts (camera fps, detection
ms, share of frames with a hand over the last 3 s), sliders for leg gain, arm gain and smoothing.
`#demo` plays a scripted synthetic hand without a camera. Respect safe-area insets.

<a id="m0-acceptance"></a>
## 8. M0 acceptance

- A1 `https://shanetrimbur.github.io/lab/fighter/` opens on iPhone Safari, asks for the camera and uses the rear camera; desktop falls back to the webcam (thumbnail mirrored).
- A2 Landmarks draw on the thumbnail; digit bars and readouts update live.
- A3 The skeleton's legs and arms follow the mapped digits, with G1 to G6 holding.
- A4 Hand out of view → limbs ease back to stance within about 0.3 s, no snapping.
- A5 `#demo` works with no camera.
- A6 `node --test tests/lab-fighter` passes (§9). `npm run build` passes and nothing else on the site changes.
- A7 The phone findings table (§11) is filled from a real session.

<a id="m0-tests"></a>
## 9. M0 test plan

- Synthetic hand round trip: build 21 world landmarks from known digit angles, recover them within 3°.
- G1: over random joint angles, every FK bone length equals its rest length within 1e-9 m.
- G2: every mapped output stays inside §6 limits for any input, including extreme gains.
- G4: a step input never moves a joint faster than the maximum angular speed.
- G5: the target returns to stance 100 ms after the last valid frame; the pose settles within 0.3 s.
- G6 fuzz: 10,000 frames of random, teleporting, NaN-filled, empty and partial landmark sets → all angles finite and in range, no throw.
- Headless Chromium smoke test of `#demo` (no console errors, stage draws). Run in the session, not in CI.

Run: `node --test tests/lab-fighter/*.test.mjs` (Node 18+, no dependencies).

<a id="non-goals"></a>
## 10. M0 non-goals

Root motion and grounding (M1), flick strikes (M2), opponent, hits, health and AI (M3), front-screen
pads, menu and home-screen install (M4), character roster (M5), tests in CI.

<a id="findings"></a>
## 11. Phone findings (filled after M0 ships)

| Question | Result |
|---|---|
| Camera fps / detection ms on the device | |
| Share of frames tracked at 25 cm and at 40 cm | |
| Can index move without dragging middle? Thumb and pinky? | |
| Fingers down vs fingers up: which tracks better? | |
| Warm after 5 minutes? | |
| Comfortable grip that keeps the lens clear | |

<a id="milestones"></a>
## 12. Milestones

| ID | Scope | Status |
|---|---|---|
| M0 | Hand-puppet feasibility: rear camera, features, puppet map, skeleton guy, G1–G6 tests | built 2026-10-31, phone check pending |
| M1 | Grounded fighter controller (G7): grounded body, stance foot lock, stepping, jump with a fixed arc; keyboard and touch drive; spaghetti fuzz test | planned |
| M2 | Calibration flow, flick-to-strike (wind-up, hit, recovery), limb locked during a strike | planned |
| M3 | Opponent: second fighter, capsule hits, health, rounds, CPU that issues the same joint targets | planned |
| M4 | Front-screen invisible pads (port of Motion-Runtime `MotionPadSession`), top menu, home-screen install | planned |
| M5 | Roster: character files (proportions, mass, stiffness, speed, reach, moves, look) | planned |

<a id="m0-todo"></a>
## 13. M0 TODO

- [x] Spec (this file)
- [x] `body.js`: skeleton and ROM data with provenance; quaternion helpers; FK
- [x] `body.js`: ROM clamp, joint springs (critically damped, max speed), stance pose
- [x] `body.js`: puppet map from digit angles with neutral and gains
- [x] `hand.js`: palm frame, digit angles, roll, framing, frame validity (G6)
- [x] `hand.js`: One Euro filter (from Shape Lab), synthetic hand builder
- [x] `tests/lab-fighter/hand.test.mjs`, `body.test.mjs`: §9 suites (18 tests)
- [x] `tracker.js`: rear camera with fallback and switch; MediaPipe GPU → CPU; detect loop; stats
- [x] `render.js`: 3/4, front, side projection; capsule bones; ground and shadow
- [x] `index.html` + `app.js`: top bar, stage, thumbnail with framing light, digit bars, readouts, sliders
- [x] `#demo` synthetic hand script
- [x] Headless Chromium check of `#demo` (phone, landscape, desktop; no errors, no sideways scroll); `npm run build`
- [ ] Merge to `main`, check the live URL on iPhone, fill §11
