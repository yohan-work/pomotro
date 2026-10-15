"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { latLonOf, type LatLon } from "@/data/geo";
import { LINES, LINE_BY_ID, findRoute, routeLegs, type LineDef, type LineId, type Station } from "@/data/lines";
import { useT } from "@/i18n";
import styles from "./LineMap.module.css";

/**
 * 노선도 — 공식 역 좌표(서울시 역사마스터 정보·국가철도공단 역위치)로 그린다.
 * - 서울 도심(반경 약 13km)은 실제 축척 그대로, 그 바깥(파주·양평·하남 등)은 가장자리로 부드럽게 압축한다.
 * - 역을 고를 때는 그 노선으로, 추천 구간 미리보기는 그 구간으로 확대한다.
 * - 역 이름은 서로 겹치지 않게 배치한다 (우선순위: 출발·도착 > 종착역 > 환승역 > 나머지).
 */

const LAT0 = 37.552;
const LON0 = 126.99;
const KX = Math.cos((LAT0 * Math.PI) / 180);
/** 1km = 10 단위 */
const U = 10;
/** 이 반경(km) 안은 실제 축척 */
const R0 = 13;

type XY = { x: number; y: number };

function project(p: LatLon): XY {
  let x = (p.lon - LON0) * 111.32 * KX;
  let y = -(p.lat - LAT0) * 110.57;
  const r = Math.hypot(x, y);
  if (r > R0) {
    const k = (R0 + 7 * Math.log1p((r - R0) / 7)) / r;
    x *= k;
    y *= k;
  }
  return { x: x * U, y: y * U };
}

/** 한강 중심선 (대략, 장식용) — 행주 → 팔당·양수 */
const HAN: Array<[number, number]> = [
  [126.76, 37.625], [126.81, 37.598], [126.86, 37.574], [126.905, 37.542], [126.935, 37.53], [126.959, 37.518],
  [126.98, 37.511], [127.0, 37.514], [127.018, 37.532], [127.04, 37.535], [127.067, 37.525], [127.094, 37.528],
  [127.104, 37.533], [127.115, 37.541], [127.128, 37.553], [127.145, 37.565], [127.17, 37.578], [127.195, 37.582], [127.225, 37.56],
  [127.26, 37.535], [127.31, 37.54],
];
const HAN_XY = HAN.map(([lon, lat]) => project({ lat, lon }));
const RIVER_PATH = "M" + HAN_XY.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L");
const RIVER_LABEL = project({ lat: 37.523, lon: 126.94 });

/* ───────── 역·노선 위치 ───────── */
const POS = new Map<string, XY>();
for (const l of LINES) for (const s of l.stations) POS.set(s.id, project(latLonOf(s)));
const pos = (st: Station) => POS.get(st.id)!;
const poly = (pts: XY[], close = false) => `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L")}${close ? "Z" : ""}`;
const LINE_PATH = new Map<LineId, string>(LINES.map((l) => [l.id, poly(l.stations.map(pos), l.loop)]));
const STATION_BY_ID = new Map<string, Station>(LINES.flatMap((l) => l.stations.map((s) => [s.id, s] as const)));

/** 같은 이름의 역이 몇 노선에 있는지 (환승역 우선 표시) */
const NAME_COUNT = new Map<string, number>();
for (const l of LINES) for (const s of l.stations) NAME_COUNT.set(s.nameKo, (NAME_COUNT.get(s.nameKo) ?? 0) + 1);
const TERMINALS = new Set(LINES.filter((l) => !l.loop).flatMap((l) => [l.stations[0].id, l.stations[l.stations.length - 1].id]));

type Box = { x: number; y: number; w: number; h: number };
const ASPECT = 4 / 3;
function boundsOf(pts: XY[], pad: number, minW: number): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  let w = Math.max(minW, x1 - x0) * (1 + pad * 2);
  let h = (y1 - y0) * (1 + pad * 2);
  if (w / h < ASPECT) w = h * ASPECT;
  else h = w / ASPECT;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}
const FULL = boundsOf([...POS.values()], 0.03, 0);

/** 두 역 사이 경로 (다른 노선이면 환승 경로) */
function routeStations(a: Station, b: Station): Station[] | null {
  try {
    return findRoute(a.id, b.id);
  } catch {
    return null;
  }
}

/** 글자 폭 추정 (한글 1em, 그 외 0.6em) */
const textW = (s: string, fs: number) => [...s].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? fs : fs * 0.6), 0);
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

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

