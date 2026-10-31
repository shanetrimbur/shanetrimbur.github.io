// Autumn Pitch — SDF module.
// Paradigm: leaf fall as a process. Each red-oak leaf is a thin lobed plate whose outline is a sine envelope times a
// triangle-wave lobe function (lobes swept toward the tip). Airborne leaves descend on the falling-paper path
// (Maxwell): sideways displacement A·sin(φ) and roll θ·cos(φ), with the phase φ locked to height, so every leaf
// zig-zags. Leaves live on jittered lattices (one per cell, up to three superposed lattices of incommensurate size);
// a wind shear tilts the whole airborne lattice. Fallen-leaf density follows an exponential seed-dispersal kernel
// from the tree lines. Secondary ideas: mowing stripes as view-dependent blade sheen (alternate ± lean per stripe),
// and per-tree senescence: green → yellow → red with a hashed onset, sun-exposed crowns turning first.
window.LAB_MODULES.push({
  id: 'autumn-pitch',
  name: 'Autumn Pitch',
  kind: 'sdf',
  description: 'A youth football pitch at golden hour, built on leaf fall: lobed oak-leaf plates zig-zag down on the falling-paper path, settle with an exponential dispersal kernel from the trees, and the crowns turn green → yellow → red on hashed onsets. Mowing stripes are blade sheen that flips with view direction.',
  viewParams: ['camYaw', 'camPitch', 'camDist', 'camTY', 'fov'],
  zoomParam: 'camDist',
  noLearnGroups: ['Camera & render'],
  animatedBy: ['fallSpeed'],
  starterText: 'Right hand: left ↔ right blows the wind · up ↔ down moves the season (green → red) · open hand fills the air with leaves, fist clears it · pinch deepens the oak lobes · tilt makes leaves flutter wider · move closer to zoom. Left hand: move it to move the low sun · fist scrubs the leaves through their fall · pinch strengthens the mowing stripes.',
  starter: [
    ['A.x', 'wind', -0.6, 0.6, 0.15, 0.85],
    ['A.y', 'season', 1, 0.15, 0.15, 0.85],
    ['A.open', 'aDensity', 0.05, 0.9, 0.15, 0.85],
    ['A.pinch', 'lobeDepth', 0.25, 0.9, 0.05, 0.8],
    ['A.tilt', 'flutterA', 0.05, 0.6, -0.7, 0.7],
    ['A.size', 'camDist', 40, 14, 0.1, 0.32],
    ['B.x', 'sunAz', 0.2, 2.6, 0.1, 0.9],
    ['B.y', 'sunEl', 0.35, 0.03, 0.15, 0.85],
    ['B.open', 'leafTime', 3, 0, 0.15, 0.85],
    ['B.pinch', 'mowAmt', 0, 0.6, 0.05, 0.8]
  ],
  params: [
    ['Leaf shape','leafL','Leaf length',0.05,0.6,0.005,0.17],
    ['Leaf shape','leafW','Leaf half-width (× length)',0.1,0.7,0.005,0.36],
    ['Leaf shape','lobes','Lobes per side',1,9,0.5,3.5],
    ['Leaf shape','lobeDepth','Lobe depth (sinus)',0,0.95,0.01,0.62],
    ['Leaf shape','lobeSharp','Lobe tip sharpness',0.3,4,0.01,1.6],
    ['Leaf shape','lobeSweep','Lobe sweep toward tip',0,1.5,0.01,0.55],
    ['Leaf shape','leafTh','Leaf thickness',0.002,0.03,0.0005,0.006],
    ['Leaf shape','curl','Edge curl (cupping)',-3,3,0.01,1.1],
    ['Leaf shape','petiole','Stalk length',0,0.4,0.005,0.14],
    ['Fallen leaves','gCell','Ground lattice cell',0.15,2,0.005,0.34],
    ['Fallen leaves','gDensity','Ground density',0,1,0.01,0.85],
    ['Fallen leaves','gBase','Density far from trees',0,1,0.01,0.22],
    ['Fallen leaves','lambda','Dispersal length λ',1,60,0.1,13],
    ['Fallen leaves','gFar','3D leaves out to (m from camera)',5,80,0.5,34],
    ['Fallen leaves','gTilt','Lying tilt',0,1.2,0.01,0.25],
    ['Fallen leaves','gCurlMul','Dry-curl multiplier',0,3,0.01,1.4],
    ['Falling leaves','aDensity','Airborne density',0,1,0.01,0.6],
    ['Falling leaves','aCell','Airborne lattice cell',0.5,6,0.01,2.3],
    ['Falling leaves','aFar','Falling leaves out to (m from camera)',5,90,0.5,24],
    ['Falling leaves','airBand','Falling zone (m from trees)',2,60,0.5,15],
    ['Falling leaves','airLayers','Superposed lattices',0,3,1,2],
    ['Falling leaves','aScale','Airborne leaf scale',0.5,3,0.01,1.2],
    ['Falling leaves','fallH','Fall height',1,20,0.05,9],
    ['Falling leaves','leafTime','Fall phase (scrub)',0,20,0.001,0.37],
    ['Falling leaves','fallSpeed','Animate fall (0 = still)',0,2,0.01,0],
    ['Falling leaves','fallRate','Descent rate',0.01,1,0.005,0.12],
    ['Falling leaves','zigzag','Zig-zag wavelength (height)',0.2,6,0.01,1.3],
    ['Falling leaves','flutterA','Flutter amplitude',0,1.5,0.005,0.28],
    ['Falling leaves','flutterRoll','Flutter roll (rad)',0,1.6,0.01,0.9],
    ['Falling leaves','spin','Spin per metre fallen',-3,3,0.01,0.6],
    ['Falling leaves','wind','Wind shear',-1.5,1.5,0.005,0.18],
    ['Pitch','pitchL','Pitch length',20,100,0.5,64],
    ['Pitch','pitchW','Pitch width',15,70,0.5,42],
    ['Pitch','lineW','Line width',0.02,0.4,0.005,0.07],
    ['Pitch','circleR','Centre circle radius',1,12,0.05,6],
    ['Pitch','boxD','Penalty box depth',3,20,0.05,11],
    ['Pitch','boxW','Penalty box width',8,45,0.1,26],
    ['Pitch','goalW','Goal width',2,8,0.05,5],
    ['Pitch','goalH','Goal height',1,3,0.01,2],
    ['Pitch','mowW','Mowing stripe width',1,12,0.05,5.3],
    ['Pitch','mowAmt','Stripe sheen strength',0,1,0.01,0.4],
    ['Pitch','mowCross','Cross-cut stripes',0,1,0.01,0],
    ['Pitch','wear','Goal-mouth wear',0,1,0.01,0.35],
    ['Pitch','grassG','Grass green',0,1,0.005,0.2],
    ['Trees','treeZ','Side tree line offset',0,30,0.05,6],
    ['Trees','treeSp','Tree spacing',2,15,0.05,5.4],
    ['Trees','treeN','Trees per row (each side of centre)',0,14,1,9],
    ['Trees','backX','Back tree line offset',0,40,0.1,12],
    ['Trees','backOn','Back tree line (0/1)',0,1,1,1],
    ['Trees','trunkH','Trunk height',0.5,8,0.05,2.6],
    ['Trees','trunkR','Trunk radius',0.05,0.8,0.005,0.22],
    ['Trees','crownR','Crown radius',1,8,0.05,3.6],
    ['Trees','crownTall','Crown tallness',0.6,3,0.01,1.45],
    ['Trees','crownBump','Crown lumpiness',0,2,0.01,0.5],
    ['Trees','crownFreq','Lump frequency',0.1,3,0.01,0.75],
    ['Senescence','season','Season (0 green → 1 bare red)',0,1.4,0.005,0.62],
    ['Senescence','onsetSpread','Onset spread between trees',0,1,0.01,0.45],
    ['Senescence','sunFirst','Sun-exposed leaves turn first',0,1,0.01,0.3],
    ['Senescence','turnW','Turning width',0.02,1,0.005,0.3],
    ['Senescence','redFrac','Fraction of red (oak) trees',0,1,0.01,0.4],
    ['Scene','poles','Floodlight poles (0/1)',0,1,1,1],
    ['Scene','towerH','Tower block height (0 = none)',0,60,0.1,30],
    ['Scene','towerX','Tower X',-80,80,0.1,62],
    ['Scene','towerZ','Tower Z',-90,90,0.1,-55],
    ['Light & sky','sunAz','Sun azimuth',-3.14,3.14,0.01,2.85],
    ['Light & sky','sunEl','Sun elevation',0,1.4,0.005,0.085],
    ['Light & sky','sunI','Sun intensity',0,8,0.05,3.2],
    ['Light & sky','skyAmb','Sky ambient',0,3,0.01,0.9],
    ['Light & sky','leafTrans','Leaf translucency',0,3,0.01,1.1],
    ['Light & sky','shadowK','Shadow hardness',2,64,0.5,10],
    ['Light & sky','aoAmt','Ambient occlusion',0,2,0.01,1],
    ['Light & sky','fog','Haze density',0,0.05,0.0005,0.0035],
    ['Light & sky','clouds','Cloud amount',0,1,0.01,0.75],
    ['Light & sky','cloudStretch','Cloud streak stretch',1,8,0.05,3.2],
    ['Light & sky','cloudDir','Cloud streak direction',-3.14,3.14,0.01,0.6],
    ['Camera & render','camYaw','Camera yaw',-3.14,3.14,0.01,-1.42],
    ['Camera & render','camPitch','Camera pitch',-1.2,1.2,0.005,0.02],
    ['Camera & render','camDist','Camera distance',3,60,0.1,31],
    ['Camera & render','camTY','Look-at height',0,15,0.05,1.0],
    ['Camera & render','fov','Field of view',15,110,0.5,74],
    ['Camera & render','exposure','Exposure',0.2,4,0.01,1.35],
    ['Camera & render','renderScale','Render resolution',0.2,1,0.01,0.6],
    ['Camera & render','maxSteps','Max march steps',32,220,1,220],
    ['Camera & render','stepScale','Step scale',0.3,1,0.01,0.8]
  ],
  slots: [
    ['LEAF_OUTLINE','Leaf half-width along the midrib','u (0 stalk → 1 tip), n (lobes), D (depth), s (sharpness) → half-width / length. Try 0.3*sin(3.14159*u) for a beech leaf','P_leafW*pow(max(sin(3.14159*u), 0.0), 0.75)*((1.0 - D) + D*pow(1.0 - abs(fract(n*u)*2.0 - 1.0), s))'],
    ['LEAF_CURL','Leaf surface (curl)','v (across, units of length), u (along), c (curl) → height offset / length. Try c*v*v + 0.2*sin(u*12.0)*v','c*v*v'],
    ['FLUTTER','Falling-paper path','ph (phase locked to height), y (height) → vec2(sideways −1…1, roll −1…1). Try vec2(sin(ph), sin(2.0*ph)) for tumbling','vec2(sin(ph), cos(ph))'],
    ['DENSITY','Leaf dispersal kernel','x, z (world), dT (distance to nearest tree line), lam (λ) → density 0–1','(P_gBase + (1.0 - P_gBase)*exp(-dT/lam))*(0.55 + 0.9*noise2(vec2(x, z)*0.13))'],
    ['MOW','Mowing pattern','x, z (world), w (stripe width) → blade lean −1…1. Try sign(sin(3.14159*length(vec2(x, z))/w)) for rings','clamp(sin(3.14159*x/w)*10.0, -1.0, 1.0)'],
    ['LINES','Pitch markings','q (pitch xz), hl, hw (half length, width) → distance to nearest line. Try min(pitchMarks(q), abs(length(q) - 3.0))','pitchMarks(q)'],
    ['SENESCENCE','Autumn colour ramp','f (0 green → 1 red) → linear albedo','f < 0.5 ? mix(vec3(0.07, 0.15, 0.03), vec3(0.62, 0.48, 0.05), f*2.0) : mix(vec3(0.62, 0.48, 0.05), vec3(0.62, 0.12, 0.02), f*2.0 - 1.0)'],
    ['SKY','Sky colour','rd (view direction) → linear vec3','mix(vec3(0.95, 0.72, 0.47), vec3(0.17, 0.32, 0.64), pow(clamp(rd.y + 0.02, 0.0, 1.0), 0.5))'],
    ['TONE','Tone curve','c (linear HDR colour) → vec3 0–1','vec3(1.0) - exp(-c*P_exposure)']
  ],
  geo: `
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float gNoExit = 0.0; // shading passes: 1 = leaf cells stop bounding shadow/AO rays, 2 = also skip fallen leaves (grass)
vec3 camPos(){
  vec3 ta = vec3(0.0, P_camTY, 0.0);
  vec3 ro = ta + P_camDist*vec3(sin(P_camYaw)*cos(P_camPitch), sin(P_camPitch), cos(P_camYaw)*cos(P_camPitch));
  ro.y = max(ro.y, 0.2); return ro;
}
float leafTime(){ return P_leafTime + uTime*P_fallSpeed; }
float halfW(float u){ float n = P_lobes, D = P_lobeDepth, s = P_lobeSharp; return max(({{LEAF_OUTLINE}}), 0.0); }
float leafDensity(vec2 w){
  float x = w.x, z = w.y, lam = P_lambda;
  float dT = abs(z - (P_pitchW*0.5 + P_treeZ));
  if (P_backOn > 0.5) dT = min(dT, abs(x - (P_pitchL*0.5 + P_backX)));
  return clamp(({{DENSITY}}), 0.0, 1.0);
}
// q: leaf frame (x along midrib, z across, y normal), L: length, c: curl
float leafSDF(vec3 q, float L, float c){
  float u = q.x/L + 0.5, v = q.z/L;
  float y = q.y - L*({{LEAF_CURL}});
  float uu = clamp(u - P_lobeSweep*abs(v), 0.0, 1.0);
  float d2 = max(abs(v) - halfW(uu), max(-u, u - 1.0))*L*0.55;
  float pt = length(vec2(u - clamp(u, -P_petiole, 0.0), v))*L - L*0.012;
  d2 = min(d2, pt);
  vec2 w = vec2(d2, abs(y) - P_leafTh);
  return (length(max(w, 0.0)) + min(max(w.x, w.y), 0.0))*0.8;
}
vec2 groundLeaves(vec3 p){
  float top = P_leafL*(0.6 + abs(P_curl)*P_gCurlMul*0.6) + 0.06;
  if (p.y > top || gNoExit > 1.5) return vec2(max(p.y - top, 0.0) + 0.04 + step(1.5, gNoExit)*1e3, 1.0);
  float dc = length(p - camPos());
  if (dc > P_gFar) return vec2(max(dc - P_gFar, p.y - top) + 0.04, 1.0);
  float cs = P_gCell;
  vec2 id = floor(p.xz/cs);
  vec2 lc = p.xz - (id + 0.5)*cs;
  float exitD = cs*0.5 - max(abs(lc.x), abs(lc.y)) + 0.05 + gNoExit*1e3;
  vec2 cen = (id + 0.5)*cs;
  if (hash(id + 17.3) > P_gDensity*leafDensity(cen)) return vec2(exitD, 1.0);
  float h1 = hash(id), h2 = hash(id + 3.7), h3 = hash(id + 9.1), h4 = hash(id + 5.5);
  float L = P_leafL*(0.7 + 0.6*h1);
  float margin = max(cs*0.5 - L*0.62, 0.0);
  vec2 off = (vec2(h2, h3) - 0.5)*2.0*margin;
  vec3 q = p - vec3(cen.x + off.x, 0.0, cen.y + off.y);
  q.xz = rot2(6.2831853*h4)*q.xz;
  q.y -= P_leafTh + L*0.04;
  q.yz = rot2((h2 - 0.5)*P_gTilt)*q.yz;
  q.xy = rot2((h3 - 0.5)*P_gTilt*0.6)*q.xy;
  float d = leafSDF(q, L, P_curl*P_gCurlMul*(0.5 + h3));
  return vec2(min(d, exitD), 1.0 + 0.8*h1);
}
vec2 airLeaves(vec3 p){
  float H = P_fallH;
  if (p.y > H + 1.0) return vec2(p.y - H - 0.8, 2.0);
  vec3 ps = p; ps.x -= P_wind*(H - p.y);
  float dT = abs(ps.z - (P_pitchW*0.5 + P_treeZ));
  if (P_backOn > 0.5) dT = min(dT, abs(ps.x - (P_pitchL*0.5 + P_backX)));
  float dc = length(p - camPos());
  if (dc > P_aFar) return vec2(dc - P_aFar + 0.05, 2.0);
  if (dT > P_airBand + 0.5) return vec2((dT - P_airBand)/sqrt(1.0 + P_wind*P_wind), 2.0);
  vec2 res = vec2(1e5, 2.0);
  float T = leafTime();
  for (int i = 0; i < 3; i++){
    if (float(i) >= P_airLayers) break;
    float fi = float(i);
    float cs = P_aCell*(1.0 + 0.414*fi);
    vec2 o = vec2(fi*1.7, fi*3.1);
    vec2 id = floor((ps.xz + o)/cs);
    vec2 lc = ps.xz + o - (id + 0.5)*cs;
    float exitD = cs*0.5 - max(abs(lc.x), abs(lc.y)) + 0.05 + gNoExit*1e3;
    vec2 cen = (id + 0.5)*cs - o;
    id += fi*31.0;
    if (hash(id + 2.9) > P_aDensity*leafDensity(cen)){ res.x = min(res.x, exitD); continue; }
    float h1 = hash(id), h2 = hash(id + 3.7), h3 = hash(id + 9.1), h4 = hash(id + 5.5);
    float L = P_leafL*P_aScale*(0.7 + 0.6*h1);
    float y = 0.15 + fract(h1*7.3 - T*P_fallRate*(0.7 + 0.6*h2))*H;
    float ph = y*6.2831853/P_zigzag + 6.2831853*h3;
    vec2 fl = ({{FLUTTER}});
    float margin = max(cs*0.5 - L*0.62, 0.0);
    float A = min(P_flutterA, margin);
    float yaw = 6.2831853*h4 + P_spin*y;
    vec2 dir = vec2(cos(yaw), sin(yaw));
    vec2 jit = (vec2(h2, h3) - 0.5)*2.0*max(margin - A, 0.0);
    vec3 q = vec3(ps.x - cen.x - jit.x - dir.x*A*fl.x, ps.y - y, ps.z - cen.y - jit.y - dir.y*A*fl.x);
    q.xz = rot2(yaw)*q.xz;
    q.xy = rot2(P_flutterRoll*fl.y)*q.xy;
    q.yz = rot2((h2 - 0.5)*0.8)*q.yz;
    float d = leafSDF(q, L, P_curl*(0.4 + 0.6*h3));
    res = opU(res, vec2(min(d, exitD), 2.0 + 0.8*h1));
  }
  res.x /= sqrt(1.0 + P_wind*P_wind);
  return res;
}
vec2 subjectMap(vec3 p){
  return opU(groundLeaves(p), airLeaves(p));
}
// ---- context: ground, trees, goal, poles, tower
vec2 tree(vec3 p, vec2 base, float h){
  float s = 0.8 + 0.4*h;
  float tr = sdCapsule(p, vec3(base.x, 0.0, base.y), vec3(base.x, P_trunkH*s + P_crownR*0.4, base.y), P_trunkR*s);
  vec3 c = vec3(base.x, P_trunkH*s + P_crownR*P_crownTall*s*0.85, base.y);
  vec3 r = P_crownR*s*vec3(1.0, P_crownTall, 1.0);
  vec3 q = (p - c)/r;
  float d = (length(q) - 1.0)*P_crownR*s;
  if (d < 2.5){
    vec3 np = p*P_crownFreq + h*11.0;
    d += P_crownBump*(noise3(np) - 0.5 + 0.5*(noise3(np*2.3) - 0.5));
    d *= 0.6;
  }
  return opU(vec2(tr, 11.0), vec2(d, 12.0 + 0.8*h));
}
vec2 treeRow(vec2 a, float y){
  // a.x along the row, a.y across (distance from row line)
  vec3 p = vec3(a.x, y, a.y);
  float lim = P_crownR*1.4 + 2.0;
  if (abs(a.y) > lim + 1.0 || P_treeN < 0.5) return vec2(abs(a.y) - lim, 0.0);
  vec2 res = vec2(1e5, 0.0);
  float sp = P_treeSp;
  float i0 = floor(a.x/sp);
  for (int k = -1; k < 2; k++){
    float id = clamp(i0 + float(k), -P_treeN, P_treeN);
    float h = hash(vec2(id, 4.2 + a.y*0.0));
    vec2 b = vec2(id*sp + (h - 0.5)*sp*0.35, (hash(vec2(id, 8.8)) - 0.5)*1.2);
    res = opU(res, tree(p, b, h));
  }
  return res;
}
float pitchMarks(vec2 q){
  float hl = P_pitchL*0.5, hw = P_pitchW*0.5;
  float d = abs(sdBox2(q, vec2(hl, hw)));
  d = min(d, sdBox2(q, vec2(0.0, hw)));
  d = min(d, abs(length(q) - P_circleR));
  d = min(d, length(q) - 0.15);
  vec2 aq = vec2(abs(q.x), q.y);
  d = min(d, abs(sdBox2(aq - vec2(hl - P_boxD*0.5, 0.0), vec2(P_boxD*0.5, P_boxW*0.5))));
  d = min(d, abs(sdBox2(aq - vec2(hl - P_boxD*0.18, 0.0), vec2(P_boxD*0.18, P_boxW*0.23))));
  d = min(d, length(aq - vec2(hl - P_boxD*0.73, 0.0)) - 0.12);
  return d;
}
vec2 contextMap(vec3 p){
  vec2 res = vec2(p.y, 10.0);
  float hl = P_pitchL*0.5, hw = P_pitchW*0.5;
  vec2 tr = treeRow(vec2(p.x, p.z - (hw + P_treeZ)), p.y);
  res = opU(res, vec2(tr.x, max(tr.y, 10.0)));
  if (P_backOn > 0.5){
    vec2 tb = treeRow(vec2(p.z + 7.0, p.x - (hl + P_backX)), p.y);
    res = opU(res, vec2(tb.x, max(tb.y, 10.0)));
  }
  // far goal (and near goal behind the camera)
  vec3 g = vec3(abs(p.x) - hl, p.y, abs(p.z));
  float gw = P_goalW*0.5, gh = P_goalH, gr = 0.06;
  float goal = min(sdCapsule(g, vec3(0.0, 0.0, gw), vec3(0.0, gh, gw), gr), sdCapsule(vec3(g.xy, p.z), vec3(0.0, gh, -gw), vec3(0.0, gh, gw), gr));
  goal = min(goal, sdCapsule(g, vec3(1.6, 0.02, gw), vec3(0.0, gh, gw), gr*0.6));
  res = opU(res, vec2(goal, 13.0));
  if (P_poles > 0.5){
    vec3 pp = vec3(abs(p.x) - hl*0.45, p.y, p.z + hw + 3.0);
    float pole = sdCapsule(pp, vec3(0.0), vec3(0.0, 15.0, 0.0), 0.16);
    pole = min(pole, sdBox(pp - vec3(0.0, 15.3, 0.25), vec3(0.6, 0.35, 0.15)));
    res = opU(res, vec2(pole, 14.0));
  }
  if (P_towerH > 0.5){
    float tw = sdBox(p - vec3(P_towerX, P_towerH*0.5, P_towerZ), vec3(7.0, P_towerH*0.5, 9.0));
    res = opU(res, vec2(tw, 15.0));
  }
  return res;
}
`,
  shade: `
vec3 skyCol(vec3 rd){ return ({{SKY}}); }
vec3 sunDir(){ return normalize(vec3(cos(P_sunEl)*sin(P_sunAz), sin(P_sunEl), cos(P_sunEl)*cos(P_sunAz))); }
vec3 sunColor(){ float e = clamp(P_sunEl*3.0, 0.0, 1.0); return mix(vec3(1.0, 0.55, 0.26), vec3(1.0, 0.9, 0.78), e)*P_sunI; }
vec3 shade(vec3 wpos, vec3 pos, vec3 N, vec3 ln, vec3 rd, float m, float tt){
  vec3 L = sunDir(); vec3 sunC = sunColor();
  float pix = tt*2.0*tan(radians(P_fov)*0.5)/uRes.y;
  vec3 alb = vec3(0.4); float spec = 0.03, gloss = 12.0; float thin = 0.0; float wrap = 0.0;
  float fm = fract(m);
  if (m < 2.95){
    // leaves: fallen = dry tan/brown, airborne = warmer orange-red
    float hv = fm/0.8;
    if (m < 1.95) alb = mix(vec3(0.24, 0.1, 0.035), vec3(0.5, 0.28, 0.11), hv)*(0.85 + 0.3*noise3(pos*40.0));
    else alb = mix(vec3(0.5, 0.14, 0.03), vec3(0.7, 0.4, 0.08), hv);
    thin = 1.0; spec = 0.05; gloss = 20.0;
  } else if (m < 10.5){
    vec2 q = pos.xz;
    float hl = P_pitchL*0.5, hw = P_pitchW*0.5;
    float x = pos.x, z = pos.z, w = P_mowW;
    float lean = ({{MOW}});
    float g = P_grassG;
    alb = vec3(g*0.38, g, g*0.2)*(0.75 + 0.5*fbm2(q*1.7))*(0.9 + 0.2*noise2(q*0.21));
    vec2 vd = normalize(rd.xz + 1e-4);
    float sheen = lean*vd.x;
    if (P_mowCross > 0.0){ float x = pos.z, z = pos.x; float l2 = ({{MOW}}); sheen = mix(sheen, (sheen + l2*vd.y)*0.7, P_mowCross); }
    alb *= 1.0 + P_mowAmt*sheen;
    float wr = P_wear*(exp(-dot(vec2(abs(q.x) - hl + 4.0, q.y), vec2(abs(q.x) - hl + 4.0, q.y))/22.0) + 0.6*exp(-dot(q, q)/60.0));
    alb = mix(alb, vec3(0.16, 0.12, 0.07)*(0.7 + 0.6*noise2(q*3.0)), clamp(wr*(0.6 + 0.8*noise2(q*0.9)), 0.0, 1.0));
    // beyond the 3D-leaf distance, fallen leaves become albedo speckle with the same dispersal kernel
    float far = smoothstep(P_gFar*0.85, P_gFar, length(pos - camPos()));
    float spk = step(1.0 - 0.55*P_gDensity*leafDensity(q), noise2(q*9.0 + 0.5*noise2(q*31.0)));
    alb = mix(alb, vec3(0.36, 0.18, 0.07)*(0.8 + 0.4*noise2(q*17.0)), far*spk);
    float ld = ({{LINES}});
    float lw = P_lineW*0.5;
    float aa = max(pix, 0.004);
    float lm = smoothstep(lw + aa, lw - aa, ld)*(0.75 + 0.25*noise2(q*9.0));
    alb = mix(alb, vec3(0.78, 0.8, 0.78), lm);
    spec = 0.02 + 0.08*lm; gloss = 8.0;
  } else if (m < 11.5){ alb = vec3(0.09, 0.08, 0.07)*(0.7 + 0.6*fbm3(pos*vec3(6.0, 1.0, 6.0))); }
  else if (m < 12.95){
    float h = fm/0.8;
    float h2 = fract(h*13.71);
    float expo = clamp(dot(N, L)*0.5 + 0.5, 0.0, 1.0)*0.6 + 0.4*clamp((pos.y - P_trunkH)/(P_crownR*2.5), 0.0, 1.0);
    float onset = h*P_onsetSpread;
    float f = (P_season - onset + P_sunFirst*(expo - 0.5) + 0.25*(noise3(pos*1.7) - 0.5))/P_turnW + 0.5;
    float fMax = h2 > 1.0 - P_redFrac ? 1.0 : 0.55;
    f = clamp(f, 0.0, 1.0)*fMax;
    alb = ({{SENESCENCE}});
    alb *= 0.65 + 0.7*noise3(pos*3.1 + 7.0);
    wrap = 0.45; thin = 0.6;
  } else if (m < 13.5){ alb = vec3(0.85); spec = 0.2; gloss = 30.0; }
  else if (m < 14.5){ alb = vec3(0.32, 0.33, 0.34); spec = 0.3; gloss = 40.0; }
  else {
    vec2 wc = vec2(pos.x + pos.z, pos.y);
    vec2 cell = fract(wc*vec2(0.55, 0.36));
    float win = step(0.25, cell.x)*step(cell.x, 0.85)*step(0.3, cell.y)*step(cell.y, 0.8);
    alb = mix(vec3(0.55, 0.52, 0.48), vec3(0.05, 0.06, 0.08), win*smoothstep(0.35, 0.1, pix));
    spec = 0.2*win; gloss = 60.0;
  }
  float nl = dot(N, L);
  float dif = thin > 0.99 ? abs(nl) : max((nl + wrap)/(1.0 + wrap), 0.0);
  gNoExit = m > 2.95 && m < 10.5 ? 2.0 : 1.0;
  float sh = dif > 0.001 || thin > 0.0 ? softShadow(wpos + N*(0.004 + 0.0015*tt) + L*0.01, L) : 0.0;
  float ao = pow(calcAO(wpos, N), P_aoAmt);
  gNoExit = 0.0;
  if (m > 2.95 && m < 10.5){
    gNoExit = 1.0; float dl = groundLeaves(wpos).x; gNoExit = 0.0;
    ao *= 1.0 - 0.55*exp(-max(dl, 0.0)/0.035);
  }
  vec3 amb = P_skyAmb*mix(vec3(0.16, 0.13, 0.09), skyCol(vec3(0.0, 1.0, 0.0))*0.7, 0.5 + 0.5*N.y);
  vec3 col = alb*(sunC*dif*sh + amb*ao);
  // thin-plate translucency: glow when the sun is behind the leaf
  if (thin > 0.0){
    float back = pow(clamp(dot(rd, L), 0.0, 1.0), 3.0);
    col += alb*vec3(1.0, 0.6, 0.25)*sunC*sh*back*P_leafTrans*thin*0.6;
  }
  vec3 hv = normalize(L - rd);
  col += sunC*sh*spec*pow(max(dot(N, hv), 0.0), gloss);
  return col;
}
vec3 background(vec3 rd){
  vec3 L = sunDir();
  vec3 c = skyCol(rd);
  vec2 cp = rd.xz/(max(rd.y, 0.0) + 0.09);
  cp = rot2(P_cloudDir)*cp; cp.y /= P_cloudStretch;
  float n = fbm2(cp*0.55 + vec2(3.0, 1.0));
  float cl = smoothstep(0.38, 0.72, n)*smoothstep(-0.02, 0.12, rd.y);
  float sunward = pow(clamp(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(L.x, 0.0, L.z)))*0.5 + 0.5, 0.0, 1.0), 2.0);
  float lit = clamp(0.35 + 0.9*(fbm2(cp*0.55 + vec2(3.3, 1.4)) - n) + 0.6*sunward, 0.0, 1.0);
  vec3 cc = mix(vec3(0.34, 0.37, 0.47), vec3(1.0, 0.88, 0.7), lit);
  c = mix(c, cc*1.1, cl*P_clouds);
  c += sunColor()*0.08*pow(max(dot(rd, L), 0.0), 12.0) + sunColor()*0.6*pow(max(dot(rd, L), 0.0), 600.0);
  return c;
}
vec3 finishColor(vec3 col, vec3 rd, float t, bool hit){
  vec3 L = sunDir();
  vec3 haze = mix(skyCol(rd), vec3(1.0, 0.8, 0.55), 0.4*pow(max(dot(rd, L), 0.0), 3.0));
  if (hit) col = mix(col, haze, 1.0 - exp(-t*P_fog));
  vec3 c = col;
  col = ({{TONE}});
  vec2 sv = gl_FragCoord.xy/uRes - 0.5;
  col *= 1.0 - 0.35*dot(sv, sv);
  return pow(clamp(col, 0.0, 1.0), vec3(1.0/2.2));
}
`
});
