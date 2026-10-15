/**
 * 노선 레지스트리 — 모든 노선의 역·구간을 조회하는 단일 진입점.
 * 역 id 는 노선 간에 겹치지 않는다(환승역도 노선마다 별도 역). 환승은 아직 지원하지 않는다.
 */
import { LINE2, LINE2_META } from "./line2";
import { LINE3 } from "./line3";
import { LINE_GJ } from "./lineGJ";
import { LINE1, LINE4, LINE5, LINE5M, LINE6, LINE6L, LINE7, LINE8 } from "./metroLines";
import type { LineDef, LineId, LineSegment, Station } from "./network";
import { TRANSFER_OFFICIAL } from "./transfer.official";

export * from "./network";
export { LINE2_META };

export const LINES: LineDef[] = [LINE1, LINE2, LINE3, LINE4, LINE5, LINE5M, LINE6, LINE6L, LINE7, LINE8, LINE_GJ];
export const LINE_BY_ID: Record<LineId, LineDef> = { "1": LINE1, "2": LINE2, "3": LINE3, "4": LINE4, "5": LINE5, "5M": LINE5M, "6": LINE6, "6L": LINE6L, "7": LINE7, "8": LINE8, GJ: LINE_GJ };

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

/* ───────── 환승 ─────────
 * 서울교통공사 「환승역거리 소요시간 정보」(transfer.official.ts)에 있는 환승만 잇는다. 공식 값이 없는 환승은 만들지 않는다.
 * 경로에서 연속한 두 역이 다른 노선이면 그 사이는 환승(같은 역 이름, 걸어서 갈아타기)이다.
 */
export interface Transfer {
  from: string;
  to: string;
  /** 환승 거리 (m) — 공식 */
  meters: number;
  /** 환승 소요시간 (초, 보행 1.2m/s) — 공식 */
  sec: number;
}
/** 공식 데이터의 노선 표기 → 이 앱의 노선 (지선·순환 포함) */
const XFER_LINES: Record<string, LineId[]> = {
  "1": ["1"], "2": ["2"], "3": ["3"], "4": ["4"], "5": ["5", "5M"], "6": ["6", "6L"], "7": ["7"], "8": ["8"],
  "1호선": ["1"], "2호선": ["2"], "3호선": ["3"], "4호선": ["4"], "5호선": ["5", "5M"], "6호선": ["6", "6L"], "7호선": ["7"], "8호선": ["8"],
  경의중앙선: ["GJ"],
};
const transferByPair = new Map<string, Transfer>();
const transfersFrom = new Map<string, Transfer[]>();
for (const r of TRANSFER_OFFICIAL) {
  const at = (ids: LineId[] | undefined) => (ids ?? []).flatMap((l) => LINE_BY_ID[l].stations.filter((s) => s.nameKo === r.station));
  for (const a of at(XFER_LINES[r.line]))
    for (const b of at(XFER_LINES[r.toLine])) {
      if (a.line === b.line) continue;
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        const key = `${x.id}>${y.id}`;
        if (transferByPair.has(key)) continue;
        const t: Transfer = { from: x.id, to: y.id, meters: r.meters, sec: r.sec };
        transferByPair.set(key, t);
        transfersFrom.set(x.id, [...(transfersFrom.get(x.id) ?? []), t]);
      }
    }
}

/** 두 역 사이 환승 (공식 데이터가 있을 때만) */
export function transferBetween(fromId: string, toId: string): Transfer | undefined {
  return transferByPair.get(`${fromId}>${toId}`);
}
export function transfersAt(stationId: string): Transfer[] {
  return transfersFrom.get(stationId) ?? [];
}
/** 경로의 연속한 두 역이 환승인지 */
export const isTransferPair = (a: Station, b: Station) => a.line !== b.line;

/** 환승에서 경로를 나눈 구간들 (각 구간은 한 노선) */
export function routeLegs(stations: Station[]): Station[][] {
  const legs: Station[][] = [[stations[0]]];
  for (let k = 1; k < stations.length; k++) {
    if (isTransferPair(stations[k - 1], stations[k])) legs.push([stations[k]]);
    else legs[legs.length - 1].push(stations[k]);
  }
  return legs;
}

/** 환승 1회에 더하는 기다림(추정, 배차 간격의 절반쯤) — 경로 비교·예상 시간에만 쓴다 */
export const TRANSFER_WAIT_SEC = 150;
/** 경로 고를 때만 더하는 환승 부담 — 몇 분 빠르다고 여러 번 갈아타는 경로를 고르지 않게 */
const TRANSFER_BURDEN_SEC = 300;

/**
 * from → to 경로. 같은 노선이면 그 노선으로만(지금까지와 같다), 다르면 환승을 포함한 경로.
 * 비용 = 공식 운행시간 + 정차(추정) + 공식 환승시간 + 기다림(추정) + 환승 부담. 갈 수 없으면 null.
 * 도착역은 이름으로 본다 — 같은 이름의 다른 노선 역에 닿으면 도착 (도착역에서 괜히 갈아타지 않는다).
 */
export function findRoute(fromId: string, toId: string): Station[] | null {
  const a = getStation(fromId);
  let b = getStation(toId);
  if (a.id === b.id || a.nameKo === b.nameKo) return null;
  if (a.line === b.line) return stationsBetween(fromId, toId);
  const dist = new Map<string, number>([[a.id, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  const out = new Map<string, Array<[string, number]>>();
  const edges = (id: string) => {
    let e = out.get(id);
    if (!e) {
      e = [];
      for (const s of LINE_BY_ID[getStation(id).line].segments) if (s.fromStationId === id) e.push([s.toStationId, s.runSec + LINE2_META.estDwellSec]);
      for (const t of transfersAt(id)) e.push([t.to, t.sec + TRANSFER_WAIT_SEC + TRANSFER_BURDEN_SEC]);
      out.set(id, e);
    }
    return e;
  };
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) {
      best = d;
      u = id;
    }
    if (u === null) return null;
    if (getStation(u).nameKo === b.nameKo) {
      b = getStation(u);
      break;
    }
    done.add(u);
    for (const [v, w] of edges(u)) {
      const nd = best + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, u);
      }
    }
  }
  const ids = [b.id];
  while (ids[0] !== a.id) ids.unshift(prev.get(ids[0])!);
  return ids.map(getStation);
}

/** 경로의 예상 소요시간(초): 공식 표준 운행시간 합 + 중간역 정차(추정) + 환승(공식 보행시간 + 기다림 추정) */
export function estimateRouteSec(stations: Station[]): number {
  let sec = 0;
  for (let k = 0; k < stations.length - 1; k++) {
    const t = transferBetween(stations[k].id, stations[k + 1].id);
    if (t) sec += t.sec + TRANSFER_WAIT_SEC;
    else {
      sec += getSegment(stations[k].id, stations[k + 1].id).runSec;
      if (k > 0 && !isTransferPair(stations[k - 1], stations[k])) sec += LINE2_META.estDwellSec;
    }
  }
  return sec;
}

/** 경로의 실제 거리(km) — 공식 역간 거리 합 (환승 통로는 제외) */
export function routeDistanceKm(stations: Station[]): number {
  let km = 0;
  for (let k = 0; k < stations.length - 1; k++) if (!isTransferPair(stations[k], stations[k + 1])) km += getSegment(stations[k].id, stations[k + 1].id).distanceKm;
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
