/**
 * 창밖 장면 — 4호선 동작대교 · 7호선 청담대교
 *
 * 동작대교(이촌 ↔ 동작): 동호대교처럼 도로 한가운데로 지하철이 달린다 (옆 차로·중앙분리 난간은 dongho.ts 재사용)
 * - 남행: 동쪽 창 → 반포대교와 아래층 잠수교, 세빛섬, 뒤쪽 북안에 남산
 * - 북행: 서쪽 창 → 한강대교 아치와 노들섬, 앞쪽에 여의도 63빌딩
 * 청담대교(자양 ↔ 청담): 2층 교량의 아래층 — 머리 위로 도로 상판이 덮여 있다
 * - 남행: 동쪽 창 → 롯데월드타워 (water.ts) / 북행: 서쪽 창 → 영동대교 (거더교, dongho.ts 의 이웃 다리 재사용)
 */
import type { Section } from "../../sim/journey";
import { mix, rrect, shadeColor } from "../sprites";
import { drawNamsan } from "./dongho";
import { SPEED, HZ, WATER_Y, type Frame, sx, visRange, sectionAtM, type Span } from "./core";

const westward = (sec: Section) => sec.view === "W" || sec.view === "NW" || sec.view === "SW";

/** 원경: 북행이면 63빌딩(앞쪽 = 화면 오른쪽), 남행이면 남산(뒤쪽 = 화면 왼쪽) */
export function drawDongjakFar(f: Frame, river: Section) {
  if (!westward(river)) {
    drawNamsan(f, sx(f, river.x0 - 520, 0.05));
    return;
  }
  const { ctx, u, pal } = f;
  const x = sx(f, river.x1 + 520, 0.05);
  if (x < -20 * u || x > f.W + 20 * u) return;
  // 63빌딩 — 위로 갈수록 좁아지는 금빛 유리 탑
  const base = (HZ + 2.6) * u;
  const top = (HZ - 17) * u;
  const bw = 4.6 * u;
  const tw = 2.6 * u;
  const night = pal.night > 0.5;
  const glass = mix(night ? "#5a4a3a" : "#d9b45f", pal.haze, 0.25);
  const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  g.addColorStop(0, shadeColor(glass, 0.25));
  g.addColorStop(0.55, glass);
  g.addColorStop(1, shadeColor(glass, -0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, base);
  ctx.lineTo(x - tw / 2, top);
  ctx.lineTo(x + tw / 2, top - 0.8 * u);
  ctx.lineTo(x + bw / 2, base);
  ctx.closePath();
  ctx.fill();
  if (night) {
    ctx.fillStyle = "rgba(255,214,140,0.55)";
    for (let k = 0; k < 9; k++) ctx.fillRect(x - bw * 0.35 + k * 0.08 * u, base - (k + 1) * 1.9 * u, bw * 0.6 - k * 0.2 * u, Math.max(1, 0.18 * u));
  }
}

/** 중경 다리: 남행 → 반포대교(+잠수교)·세빛섬, 북행 → 한강대교 아치·노들섬 */
export function drawDongjakNeighbor(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.yanghwa;
  const m0 = river.x0 - 160;
  const m1 = river.x1 + 160;
  const xa = Math.max(-10, sx(f, m0, s));
  const xb = Math.min(f.W + 10, sx(f, m1, s));
  if (xb < 0 || xa > f.W) return;
  const night = pal.night > 0.5;
  const col = mix("#d6d8d4", pal.haze, 0.15);
  const colDark = shadeColor(col, night ? -0.55 : -0.3);
  const deckTop = 60 * u;
  if (!westward(river)) {
    // 세빛섬 — 남단 가까이 떠 있는 세 개의 섬 건물 (화면 오른쪽 끝 쪽)
    const isl = sx(f, river.x1 - 120, s);
    if (isl > -30 * u && isl < f.W + 30 * u) {
      const shell = [night ? "#f2c46a" : "#e9eef2", night ? "#7fd0e8" : "#d9e4ea", night ? "#f08ab0" : "#eef1f3"];
      [
        [0, 6, 4.2],
        [7.5, 4.6, 3.2],
        [13, 3.4, 2.4],
      ].forEach(([dx, w, h], k) => {
        ctx.fillStyle = mix(shell[k], pal.haze, 0.1);
        ctx.beginPath();
        ctx.ellipse(isl + dx * u, deckTop + 2.6 * u, w * u, h * u, 0, Math.PI, 0);
        ctx.fill();
      });
    }
    // 반포대교 상판 + 아래층 잠수교
    for (const [y, h] of [
      [deckTop, 1.8 * u],
      [deckTop + 4.2 * u, 1 * u],
    ] as const) {
      ctx.fillStyle = col;
      ctx.fillRect(xa, y, xb - xa, h);
      ctx.fillStyle = colDark;
      ctx.fillRect(xa, y + h * 0.7, xb - xa, h * 0.3);
    }
    for (let m = Math.ceil(m0 / 45) * 45; m <= m1; m += 45) {
      const x = sx(f, m, s);
      if (x < -20 || x > f.W + 20) continue;
      ctx.fillStyle = colDark;
      ctx.fillRect(x - 0.9 * u, deckTop + 1.8 * u, 1.8 * u, 7 * u);
    }
    // 밤: 달빛무지개분수 대신 은은한 다리 조명만 (번쩍임 없이 고정)
    if (night) {
      ctx.fillStyle = "rgba(255,226,170,0.5)";
      for (let m = Math.ceil(m0 / 15) * 15; m <= m1; m += 15) {
        const x = sx(f, m, s);
        if (x > -5 && x < f.W + 5) ctx.fillRect(x, deckTop - 0.5 * u, Math.max(1, 0.3 * u), 0.5 * u);
      }
    }
    return;
  }
  // 한강대교: 낮은 강철 아치가 이어진다
  ctx.fillStyle = col;
  ctx.fillRect(xa, deckTop, xb - xa, 1.6 * u);
  ctx.strokeStyle = mix("#c8cdd0", pal.haze, 0.2);
  ctx.lineWidth = Math.max(1, 0.45 * u);
  const span = 70;
  for (let m = Math.ceil(m0 / span) * span; m < m1; m += span) {
    const a = sx(f, m, s);
    const b = sx(f, m + span, s);
    if (b < -20 || a > f.W + 20) continue;
    ctx.beginPath();
    ctx.moveTo(a, deckTop);
    ctx.quadraticCurveTo((a + b) / 2, deckTop - 7 * u, b, deckTop);
    ctx.stroke();
    for (let k = 1; k < 6; k++) {
      const x = a + ((b - a) * k) / 6;
      const t = k / 6;
      const y = deckTop - 7 * u * 4 * t * (1 - t) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, deckTop);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.fillStyle = colDark;
    ctx.fillRect(a - 0.9 * u, deckTop + 1.6 * u, 1.8 * u, 6.5 * u);
  }
  // 노들섬 — 다리 가운데 아래 초록 섬
  const nx = sx(f, (river.x0 + river.x1) / 2, s);
  if (nx > -40 * u && nx < f.W + 40 * u) {
    ctx.fillStyle = mix(pal.grassDark, pal.haze, 0.2);
    ctx.beginPath();
    ctx.ellipse(nx, deckTop + 7.4 * u, 24 * u, 1.8 * u, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = mix(pal.tree[0], pal.haze, 0.2);
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath();
      ctx.arc(nx + k * 4.6 * u, deckTop + 5.8 * u, 1.3 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  void time;
}

/** 이 둔치·강 구간이 청담대교 아래층인지 */
export function onCheongdam(f: Frame, sec: Section): boolean {
  if (sec.kind === "river") return sec.variant === "hangang-cheongdam";
  if (sec.kind !== "bank") return false;
  const a = sectionAtM(f, sec.x0 - 1);
  const b = sectionAtM(f, sec.x1 + 1);
  return (a.kind === "river" && a.variant === "hangang-cheongdam") || (b.kind === "river" && b.variant === "hangang-cheongdam");
}

/** 청담대교 아래층: 머리 위 도로 상판과 가로보, 옆면 수직재 */
export function drawUpperDeck(f: Frame, sp: Span) {
  const { ctx, u, pal } = f;
  const s = SPEED.track;
  const night = pal.night > 0.5;
  const slab = night ? "#2b2c33" : mix(pal.concrete, "#3d4045", 0.45);
  const bottom = 15 * u;
  const g = ctx.createLinearGradient(0, 0, 0, bottom);
  g.addColorStop(0, shadeColor(slab, -0.2));
  g.addColorStop(1, slab);
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, 0, sp.xb - sp.xa, bottom);
  // 상판 아래 그늘
  const sh = ctx.createLinearGradient(0, bottom, 0, bottom + 14 * u);
  sh.addColorStop(0, "rgba(20,22,28,0.35)");
  sh.addColorStop(1, "rgba(20,22,28,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(sp.xa, bottom, sp.xb - sp.xa, 14 * u);
  const [m0, m1] = visRange(f, s, 60);
  const step = 8;
  for (let m = Math.floor(m0 / step) * step; m <= m1; m += step) {
    const x = sx(f, m, s);
    if (x < sp.xa - 40 || x > sp.xb + 40) continue;
    // 가로보
    ctx.fillStyle = shadeColor(slab, -0.25);
    ctx.fillRect(x - 0.9 * u, 0, 1.8 * u, bottom + 1.6 * u);
    // 옆면 수직재 (16m 마다)
    if (Math.round(m / step) % 2 === 0) {
      ctx.fillStyle = pal.steelDark;
      rrect(ctx, x - 0.8 * u, bottom, 1.6 * u, 80 * u - bottom, 0.3 * u);
      ctx.fill();
    }
    // 밤: 상판 아래 조명
    if (night && Math.round(m / step) % 2 === 1) {
      ctx.fillStyle = "rgba(255,236,190,0.85)";
      ctx.fillRect(x - 1.4 * u, bottom - 0.6 * u, 2.8 * u, 0.6 * u);
    }
  }
  void WATER_Y;
}
