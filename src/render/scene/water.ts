/** 창밖 장면 — 한강: 수면·선유도·양화대교·유람선·새·롯데월드타워·올림픽대교 */
import { sectionsInRange, type Section } from "../../sim/journey";
import { hash2, pick, rng } from "../rng";
import { mix, rrect, shadeColor } from "../sprites";
import { SPEED, HZ, WATER_Y, type Frame, sx, visRange, sectionAtM, riverSideView } from "./core";

/* ═════════════════════════════ 한강 ═════════════════════════════ */

export function riverNearby(f: Frame): boolean {
  const [m0, m1] = visRange(f, SPEED.mid * 0.6, 200);
  return sectionsInRange(f.journey, m0, m1).some(
    (s) =>
      (s.kind === "river" && s.variant !== "stream") ||
      (s.kind === "bank" && !nearStream(f, s)) ||
      (s.kind === "riverside" && riverSideView(s)),
  );
}

/** 하천 옆 둔치인지 (한강 둔치가 아니면 큰 수면을 그리지 않는다) */
export function nearStream(f: Frame, bank: Section): boolean {
  const a = sectionAtM(f, bank.x0 - 1);
  const b = sectionAtM(f, bank.x1 + 1);
  return (a.kind === "river" && a.variant === "stream") || (b.kind === "river" && b.variant === "stream");
}

export function drawWater(f: Frame) {
  const { ctx, W, H, u, pal, time } = f;
  const y0 = WATER_Y * u;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, pal.waterTop);
  g.addColorStop(0.35, mix(pal.waterTop, pal.waterBottom, 0.55));
  g.addColorStop(1, pal.waterBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);

  // 원경(산·스카이라인) 반사: 이미 그려진 수평선 띠를 뒤집어 눌러 붙인다
  {
    const T = ctx.getTransform();
    const cv = ctx.canvas;
    const srcTop = T.d * ((HZ - 14) * u) + T.f;
    const srcBot = T.d * ((WATER_Y - 0.6) * u) + T.f;
    const dstTop = T.d * y0 + T.f;
    const sh = srcBot - srcTop;
    if (sh > 2) {
      ctx.save();
      ctx.setTransform(1, 0, 0, -0.55, 0, dstTop + sh * 0.55);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(cv, 0, srcTop, cv.width, sh, 0, 0, cv.width, sh);
      ctx.restore();
    }
  }

  // 물결 — 깊이(행)마다 다른 시차로 흐른다
  const R = Math.round(20 * f.quality + 6);
  ctx.fillStyle = pal.waterGlint;
  for (let row = 0; row < R; row++) {
    const d = (row + 1) / R;
    const y = y0 + (H - y0) * Math.pow(d, 1.7);
    const s = 0.08 + 3.4 * Math.pow(d, 1.6);
    const cell = (70 + 90 * (1 - d)) / (s * u);
    const [m0, m1] = visRange(f, s, 40);
    const i0 = Math.floor(m0 / cell);
    const i1 = Math.ceil(m1 / cell);
    for (let i = i0; i <= i1; i++) {
      const h = hash2(i, row * 31 + 7);
      const r1 = (h & 1023) / 1023;
      const r2 = ((h >> 10) & 1023) / 1023;
      const x = sx(f, (i + r1) * cell, s);
      const wob = 0.6 + 0.4 * Math.sin(time * (1.1 + r2) + r1 * 20);
      const len = (4 + r2 * 16) * (0.35 + d * 1.2) * wob * (u / 6);
      ctx.globalAlpha = (0.16 + 0.42 * d) * wob;
      ctx.fillRect(x, y, len, Math.max(1, d * 2.4 * (u / 6)));
    }
  }
  ctx.globalAlpha = 1;

  // 태양 반사 기둥
  if (pal.sun.visible && f.sunAlpha > 0.01) {
    const cx = pal.sun.x * W;
    const strength = (pal.key === "sunset" ? 1 : 0.45) * f.sunAlpha;
    for (let k = 0; k < 90 * f.quality; k++) {
      const r = rng(hash2(k, 4242));
      const d = Math.pow(r(), 1.3);
      const y = y0 + (H - y0) * d;
      const spread = (2 + d * 14) * u;
      const x = cx + (r() - 0.5) * spread * 2;
      const tw = 0.5 + 0.5 * Math.sin(time * (2 + r() * 3) + k);
      ctx.globalAlpha = strength * tw * (0.25 + 0.6 * (1 - d));
      ctx.fillStyle = pal.sun.color;
      ctx.fillRect(x, y, (2 + r() * 10) * (u / 6) * (0.5 + d), Math.max(1, (0.5 + d * 1.5) * (u / 6)));
    }
    ctx.globalAlpha = 1;
  } else {
    // 낮: 넓게 흩어진 햇빛 반짝임
    for (let k = 0; k < 60 * f.quality; k++) {
      const r = rng(hash2(k, 777));
      const d = r();
      const s = 0.08 + 3.4 * Math.pow(d, 1.6);
      const m = r() * 4000 - 2000;
      const cyc = 4000 / (s * u) ;
      let x = sx(f, m, s) % (W + 200);
      if (x < 0) x += W + 200;
      x -= 100;
      const y = y0 + (H - y0) * Math.pow(d, 1.7);
      const tw = Math.max(0, Math.sin(time * (1.5 + r() * 2.5) + k * 1.7));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = "#FFFFFF";
      const sz = (1 + d * 2.2) * (u / 6);
      ctx.fillRect(x - sz, y - sz * 0.25, sz * 2, sz * 0.5);
      ctx.fillRect(x - sz * 0.25, y - sz * 0.7, sz * 0.5, sz * 1.4);
      void cyc;
    }
    ctx.globalAlpha = 1;
  }
}

