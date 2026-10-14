"use client";

import { useMemo, useState } from "react";
import { SEGMENTS, STATIONS } from "@/data/line2";
import { LINE3 } from "@/data/line3";
import { LINE3_OFFICIAL_SEGMENTS } from "@/data/line3.official";
import { LINE_GJ } from "@/data/lineGJ";
import { LINE_BY_ID, type LineId, type Station } from "@/data/lines";
import { useT } from "@/i18n";
import styles from "./LineMap.module.css";

/**
 * 노선도 — 역 간격은 공식 역간 거리 비율.
 * 2호선: 둥근 사각형 위를 시계 방향(내선순환)으로 돈다. 한강은 두 횡단 구간(당산→합정, 강변→잠실나루)을 잇는다.
 * 3호선: 2호선과 만나는 을지로3가·교대를 기준점으로, 그 사이를 공식 거리 비율로 잇는 개략 경로.
 */

const VB_W = 400;
const VB_H = 236;
const X0 = 52;
const Y0 = 22;
const W = 296;
const H = 192;
const R = 64;
const A = W - 2 * R;
const B = H - 2 * R;
const ARC = (Math.PI * R) / 2;
const P = 2 * A + 2 * B + 4 * ARC;

/** 둘레 위 위치 s → 좌표와 바깥쪽 법선 */
function at(sRaw: number): { x: number; y: number; nx: number; ny: number } {
  let s = ((sRaw % P) + P) % P;
  const arc = (cx: number, cy: number, a0: number, t: number) => {
    const ang = a0 + (t / ARC) * (Math.PI / 2);
    return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), nx: Math.cos(ang), ny: Math.sin(ang) };
  };
  if (s < A) return { x: X0 + R + s, y: Y0, nx: 0, ny: -1 };
  s -= A;
  if (s < ARC) return arc(X0 + W - R, Y0 + R, -Math.PI / 2, s);
  s -= ARC;
  if (s < B) return { x: X0 + W, y: Y0 + R + s, nx: 1, ny: 0 };
  s -= B;
  if (s < ARC) return arc(X0 + W - R, Y0 + H - R, 0, s);
  s -= ARC;
  if (s < A) return { x: X0 + W - R - s, y: Y0 + H, nx: 0, ny: 1 };
  s -= A;
  if (s < ARC) return arc(X0 + R, Y0 + H - R, Math.PI / 2, s);
  s -= ARC;
  if (s < B) return { x: X0, y: Y0 + H - R - s, nx: -1, ny: 0 };
  s -= B;
  return arc(X0 + R, Y0 + R, Math.PI, s);
}

const LOOP_KM = SEGMENTS.reduce((a, s) => a + s.distanceKm, 0);
const CUM = STATIONS.map((_, i) => SEGMENTS.slice(0, i).reduce((a, s) => a + s.distanceKm, 0));
/** 북쪽 구간(시청~왕십리 사이)이 위쪽 가운데 오도록 회전 */
const OFFSET = A / 2 - (2.4 / LOOP_KM) * P;
const posOf = (i: number) => at((CUM[i] / LOOP_KM) * P + OFFSET);
const sOf = (i: number) => (CUM[i] / LOOP_KM) * P + OFFSET;

const KEY = new Set(["city-hall", "wangsimni", "seongsu", "jamsil", "gangnam", "sadang", "sillim", "sindorim", "dangsan", "hapjeong", "hongik-univ"]);

