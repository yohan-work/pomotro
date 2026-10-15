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

/* ── 유리에 비친 승객 — 사람처럼 (머리 모양·얼굴·옷·손·가방), 유리 반사라 살짝 푸르고 흐리게 ── */
const HAIR = ["#1d1a19", "#2b2220", "#3a2c25", "#4a3a30", "#151515", "#5a4636"];
const CLOTH = ["#3b4a63", "#6b5a4e", "#2f3b36", "#7a6a5a", "#55606e", "#8a4f4f", "#4f5f4a", "#c9c2b4", "#a7826b"];
const SKIN = ["#e9c9a8", "#dcb592", "#f0d3b8", "#d3a988"];

/** 사람 한 명 (w×h 스프라이트, 머리 반지름 = w*0.17). standing 이면 한 팔을 들어 손잡이를 잡는다 */
function drawReflectedPerson(c: CanvasRenderingContext2D, w: number, h: number, seed: number, standing: boolean) {
  const r = rng(hash2(seed, 5150));
  const hair = HAIR[Math.floor(r() * HAIR.length)];
  const cloth = CLOTH[Math.floor(r() * CLOTH.length)];
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const style = r();
  const hr = w * 0.17;
  const cx = w / 2;
  const hy = standing ? h * 0.2 : h * 0.18;
  c.filter = "blur(0.5px)";
  // 몸통 (어깨 → 아래)
  const sh = hy + hr * 1.55;
  c.fillStyle = cloth;
  c.beginPath();
  c.moveTo(cx - w * 0.36, h);
  c.lineTo(cx - w * 0.38, sh + hr * 0.6);
  c.quadraticCurveTo(cx - w * 0.36, sh, cx - hr * 0.6, sh - hr * 0.1);
  c.lineTo(cx + hr * 0.6, sh - hr * 0.1);
  c.quadraticCurveTo(cx + w * 0.36, sh, cx + w * 0.38, sh + hr * 0.6);
  c.lineTo(cx + w * 0.36, h);
  c.closePath();
  c.fill();
  // 깃
  c.fillStyle = "rgba(255,255,255,0.25)";
  c.beginPath();
  c.moveTo(cx - hr * 0.55, sh - hr * 0.1);
  c.lineTo(cx, sh + hr * 0.7);
  c.lineTo(cx + hr * 0.55, sh - hr * 0.1);
  c.fill();
  // 목
  c.fillStyle = skin;
  c.fillRect(cx - hr * 0.32, hy + hr * 0.7, hr * 0.64, hr * 0.8);
  if (standing) {
    // 들어 올린 팔 (손잡이 쪽)
    c.fillStyle = cloth;
    rrect(c, cx + w * 0.22, hy - hr * 2.6, w * 0.13, sh - hy + hr * 2.8, w * 0.06);
    c.fill();
    c.fillStyle = skin;
    c.beginPath();
    c.arc(cx + w * 0.285, hy - hr * 2.6, w * 0.075, 0, Math.PI * 2);
    c.fill();
  } else {
    // 무릎 위 손 (+ 가끔 가방)
    if (r() < 0.35) {
      c.fillStyle = ["#2a2522", "#6b4b3a", "#c9b79c"][Math.floor(r() * 3)];
      rrect(c, cx - w * 0.3, h * 0.72, w * 0.6, h * 0.2, w * 0.05);
      c.fill();
    }
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(cx - w * 0.1, h * 0.7, w * 0.08, w * 0.05, 0, 0, Math.PI * 2);
    c.ellipse(cx + w * 0.1, h * 0.7, w * 0.08, w * 0.05, 0, 0, Math.PI * 2);
    c.fill();
  }
  // 머리: 얼굴 + 머리카락 모양
  c.fillStyle = skin;
  c.beginPath();
  c.arc(cx, hy, hr, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair;
  if (style < 0.3) {
    // 짧은 머리
    c.beginPath();
    c.arc(cx, hy - hr * 0.1, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
    c.fill();
  } else if (style < 0.6) {
    // 긴 머리 (어깨까지)
    c.beginPath();
    c.arc(cx, hy - hr * 0.05, hr * 1.08, Math.PI, 0);
    c.lineTo(cx + hr * 1.08, hy + hr * 1.5);
    c.lineTo(cx + hr * 0.7, hy + hr * 1.5);
    c.lineTo(cx + hr * 0.75, hy);
    c.lineTo(cx - hr * 0.75, hy);
    c.lineTo(cx - hr * 0.7, hy + hr * 1.5);
    c.lineTo(cx - hr * 1.08, hy + hr * 1.5);
    c.closePath();
    c.fill();
  } else if (style < 0.8) {
    // 모자
    c.beginPath();
    c.arc(cx, hy - hr * 0.15, hr * 1.05, Math.PI, 0);
    c.closePath();
    c.fill();
    c.fillRect(cx - hr * 1.05, hy - hr * 0.2, hr * 2.4, hr * 0.28);
  } else {
    // 묶은 머리
    c.beginPath();
    c.arc(cx, hy - hr * 0.1, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(cx, hy - hr * 1.15, hr * 0.42, 0, Math.PI * 2);
    c.fill();
  }
  // 이어폰 (가끔)
  if (r() < 0.3) {
    c.fillStyle = "#f4f4f4";
    c.beginPath();
    c.arc(cx - hr * 0.98, hy + hr * 0.15, hr * 0.14, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = "none";
  // 유리에 비친 색: 푸르스름하게
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = "rgba(150,175,205,0.32)";
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
}

/**
 * 유리에 비친 객실: 어두운 구간에서 맞은편 좌석에 앉은 승객들이 비친다 (사람 모양, 푸르고 흐리게).
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
    const phone = r() < 0.45;
    const sw = head / 0.17;
    const shh = sw * 2.6;
    const sp = f.sprites.get(`refl:s:${k}:${sw | 0}`, sw, shh, (c, w, h) => drawReflectedPerson(c, w, h, k * 31 + 7, false));
    ctx.globalAlpha = a * 0.5;
    // 머리 중심이 y 에 오게 (스프라이트 안 머리 중심 = 높이의 18%)
    const top = y - shh * 0.18;
    ctx.drawImage(sp.img, x - sw / 2 + lean, top, sp.w, sp.h);
    // 휴대폰 보는 사람: 손 위 화면 불빛
    if (phone) {
      ctx.globalAlpha = a * (pal.night > 0.5 ? 0.6 : 0.38);
      ctx.fillStyle = "#cfe6ff";
      rrect(ctx, x - 1.1 * u + lean, top + shh * 0.62, 2.2 * u, 3.2 * u, 0.4 * u);
      ctx.fill();
    }
  }
  // 출퇴근 시간: 손잡이를 잡고 서 있는 승객들이 앉은 사람들 앞에 비친다
  if (f.crowd > 0.7) {
    const k = (f.crowd - 0.7) / 0.3;
    const rs = rng(4242);
    const n = Math.round(3 + k * 3);
    for (let i = 0; i < n; i++) {
      const x = W * (0.1 + (i + 0.3 + rs() * 0.4) * (0.8 / n));
      const head = (3.8 + rs() * 0.6) * u;
      const sw = head / 0.17;
      const shh = sw * 3.4;
      const y = (34 + rs() * 4) * u;
      const sp = f.sprites.get(`refl:t:${i}:${sw | 0}`, sw, shh, (c, w, h) => drawReflectedPerson(c, w, h, i * 53 + 11, true));
      ctx.globalAlpha = a * 0.45;
      ctx.drawImage(sp.img, x - sw / 2, y - shh * 0.2, sp.w, sp.h);
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
