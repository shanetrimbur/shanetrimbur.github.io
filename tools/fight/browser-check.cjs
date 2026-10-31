const { chromium, webkit } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const output = process.env.SCREENSHOT_DIR || "/tmp/hand-fighter-checks";
fs.mkdirSync(output, { recursive: true });
const base = process.env.FIGHT_URL || "http://127.0.0.1:8765/lab/fight/";
(async () => {
  for (const [name, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await type.launch({
      headless: true,
      ...(name === "chromium" && process.env.CHROME_EXECUTABLE
        ? { executablePath: process.env.CHROME_EXECUTABLE }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    if (!process.env.FIGHT_URL)
      await page.route("http://127.0.0.1:8765/**", async (route) => {
        const u = new URL(route.request().url());
        let p = path.resolve(__dirname, "../../public") + u.pathname;
        if (p.endsWith("/")) p += "index.html";
        await route.fulfill({ path: p });
      });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => !!window.handFighter, { timeout: 30000 });
    await page.screenshot({ path: `${output}/fighter-${name}-welcome.png` });
    await page.getByRole("button", { name: "Try touch practice" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/fighter-${name}-arena.png` });
    let state = await page.evaluate(() => handFighter.snapshot());
    assert.ok(state.render.triangles > 140000);
    assert.equal(state.mode, "touch");
    await page.keyboard.down("d");
    await page.waitForFunction(() => {
      const f = handFighter.snapshot().game.fighters;
      return f[1].x - f[0].x < 0.68;
    });
    await page.keyboard.up("d");
    await page.keyboard.down("j");
    await page.waitForFunction(
      () => handFighter.snapshot().game.fighters[0].landed === 1,
    );
    state = await page.evaluate(() => handFighter.snapshot());
    assert.equal(state.game.fighters[0].landed, 1);
    assert.ok(state.game.fighters[1].health < 100);
    await page.screenshot({ path: `${output}/fighter-${name}-punch.png` });
    await page.keyboard.up("j");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "03 Kick" }).click();
    await page.keyboard.down("j");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${output}/fighter-${name}-kick.png` });
    await page.keyboard.up("j");
    await page.getByRole("button", { name: "Hide labels" }).click();
    assert.ok(
      await page
        .locator("#pads")
        .evaluate((e) => e.classList.contains("invisible")),
    );
    await page.getByRole("button", { name: "Menu ☰" }).click();
    const t = await page.evaluate(() => handFighter.snapshot().game.time);
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() => handFighter.snapshot().game.time),
      t,
    );
    await page.locator("#opponent").selectOption("spar");
    await page.getByRole("button", { name: "Reset round" }).click();
    await page.waitForTimeout(800);
    assert.equal(
      await page.evaluate(() => handFighter.snapshot().game.mode),
      "spar",
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${output}/fighter-${name}-landscape.png` });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      name,
      "passed",
      JSON.stringify({ errors, render: state.render }),
    );
    assert.deepEqual(errors, []);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
