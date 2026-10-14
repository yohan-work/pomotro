/**
 * 노선 레지스트리 — 모든 노선의 역·구간을 조회하는 단일 진입점.
 * 역 id 는 노선 간에 겹치지 않는다(환승역도 노선마다 별도 역). 환승은 아직 지원하지 않는다.
 */
import { LINE2, LINE2_META } from "./line2";
import { LINE3 } from "./line3";
import type { LineDef, LineId, LineSegment, Station } from "./network";

export * from "./network";
export { LINE2_META };

export const LINES: LineDef[] = [LINE2, LINE3];
export const LINE_BY_ID: Record<LineId, LineDef> = { "2": LINE2, "3": LINE3 };

const stationById = new Map<string, Station>();
const indexInLine = new Map<string, number>();
for (const l of LINES)
  l.stations.forEach((s, i) => {
    stationById.set(s.id, s);
    indexInLine.set(s.id, i);
  });
const segmentByPair = new Map<string, LineSegment>();
for (const l of LINES) for (const s of l.segments) segmentByPair.set(`${s.fromStationId}>${s.toStationId}`, s);

/** 전체 역 수 (모든 노선) */
export const ALL_STATIONS: Station[] = LINES.flatMap((l) => l.stations);

export function getStation(id: string): Station {
  const s = stationById.get(id);
  if (!s) throw new Error(`Unknown station: ${id}`);
  return s;
}

export function lineOf(stationId: string): LineDef {
  return LINE_BY_ID[getStation(stationId).line];
}

export function getSegment(fromId: string, toId: string): LineSegment {
  const s = segmentByPair.get(`${fromId}>${toId}`);
  if (!s) throw new Error(`No direct segment ${fromId} → ${toId}`);
  return s;
}

/**
 * 같은 노선 위 from → to 역 순서 (환승 없음).
 * 순환선은 내선순환 방향으로 경계를 넘을 수 있고, 직선 노선은 어느 방향이든 갈 수 있다.
 */
export function stationsBetween(fromId: string, toId: string): Station[] {
  const a = getStation(fromId);
  const b = getStation(toId);
  if (a.line !== b.line || a.id === b.id) throw new Error(`Invalid route ${fromId} → ${toId}`);
  const line = LINE_BY_ID[a.line];
  const i = indexInLine.get(a.id)!;
  const j = indexInLine.get(b.id)!;
  const n = line.stations.length;
  if (line.loop) {
    const len = ((j - i + n) % n) + 1;
    return Array.from({ length: len }, (_, k) => line.stations[(i + k) % n]);
  }
  const step = j > i ? 1 : -1;
  return Array.from({ length: Math.abs(j - i) + 1 }, (_, k) => line.stations[i + k * step]);
}

/** 경로의 예상 소요시간(초): 공식 표준 운행시간 합 + 중간역 정차(추정) */
export function estimateRouteSec(stations: Station[]): number {
  let sec = 0;
  for (let k = 0; k < stations.length - 1; k++) {
    sec += getSegment(stations[k].id, stations[k + 1].id).runSec;
    if (k > 0) sec += LINE2_META.estDwellSec;
  }
  return sec;
}

/** 경로의 실제 거리(km) — 공식 역간 거리 합 */
export function routeDistanceKm(stations: Station[]): number {
  let km = 0;
  for (let k = 0; k < stations.length - 1; k++) km += getSegment(stations[k].id, stations[k + 1].id).distanceKm;
  return Math.round(km * 10) / 10;
}

/** 노선도상 이웃 역 (순환선은 순환, 직선 노선 끝은 null) */
export function neighbors(id: string): { prev: Station | null; next: Station | null } {
  const line = lineOf(id);
  const i = indexInLine.get(id)!;
  const n = line.stations.length;
  if (line.loop) return { prev: line.stations[(i - 1 + n) % n], next: line.stations[(i + 1) % n] };
  return { prev: i > 0 ? line.stations[i - 1] : null, next: i < n - 1 ? line.stations[i + 1] : null };
}
