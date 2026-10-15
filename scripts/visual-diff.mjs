/**
 * 장면 시각 비교 — 두 빌드(기준·변경)의 같은 장면을 정지 모드(?still=)로 찍어 픽셀 비교한다.
 *
 *   node scripts/visual-diff.mjs <baseUrl> <headUrl> [--out .verify/visual] [--strict]
 *
 * - 같은 머신에서 두 빌드를 비교하므로 OS·글꼴 차이에 의한 오탐이 없다 (CI: main vs PR)
 * - 결과: <out>/<scene>.png (기준 | 변경 | 차이), <out>/report.md, GITHUB_STEP_SUMMARY 에도 표를 쓴다
 * - 기본은 보고만 한다(의도된 풍경 변경도 있으므로). --strict 면 바뀐 장면이 있을 때 실패
 */
import { chromium } from "playwright-core";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

const [base, head] = process.argv.slice(2).filter((a) => a.startsWith("http"));
if (!base || !head) {
  console.error("usage: node scripts/visual-diff.mjs <baseUrl> <headUrl> [--out dir] [--strict]");
  process.exit(2);
}
const outIdx = process.argv.indexOf("--out");
const out = outIdx > 0 ? process.argv[outIdx + 1] : ".verify/visual";
const strict = process.argv.includes("--strict");
mkdirSync(out, { recursive: true });

