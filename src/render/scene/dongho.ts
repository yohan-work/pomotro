/**
 * 창밖 장면 — 3호선 동호대교 (옥수 ↔ 압구정)
 *
 * 동호대교는 도로 한가운데로 지하철이 달리는 복합 교량이다.
 * - 남행(옥수 → 압구정): 진행 방향 왼쪽 = 동쪽 창 → 성수대교(트러스)·응봉산
 * - 북행(압구정 → 옥수): 서쪽 창 → 한남대교·남산과 N서울타워
 * - 승객 쪽 바로 옆 차로는 반대 방향 차로라 차들이 마주 스쳐 지나간다.
 */
import type { Section } from "../../sim/journey";
import { hash2, rng } from "../rng";
import { mix, rrect, shadeColor } from "../sprites";
import { SPEED, HZ, type Frame, sx, visRange, sectionAtM, type Span } from "./core";

const westward = (f: Frame, sec: Section) => sec.view === "W" || sec.view === "NW" || sec.view === "SW";

/** 원경 랜드마크: 북행이면 남산·N서울타워(앞쪽), 남행이면 응봉산(뒤쪽 북안) */
export function drawDonghoFar(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = 0.05;
  if (westward(f, river)) {
    // 남산 — 진행 방향(북) 왼쪽 앞 = 화면 오른쪽
    const x = sx(f, river.x1 + 420, s);
    if (x < -40 * u || x > f.W + 40 * u) return;
    const base = (HZ + 2.6) * u;
    const hill = mix(pal.mountainNear, pal.haze, 0.25);
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.moveTo(x - 30 * u, base);
    ctx.bezierCurveTo(x - 18 * u, base - 4 * u, x - 9 * u, base - 13 * u, x, base - 14 * u);
    ctx.bezierCurveTo(x + 9 * u, base - 13 * u, x + 20 * u, base - 5 * u, x + 32 * u, base);
    ctx.closePath();
    ctx.fill();
    // N서울타워
    const tb = base - 13.6 * u;
    const tower = mix(pal.key === "night" ? "#4a5578" : "#e8ecef", pal.haze, 0.2);
    ctx.fillStyle = tower;
    ctx.fillRect(x - 0.45 * u, tb - 13 * u, 0.9 * u, 13 * u);
    ctx.beginPath();
    ctx.moveTo(x - 1.2 * u, tb);
    ctx.lineTo(x - 0.45 * u, tb - 4 * u);
    ctx.lineTo(x + 0.45 * u, tb - 4 * u);
    ctx.lineTo(x + 1.2 * u, tb);
    ctx.fill();
    rrect(ctx, x - 1.6 * u, tb - 12 * u, 3.2 * u, 2.2 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = shadeColor(tower, -0.15);
    ctx.fillRect(x - 0.15 * u, tb - 19 * u, 0.3 * u, 7 * u);
    if (pal.night > 0.3) {
      ctx.fillStyle = pal.lamp;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 1.3);
      ctx.fillRect(x - 1.6 * u, tb - 11.2 * u, 3.2 * u, 0.5 * u);
      ctx.globalAlpha = 1;
    }
    return;
  }
  // 응봉산 — 북안(뒤쪽) = 화면 왼쪽. 바위 언덕과 정자
  const x = sx(f, river.x0 - 160, 0.09);
  if (x < -40 * u || x > f.W + 40 * u) return;
  const base = (HZ + 2.8) * u;
  ctx.fillStyle = mix(pal.mountainNear, pal.grassDark, 0.35);
  ctx.beginPath();
  ctx.moveTo(x - 22 * u, base);
  ctx.quadraticCurveTo(x - 6 * u, base - 15 * u, x + 4 * u, base - 13 * u);
  ctx.quadraticCurveTo(x + 14 * u, base - 8 * u, x + 24 * u, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix(pal.concrete, pal.haze, 0.3);
  ctx.fillRect(x - 4 * u, base - 9 * u, 3 * u, 4 * u); // 바위면
  // 정자
  ctx.fillStyle = mix("#8a5a44", pal.haze, 0.25);
  ctx.beginPath();
  ctx.moveTo(x - 2.4 * u, base - 13.2 * u);
  ctx.quadraticCurveTo(x, base - 15.4 * u, x + 2.4 * u, base - 13.2 * u);
  ctx.fill();
  ctx.fillRect(x - 1.6 * u, base - 13.2 * u, 0.3 * u, 1.4 * u);
  ctx.fillRect(x + 1.3 * u, base - 13.2 * u, 0.3 * u, 1.4 * u);
  // 봄이면 개나리 (응봉산 명물)
  if (f.season === "spring") {
    const r = rng(77);
    ctx.fillStyle = "#f2d14b";
    for (let k = 0; k < 40; k++) {
      ctx.beginPath();
      ctx.arc(x - 18 * u + r() * 36 * u, base - r() * 9 * u, 0.6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 중경 다리: 남행 → 성수대교(상부 트러스), 북행 → 한남대교(거더교) */
export function drawDonghoNeighbor(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.yanghwa;
  const m0 = river.x0 - 140;
  const m1 = river.x1 + 140;
  const xa = sx(f, m0, s);
  const xb = sx(f, m1, s);
  if (xb < -10 || xa > f.W + 10) return;
  const truss = !westward(f, river);
  const deckTop = 60.5 * u;
  const deckH = 2 * u;
  const pierBottom = 68 * u;
  const col = truss ? mix("#8fa6b4", pal.haze, 0.15) : mix("#d2d6d4", pal.haze, 0.15);
  const colDark = shadeColor(col, pal.night > 0.5 ? -0.55 : -0.3);
  const span = truss ? 60 : 50;
  for (let m = Math.ceil(m0 / span) * span; m <= m1; m += span) {
    const x = sx(f, m, s);
    if (x < -40 || x > f.W + 40) continue;
    ctx.fillStyle = colDark;
    rrect(ctx, x - 1.2 * u, deckTop + deckH, 2.4 * u, pierBottom - deckTop - deckH, 0.4 * u);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.globalAlpha = 0.22 - k * 0.04;
      ctx.fillRect(x - 1.2 * u + Math.sin(time * 2.2 + k * 1.3 + m) * 0.35 * u, pierBottom + k * 1.1 * u, 2.4 * u, 0.8 * u);
    }
    ctx.globalAlpha = 1;
  }
  if (truss) {
    // 성수대교: 상판 위 와렌 트러스
    const th = 4.2 * u;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 0.4 * u);
    const panel = 15;
    ctx.beginPath();
    for (let m = Math.ceil(m0 / panel) * panel; m <= m1; m += panel) {
      const x = sx(f, m, s);
      const x2 = sx(f, m + panel, s);
      if (x2 < -20 || x > f.W + 20) continue;
      const i = Math.round(m / panel);
      ctx.moveTo(x, i % 2 ? deckTop : deckTop - th);
      ctx.lineTo(x2, i % 2 ? deckTop - th : deckTop);
    }
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillRect(Math.max(-10, xa), deckTop - th - 0.4 * u, Math.min(f.W + 10, xb) - Math.max(-10, xa), 0.7 * u);
  }
  ctx.fillStyle = col;
  ctx.fillRect(Math.max(-10, xa), deckTop, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH);
  ctx.fillStyle = colDark;
  ctx.fillRect(Math.max(-10, xa), deckTop + deckH * 0.7, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH * 0.3);
  // 차량
  const len = m1 - m0;
  const carColors = ["#F4F1EA", "#E36D5B", "#4F6E9C", "#F2C14E", "#3D3F48", "#9FC3D8"];
  for (let k = 0; k < 24; k++) {
    const dir = k % 2 ? 1 : -1;
    let m = (k * 43.1 + dir * (f.reducedMotion ? 0 : time) * (12 + (k % 5))) % len;
    if (m < 0) m += len;
    const x = sx(f, m0 + m, s);
    if (x < -10 || x > f.W + 10) continue;
    const cw = (k % 6 === 0 ? 3.4 : 1.9) * u;
    ctx.fillStyle = carColors[k % carColors.length];
    rrect(ctx, x, deckTop - 1.2 * u, cw, 1.2 * u, 0.45 * u);
    ctx.fill();
    if (pal.night > 0.3) {
      ctx.fillStyle = dir > 0 ? "#FFF2C0" : "#FF6B5A";
      ctx.fillRect(dir > 0 ? x + cw - 1 : x, deckTop - 0.8 * u, 1.5, 0.35 * u);
    }
  }
}

/** 이 둔치·강 구간이 동호대교 위인지 (둔치는 옆 강 구간으로 판단) */
export function onDongho(f: Frame, sec: Section): boolean {
  if (sec.kind === "river") return sec.variant === "hangang-dongho";
  if (sec.kind !== "bank") return false;
  const a = sectionAtM(f, sec.x0 - 1);
  const b = sectionAtM(f, sec.x1 + 1);
  return (a.kind === "river" && a.variant === "hangang-dongho") || (b.kind === "river" && b.variant === "hangang-dongho");
}

/**
 * 선로 바로 옆 차로: 낮은 중앙분리 난간 너머로 반대 방향 차들이 스친다.
 * 차의 위치는 자기 속도로만 움직이므로(열차 위치와 무관) 열차 가감속에도 자연스럽다.
 */
export function drawDonghoDeck(f: Frame, sp: Span) {
  const { ctx, u, pal, H, time } = f;
  const s = SPEED.track;
  const top = 79 * u;
  // 차로 노면 (창 아래쪽)
  ctx.fillStyle = mix(pal.road, "#000000", 0.1);
  ctx.fillRect(sp.xa, 92 * u, sp.xb - sp.xa, H - 92 * u);
  const [m0, m1] = visRange(f, s, 60);
  // 반대 방향 차량
  const carColors = ["#F4F1EA", "#E36D5B", "#4F6E9C", "#F2C14E", "#3D3F48", "#9FC3D8", "#2E5E4E"];
  const gap = 13;
  const drift = f.reducedMotion ? 0 : time * 16;
  const i0 = Math.floor((m0 + drift) / gap) - 2;
  const i1 = Math.ceil((m1 + drift) / gap) + 1;
  for (let i = i0; i <= i1; i++) {
    const h = hash2(i, 4040);
    if ((h & 7) < 2) continue;
    const bus = ((h >> 8) & 7) === 0;
    const len = bus ? 11 : 4.6; // 실제 길이(m)
    const m = i * gap + ((h >> 4) & 7) * 0.5 - drift;
    const x = sx(f, m, s);
    const cw = len * s * u;
    const chh = (bus ? 12.5 : 6.5) * u;
    const bottom = 93.5 * u;
    if (x + cw < sp.xa || x > sp.xb) continue;
    const c = bus ? (((h >> 12) & 1) ? "#3f8f5a" : "#3b6fb0") : carColors[(h >> 12) % carColors.length];
    const body = pal.night > 0.5 ? shadeColor(c, -0.55) : c;
    ctx.fillStyle = body;
    rrect(ctx, x, bottom - chh, cw, chh, (bus ? 1.2 : 2.2) * u);
    ctx.fill();
    // 창
    ctx.fillStyle = pal.night > 0.5 ? "rgba(255,230,180,0.45)" : "rgba(40,55,75,0.55)";
    if (bus) {
      for (let k = 0; k < 6; k++) ctx.fillRect(x + cw * (0.06 + k * 0.155), bottom - chh + 2 * u, cw * 0.12, 3.6 * u);
    } else {
      rrect(ctx, x + cw * 0.2, bottom - chh + 1 * u, cw * 0.58, 2.6 * u, 0.9 * u);
      ctx.fill();
    }
    // 마주 오는 차: 앞이 화면 왼쪽 → 밤엔 전조등
    if (pal.night > 0.3) {
      const g = ctx.createRadialGradient(x, bottom - 2 * u, 0, x, bottom - 2 * u, 7 * u);
      g.addColorStop(0, "rgba(255,245,210,0.8)");
      g.addColorStop(1, "rgba(255,245,210,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 7 * u, bottom - 9 * u, 8 * u, 14 * u);
    }
  }
  // 중앙분리 난간
  ctx.fillStyle = pal.concrete;
  ctx.fillRect(sp.xa, 92 * u, sp.xb - sp.xa, H - 92 * u);
  ctx.fillStyle = shadeColor(pal.concrete, 0.2);
  ctx.fillRect(sp.xa, 92 * u, sp.xb - sp.xa, 0.6 * u);
  const step = 3;
  for (let m = Math.floor(m0 / step) * step; m <= m1; m += step) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillStyle = pal.steelDark;
    ctx.fillRect(x - 0.3 * u, top, 0.6 * u, 92 * u - top);
  }
  ctx.fillStyle = pal.steel;
  ctx.fillRect(sp.xa, top - 0.6 * u, sp.xb - sp.xa, 0.8 * u);
}
