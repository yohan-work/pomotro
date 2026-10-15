/** 창밖 장면 — 터널 교행 열차 */
import { LINE_BY_ID } from "../../data/lines";
import { type Journey } from "../../sim/journey";
import { hash2, rng } from "../rng";
import { rrect } from "../sprites";
import { type Frame, sx, visRange } from "./core";
import { drawTtorong, ttorongAt } from "./surprise";

/* ═════════════════════════════ 교행 열차 (터널) ═════════════════════════════ */

/**
 * 2호선은 우측통행이라 반대 방향 열차는 승객이 보는 왼쪽 창 쪽 선로로 지나간다.
 * 두 열차가 마주 달리므로 같은 깊이의 정지 물체보다 REL 배 빠르게 흐르는 "상대 좌표"에 배치한다.
 * 위치는 열차 위치(cam)만의 함수 → 같은 지점에서는 항상 같은 교행 장면.
 */
export const PASSING = { depth: 4.8, rel: 2, len: 140, car: 14 } as const;
export const passingCache = new WeakMap<Journey, number[]>();

/** 교행 열차 머리 위치(상대 좌표) 목록 */
export function passingTrains(j: Journey): number[] {
  const hit = passingCache.get(j);
  if (hit) return hit;
  const out: number[] = [];
  const lastStop = j.stopX[j.stopX.length - 1];
  for (const sec of j.sections) {
    // 출발 전·도착 후 배경 터널은 지나가지 않으므로 제외
    if (sec.kind !== "tunnel" || sec.x1 - sec.x0 < 360 || sec.x0 < 0 || sec.x1 > lastStop) continue;
    for (let a = sec.x0 + 170; a + PASSING.len + 80 < sec.x1; a += 700) {
      if ((hash2(Math.round(a), 2024) & 1023) / 1023 < 0.75) out.push(a);
    }
  }
  passingCache.set(j, out);
  return out;
}

/** 0..1 교행 열차가 창 앞에 얼마나 가까운지 (사운드용) */
export function passingIntensity(j: Journey, cam: number): number {
  let best = 0;
  for (const a of passingTrains(j)) {
    const d = cam < a ? a - cam : cam > a + PASSING.len ? cam - a - PASSING.len : 0;
    best = Math.max(best, 1 - Math.min(1, d / 12));
  }
  return best;
}

export function drawPassingTrain(f: Frame) {
  const { ctx, u, H } = f;
  const S = PASSING.depth * PASSING.rel;
  const [m0, m1] = visRange(f, S, 40);
  for (const a of passingTrains(f.journey)) {
    if (a > m1 || a + PASSING.len < m0) continue;
    const car = PASSING.car;
    const ttorong = ttorongAt(f, a);
    const top = 5 * u;
    const bottom = 97 * u;
    for (let c = 0; c < PASSING.len / car; c++) {
      const ca = a + c * car;
      const xa = sx(f, ca, S);
      const xb = sx(f, ca + car - 0.35, S);
      if (xb < -10 || xa > f.W + 10) continue;
      const r = rng(hash2(Math.round(ca), 77));
      // 차체 (터널 조명에 비친 스테인리스)
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, "#8E9497");
      g.addColorStop(0.35, "#B9BFC1");
      g.addColorStop(1, "#6E7477");
      ctx.fillStyle = g;
      ctx.fillRect(xa, top, xb - xa, bottom - top);
      // 노선 색 띠
      ctx.fillStyle = LINE_BY_ID[f.journey.stations[0].line].color;
      ctx.fillRect(xa, 66 * u, xb - xa, 3.2 * u);
      // 창문과 출입문
      const unit = (xb - xa) / car;
      for (let k = 0; k < 4; k++) {
        const dx = xa + (0.7 + k * 3.45) * unit;
        ctx.fillStyle = "#7E8689";
        ctx.fillRect(dx, 16 * u, 0.95 * unit, 72 * u);
        ctx.fillStyle = "rgba(255,231,190,0.7)";
        ctx.fillRect(dx + 0.12 * unit, 22 * u, 0.32 * unit, 24 * u);
        ctx.fillRect(dx + 0.51 * unit, 22 * u, 0.32 * unit, 24 * u);
        if (k < 3) {
          const wx = dx + 1.17 * unit;
          ctx.fillStyle = "rgba(255,228,182,0.78)";
          rrect(ctx, wx, 20 * u, 2.1 * unit, 30 * u, 1.2 * u);
          ctx.fill();
          // 승객 실루엣 — 아주 드물게 셋째 칸 가운데 창에 또롱이 타고 있다
          if (ttorong && c === 2 && k === 1) {
            drawTtorong(ctx, wx + 1.05 * unit, 37 * u, 20 * u);
            r();
          } else if (r() < 0.7) {
            ctx.fillStyle = "rgba(70,60,60,0.45)";
            const px = wx + (0.2 + r() * 0.6) * 2.1 * unit;
            ctx.beginPath();
            ctx.arc(px, 34 * u, 3 * u, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(px - 4 * u, 38 * u, 8 * u, 12 * u);
          }
        }
      }
      // 차량 연결부
      ctx.fillStyle = "#1D1E1F";
      ctx.fillRect(xb, top, Math.max(2, sx(f, ca + car, S) - xb), bottom - top);
    }
    // 빠르게 스치는 느낌: 가장자리 어둡게
    const xh = sx(f, a, S);
    const xt = sx(f, a + PASSING.len, S);
    for (const [x, dir] of [
      [xh, -1],
      [xt, 1],
    ] as const) {
      if (x < -40 || x > f.W + 40) continue;
      const gg = ctx.createLinearGradient(x, 0, x + dir * 30 * u, 0);
      gg.addColorStop(0, "rgba(10,10,10,0.6)");
      gg.addColorStop(1, "rgba(10,10,10,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(Math.min(x, x + dir * 30 * u), 0, 30 * u, H);
    }
  }
}