/** 선유도공원 (양화대교 서쪽 섬) */
export function drawIsland(f: Frame, river: Section) {
  const { ctx, u, pal } = f;
  const s = SPEED.island;
  const anchor = river.x0 + (river.x1 - river.x0) * 0.32;
  const x = sx(f, anchor, s);
  const w = 62 * u;
  if (x + w / 2 < -20 || x - w / 2 > f.W + 20) return;
  const top = 52.2 * u;
  ctx.fillStyle = mix(pal.concreteDark, pal.haze, 0.35);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, 54.2 * u);
  ctx.quadraticCurveTo(x - w / 2 + 3 * u, top, x - w / 2 + 8 * u, top);
  ctx.lineTo(x + w / 2 - 8 * u, top);
  ctx.quadraticCurveTo(x + w / 2 - 3 * u, top, x + w / 2, 54.2 * u);
  ctx.closePath();
  ctx.fill();
  // 숲
  const r = rng(808);
  for (let k = 0; k < 26; k++) {
    const tx = x - w / 2 + 5 * u + r() * (w - 10 * u);
    const tr = (1 + r() * 1.4) * u;
    ctx.fillStyle = mix(pick(r() < 0.3 ? pal.treeAutumn : pal.tree, r()), pal.haze, 0.3);
    ctx.beginPath();
    ctx.arc(tx, top - tr * 0.5, tr, 0, Math.PI * 2);
    ctx.fill();
  }
  // 옛 정수장 구조물
  ctx.fillStyle = mix(pal.walls[0], pal.haze, 0.35);
  ctx.fillRect(x + 4 * u, top - 1.8 * u, 7 * u, 1.8 * u);
  ctx.fillRect(x - 12 * u, top - 1.2 * u, 5 * u, 1.2 * u);
  // 선유교 (아치형 보행교)
  ctx.strokeStyle = mix("#E9E3D8", pal.haze, 0.3);
  ctx.lineWidth = Math.max(1, 0.35 * u);
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 4 * u, top + 0.6 * u);
  ctx.quadraticCurveTo(x + w / 2 + 6 * u, top - 3.6 * u, x + w / 2 + 16 * u, top - 0.2 * u);
  ctx.stroke();
}

