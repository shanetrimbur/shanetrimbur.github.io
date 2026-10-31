# Hand Fighter — assets and dependencies

## Anatomy mesh

BodyParts3D, © The Database Center for Life Science, licensed under Creative Commons Attribution 4.0 International.

- Source/license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- License: https://creativecommons.org/licenses/by/4.0/
- Derived from the BodyParts3D anatomy prototype in Shane Trimbur's Motion-Runtime.
- Changes: reduced geometry, regional skinning, source-to-canonical alignment, closed-hand vertex corrections; materials and bounded poses for this browser experiment.
- 35,150 vertices / 71,257 triangles. One shared 2,542,600-byte geometry file for both fighters.
- Anatomy and deformation are provisional, not medically validated. Incomplete face/abdominal coverage; no tendon wrapping or simulated tissue volume.
- `assets/anatomy.json` records the original mesh digest and the digest of the closed-grip version used here.
- No purchased anatomy assets, textbooks, source videos, or Tracer app code are included.

## Three.js 0.180.0

MIT, © 2010–2025 three.js authors. The pinned renderer is served from this site.
Full license: vendor/THREE-LICENSE.txt
Source: https://github.com/mrdoob/three.js/tree/r180

## MediaPipe Tasks Vision 0.10.14 and Hand Landmarker

Apache 2.0, Google / MediaPipe contributors. Loaded on demand from jsDelivr and Google's model hosting, as in Shape Lab. Camera frames are processed locally and are not uploaded by this application. Download hosts receive ordinary requests for their files.

- https://github.com/google-ai-edge/mediapipe
- https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
- https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

## Application

Copyright 2026 Shane Trimbur. Application code follows the repository's MIT license. Anatomy data retains its separate CC BY 4.0 license; dependency licenses remain unchanged.