function pathBetween(s0: number, s1: number): string {
  let end = s1;
  while (end <= s0) end += P;
  const pts: string[] = [];
  for (let s = s0; s < end; s += 3) {
    const p = at(s);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const e = at(end);
  pts.push(`${e.x.toFixed(1)},${e.y.toFixed(1)}`);
  return `M${pts.join("L")}`;
}

/* ───────── 한강 (2호선 횡단 지점 기준) ───────── */
const idx2 = (id: string) => STATIONS.findIndex((s) => s.id === id);
const midOf = (a: string, b: string) => at((sOf(idx2(a)) + sOf(idx2(b))) / 2);
const RW = midOf("dangsan", "hapjeong");
const RE = midOf("gangbyeon", "jamsillaru");
const RIVER_MID_Y = (RW.y + RE.y) / 2 + 18;
const RIVER_PATH = `M-10,${RW.y + 14} C${RW.x - 10},${RW.y + 6} ${RW.x + 40},${RW.y - 4} ${VB_W / 2},${RIVER_MID_Y} S${RE.x - 30},${RE.y + 6} ${VB_W + 10},${RE.y - 12}`;

/* ───────── 3호선 개략 경로 ───────── */
type Pt = { x: number; y: number; nx: number; ny: number };
const L3_CUM = [0];
for (const sg of LINE3_OFFICIAL_SEGMENTS) L3_CUM.push(L3_CUM[L3_CUM.length - 1] + sg.distanceKm);
const E3 = posOf(idx2("euljiro-3ga"));
const GY = posOf(idx2("seoul-natl-univ-of-education"));
const L3_ANCHORS: Record<string, { x: number; y: number }> = {
  "l3-jichuk": { x: E3.x - 112, y: -50 },
  "l3-dongnimmun": { x: E3.x - 62, y: -4 },
  "l3-euljiro-3ga": { x: E3.x, y: E3.y },
  "l3-oksu": { x: VB_W / 2 + 4, y: RIVER_MID_Y - 18 },
  "l3-apgujeong": { x: VB_W / 2 + 8, y: RIVER_MID_Y + 20 },
  "l3-seoul-natl-univ-of-education": { x: GY.x, y: GY.y },
  "l3-yangjae": { x: GY.x - 6, y: GY.y + 30 },
  "l3-ogeum": { x: VB_W - 8, y: GY.y + 46 },
};
const L3_POS: Pt[] = (() => {
  const st = LINE3.stations;
  const anchorIdx = st.map((s, i) => (L3_ANCHORS[s.id] ? i : -1)).filter((i) => i >= 0);
  const out: Pt[] = [];
  for (let k = 0; k < anchorIdx.length - 1; k++) {
    const i0 = anchorIdx[k];
    const i1 = anchorIdx[k + 1];
    const a = L3_ANCHORS[st[i0].id];
    const b = L3_ANCHORS[st[i1].id];
    for (let i = i0; i < i1 || (k === anchorIdx.length - 2 && i === i1); i++) {
      const t = (L3_CUM[i] - L3_CUM[i0]) / (L3_CUM[i1] - L3_CUM[i0]);
      out[i] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: 1, ny: 0 };
    }
  }
  // 이름은 선의 진행 방향에 수직으로 (오른쪽·아래쪽 우선)
  out.forEach((p, i) => {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (nx + ny * 0.6 < 0) {
      nx = -nx;
      ny = -ny;
    }
    p.nx = nx;
    p.ny = ny;
  });
  return out;
})();
const L3_KEY = new Set(["l3-jichuk", "l3-gyeongbokgung", "l3-oksu", "l3-apgujeong", "l3-express-bus-terminal", "l3-yangjae", "l3-ogeum"]);
const L3_COLOR = LINE3.color;

/* ───────── 경의중앙선 개략 경로 ─────────
 * 2호선 홍대입구·왕십리, 3호선 옥수를 기준점으로, 용산~한남은 한강 북안을 따라간다.
 * 서울 밖 구간(파주·양평)은 노선도 가장자리로 압축한다. */
