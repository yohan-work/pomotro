/**
 * 오프스크린 스프라이트 캐시 + 미니어처 스타일 오브젝트 드로잉.
 * 매 프레임 창문 수백 개를 다시 그리지 않도록 건물·나무·사람은 한 번 그려서 재사용한다.
 */
import type { Palette } from "./palette";
import { pick, rng } from "./rng";

type Canvas2D = HTMLCanvasElement;

export interface Sprite {
  img: Canvas2D;
  /** CSS px 크기 */
  w: number;
  h: number;
}

export class SpriteCache {
  private map = new Map<string, Sprite>();
  constructor(public scale: number) {}

  get(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Sprite {
    const hit = this.map.get(key);
    if (hit) return hit;
    const img = document.createElement("canvas");
    img.width = Math.max(1, Math.ceil(w * this.scale));
    img.height = Math.max(1, Math.ceil(h * this.scale));
    const ctx = img.getContext("2d")!;
    ctx.scale(this.scale, this.scale);
    draw(ctx, w, h);
    const sp = { img, w, h };
    if (this.map.size > 600) this.map.clear();
    this.map.set(key, sp);
    return sp;
  }

  clear(scale?: number) {
    this.map.clear();
    if (scale) this.scale = scale;
  }

  get size() {
    return this.map.size;
  }
}

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function parseColor(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
}

const toHex = (r: number, g: number, b: number) =>
  `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;

/** amt < 0 이면 어둡게, > 0 이면 밝게. 항상 #hex 반환 */
export function shadeColor(color: string, amt: number): string {
  let [r, g, b] = parseColor(color);
  if (amt < 0) {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  return toHex(r, g, b);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/* ───────────────────────── 아파트 (판상형, 서울 단지) ───────────────────────── */

export interface ApartmentSpec {
  w: number;
  h: number;
  floors: number;
  side: number;
  number: number;
  wall: string;
  accent: string;
  seed: number;
}

export function apartmentSpec(seed: number, u: number, pal: Palette, scale = 1): ApartmentSpec {
  const r = rng(seed);
  const floors = 12 + Math.floor(r() * 14);
  const floorH = 1.05 * u * scale;
  return {
    w: (11 + r() * 9) * u * scale,
    h: floors * floorH + 2.6 * u * scale,
    floors,
    side: (1.6 + r() * 1.4) * u * scale,
    number: 101 + Math.floor(r() * 12),
    wall: pick(pal.walls, r()),
    accent: pick(pal.accents, r()),
    seed,
  };
}

export function drawApartment(ctx: CanvasRenderingContext2D, s: ApartmentSpec, pal: Palette) {
  const r = rng(s.seed * 7 + 3);
  const { w, h, side } = s;
  const fw = w - side;
  const roof = h * 0.07;
  const floorH = (h - roof - h * 0.04) / s.floors;
  // 측면 (입체감)
  ctx.fillStyle = shadeColor(s.wall, -0.16);
  ctx.beginPath();
  ctx.moveTo(fw, roof);
  ctx.lineTo(w, roof + side * 0.22);
  ctx.lineTo(w, h);
  ctx.lineTo(fw, h);
  ctx.closePath();
  ctx.fill();
  // 측면 대형 동 번호
  ctx.fillStyle = shadeColor(s.accent, -0.05);
  ctx.globalAlpha = 0.85;
  ctx.font = `700 ${Math.max(6, side * 0.42)}px Pretendard, sans-serif`;
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(fw + side / 2, roof + h * 0.16);
  ctx.fillText(String(s.number), 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;

  // 정면
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shadeColor(s.wall, 0.12));
  g.addColorStop(1, shadeColor(s.wall, -0.06));
  ctx.fillStyle = g;
  rrect(ctx, 0, roof, fw, h - roof, Math.min(4, fw * 0.03));
  ctx.fill();

  // 옥상 구조물
  ctx.fillStyle = shadeColor(s.wall, -0.08);
  const rx = fw * (0.15 + r() * 0.5);
  rrect(ctx, rx, roof * 0.15, fw * 0.22, roof * 1.05, 2);
  ctx.fill();
  ctx.fillStyle = s.accent;
  ctx.fillRect(rx, roof * 0.15, fw * 0.22, roof * 0.28);
  ctx.fillStyle = shadeColor(s.wall, -0.2);
  ctx.fillRect(0, roof - 1, fw, 2);

  // 계단실 포인트 컬러 띠
  const stripeX = r() < 0.5 ? fw * 0.06 : fw * 0.86;
  ctx.fillStyle = s.accent;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(stripeX, roof + 2, fw * 0.08, h - roof - h * 0.04 - 2);
  ctx.globalAlpha = 1;

  // 층별 발코니 유리 띠
  const bays = Math.max(3, Math.round(fw / (floorH * 2.2)));
  const bayW = fw / bays;
  for (let f = 0; f < s.floors; f++) {
    const y = roof + h * 0.01 + f * floorH;
    for (let b = 0; b < bays; b++) {
      const bx = b * bayW;
      if (bx + bayW * 0.5 > stripeX && bx < stripeX + fw * 0.08) continue;
      const lit = r() < pal.litRatio;
      ctx.fillStyle = lit ? pal.glassLit : pal.glass;
      ctx.globalAlpha = lit ? 0.95 : 0.78;
      ctx.fillRect(bx + bayW * 0.12, y + floorH * 0.2, bayW * 0.76, floorH * 0.5);
      ctx.globalAlpha = 1;
    }
    // 발코니 난간선
    ctx.fillStyle = shadeColor(s.wall, -0.12);
    ctx.fillRect(0, y + floorH * 0.72, fw, Math.max(0.8, floorH * 0.1));
  }
  // 1층 필로티
  ctx.fillStyle = shadeColor(s.wall, -0.32);
  ctx.fillRect(0, h - h * 0.04, fw, h * 0.04);
}

/* ───────────────────────── 오피스/주상복합 ───────────────────────── */

export interface TowerSpec {
  w: number;
  h: number;
  glass: string;
  crown: number;
  seed: number;
}

export function towerSpec(seed: number, u: number, pal: Palette, scale = 1): TowerSpec {
  const r = rng(seed);
  return {
    w: (7 + r() * 6) * u * scale,
    h: (22 + r() * 18) * u * scale,
    glass: pick([pal.glass, shadeColor(pal.glass, 0.18), shadeColor(pal.glass, -0.1)], r()),
    crown: Math.floor(r() * 3),
    seed,
  };
}

export function drawTower(ctx: CanvasRenderingContext2D, s: TowerSpec, pal: Palette) {
  const r = rng(s.seed * 13 + 1);
  const { w, h } = s;
  const side = w * 0.18;
  const fw = w - side;
  const top = s.crown === 1 ? h * 0.05 : 0;
  ctx.fillStyle = shadeColor(s.glass, -0.22);
  ctx.fillRect(fw, top + side * 0.2, side, h - top);
  const g = ctx.createLinearGradient(0, 0, fw, h);
  g.addColorStop(0, shadeColor(s.glass, 0.28));
  g.addColorStop(0.55, s.glass);
  g.addColorStop(1, shadeColor(s.glass, -0.12));
  ctx.fillStyle = g;
  if (s.crown === 2) {
    ctx.beginPath();
    ctx.moveTo(0, h * 0.06);
    ctx.lineTo(fw, 0);
    ctx.lineTo(fw, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  } else {
    rrect(ctx, 0, top, fw, h - top, 3);
    ctx.fill();
  }
  // 커튼월 멀리언
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  const cols = Math.max(3, Math.round(fw / 7));
  for (let c = 1; c < cols; c++) {
    const x = (c / cols) * fw;
    ctx.beginPath();
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  const rows = Math.round(h / 6);
  for (let k = 1; k < rows; k++) {
    const y = top + (k / rows) * (h - top);
    if (pal.litRatio > 0) {
      for (let c = 0; c < cols; c++) {
        if (r() < pal.litRatio * 0.8) {
          ctx.fillStyle = pal.glassLit;
          ctx.globalAlpha = 0.85;
          ctx.fillRect((c / cols) * fw + 1, y + 1, fw / cols - 2, (h - top) / rows - 2);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, y, fw, 1);
  }
  if (s.crown === 1) {
    ctx.fillStyle = shadeColor(s.glass, -0.3);
    ctx.fillRect(fw * 0.2, 0, fw * 0.6, top + 1);
  }
}

/* ───────────────────────── 근린 상가 / 빌라 ───────────────────────── */

const SIGNS = ["카페", "분식", "약국", "꽃집", "베이커리", "세탁", "치킨", "문구", "학원", "안경", "미용실", "국밥", "편의점", "서점", "떡집", "피아노"];

export interface ShopSpec {
  w: number;
  h: number;
  floors: number;
  kind: "shop" | "villa";
  wall: string;
  accent: string;
  seed: number;
}

export function shopSpec(seed: number, u: number, pal: Palette): ShopSpec {
  const r = rng(seed);
  const villa = r() < 0.32;
  const floors = villa ? 4 : 2 + Math.floor(r() * 4);
  return {
    w: (villa ? 11 : 8) * u + r() * 5 * u,
    h: floors * 4.4 * u + 1.6 * u,
    floors,
    kind: villa ? "villa" : "shop",
    wall: villa ? pick(["#C98B72", "#B97C66", "#D4A288", "#C9A08A"], r()) : pick(pal.walls, r()),
    accent: pick(pal.accents, r()),
    seed,
  };
}

export function drawShop(ctx: CanvasRenderingContext2D, s: ShopSpec, pal: Palette, u: number) {
  const r = rng(s.seed * 31 + 5);
  const { w, h } = s;
  const roofH = 1.6 * u;
  const floorH = (h - roofH) / s.floors;
  const night = pal.night;
  const wall = night > 0.5 ? shadeColor(s.wall, -0.55) : night > 0 ? shadeColor(s.wall, -0.15) : s.wall;

  // 옥상: 녹색 방수 도장 + 물탱크
  ctx.fillStyle = night > 0.5 ? "#2F4B45" : "#7FB79A";
  ctx.beginPath();
  ctx.moveTo(0, roofH * 0.55);
  ctx.lineTo(w * 0.06, 0);
  ctx.lineTo(w * 0.94, 0);
  ctx.lineTo(w, roofH * 0.55);
  ctx.closePath();
  ctx.fill();
  if (r() < 0.7) {
    const tx = w * (0.15 + r() * 0.55);
    ctx.fillStyle = night > 0.5 ? "#3A6A5A" : "#5FAE8A";
    rrect(ctx, tx, -roofH * 0.9, u * 2.2, roofH * 1.2, u * 0.6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(tx + u * 0.3, -roofH * 0.75, u * 0.35, roofH * 0.9);
  }

  // 벽
  ctx.fillStyle = wall;
  rrect(ctx, 0, roofH * 0.55, w, h - roofH * 0.55, 2);
  ctx.fill();
  if (s.kind === "villa") {
    // 벽돌 질감
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 0.8;
    for (let y = roofH; y < h; y += u * 0.7) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = shadeColor(s.kind === "villa" ? "#E9E2D6" : s.wall, -0.18);
  ctx.fillRect(0, roofH * 0.55, w, u * 0.5);

  for (let f = 0; f < s.floors; f++) {
    const y = roofH + f * floorH;
    const ground = f === s.floors - 1;
    if (s.kind === "shop" && (ground || r() < 0.55)) {
      // 간판
      const sw = w * (0.55 + r() * 0.35);
      const sx = (w - sw) / 2;
      const col = pick(pal.accents, r());
      ctx.fillStyle = night > 0.5 ? shadeColor(col, 0.15) : col;
      rrect(ctx, sx, y + floorH * 0.06, sw, floorH * 0.28, u * 0.35);
      ctx.fill();
      ctx.fillStyle = night > 0.5 ? "#FFF6DA" : "#FFFFFF";
      ctx.font = `700 ${floorH * 0.2}px Pretendard, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pick(SIGNS, r()), w / 2, y + floorH * 0.205);
    }
    // 창
    const nWin = ground ? 1 : 2 + Math.floor(w / (u * 5));
    const ww = ground ? w * 0.8 : (w * 0.82) / nWin;
    for (let k = 0; k < nWin; k++) {
      const x = ground ? w * 0.1 : w * 0.09 + k * ww;
      const lit = night > 0 && r() < pal.litRatio + (ground ? 0.4 : 0);
      ctx.fillStyle = lit ? pal.glassLit : shadeColor(pal.glass, ground ? -0.1 : 0.1);
      ctx.globalAlpha = lit ? 0.92 : 0.85;
      rrect(ctx, x + u * 0.25, y + floorH * 0.42, ww - u * 0.5, floorH * (ground ? 0.55 : 0.4), u * 0.25);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!ground && r() < 0.35) {
        // 실외기
        ctx.fillStyle = "#E8E8E4";
        ctx.fillRect(x + ww * 0.55, y + floorH * 0.85, u * 1.3, u * 0.9);
      }
    }
    if (ground && s.kind === "shop") {
      // 줄무늬 차양
      const aw = w * 0.86;
      const ax = w * 0.07;
      const ay = y + floorH * 0.38;
      const stripes = 7;
      for (let k = 0; k < stripes; k++) {
        ctx.fillStyle = k % 2 ? "#FFFFFF" : s.accent;
        ctx.beginPath();
        ctx.moveTo(ax + (aw / stripes) * k, ay);
        ctx.lineTo(ax + (aw / stripes) * (k + 1), ay);
        ctx.lineTo(ax + (aw / stripes) * (k + 1) + u * 0.3, ay + u * 1.3);
        ctx.lineTo(ax + (aw / stripes) * k + u * 0.3, ay + u * 1.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

/* ───────────────────────── 나무 ───────────────────────── */

export function drawTree(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, pal: Palette) {
  const r = rng(seed);
  const autumn = r() < 0.38;
  const colors = autumn ? pal.treeAutumn : pal.tree;
  const trunkH = h * 0.32;
  ctx.fillStyle = pal.night > 0.5 ? "#2A2626" : "#8A6A55";
  rrect(ctx, w / 2 - w * 0.045, h - trunkH, w * 0.09, trunkH, w * 0.03);
  ctx.fill();
  const crownH = h - trunkH * 0.6;
  const blobs = 5 + Math.floor(r() * 3);
  // 그림자 쪽 먼저
  for (let pass = 0; pass < 2; pass++) {
    const rr = rng(seed + 99);
    for (let k = 0; k < blobs; k++) {
      const bx = w * (0.22 + rr() * 0.56);
      const by = crownH * (0.3 + rr() * 0.45);
      const br = w * (0.18 + rr() * 0.14);
      const base = colors[k % colors.length];
      ctx.fillStyle = pass === 0 ? shadeColor(base, -0.22) : base;
      ctx.beginPath();
      ctx.arc(bx + (pass ? -br * 0.12 : br * 0.08), by + (pass ? -br * 0.12 : br * 0.1), br * (pass ? 0.92 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 하이라이트
  ctx.fillStyle = "rgba(255,255,240,0.18)";
  ctx.beginPath();
  ctx.arc(w * 0.38, crownH * 0.32, w * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

/* ───────────────────────── 사람 (귀여운 승객) ───────────────────────── */

const COATS = ["#E9A47E", "#7FA7C9", "#E7C36F", "#8CBF8F", "#C99BB5", "#F2F0EA", "#6F7D8C", "#D97C6B"];
const HAIR = ["#3A2E2A", "#5A4334", "#2B2B30", "#8A6A4E"];

export function drawPerson(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, pal: Palette) {
  const r = rng(seed);
  const coat = pick(COATS, r());
  const headR = w * 0.3;
  const bodyTop = headR * 1.7;
  const bodyH = h - bodyTop - h * 0.12;
  const dark = pal.night > 0.5 ? -0.25 : 0;
  // 다리
  ctx.fillStyle = shadeColor("#4A4F60", dark);
  rrect(ctx, w * 0.3, h - h * 0.16, w * 0.15, h * 0.16, w * 0.06);
  ctx.fill();
  rrect(ctx, w * 0.55, h - h * 0.16, w * 0.15, h * 0.16, w * 0.06);
  ctx.fill();
  // 몸통 (콩 모양)
  ctx.fillStyle = shadeColor(coat, dark);
  rrect(ctx, w * 0.12, bodyTop, w * 0.76, bodyH, w * 0.36);
  ctx.fill();
  // 가방/소품
  const prop = r();
  if (prop < 0.35) {
    ctx.fillStyle = shadeColor(pick(COATS, r()), -0.2 + dark);
    rrect(ctx, w * 0.72, bodyTop + bodyH * 0.35, w * 0.26, bodyH * 0.38, w * 0.08);
    ctx.fill();
  } else if (prop < 0.6) {
    // 휴대폰 보는 중
    ctx.fillStyle = "#2B2D35";
    rrect(ctx, w * 0.4, bodyTop + bodyH * 0.2, w * 0.2, bodyH * 0.22, w * 0.04);
    ctx.fill();
  }
  // 머리
  ctx.fillStyle = shadeColor("#F6D8BE", dark);
  ctx.beginPath();
  ctx.arc(w / 2, headR * 1.1, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shadeColor(pick(HAIR, r()), dark);
  ctx.beginPath();
  ctx.arc(w / 2, headR * 1.0, headR * 1.02, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  if (r() < 0.3) {
    // 모자
    ctx.fillStyle = shadeColor(pick(COATS, r()), dark);
    ctx.beginPath();
    ctx.arc(w / 2, headR * 0.85, headR * 1.05, Math.PI, 0);
    ctx.fill();
  }
  // 얼굴 (옆/정면 보기)
  ctx.fillStyle = "#3A302C";
  const look = r() < 0.5 ? -1 : 1;
  ctx.beginPath();
  ctx.arc(w / 2 + look * headR * 0.15 - headR * 0.28, headR * 1.2, headR * 0.09, 0, Math.PI * 2);
  ctx.arc(w / 2 + look * headR * 0.15 + headR * 0.28, headR * 1.2, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(240,140,130,0.45)";
  ctx.beginPath();
  ctx.arc(w / 2 - headR * 0.5, headR * 1.42, headR * 0.15, 0, Math.PI * 2);
  ctx.arc(w / 2 + headR * 0.5, headR * 1.42, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

/* ───────────────────────── 구름 ───────────────────────── */

export function drawCloud(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, pal: Palette) {
  const r = rng(seed);
  const n = 5 + Math.floor(r() * 4);
  const puffs: Array<[number, number, number]> = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const pr = h * (0.28 + Math.sin(t * Math.PI) * 0.22 + r() * 0.12);
    puffs.push([w * (0.12 + t * 0.76), h - pr * 0.9 - h * 0.06, pr]);
  }
  ctx.fillStyle = pal.cloudShade;
  for (const [x, y, pr] of puffs) {
    ctx.beginPath();
    ctx.arc(x, y + pr * 0.12, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.cloud;
  for (const [x, y, pr] of puffs) {
    ctx.beginPath();
    ctx.arc(x - pr * 0.05, y - pr * 0.06, pr * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // 평평한 바닥
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(0, h - h * 0.08, w, h);
  ctx.globalCompositeOperation = "source-over";
}
