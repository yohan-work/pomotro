/** 주간 회고 카드 — 1080×1350 세로 이미지 (SNS 공유용). 자체 디자인, 기관 로고 없음 */
import { LINE_BY_ID, type LineId } from "@/data/lines";
import { tr, type Lang } from "@/i18n";
import { weekStartDay, type WeekSummary } from "@/lib/goals";

export const RECAP_W = 1080;
export const RECAP_H = 1350;

const dateOf = (kday: number) => new Date(kday * 86400e3);
const fmtDate = (kday: number, lang: Lang) =>
  dateOf(kday).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function drawRecap(c: CanvasRenderingContext2D, s: WeekSummary, lang: Lang) {
  const W = RECAP_W;
  const H = RECAP_H;
  const F = (w: number, size: number) => `${w} ${size}px Pretendard, -apple-system, sans-serif`;
  c.fillStyle = "#F7F3EA";
  c.fillRect(0, 0, W, H);
  // 머리 띠
  c.fillStyle = "#2E946B";
  c.fillRect(0, 0, W, 210);
  c.fillStyle = "#fff";
  c.font = F(800, 40);
  c.textBaseline = "alphabetic";
  c.fillText("METRO", 80, 96);
  c.font = F(600, 30);
  c.globalAlpha = 0.85;
  c.fillText(tr(lang, "recap.title"), 80, 150);
  c.globalAlpha = 1;
  c.textAlign = "right";
  c.font = F(600, 30);
  const start = weekStartDay(s.week);
  c.fillText(tr(lang, "recap.range", { from: fmtDate(start, lang), to: fmtDate(start + 6, lang) }), W - 80, 150);
  c.textAlign = "left";

  c.fillStyle = "#252525";
  c.font = F(800, 64);
  c.fillText(tr(lang, "recap.cardTitle"), 80, 330);

  // 숫자 네 칸
  const h = Math.floor(s.minutes / 60);
  const m = s.minutes % 60;
  const cells: Array<[string, string]> = [
    [tr(lang, "recap.rides"), String(s.rides)],
    [tr(lang, "recap.minutes"), h > 0 ? `${h}h ${m}m` : `${m}m`],
    [tr(lang, "recap.km"), `${s.km.toFixed(1)}km`],
    [tr(lang, "recap.newStations"), String(s.newStations)],
  ];
  cells.forEach(([label, val], k) => {
    const x = 80 + (k % 2) * 470;
    const y = 400 + Math.floor(k / 2) * 190;
    c.fillStyle = "#FFFFFF";
    c.beginPath();
    c.roundRect(x, y, 440, 160, 28);
    c.fill();
    c.fillStyle = "#8A857C";
    c.font = F(600, 28);
    c.fillText(label, x + 36, y + 56);
    c.fillStyle = "#252525";
    c.font = F(800, 62);
    c.fillText(val, x + 36, y + 128);
  });

  // 요일별 막대
  const days = tr(lang, "recap.days").split(",");
  const max = Math.max(1, ...s.perDay);
  const by = 1050;
  const bw = 90;
  s.perDay.forEach((min, k) => {
    const x = 80 + k * ((W - 160 - bw) / 6);
    const bh = (min / max) * 220;
    c.fillStyle = "#E7E1D4";
    c.beginPath();
    c.roundRect(x, by - 220, bw, 220, 16);
    c.fill();
    if (min > 0) {
      c.fillStyle = "#2E946B";
      c.beginPath();
      c.roundRect(x, by - bh, bw, bh, 16);
      c.fill();
    }
    c.fillStyle = "#8A857C";
    c.font = F(600, 26);
    c.textAlign = "center";
    c.fillText(days[k], x + bw / 2, by + 44);
    c.textAlign = "left";
  });

  // 탄 노선 배지
  let x = 80;
  const ly = 1190;
  for (const id of s.lines) {
    const line = LINE_BY_ID[id as LineId];
    if (!line) continue;
    const label = line.badge[lang];
    const w = label.length > 1 ? 96 : 64;
    c.fillStyle = line.color;
    c.beginPath();
    c.roundRect(x, ly - 32, w, 64, 32);
    c.fill();
    c.fillStyle = "#fff";
    c.font = F(800, label.length > 1 ? 26 : 32);
    c.textAlign = "center";
    c.fillText(label, x + w / 2, ly + 11);
    c.textAlign = "left";
    x += w + 16;
  }

  c.fillStyle = "#8A857C";
  c.font = F(600, 26);
  c.textAlign = "right";
  c.fillText("pomotro.vercel.app", W - 80, H - 60);
  c.textAlign = "left";
}

export async function recapBlob(s: WeekSummary, lang: Lang): Promise<Blob | null> {
  await document.fonts?.ready.catch(() => {});
  const cv = document.createElement("canvas");
  cv.width = RECAP_W;
  cv.height = RECAP_H;
  drawRecap(cv.getContext("2d")!, s, lang);
  return new Promise((res) => cv.toBlob(res, "image/png"));
}