function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
const RIVER_SAMPLES: Array<[number, number]> = (() => {
  const a = { x0: -10, y0: RW.y + 14, x1: RW.x - 10, y1: RW.y + 6, x2: RW.x + 40, y2: RW.y - 4, x3: VB_W / 2, y3: RIVER_MID_Y };
  const b = { x0: VB_W / 2, y0: RIVER_MID_Y, x1: VB_W - (RW.x + 40), y1: 2 * RIVER_MID_Y - (RW.y - 4), x2: RE.x - 30, y2: RE.y + 6, x3: VB_W + 10, y3: RE.y - 12 };
  const out: Array<[number, number]> = [];
  for (const c of [a, b]) for (let i = 0; i <= 60; i++) out.push([cubic(c.x0, c.x1, c.x2, c.x3, i / 60), cubic(c.y0, c.y1, c.y2, c.y3, i / 60)]);
  return out;
})();
/** 한강 띠 중심선의 y (x 에서) */
function riverY(x: number): number {
  let best = RIVER_SAMPLES[0];
  for (const p of RIVER_SAMPLES) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
  return best[1];
}
const HG = posOf(idx2("hongik-univ"));
const WS = posOf(idx2("wangsimni"));
const OKSU3 = { x: VB_W / 2 + 4, y: RIVER_MID_Y - 18 };
const GJ_ANCHORS: Record<string, { x: number; y: number }> = {
  "gj-munsan": { x: 8, y: -56 },
  "gj-ilsan": { x: 22, y: -30 },
  "gj-susaek": { x: HG.x - 40, y: HG.y - 34 },
  "gj-hongik-univ": { x: HG.x, y: HG.y },
  "gj-gongdeok": { x: HG.x + 36, y: HG.y + 26 },
  "gj-yongsan": { x: OKSU3.x - 48, y: riverY(OKSU3.x - 48) - 12 },
  "gj-hannam": { x: OKSU3.x - 14, y: riverY(OKSU3.x - 14) - 13 },
  // 환승역은 실제 노선도처럼 나란히 (3호선 옥수 바로 왼쪽 아래)
  "gj-oksu": { x: OKSU3.x - 5, y: OKSU3.y + 4 },
  "gj-wangsimni": { x: WS.x, y: WS.y },
  "gj-cheongnyangni": { x: WS.x + 14, y: WS.y - 30 },
  "gj-guri": { x: VB_W - 40, y: -40 },
  "gj-deokso": { x: VB_W - 12, y: -20 },
  "gj-jipyeong": { x: VB_W - 8, y: RE.y - 34 },
};
const GJ_CUM = [0];
for (const sg of LINE_GJ.segments.filter((_, i) => i % 2 === 0)) GJ_CUM.push(GJ_CUM[GJ_CUM.length - 1] + sg.distanceKm);
function polylineByKm(stations: Station[], cum: number[], anchors: Record<string, { x: number; y: number }>): Pt[] {
  const anchorIdx = stations.map((s, i) => (anchors[s.id] ? i : -1)).filter((i) => i >= 0);
  const out: Pt[] = [];
  for (let k = 0; k < anchorIdx.length - 1; k++) {
    const i0 = anchorIdx[k];
    const i1 = anchorIdx[k + 1];
    const a = anchors[stations[i0].id];
    const b = anchors[stations[i1].id];
    for (let i = i0; i < i1 || (k === anchorIdx.length - 2 && i === i1); i++) {
      const t = (cum[i] - cum[i0]) / (cum[i1] - cum[i0]);
      out[i] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: 1, ny: 0 };
    }
  }
  out.forEach((p, i) => {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if (nx + ny * 0.6 < 0) {
      nx = -nx;
      ny = -ny;
    }
    p.nx = nx;
    p.ny = ny;
  });
  return out;
}
const GJ_POS = polylineByKm(LINE_GJ.stations, GJ_CUM, GJ_ANCHORS);
const GJ_KEY = new Set(["gj-munsan", "gj-ilsan", "gj-yongsan", "gj-ichon", "gj-cheongnyangni", "gj-paldang", "gj-yongmun"]);
const GJ_COLOR = LINE_GJ.color;

const poly = (pts: Pt[]) => `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L")}`;
function l3Path(i: number, j: number): string {
  const [a, b] = i < j ? [i, j] : [j, i];
  return poly(L3_POS.slice(a, b + 1));
}
function gjPath(i: number, j: number): string {
  const [a, b] = i < j ? [i, j] : [j, i];
  return poly(GJ_POS.slice(a, b + 1));
}

