/** 창밖 장면 — 하늘과 구름 */
import { hash2, rng } from "../rng";
import { drawCloud } from "../sprites";
import { SPEED, HZ, type Frame } from "./core";

/* ═════════════════════════════ 하늘 ═════════════════════════════ */

export function drawSky(f: Frame) {
  const { ctx, W, H, u, pal } = f;
  const g = ctx.createLinearGradient(0, 0, 0, HZ * u);
  g.addColorStop(0, pal.sky[0]);
  g.addColorStop(0.6, pal.sky[1]);
  g.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, (HZ + 6) * u);

  if (pal.night > 0.5) {
    const r = rng(77);
    ctx.fillStyle = "#FFF7E0";
    for (let k = 0; k < 70; k++) {
      const x = r() * W;
      const y = r() * HZ * u * 0.8;
      const tw = 0.5 + 0.5 * Math.sin(f.time * (0.6 + r()) + k);
      ctx.globalAlpha = 0.25 + 0.5 * tw * r();
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
  }

  if (pal.sun.visible && f.sunAlpha > 0.01) {
    ctx.globalAlpha = f.sunAlpha;
    const x = pal.sun.x * W;
    const y = pal.sun.y * H;
    const rr = pal.sun.r * u;
    const glow = ctx.createRadialGradient(x, y, rr * 0.5, x, y, rr * 9);
    glow.addColorStop(0, pal.sun.glow);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - rr * 9, y - rr * 9, rr * 18, rr * 18);
    ctx.fillStyle = pal.sun.color;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 구름 — 바람에 천천히 흐르고 열차 이동에는 거의 반응하지 않는다
  const drift = f.reducedMotion ? 0 : f.time * 0.9;
  const cell = 300;
  const off = f.cam * SPEED.cloud * u + drift;
  const i0 = Math.floor((off - W) / cell) - 1;
  const i1 = Math.ceil((off + W * 2) / cell);
  for (let i = i0; i <= i1; i++) {
    const r = rng(hash2(i, 991));
    if (r() < 0.3 * (1 - (pal.overcast ?? 0))) continue;
    const cw = (10 + r() * 24) * u * (1 + (pal.overcast ?? 0) * 0.7);
    const ch = cw * (0.32 + r() * 0.12);
    const x = W / 2 + i * cell - off + r() * 200;
    const y = (3 + r() * 26) * u;
    if (x > W + cw || x + cw < -cw) continue;
    const sp = f.sprites.get(`cloud:${i % 23}:${pal.key}:${(cw | 0)}`, cw, ch, (c, w, h) => drawCloud(c, w, h, i % 23, pal));
    ctx.globalAlpha = 0.92 - y / (HZ * u) * 0.3;
    ctx.drawImage(sp.img, x, y, sp.w, sp.h);
  }
  ctx.globalAlpha = 1;
}
