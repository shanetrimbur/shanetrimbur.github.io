// Exoskeleton Tower — SDF module.
// Paradigm: the building is a function of the floor index n (plan, rotation, scale, corner notch, window rule
// are all computed from n with modular rules), wrapped in an independent exoskeleton lattice whose rod spacing is a
// rational multiple p/q of the window bay, so the two grids beat in moiré and realign every lcm.
// Rooftop stacks and antennas are placed by the golden angle (phyllotaxis).
window.LAB_MODULES.push({
  id: 'lattice-tower',
  name: 'Exoskeleton Tower',
  kind: 'sdf',
  description: 'A 1970s tower as a function of its floor number: each floor’s plan, rotation, scale, corner notch and window pattern come from modular rules on n. A white exoskeleton lattice at a p/q spacing ratio beats against the façade in moiré. Rooftop stacks follow the golden angle.',
  viewParams: ['camYaw', 'camPitch', 'camDist', 'camTY', 'fov'],
  zoomParam: 'camDist',
  noLearnGroups: ['Camera & render'],
  starterText: 'Right hand: left ↔ right twists the floors · up ↔ down tapers or flares the tower · fist cuts deep corner notches · pinch changes the cage ratio p (moiré) · tilt makes the floors swell · move closer to zoom. Left hand: move it to move the sun · up ↔ down sets the floor count · fist makes the cage twist with the floors · pinch changes the window rule (mod m).',
  starter: [
    ['A.x', 'twist', -0.12, 0.12, 0.15, 0.85],
    ['A.y', 'taper', 0.8, -0.8, 0.15, 0.85],
    ['A.open', 'notch', 0.95, 0, 0.15, 0.85],
    ['A.pinch', 'ratioP', 1, 12, 0.05, 0.8],
    ['A.tilt', 'swell', 0, 0.3, -0.7, 0.7],
    ['A.size', 'camDist', 32, 11, 0.1, 0.32],
    ['B.x', 'sunAz', -2, 2, 0.1, 0.9],
    ['B.y', 'nFloors', 30, 6, 0.15, 0.85],
    ['B.open', 'cageFollow', 1, 0, 0.15, 0.85],
    ['B.pinch', 'winMod', 1, 7, 0.05, 0.8]
  ],
  params: [
    ['Floors','nFloors','Floor count',3,40,1,14],
    ['Floors','floorH','Floor height',0.3,1.2,0.005,0.6],
    ['Floors','halfW','Plan half-width',1,4,0.01,2.2],
    ['Floors','chamfer','Corner chamfer',0,1,0.01,0.35],
    ['Floors','slabT','Slab thickness',0.02,0.3,0.002,0.1],
    ['Floors','slabOut','Slab projection',0,0.3,0.002,0.08],
    ['Floors','spandH','Spandrel band height',0,0.5,0.005,0.2],
    ['Floors','recess','Window recess',0,0.4,0.005,0.1],
    ['Floor sequence','twist','Twist per floor (rad)',-0.3,0.3,0.001,0],
    ['Floor sequence','taper','Taper / flare',-1,1,0.01,0],
    ['Floor sequence','swell','Swell amplitude',0,0.4,0.005,0],
    ['Floor sequence','swellF','Swell frequency',0,2,0.01,0.5],
    ['Floor sequence','notch','Corner notch depth',0,1,0.01,0.35],
    ['Floor sequence','notchMod','Notch every m floors',1,8,1,1],
    ['Floor sequence','notchOn','…on the first k of every m',0,8,1,1],
    ['Floor sequence','winMod','Window rule modulus m',1,8,1,3],
    ['Floor sequence','winOn','Windows in first k of every m bays',0,8,1,2],
    ['Floor sequence','winShift','Window shift per floor',0,4,1,0],
    ['Façade','bay','Bay width',0.2,1.2,0.005,0.5],
    ['Façade','ribSpace','Spandrel rib spacing',0.01,0.2,0.001,0.045],
    ['Façade','frameW','Window frame width',0.005,0.15,0.001,0.05],
    ['Façade','brownR','Brown red',0,1,0.005,0.17],
    ['Façade','brownG','Brown green',0,1,0.005,0.09],
    ['Façade','brownB','Brown blue',0,1,0.005,0.07],
    ['Façade','whiteR','White red',0,1,0.005,0.62],
    ['Façade','whiteG','White green',0,1,0.005,0.6],
    ['Façade','whiteB','White blue',0,1,0.005,0.56],
    ['Exoskeleton','showCage','Show cage (0/1)',0,1,1,1],
    ['Exoskeleton','cageOff','Cage stand-off',0,1,0.005,0.35],
    ['Exoskeleton','ratioP','Rod spacing ratio p (rod = bay × p/q)',1,12,1,6],
    ['Exoskeleton','ratioQ','Rod spacing ratio q',1,12,1,5],
    ['Exoskeleton','rodR','Rod radius',0.005,0.06,0.001,0.02],
    ['Exoskeleton','railSpace','Rail spacing',0.1,1.2,0.005,0.6],
    ['Exoskeleton','rodExt','Rods above roof',0,2,0.01,0.9],
    ['Exoskeleton','cageFollow','Cage follows floor twist',0,1,0.01,0],
    ['Crown','crownH','Glazed crown height',0,1.5,0.01,0.55],
    ['Crown','crownTop','Crown top scale',0.5,1,0.005,0.8],
    ['Crown','penR','Penthouse radius',0.3,2.5,0.01,1.4],
    ['Crown','penH','Penthouse height',0,1.5,0.01,0.6],
    ['Crown','antN','Stacks + antennas',0,14,1,9],
    ['Crown','antH','Antenna height',0.2,2.5,0.01,1.1],
    ['Crown','antR','Antenna radius',0.005,0.06,0.001,0.02],
    ['Crown','stackH','Stack height',0.1,1,0.005,0.35],
    ['Crown','stackR','Stack radius',0.05,0.25,0.002,0.12],
    ['Crown','antPhase','Golden-angle phase',0,6.28,0.01,0.6],
    ['Light & sky','sunAz','Sun azimuth',-3.14,3.14,0.01,0.5],
    ['Light & sky','sunEl','Sun elevation',0,1.5,0.01,0.45],
    ['Light & sky','sunI','Sun intensity',0,6,0.05,1.1],
    ['Light & sky','skyAmb','Sky ambient',0,3,0.01,1.15],
    ['Light & sky','shadowK','Shadow hardness',2,64,0.5,6],
    ['Light & sky','aoAmt','Ambient occlusion',0,2,0.01,1],
    ['Light & sky','fog','Haze density',0,0.05,0.0005,0.004],
    ['Light & sky','skyPow','Sky gradient power',0.2,3,0.01,0.8],
    ['Light & sky','clouds','Cloud amount',0,1,0.01,0.6],
    ['Camera & render','camYaw','Camera yaw',-3.14,3.14,0.01,0.785],
    ['Camera & render','camPitch','Camera pitch',-1.2,1.2,0.01,-0.24],
    ['Camera & render','camDist','Camera distance',3,60,0.1,18],
    ['Camera & render','camTY','Look-at height',0,20,0.05,7.6],
    ['Camera & render','fov','Field of view',15,90,0.5,34],
    ['Camera & render','exposure','Exposure',0.2,4,0.01,1.5],
    ['Camera & render','renderScale','Render resolution',0.2,1,0.01,0.6],
    ['Camera & render','maxSteps','Max march steps',32,220,1,160],
    ['Camera & render','stepScale','Step scale',0.3,1,0.01,0.8]
  ],
  slots: [
    ['PLAN_SDF','Floor plan outline (2D)','q (vec2, floor-local), W (half-width), c (chamfer) → signed distance. Try length(q) - W, or sdOct2(q, W)','max(max(abs(q.x), abs(q.y)) - W, (abs(q.x) + abs(q.y) - (2.0*W - c))*0.70710678)'],
    ['FLOOR_ROT','Floor rotation rule','n (floor index), nF (floor count) → radians. Try P_twist*n*n*0.05 or 2.39996*n*P_twist','P_twist*n'],
    ['FLOOR_SCALE','Floor scale rule','n, nF → plan scale. Try 1.0 + 0.2*mod(n, 3.0)','1.0 + P_taper*(n - nF*0.5)/nF + P_swell*sin(n*P_swellF)'],
    ['FLOOR_NOTCH','Corner notch rule','n, nF → notch depth 0–1. Default: notch on the first k of every m floors','P_notch*step(mod(n, P_notchMod), P_notchOn - 0.5)'],
    ['WINDOW_RULE','Window rule','bay (integer bay index along a face), n (floor) → 1 window, 0 panel. Try step(0.5, hash(vec2(bay, n)))','step(mod(bay + P_winShift*n, P_winMod), P_winOn - 0.5)'],
    ['CAGE_SPACING','Exoskeleton rod spacing','→ spacing. Default rod = bay × p/q: the grids realign every lcm(p, q) bays (moiré)','P_bay*P_ratioP/P_ratioQ'],
    ['SPANDREL_RIBS','Spandrel rib profile','v (height within the floor) → 0–1 groove darkness','smoothstep(0.32, 0.5, abs(fract(v/P_ribSpace) - 0.5))'],
    ['SKY','Sky color','rd (view direction) → linear vec3','mix(vec3(0.78, 0.74, 0.66), vec3(0.52, 0.56, 0.62), pow(clamp(rd.y, 0.0, 1.0), P_skyPow))'],
    ['TONE','Tone curve','c (linear HDR color) → vec3 0–1','vec3(1.0) - exp(-c*P_exposure)']
  ],
  geo: `
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float planD(vec2 q, float W, float c){ return ({{PLAN_SDF}}); }
float floorRot(float n){ float nF = floor(P_nFloors); return ({{FLOOR_ROT}}); }
float floorScale(float n){ float nF = floor(P_nFloors); return max(({{FLOOR_SCALE}}), 0.2); }
float floorNotch(float n){ float nF = floor(P_nFloors); return clamp(({{FLOOR_NOTCH}}), 0.0, 1.0); }
float cageSpacing(){ return max(({{CAGE_SPACING}}), 0.02); }
// materials: 1 white slab, 2 brown spandrel, 3 window band, 4 metal, 5 cage, 6 penthouse, 7 crown glass, 10 ground
vec2 floorSDF(vec3 p, float n){
  float h = P_floorH; float ly = p.y - n*h;
  float sc = floorScale(n);
  vec2 q = rot2(-floorRot(n))*p.xz/sc;
  float W = P_halfW, c = P_chamfer*W;
  float slab = max(planD(q, W + P_slabOut, c)*sc, abs(ly - (h - P_slabT*0.5)) - P_slabT*0.5);
  float spand = max(planD(q, W, c)*sc, abs(ly - (h - P_slabT - P_spandH*0.5)) - P_spandH*0.5);
  float core = max(planD(q, W - P_recess, c)*sc, abs(ly - h*0.5) - h*0.5);
  float nt = floorNotch(n);
  if (nt > 0.0){
    float nb = sdBox2(abs(q) - vec2(W), vec2(nt*W*0.3))*sc;
    spand = max(spand, -nb); core = max(core, -nb);
  }
  return opU(opU(vec2(slab, 1.0), vec2(spand, 2.0)), vec2(core, 3.0));
}
vec2 subjectMap(vec3 p){
  float h = P_floorH, nF = floor(P_nFloors), Ht = nF*h;
  float top = Ht + P_crownH + P_penH + P_antH*1.6 + P_rodExt + 0.5;
  float hw = (P_halfW + P_slabOut)*1.7 + P_cageOff + 0.6;
  float bb = sdBox(p - vec3(0.0, top*0.5, 0.0), vec3(hw, top*0.5, hw));
  if (bb > 0.3) return vec2(bb, 0.0);
  float n = clamp(floor(p.y/h), 0.0, nF - 1.0);
  vec2 res = floorSDF(p, n);
  if (n > 0.0) res = opU(res, floorSDF(p, n - 1.0));
  if (n < nF - 1.0) res = opU(res, floorSDF(p, n + 1.0));
  // exoskeleton lattice (independent of the façade bays)
  if (P_showCage > 0.5){
    float Wc = P_halfW + P_slabOut + P_cageOff;
    vec2 q = rot2(-P_cageFollow*floorRot(clamp(p.y/h, 0.0, nF)))*p.xz;
    vec2 aq = abs(q); if (aq.y > aq.x) aq = aq.yx;
    float u = aq.y, dx = aq.x - Wc;
    float s = cageSpacing();
    float ur = min(s*floor(u/s + 0.5), Wc);
    float rods = length(vec2(dx, u - ur)) - P_rodR;
    rods = max(rods, max(-p.y, p.y - (Ht + P_rodExt)));
    float yr = P_railSpace*floor(p.y/P_railSpace + 0.5);
    float rails = length(vec2(dx, p.y - yr)) - P_rodR*0.85;
    rails = max(rails, max(u - Wc, max(-p.y, p.y - Ht - P_rodExt*0.6)));
    res = opU(res, vec2(min(rods, rails), 5.0));
  }
  // glazed crown + cap
  float sTop = floorScale(nF - 1.0);
  vec2 qc = rot2(-floorRot(nF - 1.0))*p.xz/sTop;
  float t = clamp((p.y - Ht)/max(P_crownH, 0.001), 0.0, 1.0);
  float Wc0 = (P_halfW + P_slabOut)*mix(1.0, P_crownTop, t);
  float crown = max(planD(qc, Wc0, P_chamfer*Wc0)*sTop*0.7, abs(p.y - (Ht + P_crownH*0.5)) - P_crownH*0.5);
  res = opU(res, vec2(crown, 7.0));
  float Wcap = (P_halfW + P_slabOut)*P_crownTop + 0.04;
  res = opU(res, vec2(max(planD(qc, Wcap, P_chamfer*Wcap)*sTop, abs(p.y - (Ht + P_crownH + 0.03)) - 0.03), 1.0));
  // penthouse drum
  float yP = Ht + P_crownH;
  res = opU(res, vec2(max(sdOct2(p.xz, P_penR), abs(p.y - (yP + P_penH*0.5)) - P_penH*0.5), 6.0));
  // stacks and antennas on golden-angle positions (phyllotaxis)
  float topY = yP + P_penH;
  for (int i = 0; i < 14; i++){
    if (float(i) >= P_antN) break;
    float fi = float(i);
    float a = fi*2.39996323 + P_antPhase;
    float r = P_penR*(0.55 + 0.4*fract(fi*0.618034));
    vec3 c = vec3(cos(a)*r, topY, sin(a)*r);
    float d;
    if (mod(fi, 2.0) < 0.5){
      float hg = P_stackH*(0.6 + 0.8*hash(vec2(fi, 3.1)));
      d = max(length(p.xz - c.xz) - P_stackR, abs(p.y - (topY + hg*0.5)) - hg*0.5);
    } else {
      float hg = P_antH*(0.5 + hash(vec2(fi, 7.7)));
      d = sdCapsule(p, c, c + vec3(0.0, hg, 0.0), P_antR);
      d = min(d, sdBox(p - (c + vec3(0.07, hg*0.55, 0.0)), vec3(0.045, hg*0.14, 0.045)));
    }
    res = opU(res, vec2(d, 4.0));
  }
  return res;
}
vec2 contextMap(vec3 p){ return vec2(p.y + 0.02, 10.0); }
`,
  shade: `
vec3 skyCol(vec3 rd){ return ({{SKY}}); }
vec3 sunDir(){ return normalize(vec3(cos(P_sunEl)*sin(P_sunAz), sin(P_sunEl), cos(P_sunEl)*cos(P_sunAz))); }
vec3 shade(vec3 wpos, vec3 pos, vec3 N, vec3 ln, vec3 rd, float m, float tt){
  float pix = tt*2.0*tan(radians(P_fov)*0.5)/uRes.y;
  float h = P_floorH, nF = floor(P_nFloors);
  float fn = clamp(floor(pos.y/h), 0.0, nF - 1.0);
  float ly = pos.y - fn*h;
  vec3 brown = vec3(P_brownR, P_brownG, P_brownB), white = vec3(P_whiteR, P_whiteG, P_whiteB);
  vec3 alb = vec3(0.5); float spec = 0.04; float gloss = 16.0; float mirror = 0.0;
  float aa = smoothstep(P_ribSpace*1.5, P_ribSpace*0.5, pix);
  if (m < 1.5){
    alb = white*(0.88 + 0.18*fbm2(pos.xz*3.0 + pos.y*5.0));
    alb *= 1.0 - 0.12*smoothstep(0.6, 1.0, fbm2(vec2(pos.x + pos.z, pos.y*0.5)*4.0));
  } else if (m < 2.5 || m > 5.5 && m < 6.5){
    float v = ly;
    float rib = ({{SPANDREL_RIBS}});
    alb = brown*(1.0 - 0.4*mix(0.35, rib, aa));
    if (m > 5.5){
      float ang = atan(pos.z, pos.x);
      float vent = step(0.8, fract(ang*3.0))*step(abs(pos.y - (nF*h + P_crownH + P_penH*0.6)), 0.06);
      alb = mix(alb, vec3(0.03), vent);
    }
    spec = 0.06;
  } else if (m < 3.5){
    vec2 q = rot2(-floorRot(fn))*pos.xz/floorScale(fn);
    vec2 aq = abs(q);
    float uu = aq.x > aq.y ? q.y : q.x;
    float bay = floor(uu/P_bay), fu = fract(uu/P_bay);
    float n = fn;
    float win = ({{WINDOW_RULE}});
    float wTop = h - P_slabT - P_spandH;
    float frame = max(smoothstep(P_frameW, P_frameW*0.5, min(fu, 1.0 - fu)), smoothstep(P_frameW*h*2.0, P_frameW*h, min(ly - 0.0, wTop - ly)));
    if (win > 0.5){
      alb = mix(vec3(0.02, 0.025, 0.03), white*0.8, frame*smoothstep(0.08, 0.02, pix));
      spec = 0.5; gloss = 120.0; mirror = 1.0 - frame;
    } else {
      float v = ly;
      float rib = ({{SPANDREL_RIBS}});
      alb = brown*(1.0 - 0.4*mix(0.35, rib, aa))*0.9;
    }
  } else if (m < 4.5){ alb = vec3(0.42, 0.42, 0.44)*(0.85 + 0.3*noise3(pos*6.0)); spec = 0.5; gloss = 50.0; }
  else if (m < 5.5){ alb = white*1.05; spec = 0.25; gloss = 40.0; }
  else if (m < 7.5){
    float a = atan(pos.z, pos.x);
    float gl = max(smoothstep(0.06, 0.0, abs(fract(a*9.55) - 0.5) - 0.44), smoothstep(0.08, 0.0, abs(fract((pos.y - nF*h)/max(P_crownH, 0.01)*2.0) - 0.5) - 0.42));
    alb = mix(vec3(0.03, 0.035, 0.04), white*0.85, gl);
    spec = 0.5; gloss = 120.0; mirror = 1.0 - gl;
  } else { alb = vec3(0.25); }

  vec3 L = sunDir();
  float dif = max(dot(N, L), 0.0);
  float sh = dif > 0.001 ? softShadow(wpos + N*(0.004 + 0.001*tt), L) : 0.0;
  float ao = pow(calcAO(wpos, N), P_aoAmt);
  vec3 sunC = vec3(1.0, 0.9, 0.78)*P_sunI;
  vec3 amb = P_skyAmb*mix(vec3(0.12, 0.11, 0.1), skyCol(vec3(0.0, 1.0, 0.0)), 0.5 + 0.5*N.y);
  vec3 col = alb*(sunC*dif*sh + amb*ao);
  vec3 hv = normalize(L - rd);
  float fre = 0.04 + 0.96*pow(1.0 - max(dot(N, -rd), 0.0), 5.0);
  col += sunC*sh*spec*pow(max(dot(N, hv), 0.0), gloss)*0.4;
  if (mirror > 0.0) col += skyCol(reflect(rd, N))*mix(0.12, 0.9, fre)*mirror*ao;
  return col;
}
vec3 background(vec3 rd){
  vec3 c = skyCol(rd);
  vec2 cp = rd.xz/(abs(rd.y) + 0.15);
  float cl = smoothstep(0.35, 0.85, fbm2(cp*1.6 + vec2(3.0, 1.0)));
  c = mix(c, vec3(0.86, 0.85, 0.83), cl*P_clouds);
  c += vec3(1.0, 0.85, 0.6)*pow(max(dot(rd, sunDir()), 0.0), 40.0)*0.25;
  return c;
}
vec3 finishColor(vec3 col, vec3 rd, float t, bool hit){
  if (hit) col = mix(col, skyCol(rd), 1.0 - exp(-t*P_fog));
  vec3 c = col;
  col = ({{TONE}});
  return pow(clamp(col, 0.0, 1.0), vec3(1.0/2.2));
}
`
});
