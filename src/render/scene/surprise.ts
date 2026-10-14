/** 창밖 장면 — 깜짝 이벤트: 열기구, 한강 오리배, 승강장 고양이, 한강 괴물(희귀), 교행 열차의 또롱(희귀) */
import { type RideEvent, type RideEventKind } from "../../sim/rideEvents";
import { mix, rrect } from "../sprites";
import { SPEED, WATER_Y, type Frame, sx } from "./core";

const eventsOf = (f: Frame, kind: RideEventKind) => f.events.filter((e) => e.kind === kind && e.m !== undefined);

/* ─────────────── 열기구 (하늘, 아주 느린 시차 + 바람에 천천히 떠간다) ─────────────── */

export function drawBalloons(f: Frame) {
  const { ctx, u, pal, time } = f;
  for (const e of eventsOf(f, "balloon")) {
    const drift = f.reducedMotion ? 0 : Math.sin(time * 0.02 + e.r * 6) * 20 * u;
    const x = sx(f, e.m!, 0.02) + (e.r - 0.5) * 30 * u + drift;
    const y = (13 + e.r * 8) * u + (f.reducedMotion ? 0 : Math.sin(time * 0.4) * 0.6 * u);
    const w = 6.2 * u;
    if (x < -w * 2 || x > f.W + w * 2) continue;
    const night = pal.night > 0.5;
    const colors = [
      ["#E8644E", "#F4C24F"],
      ["#3E9B7B", "#F2EBDD"],
      ["#5B7FC7", "#F4C24F"],
    ][Math.floor(e.r * 3) % 3];
    ctx.save();
    ctx.globalAlpha = 0.95;
    // 풍선: 위는 둥글고 아래로 좁아지는 모양, 세로 줄무늬
    const top = y - w * 1.1;
    const neck = y + w * 0.95;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.32, neck);
      ctx.bezierCurveTo(x - w * 1.15, y + w * 0.1, x - w * 1.05, top, x, top);
      ctx.bezierCurveTo(x + w * 1.05, top, x + w * 1.15, y + w * 0.1, x + w * 0.32, neck);
      ctx.closePath();
    };
    shape();
    ctx.fillStyle = night ? mix(colors[0], "#1B1E33", 0.55) : colors[0];
    ctx.fill();
    ctx.save();
    shape();
    ctx.clip();
    ctx.fillStyle = night ? mix(colors[1], "#1B1E33", 0.55) : colors[1];
    for (let k = -2; k <= 2; k += 2) {
      ctx.beginPath();
      ctx.ellipse(x + k * w * 0.36, y - w * 0.05, w * 0.16, w * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 밤: 버너 불빛이 풍선 아래쪽을 밝힌다
    if (night) {
      const g = ctx.createRadialGradient(x, neck, 0, x, neck, w * 1.3);
      g.addColorStop(0, "rgba(255,190,110,0.75)");
      g.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - w * 1.3, y - w, w * 2.6, w * 2.2);
    }
    ctx.restore();
    // 줄과 바구니
    ctx.strokeStyle = night ? "rgba(200,190,170,0.6)" : "rgba(90,70,50,0.7)";
    ctx.lineWidth = Math.max(1, 0.12 * u);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.3, neck);
    ctx.lineTo(x - w * 0.2, neck + w * 0.45);
    ctx.moveTo(x + w * 0.3, neck);
    ctx.lineTo(x + w * 0.2, neck + w * 0.45);
    ctx.stroke();
    ctx.fillStyle = night ? "#5A4636" : "#9A6B43";
    rrect(ctx, x - w * 0.24, neck + w * 0.42, w * 0.48, w * 0.32, 0.2 * u);
    ctx.fill();
    ctx.restore();
  }
}

/* ─────────────── 한강 오리배 (수면, 섬 근처 깊이) ─────────────── */

