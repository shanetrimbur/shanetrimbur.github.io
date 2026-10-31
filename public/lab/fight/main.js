import * as T from "./vendor/three.module.js";
import { makeGame, stepGame, FixedClock, clamp } from "./controller.js?v=0.2.0";
import { loadAnatomy, AnatomyFighter } from "./rig.js?v=0.2.0";
import { HandTracker } from "./tracking.js?v=0.2.0";
import { thumbMovement } from "./puppet.js?v=0.2.0";
const $ = (id) => document.getElementById(id);
const welcome = $("welcome"),
  menu = $("menu"),
  arena = $("arena");
let game = makeGame(),
  mode = "touch",
  limb = "lead",
  ready = false,
  touch = null,
  thumb = null,
  lastInput = null,
  feedbackUntil = 0,
  wasTracked = false;
const holds = new Map(),
  keys = new Set();
const clock = new FixedClock();
const say = (message) => {
  $("status").textContent = message;
};
welcome.showModal();
let renderer,
  scene,
  camera,
  characters = [];
const tracker = new HandTracker($("camera"), say, drawPoints);
function drawPoints(points) {
  const c = $("landmarks"),
    v = $("camera");
  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  if (!points) return;
  ctx.strokeStyle = "#b0efc8";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#b0efc8";
  for (const chain of [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [5, 9, 10, 11, 12],
    [9, 13, 14, 15, 16],
    [13, 17, 18, 19, 20],
    [0, 17],
  ]) {
    ctx.beginPath();
    chain.forEach((i, j) =>
      ctx[j ? "lineTo" : "moveTo"](
        points[i].x * c.width,
        points[i].y * c.height,
      ),
    );
    ctx.stroke();
  }
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x * c.width, p.y * c.height, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
function clearControls() {
  holds.clear();
  keys.clear();
  touch = null;
  thumb = null;
  $("thumbStick").hidden = true;
  $("thumbSurface").setAttribute("aria-valuenow", "0");
  document.querySelectorAll(".held").forEach((e) => e.classList.remove("held"));
  clock.reset();
}
function paused() {
  return welcome.open || menu.open || document.hidden;
}
function selectLimb(value) {
  limb = value;
  document
    .querySelectorAll("[data-limb]")
    .forEach((e) =>
      e.setAttribute("aria-pressed", String(e.dataset.limb === limb)),
    );
  syncHUD();
}
function syncHUD() {
  const left = game.playerIndex === 0;
  $("leftName").textContent = left ? "YOU" : "ECHO";
  $("rightName").textContent = left ? "ECHO" : "YOU";
  const playerLabel =
    mode === "camera"
      ? "FINGER PUPPET"
      : {
          lead: "LEAD ARM",
          rear: "REAR ARM",
          kick: "LEAD KICK",
          rearKick: "REAR KICK",
        }[limb];
  const opponentLabel =
    game.mode === "spar" ? "SPARRING PARTNER" : "TRAINING DUMMY";
  $("leftState").textContent = left ? playerLabel : opponentLabel;
  $("rightState").textContent = left ? opponentLabel : playerLabel;
  $("health0").setAttribute(
    "aria-label",
    left ? "Your health" : "Opponent health",
  );
  $("health1").setAttribute(
    "aria-label",
    left ? "Opponent health" : "Your health",
  );
  document.body.dataset.control = mode;
}
function preview() {
  $("preview").classList.toggle("mirrored", $("mirrorInput").checked);
  $("preview").hidden =
    mode !== "camera" || !tracker.stream || !$("showPreview").checked;
  $("preview").querySelector("span").textContent =
    $("cameraChoice").value === "environment" ? "REAR CAMERA" : "FRONT CAMERA";
}
async function startCamera() {
  if (!ready) return;
  mode = "camera";
  syncHUD();
  clearControls();
  welcome.close();
  menu.close();
  const ok = await tracker.start($("cameraChoice").value);
  preview();
  if (!ok) mode = "camera-error";
  syncHUD();
}
function practice() {
  tracker.stop();
  mode = "touch";
  syncHUD();
  clearControls();
  welcome.close();
  menu.close();
  preview();
  say(
    "Touch practice: drag toward the opponent to strike. Drag the lower strip to move.",
  );
}
$("startCamera").onclick = startCamera;
$("touchPractice").onclick = practice;
$("menuButton").onclick = () => {
  clearControls();
  menu.showModal();
};
$("closeMenu").onclick = () => menu.close();
menu.addEventListener("close", clearControls);
$("restartCamera").onclick = startCamera;
$("practiceMode").onclick = practice;
$("recalibrate").onclick = () => {
  if (tracker.stream) {
    tracker.calibrate();
    clearControls();
    menu.close();
  } else startCamera();
};
$("showPreview").onchange = preview;
$("resetRound").onclick = () => {
  game = makeGame(Number($("playerSide").value));
  game.mode = $("opponent").value;
  clearControls();
  $("feedback").textContent = "";
  menu.close();
  syncHUD();
  say("New round. Drag your thumb to get within reach.");
};
$("opponent").onchange = () => {
  game.mode = $("opponent").value;
  syncHUD();
};
$("playerSide").onchange = () => {
  game = makeGame(Number($("playerSide").value));
  game.mode = $("opponent").value;
  feedbackUntil = 0;
  clearControls();
  syncHUD();
  say(
    game.playerIndex === 0
      ? "Left fighter: move your hand RIGHT to punch forward."
      : "Right fighter: move your hand LEFT to punch forward.",
  );
};
$("mirrorInput").onchange = preview;
$("cameraChoice").onchange = () => {
  $("mirrorInput").checked = $("cameraChoice").value === "user";
  preview();
};
$("hidePads").onclick = () => {
  const hidden = $("pads").classList.toggle("invisible");
  $("hidePads").textContent = hidden ? "Show labels" : "Hide labels";
  $("hidePads").setAttribute("aria-pressed", String(hidden));
};
document
  .querySelectorAll("[data-limb]")
  .forEach((e) => (e.onclick = () => selectLimb(e.dataset.limb)));
document.querySelectorAll("[data-hold]").forEach((e) => {
  e.onpointerdown = (event) => {
    event.preventDefault();
    if (paused()) return;
    e.setPointerCapture(event.pointerId);
    holds.set(event.pointerId, e.dataset.hold);
    e.classList.add("held");
  };
  const release = (event) => {
    holds.delete(event.pointerId);
    e.classList.remove("held");
  };
  e.onpointerup = release;
  e.onpointercancel = release;
  e.onlostpointercapture = release;
});
function startThumb(e) {
  if (paused() || thumb) return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  thumb = { id: e.pointerId, startX: e.clientX, x: e.clientX, y: e.clientY };
  const stick = $("thumbStick");
  stick.hidden = false;
  stick.style.left = e.clientX + "px";
  stick.style.top = e.clientY + "px";
  stick.firstElementChild.style.transform = "translate(0px, 0px)";
}
function moveThumb(e) {
  if (thumb?.id !== e.pointerId) return;
  thumb.x = e.clientX;
  const dx = clamp(thumb.x - thumb.startX, -60, 60);
  $("thumbStick").firstElementChild.style.transform = `translate(${dx}px, 0px)`;
  $("thumbSurface").setAttribute(
    "aria-valuenow",
    String(Math.round((dx / 60) * 100)),
  );
}
function releasePointer(e) {
  if (touch?.id === e.pointerId) touch = null;
  if (thumb?.id === e.pointerId) {
    thumb = null;
    $("thumbStick").hidden = true;
    $("thumbSurface").setAttribute("aria-valuenow", "0");
  }
}
arena.onpointerdown = (e) => {
  if (mode === "camera") {
    startThumb(e);
    return;
  }
  if (mode !== "touch" || paused() || touch) return;
  e.preventDefault();
  arena.setPointerCapture(e.pointerId);
  touch = { id: e.pointerId, startX: e.clientX, x: e.clientX, y: e.clientY };
};
arena.onpointermove = (e) => {
  moveThumb(e);
  if (touch?.id === e.pointerId) {
    touch.x = e.clientX;
    touch.y = e.clientY;
  }
};
$("thumbSurface").onpointerdown = startThumb;
$("thumbSurface").onpointermove = moveThumb;
for (const e of [arena, $("thumbSurface")]) {
  e.onpointerup = releasePointer;
  e.onpointercancel = releasePointer;
  e.onlostpointercapture = releasePointer;
}
window.addEventListener("keydown", (e) => {
  if (paused() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (["1", "2", "3", "4"].includes(e.key))
    selectLimb({ 1: "lead", 2: "rear", 3: "kick", 4: "rearKick" }[e.key]);
  if (
    [
      "a",
      "d",
      "g",
      "j",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.key)
  ) {
    e.preventDefault();
    keys.add(e.key);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key));
window.addEventListener("blur", clearControls);
document.addEventListener("visibilitychange", () => {
  clearControls();
  if (document.hidden && tracker.stream) {
    tracker.stop();
    mode = "camera-error";
    syncHUD();
    preview();
    say("Camera paused while away. Open Menu to restart.");
  }
});
function input(now) {
  const facing = game.fighters[game.playerIndex].facing;
  let i =
    mode === "camera"
      ? tracker.input(now, { facing, mirrored: $("mirrorInput").checked })
      : { active: false };
  if (mode === "touch") {
    const box = arena.getBoundingClientRect();
    i = {
      active: !!touch || keys.has("j"),
      extension: touch
        ? clamp(((touch.x - touch.startX) * facing) / (box.width * 0.2), 0, 1)
        : keys.has("j")
          ? 1
          : 0,
      aim: touch
        ? clamp(1.65 - (touch.y - box.top) / box.height, 0.75, 1.55)
        : keys.has("ArrowUp")
          ? 1.52
          : keys.has("ArrowDown")
            ? 0.85
            : 1.3,
      lean: 0,
    };
  }
  const held = Array.from(holds.values());
  return {
    ...i,
    limb,
    move: thumb
      ? thumbMovement(thumb.x - thumb.startX, facing)
      : ((keys.has("d") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("a") || keys.has("ArrowLeft") ? 1 : 0)) *
        facing,
    guard: held.includes("guard") || keys.has("g"),
  };
}
function fit() {
  if (!renderer) return;
  const w = arena.clientWidth,
    h = arena.clientHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h,
    halfH = Math.max(1.12, 1.17 / aspect);
  camera.left = -halfH * aspect;
  camera.right = halfH * aspect;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
async function init() {
  renderer = new T.WebGLRenderer({
    canvas: $("scene"),
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  scene = new T.Scene();
  scene.fog = new T.Fog(0x0b1014, 7, 16);
  camera = new T.OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 30);
  camera.position.set(0.15, 1.45, 6);
  camera.lookAt(0, 0.85, 0);
  scene.add(new T.HemisphereLight(0xc9e6ef, 0x313c2c, 2.5));
  const key = new T.DirectionalLight(0xffddbf, 3);
  key.position.set(-2, 4, 4);
  scene.add(key);
  const rim = new T.DirectionalLight(0x9ad8d1, 3);
  rim.position.set(2, 3, -2);
  scene.add(rim);
  const floor = new T.Mesh(
    new T.PlaneGeometry(30, 30),
    new T.MeshStandardMaterial({ color: 0x101b20, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  scene.add(floor);
  const grid = new T.GridHelper(20, 40, 0x263d3d, 0x172b2d);
  grid.position.y = -0.02;
  scene.add(grid);
  const ring = new T.Mesh(
    new T.RingGeometry(1.64, 1.65, 96),
    new T.MeshBasicMaterial({
      color: 0x71948b,
      transparent: true,
      opacity: 0.25,
      side: T.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.scale.y = 0.6;
  ring.position.y = -0.012;
  scene.add(ring);
  const asset = await loadAnatomy();
  characters = [
    new AnatomyFighter(asset, 0x9d3630),
    new AnatomyFighter(asset, 0x467f83),
  ];
  for (const c of characters) {
    scene.add(c.group);
    const shadow = new T.Mesh(
      new T.CircleGeometry(0.28, 32),
      new T.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.x = 1.4;
    shadow.position.y = -0.008;
    c.group.add(shadow);
  }
  characters.forEach((c, i) => c.update(game.fighters[i]));
  new ResizeObserver(fit).observe(arena);
  fit();
  $("scene").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    clearControls();
    tracker.stop();
    say("Graphics paused. Reload the page to resume.");
  });
  ready = true;
  syncHUD();
  $("startCamera").disabled = false;
  $("touchPractice").disabled = false;
  $("startCamera").textContent = "Start rear camera";
  say("Ready. Choose camera control or touch practice.");
  window.handFighter = {
    snapshot: () => ({
      version: "0.2.0",
      input: structuredClone(lastInput),
      mode,
      paused: paused(),
      game: structuredClone(game),
      tracking: {
        calibrated: !!tracker.neutral,
        active: tracker.input(performance.now()).active,
        frames: tracker.frames,
        worker: !!tracker.worker,
      },
      render: {
        triangles: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
      },
      joints: characters.map((c) =>
        c.bones.map((_, i) => c.position(i).toArray()),
      ),
    }),
  };
  let last = performance.now(),
    count = 0,
    fpsTime = last;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) {
      clock.reset();
      return;
    }
    if (!paused()) {
      tracker.tick(now);
      const controls = input(now);
      lastInput = controls;
      ["lead", "rear", "kick", "rearKick"].forEach((name, i) => {
        const p = game.fighters[game.playerIndex].limbs[name];
        $("finger" + i).style.width =
          Math.round(Math.max(p.extension, p.lift) * 100) + "%";
      });
      clock.advance(now, (dt) => {
        stepGame(game, controls, dt);
        for (const event of game.events) {
          if (event.type === "round") {
            $("feedback").textContent =
              event.winner === null
                ? "DRAW"
                : event.winner === game.playerIndex
                  ? "ROUND · YOU"
                  : "ROUND · ECHO";
            feedbackUntil = Infinity;
          } else {
            $("feedback").textContent =
              event.type === "block"
                ? "BLOCK"
                : (event.combo > 1 ? event.combo + " HIT · " : "") +
                  {
                    lead: "JAB",
                    rear: "CROSS",
                    kick: "KICK",
                    rearKick: "REAR KICK",
                  }[event.limb];
            $("scene").classList.remove("impact");
            void $("scene").offsetWidth;
            $("scene").classList.add("impact");
            feedbackUntil = now + 400;
          }
        }
      });
      if (mode === "camera" && tracker.neutral) {
        const active = controls.active;
        if (active !== wasTracked) {
          say(
            active
              ? "Fingers control limbs. Move toward your opponent to strike; drag your thumb to move."
              : "Hand lost — guarding. Bring your whole hand back into view.",
          );
          wasTracked = active;
        }
      }
      $("statusDot").classList.toggle("active", controls.active === true);
    } else clock.reset();
    characters.forEach((c, i) => {
      c.update(
        game.fighters[i],
        Math.abs(game.fighters[0].x - game.fighters[1].x),
      );
      $("health" + i).value = game.fighters[i].health;
    });
    if (now > feedbackUntil) $("feedback").textContent = "";
    renderer.render(scene, camera);
    count++;
    if (now - fpsTime > 1000) {
      $("fps").textContent =
        Math.round((count * 1000) / (now - fpsTime)) + " FPS";
      count = 0;
      fpsTime = now;
    }
    last = now;
  }
  requestAnimationFrame(frame);
}
init().catch((error) => {
  console.error(error);
  $("fatal").hidden = false;
  $("fatal").textContent =
    "The fighter could not load: " + error.message + ". Reload to retry.";
  $("startCamera").textContent = "Could not load";
  say("Unable to load the character.");
});
