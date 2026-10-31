// Neo-Gothic Spire — SDF module. Subject = tower (deformable); context = buildings, nave, tree, ground.
window.LAB_MODULES.push({
  id: 'spire',
  name: 'Neo-Gothic Spire',
  kind: 'sdf',
  description: 'Brick church tower with clock, octagonal spire, granite building and tree, ray-marched from signed-distance functions. The Deform group bends, twists, melts, shatters and repeats the tower.',
  viewParams: ['camYaw', 'camPitch', 'camDist', 'camTY', 'fov'],
  zoomParam: 'camDist',
  noLearnGroups: ['Camera & render'],
  starterText: 'Right hand: left ↔ right twists the tower · up ↔ down bends it · fist melts it · pinch sets spire height · tilt tapers · move closer to zoom. Left hand: move it to move the sun · fist shatters the tower · pinch adds polar copies (mod k).',
  starter: [
    ['A.x', 'dTwist', -0.35, 0.35, 0.15, 0.85],
    ['A.y', 'dBend', 0.12, -0.12, 0.15, 0.85],
    ['A.open', 'dMelt', 0.6, 0, 0.15, 0.85],
    ['A.pinch', 'sp2H', 1.5, 6, 0.05, 0.8],
    ['A.tilt', 'dTaper', -0.08, 0.08, -0.7, 0.7],
    ['A.size', 'camDist', 30, 12, 0.1, 0.32],
    ['B.x', 'sunAz', -2, 2, 0.1, 0.9],
    ['B.y', 'sunEl', 1.3, 0.1, 0.15, 0.85],
    ['B.open', 'dExplode', 0.8, 0, 0.15, 0.85],
    ['B.pinch', 'dPolar', 1, 8, 0.05, 0.8]
  ],
  params: [
    ['Tower shaft','towerW','Half-width',0.3,1.2,0.005,0.62],
    ['Tower shaft','towerH','Shaft height',2,8,0.01,4.6],
    ['Tower shaft','pilW','Corner pilaster size',0,0.12,0.002,0.05],
    ['Tower shaft','blend','Pilaster blend radius',0,0.1,0.002,0],
    ['Tower shaft','recess','Window recess depth',0,0.3,0.005,0.1],
    ['Tower shaft','archW','Arch half-width',0.15,0.55,0.005,0.36],
    ['Tower shaft','archY0','Arch sill height',0.2,4,0.01,1.45],
    ['Tower shaft','archY1','Arch springing height',0.5,5,0.01,3.05],
    ['Tower shaft','frameW','Archivolt width',0,0.2,0.002,0.07],
    ['Tower shaft','band1','String course (fraction of height)',0.1,0.9,0.005,0.3],
    ['Tower shaft','bandH','String course thickness',0.005,0.1,0.001,0.03],
    ['Tower shaft','bandOut','Stone projection',0,0.1,0.001,0.035],
    ['Tower shaft','friezeH','Corbel frieze height',0,0.6,0.005,0.28],
    ['Tower shaft','parapetH','Parapet height',0,0.6,0.005,0.26],
    ['Tower shaft','slat','Louver slat spacing',0.02,0.2,0.002,0.06],
    ['Brick & stone','brickH','Brick course height',0.01,0.15,0.001,0.05],
    ['Brick & stone','brickL','Brick length',0.03,0.3,0.002,0.12],
    ['Brick & stone','mortar','Mortar fraction',0,0.4,0.005,0.12],
    ['Brick & stone','brickR','Brick red',0,1,0.005,0.55],
    ['Brick & stone','brickG','Brick green',0,1,0.005,0.17],
    ['Brick & stone','brickB','Brick blue',0,1,0.005,0.08],
    ['Brick & stone','brickVar','Brick variation',0,1,0.01,0.5],
    ['Brick & stone','mortR','Mortar red',0,1,0.005,0.46],
    ['Brick & stone','mortG','Mortar green',0,1,0.005,0.3],
    ['Brick & stone','mortB','Mortar blue',0,1,0.005,0.22],
    ['Brick & stone','stoneR','Stone red',0,1,0.005,0.58],
    ['Brick & stone','stoneG','Stone green',0,1,0.005,0.46],
    ['Brick & stone','stoneB','Stone blue',0,1,0.005,0.3],
    ['Brick & stone','stoneNoise','Stone weathering',0,1,0.01,0.3],
    ['Clock','clockR','Dial radius',0.1,0.6,0.005,0.34],
    ['Clock','clockY','Dial height',0.5,5,0.01,3.05],
    ['Clock','tickL','Tick length',0,0.5,0.005,0.22],
    ['Clock','tickW','Tick width',0.005,0.15,0.001,0.045],
    ['Clock','handW','Hand width',0.005,0.1,0.001,0.035],
    ['Clock','rosette','Tracery strength',0,1,0.01,1],
    ['Clock','clockHour','Hour',0,12,0.01,10.85],
    ['Clock','clockMinute','Minute',0,60,0.1,52],
    ['Clock','markGlow','Marks glow',0,1,0.01,0.25],
    ['Pinnacles','pinR','Pinnacle radius',0.02,0.2,0.002,0.085],
    ['Pinnacles','pinH1','Brick shaft height',0,1.5,0.01,0.65],
    ['Pinnacles','pinH2','Cap height',0.1,2.5,0.01,0.9],
    ['Spire','sp1H','Lower stage height',0.2,3,0.01,1.55],
    ['Spire','sp1R0','Lower stage base radius',0.2,1,0.005,0.56],
    ['Spire','sp1R1','Lower stage top radius',0.1,1,0.005,0.44],
    ['Spire','ringH','Oculus drum height',0,1,0.005,0.38],
    ['Spire','ringR','Oculus drum radius',0.1,1,0.005,0.44],
    ['Spire','oculusR','Oculus radius',0,0.2,0.002,0.085],
    ['Spire','sp2H','Main spire height',0.5,8,0.01,3.6],
    ['Spire','sp2R0','Main spire base radius',0.1,1,0.005,0.4],
    ['Spire','sp2Tip','Main spire tip radius',0,0.3,0.002,0.02],
    ['Spire','sp2Curve','Profile curvature',0.3,3,0.01,1],
    ['Spire','ribH','Edge rib height',0,0.08,0.001,0.018],
    ['Spire','ribW','Edge rib width',0.005,0.25,0.002,0.06],
    ['Spire','panelLines','Panel line depth',0,1,0.01,0.6],
    ['Spire','slateR','Cladding red',0,1,0.005,0.17],
    ['Spire','slateG','Cladding green',0,1,0.005,0.11],
    ['Spire','slateB','Cladding blue',0,1,0.005,0.13],
    ['Spire','rodH','Finial rod height',0,1,0.005,0.45],
    ['Spire','ballR','Finial ball radius',0,0.2,0.002,0.075],
    ['Spire','lip','Distance safety factor',0.3,1,0.01,0.7],
    ['Surroundings','showCity','Show buildings (0/1)',0,1,1,1],
    ['Surroundings','gX','Granite building right edge X',-3,2,0.01,-1],
    ['Surroundings','gW','Granite building width',1,12,0.05,8],
    ['Surroundings','gH','Granite building height',2,25,0.1,16],
    ['Surroundings','gZ','Granite building Z',3,14,0.05,11.5],
    ['Surroundings','gD','Granite building depth',1,8,0.05,2.5],
    ['Surroundings','panel','Granite panel size',0.2,3,0.01,1.3],
    ['Surroundings','grain','Granite grain density',20,400,1,140],
    ['Surroundings','lX','Glass block X',-3,2,0.01,-1.4],
    ['Surroundings','lZ','Glass block Z',2,10,0.05,7.5],
    ['Surroundings','lW','Glass block half-width',0.3,4,0.01,1.4],
    ['Surroundings','lD','Glass block half-depth',0.3,4,0.01,1.2],
    ['Surroundings','lRound','Glass block rounding',0,2,0.01,0.9],
    ['Surroundings','lH','Glass block height',0.5,6,0.01,2.6],
    ['Surroundings','naveW','Nave half-width',0.5,2.5,0.01,1.5],
    ['Surroundings','naveL','Nave length',1,12,0.05,7],
    ['Surroundings','roofSlope','Nave roof slope',0.2,2,0.01,1.1],
    ['Tree','showTree','Show tree (0/1)',0,1,1,1],
    ['Tree','treeX','Crown X',-2,8,0.05,4.2],
    ['Tree','treeY','Crown Y',2,10,0.05,6.2],
    ['Tree','treeZ','Crown Z',0,13,0.05,11],
    ['Tree','treeR','Crown radius',0.5,6,0.05,2.8],
    ['Tree','leafAmp','Clump amplitude',0,1.5,0.01,0.9],
    ['Tree','leafFreq','Clump frequency',0.2,6,0.05,1.3],
    ['Tree','holeAmp','Sky-gap amount',0,2,0.01,0.4],
    ['Tree','holeFreq','Sky-gap frequency',0.5,8,0.05,3],
    ['Tree','treeLip','Distance safety factor',0.2,1,0.01,0.45],
    ['Light & sky','sunAz','Sun azimuth',-3.14,3.14,0.01,0.6],
    ['Light & sky','sunEl','Sun elevation',0,1.5,0.01,0.6],
    ['Light & sky','sunI','Sun intensity',0,8,0.05,3.2],
    ['Light & sky','skyAmb','Sky ambient',0,2,0.01,0.55],
    ['Light & sky','shadowK','Shadow hardness',2,64,0.5,14],
    ['Light & sky','aoAmt','Ambient occlusion',0,2,0.01,1],
    ['Light & sky','fog','Haze density',0,0.05,0.0005,0.006],
    ['Light & sky','skyPow','Sky gradient power',0.2,3,0.01,0.7],
    ['Camera & render','camYaw','Camera yaw',-3.14,3.14,0.01,0.05],
    ['Camera & render','camPitch','Camera pitch',-1.2,1.2,0.01,-0.24],
    ['Camera & render','camDist','Camera distance',3,60,0.1,18.5],
    ['Camera & render','camTY','Look-at height',0,15,0.05,6.2],
    ['Camera & render','fov','Field of view',15,90,0.5,44],
    ['Camera & render','exposure','Exposure',0.2,4,0.01,1.1],
    ['Camera & render','renderScale','Render resolution',0.2,1,0.01,0.6],
    ['Camera & render','maxSteps','Max march steps',32,220,1,150],
    ['Camera & render','stepScale','Step scale',0.3,1,0.01,0.85]
  ],
  slots: [
    ['SHAFT_SDF','Tower shaft SDF','p (local), q (folded to +x face), W, H → distance','sdBox(p - vec3(0.0, H*0.5, 0.0), vec3(W, H*0.5, W))'],
    ['BLEND','Shaft ∪ pilasters operator','a (shaft), b (pilasters) → distance. Try min(a,b) or max(a,-b)','smin(a, b, P_blend)'],
    ['ARCH_2D','Belfry arch outline (2D)','u (across face), v (height) → signed distance. Swap in sdPointedArch for Gothic','sdArch(vec2(u, v), P_archW, P_archY0, P_archY1)'],
    ['SPIRE1_PROFILE','Lower spire radius','t (0 bottom → 1 top) → radius','mix(P_sp1R0, P_sp1R1, t)'],
    ['SPIRE_PROFILE','Main spire radius','t (0 bottom → 1 top) → radius','mix(P_sp2R0, P_sp2Tip, pow(t, P_sp2Curve))'],
    ['SPIRE_RIB','Spire edge ribs','e (0 at an octagon edge → 0.5 mid-face), t → added radius','P_ribH*smoothstep(P_ribW, 0.0, e)'],
    ['TREE_DISP','Tree crown displacement','p (world), c (crown center) → added distance','P_leafAmp*(fbm3(p*P_leafFreq) - 0.5) + 0.3*P_leafAmp*(noise3(p*P_leafFreq*4.0) - 0.5) + P_holeAmp*smoothstep(0.6, 0.8, noise3(p*P_holeFreq))'],
    ['BRICK_MORTAR','Brick bond (mortar mask)','uv (face coords), row (course index) → 0 brick / 1 mortar','max(step(1.0 - P_mortar, fract(uv.y/P_brickH)), step(1.0 - P_mortar*P_brickH/P_brickL, fract(uv.x/P_brickL + 0.5*row)))'],
    ['BRICK_TINT','Brick color','h (random per brick), uv → linear vec3','vec3(P_brickR, P_brickG, P_brickB)*(1.0 + P_brickVar*(h - 0.5))'],
    ['GRANITE','Granite speckle','uv (face coords) → brightness','0.9 + 0.25*(hash(floor(uv*P_grain)) - 0.5) - 0.25*step(0.96, hash(floor(uv*P_grain*0.6) + 7.0))'],
    ['SKY','Sky color','rd (view direction) → linear vec3','mix(vec3(0.35, 0.55, 0.85), vec3(0.06, 0.2, 0.66), pow(clamp(rd.y, 0.0, 1.0), P_skyPow))'],
    ['TONE','Tone curve','c (linear HDR color) → vec3 0–1','vec3(1.0) - exp(-c*P_exposure)']
  ],
  geo: `
float profPrism(vec3 p, float y0, float y1, float r){
  float d2 = sdOct2(p.xz, r)*P_lip; float dy = max(y0 - p.y, p.y - y1);
  vec2 w = vec2(d2, dy); return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}
float octEdge(vec2 xz){ float a = atan(xz.y, xz.x); return abs(fract((a - 0.3926991)/0.7853982 + 0.5) - 0.5); }
// materials: 1 brick, 2 stone, 3 cladding, 4 granite, 5 glass block, 6 leaves, 7 roof, 8 clock, 9 metal, 10 ground, 11 trunk
vec2 subjectMap(vec3 p){
  float W = P_towerW, H = P_towerH;
  float top = H + P_sp1H + P_ringH + P_sp2H + P_rodH + 0.4;
  float bb = sdBox(p - vec3(0.0, top*0.5, 0.0), vec3(W + 0.4, top*0.5, W + 0.4));
  if (bb > 0.3) return vec2(bb, 0.0);
  vec3 q = p; q.xz = abs(q.xz); if (q.z > q.x) q.xz = q.zx;
  float u = q.z, v = p.y;
  float a = ({{SHAFT_SDF}});
  float b = sdBox(vec3(abs(p.x) - W, p.y - H*0.5, abs(p.z) - W), vec3(P_pilW, H*0.5, P_pilW));
  float shaft = ({{BLEND}});
  float arch = ({{ARCH_2D}});
  shaft = max(shaft, -max(arch, (W - P_recess) - q.x));
  vec2 res = vec2(shaft, 1.0);
  float sc = sdBox(p - vec3(0.0, H*P_band1, 0.0), vec3(W + P_bandOut, P_bandH, W + P_bandOut));
  sc = min(sc, sdBox(p - vec3(0.0, H - P_friezeH*0.5, 0.0), vec3(W + P_bandOut, P_friezeH*0.5, W + P_bandOut)));
  sc = min(sc, max(max(arch - P_frameW, -arch), max(q.x - (W + 0.025), (W - 0.06) - q.x)));
  sc = min(sc, sdBox(p - vec3(0.0, H + P_parapetH*0.5, 0.0), vec3(W + P_bandOut*0.6, P_parapetH*0.5, W + P_bandOut*0.6)));
  res = opU(res, vec2(sc, 2.0));
  float dial = max(length(vec2(u, v - P_clockY)) - P_clockR, abs(q.x - (W - P_recess + 0.02)) - 0.02);
  res = opU(res, vec2(dial, 8.0));
  vec3 c = vec3(abs(p.x) - W, p.y, abs(p.z) - W);
  res = opU(res, vec2(profPrism(c, H, H + P_pinH1, P_pinR), 1.0));
  res = opU(res, vec2(profPrism(c, H + P_pinH1, H + P_pinH1 + P_pinH2, P_pinR*(1.05 - clamp((p.y - H - P_pinH1)/P_pinH2, 0.0, 1.0))), 3.0));
  res = opU(res, vec2(length(c - vec3(0.0, H + P_pinH1 + P_pinH2, 0.0)) - P_pinR*0.25, 9.0));
  float e = octEdge(p.xz);
  float y1 = H + 0.02, y2 = y1 + P_sp1H, y3 = y2 + P_ringH, y4 = y3 + P_sp2H;
  float t = clamp((p.y - y1)/max(P_sp1H, 0.001), 0.0, 1.0);
  float r1 = ({{SPIRE1_PROFILE}}) + ({{SPIRE_RIB}});
  float sp = profPrism(p, y1, y2, r1);
  sp = min(sp, profPrism(p, y2, y3, P_ringR));
  t = clamp((p.y - y3)/max(P_sp2H, 0.001), 0.0, 1.0);
  float r2 = ({{SPIRE_PROFILE}}) + ({{SPIRE_RIB}});
  sp = min(sp, profPrism(p, y3, y4, r2));
  res = opU(res, vec2(sp, 3.0));
  float mould = min(profPrism(p, y2 - 0.03, y2 + 0.03, P_ringR + 0.04), profPrism(p, y3 - 0.03, y3 + 0.03, P_ringR + 0.04));
  res = opU(res, vec2(mould, 2.0));
  float fin = min(sdCapsule(p, vec3(0.0, y4 - 0.1, 0.0), vec3(0.0, y4 + P_rodH, 0.0), 0.012), length(p - vec3(0.0, y4 + P_rodH*0.75, 0.0)) - P_ballR);
  return opU(res, vec2(fin, 9.0));
}
vec2 contextMap(vec3 p){
  vec2 res = vec2(p.y, 10.0);
  if (P_showCity > 0.5){
    res = opU(res, vec2(sdBox(p - vec3(P_gX - P_gW*0.5, P_gH*0.5, P_gZ), vec3(P_gW*0.5, P_gH*0.5, P_gD*0.5)), 4.0));
    vec2 lp = p.xz - vec2(P_lX, P_lZ);
    float rr = sdBox2(lp, max(vec2(P_lW, P_lD) - P_lRound, 0.0)) - P_lRound;
    res = opU(res, vec2(max(rr, abs(p.y - P_lH*0.5) - P_lH*0.5), 5.0));
    vec3 n = p - vec3(0.0, 0.0, -P_naveL*0.5 - P_towerW);
    res = opU(res, vec2(sdBox(n - vec3(0.0, 0.6, 0.0), vec3(P_naveW, 0.6, P_naveL*0.5)), 1.0));
    float roof = max(abs(n.z) - P_naveL*0.5, max((abs(n.x)*P_roofSlope + n.y - (1.2 + P_naveW*P_roofSlope))/sqrt(1.0 + P_roofSlope*P_roofSlope), 1.2 - n.y));
    res = opU(res, vec2(roof, 7.0));
  }
  if (P_showTree > 0.5){
    vec3 c = vec3(P_treeX, P_treeY, P_treeZ);
    float crown = (length((p - c)/vec3(1.0, 1.25, 1.0)) - P_treeR);
    if (crown < P_leafAmp + P_holeAmp + 0.3) crown += ({{TREE_DISP}});
    res = opU(res, vec2(crown*P_treeLip, 6.0));
    res = opU(res, vec2(sdCapsule(p, vec3(c.x, -0.1, c.z), c - vec3(0.0, P_treeR*0.3, 0.0), 0.15), 11.0));
  }
  return res;
}
`,
  shade: `
vec3 skyCol(vec3 rd){ return ({{SKY}}); }
vec3 sunDir(){ return normalize(vec3(cos(P_sunEl)*sin(P_sunAz), sin(P_sunEl), cos(P_sunEl)*cos(P_sunAz))); }
float clockHourNow(){ return floor(P_clockHour); }
vec3 shade(vec3 wpos, vec3 pos, vec3 n, vec3 ln, vec3 rd, float m, float tt){
  float pix = tt*2.0*tan(radians(P_fov)*0.5)/uRes.y;
  float W = P_towerW, H = P_towerH;
  vec3 q = pos; q.xz = abs(q.xz); if (q.z > q.x) q.xz = q.zx;
  float u = q.z, v = pos.y;
  vec2 fuv = abs(ln.x) > 0.6 ? pos.zy : (abs(ln.z) > 0.6 ? pos.xy : pos.xz);
  vec3 stoneC = vec3(P_stoneR, P_stoneG, P_stoneB);
  vec3 alb = vec3(0.5); float spec = 0.04; float gloss = 16.0; vec3 emit = vec3(0.0);
  if (m < 1.5){
    vec2 uv = fuv; float row = floor(uv.y/P_brickH);
    float h = hash(vec2(floor(uv.x/P_brickL + 0.5*row), row));
    float mort = clamp(({{BRICK_MORTAR}}), 0.0, 1.0);
    vec3 bc = ({{BRICK_TINT}});
    float aa = smoothstep(P_brickH*1.5, P_brickH*0.5, pix);
    alb = mix(bc, vec3(P_mortR, P_mortG, P_mortB), mix(0.2, mort, aa));
    float arch = ({{ARCH_2D}});
    if (pos.y < H && arch < 0.0 && q.x < W - P_recess*0.5){
      float f = fract(v/P_slat);
      float slat = smoothstep(0.35, 0.5, f)*(1.0 - smoothstep(0.85, 1.0, f));
      alb = mix(vec3(0.015, 0.017, 0.02), vec3(0.07, 0.075, 0.085), mix(0.5, slat, smoothstep(P_slat*1.2, P_slat*0.4, pix)));
      spec = 0.08;
    }
  } else if (m < 2.5){
    alb = stoneC*(1.0 - P_stoneNoise*0.5 + P_stoneNoise*fbm2(fuv*7.0));
    if (v > H - P_friezeH && v < H){
      float cu = fract(u/0.11) - 0.5;
      alb *= 1.0 - 0.5*smoothstep(0.012, 0.0, abs(length(vec2(cu*0.11, max(v - (H - P_friezeH*0.6), 0.0))) - 0.04));
    }
    if (v > H && v < H + P_parapetH && q.x > W){
      float cu = fract(u/0.16) - 0.5;
      alb = mix(alb, alb*0.15, smoothstep(0.045, 0.035, length(vec2(cu*0.16, v - H - P_parapetH*0.5))));
    }
    spec = 0.05;
  } else if (m < 3.5){
    float a = atan(pos.z, pos.x);
    float fa = fract(a/0.7853982 + 0.5) - 0.5;
    float ln2 = smoothstep(0.035, 0.0, abs(abs(fa) - 0.28));
    alb = vec3(P_slateR, P_slateG, P_slateB)*(0.85 + 0.3*fbm2(vec2(a*6.0, pos.y*3.0)));
    alb *= 1.0 - 0.5*ln2*P_panelLines*smoothstep(0.08, 0.02, pix);
    float y2 = H + 0.02 + P_sp1H, y3 = y2 + P_ringH;
    if (pos.y > y2 && pos.y < y3 && length(pos.xz) < P_ringR*1.3){
      float od = length(vec2(fa*P_ringR*0.83, pos.y - (y2 + y3)*0.5));
      alb = mix(alb, stoneC*0.9, smoothstep(P_oculusR*1.3, P_oculusR*1.15, od));
      alb = mix(alb, vec3(0.02), smoothstep(P_oculusR*0.8, P_oculusR*0.65, od));
    }
    spec = 0.15; gloss = 30.0;
  } else if (m < 4.5){
    vec2 uv = fuv;
    float g = ({{GRANITE}});
    vec2 sp = fract(fuv/P_panel);
    float ed = min(min(sp.x, 1.0 - sp.x), min(sp.y, 1.0 - sp.y))*P_panel;
    alb = vec3(0.32, 0.32, 0.31)*g*(1.0 - 0.42*(1.0 - smoothstep(0.0, 0.015, ed))*smoothstep(0.06, 0.01, pix));
    spec = 0.06;
  } else if (m < 5.5){
    float fr = fract(pos.y);
    if (fr < 0.35 || pos.y > P_lH - 0.12){ alb = vec3(0.3); spec = 0.06; }
    else {
      float mul = smoothstep(0.03, 0.0, abs(fract((pos.x + pos.z)/0.7) - 0.5) - 0.46);
      alb = mix(vec3(0.01, 0.012, 0.015), vec3(0.2), mul);
      spec = mul > 0.5 ? 0.1 : 1.0;
    }
  } else if (m < 6.5){
    alb = vec3(0.02, 0.04, 0.013)*(0.7 + 0.6*noise3(pos*9.0));
    spec = 0.03;
  } else if (m < 7.5){
    alb = vec3(0.05, 0.035, 0.03)*(0.8 + 0.4*hash(floor(vec2(pos.z*12.0, pos.y*16.0))));
    alb *= 1.0 - 0.4*smoothstep(0.8, 1.0, fract(pos.y*16.0));
  } else if (m < 8.5){
    float uu = abs(pos.x) > abs(pos.z) ? (pos.x > 0.0 ? -pos.z : pos.z) : (pos.z > 0.0 ? pos.x : -pos.x);
    vec2 cc = vec2(uu, pos.y - P_clockY)/P_clockR;
    float r = length(cc); float ang = atan(cc.x, cc.y);
    vec3 mark = vec3(0.85, 0.82, 0.6);
    float lw = 0.035;
    float tr = smoothstep(lw, lw*0.5, abs(r - 0.97));
    for (int i = 0; i < 6; i++){
      float a6 = float(i)*1.0472 + 0.5236;
      tr = max(tr, smoothstep(lw, lw*0.5, abs(length(cc - 0.45*vec2(sin(a6), cos(a6))) - 0.42)));
    }
    tr = max(tr, smoothstep(lw, lw*0.5, abs(r - 0.22)))*P_rosette;
    alb = mix(vec3(0.02, 0.03, 0.045), stoneC, tr);
    float fa = abs(fract(ang/6.2832*12.0 + 0.5) - 0.5)/12.0*6.2832*r;
    float tick = step(fa, P_tickW*0.5)*step(0.93 - P_tickL, r)*step(r, 0.93);
    float hA = (clockHourNow() + P_clockMinute/60.0)/12.0*6.2832, mA = P_clockMinute/60.0*6.2832;
    vec2 hd = vec2(sin(hA), cos(hA)), md = vec2(sin(mA), cos(mA));
    float hdist = length(cc - hd*clamp(dot(cc, hd), -0.08, 0.55));
    float mdist = length(cc - md*clamp(dot(cc, md), -0.08, 0.86));
    float mk = max(tick, max(step(hdist, P_handW*1.3), step(mdist, P_handW)));
    alb = mix(alb, mark, mk);
    emit = mark*mk*P_markGlow;
    if (r > 1.0) alb = stoneC;
    spec = 0.1;
  } else if (m < 9.5){ alb = vec3(0.2, 0.17, 0.14); spec = 0.6; gloss = 60.0; }
  else if (m < 10.5){ alb = vec3(0.08); }
  else { alb = vec3(0.03, 0.025, 0.02); }

  vec3 L = sunDir();
  float dif = max(dot(n, L), 0.0);
  float sh = dif > 0.001 ? softShadow(wpos + n*(0.004 + 0.001*tt), L) : 0.0;
  float ao = pow(calcAO(wpos, n), P_aoAmt);
  vec3 sunC = vec3(1.0, 0.86, 0.7)*P_sunI;
  vec3 amb = P_skyAmb*mix(vec3(0.06, 0.05, 0.04), skyCol(vec3(0.0, 1.0, 0.0)), 0.5 + 0.5*n.y);
  vec3 col = alb*(sunC*dif*sh + amb*ao) + emit;
  vec3 hv = normalize(L - rd);
  float fre = 0.04 + 0.96*pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  col += sunC*sh*min(spec, 0.6)*pow(max(dot(n, hv), 0.0), gloss)*0.5;
  if (m > 4.5 && m < 5.5 && spec > 0.9) col += skyCol(reflect(rd, n))*mix(0.15, 1.0, fre)*0.6;
  if (m > 5.5 && m < 6.5) col += alb*sunC*0.35*pow(max(dot(rd, L), 0.0), 3.0)*sh;
  return col;
}
vec3 background(vec3 rd){ return skyCol(rd) + vec3(1.0, 0.86, 0.7)*pow(max(dot(rd, sunDir()), 0.0), 300.0)*3.0; }
vec3 finishColor(vec3 col, vec3 rd, float t, bool hit){
  if (hit) col = mix(col, skyCol(rd), 1.0 - exp(-t*P_fog));
  vec3 c = col;
  col = ({{TONE}});
  return pow(clamp(col, 0.0, 1.0), vec3(1.0/2.2));
}
`
});
