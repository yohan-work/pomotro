/**
 * 기능 검증 (실제 Chrome): 일시정지/재개 정확성, 새로고침 복구, 완료 기록 중복 방지, 출발 화면
 *   node scripts/verify-behavior.mjs [baseUrl] [--pwa]
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3123";
mkdirSync(".verify", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ locale: "ko-KR", viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
// 외부 날씨 API(Open-Meteo) 장애는 앱이 계절 기본값으로 넘기므로 경고만 (우리 오류가 아니다)
page.on("response", (r) => {
  if (r.status() < 400) return;
  if (new URL(r.url()).hostname === "api.open-meteo.com") console.warn(`  (경고) 외부 날씨 API HTTP ${r.status()} — 앱은 기본값으로 계속`);
  else errors.push(`HTTP ${r.status()} ${r.url()}`);
});
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
await page.getByRole("button", { name: /2호선 잠실역/ }).locator("circle").first().click();
let hint = await page.locator("[aria-live=polite]").last().textContent();
check(/합정 → 잠실/.test(hint) && /km/.test(hint), `continue ride: pick destination from 합정 (${hint.slice(0, 30)}…)`);
await page.getByRole("checkbox", { name: /이어 타기/ }).uncheck();
await page.getByRole("button", { name: /2호선 당산역/ }).locator("circle").first().click();
await page.getByRole("button", { name: /2호선 잠실역/ }).locator("circle").first().click();
hint = await page.locator("[aria-live=polite]").last().textContent();
check(/당산 → 잠실/.test(hint) && /km/.test(hint), `line map pick origin+destination (${hint.slice(0, 30)}…)`);
// 역 검색: 초성·국문으로 찾아 노선 배지로 고르기 (다른 노선이면 그 노선으로 바뀐다)
{
  const box = page.getByRole("combobox", { name: "역 이름으로 찾기" });
  await box.fill("ㅈㅇ");
  check((await page.getByRole("option", { name: "7호선 자양역" }).count()) === 1, "station search by initials (ㅈㅇ → 자양)");
  await page.getByRole("option", { name: "7호선 자양역" }).click();
  await box.fill("청담");
  await page.getByRole("option", { name: "7호선 청담역" }).click();
  const h = await page.locator("[aria-live=polite]").last().textContent();
  check(/자양 → 청담/.test(h) && (await page.getByRole("radio", { name: "7호선" }).getAttribute("aria-checked")) === "true", `station search picks route and switches line (${h.slice(0, 24)}…)`);
}
// 환승: 다른 노선의 역을 도착역으로 고르면 공식 환승 경로 (이촌 4호선 → 당산 2호선, 사당 환승)
{
  const box = page.getByRole("combobox", { name: "역 이름으로 찾기" });
  await box.fill("이촌");
  await page.getByRole("option", { name: "4호선 이촌역" }).click();
  await box.fill("당산");
  await page.getByRole("option", { name: "2호선 당산역" }).click();
  const h = await page.locator("[aria-live=polite]").last().textContent();
  check(/이촌 → 당산/.test(h) && /환승 1회/.test(h), `cross-line pick makes a transfer route (${h.slice(0, 40)}…)`);
}
// 3호선: 노선을 바꿔 동호대교 구간 고르기 → 출발
await page.getByRole("radio", { name: "3호선" }).click();
await page.getByRole("button", { name: /3호선 옥수역/ }).locator("circle").first().click();
await page.getByRole("button", { name: /3호선 압구정역/ }).locator("circle").first().click();
hint = await page.locator("[aria-live=polite]").last().textContent();
check(/옥수 → 압구정/.test(hint) && /2\.1km/.test(hint), `line 3 pick 옥수 → 압구정 (${hint.slice(0, 28)}…)`);
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

// 5f-2) 오래 방치한 세션: 실제 종료 시각으로 기록, 오늘·회차에 섞지 않음
await page.goto(base, { waitUntil: "load" });
await page.evaluate(() => {
  localStorage.setItem("metro-focus-v1", JSON.stringify({ version: 2, state: { records: [], activeSession: {
    id: "stale", mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "",
    startedAt: Date.now() - 2 * 86400000, pausedAccumMs: 0, pausedAt: null } } }));
});
await page.reload({ waitUntil: "load" });
await page.waitForSelector("text=지난 여행이 끝나 있었어요", { timeout: 10000 });
const staleSt = await store();
check(staleSt.records[0].completedAt < Date.now() - 86400000 && staleSt.cycleCount === 0, "abandoned session recorded at its real end time, not counted in cycle");
check((await page.getByRole("button", { name: /쉬기/ }).count()) === 0, "no break offer for a long-finished ride");

// 5g) 나의 서울 노선도: 지난 기록으로 달린 구간·통계·주간 차트·승차권 다시 보기
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => {
  const day = 86400000;
  const now = Date.now();
  const mk = (i, from, to, min, km, ago, partial = false) => ({
    id: `seed-${i}`, mode: "focus", fromId: from, toId: to, stationCount: 3, focusSec: min * 60,
    completedAt: now - ago * day, task: i === 0 ? "사이드 프로젝트" : "", partial, distanceKm: km,
  });
  const records = [
    mk(1, "dangsan", "sinchon", 25, 4.4, 3),
    mk(2, "wangsimni", "jamsil", 25, 9.4, 2),
    mk(3, "jamsil", "gangnam", 40, 6.7, 1),
    mk(0, "hapjeong", "city-hall", 25, 5.9, 0),
    mk(4, "gangnam", "sadang", 15, 3.3, 0, true),
  ];
  localStorage.setItem("metro-focus-v1", JSON.stringify({ state: { records, activeSession: null, lastRecordId: null }, version: 2 }));
});
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "나의 노선도" }).click();
await page.waitForSelector("text=나의 서울 노선도");
const statTxt = await page.locator("section[aria-label='누적 기록']").textContent();
check(/완주4회/.test(statTxt) && /연속4일/.test(statTxt), `records stats (${statTxt})`);
check((await page.locator("tbody tr").count()) === 7, "week chart has 7 days + table fallback");
await page.screenshot({ path: ".verify/records.png", fullPage: true });
await page.locator("button", { hasText: "합정 → 시청" }).click();
await page.waitForSelector("[role=dialog][aria-label='승차권']");
check(true, "ticket re-open dialog");
await page.keyboard.press("Escape");

// 5g-1) 경의중앙선: 노선도에서 고르기, 운행시간 추정 표시
await page.goto(base, { waitUntil: "load" });
await page.getByRole("tab", { name: "직접 고르기" }).click();
await page.getByRole("radio", { name: "경의중앙선" }).click();
await page.getByRole("button", { name: /경의중앙선 청량리역/ }).locator("circle").first().click();
await page.getByRole("button", { name: /경의중앙선 용산역/ }).locator("circle").first().click();
const gjHint = await page.locator("[aria-live=polite]").last().textContent();
check(/청량리 → 용산/.test(gjHint) && /추정/.test(gjHint), `GJ pick shows estimated run time (${gjHint.slice(0, 40)}…)`);

// 5g-2) 3호선 동호대교 주행: 노선 배지·색
await page.goto(`${base}/?autostart=route&route=l3-oksu,l3-apgujeong&total=140&mode=focus&seek=55`, { waitUntil: "load" });
await page.waitForSelector("[data-testid=timer]");
const badge = await page.locator("header span").first().textContent();
check(badge.trim() === "3", `line badge shows 3호선 (${badge})`);
await page.evaluate(() => localStorage.clear());

// 5h) 출발 화면 설정 · 할 일 완료 체크 · 기록 백업
await page.evaluate(() => localStorage.clear());
await page.goto(base, { waitUntil: "load" });
await page.getByRole("button", { name: "설정" }).click();
check((await page.getByRole("dialog", { name: "설정" }).getByText("그래픽 품질").count()) === 1, "settings dialog on setup screen");
await page.getByRole("dialog", { name: "설정" }).getByRole("button", { name: "밤" }).click();
check((await store()).timeOfDay === "night", "time-of-day change from setup persists");
await page.keyboard.press("Escape");
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("metro-focus-v1"));
  s.state.task = "README 다듬기";
  localStorage.setItem("metro-focus-v1", JSON.stringify(s));
});
await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=110&mode=focus&seek=108`, { waitUntil: "load" });
await page.waitForSelector("canvas[aria-label='집중 완료 승차권']", { timeout: 10000 });
await page.screenshot({ path: ".verify/complete-task.png" });
await page.getByRole("button", { name: "끝냈어요" }).click();
const tst = await store();
check(tst.records.at(-1).taskDone === true && tst.task === "", "task marked done on record and cleared for next ride");
await page.getByRole("button", { name: /바로 이어 타기|다음 여행/ }).click();
await page.getByRole("button", { name: "나의 노선도" }).click();
const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "내보내기" }).click()]);
const backupPath = ".verify/backup.json";
await download.saveAs(backupPath);
await page.getByRole("button", { name: "모두 지우기" }).click();
await page.getByRole("button", { name: /한 번 더 누르면 모든 기록/ }).click();
check((await store()).records.length === 0, "clear all records (two-step confirm)");
await page.locator("input[type=file]").setInputFiles(backupPath);
await page.waitForSelector("text=새로 가져왔어요");
check((await store()).records.length === 1, "import restores records from exported file");

// 6) 시간대 렌더 스냅샷
for (const tod of ["sunset", "night"]) {
  for (const [name, seek] of [["river", 50], ["city", 26], ["platform", 2], ["tunnel", 82]]) {
    await page.goto(`${base}/?autostart=demo&tod=${tod}&seek=${seek}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `.verify/${tod}-${name}.png` });
  }
}

// 7) 모바일 세로
const mob = await (await browser.newContext({ locale: "ko-KR",  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await mob.goto(`${base}/?autostart=demo&tod=day&seek=48`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: ".verify/mobile-ride.png" });
await mob.evaluate(() => localStorage.clear());
await mob.goto(`${base}/?tod=day`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: ".verify/mobile-setup.png" });

// 깜짝 이벤트: URL 자동 시작은 기본적으로 없음, ?event= 로 강제 → 승객 등장·도착 기록에 남음·설정으로 끄기
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("metro-focus-v1", JSON.stringify({ version: 2, state: { seenRideTips: true } })));
await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=100&mode=focus&seek=20`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
check((await page.locator("[data-testid=cabin-passenger]").count()) === 0, "scripted ride has no surprise events by default");
await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=100&mode=focus&event=sleeper&seek=94`, { waitUntil: "networkidle" });
check((await page.locator("[data-testid=cabin-passenger][data-kind=sleeper]").count()) === 1, "forced event: sleeper sits across");
await page.waitForSelector("text=이번 여행에서 만난", { timeout: 15000 });
const encRec = (await store()).records.at(-1);
check(JSON.stringify(encRec.encounters) === '["sleeper"]', `encounter recorded on ticket (${JSON.stringify(encRec.encounters)})`);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("metro-focus-v1"));
  s.state.surprises = false;
  localStorage.setItem("metro-focus-v1", JSON.stringify(s));
});
await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=100&mode=focus&event=sleeper&seek=30`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
check((await page.locator("[data-testid=cabin-passenger]").count()) === 1, "forced event still shows for verification when surprises are off");

// 하이라이트 영상: 완료 화면에서 만들어 내려받기 (MediaRecorder, mp4 또는 webm)
{
  await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=150&mode=focus&seek=146`, { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: /하이라이트 영상/ });
  await btn.waitFor({ timeout: 15000 }).catch(() => {});
  if (await btn.count()) {
    const dl = page.waitForEvent("download", { timeout: 60000 }).catch(() => null);
    await btn.click();
    const d = await dl;
    const path = d && (await d.path());
    const size = path ? (await import("node:fs")).statSync(path).size : 0;
    check(Boolean(d) && /\.(mp4|webm)$/.test(d.suggestedFilename()) && size > 100_000, `highlight video downloaded (${d?.suggestedFilename()} ${(size / 1e6).toFixed(1)}MB)`);
  } else console.log("  (영상 녹화 미지원 — 건너뜀)");
}

// 미니 창 (Document Picture-in-Picture): 남은 시간·다음 역, 미니 창 버튼으로 일시정지
{
  await page.goto(`${base}/?autostart=route&route=dangsan,hapjeong&total=300&mode=focus&seek=40`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const supported = await page.evaluate(() => "documentPictureInPicture" in window);
  if (supported) {
    await page.getByRole("button", { name: /미니 창/ }).click();
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => {
      const w = window.documentPictureInPicture.window;
      return w ? { time: w.document.querySelector(".time")?.textContent ?? "", label: w.document.querySelector(".label")?.textContent ?? "" } : null;
    });
    check(Boolean(info && /^0\d:\d\d$/.test(info.time) && /합정/.test(info.label)), `mini window shows time and next stop (${JSON.stringify(info)})`);
    await page.evaluate(() => window.documentPictureInPicture.window.document.querySelector("button").click());
    await page.waitForTimeout(400);
    check((await store()).activeSession.pausedAt !== null, "mini window button pauses the ride");
    await page.evaluate(() => window.documentPictureInPicture.window?.close());
  } else console.log("  (미니 창 API 없음 — 건너뜀)");
}

// 환승 주행: 걷는 동안 안내 카드, 갈아탄 뒤 새 노선
await page.goto(`${base}/?autostart=route&route=l4-ichon,dangsan&total=2700&mode=focus&seek=740`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const card = page.getByTestId("transfer");
check((await card.count()) === 1 && /사당에서 2호선으로 갈아타는 중/.test(await card.textContent()) && /74m/.test(await card.textContent()), "transfer card shows the official walk (사당 74m)");
await page.goto(`${base}/?autostart=route&route=l4-ichon,dangsan&total=2700&mode=focus&seek=785`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
check((await page.getByTestId("transfer").count()) === 0 && /당산행/.test(await page.locator("[aria-live=polite]").first().textContent()), "after the transfer: boarding the Line 2 train bound for 당산");

check(errors.length === 0, `no page errors ${errors.join(" | ")}`);
await browser.close();
process.exit(failed ? 1 : 0);
