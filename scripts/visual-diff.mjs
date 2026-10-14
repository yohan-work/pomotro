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
  ["rain", demo(30, "day", "&weather=rain")],
  ["snow-winter-night", demo(26, "night", "&weather=snow&season=winter")],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
const page = await ctx.newPage();

async function capture(url) {
  await page.goto(url.split("/?")[0] + "/", { waitUntil: "load" });
  await page.evaluate(() => localStorage.setItem("metro-focus-v1", JSON.stringify({ version: 2, state: { seenRideTips: true } })));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("canvas[aria-label='지하철 창밖 풍경']");
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
for (const [name, path] of SCENES) {
  const a = await capture(base + path);
  const b = await capture(head + path);
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
  rows.map((r) => `| ${r.name} | ${r.status === "changed" ? "△ 달라짐" : "= 같음"} | ${(r.ratio * 100).toFixed(2)}% | ${r.mean.toFixed(2)} |`).join("\n") +
  "\n";
writeFileSync(`${out}/report.md`, md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
if (strict && changed.length) process.exit(1);
