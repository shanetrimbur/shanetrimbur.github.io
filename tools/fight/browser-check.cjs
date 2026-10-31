const { chromium, webkit } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const output = process.env.SCREENSHOT_DIR || "/tmp/hand-fighter-checks";
fs.mkdirSync(output, { recursive: true });
const base = process.env.FIGHT_URL || "http://127.0.0.1:8765/lab/fight/";
async function setup(context) {
  const page = await context.newPage();
  if (!process.env.FIGHT_URL)
    await page.route("http://127.0.0.1:8765/**", async (r) => {
      let p =
        path.resolve(__dirname, "../../public") +
        new URL(r.request().url()).pathname;
      if (p.endsWith("/")) p += "index.html";
      await r.fulfill({ path: p });
    });
  return page;
}
async function drag(page, locator, dx, condition) {
  const box = await page.locator(locator).boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 5 });
  if (condition) await page.waitForFunction(condition);
  else await page.waitForTimeout(140);
}
(async () => {
  for (const [name, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ].filter(
    ([name]) => !process.env.TEST_BROWSER || process.env.TEST_BROWSER === name,
  )) {
    const browser = await type.launch({
      headless: true,
      ...(name === "chromium" && process.env.CHROME_EXECUTABLE
        ? { executablePath: process.env.CHROME_EXECUTABLE }
        : {}),
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      });
      const page = await setup(context),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page.waitForFunction(
        () => window.handFighter?.snapshot().version === "0.2.0",
      );
      await page.getByRole("button", { name: "Try touch practice" }).click();
      await page.screenshot({ path: `${output}/${name}-v02-arena.png` });
      assert.equal(
        await page
          .getByRole("button", { name: "Step back", exact: true })
          .count(),
        0,
      );
      await drag(page, "#thumbSurface", 50, () => {
        const f = handFighter.snapshot().game.fighters;
        return f[1].x - f[0].x < 0.68;
      });
      await page.mouse.up();
      await page.waitForTimeout(100);
      const stopped = await page.evaluate(
        () => handFighter.snapshot().game.fighters[0].x,
      );
      await page.waitForTimeout(180);
      assert.equal(
        await page.evaluate(() => handFighter.snapshot().game.fighters[0].x),
        stopped,
      );
      await page.keyboard.down("j");
      await page.waitForFunction(
        () => handFighter.snapshot().game.fighters[0].landed === 1,
      );
      await page.keyboard.up("j");
      await page.waitForTimeout(200);
      await page
        .getByRole("button", { name: "Rear kick", exact: true })
        .click();
      await page.keyboard.down("j");
      await page.waitForFunction(
        () =>
          handFighter.snapshot().game.fighters[0].limbs.rearKick.extension >
          0.9,
      );
      await page.screenshot({ path: `${output}/${name}-v02-kick.png` });
      await page.keyboard.up("j");
      await page.getByRole("button", { name: "Hide labels" }).click();
      assert.ok(
        await page
          .locator("#pads")
          .evaluate((e) => e.classList.contains("invisible")),
      );
      await page.getByRole("button", { name: "Menu ☰" }).click();
      const time = await page.evaluate(() => handFighter.snapshot().game.time);
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => handFighter.snapshot().game.time),
        time,
      );
      await page.locator("#playerSide").selectOption("1");
      await page.getByRole("button", { name: "Close menu" }).click();
      await page.getByRole("button", { name: "Show labels" }).click();
      await page.getByRole("button", { name: "Lead arm", exact: true }).click();
      await drag(
        page,
        "#thumbSurface",
        40,
        () => handFighter.snapshot().game.fighters[1].x > 0.57,
      );
      await page.mouse.up();
      await drag(page, "#arena", -90);
      assert.ok(
        await page.evaluate(() => handFighter.snapshot().input.extension > 0.9),
      );
      await page.mouse.up();
      await drag(page, "#arena", 90);
      assert.equal(
        await page.evaluate(() => handFighter.snapshot().input.extension),
        0,
      );
      await page.mouse.up();
      await page.getByRole("button", { name: "Menu ☰" }).click();
      await page.locator("#opponent").selectOption("spar");
      await page.getByRole("button", { name: "Reset round" }).click();
      assert.equal(
        await page.evaluate(() => handFighter.snapshot().game.playerIndex),
        1,
      );
      await page.setViewportSize({ width: 844, height: 390 });
      await page.screenshot({ path: `${output}/${name}-v02-landscape.png` });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      // Exercise the actual camera UI -> landmark features -> mapping -> controller -> rig path.
      // Synthetic video/landmarks replace only camera hardware and the ML worker, not app logic.
      const cameraPage = await setup(context),
        cameraErrors = [];
      cameraPage.on("pageerror", (e) => cameraErrors.push(e.message));
      await cameraPage.addInitScript(() => {
        window.__testHand = { dx: 0, curls: [0, 0, 0, 0] };
        // Mock only media acquisition/decoding. WebKit's headless canvas capture
        // can require OS permission, so don't use captureStream as a fake camera.
        const sources = new WeakMap();
        Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
          configurable: true,
          get() {
            return sources.get(this) || null;
          },
          set(value) {
            sources.set(this, value);
          },
        });
        Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
          configurable: true,
          get() {
            return sources.get(this) ? 4 : 0;
          },
        });
        Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
          configurable: true,
          get() {
            return performance.now() / 1000;
          },
        });
        HTMLMediaElement.prototype.play = async () => {};
        navigator.mediaDevices.getUserMedia = async () => {
          const track = { stop() {}, onended: null };
          return { getTracks: () => [track], getVideoTracks: () => [track] };
        };
        window.createImageBitmap = async () => ({ close() {} });
        window.Worker = class {
          postMessage(data) {
            if (data.type === "init") {
              setTimeout(
                () => this.onmessage?.({ data: { type: "ready" } }),
                5,
              );
              return;
            }
            const { dx, curls } = window.__testHand;
            const lm = Array.from({ length: 21 }, () => ({
              x: 0.5 + dx,
              y: 0.5,
              z: 0,
            }));
            lm[0] = { x: 0.5 + dx, y: 0.75, z: 0 };
            [
              [0.4, 0.7],
              [0.34, 0.65],
              [0.31, 0.59],
              [0.29, 0.54],
            ].forEach(([x, y], i) => (lm[i + 1] = { x: x + dx, y, z: 0 }));
            [
              [5, 0.44, 0.53],
              [9, 0.5, 0.5],
              [13, 0.56, 0.53],
              [17, 0.61, 0.57],
            ].forEach(([base, x, y], i) => {
              lm[base] = { x: x + dx, y, z: 0 };
              lm[base + 1] = { x: x + dx, y: y - 0.07, z: 0 };
              lm[base + 2] = { x: x + dx, y: y - 0.13, z: 0 };
              if (curls[i]) {
                lm[base + 2].y = y - 0.03;
                lm[base + 3] = { x: x + dx, y: y + 0.02, z: 0 };
              } else lm[base + 3] = { x: x + dx, y: y - 0.18, z: 0 };
            });
            data.bitmap.close();
            setTimeout(
              () =>
                this.onmessage?.({
                  data: {
                    type: "result",
                    time: data.time,
                    generation: data.generation,
                    landmarks: lm,
                  },
                }),
              0,
            );
          }
          terminate() {}
        };
      });
      await cameraPage.goto(base);
      await cameraPage.bringToFront();
      await cameraPage.evaluate(() => {
        const video=document.getElementById('camera');let source=null;
        Object.defineProperties(video,{
          srcObject:{configurable:true,get:()=>source,set:v=>{source=v;}},
          readyState:{configurable:true,get:()=>source?4:0},
          currentTime:{configurable:true,get:()=>performance.now()/1000},
          play:{configurable:true,value:async()=>{}}
        });
        Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const track={stop(){},onended:null};return {getTracks:()=>[track],getVideoTracks:()=>[track]};}});
      });
      await cameraPage
        .getByRole("button", { name: "Start rear camera" })
        .click();
      try {
        await cameraPage.waitForFunction(
          () => handFighter.snapshot().tracking.calibrated,
          null,
          { timeout: 15000 },
        );
      } catch (error) {
        console.log(
          "Camera diagnostics",
          name,
          await cameraPage.evaluate(() => ({
            status: document.getElementById("status").textContent,
            tracking: handFighter.snapshot().tracking,
            ready: document.getElementById("camera").readyState,
            time: document.getElementById("camera").currentTime,
            mode: handFighter.snapshot().mode,
          })),
          cameraErrors,
        );
        throw error;
      }
      await cameraPage.evaluate(
        () => (window.__testHand = { dx: 0.15, curls: [0, 1, 0, 0] }),
      );
      await cameraPage.waitForFunction(() => {
        const f = handFighter.snapshot().game.fighters[0];
        return f.limbs.lead.extension > 0.9 && f.limbs.rear.extension < 0.15;
      });
      await cameraPage.evaluate(
        () => (window.__testHand = { dx: -0.15, curls: [0, 1, 0, 0] }),
      );
      await cameraPage.waitForFunction(
        () =>
          handFighter.snapshot().game.fighters[0].limbs.lead.extension < 0.1,
      );
      await cameraPage.evaluate(
        () => (window.__testHand = { dx: 0.15, curls: [1, 0, 0, 1] }),
      );
      await cameraPage.waitForFunction(() => {
        const f = handFighter.snapshot().game.fighters[0];
        return f.limbs.rear.extension > 0.9 && f.activeLeg === "rearKick";
      });
      await cameraPage.screenshot({
        path: `${output}/${name}-v02-camera-puppet.png`,
      });
      await drag(
        cameraPage,
        "#arena",
        40,
        () => handFighter.snapshot().game.fighters[0].x > -0.44,
      );
      await cameraPage.mouse.up();
      await cameraPage.getByRole("button", { name: "Menu ☰" }).click();
      await cameraPage.locator("#playerSide").selectOption("1");
      await cameraPage.getByRole("button", { name: "Close menu" }).click();
      await cameraPage.evaluate(
        () => (window.__testHand = { dx: -0.15, curls: [1, 0, 0, 0] }),
      );
      await cameraPage.waitForFunction(
        () =>
          handFighter.snapshot().game.fighters[1].limbs.rear.extension > 0.9,
      );
      await cameraPage.getByRole("button", { name: "Menu ☰" }).click();
      await cameraPage.locator("#mirrorInput").check();
      await cameraPage.getByRole("button", { name: "Close menu" }).click();
      await cameraPage.evaluate(
        () => (window.__testHand = { dx: 0.15, curls: [1, 0, 0, 0] }),
      );
      await cameraPage.waitForFunction(
        () =>
          handFighter.snapshot().game.fighters[1].limbs.rear.extension > 0.9,
      );
      assert.ok(
        await cameraPage
          .locator("#preview")
          .evaluate((e) => e.classList.contains("mirrored")),
      );
      assert.deepEqual(cameraErrors, []);
      console.log(
        name,
        "v0.2 touch, thumb drag, side selection, signed movement and synthetic finger pipeline passed",
      );
    } finally {
      await browser.close();
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