const fixed = "weather=clear&season=autumn";
const demo = (t, tod, extra = "") => `/?autostart=demo&seek=${t}&still=${t}&tod=${tod}&${fixed}${extra}`;
const route = (r, total, t, tod, extra = "") => `/?autostart=route&route=${r}&total=${total}&seek=${t}&still=${t}&tod=${tod}&${fixed}${extra}`;
const SCENES = [
  ["platform-dangsan", demo(3, "day")],
  ["city-elevated", demo(26, "day")],
  ["river-yanghwa-day", demo(50, "day")],
  ["river-yanghwa-sunset", demo(50, "sunset")],
  ["river-yanghwa-night", demo(50, "night")],
  ["portal", demo(74, "day")],
  ["tunnel", demo(82, "day")],
  ["platform-hapjeong", demo(100, "day")],
  ["jamsil-bridge", route("gangbyeon,jamsillaru", 150, 75, "day")],
  ["seongsu-brick", route("ttukseom,seongsu", 150, 50, "day")],
  ["dongho-south", route("l3-oksu,l3-apgujeong", 140, 55, "day")],
  ["dongho-north-sunset", route("l3-apgujeong,l3-oksu", 140, 80, "sunset")],
  ["gj-riverside-west", route("gj-seobinggo,gj-ichon", 200, 95, "day")],
  ["gj-paldang", route("gj-paldang,gj-dosim", 200, 90, "day")],
  ["gj-rural", route("gj-yangpyeong,gj-wondeok", 200, 90, "day")],
  ["dongjak-south", route("l4-ichon,l4-dongjak", 200, 154, "day")],
  ["dongjak-north-sunset", route("l4-dongjak,l4-ichon", 200, 50, "sunset")],
  ["cheongdam-south", route("l7-jayang,l7-cheongdam", 200, 52, "day")],
  ["cheongdam-north-night", route("l7-cheongdam,l7-jayang", 200, 151, "night")],
  ["jayang-platform", route("l7-konkuk-univ,l7-jayang", 150, 145, "day")],
  ["event-balloon", route("dangsan,hapjeong", 200, 30, "day", "&event=balloon")],
  ["event-duckboat", route("dangsan,hapjeong", 150, 52, "day", "&event=duckboat")],
  ["event-monster-sunset", route("dangsan,hapjeong", 150, 50, "sunset", "&event=monster")],
  ["event-cat", route("dangsan,hapjeong", 150, 3, "day", "&event=cat")],
  ["event-ttorong", route("city-hall,euljiro-4ga", 300, 35.96, "day", "&event=ttorong")],
  ["rain", demo(30, "day", "&weather=rain")],
  ["snow-winter-night", demo(26, "night", "&weather=snow&season=winter")],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ locale: "ko-KR",  viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await ctx.newPage();

async function capture(url) {
  await page.goto(url.split("/?")[0] + "/", { waitUntil: "load" });
  await page.evaluate(() => localStorage.setItem("metro-focus-v1", JSON.stringify({ version: 2, state: { seenRideTips: true } })));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("canvas[aria-label='지하철 창밖 풍경']", { timeout: 8000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  return page.locator("canvas[aria-label='지하철 창밖 풍경']").screenshot();
}

/** 브라우저 캔버스로 픽셀 비교: 채널 평균 차이가 24 넘는 픽셀 비율, 평균 차이, 기준|변경|차이 합성 이미지 */
async function compare(a, b) {
  return page.evaluate(
    async ({ a, b }) => {
      const load = async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        return img;
      };
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.min(ia.width, ib.width);
      const h = Math.min(ia.height, ib.height);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.drawImage(ia, 0, 0);
      const da = x.getImageData(0, 0, w, h).data;
      x.drawImage(ib, 0, 0);
      const db = x.getImageData(0, 0, w, h);
      const diff = x.createImageData(w, h);
      let sum = 0;
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = (Math.abs(da[i] - db.data[i]) + Math.abs(da[i + 1] - db.data[i + 1]) + Math.abs(da[i + 2] - db.data[i + 2])) / 3;
        sum += d;
        const hot = d > 24;
        if (hot) changed++;
        const g = (da[i] + da[i + 1] + da[i + 2]) / 3;
        diff.data[i] = hot ? 255 : g * 0.35;
        diff.data[i + 1] = hot ? 40 : g * 0.35;
        diff.data[i + 2] = hot ? 80 : g * 0.35;
        diff.data[i + 3] = 255;
      }
      const s = 0.5;
      const sheet = document.createElement("canvas");
      sheet.width = Math.round(w * s) * 3 + 16;
      sheet.height = Math.round(h * s);
      const sx = sheet.getContext("2d");
      sx.fillStyle = "#fff";
      sx.fillRect(0, 0, sheet.width, sheet.height);
      sx.drawImage(ia, 0, 0, w * s, h * s);
      sx.drawImage(ib, Math.round(w * s) + 8, 0, w * s, h * s);
      const dc = document.createElement("canvas");
      dc.width = w;
      dc.height = h;
      dc.getContext("2d").putImageData(diff, 0, 0);
      sx.drawImage(dc, (Math.round(w * s) + 8) * 2, 0, w * s, h * s);
      return { mean: sum / (w * h), ratio: changed / (w * h), sheet: sheet.toDataURL("image/png").split(",")[1] };
    },
    { a: a.toString("base64"), b: b.toString("base64") },
  );
}

const rows = [];
const tryCapture = (url) => capture(url).catch(() => null);
let headFailed = 0;
for (const [name, path] of SCENES) {
  const b = await tryCapture(head + path);
  if (!b) {
    // 변경 쪽에서 장면이 안 뜨면 실패
    headFailed++;
    rows.push({ name, status: "error", ratio: 1, mean: 0 });
    console.log(`✗ ${name.padEnd(22)} 변경 빌드에서 장면을 띄우지 못함`);
    continue;
  }
  const a = await tryCapture(base + path);
  if (!a) {
    // 기준 빌드에 아직 없는 노선·장면 → 새 장면
    writeFileSync(`${out}/${name}.new.png`, b);
    rows.push({ name, status: "new", ratio: 0, mean: 0 });
    console.log(`+ ${name.padEnd(22)} 새 장면 (기준 빌드에 없음)`);
    continue;
  }
  const r = await compare(a, b);
  const status = r.ratio > 0.005 ? "changed" : "same";
  if (status === "changed") writeFileSync(`${out}/${name}.png`, Buffer.from(r.sheet, "base64"));
  rows.push({ name, status, ratio: r.ratio, mean: r.mean });
  console.log(`${status === "changed" ? "△" : "="} ${name.padEnd(22)} changed ${(r.ratio * 100).toFixed(2)}%  mean Δ ${r.mean.toFixed(2)}`);
}
await browser.close();

const changed = rows.filter((r) => r.status === "changed");
const md =
  `### 장면 시각 비교\n\n${changed.length ? `**${changed.length}개 장면이 달라졌어요** — 아티팩트 \`visual-diff\` 에서 기준 | 변경 | 차이 이미지를 확인하세요.` : "모든 장면이 같아요."}\n\n` +
  `| 장면 | 결과 | 바뀐 픽셀 | 평균 차이 |\n|---|---|---|---|\n` +
  rows
    .map((r) => {
      const label = { changed: "△ 달라짐", same: "= 같음", new: "+ 새 장면", error: "✗ 변경 빌드 오류" }[r.status];
      const pct = r.status === "new" || r.status === "error" ? "—" : `${(r.ratio * 100).toFixed(2)}%`;
      return `| ${r.name} | ${label} | ${pct} | ${r.status === "new" || r.status === "error" ? "—" : r.mean.toFixed(2)} |`;
    })
    .join("\n") +
  "\n";
writeFileSync(`${out}/report.md`, md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
if (headFailed) process.exit(1);
if (strict && changed.length) process.exit(1);