export function drawDuckboats(f: Frame) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.mid;
  for (const e of eventsOf(f, "duckboat")) {
    for (let k = 0; k < 3; k++) {
      const m = e.m! + (k - 1) * 14 + e.r * 6;
      const bob = f.reducedMotion ? 0 : Math.sin(time * 1.3 + k * 1.7) * 0.18 * u;
      const x = sx(f, m, s) + (f.reducedMotion ? 0 : Math.sin(time * 0.1 + k) * 2 * u);
      const y = (WATER_Y + 14 + k * 2.2) * u + bob;
      const w = (7 + k * 0.7) * u;
      if (x < -w * 2 || x > f.W + w * 2) continue;
      const dark = pal.night > 0.5;
      // 물결
      ctx.fillStyle = pal.waterGlint;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x - w * 0.7, y + 0.1 * u, w * 1.5, Math.max(1, 0.18 * u));
      ctx.globalAlpha = 1;
      // 몸통
      ctx.fillStyle = dark ? "#CFCBE0" : "#FFFDF6";
      ctx.beginPath();
      ctx.moveTo(x - w * 0.7, y - w * 0.15);
      ctx.quadraticCurveTo(x - w * 0.75, y + w * 0.05, x - w * 0.55, y + w * 0.05);
      ctx.lineTo(x + w * 0.45, y + w * 0.05);
      ctx.quadraticCurveTo(x + w * 0.6, y - w * 0.05, x + w * 0.4, y - w * 0.3);
      ctx.lineTo(x - w * 0.5, y - w * 0.3);
      ctx.closePath();
      ctx.fill();
      // 지붕 (색이 다른 차양)
      ctx.fillStyle = ["#F2A65A", "#6CB7D9", "#F07C8C"][k];
      rrect(ctx, x - w * 0.5, y - w * 0.62, w * 0.7, w * 0.14, 0.2 * u);
      ctx.fill();
      ctx.fillStyle = dark ? "#9C98B0" : "#D9D2C2";
      ctx.fillRect(x - w * 0.46, y - w * 0.5, Math.max(1, w * 0.05), w * 0.22);
      ctx.fillRect(x + w * 0.12, y - w * 0.5, Math.max(1, w * 0.05), w * 0.22);
      // 목과 머리 (진행 방향 앞쪽)
      ctx.fillStyle = dark ? "#CFCBE0" : "#FFFDF6";
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y - w * 0.25);
      ctx.quadraticCurveTo(x + w * 0.62, y - w * 0.55, x + w * 0.5, y - w * 0.85);
      ctx.lineTo(x + w * 0.38, y - w * 0.8);
      ctx.quadraticCurveTo(x + w * 0.45, y - w * 0.5, x + w * 0.2, y - w * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.46, y - w * 0.88, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F2B33D";
      ctx.beginPath();
      ctx.moveTo(x + w * 0.57, y - w * 0.92);
      ctx.lineTo(x + w * 0.74, y - w * 0.86);
      ctx.lineTo(x + w * 0.57, y - w * 0.82);
      ctx.fill();
      ctx.fillStyle = "#2C2A28";
      ctx.fillRect(x + w * 0.47, y - w * 0.93, Math.max(1, w * 0.05), Math.max(1, w * 0.05));
    }
  }
}

/* ─────────────── 한강 괴물 그림자 (희귀) ─────────────── */

