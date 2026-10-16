/**
 * 하루 목표와 주간 회고 — 기록에서 계산하는 순수 함수 (한국 시간 기준, 주는 월요일 시작).
 */
import { lineOf } from "../data/lines";
import type { RideRecord } from "../store/useAppStore";
import { focusRecords, kstDay, recordRoute } from "./stats";

/** 한국 시간 주 번호 (월요일 시작) — kstDay 0 = 1970-01-01(목) */
export const kstWeek = (t: number) => Math.floor((kstDay(t) + 3) / 7);
/** 주 번호 → 그 주 월요일의 kstDay */
export const weekStartDay = (week: number) => week * 7 - 3;

/** 오늘 끝까지 달린 집중 여행 수 (목표 진행) */
export function todayDone(records: RideRecord[], now = Date.now()): number {
  const d = kstDay(now);
  return focusRecords(records).filter((r) => !r.partial && kstDay(r.completedAt) === d).length;
}

export interface WeekSummary {
  week: number;
  rides: number;
  minutes: number;
  km: number;
  activeDays: number;
  /** 탄 호선 (지선·순환은 본선과 같은 호선) */
  lines: string[];
  /** 이번 주에 처음 가 본 역 (역 이름 기준) */
  newStations: number;
  /** 가장 많이 집중한 날 (kstDay, 분) */
  bestDay: { day: number; minutes: number } | null;
  /** 하루 목표를 채운 날 수 (goal 0 이면 0) */
  goalDays: number;
  /** 요일별 집중 분 (월~일) */
  perDay: number[];
}

const lineGroup = (id: string) => id.replace(/[ML]$/, "");

export function weekSummary(records: RideRecord[], week: number, goal = 0): WeekSummary {
  const list = focusRecords(records);
  const start = weekStartDay(week);
  const inWeek = list.filter((r) => {
    const d = kstDay(r.completedAt);
    return d >= start && d < start + 7;
  });
  const perDay = Array.from({ length: 7 }, (_, k) => Math.round(inWeek.filter((r) => kstDay(r.completedAt) === start + k).reduce((a, r) => a + r.focusSec, 0) / 60));
  const doneByDay = Array.from({ length: 7 }, (_, k) => inWeek.filter((r) => !r.partial && kstDay(r.completedAt) === start + k).length);
  // 이번 주 전에 가 본 역과 이번 주에 가 본 역 (끝까지 달린 기록만)
  const before = new Set<string>();
  const during = new Set<string>();
  const lines = new Set<string>();
  for (const r of list) {
    if (r.partial) continue;
    const d = kstDay(r.completedAt);
    if (d >= start + 7) continue;
    const route = recordRoute(r);
    if (!route) continue;
    for (const st of route) (d < start ? before : during).add(st.nameKo);
    if (d >= start) for (const st of route) lines.add(lineGroup(lineOf(st.id).id));
  }
  const best = perDay.reduce<{ day: number; minutes: number } | null>((b, m, k) => (m > 0 && (!b || m > b.minutes) ? { day: start + k, minutes: m } : b), null);
  return {
    week,
    rides: inWeek.filter((r) => !r.partial).length,
    minutes: perDay.reduce((a, m) => a + m, 0),
    km: Math.round(inWeek.reduce((a, r) => a + (r.distanceKm ?? 0), 0) * 10) / 10,
    activeDays: perDay.filter((m) => m > 0).length,
    lines: [...lines].sort(),
    newStations: [...during].filter((n) => !before.has(n)).length,
    bestDay: best,
    goalDays: goal > 0 ? doneByDay.filter((n) => n >= goal).length : 0,
    perDay,
  };
}
