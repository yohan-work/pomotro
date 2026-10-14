/**
 * 창밖 2.5D 패럴랙스 장면.
 *
 * 좌표계
 * - 트랙 좌표 m (시뮬레이션 미터). 카메라(창 중앙)는 열차 위치 `cam`.
 * - 레이어마다 시차 계수 s 를 가진다: 화면 x = W/2 + (m − cam) · s · u   (u = 창 높이의 1%)
 *   → 열차가 +m 로 달리면 풍경은 오른쪽 → 왼쪽으로 흐른다 (서쪽 창 기준, 열차는 북쪽 진행).
 * - 각 레이어의 오브젝트는 트랙 좌표 셀 단위로 결정론적으로 생성된다. 같은 위치에는 항상 같은 풍경.
 * - 오브젝트가 무엇인지(시가지/둔치/강/터널/역)는 그 오브젝트의 앵커 m 이 속한 연출 구간이 결정한다.
 *   느린 레이어일수록 넓은 트랙 범위를 비추므로 구간 전환이 레이어별로 자연스럽게 엇갈린다.
 */
import { neighbors, type Station } from "../data/line2";
import { sectionsInRange, type Journey, type Section } from "../sim/journey";
import type { Palette } from "./palette";
import { FAR_ART, type FarArt } from "./art";
import { fbm, hash2, pick, rng } from "./rng";
import {
  apartmentSpec,
  drawApartment,
  drawCloud,
  drawPerson,
  drawFactory,
  drawShop,
  drawTower,
  factorySpec,
  drawTree,
  mix,
  rrect,
  shadeColor,
  shopSpec,
  towerSpec,
  type SpriteCache,
} from "./sprites";

/** 레이어 시차 계수 (u / m) */
export const SPEED = {
  cloud: 0.004,
  mountainFar: 0.014,
  mountainNear: 0.028,
  skyline: 0.075,
  island: 0.24,
  yanghwa: 0.42,
  mid: 0.62,
  near: 1.55,
  platformBack: 2.3,
  platform: 3.0,
  track: 4.2,
  fore: 7.2,
} as const;

/** 수평선 (u) */
const HZ = 47;
/** 수면 시작 (u) */
const WATER_Y = 51;

export interface Frame {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  u: number;
  cam: number;
  v: number;
  time: number;
  pal: Palette;
  journey: Journey;
  sprites: SpriteCache;
  quality: number;
  /** 스크린도어 열림 0..1 */
  doorOpen: number;
  /** 0 = 실외 밝기, 1 = 터널 안 (창 반사 강도) */
  darkness: number;
  /** 0..1 해가 창 방향에 있는지 (서향 창일 때만 노을 해가 보인다) */
  sunAlpha: number;
  reducedMotion: boolean;
  /** 반사 등 중간 합성용 오프스크린 캔버스 */
  scratch?: HTMLCanvasElement;
  /** 필름 그레인 패턴 */
  grain?: CanvasPattern | null;
  /** 원경 판을 그렸다면 그 안의 해 위치 (물 위 반사 정렬용) */
  sunScreenX?: number;
  /** 원경 판 모드: 물 색을 판에서 가져오고 중경을 역광 실루엣으로 */
  plate?: { water: [string, string] };
}

type Land = "city" | "bank" | "river" | "none";

function landOf(sec: Section, layer: "mid" | "near" = "near"): Land {
  switch (sec.kind) {
    case "river":
      // 좁은 하천은 중경에서는 건너편 둑(강변도로·아파트)이 바로 보인다
      if (sec.variant === "stream" && layer === "mid") return "bank";
      return "river";
    case "bank":
      return "bank";
    case "tunnel":
      return "none";
    case "platform":
      return sec.station!.structure === "elevated" ? "city" : "none";
    default:
      return "city";
  }
}

const sx = (f: Frame, m: number, s: number) => f.W / 2 + (m - f.cam) * s * f.u;
const mAt = (f: Frame, x: number, s: number) => f.cam + (x - f.W / 2) / (s * f.u);

function visRange(f: Frame, s: number, marginPx: number): [number, number] {
  const half = (f.W / 2 + marginPx) / (s * f.u);
  return [f.cam - half, f.cam + half];
}

interface Span {
  sec: Section;
  xa: number;
  xb: number;
}

/** 레이어 s 에서 보이는 연출 구간들의 화면 x 구간 */
function spans(f: Frame, s: number, margin = 0): Span[] {
  const [m0, m1] = visRange(f, s, margin);
  return sectionsInRange(f.journey, m0, m1).map((sec) => ({
    sec,
    xa: Math.max(-margin, sx(f, sec.x0, s)),
    xb: Math.min(f.W + margin, sx(f, sec.x1, s)),
  }));
}

function sectionAtM(f: Frame, m: number): Section {
  const s = f.journey.sections;
  if (m < s[0].x0) return s[0];
  for (let i = s.length - 1; i >= 0; i--) if (s[i].x0 <= m) return s[i];
  return s[0];
}

/** 셀 단위 결정론적 반복 */
function forCells(f: Frame, s: number, cell: number, margin: number, seed: number, fn: (m: number, r: () => number, idx: number) => void) {
  const [m0, m1] = visRange(f, s, margin);
  const i0 = Math.floor(m0 / cell);
  const i1 = Math.ceil(m1 / cell);
  for (let i = i0; i <= i1; i++) fn(i * cell, rng(hash2(i, seed)), i);
}

/* ═════════════════════════════ 하늘 ═════════════════════════════ */

/**
 * 사진 하늘 — Poly Haven CC0 "pure sky" 파노라마에서 수평선~40° 띠를 잘라 쓴다 (public/sky, docs/credits 참고).
 * 360° 띠라 좌우가 이어진다. sunU 는 사진 속 해가 있는 가로 위치(0..1).
 */
const SKY_PHOTO: Record<Palette["key"], { src: string; sunU: number }> = {
  day: { src: "/sky/day.webp", sunU: 0.5754 },
  sunset: { src: "/sky/sunset.webp", sunU: 0.5378 },
  night: { src: "/sky/night.webp", sunU: 0.5706 },
};
const skyImages = new Map<string, HTMLImageElement>();

