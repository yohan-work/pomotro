/**
 * 실제 브라우저(Chrome) 검증
 *
 *  node scripts/verify-browser.mjs [baseUrl] [--full]
 *
 * 1) 장면별 스냅샷: ?seek= 로 정차/가속/한강/터널/감속/도착 시점을 캡처
 * 2) FPS 측정: 주행 중 3초간 requestAnimationFrame 횟수
 * 3) --full: 체험 운행(110초)을 처음부터 끝까지 실시간으로 돌리며 5초마다
 *    타이머·상태·속도를 기록하고 완료 화면 도달까지 확인한다.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3123";
const full = process.argv.includes("--full");
const outDir = ".verify";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const debugText = () => page.locator("pre").first().textContent().catch(() => "");

const shots = [
  ["01-boarding", 3],
  ["02-departing", 14],
  ["03-accel-city", 24],
  ["04-bridge-enter", 34],
  ["05-river-mid", 46],
  ["06-river-late", 58],
  ["07-north-bank", 66],
  ["08-portal", 74],
  ["09-tunnel", 80],
  ["10-approach-platform", 90],
  ["11-arrived", 100],
];

const tods = process.argv.includes("--tod") ? ["day", "sunset", "night"] : ["day"];
for (const tod of tods) {
  for (const [name, seek] of shots) {
    await page.goto(`${base}/?autostart=demo&debug=1&tod=${tod}&seek=${seek}`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=timer]");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${tod}-${name}.png` });
    console.log(`${tod} ${name.padEnd(22)} ${(await debugText()).replace(/\n/g, " | ")}`);
  }
}

// FPS (주행 중)
await page.goto(`${base}/?autostart=demo&debug=1&tod=sunset&seek=40`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const f = () => {
        n++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(f);
        else res(n / ((performance.now() - t0) / 1000));
      };
      requestAnimationFrame(f);
    }),
);
console.log(`\nFPS while cruising over river (headless): ${fps.toFixed(1)}`);
console.log(`debug: ${(await debugText()).replace(/\n/g, " | ")}`);

if (full) {
  console.log("\n▶ Full real-time demo run (110s)");
  await page.goto(`${base}/?autostart=demo&debug=1&tod=day`, { waitUntil: "networkidle" });
  const t0 = Date.now();
  let lastTimer = "";
  while (Date.now() - t0 < 125_000) {
    const done = await page.locator("canvas[aria-label='집중 완료 승차권']").count();
    if (done) {
      console.log(`  ${(((Date.now() - t0) / 1000) | 0)}s  COMPLETE → ticket screen`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${outDir}/12-complete.png` });
      break;
    }
    const timer = await page.locator("[data-testid=timer]").textContent().catch(() => "?");
    const phase = await page.locator("[data-testid=ride]").getAttribute("data-phase").catch(() => "?");
    const dbg = (await debugText()).split("\n").slice(1).join(" | ");
    console.log(`  ${String(((Date.now() - t0) / 1000) | 0).padStart(3)}s  timer ${timer}  ${phase?.padEnd(11)}  ${dbg}`);
    if (timer === lastTimer && phase !== "ARRIVED") console.log("  ⚠ timer did not advance");
    lastTimer = timer;
    await page.waitForTimeout(5000);
  }
}

console.log(errors.length ? `\nErrors:\n${errors.join("\n")}` : "\nNo page errors");
await browser.close();
