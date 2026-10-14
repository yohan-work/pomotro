/** 창밖 장면 — 원경: 산·스카이라인 */
import { fbm, pick } from "../rng";
import { mix, shadeColor } from "../sprites";
import { SPEED, HZ, WATER_Y, type Frame, sx, mAt, forCells, sectionAtM } from "./core";

/* ═════════════════════════════ 원경: 산·스카이라인 ═════════════════════════════ */

export function ridge(f: Frame, s: number, seed: number, base: number, amp: number, color: string) {
  const { ctx, W, u } = f;
  const step = Math.max(6, W / 160);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, (HZ + 4) * u);
  for (let x = -10; x <= W + step; x += step) {
    const m = mAt(f, x, s);
    const n = 0.65 * fbm(m / 1500, seed, 3) + 0.35 * fbm(m / 520, seed + 7, 2);
    const y = (base - Math.pow(Math.max(0, n - 0.18) / 0.82, 1.35) * amp) * u;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 10, (HZ + 4) * u);
  ctx.closePath();
  ctx.fill();
}

export function drawFar(f: Frame) {
  const { ctx, W, u, pal } = f;
  // 교외(팔당·양평·파주)는 산이 가깝고 높다
  const rural = sectionAtM(f, f.cam).style === "rural";
  ridge(f, SPEED.mountainFar, 11, HZ + 0.5, rural ? 26 : 17, mix(pal.mountainFar, pal.haze, rural ? 0.22 : 0.3));
  ridge(f, SPEED.mountainNear, 23, HZ + 1, rural ? 19 : 10, mix(rural ? mix(pal.mountainNear, pal.tree[0], 0.35) : pal.mountainNear, pal.haze, 0.18));

  // 원경 시가지 (강 건너 / 멀리 보이는 아파트 숲)
  const s = SPEED.skyline;
  forCells(f, s, 40, 60, 501, (m, r) => {
    if (sectionAtM(f, m).style === "rural" && r() < 0.85) return;
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const bm = m + r() * 40;
      const x = sx(f, bm, s);
      const kind = r();
      const tall = kind < 0.12;
      const w = (tall ? 1.8 + r() : 2.6 + r() * 3.6) * u;
      const h = (tall ? 7 + r() * 7 : kind < 0.55 ? 3.2 + r() * 3.2 : 1.6 + r() * 2) * u;
      const y = (HZ + 2.6) * u - h;
      const depth = r();
      const base = mix(depth < 0.5 ? pal.skylineNear : pal.skylineFar, pick(pal.walls, r()), 0.18 + depth * 0.12);
      ctx.fillStyle = base;
      ctx.fillRect(x, y, w, h);
      // 빛 받는 면 / 그늘 면
      ctx.fillStyle = shadeColor(base, 0.14);
      ctx.fillRect(x, y, w * 0.4, h);
      ctx.fillStyle = shadeColor(base, -0.08);
      ctx.fillRect(x + w * 0.82, y, w * 0.18, h);
      if (!tall && kind < 0.55) {
        // 아파트 층 줄무늬
        ctx.fillStyle = shadeColor(base, -0.06);
        for (let yy = y + 0.5 * u; yy < y + h - 0.3 * u; yy += 0.55 * u) ctx.fillRect(x, yy, w * 0.82, Math.max(0.6, 0.12 * u));
      }
      if (pal.night > 0) {
        ctx.fillStyle = pal.skylineWindow;
        const rows = Math.floor(h / (0.7 * u));
        for (let row = 0; row < rows; row++) {
          const cols = Math.max(1, Math.floor(w / (0.9 * u)));
          for (let c = 0; c < cols; c++) {
            if (r() < pal.night * 0.32) ctx.fillRect(x + c * 0.9 * u + 0.2 * u, y + row * 0.7 * u + 0.3 * u, Math.max(1, u * 0.4), Math.max(1, u * 0.22));
          }
        }
      }
    }
  });
  // 연무 (원근감)
  const hz = ctx.createLinearGradient(0, (HZ - 10) * u, 0, (HZ + 3) * u);
  hz.addColorStop(0, "rgba(0,0,0,0)");
  hz.addColorStop(1, pal.haze);
  ctx.globalAlpha = pal.hazeStrength * 0.7;
  ctx.fillStyle = hz;
  ctx.fillRect(0, (HZ - 10) * u, W, 13 * u);
  ctx.globalAlpha = 1;
  // 건너편 강둑 (둔치 숲)
  ctx.fillStyle = mix(pal.grassDark, pal.haze, 0.45);
  ctx.fillRect(0, (HZ + 2.5) * u, W, (WATER_Y - HZ - 2.5) * u);
  forCells(f, s * 1.6, 9, 20, 517, (m, r) => {
    if (r() < 0.35) return;
    const x = sx(f, m + r() * 9, s * 1.6);
    const tr = (0.5 + r() * 0.6) * u;
    ctx.fillStyle = mix(pick(r() < 0.3 ? pal.treeAutumn : pal.tree, r()), pal.haze, 0.45);
    ctx.beginPath();
    ctx.arc(x, (HZ + 2.7) * u, tr, Math.PI, 0);
    ctx.fill();
  });
  ctx.fillStyle = mix(pal.concrete, pal.haze, 0.4);
  ctx.fillRect(0, (WATER_Y - 0.5) * u, W, 0.5 * u);
}
