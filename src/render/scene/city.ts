/** 창밖 장면 — 중경·근경 시가지 */
import { type Palette } from "../palette";
import { fbm, hash2, rng } from "../rng";
import { apartmentSpec, drawApartment, drawGreenhouse, drawPerson, drawFactory, drawShop, drawTower, factorySpec, drawTree, mix, rrect, shopSpec, towerSpec } from "../sprites";
import { SPEED, type Frame, landOf, sx, mAt, visRange, spans, sectionAtM, forCells } from "./core";

/* ═════════════════════════════ 중경: 아파트 단지·빌딩 ═════════════════════════════ */

export function drawMid(f: Frame) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.mid;
  const groundY = 64 * u;
  // 지면 띠
  for (const sp of spans(f, s, 20)) {
    const land = landOf(sp.sec, "mid");
    if (land === "city") {
      // 교외는 밭·풀밭
      ctx.fillStyle = sp.sec.style === "rural" ? mix(mix(pal.grass, pal.groundFar, 0.35), pal.haze, 0.2) : mix(pal.groundFar, pal.haze, 0.2);
      ctx.fillRect(sp.xa, groundY, sp.xb - sp.xa, H - groundY);
    } else if (land === "bank") {
      // 둔치: 강 쪽 끝은 완만한 경사로 물에 닿는다
      const riverBefore = landOf(sectionAtM(f, sp.sec.x0 - 1), "mid") === "river";
      const riverAfter = landOf(sectionAtM(f, sp.sec.x1 + 1), "mid") === "river";
      const taper = 18 * s * u;
      const x0 = sp.xa;
      const x1 = sp.xb;
      ctx.fillStyle = mix(pal.grass, pal.haze, 0.15);
      ctx.beginPath();
      ctx.moveTo(x0, H);
      ctx.lineTo(x0, riverBefore ? groundY + 6 * u : groundY - 0.5 * u);
      if (riverBefore) ctx.quadraticCurveTo(x0 + taper * 0.2, groundY - 0.5 * u, x0 + taper, groundY - 0.5 * u);
      if (riverAfter) {
        ctx.lineTo(x1 - taper, groundY - 0.5 * u);
        ctx.quadraticCurveTo(x1 - taper * 0.2, groundY - 0.5 * u, x1, groundY + 6 * u);
      } else ctx.lineTo(x1, groundY - 0.5 * u);
      ctx.lineTo(x1, H);
      ctx.closePath();
      ctx.fill();
      // 강변도로 (둔치 안쪽)
      const ra = riverBefore ? x0 + taper : x0;
      const rb = riverAfter ? x1 - taper : x1;
      if (rb > ra) {
        ctx.fillStyle = pal.road;
        ctx.fillRect(ra, groundY - 1.6 * u, rb - ra, 1.2 * u);
        ctx.fillStyle = mix(pal.concrete, pal.haze, 0.2);
        ctx.fillRect(ra, groundY - 0.45 * u, rb - ra, 0.45 * u);
      }
    }
  }

  // 건물
  forCells(f, s, 34, 140, 1301, (m, r) => {
    const anchor = m + r() * 10;
    const sec = sectionAtM(f, anchor);
    const land = landOf(sec, "mid");
    if (land === "river" || land === "none") return;
    const roll = r();
    const bank = land === "bank";
    if (bank && roll < 0.35) return;
    const x = sx(f, anchor, s);
    const base = bank ? groundY - 1.7 * u : groundY + 0.6 * u;
    const seed = Math.floor(r() * 64);
    // 동네 분위기별 구성: 아파트 비율, 크기
    const style = bank ? "residential" : (sec.style ?? "residential");
    if (style === "rural") {
      // 교외: 넓은 밭 사이로 비닐하우스와 낮은 집이 드문드문
      if (roll < 0.45) return;
      if (roll < 0.8) {
        const gw = (14 + r() * 10) * u;
        const gh = 3.4 * u;
        const sp = f.sprites.get(`gh:${(gw / u) | 0}:${pal.key}:${u.toFixed(2)}`, gw, gh, (c) => drawGreenhouse(c, gw, gh, pal));
        ctx.drawImage(sp.img, x, base - gh, sp.w, sp.h);
      } else {
        const hs = shopSpec(seed, u * 0.8, pal);
        const sp = f.sprites.get(`house:${seed}:${pal.key}:${u.toFixed(2)}`, hs.w, hs.h, (c) => drawShop(c, { ...hs, floors: 2, kind: "villa" }, pal, u * 0.8));
        ctx.drawImage(sp.img, x, base - hs.h, sp.w, sp.h);
      }
      return;
    }
    const aptRatio = bank ? 0.95 : { residential: 0.66, highrise: 0.82, office: 0.22, brick: 0.4 }[style];
    const aptScale = bank ? 0.82 : style === "highrise" ? 1.32 : 1;
    if (style === "brick" && roll > 0.75) return; // 성수: 낮은 건물 사이로 하늘이 트인다
    if (roll < aptRatio) {
      const spec = apartmentSpec(seed, u, pal, aptScale);
      if (x > f.W + 10 || x + spec.w < -10) return;
      const sp = f.sprites.get(`apt:${seed}:${aptScale}:${pal.key}:${u.toFixed(2)}`, spec.w, spec.h, (c) => drawApartment(c, spec, pal));
      ctx.fillStyle = pal.shade;
      ctx.fillRect(x + spec.w * 0.2, base - 0.4 * u, spec.w * 0.9, 0.8 * u);
      ctx.drawImage(sp.img, x, base - spec.h, sp.w, sp.h);
    } else {
      const tScale = style === "office" ? 1.08 : 0.85;
      const spec = towerSpec(seed, u, pal, tScale);
      if (x > f.W + 10 || x + spec.w < -10) return;
      const sp = f.sprites.get(`tower:${seed}:${tScale}:${pal.key}:${u.toFixed(2)}`, spec.w, spec.h, (c) => drawTower(c, spec, pal));
      ctx.drawImage(sp.img, x, base - spec.h, sp.w, sp.h);
    }
  });
  // 단지 사이 나무
  forCells(f, s, 9, 40, 1307, (m, r) => {
    const anchor = m + r() * 9;
    const land = landOf(sectionAtM(f, anchor), "mid");
    if (land === "river" || land === "none" || r() < 0.4) return;
    const seed = Math.floor(r() * 40);
    const w = (2.2 + r() * 1.6) * u;
    const h = w * 1.3;
    const x = sx(f, anchor, s);
    const base = land === "bank" ? groundY + 0.2 * u : groundY + 1.2 * u;
    const sp = f.sprites.get(`tree:${seed}:${pal.key}:${(w | 0)}`, w, h, (c, ww, hh) => drawTree(c, ww, hh, seed, pal));
    ctx.drawImage(sp.img, x - w / 2, base - h, w, h);
  });
  // 원근 연무
  ctx.globalAlpha = pal.hazeStrength * 0.18;
  ctx.fillStyle = pal.haze;
  for (const sp of spans(f, s, 20)) {
    if (landOf(sp.sec, "mid") === "city" || landOf(sp.sec, "mid") === "bank") ctx.fillRect(sp.xa, 20 * u, sp.xb - sp.xa, 48 * u);
  }
  ctx.globalAlpha = 1;
}