const VB_TOP = -62;
const VB_BOTTOM = VB_H + 66;

export interface LineMapProps {
  originId?: string | null;
  destId?: string | null;
  onPick?: (station: Station) => void;
  /** 고르기 대상 노선 (다른 노선은 흐리게, 선택 불가) */
  activeLine?: LineId;
  /** 이미 달린 구간 id (from__to) — 나의 노선도 */
  visited?: Set<string>;
  /** 방문한 역 id */
  visitedStations?: Set<string>;
  label?: string;
}

interface Node {
  st: Station;
  p: Pt;
  key: boolean;
  /** 노선 안에서의 순서 */
  i: number;
}

const NODES2: Node[] = STATIONS.map((st, i) => ({ st, p: posOf(i), key: KEY.has(st.id), i }));
const NODES3: Node[] = LINE3.stations.map((st, i) => ({ st, p: L3_POS[i], key: L3_KEY.has(st.id), i }));
const NODESGJ: Node[] = LINE_GJ.stations.map((st, i) => ({ st, p: GJ_POS[i], key: GJ_KEY.has(st.id), i }));
const LINE_STYLE: Record<LineId, { base: string; visited: string; color: string }> = {
  "2": { base: "", visited: "", color: "var(--c-primary)" },
  "3": { base: "#f6d3b4", visited: "#f2a96a", color: L3_COLOR },
  GJ: { base: "#cdeadf", visited: "#9fd6c0", color: GJ_COLOR },
};

