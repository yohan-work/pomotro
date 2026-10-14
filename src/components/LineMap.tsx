"use client";

import { useMemo, useState } from "react";
import { SEGMENTS, STATIONS, type Station } from "@/data/line2";
import styles from "./LineMap.module.css";

/**
 * 2호선 순환 노선도 — 역 간격은 공식 역간 거리 비율.
 * 둥근 사각형 위를 시계 방향(내선순환)으로 돈다. 한강은 두 횡단 구간(당산→합정, 강변→잠실나루)을 잇는다.
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

export interface LineMapProps {
  originId?: string | null;
  destId?: string | null;
  onPick?: (station: Station) => void;
  /** 이미 달린 구간 id (from__to) — 나의 노선도 */
  visited?: Set<string>;
  /** 방문한 역 id */
  visitedStations?: Set<string>;
  label?: string;
}

export default function LineMap({ originId, destId, onPick, visited, visitedStations, label = "2호선 노선도" }: LineMapProps) {
  const [hover, setHover] = useState<string | null>(null);
  const idx = (id?: string | null) => (id ? STATIONS.findIndex((s) => s.id === id) : -1);
  const oi = idx(originId);
  const di = idx(destId);

  const loopPath = useMemo(() => pathBetween(0, P - 0.01) + "Z", []);
  const route = oi >= 0 && di >= 0 && oi !== di ? pathBetween(sOf(oi), sOf(di)) : null;

  // 한강: 두 횡단 구간의 중간점을 잇는 띠
  const river = useMemo(() => {
    const mid = (a: string, b: string) => {
      const i = STATIONS.findIndex((s) => s.id === a);
      const j = STATIONS.findIndex((s) => s.id === b);
      return at((sOf(i) + sOf(j)) / 2);
    };
    const w = mid("dangsan", "hapjeong");
    const e = mid("gangbyeon", "jamsillaru");
    return `M-10,${w.y + 14} C${w.x - 10},${w.y + 6} ${w.x + 40},${w.y - 4} ${VB_W / 2},${(w.y + e.y) / 2 + 18} S${e.x - 30},${e.y + 6} ${VB_W + 10},${e.y - 12}`;
  }, []);

  const visitedPaths = useMemo(() => {
    if (!visited?.size) return [];
    return SEGMENTS.map((seg, i) => (visited.has(seg.id) ? pathBetween(sOf(i), sOf((i + 1) % STATIONS.length)) : null)).filter(Boolean) as string[];
  }, [visited]);

  return (
    <svg className={styles.map} viewBox={`0 0 ${VB_W} ${VB_H}`} role="group" aria-label={label}>
      <path d={river} className={styles.river} />
      <text x={VB_W / 2} y={VB_H / 2 + 34} className={styles.riverLabel}>
        한강
      </text>
      <path d={loopPath} className={styles.loop} />
      {visitedPaths.map((d, i) => (
        <path key={i} d={d} className={styles.visited} />
      ))}
      {route && <path d={route} className={styles.route} />}
      {STATIONS.map((st, i) => {
        const p = posOf(i);
        const isEnd = i === oi || i === di;
        const n = STATIONS.length;
        const nearEnd = [oi, di].some((e) => e >= 0 && !isEnd && (Math.abs(e - i) <= 1 || Math.abs(e - i) === n - 1));
        const show = isEnd || hover === st.id || (KEY.has(st.id) && !nearEnd);
        const lx = p.x + p.nx * (isEnd ? 13 : 10);
        const ly = p.y + p.ny * (isEnd ? 13 : 10);
        const anchor = p.nx > 0.4 ? "start" : p.nx < -0.4 ? "end" : "middle";
        return (
          <g
            key={st.id}
            className={`${styles.station} ${onPick ? styles.pickable : ""}`}
            role={onPick ? "button" : undefined}
            tabIndex={onPick ? 0 : undefined}
            aria-label={`${st.nameKo}역${i === oi ? " (출발)" : i === di ? " (도착)" : ""}`}
            aria-pressed={onPick ? isEnd : undefined}
            onClick={() => onPick?.(st)}
            onKeyDown={(e) => {
              if (onPick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onPick(st);
              }
            }}
            onMouseEnter={() => setHover(st.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(st.id)}
            onBlur={() => setHover(null)}
          >
            <circle cx={p.x} cy={p.y} r={12} className={styles.hit} />
            <circle
              cx={p.x}
              cy={p.y}
              r={isEnd ? 6 : hover === st.id ? 4.6 : 3.3}
              className={i === oi ? styles.origin : i === di ? styles.dest : visitedStations?.has(st.id) ? styles.dotVisited : styles.dot}
            />
            {show && (
              <text x={lx} y={ly + 3.2} textAnchor={anchor} className={isEnd ? styles.labelStrong : styles.label}>
                {st.nameKo}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