/* ═════════════════════════════ 근경: 상가·빌라·가로수·전신주 ═════════════════════════════ */

export function drawNear(f: Frame) {
  const { ctx, u, pal, H, time } = f;
  const s = SPEED.near;
  const streetY = 84 * u;
  for (const sp of spans(f, s, 20)) {
    const land = landOf(sp.sec);
    if (land === "city") {
      ctx.fillStyle = pal.ground;
      ctx.fillRect(sp.xa, streetY - 1 * u, sp.xb - sp.xa, H - streetY + u);
      ctx.fillStyle = pal.road;
      ctx.fillRect(sp.xa, streetY + 3 * u, sp.xb - sp.xa, 5 * u);
    } else if (sp.sec.kind === "river" && sp.sec.variant === "stream") {
      // 하천: 근경에 좁은 물길과 돌 호안
      const g = ctx.createLinearGradient(0, 74 * u, 0, H);
      g.addColorStop(0, pal.waterTop);
      g.addColorStop(1, pal.waterBottom);
      ctx.fillStyle = g;
      ctx.fillRect(sp.xa, 74 * u, sp.xb - sp.xa, H - 74 * u);
      ctx.fillStyle = mix(pal.concrete, pal.grass, 0.25);
      ctx.fillRect(sp.xa, 72.5 * u, sp.xb - sp.xa, 1.6 * u);
      ctx.fillStyle = pal.waterGlint;
      for (let k = 0; k < 24; k++) {
        const r = rng(hash2(k, 919));
        const m = sp.sec.x0 + r() * (sp.sec.x1 - sp.sec.x0);
        const x = sx(f, m, s);
        if (x < sp.xa || x > sp.xb) continue;
        const wob = 0.5 + 0.5 * Math.sin(f.time * (1.2 + r()) + k);
        ctx.globalAlpha = 0.25 + 0.4 * wob;
        ctx.fillRect(x, (76 + r() * 20) * u, (2 + r() * 5) * u * wob, Math.max(1, 0.25 * u));
      }
      ctx.globalAlpha = 1;
    } else if (land === "bank") {
      // 한강공원: 완만한 둔덕 잔디 + 자전거길
      ctx.fillStyle = pal.grass;
      ctx.beginPath();
      ctx.moveTo(sp.xa, H);
      const step = 8;
      for (let x = sp.xa; x <= sp.xb + step; x += step) {
        const m = mAt(f, Math.min(x, sp.xb), s);
        const edge = Math.min(m - sp.sec.x0, sp.sec.x1 - m);
        const rise = Math.min(1, Math.max(0, edge / 14));
        const y = (86 - 11 * rise * rise * (3 - 2 * rise) - fbm(m / 9, 5, 2) * 1.6) * u;
        ctx.lineTo(Math.min(x, sp.xb), y);
      }
      ctx.lineTo(sp.xb, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = mix(pal.concrete, "#FFFFFF", 0.3);
      ctx.fillRect(sp.xa, 80 * u, sp.xb - sp.xa, 2.4 * u);
      ctx.fillStyle = pal.night > 0.5 ? "#555A40" : "#F2D36B";
      const dash = 6 * u;
      const off = (((sx(f, 0, s)) % dash) + dash) % dash;
      for (let x = sp.xa - dash + ((off - sp.xa) % dash + dash) % dash; x < sp.xb; x += dash) {
        const a = Math.max(sp.xa, x);
        const b = Math.min(sp.xb, x + 2.4 * u);
        if (b > a) ctx.fillRect(a, 81.1 * u, b - a, 0.22 * u);
      }
    }
  }
  // 강 경계 (호안)
  for (const sp of spans(f, s, 20)) {
    if (sp.sec.kind !== "bank") continue;
    const river = landOf(sectionAtM(f, sp.sec.x0 - 1)) === "river";
    const edgeX = river ? sp.xa : sp.xb;
    if (edgeX > -20 && edgeX < f.W + 20) {
      ctx.fillStyle = mix(pal.concrete, pal.grass, 0.2);
      ctx.beginPath();
      if (river) {
        ctx.moveTo(edgeX, 74 * u);
        ctx.lineTo(edgeX - 4 * u, H);
        ctx.lineTo(edgeX + 1 * u, H);
        ctx.lineTo(edgeX + 1 * u, 74 * u);
      } else {
        ctx.moveTo(edgeX, 74 * u);
        ctx.lineTo(edgeX + 4 * u, H);
        ctx.lineTo(edgeX - 1 * u, H);
        ctx.lineTo(edgeX - 1 * u, 74 * u);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // 상가 건물
  forCells(f, s, 13, 120, 2203, (m, r) => {
    const anchor = m + r() * 2;
    const sec = sectionAtM(f, anchor);
    const land = landOf(sec);
    if (land !== "city" || r() < (sec.style === "office" ? 0.45 : sec.style === "rural" ? 0.8 : 0.18)) return;
    const seed = Math.floor(r() * 48);
    const x = sx(f, anchor, s);
    if (sec.style === "brick" && r() < 0.65) {
      // 성수동 붉은 벽돌 공장 · 창고 카페
      const fs = factorySpec(seed, u);
      if (x > f.W + 10 || x + fs.w < -10) return;
      const pad = 4 * u;
      const sp = f.sprites.get(`factory:${seed}:${pal.key}:${u.toFixed(2)}`, fs.w, fs.h + pad, (c) => {
        c.translate(0, pad);
        drawFactory(c, fs, pal, u);
      });
      ctx.drawImage(sp.img, x, streetY + 1.5 * u - fs.h - pad, sp.w, sp.h);
      return;
    }
    const spec = shopSpec(seed, u, pal);
    if (x > f.W + 10 || x + spec.w < -10) return;
    const pad = 2 * u;
    const sp = f.sprites.get(`shop:${seed}:${pal.key}:${u.toFixed(2)}`, spec.w, spec.h + pad, (c) => {
      c.translate(0, pad);
      drawShop(c, spec, pal, u);
    });
    const base = streetY + 1.5 * u;
    ctx.drawImage(sp.img, x, base - spec.h - pad, sp.w, sp.h);
    // 옥상 고양이 (가끔)
    if (seed % 11 === 3) drawCat(ctx, x + spec.w * 0.7, base - spec.h + 0.2 * u, u, pal);
  });

  // 가로수 / 공원 나무
  forCells(f, s, 7, 60, 2207, (m, r) => {
    const anchor = m + r() * 4;
    const land = landOf(sectionAtM(f, anchor));
    if (land === "river" || land === "none") return;
    if (r() < (land === "bank" ? 0.25 : sectionAtM(f, anchor).style === "rural" ? 0.2 : 0.55)) return;
    const seed = Math.floor(r() * 40);
    const w = (land === "bank" ? 5 + r() * 3 : 4 + r() * 2) * u;
    const h = w * (1.35 + r() * 0.2);
    const x = sx(f, anchor, s);
    const base = land === "bank" ? 77 * u + r() * 2 * u : streetY + 3 * u;
    const sp = f.sprites.get(`tree:${seed}:${pal.key}:${(w | 0)}`, w, h, (c, ww, hh) => drawTree(c, ww, hh, seed, pal));
    ctx.drawImage(sp.img, x - w / 2, base - h, w, h);
  });

  // 한강공원 자전거·산책하는 사람
  forCells(f, s, 23, 40, 2213, (m, r) => {
    const anchor = m + r() * 20;
    if (landOf(sectionAtM(f, anchor)) !== "bank" || r() < 0.4) return;
    const walk = f.reducedMotion ? 0 : time * (r() < 0.5 ? 1.2 : 4.5) * (r() < 0.5 ? -1 : 1);
    const x = sx(f, anchor + walk * 0.12, s);
    const seed = Math.floor(r() * 30);
    const h = 4.6 * u;
    const w = h * 0.55;
    const sp = f.sprites.get(`person:${seed}:${pal.key}:${(h | 0)}`, w, h, (c, ww, hh) => drawPerson(c, ww, hh, seed, pal));
    ctx.drawImage(sp.img, x, 81.2 * u - h, w, h);
  });

  // 전신주 + 전선
  const poleGap = 26;
  const [m0, m1] = visRange(f, s, 80);
  let prev: { x: number; y: number } | null = null;
  for (let m = Math.floor(m0 / poleGap) * poleGap; m <= m1; m += poleGap) {
    const land = landOf(sectionAtM(f, m));
    if (land !== "city") {
      prev = null;
      continue;
    }
    const x = sx(f, m, s);
    const top = 58 * u;
    ctx.fillStyle = pal.night > 0.5 ? "#5A5C66" : "#B9B4AA";
    ctx.fillRect(x - 0.35 * u, top, 0.7 * u, streetY - top + 3 * u);
    ctx.fillStyle = pal.night > 0.5 ? "#44464F" : "#8F8A80";
    ctx.fillRect(x - 2.2 * u, top + 1.2 * u, 4.4 * u, 0.45 * u);
    ctx.fillStyle = pal.night > 0.5 ? "#4C4F5A" : "#9FA3A8";
    rrect(ctx, x + 0.4 * u, top + 3 * u, 1.3 * u, 2 * u, 0.3 * u);
    ctx.fill();
    if (prev) {
      ctx.strokeStyle = pal.night > 0.5 ? "rgba(20,20,30,0.7)" : "rgba(60,60,60,0.55)";
      ctx.lineWidth = 1;
      for (const dy of [0, 0.8, 1.6]) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y + dy * u);
        ctx.quadraticCurveTo((prev.x + x) / 2, prev.y + (dy + 2.2) * u, x, top + 1.3 * u + dy * u);
        ctx.stroke();
      }
    }
    prev = { x, y: top + 1.3 * u };
  }
}

export function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pal: Palette) {
  ctx.fillStyle = pal.night > 0.5 ? "#4A4040" : "#F0B060";
  rrect(ctx, x, y - 1.2 * u, 1.8 * u, 1.2 * u, 0.5 * u);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 1.9 * u, y - 1.3 * u, 0.6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 1.45 * u, y - 1.6 * u);
  ctx.lineTo(x + 1.6 * u, y - 2.2 * u);
  ctx.lineTo(x + 1.85 * u, y - 1.75 * u);
  ctx.moveTo(x + 2.05 * u, y - 1.75 * u);
  ctx.lineTo(x + 2.3 * u, y - 2.2 * u);
  ctx.lineTo(x + 2.4 * u, y - 1.6 * u);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 0.25 * u;
  ctx.beginPath();
  ctx.moveTo(x, y - 0.6 * u);
  ctx.quadraticCurveTo(x - 1 * u, y - 1 * u, x - 0.6 * u, y - 2 * u);
  ctx.stroke();
}