/** 양화대교 — 당산철교와 나란히 놓인 아치교. 가까운 중경에서 교각과 아치가 흘러간다 */
export function drawYanghwa(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.yanghwa;
  const m0 = river.x0 - 140;
  const m1 = river.x1 + 140;
  const xa = sx(f, m0, s);
  const xb = sx(f, m1, s);
  if (xb < -10 || xa > f.W + 10) return;
  const deckTop = 60.5 * u;
  const deckH = 2 * u;
  const pierBottom = 68 * u;
  const col = mix("#C8D3CC", pal.haze, 0.15);
  const colDark = shadeColor(col, pal.night > 0.5 ? -0.55 : -0.25);
  const span = 64;
  const firstPier = Math.ceil(m0 / span) * span;
  // 교각 + 물 반사
  for (let m = firstPier; m <= m1; m += span) {
    const x = sx(f, m, s);
    if (x < -40 || x > f.W + 40) continue;
    ctx.fillStyle = colDark;
    rrect(ctx, x - 1.3 * u, deckTop + deckH, 2.6 * u, pierBottom - deckTop - deckH, 0.4 * u);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - 1.3 * u, deckTop + deckH, 0.7 * u, pierBottom - deckTop - deckH);
    // 수면 반사 (흔들림)
    ctx.fillStyle = colDark;
    for (let k = 0; k < 5; k++) {
      ctx.globalAlpha = 0.22 - k * 0.04;
      const wob = Math.sin(time * 2.2 + k * 1.3 + m) * 0.35 * u;
      ctx.fillRect(x - 1.3 * u + wob, pierBottom + k * 1.1 * u, 2.6 * u, 0.8 * u);
    }
    ctx.globalAlpha = 1;
  }
  // 아치 (중앙 경간들)
  ctx.strokeStyle = mix(pal.steel, "#C9D8CF", 0.3);
  ctx.lineWidth = Math.max(1.5, 0.85 * u);
  const archH = 11 * u;
  for (let m = firstPier; m + span <= m1; m += span) {
    const t = (m - river.x0) / (river.x1 - river.x0);
    if (t < 0.08 || t > 0.9) continue;
    const xA = sx(f, m, s);
    const xB = sx(f, m + span, s);
    if (xB < -20 || xA > f.W + 20) continue;
    ctx.beginPath();
    ctx.moveTo(xA + 0.5 * u, deckTop);
    ctx.quadraticCurveTo((xA + xB) / 2, deckTop - archH * 2, xB - 0.5 * u, deckTop);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.7, 0.18 * u);
    for (let k = 1; k < 8; k++) {
      const tt = k / 8;
      const tx = xA + (xB - xA) * tt;
      const ay = deckTop - archH * 4 * tt * (1 - tt);
      ctx.beginPath();
      ctx.moveTo(tx, ay);
      ctx.lineTo(tx, deckTop);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.5, 0.85 * u);
  }
  // 상판
  ctx.fillStyle = col;
  ctx.fillRect(Math.max(-10, xa), deckTop, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH);
  ctx.fillStyle = colDark;
  ctx.fillRect(Math.max(-10, xa), deckTop + deckH * 0.7, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH * 0.3);

  // 차량 (양방향)
  const len = m1 - m0;
  const carColors = ["#F4F1EA", "#E36D5B", "#4F6E9C", "#F2C14E", "#3D3F48", "#9FC3D8"];
  for (let k = 0; k < 26; k++) {
    const dir = k % 2 ? 1 : -1;
    const speed = 13 + (k % 5);
    let m = (k * 37.3 + dir * (f.reducedMotion ? 0 : time) * speed) % len;
    if (m < 0) m += len;
    const x = sx(f, m0 + m, s);
    if (x < -10 || x > f.W + 10) continue;
    const cw = (k % 7 === 0 ? 3.4 : 1.9) * u;
    ctx.fillStyle = carColors[k % carColors.length];
    rrect(ctx, x, deckTop - 1.2 * u, cw, 1.2 * u, 0.45 * u);
    ctx.fill();
    ctx.fillStyle = "rgba(40,50,70,0.45)";
    ctx.fillRect(x + cw * 0.2, deckTop - 1.05 * u, cw * 0.55, 0.4 * u);
    if (pal.night > 0.3) {
      ctx.fillStyle = dir > 0 ? "#FFF2C0" : "#FF6B5A";
      ctx.fillRect(dir > 0 ? x + cw - 1 : x, deckTop - 0.6 * u, 1.5, 0.3 * u);
    }
  }
  // 가로등 + 야간 수면 반사
  for (let m = Math.ceil(m0 / 32) * 32; m <= m1; m += 32) {
    const x = sx(f, m, s);
    if (x < -10 || x > f.W + 10) continue;
    ctx.fillStyle = colDark;
    ctx.fillRect(x, deckTop - 4.4 * u, Math.max(1, 0.22 * u), 4.4 * u);
    ctx.fillRect(x - 0.6 * u, deckTop - 4.4 * u, 0.8 * u, Math.max(1, 0.2 * u));
    if (pal.night > 0.25) {
      ctx.fillStyle = pal.lamp;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(x - 0.5 * u, deckTop - 4.2 * u, 0.42 * u, 0, Math.PI * 2);
      ctx.fill();
      const wob = Math.sin(time * 2 + m) * 0.4 * u;
      ctx.globalAlpha = 0.35 * pal.night;
      ctx.fillRect(x - 0.3 * u + wob, pierBottom + 0.5 * u, 0.6 * u, 9 * u);
      ctx.globalAlpha = 1;
    }
  }
}

