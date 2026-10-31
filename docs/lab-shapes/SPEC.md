---
title: Shape Lab — Specification
version: 0.1
date: 2026-10-31
owner: Shane Trimbur
status: M1 shipped
deploy_path: /lab/shapes/
source_path: public/lab/shapes/
related:
  - /lab/procedural-iris/   # standalone eye + hand control (pre-module prototype)
tags: [procedural, sdf, glsl, webgl, gesture, mediapipe, generative-art]
---

# Shape Lab — Specification

<a id="purpose"></a>
## 1. Purpose

A browser app that turns photographed shapes into math-driven, deformable scenes. Every variable is a slider, every key formula is editable GLSL, and a front-camera hand-gesture layer can drive all parameters at once. AI is used only when authoring a new shape module (once per photo, in conversation). The running app uses no cloud inference.

<a id="pipeline"></a>
## 2. Pipeline and where inference happens

| Stage | Runs | Inference |
|---|---|---|
| Photo → shape module | Once per photo, authored in chat | Yes (Claude), offline from the app |
| Rendering (SDF ray march / raster / image warp) | Every frame | None |
| Generic deformers | Every frame | None |
| Hand tracking | Every camera frame | Small on-device model (MediaPipe Hand Landmarker) |
| Pose → parameters (starter map, learned poses) | Every frame | None (One Euro filter + Shepard interpolation) |
| Photo warper (any photo) | Every frame | None |

<a id="architecture"></a>
## 3. Architecture

Static files, no build step, served by GitHub Pages from `public/lab/shapes/`.

| File | Role |
|---|---|
| `index.html` | App shell, styles, layout |
| `core.js` | Runtime: GL, shader assembly, control rack, formula slots, presets, render loop, input, hand control |
| `modules/spire.js` | Neo-Gothic spire scene (kind `sdf`) |
| `modules/photo-warp.js` | Photo warper (kind `image`) |

Modules self-register: `window.LAB_MODULES.push(module)`. The view is routed by URL hash (`#spire`, `#photo-warp`).

<a id="module-format"></a>
## 4. Module format

```js
{
  id: 'spire',                 // hash route + storage key
  name: 'Neo-Gothic Spire',
  kind: 'sdf' | 'image',
  description: '…',
  params: [[group, id, label, min, max, step, default], …],  // → uniform float P_<id>
  slots:  [[id, label, localsDoc, defaultExpr], …],          // → {{id}} in GLSL
  // kind 'sdf':
  geo:   'GLSL defining vec2 subjectMap(vec3 p) and vec2 contextMap(vec3 p)',
  shade: 'GLSL defining vec3 shade(wpos, pos, n, ln, rd, m, t), vec3 background(rd), vec3 finishColor(col, rd, t, hit)',
  // kind 'image':
  frag:  'GLSL with main(); uniforms uTex, uTexRes, uMirror provided by core',
  starter: [[feature, paramId, outAtInLo, outAtInHi, inLo, inHi], …],
  starterText: 'Human-readable legend for the starter mapping',
  orbit: true | false          // sdf: drag orbits camera; image: drag pans
}
```

Hand features available to `starter`: `A.x A.y A.open A.pinch A.tilt A.size` (right hand on screen) and the same for `B.*` (second hand).

<a id="deformers"></a>
## 5. Generic SDF deformers (kind `sdf`)

Applied to the module's `subjectMap` only; `contextMap` stays fixed. Order of operations:

| # | Operator | Params | Math |
|---|---|---|---|
| 1 | Grid repeat | `dRepeat`, `dRepeatN` | `p.xz -= s·clamp(round(p.xz/s), −n, n)` |
| 2 | Polar copies (mod k) | `dPolar`, `dPolarR` | `θ ← mod(θ + s/2, s) − s/2`, `s = 2π/k` |
| 3 | Explode | `dExplode`, `dCell` | per-cell shrink toward cell centre, bounded by cell box |
| 4 | Twist | `dTwist`, `dPivot` | rotate xz by `k·(y − y₀)` |
| 5 | Bend | `dBend` | rotate (x, y − y₀) by `k·(y − y₀)` |
| 6 | Taper | `dTaper` | `p.xz /= 1 + k·(y − y₀)` |
| 7 | Bulge | `dBulge`, `dBulgeY`, `dBulgeW` | Gaussian radial scale |
| 8 | Wave shear | `dWave`, `dWaveF` | `x += a·sin(fy)`, `z += a·cos(1.3fy)` |
| 9 | Melt | `dMelt`, `dMeltF` | vector value-noise displacement |
| 10 | Custom | slot `DEFORM` | user expression `p → vec3` |

Distance correction: `d *= dSafety / (1 + 2|twist| + 6|bend| + 4|taper| + 0.8|bulge| + wave·f + 1.2·melt·f + explode)`. Shading uses the deformed local position and local normal, so textures follow the deformation.

<a id="photo-warper"></a>
## 6. Photo warper (kind `image`, no AI)

Source: an uploaded photo, the live front camera, or a generated default (modular times-table art). Operators: kaleidoscope (mirror mod k), swirl, bulge/pinch, ripple, wave, Möbius disk automorphism, log-polar Droste (mod on log r), custom `UV_WARP` slot, mirror/repeat tiling, Sobel edges, posterize, saturation/contrast, custom `COLOR` slot.

<a id="gesture"></a>
## 7. Hand control

- Switch on by default; preference remembered. Off = sliders only.
- Features per hand: position, openness (finger curls), pinch, tilt, apparent size. One Euro smoothing.
- Fewer than 2 learned poses → module `starter` mapping. Two or more → Shepard interpolation (power 3) over learned (pose → full parameter snapshot) pairs, per module.
- Freeze button holds the current state. Sliders update live (~8 Hz).

<a id="milestones"></a>
## 8. Milestones

| ID | Scope | Status |
|---|---|---|
| M1 | Runtime + module format, deformers, spire module, photo warper, hand control | shipped 2026-10-31 |
| M2 | Port the eye as a module (raster kind or SDF), retire `/lab/procedural-iris/` duplicate | planned |
| M3 | Per-slot formula history (undo), preset gallery, share-by-URL | planned |
| M4 | Optional on-device depth (one inference per photo) → 3D relief in the photo warper | planned |
| M5 | Native Swift/Metal port with Vision hand pose | planned |

<a id="m1-todo"></a>
## 9. M1 TODO

- [x] Spec (this file)
- [x] `core.js`: module registry, hash routing, tab bar
- [x] `core.js`: control rack (groups, filter, number boxes, per-group reset)
- [x] `core.js`: formula slots with test-compile and culprit detection
- [x] `core.js`: presets per module (localStorage, copy/paste JSON, reset)
- [x] `core.js`: SDF assembly (lib → geo → deformers/map/march → shade → main)
- [x] `core.js`: image assembly + texture sources (default art, upload, live camera)
- [x] `core.js`: render-on-demand loop, low-res while interacting, orbit/pan/zoom input
- [x] `core.js`: hand control (MediaPipe, One Euro, starter map, learned poses, freeze)
- [x] `modules/spire.js`: port tower/city/tree with subject/context split; local-normal texturing
- [x] `modules/photo-warp.js`: operator chain, slots, starter mapping
- [x] Headless render test of both modules with a fake camera
- [x] Deploy to `/lab/shapes/` and verify the live URL
