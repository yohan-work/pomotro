/** 창밖 장면 — 역 승강장 */
import { LINE_BY_ID, neighbors, type Station } from "../../data/lines";
import { hash2, pick } from "../rng";
import { drawPerson, mix, rrect, shadeColor } from "../sprites";
import { SPEED, type Frame, sx, spans, sectionAtM, forCells } from "./core";

/* ═════════════════════════════ 역 승강장 ═════════════════════════════ */

export function stationSign(f: Frame, station: Station, w: number, h: number) {
  const { pal } = f;
  const nb = neighbors(station.id);
  return f.sprites.get(`sign:${station.id}:${pal.key}:${w | 0}`, w, h, (c) => {
    c.fillStyle = "rgba(0,0,0,0.12)";
    rrect(c, 2, 3, w - 2, h - 2, h * 0.12);
    c.fill();
    c.fillStyle = "#FBFBF8";
    rrect(c, 0, 0, w - 2, h - 3, h * 0.12);
    c.fill();
    c.fillStyle = LINE_BY_ID[station.line].color;
    c.fillRect(0, h * 0.7, w - 2, h * 0.27);
    // 역번호 원
    c.beginPath();
    c.arc(h * 0.38, h * 0.36, h * 0.22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#FFFFFF";
    c.font = `700 ${h * 0.17}px Pretendard, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(station.code, h * 0.38, h * 0.37);
    c.fillStyle = "#252525";
    c.textAlign = "left";
    c.font = `800 ${h * 0.36}px Pretendard, sans-serif`;
    c.fillText(station.nameKo, h * 0.72, h * 0.3);
    c.fillStyle = "#6B6B6B";
    c.font = `600 ${h * 0.14}px Pretendard, sans-serif`;
    c.fillText(station.nameEn, h * 0.74, h * 0.56);
    c.fillStyle = "#FFFFFF";
    c.font = `600 ${h * 0.14}px Pretendard, sans-serif`;
    c.textAlign = "left";
    if (nb.prev) c.fillText(`‹ ${nb.prev.nameKo}`, h * 0.2, h * 0.84);
    c.textAlign = "right";
    if (nb.next) c.fillText(`${nb.next.nameKo} ›`, w - h * 0.2, h * 0.84);
  });
}

/** 지하역 실내 마감 — 역번호로 결정 (같은 역은 항상 같은 색) */
export const STATION_FINISH = [
  { wall: "#EDE7DA", lower: "#D9D1C0", pillar: ["#CFC6B5", "#F2ECE0", "#B5AC9C"], round: false },
  { wall: "#DFE6EA", lower: "#C9D3D9", pillar: ["#C3CDD3", "#EEF2F4", "#A9B4BA"], round: true },
  { wall: "#EADFCF", lower: "#D6C6AE", pillar: ["#D5C7B2", "#F4ECDF", "#BBAA92"], round: false },
  { wall: "#E0E8DF", lower: "#C8D4C6", pillar: ["#C7D2C5", "#EFF4EE", "#AAB8A8"], round: true },
  { wall: "#F0E3DC", lower: "#DCC8BE", pillar: ["#D9C6BC", "#F6EEE9", "#BFAA9F"], round: false },
];
export function finishOf(st: Station) {
  return STATION_FINISH[hash2(Number(st.code) || 0, 31) % STATION_FINISH.length];
}

export function drawPlatformBack(f: Frame) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.platformBack;
  for (const sp of spans(f, s, 30)) {
    const { sec } = sp;
    const w = sp.xb - sp.xa;
    if (w <= 0) continue;
    if (sec.kind === "tunnel" || (sec.kind === "platform" && sec.station!.structure === "underground")) {
      if (sec.kind === "tunnel") {
        ctx.fillStyle = "#151413";
        ctx.fillRect(sp.xa, 0, w, H);
        continue;
      }
      // 지하 승강장: 천장 / 타일 벽 / 바닥
      const g = ctx.createLinearGradient(0, 0, 0, 13 * u);
      g.addColorStop(0, "#5B5A57");
      g.addColorStop(1, "#7A7873");
      ctx.fillStyle = g;
      ctx.fillRect(sp.xa, 0, w, 13 * u);
      const fin = finishOf(sec.station!);
      ctx.fillStyle = fin.wall;
      ctx.fillRect(sp.xa, 13 * u, w, 66 * u);
      ctx.fillStyle = LINE_BY_ID[sec.station!.line].color;
      ctx.fillRect(sp.xa, 50 * u, w, 2.2 * u);
      ctx.fillStyle = fin.lower;
      ctx.fillRect(sp.xa, 52.2 * u, w, 26.8 * u);
      // 타일 줄눈
      ctx.strokeStyle = "rgba(120,110,95,0.1)";
      ctx.lineWidth = 1;
      const tile = 1.3 * s * u;
      const off = ((f.cam * s * u) % tile + tile) % tile;
      ctx.beginPath();
      for (let x = sp.xa - off + (sp.xa % tile); x < sp.xb; x += tile) {
        ctx.moveTo(x, 13 * u);
        ctx.lineTo(x, 79 * u);
      }
      for (let y = 13 * u; y < 79 * u; y += tile) {
        ctx.moveTo(sp.xa, y);
        ctx.lineTo(sp.xb, y);
      }
      ctx.stroke();
      // 천장 조명
      ctx.fillStyle = "#FFF8E6";
      ctx.fillRect(sp.xa, 10.5 * u, w, 1 * u);
      // 바닥
      ctx.fillStyle = "#B9B3A8";
      ctx.fillRect(sp.xa, 79 * u, w, H - 79 * u);
      // 승강장 끝 벽
      for (const edge of [sec.x0, sec.x1]) {
        const ex = sx(f, edge, s);
        if (ex > sp.xa - 2 && ex < sp.xb + 2) {
          ctx.fillStyle = "#3A3936";
          ctx.fillRect(ex - (edge === sec.x0 ? 0 : 1.2 * u), 0, 1.2 * u, H);
        }
      }
    } else if (sec.kind === "platform") {
      // 고가 승강장: 지붕 + 낮은 벽 + 바닥 (그 사이로 바깥이 보인다)
      ctx.fillStyle = shadeColor(pal.concrete, -0.25);
      ctx.fillRect(sp.xa, 0, w, 11 * u);
      ctx.fillStyle = pal.night > 0.4 ? "#FFF1C8" : "#F6F2EA";
      ctx.fillRect(sp.xa, 9.6 * u, w, 0.8 * u);
      ctx.fillStyle = mix("#DDE8E6", pal.haze, 0.2);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(sp.xa, 63 * u, w, 15 * u);
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.steelDark;
      ctx.fillRect(sp.xa, 62.5 * u, w, 0.7 * u);
      ctx.fillStyle = mix(pal.concrete, "#FFFFFF", 0.25);
      ctx.fillRect(sp.xa, 78 * u, w, H - 78 * u);
    }
  }

  // 역명판, 광고, 기둥, 벤치
  forCells(f, s, 46, 200, 3301, (m, r) => {
    const sec = sectionAtM(f, m + 23);
    if (sec.kind !== "platform") return;
    if (m + 23 < sec.x0 + 8 || m + 23 > sec.x1 - 8) return;
    const x = sx(f, m + 23, s);
    const under = sec.station!.structure === "underground";
    const sw = 30 * u;
    const sh = 11 * u;
    const sign = stationSign(f, sec.station!, sw, sh);
    ctx.drawImage(sign.img, x - sw / 2, under ? 24 * u : 12.5 * u, sign.w, sign.h);
    if (!under) {
      ctx.fillStyle = shadeColor(pal.concrete, -0.35);
      ctx.fillRect(x - sw * 0.3, 11 * u, 0.3 * u, 1.5 * u);
      ctx.fillRect(x + sw * 0.3, 11 * u, 0.3 * u, 1.5 * u);
    } else {
      // 광고판 (마스코트 포스터)
      const px = x + 22 * u;
      const pw = 13 * u;
      const ph = 17 * u;
      ctx.fillStyle = "#C7C0B2";
      rrect(ctx, px - 0.6 * u, 21.4 * u, pw + 1.2 * u, ph + 1.2 * u, 0.6 * u);
      ctx.fill();
      ctx.fillStyle = pick(["#F4D9B8", "#D8E8DC", "#E6DDF0", "#F6E3A6"], r());
      ctx.fillRect(px, 22 * u, pw, ph);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(px + pw / 2, 22 * u + ph * 0.45, pw * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3A302C";
      ctx.beginPath();
      ctx.arc(px + pw * 0.42, 22 * u + ph * 0.42, 0.35 * u, 0, Math.PI * 2);
      ctx.arc(px + pw * 0.58, 22 * u + ph * 0.42, 0.35 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2E946B";
      ctx.fillRect(px + pw * 0.2, 22 * u + ph * 0.8, pw * 0.6, 0.6 * u);
      // 벤치
      const bx = x - 24 * u;
      ctx.fillStyle = "#8A6E58";
      rrect(ctx, bx, 70 * u, 14 * u, 2 * u, 0.6 * u);
      ctx.fill();
      ctx.fillStyle = "#6D6A66";
      ctx.fillRect(bx + 1.5 * u, 72 * u, 0.7 * u, 6 * u);
      ctx.fillRect(bx + 11.8 * u, 72 * u, 0.7 * u, 6 * u);
    }
  });
  // 고가역 지붕 기둥
  forCells(f, s, 12, 30, 3307, (m) => {
    const sec = sectionAtM(f, m);
    if (sec.kind !== "platform" || sec.station!.structure !== "elevated") return;
    const x = sx(f, m, s);
    ctx.fillStyle = pal.steelDark;
    ctx.fillRect(x - 0.8 * u, 10 * u, 1.6 * u, 68 * u);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x - 0.8 * u, 10 * u, 0.5 * u, 68 * u);
  });
}

export function drawPlatformFront(f: Frame) {
  const { ctx, u, pal, time } = f;
  const s = SPEED.platform;
  // 기둥 (지하)
  forCells(f, s, 17, 40, 3401, (m) => {
    const sec = sectionAtM(f, m);
    if (sec.kind !== "platform" || sec.station!.structure !== "underground") return;
    if (m < sec.x0 + 4 || m > sec.x1 - 4) return;
    const x = sx(f, m, s);
    const fin = finishOf(sec.station!);
    const w = (fin.round ? 4.4 : 5) * u;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, fin.pillar[0]);
    g.addColorStop(fin.round ? 0.3 : 0.35, fin.pillar[1]);
    g.addColorStop(1, fin.pillar[2]);
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, 0, w, f.H);
    if (!fin.round) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(x + w * 0.18, 0, 1, f.H);
    }
    ctx.fillStyle = LINE_BY_ID[sec.station!.line].color;
    ctx.fillRect(x - w / 2, 46 * u, w, 1.4 * u);
  });
  // 기다리는 사람들
  forCells(f, s, 7, 40, 3409, (m, r) => {
    const anchor = m + r() * 4;
    const sec = sectionAtM(f, anchor);
    if (sec.kind !== "platform" || anchor < sec.x0 + 5 || anchor > sec.x1 - 5) return;
    if (r() < 0.55) return;
    const seed = Math.floor(r() * 40);
    const h = (30 + r() * 6) * u;
    const w = h * 0.5;
    const x = sx(f, anchor, s);
    if (x < -w || x > f.W + w) return;
    const bob = f.reducedMotion ? 0 : Math.sin(time * 1.4 + seed) * 0.25 * u;
    const sp = f.sprites.get(`person:${seed}:${pal.key}:${(h | 0)}`, w, h, (c, ww, hh) => drawPerson(c, ww, hh, seed, pal));
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, 97 * u, w * 0.45, 1 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sp.img, x, 97 * u - h + bob, w, h - bob);
  });
}