/** 한강 유람선 — 하류(창 정면 방향)로 천천히 */
export function drawBoat(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = 0.3;
  const span = river.x1 - river.x0;
  const m = river.x0 + span * 0.2 + ((f.reducedMotion ? 0 : time) * 2.4) % (span * 0.6);
  const x = sx(f, m, s);
  const y = 57.2 * u;
  const w = 15 * u;
  if (x + w < -20 || x - w > f.W + 20) return;
  // 물결 자국
  ctx.fillStyle = pal.waterGlint;
  ctx.globalAlpha = 0.5;
  for (let k = 0; k < 4; k++) ctx.fillRect(x + w * 0.85 + k * 2.2 * u, y + 0.3 * u + k * 0.25 * u, (4 - k) * 0.9 * u, Math.max(1, 0.18 * u));
  ctx.globalAlpha = 1;
  const dark = pal.night > 0.5;
  ctx.fillStyle = dark ? "#C9C6D8" : "#FBFAF5";
  ctx.beginPath();
  ctx.moveTo(x, y - 1.6 * u);
  ctx.lineTo(x + w, y - 1.6 * u);
  ctx.lineTo(x + w - 1.2 * u, y);
  ctx.lineTo(x + 0.8 * u, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2E946B";
  ctx.fillRect(x + 0.4 * u, y - 0.85 * u, w - 1.2 * u, 0.4 * u);
  ctx.fillStyle = dark ? "#B9B6CA" : "#F2EFE6";
  rrect(ctx, x + 2 * u, y - 3.6 * u, w - 5 * u, 2.1 * u, 0.5 * u);
  ctx.fill();
  rrect(ctx, x + 4 * u, y - 5.2 * u, w - 9.5 * u, 1.7 * u, 0.5 * u);
  ctx.fill();
  ctx.fillStyle = dark ? pal.glassLit : "#7FA7C9";
  for (let k = 0; k < 6; k++) ctx.fillRect(x + 2.6 * u + k * 1.55 * u, y - 3.1 * u, 1 * u, 0.8 * u);
  ctx.fillStyle = "#E36D5B";
  ctx.fillRect(x + 6 * u, y - 7 * u, Math.max(1, 0.15 * u), 1.8 * u);
  ctx.fillRect(x + 6.15 * u, y - 7 * u, 1.1 * u, 0.7 * u);
}

/** 강 위를 나는 새 몇 마리 */
export function drawBirds(f: Frame) {
  const { ctx, u, W, time, pal } = f;
  if (f.reducedMotion) return;
  ctx.strokeStyle = pal.night > 0.5 ? "rgba(220,225,240,0.5)" : "rgba(60,64,72,0.55)";
  ctx.lineWidth = Math.max(1, 0.22 * u);
  ctx.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const r = rng(hash2(k, 313));
    const speed = 18 + r() * 14;
    const period = (W + 200) / speed;
    const phase = (time + r() * period) % period;
    const x = W + 100 - phase * speed - f.cam * 0.25 * u * 0;
    const y = (16 + r() * 16) * u + Math.sin(time * 0.7 + k) * 1.2 * u;
    const flap = Math.sin(time * (6 + r() * 3) + k * 2);
    const span = (0.9 + r() * 0.4) * u;
    ctx.beginPath();
    ctx.moveTo(x - span, y - flap * span * 0.6);
    ctx.quadraticCurveTo(x - span * 0.4, y - span * 0.2, x, y);
    ctx.quadraticCurveTo(x + span * 0.4, y - span * 0.2, x + span, y - flap * span * 0.6);
    ctx.stroke();
  }
}