function skyPhoto(key: Palette["key"]): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = skyImages.get(key);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = SKY_PHOTO[key].src;
    skyImages.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

const farImages = new Map<string, HTMLImageElement>();
const plateWater = new Map<string, [string, string]>();

/** 판의 수평선 근처 색으로 물빛을 정한다 (위: 밝은 반사, 아래: 깊은 물) */
function samplePlateWater(img: HTMLImageElement, art: FarArt): [string, string] {
  const hit = plateWater.get(art.src);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 1;
  const cx = c.getContext("2d")!;
  cx.drawImage(img, 0, art.horizonRow - 40, art.size[0], 30, 0, 0, 32, 1);
  const d = cx.getImageData(0, 0, 32, 1).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  const top = `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`;
  const deep = `rgb(${(r / n * 0.38) | 0},${(g / n * 0.34) | 0},${(b / n * 0.4) | 0})`;
  const out: [string, string] = [top, deep];
  plateWater.set(art.src, out);
  return out;
}
function farPlate(key: Palette["key"]): { img: HTMLImageElement; art: FarArt } | null {
  const art = FAR_ART[key];
  if (!art || typeof Image === "undefined") return null;
  let img = farImages.get(art.src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = art.src;
    farImages.set(art.src, img);
  }
  return img.complete && img.naturalWidth > 0 ? { img, art } : null;
}

/**
 * 원경 판(생성 이미지): 수면 경계를 WATER_Y 에 맞추고, 창 폭을 덮도록 확대한다.
 * 먼 풍경은 거의 움직이지 않으므로 고정하고, 해를 노을 해 위치 근처에 맞춘다.
 */
function drawFarPlate(f: Frame, img: HTMLImageElement, art: FarArt): void {
  const { ctx, W, u, pal } = f;
  const [iw] = art.size;
  const scale = Math.max((W * 1.04) / iw, (WATER_Y * u) / art.horizonRow);
  const pw = iw * scale;
  const top = WATER_Y * u - art.horizonRow * scale;
  const want = pal.sun.x * W - art.sunU * pw;
  const x = Math.min(0, Math.max(W - pw, want));
  // 판 위쪽이 창 위보다 아래면 판의 첫 행 색으로 하늘을 이어 칠한다
  if (top > 0) {
    ctx.drawImage(img, 0, 0, iw, 2, x, 0, pw, top + 2);
  }
  ctx.drawImage(img, x, top, pw, art.size[1] * scale);
  f.sunScreenX = x + art.sunU * pw;
  f.plate = { water: samplePlateWater(img, art) };
}

/** 사진 띠를 창에 맞춰 그린다: 띠 아래쪽 = 수평선, 창 위쪽까지 약 25°가 보인다 */
function drawSkyPhoto(f: Frame, img: HTMLImageElement): void {
  const { ctx, W, u, pal, time } = f;
  const bandH = (HZ * u) / 0.62;
  const bandW = bandH * (img.naturalWidth / img.naturalHeight);
  const top = HZ * u - bandH + 1.5 * u;
  // 서향 창: 사진 속 해를 노을 해 위치에 맞춘다. 동향 창(sunAlpha→0): 해 반대편 하늘
  const anchorU = SKY_PHOTO[pal.key].sunU + (1 - f.sunAlpha) * 0.5;
  const drift = f.reducedMotion ? 0 : time * 1.1;
  let x0 = pal.sun.x * W - anchorU * bandW - drift;
  x0 = (((x0 % bandW) + bandW) % bandW) - bandW;
  for (let x = x0; x < W; x += bandW) ctx.drawImage(img, x, top, bandW + 1, bandH);
  // 화면 톤과 맞추기: 살짝 파스텔로
  ctx.globalAlpha = pal.key === "night" ? 0.08 : 0.16;
  ctx.fillStyle = pal.haze;
  ctx.fillRect(0, 0, W, (HZ + 6) * u);
  ctx.globalAlpha = 1;
}

