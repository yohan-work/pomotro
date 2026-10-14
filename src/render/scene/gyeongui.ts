/**
 * 창밖 장면 — 경의중앙선 강변
 *
 * 한강 북안(용산~응봉)을 서쪽으로 달리면 남향 창 너머로 강과 강남 스카이라인, 강을 가로지르는 다리들이 보인다.
 * 강을 가로지르는 다리는 선로와 직각이라, 가까운 끝(근경)과 먼 끝(건너편)이 서로 다른 속도로 흐른다
 * → 각 깊이의 시차 계수로 양 끝을 계산해 다리가 원근에 따라 비스듬히 돌아가는 효과를 낸다.
 */
import type { Section } from "../../sim/journey";
import { hash2 } from "../rng";
import { mix, shadeColor } from "../sprites";
import { SPEED, HZ, WATER_Y, type Frame, sx, riverSideView } from "./core";

/** 강변 구간 하나에 다리 하나 (위치는 연출값 — 실제 다리 위치 측량값 아님) */
export function drawCrossingBridges(f: Frame, sec: Section) {
  if (sec.kind !== "riverside" || sec.variant !== "hangang-north" || !riverSideView(sec)) return;
  const { ctx, u, pal, time } = f;
  const m = sec.x0 + (sec.x1 - sec.x0) * (0.35 + ((hash2(Math.round(sec.x0), 71) & 255) / 255) * 0.3);
  const near = { x: sx(f, m, SPEED.near * 0.75), y: 76 * u, w: 16 * u };
  const far = { x: sx(f, m, SPEED.skyline * 1.6), y: (WATER_Y - 0.2) * u, w: 3 * u };
  if (Math.max(near.x, far.x) < -40 * u || Math.min(near.x, far.x) > f.W + 40 * u) return;
  // 너무 비스듬하면(다리가 화면 밖으로 거의 누운 상태) 그리지 않는다
  if (Math.abs(near.x - far.x) > f.W * 0.6) return;
  const deck = mix("#d3d6d4", pal.haze, 0.2);
  const dark = shadeColor(deck, pal.night > 0.5 ? -0.55 : -0.3);
  // 교각 (원근에 따라 작아진다)
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    const e = t * t;
    const x = near.x + (far.x - near.x) * e;
    const y = near.y + (far.y - near.y) * e;
    const w = near.w + (far.w - near.w) * e;
    const ph = (1 - e) * 7 * u + 0.6 * u;
    ctx.fillStyle = dark;
    ctx.fillRect(x - w * 0.12, y, w * 0.24, ph);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(x - w * 0.12, y + ph, w * 0.24, ph * 0.6);
    ctx.globalAlpha = 1;
  }
  // 상판 (가까울수록 넓다)
  ctx.fillStyle = deck;
  ctx.beginPath();
  ctx.moveTo(near.x - near.w / 2, near.y);
  ctx.lineTo(far.x - far.w / 2, far.y);
  ctx.lineTo(far.x + far.w / 2, far.y);
  ctx.lineTo(near.x + near.w / 2, near.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(near.x - near.w / 2, near.y);
  ctx.lineTo(far.x - far.w / 2, far.y);
  ctx.lineTo(far.x - far.w / 2, far.y + 0.3 * u);
  ctx.lineTo(near.x - near.w / 2, near.y + 1.8 * u);
  ctx.closePath();
  ctx.fill();
  // 차량 불빛·점
  for (let k = 0; k < 10; k++) {
    let t = ((k / 10 + (f.reducedMotion ? 0 : time * (0.04 + (k % 3) * 0.01))) % 1);
    if (k % 2) t = 1 - t;
    const e = t * t;
    const x = near.x + (far.x - near.x) * e;
    const y = near.y + (far.y - near.y) * e;
    const sz = (1 - e) * 1.6 * u + 0.2 * u;
    ctx.fillStyle = pal.night > 0.3 ? (k % 2 ? "#FFF2C0" : "#FF6B5A") : ["#F4F1EA", "#E36D5B", "#4F6E9C", "#3D3F48"][k % 4];
    ctx.fillRect(x - sz, y - sz * 0.6, sz * 2, sz * 0.8);
  }
  void HZ;
}
