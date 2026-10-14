/** 집중 완료 승차권 — 캔버스로 그려 화면 표시와 PNG 저장에 같은 결과를 쓴다 */
import { getStation, LINE_BY_ID } from "@/data/lines";
import { tr, type Lang, type StringKey } from "@/i18n";
import type { RideRecord } from "@/store/useAppStore";

export const TICKET_W = 1080;
export const TICKET_H = 600;

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function drawMascot(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s / 64, s / 64);
  c.lineWidth = 2.2;
  c.strokeStyle = "#3A3A3A";
  c.fillStyle = "#FFFDF8";
  const body = new Path2D("M10 40c0-14 9.5-24 22-24s22 10 22 24c0 10-9 17-22 17S10 50 10 40Z");
  c.fill(body);
  c.stroke(body);
  const cap = new Path2D("M17 21c3-6 8-9 15-9s12 3 15 9c-8-2.5-22-2.5-30 0Z");
  c.fillStyle = "#2E946B";
  c.fill(cap);
  c.stroke(cap);
  c.fillStyle = "#3A3A3A";
  c.beginPath();
  c.arc(24.5, 37, 2.2, 0, Math.PI * 2);
  c.arc(39.5, 37, 2.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(29, 42.5);
  c.bezierCurveTo(30.6, 44.1, 33.4, 44.1, 35, 42.5);
  c.lineCap = "round";
  c.stroke();
  c.fillStyle = "rgba(245,169,160,0.7)";
  c.beginPath();
  c.ellipse(19.5, 42, 3, 1.8, 0, 0, Math.PI * 2);
  c.ellipse(44.5, 42, 3, 1.8, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function drawTicket(c: CanvasRenderingContext2D, rec: RideRecord, todaySec: number, lang: Lang = "ko") {
  const T = (k: StringKey, v?: Record<string, string | number>) => tr(lang, k, v);
  const W = TICKET_W;
  const H = TICKET_H;
  const from = getStation(rec.fromId);
  const line = LINE_BY_ID[from.line];
  const to = getStation(rec.toId);
  c.clearRect(0, 0, W, H);

  // 본체 + 펀치 홈
  c.save();
  c.shadowColor = "rgba(60,40,20,0.18)";
  c.shadowBlur = 30;
  c.shadowOffsetY = 12;
  c.fillStyle = "#FBF8F2";
  rr(c, 30, 30, W - 60, H - 60, 28);
  c.fill();
  c.restore();
  c.globalCompositeOperation = "destination-out";
  for (const y of [H / 2]) {
    c.beginPath();
    c.arc(30, y, 22, 0, Math.PI * 2);
    c.arc(W - 30, y, 22, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = "source-over";
  // 상단 띠
  c.save();
  rr(c, 30, 30, W - 60, H - 60, 28);
  c.clip();
  c.fillStyle = line.color;
  c.fillRect(30, 30, W - 60, 74);
  c.restore();

  c.fillStyle = "#FFFFFF";
  c.font = "800 26px Pretendard, sans-serif";
  c.textBaseline = "middle";
  c.fillText("METRO", 72, 67);
  c.font = "600 18px Pretendard, sans-serif";
  c.globalAlpha = 0.85;
  c.fillText(`FOCUS TICKET · ${lang === "en" ? line.nameEn : line.nameKo}`, 172, 68);
  c.globalAlpha = 1;
  const d = new Date(rec.completedAt);
  const date = d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });
  c.textAlign = "right";
  c.font = "600 20px Pretendard, sans-serif";
  c.fillText(date, W - 72, 68);
  c.textAlign = "left";

  // 역명 — 영어 화면은 영문이 크게. 출발·도착이 일러스트 앞까지 들어가도록 글자 크기를 맞춘다
  const big = (st: typeof from) => (lang === "en" ? st.nameEn : st.nameKo);
  const small = (st: typeof from) => (lang === "en" ? st.nameKo : st.nameEn);
  let size = 72;
  const room = W - 430 - 72;
  for (; size > 34; size -= 2) {
    c.font = `800 ${size}px Pretendard, sans-serif`;
    const w = c.measureText(big(from)).width + c.measureText(big(to)).width;
    if (w + 100 <= room) break;
  }
  c.fillStyle = "#252525";
  c.font = `800 ${size}px Pretendard, sans-serif`;
  c.fillText(big(from), 72, 190);
  const fw = c.measureText(big(from)).width;
  c.fillStyle = line.color;
  c.font = "700 44px Pretendard, sans-serif";
  c.fillText("→", 72 + fw + 30, 192);
  c.fillStyle = "#252525";
  c.font = `800 ${size}px Pretendard, sans-serif`;
  c.fillText(big(to), 72 + fw + 100, 190);
  c.fillStyle = "#8A8A8A";
  c.font = "600 20px Pretendard, sans-serif";
  c.fillText(small(from), 74, 246);
  c.fillText(small(to), 72 + fw + 102, 246);

  // 일러스트: 철교 트러스와 강
  c.save();
  c.translate(W - 400, 140);
  c.strokeStyle = "#B9C9C0";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 100);
  c.lineTo(320, 100);
  c.stroke();
  c.strokeStyle = line.color;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(0, 70);
  c.lineTo(320, 70);
  for (let i = 0; i < 8; i++) {
    c.moveTo(i * 40, 70);
    c.lineTo(i * 40 + 20, 100);
    c.lineTo(i * 40 + 40, 70);
  }
  c.stroke();
  c.strokeStyle = "rgba(94,151,166,0.5)";
  c.lineWidth = 2.5;
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.moveTo(20 + k * 90, 122 + k * 6);
    c.lineTo(80 + k * 90, 122 + k * 6);
    c.stroke();
  }
  // 열차
  c.fillStyle = "#F4F2EC";
  c.strokeStyle = "#3A3A3A";
  c.lineWidth = 2.5;
  rr(c, 90, 38, 150, 30, 10);
  c.fill();
  c.stroke();
  c.fillStyle = line.color;
  c.fillRect(92, 56, 146, 6);
  c.fillStyle = "#9DBBD0";
  for (let k = 0; k < 4; k++) c.fillRect(104 + k * 32, 44, 20, 9);
  c.restore();

  // 구분선 (점선)
  c.strokeStyle = "rgba(37,37,37,0.18)";
  c.setLineDash([8, 10]);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(72, H / 2 + 0);
  c.lineTo(W - 72, H / 2 + 0);
  c.stroke();
  c.setLineDash([]);

  // 통계
  const mins = Math.max(1, Math.round(rec.focusSec / 60));
  const stats: Array<[string, string]> = [
    [T("ticket.focus"), rec.focusSec < 60 ? T("ticket.sec", { n: rec.focusSec }) : T("common.min", { n: mins })],
    [T("ticket.stops"), T("ticket.stopsVal", { n: rec.stationCount })],
    [T("ticket.distance"), rec.distanceKm ? `${rec.distanceKm.toFixed(1)}km` : "—"],
    [T("ticket.today"), todaySec > 0 ? T("common.min", { n: Math.round(todaySec / 60) }) : "—"],
  ];
  stats.forEach(([k, v], i) => {
    const x = 72 + i * 175;
    c.fillStyle = "#8A8A8A";
    c.font = "600 20px Pretendard, sans-serif";
    c.fillText(k, x, H / 2 + 62);
    c.fillStyle = "#252525";
    c.font = "800 42px Pretendard, sans-serif";
    c.fillText(v, x, H / 2 + 118);
  });
  if (rec.task) {
    c.fillStyle = "#6B6B6B";
    c.font = "600 20px Pretendard, sans-serif";
    const t = rec.task.length > 26 ? rec.task.slice(0, 26) + "…" : rec.task;
    if (rec.taskDone) {
      c.fillStyle = line.color;
      c.font = "800 20px Pretendard, sans-serif";
      const done = T("ticket.done");
      c.fillText(done, 72, H - 78);
      const dw = c.measureText(done).width;
      c.fillStyle = "#6B6B6B";
      c.font = "600 20px Pretendard, sans-serif";
      c.fillText(`“${t}”`, 72 + dw + 12, H - 78);
    } else c.fillText(`“${t}”`, 72, H - 78);
  }

  // 스탬프
  c.save();
  c.translate(W - 190, H / 2 + 100);
  c.rotate(-0.18);
  c.strokeStyle = rec.partial ? "rgba(150,150,150,0.75)" : "rgba(214,120,60,0.8)";
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, 92, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 80, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = c.strokeStyle;
  c.font = "800 19px Pretendard, sans-serif";
  c.textAlign = "center";
  c.fillText(rec.partial ? "PAUSED HERE" : "GOOD FOCUS", 0, -50);
  c.fillText(rec.mode === "demo" ? "TRIAL RIDE" : "GOOD DAY", 0, 58);
  drawMascot(c, -36, -34, 72);
  c.restore();
}

export async function ticketBlob(rec: RideRecord, todaySec: number, lang: Lang = "ko"): Promise<Blob | null> {
  const cv = document.createElement("canvas");
  cv.width = TICKET_W;
  cv.height = TICKET_H;
  drawTicket(cv.getContext("2d")!, rec, todaySec, lang);
  return new Promise((res) => cv.toBlob(res, "image/png"));
}
