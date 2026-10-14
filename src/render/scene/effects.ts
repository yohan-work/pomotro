/** 창밖 장면 — 최근경 지지대·날씨·창 유리 */
import { hash2, rng } from "../rng";
import { rrect } from "../sprites";
import { SPEED, type Frame, sx, visRange, sectionAtM } from "./core";

/* ═════════════════════════════ 최근경: 전차선 지지대 ═════════════════════════════ */

export function drawFore(f: Frame) {
  const { ctx, u, pal, H, v } = f;
  const s = SPEED.fore;
  const gap = 48;
  const [m0, m1] = visRange(f, s, 80);
  // 블러 폭은 창 폭에 비례해 상한 (좁은 모바일 창에서 넓은 반투명 띠가 되지 않게)
  const blur = Math.min(60, f.W * 0.012, (Math.abs(v) * s * u) / 60) * (f.reducedMotion ? 0.3 : 1);
  for (let m = Math.floor(m0 / gap) * gap; m <= m1; m += gap) {
    const sec = sectionAtM(f, m);
    if (sec.kind !== "city" && sec.kind !== "bank" && sec.kind !== "river") continue;
    const x = sx(f, m, s);
    const w = 2.6 * u;
    if (x < -w - blur || x > f.W + blur) continue;
    // 모션 블러: 속도에 비례해 가장자리가 흐려진다
    if (blur > 1) {
      const g = ctx.createLinearGradient(x - blur, 0, x + w + blur, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(blur / (w + 2 * blur), pal.steelDark);
      g.addColorStop(1 - blur / (w + 2 * blur), pal.steelDark);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.globalAlpha = Math.max(0.8, 1 - blur / 120);
      ctx.fillRect(x - blur, 0, w + 2 * blur, H);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = pal.steelDark;
      ctx.fillRect(x, 0, w, H);
      ctx.fillStyle = pal.steel;
      ctx.fillRect(x + w * 0.15, 0, w * 0.3, H);
    }
    ctx.fillStyle = pal.steelDark;
    ctx.fillRect(x - 4 * u, 4 * u, 8 * u + w, 1 * u);
  }
}

/* ═════════════════════════════ 창 유리 효과 ═════════════════════════════ */

/* ═════════════════════════════ 날씨: 비·눈·안개 ═════════════════════════════ */

/**
 * 창밖 강수. 가로 위치는 시간이 아니라 열차 위치(cam)에 묶는다 — 속도가 바뀌어도 튀지 않는다.
 * 비는 속도가 빠를수록 비스듬히 눕는다.
 */
export function drawPrecip(f: Frame) {
  const { ctx, W, H, u, time, cam, v } = f;
  if (f.weather === "fog") {
    ctx.fillStyle = f.pal.haze;
    ctx.globalAlpha = 0.32;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    return;
  }
  if (f.weather !== "rain" && f.weather !== "snow") return;
  const rain = f.weather === "rain";
  const n = Math.round((rain ? 150 : 120) * f.quality);
  const span = W * 1.4;
  const slant = Math.min(1.6, Math.abs(v) * 0.07);
  for (let i = 0; i < n; i++) {
    const h = hash2(i, rain ? 5150 : 7170);
    const r1 = (h & 1023) / 1023;
    const r2 = ((h >> 10) & 1023) / 1023;
    const d = 0.3 + (((h >> 20) & 255) / 255) * 0.7; // 깊이: 가까울수록 크고 빠름
    const par = (0.6 + d * 2.6) * u;
    let x = (r1 * span - cam * par) % span;
    if (x < 0) x += span;
    x -= W * 0.2;
    if (rain) {
      const fall = (55 + d * 60) * u;
      const len = (2.4 + d * 4.5) * u;
      const y = ((r2 * (H + len) + time * fall) % (H + len)) - len;
      if (!f.reducedMotion || i % 3 === 0) {
        ctx.strokeStyle = f.pal.night > 0.5 ? `rgba(190,200,230,${0.18 + d * 0.22})` : `rgba(235,240,248,${0.22 + d * 0.3})`;
        ctx.lineWidth = Math.max(0.6, d * 0.16 * u);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len * slant, y - len);
        ctx.stroke();
      }
    } else {
      const fall = (6 + d * 10) * u;
      const y = (r2 * H + time * fall) % H;
      const sway = f.reducedMotion ? 0 : Math.sin(time * (0.8 + r1) + i) * 1.4 * u * d;
      ctx.fillStyle = `rgba(255,255,255,${0.55 + d * 0.4})`;
      ctx.beginPath();
      ctx.arc(x + sway, y, (0.18 + d * 0.42) * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 비 오는 날 창에 맺힌 물방울: 정차 중엔 천천히 흘러내리고, 달리면 뒤로 밀려 꼬리가 생긴다 */
export function drawDroplets(f: Frame) {
  const { ctx, W, H, u, time, cam, v } = f;
  const n = Math.round(80 * f.quality);
  const tail = Math.min(5, Math.abs(v) * 0.22) * u;
  const alpha = 1 - f.darkness * 0.4;
  for (let i = 0; i < n; i++) {
    const h = hash2(i, 9311);
    const r1 = (h & 1023) / 1023;
    const r2 = ((h >> 10) & 1023) / 1023;
    const sz = (0.18 + (((h >> 20) & 255) / 255) * 0.5) * u;
    let x = (r1 * W - cam * u * (0.25 + r2 * 0.5)) % W;
    if (x < 0) x += W;
    const y = (r2 * H + time * (0.25 + r1 * 0.6) * u) % H;
    ctx.globalAlpha = alpha;
    if (tail > 0.3 * u) {
      const g = ctx.createLinearGradient(x, 0, x + tail, 0);
      g.addColorStop(0, "rgba(255,255,255,0.28)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y - sz * 0.35, tail, sz * 0.7);
    }
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(x - sz * 0.3, y - sz * 0.35, sz * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * 유리에 비친 객실: 어두운 구간에서 맞은편 좌석에 앉은 승객들이 실루엣으로 비친다.
 * 객실 안의 모습이라 풍경과 함께 흐르지 않고 화면에 고정된다. 밤엔 휴대폰 불빛.
 */
function drawCabinReflection(f: Frame) {
  const { ctx, W, u, darkness, pal } = f;
  const a = Math.max(0, darkness - 0.25) / 0.75;
  if (a <= 0.01) return;
  const r = rng(2025);
  const seats = 7;
  for (let k = 0; k < seats; k++) {
    if (r() < 0.25) continue; // 빈자리
    const x = W * (0.08 + (k + 0.15 + r() * 0.5) * (0.84 / seats));
    const head = (3.4 + r() * 0.8) * u;
    const y = (68 + r() * 3) * u;
    const lean = (r() - 0.5) * 1.2 * u;
    ctx.globalAlpha = a * 0.15;
    ctx.fillStyle = "#e8dfcf";
    // 어깨·몸
    rrect(ctx, x - head * 1.7 + lean, y + head * 0.9, head * 3.4, 22 * u, head * 1.3);
    ctx.fill();
    // 머리
    ctx.beginPath();
    ctx.arc(x + lean * 1.4, y, head, 0, Math.PI * 2);
    ctx.fill();
    // 휴대폰 보는 사람: 얼굴 아래 작은 불빛
    if (r() < 0.45) {
      ctx.globalAlpha = a * (pal.night > 0.5 ? 0.5 : 0.32);
      ctx.fillStyle = "#cfe6ff";
      rrect(ctx, x - 1.1 * u + lean, y + head * 1.6, 2.2 * u, 3.4 * u, 0.4 * u);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawGlass(f: Frame) {
  const { ctx, W, H, u, pal, darkness } = f;
  if (pal.tintAlpha > 0) {
    ctx.globalAlpha = pal.tintAlpha * (1 - darkness);
    ctx.fillStyle = pal.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // 실내 반사 — 어두울수록 유리가 거울처럼 실내를 비춘다
  const refl = 0.05 + darkness * 0.3;
  ctx.globalAlpha = refl;
  ctx.fillStyle = "#FFF6E2";
  ctx.fillRect(0, 3 * u, W, 2.4 * u);
  ctx.fillStyle = "#F4ECDC";
  ctx.fillRect(0, 7.5 * u, W, 0.6 * u);
  ctx.globalAlpha = refl * 0.6;
  ctx.fillStyle = "#4E8A6F";
  rrect(ctx, W * 0.03, 86 * u, W * 0.94, 20 * u, 6 * u);
  ctx.fill();
  ctx.globalAlpha = refl;
  ctx.fillStyle = "#E8E2D6";
  for (let k = 0; k < 7; k++) {
    const x = W * (0.08 + k * 0.14);
    ctx.fillRect(x, 0, 0.3 * u, 12 * u);
    ctx.beginPath();
    ctx.arc(x + 0.15 * u, 14 * u, 1.8 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawCabinReflection(f);
  // 유리 광택
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(0.3, "rgba(255,255,255,0)");
  g.addColorStop(0.62, "rgba(255,255,255,0)");
  g.addColorStop(0.7, "rgba(255,255,255,0.06)");
  g.addColorStop(0.78, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 가장자리 비네팅
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(20,20,30,0)");
  vg.addColorStop(1, "rgba(20,20,30,0.22)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