export function drawMonster(f: Frame) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.mid * 0.8;
  for (const e of eventsOf(f, "monster")) {
    const x = sx(f, e.m!, s);
    const y = (WATER_Y + 12) * u;
    const w = 46 * u;
    if (x < -w || x > f.W + w) continue;
    // 천천히 떠올랐다 가라앉는다
    const rise = f.reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(time * 0.35 + e.r * 6);
    const body = mix(pal.waterBottom, "#1E2A26", 0.6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w, 0, w * 2, y + 0.2 * u);
    ctx.clip();
    ctx.fillStyle = body;
    ctx.globalAlpha = 0.85;
    // 등 혹 세 개 + 꼬리 끝
    for (const [dx, r] of [
      [-0.3, 4.4],
      [-0.05, 5.6],
      [0.2, 4],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x + dx * w, y + 0.4 * u, r * u, r * u * 0.9 * rise, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x + 0.36 * w, y + 0.3 * u);
    ctx.quadraticCurveTo(x + 0.42 * w, y - 4.4 * u * rise, x + 0.48 * w, y - 5.2 * u * rise);
    ctx.quadraticCurveTo(x + 0.44 * w, y - 1.6 * u * rise, x + 0.4 * w, y + 0.3 * u);
    ctx.fill();
    ctx.restore();
    // 둥근 물결
    ctx.strokeStyle = pal.waterGlint;
    ctx.lineWidth = Math.max(1, 0.14 * u);
    ctx.globalAlpha = 0.55;
    for (let k = 0; k < 3; k++) {
      const p = f.reducedMotion ? k / 3 : ((time * 0.25 + k / 3) % 1);
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.beginPath();
      ctx.ellipse(x - 0.05 * w, y + 0.8 * u, (8 + p * 22) * u, (0.8 + p * 2) * u, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/* ─────────────── 승강장 고양이 (정차하는 동안 보인다) ─────────────── */

export function drawPlatformCat(f: Frame) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.platform;
  for (const e of eventsOf(f, "cat")) {
    const m = e.m! + (e.r - 0.5) * 12;
    const x = sx(f, m, s);
    const h = 16 * u;
    if (x < -h * 2 || x > f.W + h * 2) continue;
    const coat = ["#E9A75B", "#3B3A3C", "#9A9792"][Math.floor(e.r * 3) % 3];
    const belly = coat === "#3B3A3C" ? "#F4F0E8" : mix(coat, "#FFFFFF", 0.45);
    const fur = pal.night > 0.5 ? mix(coat, "#2A2840", 0.25) : coat;
    const y = 97 * u;
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.beginPath();
    ctx.ellipse(x, y, h * 0.5, 0.7 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    // 꼬리 (천천히 흔든다)
    const sway = f.reducedMotion ? 0.3 : Math.sin(time * 1.6) * 0.5;
    ctx.strokeStyle = fur;
    ctx.lineWidth = h * 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + h * 0.3, y - h * 0.1);
    ctx.quadraticCurveTo(x + h * 0.75, y - h * 0.15, x + h * (0.7 + sway * 0.2), y - h * (0.55 + sway * 0.1));
    ctx.stroke();
    // 몸 (앉은 모양)
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.32, h * 0.36, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(x - h * 0.08, y - h * 0.28, h * 0.16, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    // 머리와 귀
    ctx.fillStyle = fur;
    const hx = x - h * 0.08;
    const hy = y - h * 0.78;
    ctx.beginPath();
    ctx.arc(hx, hy, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + d * h * 0.2, hy - h * 0.08);
      ctx.lineTo(hx + d * h * 0.2, hy - h * 0.32);
      ctx.lineTo(hx + d * h * 0.04, hy - h * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    // 눈 (가끔 깜빡)
    const blink = !f.reducedMotion && time % 4.3 < 0.15;
    ctx.fillStyle = "#2A2622";
    for (const d of [-1, 1]) {
      if (blink) ctx.fillRect(hx + d * h * 0.09 - h * 0.04, hy - h * 0.01, h * 0.08, Math.max(1, h * 0.02));
      else {
        ctx.beginPath();
        ctx.arc(hx + d * h * 0.09, hy, h * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#E58F8A";
    ctx.fillRect(hx - h * 0.02, hy + h * 0.06, h * 0.04, h * 0.03);
  }
}

/* ─────────────── 또롱 (교행 열차 창, 희귀) ─────────────── */

/** 교행 열차 a 의 이 창에 또롱이 타고 있는지 */
export function ttorongAt(f: Frame, a: number) {
  return f.events.some((e: RideEvent) => e.kind === "ttorong" && e.m === a);
}

/** 캔버스용 또롱 얼굴 (아이콘 SVG 와 같은 모양) */
export function drawTtorong(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 64;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(k, k);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#3A3A3A";
  ctx.fillStyle = "#FFFDF8";
  ctx.fill(new Path2D("M10 40c0-14 9.5-24 22-24s22 10 22 24c0 10-9 17-22 17S10 50 10 40Z"));
  ctx.stroke(new Path2D("M10 40c0-14 9.5-24 22-24s22 10 22 24c0 10-9 17-22 17S10 50 10 40Z"));
  ctx.fillStyle = "#2E946B";
  const cap = new Path2D("M17 21c3-6 8-9 15-9s12 3 15 9c-8-2.5-22-2.5-30 0Z");
  ctx.fill(cap);
  ctx.stroke(cap);
  ctx.fillStyle = "#3A3A3A";
  ctx.beginPath();
  ctx.arc(24.5, 37, 2.2, 0, Math.PI * 2);
  ctx.arc(39.5, 37, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(245,169,160,0.7)";
  ctx.beginPath();
  ctx.ellipse(19.5, 42, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(44.5, 42, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
