/**
 * 장거리 여행 — 긴 코스를 여러 번의 집중으로 나눠 달린다.
 *
 * - 코스는 경유역 목록으로 정의하고 경로는 노선 데이터로 만든다 (경유역 사이는 같은 노선이면 그 노선, 아니면 환승 경로)
 * - 다음 구간: 지금 위치에서 집중시간 안에 갈 수 있는(예상 소요시간 기준) 가장 먼 역까지
 * - 진행은 끝까지 달린 집중 여행만큼만 (중도 하차는 위치를 알 수 없어 진행 없음)
 */
import { estimateRouteSec, findRoute, getStation, isTransferPair, routeDistanceKm, stationsBetween, type Station } from "../data/lines";
import { minJourneySec } from "../sim/journey";

export type TripId = "loop2" | "bridges" | "line5" | "gyeongui" | "line7" | "line4";

export interface TripPreset {
  id: TripId;
  /** 경유역 — 이웃한 두 경유역이 같은 노선이면 그 노선으로만 */
  waypoints: string[];
}

export const TRIPS: readonly TripPreset[] = [
  // 2호선 내선순환 한 바퀴 (시청 → … → 충정로 → 시청)
  { id: "loop2", waypoints: ["city-hall", "chungjeongno", "city-hall"] },
  // 지하철로 건너는 한강 다리 다섯: 동작대교 → 당산철교 → 잠실철교 → 청담대교 → 동호대교
  {
    id: "bridges",
    waypoints: ["l4-ichon", "l4-dongjak", "dangsan", "hapjeong", "gangbyeon", "jamsillaru", "l7-jayang", "l7-cheongdam", "l3-apgujeong", "l3-oksu"],
  },
  { id: "line5", waypoints: ["l5-banghwa", "l5-hanam-geomdansan"] },
  { id: "line7", waypoints: ["l7-jangam", "l7-onsu"] },
  { id: "line4", waypoints: ["l4-buramsan", "l4-namtaeryeong"] },
  { id: "gyeongui", waypoints: ["gj-munsan", "gj-jipyeong"] },
];

const cache = new Map<TripId, Station[]>();

/** 코스 전체 경로 (역 목록, 환승은 같은 이름의 두 역이 이어진다) */
export function tripPath(id: TripId): Station[] {
  const hit = cache.get(id);
  if (hit) return hit;
  const wp = TRIPS.find((t) => t.id === id)!.waypoints;
  const out: Station[] = [getStation(wp[0])];
  for (let k = 1; k < wp.length; k++) {
    const a = wp[k - 1];
    const b = wp[k];
    // 순환선 한 바퀴처럼 같은 역으로 돌아오는 경우: 직전 역에서 이어서
    const leg = getStation(a).line === getStation(b).line ? stationsBetween(a, b) : findRoute(a, b);
    if (!leg) throw new Error(`No route ${a} → ${b}`);
    // 도착역 이름이 같은 다른 노선 역으로 끝나면 경유역 노선으로 갈아탄다
    const legIds = leg.map((s) => s.id);
    if (legIds[legIds.length - 1] !== b) legIds.push(b);
    out.push(...legIds.slice(1).map(getStation));
  }
  cache.set(id, out);
  return out;
}

export interface TripLeg {
  /** 코스 경로에서 시작·끝 index */
  from: number;
  to: number;
  stationIds: string[];
  estSec: number;
}

/** 경로 i..j 가 이 집중시간에 연출 가능한가 */
const fits = (ids: string[], focusSec: number) => minJourneySec(ids) <= focusSec;

/**
 * 지금 위치(index)에서 집중시간에 맞는 다음 구간. 남은 코스가 없으면 null.
 * 예상 소요시간이 집중시간을 넘지 않는 가장 먼 역까지 (최소 한 구간). 구간은 환승으로 시작하거나 끝나지 않는다
 * — 환승역에서 끝나면 다음 구간은 갈아탄 노선의 역에서 출발한다.
 */
export function nextLeg(id: TripId, progress: number, focusSec: number): TripLeg | null {
  const path = tripPath(id);
  let i = progress;
  // 환승 직전에서 멈춰 있으면 갈아탄 역에서 출발
  while (i < path.length - 1 && isTransferPair(path[i], path[i + 1])) i++;
  if (i >= path.length - 1) return null;
  let best = -1;
  for (let j = i + 1; j < path.length; j++) {
    if (isTransferPair(path[j - 1], path[j])) continue; // 환승으로 끝나는 구간은 없다
    const ids = path.slice(i, j + 1).map((s) => s.id);
    if (best < 0 || estimateRouteSec(path.slice(i, j + 1)) <= focusSec) {
      if (!fits(ids, focusSec) && best >= 0) break;
      best = j;
    } else break;
  }
  const slice = path.slice(i, best + 1);
  return { from: i, to: best, stationIds: slice.map((s) => s.id), estSec: estimateRouteSec(slice) };
}

export interface TripSummary {
  stations: number;
  km: number;
  estSec: number;
}

export function tripSummary(id: TripId): TripSummary {
  const path = tripPath(id);
  return { stations: path.slice(0, -1).filter((s, i) => !isTransferPair(s, path[i + 1])).length, km: routeDistanceKm(path), estSec: estimateRouteSec(path) };
}

/** 진행한 구간 수 (환승 제외) */
export function tripDone(id: TripId, progress: number): number {
  const path = tripPath(id);
  return path.slice(0, progress).filter((s, i) => !isTransferPair(s, path[i + 1])).length;
}
