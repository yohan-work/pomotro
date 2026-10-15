/**
 * 창밖 장면 — 터널 모양 변주 (연출)
 * - 원형(쉴드) 터널: 둥근 벽이라 위아래가 어둡고, 1.5m 마다 링 이음매와 볼트 자국, 점검 통로 난간
 * - 기둥형 박스 터널: 가까운 중앙 기둥 사이로 맞은편 선로와 그 너머 벽·조명이 보인다 (더 느린 시차)
 * 오브젝트는 모두 트랙 좌표에 결정론적으로 놓인다.
 */
import { rrect } from "../sprites";
import { SPEED, type Frame, sx, visRange, type Span } from "./core";

function exitSign(f: Frame, x: number, y: number) {
  const { ctx, u } = f;
  ctx.fillStyle = "#1FA463";
  rrect(ctx, x, y, 6.4 * u, 3.2 * u, 0.4 * u);
  ctx.fill();
  ctx.fillStyle = "#E9FFF2";
  ctx.beginPath();
  ctx.arc(x + 1.6 * u, y + 1 * u, 0.42 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 1.3 * u, y + 1.5 * u, 0.6 * u, 1.2 * u);
  ctx.fillRect(x + 2.6 * u, y + 1.4 * u, 2.6 * u, 0.5 * u);
}

export function drawRoundTunnel(f: Frame, sp: Span) {
  const { ctx, u, H } = f;
  const s = SPEED.track;
  const w = sp.xb - sp.xa;
  // 둥근 벽: 가운데가 가장 밝고 위아래로 휘어 어두워진다
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0E0F10");
  g.addColorStop(0.22, "#2B2E30");
  g.addColorStop(0.5, "#3A3D3F");
  g.addColorStop(0.78, "#2A2C2E");
  g.addColorStop(1, "#0D0E0F");
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, 0, w, H);
  const [m0, m1] = visRange(f, s, 80);
  // 링 이음매 (1.5m) + 볼트 자국
  const ring = 1.5;
  for (let m = Math.floor(m0 / ring) * ring; m <= m1; m += ring) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, 8 * u, Math.max(1, 0.35 * u), 82 * u);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + Math.max(1, 0.35 * u), 8 * u, Math.max(1, 0.2 * u), 82 * u);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (const y of [24, 46, 66]) ctx.fillRect(x + 0.9 * u, y * u, 0.7 * u, 0.7 * u);
  }
  // 케이블 다발과 받침
  ctx.fillStyle = "#16181A";
  ctx.fillRect(sp.xa, 38 * u, w, 1.4 * u);
  ctx.fillRect(sp.xa, 41 * u, w, 1 * u);
  for (let m = Math.floor(m0 / ring) * ring; m <= m1; m += ring * 2) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillStyle = "#4A4D50";
    ctx.fillRect(x, 37 * u, Math.max(1, 0.3 * u), 6 * u);
  }
  // 점검 통로 난간
  ctx.fillStyle = "#55595C";
  ctx.fillRect(sp.xa, 70 * u, w, 0.6 * u);
  ctx.fillStyle = "#202224";
  ctx.fillRect(sp.xa, 78 * u, w, H - 78 * u);
  for (let m = Math.floor(m0 / 3) * 3; m <= m1; m += 3) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillStyle = "#4A4D50";
    ctx.fillRect(x, 70 * u, Math.max(1, 0.3 * u), 8 * u);
  }
  // 조명 (20m, 차가운 흰빛) + 가끔 비상구 유도등
  const gap = 20;
  for (let m = Math.floor(m0 / gap) * gap; m <= m1 + gap; m += gap) {
    const x = sx(f, m, s);
    if (x < sp.xa - 30 * u || x > sp.xb + 30 * u) continue;
    const i = Math.round(m / gap);
    const glow = ctx.createRadialGradient(x, 28 * u, 0, x, 28 * u, 20 * u);
    glow.addColorStop(0, "rgba(220,236,255,0.3)");
    glow.addColorStop(1, "rgba(220,236,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 20 * u, 8 * u, 40 * u, 40 * u);
    ctx.fillStyle = "#E6F0FF";
    rrect(ctx, x - 2 * u, 27.4 * u, 4 * u, 1.2 * u, 0.5 * u);
    ctx.fill();
    if (i % 7 === 3) exitSign(f, x + 9 * u, 56 * u);
  }
}

export function drawPillarTunnel(f: Frame, sp: Span) {
  const { ctx, u, H } = f;
  const s = SPEED.track;
  const far = SPEED.track * 0.55;
  const w = sp.xb - sp.xa;
  // 맞은편 선로 너머의 벽
  ctx.fillStyle = "#1A1918";
  ctx.fillRect(sp.xa, 0, w, H);
  const [f0, f1] = visRange(f, far, 80);
  ctx.fillStyle = "#24221F";
  ctx.fillRect(sp.xa, 22 * u, w, 52 * u);
  // 먼 벽 조명 (따뜻한 빛, 30m)
  for (let m = Math.floor(f0 / 30) * 30; m <= f1 + 30; m += 30) {
    const x = sx(f, m, far);
    if (x < sp.xa - 20 * u || x > sp.xb + 20 * u) continue;
    const glow = ctx.createRadialGradient(x, 26 * u, 0, x, 26 * u, 14 * u);
    glow.addColorStop(0, "rgba(255,222,170,0.25)");
    glow.addColorStop(1, "rgba(255,222,170,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 14 * u, 12 * u, 28 * u, 28 * u);
    ctx.fillStyle = "#FFE7BE";
    ctx.fillRect(x - 1.2 * u, 25.6 * u, 2.4 * u, 0.8 * u);
  }
  // 맞은편 선로 도상과 레일 반짝임
  ctx.fillStyle = "#121110";
  ctx.fillRect(sp.xa, 74 * u, w, H - 74 * u);
  ctx.fillStyle = "rgba(200,200,200,0.25)";
  ctx.fillRect(sp.xa, 78 * u, w, Math.max(1, 0.25 * u));
  ctx.fillRect(sp.xa, 81 * u, w, Math.max(1, 0.25 * u));
  // 천장 보
  ctx.fillStyle = "#0F0E0E";
  ctx.fillRect(sp.xa, 0, w, 9 * u);
  // 가까운 중앙 기둥 (5m 간격)
  const [m0, m1] = visRange(f, s, 80);
  const gap = 5;
  const pw = 0.9;
  for (let m = Math.floor(m0 / gap) * gap; m <= m1; m += gap) {
    const xa = sx(f, m, s);
    const xb = sx(f, m + pw, s);
    if (xb < sp.xa - 4 || xa > sp.xb + 4) continue;
    const g = ctx.createLinearGradient(xa, 0, xb, 0);
    g.addColorStop(0, "#3A3734");
    g.addColorStop(0.35, "#57524D");
    g.addColorStop(1, "#2C2A27");
    ctx.fillStyle = g;
    ctx.fillRect(xa, 0, xb - xa, H);
    // 기둥 번호판 (가끔)
    if (Math.round(m / gap) % 8 === 0) {
      ctx.fillStyle = "#E9C44A";
      rrect(ctx, xa + (xb - xa) * 0.2, 50 * u, (xb - xa) * 0.6, 2.2 * u, 0.3 * u);
      ctx.fill();
    }
  }
}