/** 보여 줄 범위를 부드럽게 옮긴다 (모션 감소 시 즉시) */
function useTweenBox(target: Box): Box {
  const [box, setBox] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const from = cur.current;
    if (Math.abs(from.x - target.x) + Math.abs(from.y - target.y) + Math.abs(from.w - target.w) < 0.5) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cur.current = target;
      setBox(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 350);
      const e = 1 - Math.pow(1 - k, 3);
      const b = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      cur.current = b;
      setBox(b);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return box;
}

export default function LineMap({ originId, destId, onPick, activeLine, visited, visitedStations, label }: LineMapProps) {
  const { t, name, lineName } = useT();
  const [hover, setHover] = useState<string | null>(null);
  const o = originId ? (STATION_BY_ID.get(originId) ?? null) : null;
  const d = destId ? (STATION_BY_ID.get(destId) ?? null) : null;
  const routeSt = useMemo(() => (o && d && o.id !== d.id ? routeStations(o, d) : null), [o, d]);
  const legs = useMemo(() => (routeSt ? routeLegs(routeSt) : []), [routeSt]);

  // 보여 줄 범위: 고르는 노선 / 추천 구간 / 전체
  const target = useMemo(() => {
    // 환승 경로를 골랐으면 경로 전체가 보이게
    if (routeSt && legs.length > 1) return boundsOf(routeSt.map(pos), 0.18, 140);
    if (activeLine) return boundsOf(LINE_BY_ID[activeLine].stations.map(pos), 0.08, 60);
    if (routeSt) return boundsOf(routeSt.map(pos), 0.25, 140);
    return FULL;
  }, [activeLine, routeSt, legs]);
  const box = useTweenBox(target);
  /** 확대 정도에 맞춘 글자·점 크기 (화면에서 거의 일정하게) */
  const s = box.w / 420;
  const fs = 9 * s;

  const dim = (line: LineId) => activeLine !== undefined && activeLine !== line;

  // 역 이름 배치 — 목표 범위 기준으로 계산 (확대 애니메이션 중에는 다시 계산하지 않는다)
  const labels = useMemo(() => {
    const ts = target.w / 420;
    const f = 9 * ts;
    const inView = (p: XY) => p.x > target.x && p.x < target.x + target.w && p.y > target.y && p.y < target.y + target.h;
    const routeIds = new Set(routeSt?.map((x) => x.id) ?? []);
    const zoomed = Boolean(activeLine || routeSt);
    type C = { st: Station; pri: number; strong: boolean };
    const cands: C[] = [];
    for (const l of LINES) {
      for (const st of l.stations) {
        // 고르는 노선 밖은 경로 위 역만
        if (activeLine && activeLine !== l.id && !routeIds.has(st.id)) continue;
        if (!inView(pos(st))) continue;
        if (st.id === o?.id || st.id === d?.id) {
          cands.push({ st, pri: 0, strong: true });
          continue;
        }
        const nc = NAME_COUNT.get(st.nameKo) ?? 1;
        let pri = TERMINALS.has(st.id) ? 1 : nc >= 3 ? 2 : nc === 2 ? 3 : 4;
        if (routeIds.has(st.id)) pri = Math.min(pri, 2.5);
        if (!zoomed && pri >= 3) continue;
        cands.push({ st, pri, strong: false });
      }
    }
    cands.sort((a, b) => a.pri - b.pri);
    // 점 자리도 피한다 (활성 노선의 역 점)
    const placed: Box[] = [];
    const out: Array<{ st: Station; x: number; y: number; anchor: "start" | "end" | "middle"; strong: boolean }> = [];
    const seenName = new Set<string>();
    for (const c of cands) {
      if (seenName.has(c.st.nameKo) && !c.strong) continue;
      const p = pos(c.st);
      const text = name(c.st);
      const size = c.strong ? f * 1.2 : f;
      const w = textW(text, size);
      const h = size * 1.05;
      const off = (c.strong ? 6 : 4.2) * ts;
      const opts: Array<[Box, number, number, "start" | "end" | "middle"]> = [
        [{ x: p.x + off, y: p.y - h / 2, w, h }, p.x + off, p.y + size * 0.36, "start"],
        [{ x: p.x - off - w, y: p.y - h / 2, w, h }, p.x - off, p.y + size * 0.36, "end"],
        [{ x: p.x - w / 2, y: p.y - off - h, w, h }, p.x, p.y - off - size * 0.2, "middle"],
        [{ x: p.x - w / 2, y: p.y + off, w, h }, p.x, p.y + off + size * 0.85, "middle"],
      ];
      const ok = opts.find(([b]) => !placed.some((q) => overlap(b, q)));
      if (!ok) continue;
      placed.push(ok[0]);
      seenName.add(c.st.nameKo);
      out.push({ st: c.st, x: ok[1], y: ok[2], anchor: ok[3], strong: c.strong });
    }
    return out;
  }, [target, o?.id, d?.id, activeLine, routeSt, name]);

  const visitedPaths = useMemo(() => {
    if (!visited?.size) return [];
    const out: Array<{ d: string; color: string }> = [];
    for (const l of LINES)
      for (const seg of l.segments) {
        if (!visited.has(seg.id)) continue;
        out.push({ d: poly([POS.get(seg.fromStationId)!, POS.get(seg.toStationId)!]), color: l.color });
      }
    return out;
  }, [visited]);

  const hoverSt = hover ? STATION_BY_ID.get(hover) : undefined;

  const renderStation = (st: Station, line: LineDef) => {
    const p = pos(st);
    const pickable = Boolean(onPick) && !dim(line.id);
    const isO = st.id === o?.id;
    const isD = st.id === d?.id;
    const isEnd = isO || isD;
    const vis = visitedStations?.has(st.id);
    return (
      <g
        key={st.id}
        className={`${styles.station} ${pickable ? styles.pickable : ""}`}
        opacity={dim(line.id) ? 0.3 : 1}
        style={onPick && !pickable ? { pointerEvents: "none" } : undefined}
        role={pickable ? "button" : undefined}
        tabIndex={pickable ? 0 : undefined}
        aria-label={pickable ? t("map.station", { line: lineName(line), station: name(st) }) + (isO ? t("map.origin") : isD ? t("map.dest") : "") : undefined}
        aria-hidden={pickable ? undefined : true}
        aria-pressed={pickable ? isEnd : undefined}
        data-station={st.id}
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
        {pickable && <circle cx={p.x} cy={p.y} r={7 * s} className={styles.hit} />}
        <circle
          cx={p.x}
          cy={p.y}
          r={(isEnd ? 4.4 : hover === st.id && pickable ? 3.4 : 2.2) * s}
          strokeWidth={(isEnd ? 1.4 : 1.1) * s}
          className={isO ? styles.origin : isD ? styles.dest : vis ? styles.dotVisited : styles.dot}
          style={isEnd ? undefined : vis ? { fill: line.color } : { stroke: line.color }}
        />
      </g>
    );
  };

  // 활성 노선을 맨 위에 그린다
  const order = activeLine ? [...LINES.filter((l) => l.id !== activeLine), LINE_BY_ID[activeLine]] : LINES;

  return (
    <svg
      className={styles.map}
      viewBox={`${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`}
      role="group"
      aria-label={label ?? t("map.label")}
    >
      <path d={RIVER_PATH} className={styles.river} strokeWidth={Math.max(9, 8 * s)} />
      <text x={RIVER_LABEL.x} y={RIVER_LABEL.y + fs * 0.35} className={styles.riverLabel} fontSize={fs}>
        {t("map.river")}
      </text>
      {order.map((l) => (
        <path key={l.id} d={LINE_PATH.get(l.id)} className={styles.loop} style={{ stroke: l.color }} strokeWidth={3.2 * s} opacity={dim(l.id) ? 0.12 : 0.32} />
      ))}
      {visitedPaths.map((v, i) => (
        <path key={i} d={v.d} className={styles.visited} style={{ stroke: v.color }} strokeWidth={3.4 * s} />
      ))}
      {legs.map((leg, k) => (
        <path key={k} d={poly(leg.map(pos))} className={styles.route} style={{ stroke: LINE_BY_ID[leg[0].line].color }} strokeWidth={4 * s} />
      ))}
      {/* 환승역: 흰 고리 */}
      {legs.slice(1).map((leg, k) => (
        <circle key={`x${k}`} cx={pos(leg[0]).x} cy={pos(leg[0]).y} r={4.2 * s} className={styles.transfer} strokeWidth={1.6 * s} />
      ))}
      {order.map((l) => (
        <g key={l.id}>{l.stations.map((st) => renderStation(st, l))}</g>
      ))}
      {labels.map((lb) => (
        <text key={lb.st.id} x={lb.x} y={lb.y} textAnchor={lb.anchor} className={lb.strong ? styles.labelStrong : styles.label} fontSize={lb.strong ? fs * 1.2 : fs} strokeWidth={3 * s}>
          {name(lb.st)}
        </text>
      ))}
      {hoverSt && !labels.some((lb) => lb.st.id === hoverSt.id) && (
        <text x={pos(hoverSt).x + 5 * s} y={pos(hoverSt).y - 5 * s} className={styles.labelStrong} fontSize={fs * 1.1} strokeWidth={3 * s}>
          {name(hoverSt)}
        </text>
      )}
    </svg>
  );
}