export default function LineMap({ originId, destId, onPick, activeLine, visited, visitedStations, label }: LineMapProps) {
  const { t, name, lineName } = useT();
  const [hover, setHover] = useState<string | null>(null);
  const nodeOf = (id?: string | null) =>
    id ? (NODES2.find((n) => n.st.id === id) ?? NODES3.find((n) => n.st.id === id) ?? NODESGJ.find((n) => n.st.id === id) ?? null) : null;
  const o = nodeOf(originId);
  const d = nodeOf(destId);

  const loopPath = useMemo(() => pathBetween(0, P - 0.01) + "Z", []);
  const l3Full = useMemo(() => poly(L3_POS), []);
  const gjFull = useMemo(() => poly(GJ_POS), []);
  let route: { d: string; color: string } | null = null;
  if (o && d && o.st.line === d.st.line && o.st.id !== d.st.id) {
    route =
      o.st.line === "2"
        ? { d: pathBetween(sOf(o.i), sOf(d.i)), color: "var(--c-primary)" }
        : o.st.line === "3"
          ? { d: l3Path(o.i, d.i), color: L3_COLOR }
          : { d: gjPath(o.i, d.i), color: GJ_COLOR };
  }

  const visitedPaths = useMemo(() => {
    if (!visited?.size) return [];
    const out: Array<{ d: string; line: LineId }> = [];
    SEGMENTS.forEach((seg, i) => {
      if (visited.has(seg.id)) out.push({ d: pathBetween(sOf(i), sOf((i + 1) % STATIONS.length)), line: "2" });
    });
    LINE3.stations.forEach((st, i) => {
      const nx = LINE3.stations[i + 1];
      if (nx && (visited.has(`${st.id}__${nx.id}`) || visited.has(`${nx.id}__${st.id}`))) out.push({ d: l3Path(i, i + 1), line: "3" });
    });
    LINE_GJ.stations.forEach((st, i) => {
      const nx = LINE_GJ.stations[i + 1];
      if (nx && (visited.has(`${st.id}__${nx.id}`) || visited.has(`${nx.id}__${st.id}`))) out.push({ d: gjPath(i, i + 1), line: "GJ" });
    });
    return out;
  }, [visited]);

  const dim = (line: LineId) => activeLine !== undefined && activeLine !== line;

  const renderNode = (n: Node, all: Node[]) => {
    const { st, p } = n;
    const pickable = Boolean(onPick) && !dim(st.line);
    const isEnd = st.id === o?.st.id || st.id === d?.st.id;
    const near = [o, d].some((e) => e && e.st.line === st.line && !isEnd && Math.abs(e.i - n.i) <= 1);
    const show = !dim(st.line) && (isEnd || hover === st.id || (n.key && !near));
    const lx = p.x + p.nx * (isEnd ? 13 : 10);
    const ly = p.y + p.ny * (isEnd ? 13 : 10);
    const anchor = p.nx > 0.4 ? "start" : p.nx < -0.4 ? "end" : "middle";
    void all;
    return (
      <g
        key={st.id}
        className={`${styles.station} ${pickable ? styles.pickable : ""}`}
        opacity={dim(st.line) ? 0.35 : 1}
        style={onPick && !pickable ? { pointerEvents: "none" } : undefined}
        role={pickable ? "button" : undefined}
        tabIndex={pickable ? 0 : undefined}
        aria-label={pickable ? t("map.station", { line: lineName(LINE_BY_ID[st.line]), station: name(st) }) + (st.id === o?.st.id ? t("map.origin") : st.id === d?.st.id ? t("map.dest") : "") : undefined}
        aria-hidden={pickable ? undefined : true}
        aria-pressed={pickable ? isEnd : undefined}
        onClick={() => pickable && onPick?.(st)}
        onKeyDown={(e) => {
          if (pickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onPick?.(st);
          }
        }}
        onMouseEnter={() => setHover(st.id)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(st.id)}
        onBlur={() => setHover(null)}
      >
        {pickable && <circle cx={p.x} cy={p.y} r={st.line === "2" ? 10 : st.line === "3" ? 7 : 5.5} className={styles.hit} />}
        <circle
          cx={p.x}
          cy={p.y}
          r={isEnd ? 6 : hover === st.id && pickable ? 4.6 : 3.1}
          className={st.id === o?.st.id ? styles.origin : st.id === d?.st.id ? styles.dest : visitedStations?.has(st.id) ? styles.dotVisited : styles.dot}
          style={
            st.line !== "2" && !(isEnd || visitedStations?.has(st.id))
              ? { stroke: LINE_STYLE[st.line].color }
              : st.line !== "2" && visitedStations?.has(st.id) && !isEnd
                ? { fill: LINE_STYLE[st.line].color }
                : undefined
          }
        />
        {show && (
          <text x={lx} y={ly + 3.2} textAnchor={anchor} className={isEnd ? styles.labelStrong : styles.label}>
            {name(st)}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg className={styles.map} viewBox={`0 ${VB_TOP} ${VB_W} ${VB_BOTTOM - VB_TOP}`} role="group" aria-label={label ?? t("map.label")}>
      <path d={RIVER_PATH} className={styles.river} />
      <text x={VB_W / 2 - 60} y={RIVER_MID_Y + 4} className={styles.riverLabel}>
        {t("map.river")}
      </text>
      <g opacity={dim("2") ? 0.35 : 1}>
        <path d={loopPath} className={styles.loop} />
      </g>
      <g opacity={dim("GJ") ? 0.35 : 1}>
        <path d={gjFull} className={styles.loop} style={{ stroke: LINE_STYLE.GJ.base }} />
      </g>
      <g opacity={dim("3") ? 0.35 : 1}>
        <path d={l3Full} className={styles.loop} style={{ stroke: LINE_STYLE["3"].base }} />
      </g>
      {visitedPaths.map((v, i) => (
        <path key={i} d={v.d} className={styles.visited} style={v.line !== "2" ? { stroke: LINE_STYLE[v.line].visited } : undefined} />
      ))}
      {route && <path d={route.d} className={styles.route} style={{ stroke: route.color }} />}
      {NODES2.map((n) => renderNode(n, NODES2))}
      {NODES3.map((n) => renderNode(n, NODES3))}
      {NODESGJ.map((n) => renderNode(n, NODESGJ))}
    </svg>
  );
}