function drawSky(f: Frame) {
  const { ctx, W, H, u, pal } = f;
  const photo = skyPhoto(pal.key);
  if (photo) {
    drawSkyPhoto(f, photo);
    return;
  }
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
    if (r() < 0.3) continue;
    const cw = (10 + r() * 24) * u;
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

/* ═════════════════════════════ 원경: 산·스카이라인 ═════════════════════════════ */

function ridge(f: Frame, s: number, seed: number, base: number, amp: number, color: string) {
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

function drawFar(f: Frame) {
  const { ctx, W, u, pal } = f;
  ridge(f, SPEED.mountainFar, 11, HZ + 0.5, 17, mix(pal.mountainFar, pal.haze, 0.3));
  ridge(f, SPEED.mountainNear, 23, HZ + 1, 10, mix(pal.mountainNear, pal.haze, 0.18));

  // 원경 시가지 (강 건너 / 멀리 보이는 아파트 숲)
  const s = SPEED.skyline;
  forCells(f, s, 40, 60, 501, (m, r) => {
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

/* ═════════════════════════════ 한강 ═════════════════════════════ */

function riverNearby(f: Frame): boolean {
  const [m0, m1] = visRange(f, SPEED.mid * 0.6, 200);
  return sectionsInRange(f.journey, m0, m1).some(
    (s) => (s.kind === "river" && s.variant !== "stream") || (s.kind === "bank" && !nearStream(f, s)),
  );
}

/** 하천 옆 둔치인지 (한강 둔치가 아니면 큰 수면을 그리지 않는다) */
function nearStream(f: Frame, bank: Section): boolean {
  const a = sectionAtM(f, bank.x0 - 1);
  const b = sectionAtM(f, bank.x1 + 1);
  return (a.kind === "river" && a.variant === "stream") || (b.kind === "river" && b.variant === "stream");
}

function drawWater(f: Frame) {
  const { ctx, W, H, u, pal, time } = f;
  const y0 = WATER_Y * u;
  const [wTop, wBot] = f.plate?.water ?? [pal.waterTop, pal.waterBottom];
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, wTop);
  g.addColorStop(0.35, mix(wTop, wBot, 0.55));
  g.addColorStop(1, wBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);

  // 하늘·원경 반사: 이미 그려진 수면 위 장면을 오프스크린에 한 번 복사한 뒤,
  // 물결에 따라 흔들리는 가로 띠로 뒤집어 붙인다. 수평선 쪽일수록 진하게(프레넬).
  {
    const T = ctx.getTransform();
    const cv = ctx.canvas;
    const srcTop = Math.max(0, T.d * ((HZ - 30) * u) + T.f);
    const srcBot = T.d * ((WATER_Y - 0.4) * u) + T.f;
    const sh = Math.floor(srcBot - srcTop);
    const sc = f.scratch;
    if (sh > 4 && sc) {
      if (sc.width !== cv.width || sc.height < sh) {
        sc.width = cv.width;
        sc.height = sh;
      }
      const sctx = sc.getContext("2d")!;
      sctx.clearRect(0, 0, sc.width, sc.height);
      sctx.drawImage(cv, 0, srcTop, cv.width, sh, 0, 0, cv.width, sh);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dstTop = T.d * y0 + T.f;
      const dstBot = T.d * H + T.f;
      const span = dstBot - dstTop;
      const strip = Math.max(2, Math.round(3 * T.d));
      for (let y = 0; y < span; y += strip) {
        const d = y / span;
        // 아래로 갈수록(가까울수록) 반사가 엷어지고 물결 흔들림이 커진다
        const srcY = sh - 1 - Math.min(sh - 1, y * (sh / span) * 1.15);
        const wob = f.reducedMotion ? 0 : Math.sin(y * 0.09 + time * 1.6) * (1 + d * 7) * T.a + Math.sin(y * 0.31 - time * 2.3) * d * 3 * T.a;
        ctx.globalAlpha = 0.62 * (1 - d) ** 1.3 + 0.08;
        ctx.drawImage(sc, 0, srcY, sc.width, 1, wob, dstTop + y, cv.width, strip);
      }
      ctx.restore();
      // 물빛으로 살짝 덮어 반사가 물속에 잠긴 느낌
      const tint = ctx.createLinearGradient(0, y0, 0, H);
      tint.addColorStop(0, "rgba(0,0,0,0)");
      tint.addColorStop(1, wBot);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = tint;
      ctx.fillRect(0, y0, W, H - y0);
      ctx.globalAlpha = 1;
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
    const cx = f.sunScreenX ?? pal.sun.x * W;
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
function drawIsland(f: Frame, river: Section) {
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
function drawYanghwa(f: Frame, river: Section) {
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
  // 원경 판(해를 마주 보는 역광)에서는 어두운 실루엣
  const col = f.plate ? "#4a3b34" : mix("#C8D3CC", pal.haze, 0.15);
  const colDark = f.plate ? "#2e2420" : shadeColor(col, pal.night > 0.5 ? -0.55 : -0.25);
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
  ctx.strokeStyle = f.plate ? "#3d322d" : mix(pal.steel, "#C9D8CF", 0.3);
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
    if (f.plate) {
      // 역광 속 차량: 어두운 몸체 + 작은 전조등/미등
      ctx.fillStyle = "#2a221f";
      rrect(ctx, x, deckTop - 1.1 * u, cw, 1.1 * u, 0.4 * u);
      ctx.fill();
      ctx.fillStyle = dir > 0 ? "rgba(255,235,190,0.9)" : "rgba(255,110,80,0.85)";
      ctx.fillRect(dir > 0 ? x + cw - 1.5 : x, deckTop - 0.7 * u, 1.5, 0.3 * u);
      continue;
    }
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
function drawBoat(f: Frame, river: Section) {
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
function drawBirds(f: Frame) {
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
function drawLotteTower(f: Frame, river: Section) {
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
function drawOlympicBridge(f: Frame, river: Section) {
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

/* ═════════════════════════════ 중경: 아파트 단지·빌딩 ═════════════════════════════ */

function drawMid(f: Frame) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.mid;
  const groundY = 64 * u;
  // 지면 띠
  for (const sp of spans(f, s, 20)) {
    const land = landOf(sp.sec, "mid");
    if (land === "city") {
      ctx.fillStyle = mix(pal.groundFar, pal.haze, 0.2);
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

function drawNear(f: Frame) {
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
    if (land !== "city" || r() < (sec.style === "office" ? 0.45 : 0.18)) return;
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
    if (r() < (land === "bank" ? 0.25 : 0.55)) return;
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

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pal: Palette) {
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

/* ═════════════════════════════ 역 승강장 ═════════════════════════════ */

function stationSign(f: Frame, station: Station, w: number, h: number) {
  const { pal } = f;
  const nb = neighbors(station.id);
  return f.sprites.get(`sign:${station.id}:${pal.key}:${w | 0}`, w, h, (c) => {
    c.fillStyle = "rgba(0,0,0,0.12)";
    rrect(c, 2, 3, w - 2, h - 2, h * 0.12);
    c.fill();
    c.fillStyle = "#FBFBF8";
    rrect(c, 0, 0, w - 2, h - 3, h * 0.12);
    c.fill();
    c.fillStyle = "#2E946B";
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
    c.fillText(`‹ ${nb.prev.nameKo}`, h * 0.2, h * 0.84);
    c.textAlign = "right";
    c.fillText(`${nb.next.nameKo} ›`, w - h * 0.2, h * 0.84);
  });
}

/** 지하역 실내 마감 — 역번호로 결정 (같은 역은 항상 같은 색) */
const STATION_FINISH = [
  { wall: "#EDE7DA", lower: "#D9D1C0", pillar: ["#CFC6B5", "#F2ECE0", "#B5AC9C"], round: false },
  { wall: "#DFE6EA", lower: "#C9D3D9", pillar: ["#C3CDD3", "#EEF2F4", "#A9B4BA"], round: true },
  { wall: "#EADFCF", lower: "#D6C6AE", pillar: ["#D5C7B2", "#F4ECDF", "#BBAA92"], round: false },
  { wall: "#E0E8DF", lower: "#C8D4C6", pillar: ["#C7D2C5", "#EFF4EE", "#AAB8A8"], round: true },
  { wall: "#F0E3DC", lower: "#DCC8BE", pillar: ["#D9C6BC", "#F6EEE9", "#BFAA9F"], round: false },
];
function finishOf(st: Station) {
  return STATION_FINISH[hash2(Number(st.code) || 0, 31) % STATION_FINISH.length];
}

function drawPlatformBack(f: Frame) {
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
      ctx.fillStyle = "#2E946B";
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

function drawPlatformFront(f: Frame) {
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
    ctx.fillStyle = "#2E946B";
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

/* ═════════════════════════════ 선로 구조물 (방음벽 / 트러스 / 스크린도어 / 옹벽 / 터널) ═════════════════════════════ */

function drawTrack(f: Frame) {
  const { ctx, u, pal, H, W } = f;
  const s = SPEED.track;
  const out = spans(f, s, 40);

  for (const sp of out) {
    const { sec } = sp;
    const w = sp.xb - sp.xa;
    if (w <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sp.xa, 0, w, H);
    ctx.clip();
    switch (sec.kind) {
      case "city":
        drawNoiseBarrier(f, sp);
        drawCatenaryWire(f, sp);
        break;
      case "bank":
      case "river":
        drawTruss(f, sp);
        drawCatenaryWire(f, sp);
        break;
      case "platform":
        drawScreenDoors(f, sp);
        break;
      case "portal-in":
      case "portal-out":
        drawPortal(f, sp);
        break;
      case "tunnel":
        drawTunnel(f, sp);
        break;
    }
    ctx.restore();
  }
  void W;
  void pal;
}

function drawCatenaryWire(f: Frame, sp: Span) {
  const { ctx, u } = f;
  ctx.fillStyle = "rgba(40,40,40,0.75)";
  ctx.fillRect(sp.xa, 2.2 * u, sp.xb - sp.xa, Math.max(1, 0.18 * u));
  ctx.fillRect(sp.xa, 5.4 * u, sp.xb - sp.xa, Math.max(1, 0.22 * u));
  const step = 6;
  const [m0] = visRange(f, SPEED.track, 40);
  for (let m = Math.floor(m0 / step) * step; ; m += step) {
    const x = sx(f, m, SPEED.track);
    if (x > sp.xb) break;
    if (x < sp.xa) continue;
    ctx.fillRect(x, 2.2 * u, 1, 3.2 * u);
  }
}

function drawNoiseBarrier(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const top = 77 * u;
  // 투명 방음벽 유리
  ctx.fillStyle = "rgba(200,225,230,0.16)";
  ctx.fillRect(sp.xa, top, sp.xb - sp.xa, H - top);
  // 조류 충돌 방지 점 패턴
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const dot = 0.16 * s * u;
  const off = ((-f.cam * s * u) % dot + dot) % dot;
  for (let x = sp.xa + off; x < sp.xb; x += dot) {
    for (let y = top + 2 * u; y < 90 * u; y += 2.4 * u) ctx.fillRect(x, y, Math.max(1, 0.18 * u), Math.max(1, 0.18 * u));
  }
  // 콘크리트 난간
  ctx.fillStyle = pal.concrete;
  ctx.fillRect(sp.xa, 91 * u, sp.xb - sp.xa, H - 91 * u);
  ctx.fillStyle = shadeColor(pal.concrete, 0.2);
  ctx.fillRect(sp.xa, 91 * u, sp.xb - sp.xa, 0.6 * u);
  // 지주 (6m 간격)
  const step = 6;
  const [m0, m1] = visRange(f, s, 40);
  for (let m = Math.floor(m0 / step) * step; m <= m1; m += step) {
    const x = sx(f, m, s);
    if (x < sp.xa - 10 || x > sp.xb + 10) continue;
    ctx.fillStyle = pal.steelDark;
    ctx.fillRect(x - 0.7 * u, top - 0.5 * u, 1.4 * u, H - top);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x - 0.7 * u, top - 0.5 * u, 0.35 * u, H - top);
  }
  ctx.fillStyle = pal.steel;
  ctx.fillRect(sp.xa, top - 0.9 * u, sp.xb - sp.xa, 1 * u);
}

function drawTruss(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const top = 80 * u;
  const chord = 3.2 * u;
  const panel = 7;
  const [m0, m1] = visRange(f, s, 60);
  const memberW = 0.22 * s * u;
  // 사재 (와렌 트러스)
  ctx.fillStyle = pal.steelDark;
  for (let m = Math.floor(m0 / panel) * panel; m <= m1; m += panel) {
    const i = Math.round(m / panel);
    const xa = sx(f, m, s);
    const xb = sx(f, m + panel, s);
    if (xb < sp.xa - 40 || xa > sp.xb + 40) continue;
    ctx.beginPath();
    if (i % 2 === 0) {
      ctx.moveTo(xa, top + chord);
      ctx.lineTo(xa + memberW, top + chord);
      ctx.lineTo(xb, H);
      ctx.lineTo(xb - memberW, H);
    } else {
      ctx.moveTo(xa, H);
      ctx.lineTo(xa + memberW, H);
      ctx.lineTo(xb, top + chord);
      ctx.lineTo(xb - memberW, top + chord);
    }
    ctx.closePath();
    ctx.fill();
  }
  // 수직재
  for (let m = Math.floor(m0 / panel) * panel; m <= m1; m += panel) {
    const x = sx(f, m, s);
    if (x < sp.xa - 40 || x > sp.xb + 40) continue;
    ctx.fillStyle = pal.steel;
    ctx.fillRect(x - memberW * 0.6, top, memberW * 1.2, H - top);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - memberW * 0.6, top, memberW * 0.35, H - top);
    // 리벳
    ctx.fillStyle = shadeColor(pal.steelDark, -0.2);
    for (let y = top + chord + 1.5 * u; y < H; y += 2.2 * u) {
      ctx.beginPath();
      ctx.arc(x, y, 0.22 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 상현재
  const g = ctx.createLinearGradient(0, top, 0, top + chord);
  g.addColorStop(0, shadeColor(pal.steel, 0.2));
  g.addColorStop(1, pal.steelDark);
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, top, sp.xb - sp.xa, chord);
}

function drawScreenDoors(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const sec = sp.sec;
  const under = sec.station!.structure === "underground";
  const module = 9;
  const doorW = 4.6;
  const [m0, m1] = visRange(f, s, 60);
  const transom = 9 * u;
  const kick = 90 * u;
  // 유리
  ctx.fillStyle = under ? "rgba(170,210,205,0.12)" : "rgba(190,225,225,0.14)";
  ctx.fillRect(sp.xa, transom, sp.xb - sp.xa, kick - transom);
  for (let m = Math.floor(m0 / module) * module; m <= m1; m += module) {
    if (m < sec.x0 - module || m > sec.x1) continue;
    const xPanel = sx(f, m, s);
    const xDoor = sx(f, m + (module - doorW), s);
    const xEnd = sx(f, m + module, s);
    if (xEnd < sp.xa - 40 || xPanel > sp.xb + 40) continue;
    // 유리 반사 사선
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(xPanel + 4 * u, kick);
    ctx.lineTo(xPanel + 10 * u, kick);
    ctx.lineTo(xPanel + 24 * u, transom);
    ctx.lineTo(xPanel + 18 * u, transom);
    ctx.closePath();
    ctx.fill();
    // 고정 패널 역명 스티커
    const i = Math.round(m / module);
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      const lw = Math.min(xDoor - xPanel - 2 * u, 15 * u);
      rrect(ctx, xPanel + 1.4 * u, 38 * u, lw, 5 * u, 1 * u);
      ctx.fill();
      ctx.fillStyle = "#2E946B";
      ctx.beginPath();
      ctx.arc(xPanel + 3.6 * u, 40.5 * u, 1.3 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#252525";
      ctx.font = `700 ${2.4 * u}px Pretendard, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(sec.station!.nameKo, xPanel + 5.6 * u, 40.6 * u);
    }
    // 문 (열림 애니메이션)
    const open = f.doorOpen;
    const leaf = (xEnd - xDoor) / 2;
    const slide = leaf * 0.92 * open;
    ctx.fillStyle = "rgba(110,120,125,0.5)";
    ctx.fillRect(xDoor - slide, transom, 0.5 * u, kick - transom);
    ctx.fillRect(xEnd - 0.5 * u + slide, transom, 0.5 * u, kick - transom);
    ctx.fillStyle = "rgba(90,100,105,0.6)";
    ctx.fillRect(xDoor + leaf - slide - 0.25 * u, transom, 0.5 * u, kick - transom);
    ctx.fillRect(xDoor + leaf + slide - 0.25 * u, transom, 0.5 * u, kick - transom);
    // 프레임 지주
    ctx.fillStyle = "#7E8A8C";
    ctx.fillRect(xPanel - 1.2 * u, transom, 2.4 * u, kick - transom);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(xPanel - 1.2 * u, transom, 0.5 * u, kick - transom);
    ctx.fillStyle = "#7E8A8C";
    ctx.fillRect(xDoor - 0.8 * u, transom, 1.6 * u, kick - transom);
    // 상부 안내 (승강장 번호)
    ctx.fillStyle = "#2E946B";
    rrect(ctx, xDoor + 1 * u, 3 * u, 6 * u, 3.4 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${2 * u}px Pretendard, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${((i % 10) + 10) % 10 + 1}-${(((i * 7) % 4) + 4) % 4 + 1}`, xDoor + 4 * u, 4.8 * u);
  }
  // 상부 트랜섬
  ctx.fillStyle = "#4C5254";
  ctx.fillRect(sp.xa, 0, sp.xb - sp.xa, 2.4 * u);
  ctx.fillStyle = "rgba(70,78,80,0.5)";
  ctx.fillRect(sp.xa, 7.6 * u, sp.xb - sp.xa, 1.4 * u);
  // 하부 킥플레이트 + 노란 안전선
  ctx.fillStyle = "#8C9496";
  ctx.fillRect(sp.xa, kick, sp.xb - sp.xa, H - kick);
  ctx.fillStyle = "#F2C230";
  ctx.fillRect(sp.xa, kick - 0.8 * u, sp.xb - sp.xa, 0.8 * u);
  void pal;
}

function drawPortal(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const sec = sp.sec;
  const inward = sec.kind === "portal-in";
  const step = 6;
  const wallTop = (m: number) => {
    const p = Math.min(1, Math.max(0, (m - sec.x0) / (sec.x1 - sec.x0)));
    const q = inward ? p : 1 - p;
    const e = q * q * (3 - 2 * q);
    return (88 - 92 * e) * u;
  };
  // 옹벽
  ctx.beginPath();
  ctx.moveTo(sp.xa - step, H);
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) ctx.lineTo(x, wallTop(mAt(f, x, s)));
  ctx.lineTo(sp.xb + step, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shadeColor(pal.concrete, -0.05));
  g.addColorStop(1, shadeColor(pal.concrete, -0.32));
  ctx.fillStyle = g;
  ctx.fill();
  // 이음매 + 얼룩
  const [m0, m1] = visRange(f, s, 40);
  for (let m = Math.floor(m0 / 4) * 4; m <= m1; m += 4) {
    if (m < sec.x0 || m > sec.x1) continue;
    const x = sx(f, m, s);
    const t = wallTop(m);
    ctx.fillStyle = "rgba(60,55,50,0.22)";
    ctx.fillRect(x, t, Math.max(1, 0.2 * u), H - t);
    const r = rng(hash2(Math.round(m), 61));
    if (r() < 0.4) {
      ctx.fillStyle = "rgba(70,80,70,0.12)";
      ctx.fillRect(x + r() * 6 * u, t + 2 * u, 1 * u + r() * 2 * u, 8 * u + r() * 12 * u);
    }
  }
  // 갓돌 라인
  ctx.strokeStyle = shadeColor(pal.concrete, 0.25);
  ctx.lineWidth = Math.max(1, 0.6 * u);
  ctx.beginPath();
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) {
    const y = wallTop(mAt(f, x, s));
    if (x === sp.xa - step) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // 옹벽 위 풀과 펜스
  ctx.fillStyle = pal.grassDark;
  ctx.beginPath();
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) {
    const y = wallTop(mAt(f, x, s));
    if (x === sp.xa - step) ctx.moveTo(x, y - 1.2 * u);
    else ctx.lineTo(x, y - 1.2 * u - Math.sin(x * 0.21) * 0.4 * u);
  }
  for (let x = sp.xb + step; x >= sp.xa - step; x -= step) ctx.lineTo(x, wallTop(mAt(f, x, s)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.steelDark;
  for (let m = Math.floor(m0 / 3) * 3; m <= m1; m += 3) {
    if (m < sec.x0 || m > sec.x1) continue;
    const x = sx(f, m, s);
    const t = wallTop(m);
    if (t < 2 * u) continue;
    ctx.fillRect(x, t - 5 * u, Math.max(1, 0.3 * u), 4 * u);
  }
  // 터널 입구 (갱문)
  const mouth = inward ? sec.x1 : sec.x0;
  const mx = sx(f, mouth, s);
  if (mx > sp.xa - 60 && mx < sp.xb + 60) {
    ctx.fillStyle = shadeColor(pal.concrete, -0.45);
    ctx.fillRect(inward ? mx - 3 * u : mx, 0, 3 * u, H);
  }
}

function drawTunnel(f: Frame, sp: Span) {
  const { ctx, u, H } = f;
  const s = SPEED.track;
  const w = sp.xb - sp.xa;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1A1817");
  g.addColorStop(0.45, "#2C2926");
  g.addColorStop(1, "#141312");
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, 0, w, H);
  // 열차 창에서 새어 나온 실내 불빛이 벽에 맺힌 띠
  const spill = ctx.createLinearGradient(0, 12 * u, 0, 88 * u);
  spill.addColorStop(0, "rgba(255,236,200,0)");
  spill.addColorStop(0.5, "rgba(255,236,200,0.1)");
  spill.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = spill;
  ctx.fillRect(sp.xa, 12 * u, w, 76 * u);

  const [m0, m1] = visRange(f, s, 80);
  // 세그먼트 이음매
  ctx.fillStyle = "rgba(255,240,220,0.05)";
  for (let m = Math.floor(m0 / 5) * 5; m <= m1; m += 5) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillRect(x, 0, Math.max(1, 0.3 * u), H);
  }
  // 케이블 트레이
  const cables: Array<[number, string, number]> = [
    [27, "#0E0D0C", 1.1],
    [30.5, "#2E2522", 0.8],
    [33.5, "#151414", 1.3],
    [71, "#3A3633", 1.6],
  ];
  for (const [y, c, th] of cables) {
    ctx.fillStyle = c;
    ctx.fillRect(sp.xa, y * u, w, th * u);
    ctx.fillStyle = "rgba(255,240,220,0.07)";
    ctx.fillRect(sp.xa, y * u, w, Math.max(1, th * 0.25 * u));
  }
  ctx.fillStyle = "#3D3935";
  for (let m = Math.floor(m0 / 1.6) * 1.6; m <= m1; m += 1.6) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillRect(x, 26 * u, Math.max(1, 0.25 * u), 9.5 * u);
  }
  // 하부 보도/도상 경계
  ctx.fillStyle = "#4A4541";
  ctx.fillRect(sp.xa, 88 * u, w, 0.8 * u);
  ctx.fillStyle = "#0F0E0D";
  ctx.fillRect(sp.xa, 88.8 * u, w, H - 88.8 * u);

  // 조명 (24m 간격) + 비상구 표지·거리표
  const lightGap = 24;
  for (let m = Math.floor(m0 / lightGap) * lightGap; m <= m1 + lightGap; m += lightGap) {
    const x = sx(f, m, s);
    if (x < sp.xa - 30 * u || x > sp.xb + 30 * u) continue;
    const i = Math.round(m / lightGap);
    const warm = i % 5 !== 0;
    const col = warm ? "255,226,170" : "214,236,255";
    const glow = ctx.createRadialGradient(x, 18 * u, 0, x, 18 * u, 22 * u);
    glow.addColorStop(0, `rgba(${col},0.32)`);
    glow.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 22 * u, 0, 44 * u, 44 * u);
    ctx.fillStyle = `rgb(${col})`;
    rrect(ctx, x - 1.6 * u, 17.2 * u, 3.2 * u, 1.4 * u, 0.5 * u);
    ctx.fill();
    if (i % 6 === 2) {
      // 비상구 유도등
      ctx.fillStyle = "#1FA463";
      rrect(ctx, x + 10 * u, 52 * u, 6.4 * u, 3.2 * u, 0.4 * u);
      ctx.fill();
      ctx.fillStyle = "#E9FFF2";
      ctx.beginPath();
      ctx.arc(x + 11.6 * u, 53 * u, 0.42 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 11.3 * u, 53.5 * u, 0.6 * u, 1.2 * u);
      ctx.fillRect(x + 12.6 * u, 53.4 * u, 2.6 * u, 0.5 * u);
      ctx.beginPath();
      ctx.moveTo(x + 15.6 * u, 53.65 * u);
      ctx.lineTo(x + 14.8 * u, 53 * u);
      ctx.lineTo(x + 14.8 * u, 54.3 * u);
      ctx.fill();
    } else if (i % 6 === 5) {
      // 거리표
      ctx.fillStyle = "#E9C44A";
      rrect(ctx, x - 9 * u, 58 * u, 3.6 * u, 2.4 * u, 0.3 * u);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.font = `700 ${1.4 * u}px Pretendard, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Math.abs(Math.round(m / 10)) % 100), x - 7.2 * u, 59.2 * u);
    }
  }
  // 벽면 보수 흔적 / 피난 연결통로 (단조로움 방지)
  for (let m = Math.floor(m0 / 37) * 37; m <= m1; m += 37) {
    const r = rng(hash2(Math.round(m), 4711));
    const x = sx(f, m, s);
    if (x < sp.xa - 40 * u || x > sp.xb + 40 * u) continue;
    const roll = r();
    if (roll < 0.35) {
      ctx.fillStyle = "rgba(255,240,220,0.035)";
      ctx.fillRect(x, 38 * u + r() * 10 * u, (10 + r() * 20) * u, (8 + r() * 14) * u);
    } else if (roll < 0.45) {
      const w = 16 * u;
      ctx.fillStyle = "#0A0A09";
      rrect(ctx, x, 37 * u, w, 51 * u, 3 * u);
      ctx.fill();
      ctx.fillStyle = "rgba(255,226,170,0.22)";
      ctx.fillRect(x + w * 0.3, 40 * u, w * 0.4, 0.8 * u);
      ctx.fillStyle = "#3E3A36";
      ctx.fillRect(x + w * 0.15, 86 * u, w * 0.7, 2 * u);
    }
  }
  // 신호기 (가끔)
  for (let m = Math.floor(m0 / 150) * 150; m <= m1; m += 150) {
    const x = sx(f, m + 70, s);
    if (x < sp.xa - 20 || x > sp.xb + 20) continue;
    ctx.fillStyle = "#0B0B0B";
    rrect(ctx, x, 62 * u, 2.4 * u, 6 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = "#47E08A";
    ctx.beginPath();
    ctx.arc(x + 1.2 * u, 66.4 * u, 0.6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(71,224,138,0.18)";
    ctx.beginPath();
    ctx.arc(x + 1.2 * u, 66.4 * u, 2.4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ═════════════════════════════ 교행 열차 (터널) ═════════════════════════════ */

/**
 * 2호선은 우측통행이라 반대 방향 열차는 승객이 보는 왼쪽 창 쪽 선로로 지나간다.
 * 두 열차가 마주 달리므로 같은 깊이의 정지 물체보다 REL 배 빠르게 흐르는 "상대 좌표"에 배치한다.
 * 위치는 열차 위치(cam)만의 함수 → 같은 지점에서는 항상 같은 교행 장면.
 */
export const PASSING = { depth: 4.8, rel: 2, len: 140, car: 14 } as const;
const passingCache = new WeakMap<Journey, number[]>();

/** 교행 열차 머리 위치(상대 좌표) 목록 */
export function passingTrains(j: Journey): number[] {
  const hit = passingCache.get(j);
  if (hit) return hit;
  const out: number[] = [];
  const lastStop = j.stopX[j.stopX.length - 1];
  for (const sec of j.sections) {
    // 출발 전·도착 후 배경 터널은 지나가지 않으므로 제외
    if (sec.kind !== "tunnel" || sec.x1 - sec.x0 < 360 || sec.x0 < 0 || sec.x1 > lastStop) continue;
    for (let a = sec.x0 + 170; a + PASSING.len + 80 < sec.x1; a += 700) {
      if ((hash2(Math.round(a), 2024) & 1023) / 1023 < 0.75) out.push(a);
    }
  }
  passingCache.set(j, out);
  return out;
}

/** 0..1 교행 열차가 창 앞에 얼마나 가까운지 (사운드용) */
export function passingIntensity(j: Journey, cam: number): number {
  let best = 0;
  for (const a of passingTrains(j)) {
    const d = cam < a ? a - cam : cam > a + PASSING.len ? cam - a - PASSING.len : 0;
    best = Math.max(best, 1 - Math.min(1, d / 12));
  }
  return best;
}

function drawPassingTrain(f: Frame) {
  const { ctx, u, H } = f;
  const S = PASSING.depth * PASSING.rel;
  const [m0, m1] = visRange(f, S, 40);
  for (const a of passingTrains(f.journey)) {
    if (a > m1 || a + PASSING.len < m0) continue;
    const car = PASSING.car;
    const top = 5 * u;
    const bottom = 97 * u;
    for (let c = 0; c < PASSING.len / car; c++) {
      const ca = a + c * car;
      const xa = sx(f, ca, S);
      const xb = sx(f, ca + car - 0.35, S);
      if (xb < -10 || xa > f.W + 10) continue;
      const r = rng(hash2(Math.round(ca), 77));
      // 차체 (터널 조명에 비친 스테인리스)
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, "#8E9497");
      g.addColorStop(0.35, "#B9BFC1");
      g.addColorStop(1, "#6E7477");
      ctx.fillStyle = g;
      ctx.fillRect(xa, top, xb - xa, bottom - top);
      // 2호선 띠
      ctx.fillStyle = "#2E8A62";
      ctx.fillRect(xa, 66 * u, xb - xa, 3.2 * u);
      // 창문과 출입문
      const unit = (xb - xa) / car;
      for (let k = 0; k < 4; k++) {
        const dx = xa + (0.7 + k * 3.45) * unit;
        ctx.fillStyle = "#7E8689";
        ctx.fillRect(dx, 16 * u, 0.95 * unit, 72 * u);
        ctx.fillStyle = "rgba(255,231,190,0.7)";
        ctx.fillRect(dx + 0.12 * unit, 22 * u, 0.32 * unit, 24 * u);
        ctx.fillRect(dx + 0.51 * unit, 22 * u, 0.32 * unit, 24 * u);
        if (k < 3) {
          const wx = dx + 1.17 * unit;
          ctx.fillStyle = "rgba(255,228,182,0.78)";
          rrect(ctx, wx, 20 * u, 2.1 * unit, 30 * u, 1.2 * u);
          ctx.fill();
          // 승객 실루엣
          if (r() < 0.7) {
            ctx.fillStyle = "rgba(70,60,60,0.45)";
            const px = wx + (0.2 + r() * 0.6) * 2.1 * unit;
            ctx.beginPath();
            ctx.arc(px, 34 * u, 3 * u, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(px - 4 * u, 38 * u, 8 * u, 12 * u);
          }
        }
      }
      // 차량 연결부
      ctx.fillStyle = "#1D1E1F";
      ctx.fillRect(xb, top, Math.max(2, sx(f, ca + car, S) - xb), bottom - top);
    }
    // 빠르게 스치는 느낌: 가장자리 어둡게
    const xh = sx(f, a, S);
    const xt = sx(f, a + PASSING.len, S);
    for (const [x, dir] of [
      [xh, -1],
      [xt, 1],
    ] as const) {
      if (x < -40 || x > f.W + 40) continue;
      const gg = ctx.createLinearGradient(x, 0, x + dir * 30 * u, 0);
      gg.addColorStop(0, "rgba(10,10,10,0.6)");
      gg.addColorStop(1, "rgba(10,10,10,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(Math.min(x, x + dir * 30 * u), 0, 30 * u, H);
    }
  }
}

/* ═════════════════════════════ 최근경: 전차선 지지대 ═════════════════════════════ */

function drawFore(f: Frame) {
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

function drawGlass(f: Frame) {
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

/* ═════════════════════════════ 합성 ═════════════════════════════ */

/**
 * 빛과 대기 — 사진 하늘과 그린 풍경을 한 장면으로 묶는다.
 * 노을: 해 주변 빛 번짐 + 수평선 따뜻한 빛 / 낮: 은은한 햇빛 / 밤: 수평선 도시 불빛.
 */
function drawAtmosphere(f: Frame) {
  const { ctx, W, H, u, pal } = f;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  if (pal.key === "sunset") {
    const a = 0.14 + 0.24 * f.sunAlpha;
    const x = pal.sun.x * W;
    const y = pal.sun.y * H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.55);
    g.addColorStop(0, `rgba(255,190,120,${0.55 * a})`);
    g.addColorStop(0.35, `rgba(255,150,110,${0.22 * a})`);
    g.addColorStop(1, "rgba(255,140,100,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const hz = ctx.createLinearGradient(0, (HZ - 8) * u, 0, (HZ + 10) * u);
    hz.addColorStop(0, "rgba(255,170,110,0)");
    hz.addColorStop(0.5, `rgba(255,170,110,${0.22 * a})`);
    hz.addColorStop(1, "rgba(255,170,110,0)");
    ctx.fillStyle = hz;
    ctx.fillRect(0, (HZ - 8) * u, W, 18 * u);
  } else if (pal.key === "day") {
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, "rgba(255,248,225,0.16)");
    g.addColorStop(1, "rgba(255,248,225,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const hz = ctx.createLinearGradient(0, (HZ - 12) * u, 0, (HZ + 6) * u);
    hz.addColorStop(0, "rgba(255,160,90,0)");
    hz.addColorStop(0.75, "rgba(255,160,90,0.16)");
    hz.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = hz;
    ctx.fillRect(0, (HZ - 12) * u, W, 18 * u);
  }
  ctx.restore();
}

/** 마무리 색 보정 + 필름 그레인 (아주 약하게) */
function drawGrade(f: Frame) {
  const { ctx, W, H, pal } = f;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = pal.key === "night" ? 0.25 : 0.18;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.key === "night" ? "#4a5a9a" : "#fff3dc");
  g.addColorStop(1, pal.key === "sunset" ? "#7a4a6a" : "#3a4a5a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (f.grain && f.quality >= 0.8) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.04;
    const ox = f.reducedMotion ? 0 : Math.floor((f.time * 97) % 128);
    const oy = f.reducedMotion ? 0 : Math.floor((f.time * 61) % 128);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = f.grain;
    ctx.fillRect(0, 0, W + 128, H + 128);
    ctx.restore();
  }
}

/** 창 중앙 근처가 실외를 볼 수 있는지 — 보이지 않으면 원경 레이어를 건너뛴다 */
function outdoorHidden(f: Frame): boolean {
  const [m0, m1] = visRange(f, SPEED.platformBack, 10);
  return sectionsInRange(f.journey, m0, m1).every(
    (s) => s.kind === "tunnel" || (s.kind === "platform" && s.station!.structure === "underground"),
  );
}

/** 0..1: 창 중앙이 얼마나 어두운 구간에 있는지 (터널 = 1) */
export function darknessAt(j: Journey, x: number): number {
  const secs = j.sections;
  let d = 0;
  for (const s of secs) {
    if (x < s.x0 || x > s.x1) continue;
    if (s.kind === "tunnel") d = 1;
    else if (s.kind === "platform") d = s.station!.structure === "underground" ? 0.35 : 0;
    else if (s.kind === "portal-in") d = Math.min(1, Math.max(0, (x - s.x0) / (s.x1 - s.x0))) * 0.7;
    else if (s.kind === "portal-out") d = (1 - Math.min(1, Math.max(0, (x - s.x0) / (s.x1 - s.x0)))) * 0.7;
  }
  return d;
}

export function renderScene(f: Frame) {
  const { ctx } = f;
  if (!outdoorHidden(f)) {
    const plate = f.sunAlpha > 0.5 ? farPlate(f.pal.key) : null;
    if (plate) drawFarPlate(f, plate.img, plate.art);
    else {
      drawSky(f);
      drawFar(f);
    }
    for (const sec of f.journey.sections) if (sec.kind === "river" && sec.variant === "hangang-jamsil") drawLotteTower(f, sec);
    if (riverNearby(f)) {
      drawWater(f);
      drawBirds(f);
      for (const sec of f.journey.sections) {
        if (sec.kind !== "river") continue;
        if (sec.variant === "hangang-yanghwa") {
          if (!f.plate) {
            drawIsland(f, sec);
            drawBoat(f, sec);
          }
          drawYanghwa(f, sec);
        } else if (sec.variant === "hangang-jamsil") {
          drawBoat(f, sec);
          drawOlympicBridge(f, sec);
        }
      }
    } else {
      ctx.fillStyle = f.pal.groundFar;
      ctx.fillRect(0, WATER_Y * f.u, f.W, f.H);
    }
    drawMid(f);
    drawNear(f);
    drawAtmosphere(f);
  }
  drawPlatformBack(f);
  drawPlatformFront(f);
  drawTrack(f);
  drawPassingTrain(f);
  drawFore(f);
  drawGrade(f);
  drawGlass(f);
}
