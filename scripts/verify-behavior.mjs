/**
 * 기능 검증 (실제 Chrome): 일시정지/재개 정확성, 새로고침 복구, 완료 기록 중복 방지, 출발 화면
 *   node scripts/verify-behavior.mjs [baseUrl] [--pwa]
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3123";
mkdirSync(".verify", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed++;
};
const tSim = async () => {
  const txt = await page.locator("pre").first().textContent();
  return Number(/t ([\d.]+)\//.exec(txt)[1]);
};
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("metro-focus-v1") || "{}").state);

// 0) 출발 화면
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/?tod=sunset`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: ".verify/setup.png" });
check((await page.getByText("오늘은").count()) > 0, "setup screen renders");
await page.getByRole("radio", { name: "40분" }).click();
const cards = await page.locator("button", { hasText: "예상 약" }).count();
check(cards >= 1, `40분 → ${cards} route suggestions`);

// 1) 출발하기 → 시뮬레이션 시작
await page.getByRole("button", { name: /출발하기/ }).click();
await page.waitForSelector("[data-testid=timer]");
check((await page.locator("[data-testid=timer]").textContent()).startsWith("40:") || (await page.locator("[data-testid=timer]").textContent()).startsWith("39:"), "focus session starts with 40-minute timer");

// 2) 일시정지/재개 (체험 운행 + debug 로 sim 시간 확인)
await page.goto(`${base}/?autostart=demo&debug=1&seek=20`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.keyboard.press("Space");
await page.waitForTimeout(300);
const p0 = await tSim();
await page.waitForTimeout(3000);
const p1 = await tSim();
check(Math.abs(p1 - p0) < 0.05, `paused: sim time frozen (${p0.toFixed(2)} → ${p1.toFixed(2)})`);
check((await page.getByText("잠시 쉬어가는 중").count()) > 0, "pause overlay shown");
await page.keyboard.press("Space");
await page.waitForTimeout(2000);
const p2 = await tSim();
check(Math.abs(p2 - p1 - 2) < 0.3, `resumed: advanced ${(p2 - p1).toFixed(2)}s in 2s`);

// 3) 새로고침 복구: 새로고침 동안에도 시간은 흐른다
const before = await tSim();
const wall0 = Date.now();
await page.goto(`${base}/?debug=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const after = await tSim();
const wall = (Date.now() - wall0) / 1000;
check(Math.abs(after - before - wall) < 0.8, `reload restores session by wall clock (Δsim ${(after - before).toFixed(2)}s vs Δwall ${wall.toFixed(2)}s)`);

// 4) 일시정지 상태로 새로고침 → 일시정지 유지
await page.keyboard.press("Space");
await page.waitForTimeout(300);
const q0 = await tSim();
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const q1 = await tSim();
check(Math.abs(q1 - q0) < 0.05 && (await page.getByText("잠시 쉬어가는 중").count()) > 0, "paused session stays paused after reload");

// 5) 완료 중복 방지: 완료 직후 새로고침해도 기록 1개
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/?autostart=demo&debug=1&seek=107`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas[aria-label='집중 완료 승차권']", { timeout: 10000 });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const st = await store();
check(st.records.length === 1 && st.activeSession === null, `one record after completion + reload (records=${st.records.length})`);

// 5b) 오디오: 사용자 클릭 후 AudioContext 가 실행되고, 출발·주행 중 에러가 없어야 한다
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/?autostart=demo&debug=1&seek=8`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "소리 켜기" }).click();
await page.waitForTimeout(6000);
const audioState = await page.evaluate(() => window.__metroAudio?.ctx?.state);
check(audioState === "running", `audio context running after user click (${audioState})`);
check((await page.getByRole("button", { name: "소리 켜기" }).count()) === 0, "audio prompt dismissed");

// 5c) 뽀모도로 휴식 흐름: 집중 완료 → 역에서 휴식 → 휴식 끝 → 같은 역에서 이어 타기
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=110&mode=focus&seek=107`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas[aria-label='집중 완료 승차권']", { timeout: 10000 });
check((await store()).cycleCount === 1, "focus completion increments pomodoro cycle");
await page.getByRole("button", { name: /합정역에서 5분 쉬기/ }).click();
await page.waitForSelector("[data-testid=timer]");
await page.waitForTimeout(1200);
const bt = await page.locator("[data-testid=timer]").textContent();
check(/^0[45]:/.test(bt), `break session starts with 5-minute timer (${bt})`);
check((await page.title()).includes("휴식 중"), `tab title shows break (${await page.title()})`);
check((await page.locator("[data-testid=ride]").getAttribute("data-phase")) === "ARRIVED", "break: train stays at platform");
await page.screenshot({ path: ".verify/break.png" });
await page.getByRole("button", { name: /휴식 끝내기/ }).click();
await page.waitForSelector("text=이어 타기");
check(await page.getByRole("checkbox", { name: /이어 타기/ }).isChecked(), "after break: continue-from-station checked");
check((await page.locator("button", { hasText: "합정 →" }).count()) >= 1, "after break: routes start from 합정");
await page.screenshot({ path: ".verify/after-break.png" });

// 5d) 노선도에서 출발/도착 직접 고르기
await page.getByRole("tab", { name: "직접 고르기" }).click();
await page.getByRole("button", { name: /^잠실역/ }).click();
let hint = await page.locator("[aria-live=polite]").last().textContent();
check(/합정 → 잠실/.test(hint) && /km/.test(hint), `continue ride: pick destination from 합정 (${hint.slice(0, 30)}…)`);
await page.getByRole("checkbox", { name: /이어 타기/ }).uncheck();
await page.getByRole("button", { name: /^당산역/ }).click();
await page.getByRole("button", { name: /^잠실역/ }).click();
hint = await page.locator("[aria-live=polite]").last().textContent();
check(/당산 → 잠실/.test(hint) && /km/.test(hint), `line map pick origin+destination (${hint.slice(0, 30)}…)`);
await page.screenshot({ path: ".verify/picker.png" });

// 5e) 주행 중 탭 제목 = 남은 시간 · 다음 역
await page.goto(`${base}/?autostart=demo&seek=30`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const timerTxt = await page.locator("[data-testid=timer]").textContent();
const title = await page.title();
check(title.startsWith(timerTxt) && title.includes("합정"), `tab title "${title}" mirrors timer`);

// 5f) PWA (프로덕션 빌드에서만)
if (process.argv.includes("--pwa")) {
  const man = await page.evaluate(async () => (await fetch("/manifest.webmanifest")).json());
  check(man.short_name === "METRO" && man.icons.length >= 3, "web app manifest served");
  const sw = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 8000))]));
  check(sw === true, "service worker active");
}

// 6) 시간대 렌더 스냅샷
for (const tod of ["sunset", "night"]) {
  for (const [name, seek] of [["river", 50], ["city", 26], ["platform", 2], ["tunnel", 82]]) {
    await page.goto(`${base}/?autostart=demo&tod=${tod}&seek=${seek}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `.verify/${tod}-${name}.png` });
  }
}

// 7) 모바일 세로
const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await mob.goto(`${base}/?autostart=demo&tod=day&seek=48`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: ".verify/mobile-ride.png" });
await mob.evaluate(() => localStorage.clear());
await mob.goto(`${base}/?tod=day`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: ".verify/mobile-setup.png" });

check(errors.length === 0, `no page errors ${errors.join(" | ")}`);
await browser.close();
process.exit(failed ? 1 : 0);
