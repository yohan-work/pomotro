/** 기록 통계 — 집중(focus) 기록만 센다. 체험 운행·휴식은 제외 */
import { ALL_STATIONS, stationsBetween } from "../data/lines";
import type { RideRecord } from "../store/useAppStore";

const DAY = 86400000;
const KST = 9 * 3600 * 1000;
export const kstDay = (t: number) => Math.floor((t + KST) / DAY);

export function focusRecords(records: RideRecord[]): RideRecord[] {
  return records.filter((r) => r.mode === "focus");
}

/** 끝까지 달린 기록의 구간·역 (중도 하차는 위치를 알 수 없어 제외) */
export function visited(records: RideRecord[]): { segments: Set<string>; stations: Set<string> } {
  const segments = new Set<string>();
  const stations = new Set<string>();
  for (const r of focusRecords(records)) {
    if (r.partial) continue;
    let route;
    try {
      route = stationsBetween(r.fromId, r.toId);
    } catch {
      continue;
    }
    route.forEach((s, i) => {
      stations.add(s.id);
      if (i > 0) segments.add(`${route[i - 1].id}__${s.id}`);
    });
  }
  return { segments, stations };
}

export interface Totals {
  rides: number;
  focusSec: number;
  km: number;
  stations: number;
  stationsTotal: number;
  streak: number;
}

export function totals(records: RideRecord[], now = Date.now()): Totals {
  const list = focusRecords(records);
  const days = new Set(list.map((r) => kstDay(r.completedAt)));
  // 연속 일수: 오늘(또는 오늘 아직 안 했으면 어제)부터 거꾸로
  let d = kstDay(now);
  if (!days.has(d)) d -= 1;
  let streak = 0;
  while (days.has(d)) {
    streak++;
    d--;
  }
  return {
    rides: list.filter((r) => !r.partial).length,
    focusSec: list.reduce((a, r) => a + r.focusSec, 0),
    km: Math.round(list.reduce((a, r) => a + (r.distanceKm ?? 0), 0) * 10) / 10,
    stations: visited(records).stations.size,
    stationsTotal: ALL_STATIONS.length,
    streak,
  };
}

export interface DayBar {
  day: number;
  label: string;
  minutes: number;
  rides: number;
  isToday: boolean;
}

/** 최근 7일(오늘 포함) 일별 집중 시간 */
export function lastWeek(records: RideRecord[], now = Date.now()): DayBar[] {
  const today = kstDay(now);
  const list = focusRecords(records);
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  return Array.from({ length: 7 }, (_, k) => {
    const day = today - 6 + k;
    const recs = list.filter((r) => kstDay(r.completedAt) === day);
    const date = new Date(day * DAY);
    return {
      day,
      label: k === 6 ? "오늘" : names[date.getUTCDay()],
      minutes: Math.round(recs.reduce((a, r) => a + r.focusSec, 0) / 60),
      rides: recs.length,
      isToday: k === 6,
    };
  });
}
