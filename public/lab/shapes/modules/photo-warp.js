// Photo Warp — image module. Any photo (or the live camera) bent by pure math. No AI.
window.LAB_MODULES.push({
  id: 'photo-warp',
  name: 'Photo Warp',
  kind: 'image',
  description: 'Load any photo, or warp the live camera, through a chain of conformal and modular maps: kaleidoscope (mod k), swirl, bulge, ripple, wave, Möbius and log-polar Droste. Pure math, no AI.',
  viewParams: ['zoom', 'panX', 'panY'],
  zoomParam: 'zoom',
  noLearnGroups: ['View'],
  animatedBy: ['rippleSpeed', 'waveSpeed', 'spinSpeed'],
  starterText: 'Right hand: move it to place the warp center · fist swirls · pinch bulges or pinches · tilt rotates the kaleidoscope · move closer to zoom. Left hand: left ↔ right sets ripple strength · up ↔ down ripple frequency · fist adds kaleidoscope folds · pinch adds wave.',
  starter: [
    ['A.x', 'cx', -1, 1, 0.1, 0.9],
    ['A.y', 'cy', 1, -1, 0.1, 0.9],
    ['A.open', 'swirl', 5, 0, 0.15, 0.85],
    ['A.pinch', 'bulge', -0.8, 1.2, 0.05, 0.8],
    ['A.tilt', 'kalRot', -1.5, 1.5, -0.8, 0.8],
    ['A.size', 'zoom', 0.7, 2.5, 0.1, 0.32],
    ['B.x', 'ripple', 0, 0.25, 0.1, 0.9],
    ['B.y', 'rippleF', 40, 4, 0.1, 0.9],
    ['B.open', 'kal', 12, 1, 0.15, 0.85],
    ['B.pinch', 'wave', 0, 0.3, 0.05, 0.8]
  ],
  params: [
    ['View','zoom','Zoom',0.2,6,0.01,1],
    ['View','panX','Pan X',-3,3,0.005,0],
    ['View','panY','Pan Y',-3,3,0.005,0],
    ['View','tileMode','Edges: mirror (0) / repeat (1)',0,1,1,0],
    ['Center','cx','Warp center X',-2,2,0.005,0],
    ['Center','cy','Warp center Y',-2,2,0.005,0],
    ['Kaleidoscope','kal','Folds (mod k, 1 = off)',1,24,1,1],
    ['Kaleidoscope','kalRot','Rotation',-3.14,3.14,0.01,0],
    ['Kaleidoscope','spinSpeed','Spin speed',-2,2,0.01,0],
    ['Swirl','swirl','Swirl strength (rad)',-12,12,0.01,0],
    ['Swirl','swirlR','Swirl radius',0.05,3,0.01,0.8],
    ['Bulge','bulge','Bulge (+) / pinch (−)',-0.95,3,0.01,0],
    ['Bulge','bulgeR','Bulge radius',0.05,3,0.01,0.7],
    ['Ripple','ripple','Ripple strength',0,0.5,0.002,0],
    ['Ripple','rippleF','Ripple frequency',1,80,0.5,18],
    ['Ripple','rippleSpeed','Ripple speed',-10,10,0.05,0],
    ['Wave','wave','Wave strength',0,0.6,0.002,0],
    ['Wave','waveF','Wave frequency',0.5,30,0.1,6],
    ['Wave','waveSpeed','Wave speed',-10,10,0.05,0],
    ['Möbius','mob','Möbius blend',0,1,0.01,0],
    ['Möbius','mPx','Möbius point X',-0.95,0.95,0.005,0.3],
    ['Möbius','mPy','Möbius point Y',-0.95,0.95,0.005,0],
    ['Möbius','mRot','Möbius rotation',-3.14,3.14,0.01,0],
    ['Droste','droste','Log-polar Droste (0 = off, 1 = on)',0,1,0.01,0],
    ['Droste','dPeriod','Zoom period (ln scale)',0.2,4,0.01,1.4],
    ['Droste','dTwistD','Spiral twist',-1,1,0.005,0.2],
    ['Color','edges','Edge glow (Sobel)',0,1,0.01,0],
    ['Color','posterize','Posterize levels (0 = off)',0,16,1,0],
    ['Color','saturation','Saturation',0,2,0.01,1],
    ['Color','contrast','Contrast',0.2,2.5,0.01,1],
    ['Color','gridLines','Lattice overlay',0,1,0.01,0]
  ],
  slots: [
    ['UV_WARP','Custom warp (complex plane)','z (vec2, after built-in warps), c (center), uTime → vec2. Helpers cmul, cdiv, cexp, clog. Try cmul(z, z) or z + 0.1*vec2(sin(z.y*9.0), 0.0)','z'],
    ['COLOR','Custom color','col (vec3 0–1), uv (texture coords), z → vec3. Try col.bgr or vec3(dot(col, vec3(0.3, 0.59, 0.11)))','col']
  ],
  frag: `
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cdiv(vec2 a, vec2 b){ float d = dot(b, b) + 1e-6; return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y)/d; }
vec2 cexp(vec2 z){ return exp(z.x)*vec2(cos(z.y), sin(z.y)); }
vec2 clog(vec2 z){ return vec2(log(length(z) + 1e-6), atan(z.y, z.x)); }
vec2 toUV(vec2 z){
  float ta = uTexRes.x/max(uTexRes.y, 1.0);
  vec2 uv = ta >= 1.0 ? vec2(z.x/ta, z.y) : vec2(z.x, z.y*ta);
  uv = uv*0.5 + 0.5;
  if (P_tileMode > 0.5) uv = fract(uv); else uv = abs(mod(uv - 1.0, 2.0) - 1.0);
  if (uMirror > 0.5) uv.x = 1.0 - uv.x;
  return uv;
}
vec3 samp(vec2 uv){ return texture2D(uTex, uv).rgb; }
void main(){
  vec2 z = (gl_FragCoord.xy - 0.5*uRes)/(0.5*min(uRes.x, uRes.y));
  z = z/P_zoom - vec2(P_panX, P_panY);
  vec2 c = vec2(P_cx, P_cy);
  vec2 d = z - c;
  float r = length(d), a = atan(d.y, d.x);
  if (P_kal >= 2.0){
    float s = 6.2831853/floor(P_kal);
    a = mod(a + P_kalRot + uTime*P_spinSpeed, s);
    a = abs(a - 0.5*s);
  }
  a += P_swirl*exp(-r*r/(P_swirlR*P_swirlR));
  r /= max(1.0 + P_bulge*exp(-r*r/(P_bulgeR*P_bulgeR)), 0.05);
  r += P_ripple*sin(r*P_rippleF - uTime*P_rippleSpeed)/max(P_rippleF*0.1, 0.1);
  z = c + r*vec2(cos(a), sin(a));
  z += P_wave*vec2(sin(z.y*P_waveF + uTime*P_waveSpeed), cos(z.x*P_waveF*1.1 + uTime*P_waveSpeed));
  if (P_mob > 0.0){
    vec2 pp = vec2(P_mPx, P_mPy);
    vec2 w = cdiv(z - pp, vec2(1.0, 0.0) - cmul(vec2(pp.x, -pp.y), z));
    w = cmul(w, vec2(cos(P_mRot), sin(P_mRot)));
    z = mix(z, w, P_mob);
  }
  if (P_droste > 0.0){
    vec2 lz = clog(z - c);
    lz = vec2(lz.x - P_dTwistD*lz.y, lz.y);
    lz.x = mod(lz.x, P_dPeriod) - P_dPeriod;
    z = mix(z, c + cexp(lz), P_droste);
  }
  z = ({{UV_WARP}});
  vec2 uv = toUV(z);
  vec3 col = samp(uv);
  if (P_edges > 0.0){
    vec2 px = 1.5/uTexRes;
    float tl = dot(samp(uv + vec2(-px.x, px.y)), vec3(0.333)), tc = dot(samp(uv + vec2(0.0, px.y)), vec3(0.333)), tr = dot(samp(uv + px), vec3(0.333));
    float ml = dot(samp(uv - vec2(px.x, 0.0)), vec3(0.333)), mr = dot(samp(uv + vec2(px.x, 0.0)), vec3(0.333));
    float bl = dot(samp(uv - px), vec3(0.333)), bc = dot(samp(uv - vec2(0.0, px.y)), vec3(0.333)), br = dot(samp(uv + vec2(px.x, -px.y)), vec3(0.333));
    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = tl + 2.0*tc + tr - bl - 2.0*bc - br;
    float e = clamp(length(vec2(gx, gy))*2.0, 0.0, 1.0);
    col = mix(col, mix(col*0.25, vec3(1.0, 0.75, 0.55), e), P_edges);
  }
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, P_saturation);
  col = (col - 0.5)*P_contrast + 0.5;
  if (P_posterize >= 2.0) col = floor(col*P_posterize + 0.5)/P_posterize;
  if (P_gridLines > 0.0){
    vec2 g = abs(fract(z*4.0) - 0.5);
    col = mix(col, vec3(1.0), P_gridLines*smoothstep(0.47, 0.5, max(g.x, g.y))*0.6);
  }
  col = ({{COLOR}});
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
});