/** 롯데월드타워 — 잠실철교 남단 너머 진행 방향(화면 오른쪽)에 우뚝 */
export function drawLotteTower(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = 0.05;
  const x = sx(f, river.x1 + 450, s);
  if (x < -20 * u || x > f.W + 20 * u) return;
  const base = (HZ + 2.6) * u;
  const top = (HZ - 33) * u;
  const bw = 5.4 * u;
  const tw = 0.9 * u;
  const body = mix(pal.key === "night" ? "#3B4468" : "#C9D6E2", pal.haze, 0.25);
  const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  g.addColorStop(0, shadeColor(body, 0.22));
  g.addColorStop(0.5, body);
  g.addColorStop(1, shadeColor(body, -0.18));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, base);
  ctx.bezierCurveTo(x - bw / 2, base - (base - top) * 0.45, x - tw, top + (base - top) * 0.2, x - tw / 2, top);
  ctx.lineTo(x + tw / 2, top);
  ctx.bezierCurveTo(x + tw, top + (base - top) * 0.2, x + bw / 2, base - (base - top) * 0.45, x + bw / 2, base);
  ctx.closePath();
  ctx.fill();
  // 가운데 이음선(슬릿)
  ctx.strokeStyle = pal.night > 0.5 ? "rgba(255,230,180,0.75)" : "rgba(255,255,255,0.45)";
  ctx.lineWidth = Math.max(1, 0.12 * u);
  ctx.beginPath();
  ctx.moveTo(x + 0.15 * u, base);
  ctx.lineTo(x + 0.05 * u, top + 1.5 * u);
  ctx.stroke();
  // 꼭대기 랜턴
  ctx.fillStyle = pal.night > 0.5 ? "#FFE3A8" : shadeColor(body, 0.3);
  ctx.globalAlpha = pal.night > 0.5 ? 0.6 + 0.3 * Math.sin(time * 1.5) : 1;
  ctx.fillRect(x - tw / 2, top - 1.4 * u, tw, 1.4 * u);
  ctx.globalAlpha = 1;
}

/** 올림픽대교 — 4개 주탑이 모여 성화 조형물을 받치는 사장교 */
export function drawOlympicBridge(f: Frame, river: Section) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.yanghwa;
  const m0 = river.x0 - 140;
  const m1 = river.x1 + 140;
  const xa = sx(f, m0, s);
  const xb = sx(f, m1, s);
  if (xb < -10 || xa > f.W + 10) return;
  const deckTop = 60.5 * u;
  const deckH = 2 * u;
  const pierBottom = 68 * u;
  const col = mix("#D4DCE4", pal.haze, 0.15);
  const colDark = shadeColor(col, pal.night > 0.5 ? -0.55 : -0.28);
  const span = 70;
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
  // 주탑 + 케이블
  const cm = river.x0 + (river.x1 - river.x0) * 0.55;
  const cx = sx(f, cm, s);
  const towerTop = deckTop - 27 * u;
  if (cx > -60 * u && cx < f.W + 60 * u) {
    ctx.strokeStyle = mix(col, "#FFFFFF", 0.2);
    ctx.lineWidth = Math.max(0.7, 0.12 * u);
    for (let k = 1; k <= 9; k++) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, towerTop + 4 * u + k * 1.1 * u);
        ctx.lineTo(cx + dir * (k * 5.5) * u, deckTop);
        ctx.stroke();
      }
    }
    ctx.fillStyle = mix("#E8ECEF", pal.haze, 0.1);
    for (const off of [-2.4, -0.9, 0.9, 2.4]) {
      ctx.beginPath();
      ctx.moveTo(cx + off * u - 0.45 * u, deckTop + deckH);
      ctx.lineTo(cx + off * u + 0.45 * u, deckTop + deckH);
      ctx.lineTo(cx + off * 0.15 * u + 0.3 * u, towerTop + 2 * u);
      ctx.lineTo(cx + off * 0.15 * u - 0.3 * u, towerTop + 2 * u);
      ctx.closePath();
      ctx.fill();
    }
    // 성화 조형물
    const flick = f.reducedMotion ? 0 : Math.sin(time * 6) * 0.15 * u;
    ctx.fillStyle = pal.night > 0.5 ? "#FFC46B" : "#E9B04C";
    ctx.beginPath();
    ctx.moveTo(cx - 0.9 * u, towerTop + 2.2 * u);
    ctx.quadraticCurveTo(cx - 1.2 * u, towerTop - 0.6 * u, cx + flick, towerTop - 2.8 * u);
    ctx.quadraticCurveTo(cx + 1.2 * u, towerTop - 0.6 * u, cx + 0.9 * u, towerTop + 2.2 * u);
    ctx.closePath();
    ctx.fill();
  }
  // 상판 + 차량
  ctx.fillStyle = col;
  ctx.fillRect(Math.max(-10, xa), deckTop, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH);
  ctx.fillStyle = colDark;
  ctx.fillRect(Math.max(-10, xa), deckTop + deckH * 0.7, Math.min(f.W + 10, xb) - Math.max(-10, xa), deckH * 0.3);
  const len = m1 - m0;
  const carColors = ["#F4F1EA", "#E36D5B", "#4F6E9C", "#F2C14E", "#3D3F48", "#9FC3D8"];
  for (let k = 0; k < 30; k++) {
    const dir = k % 2 ? 1 : -1;
    let m = (k * 41.7 + dir * (f.reducedMotion ? 0 : time) * (12 + (k % 5))) % len;
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
