/**
 * 노선 진행도와 배지 — 기록(완주한 집중 여행)만으로 계산하는 순수 함수. 저장하지 않으므로 기록을 지우면 함께 사라진다.
 */
import { LINES, getStation, type LineDef } from "../data/lines";
import { middleSections, type WaterVariant } from "../data/scenery";
import type { RideRecord } from "../store/useAppStore";
import { EVENT_KINDS } from "../sim/rideEvents";
import { focusRecords, kstDay, totals, visited } from "./stats";

/** 같은 호선의 지선·순환은 한 묶음으로 */
const GROUPS: Array<{ id: string; lines: string[] }> = [
  { id: "1", lines: ["1"] },
  { id: "2", lines: ["2"] },
  { id: "3", lines: ["3"] },
  { id: "4", lines: ["4"] },
  { id: "5", lines: ["5", "5M"] },
  { id: "6", lines: ["6", "6L"] },
  { id: "7", lines: ["7"] },
  { id: "8", lines: ["8"] },
  { id: "GJ", lines: ["GJ"] },
];

export interface LineProgress {
  id: string;
  /** 대표 노선 (배지·색) */
  line: LineDef;
  visited: number;
  total: number;
}

/** 호선별 방문한 역 수 / 전체 역 수 (같은 이름은 한 역) */
export function lineProgress(records: RideRecord[]): LineProgress[] {
  const v = visited(records).stations;
  return GROUPS.map((g) => {
    const lines = LINES.filter((l) => g.lines.includes(l.id));
    const names = new Set(lines.flatMap((l) => l.stations.map((s) => s.nameKo)));
    const seen = new Set(lines.flatMap((l) => l.stations.filter((s) => v.has(s.id)).map((s) => s.nameKo)));
    return { id: g.id, line: lines[0], visited: seen.size, total: names.size };
  });
}

/** 지하철로 건너는 한강 다리 다섯 */
export const HAN_BRIDGES: WaterVariant[] = ["hangang-yanghwa", "hangang-jamsil", "hangang-dongho", "hangang-dongjak", "hangang-cheongdam"];

/** 건넌 한강 다리 (완주한 구간 기준) */
export function bridgesCrossed(records: RideRecord[]): Set<WaterVariant> {
  const out = new Set<WaterVariant>();
  for (const segId of visited(records).segments) {
    const [a, b] = segId.split("__");
    for (const sp of middleSections(segId, getStation(a), getStation(b))) if (sp.kind === "river" && sp.variant && HAN_BRIDGES.includes(sp.variant)) out.add(sp.variant);
  }
  return out;
}

export type BadgeId =
  | "first-ride"
  | "han-river"
  | "five-bridges"
  | "loop2"
  | "first-transfer"
  | "line-complete"
  | "focus-10h"
  | "km-100"
  | "streak-7"
  | "dex-half"
  | "trip-complete"
  | "goal-day";

export const BADGE_IDS: readonly BadgeId[] = ["first-ride", "han-river", "first-transfer", "five-bridges", "loop2", "line-complete", "trip-complete", "goal-day", "focus-10h", "km-100", "streak-7", "dex-half"];

export interface Badge {
  id: BadgeId;
  earned: boolean;
  /** 진행 중인 배지의 진행도 */
  progress?: { n: number; total: number };
}

/** 하루 목표를 채운 날이 있는지 (기록 기준, 목표는 지금 설정값) */
function goalReached(done: RideRecord[], goal: number): boolean {
  if (goal <= 0) return false;
  const byDay = new Map<number, number>();
  for (const r of done) byDay.set(kstDay(r.completedAt), (byDay.get(kstDay(r.completedAt)) ?? 0) + 1);
  return [...byDay.values()].some((n) => n >= goal);
}

export function badges(records: RideRecord[], now = Date.now(), goal = 4): Badge[] {
  const done = focusRecords(records).filter((r) => !r.partial);
  const tot = totals(records, now);
  const bridges = bridgesCrossed(records).size;
  const segs = visited(records).segments;
  const loop2 = LINES.find((l) => l.id === "2")!.segments.filter((s) => segs.has(s.id)).length;
  const complete = lineProgress(records).filter((p) => p.visited === p.total).length;
  const dex = new Set(records.flatMap((r) => r.encounters ?? [])).size;
  const transfer = done.some((r) => r.stationIds && new Set(r.stationIds.map((id) => getStation(id).line)).size > 1);
  const b = (id: BadgeId, n: number, total: number): Badge => ({ id, earned: n >= total, progress: total > 1 ? { n: Math.min(n, total), total } : undefined });
  return [
    b("first-ride", done.length, 1),
    b("han-river", Math.min(1, bridges), 1),
    b("first-transfer", transfer ? 1 : 0, 1),
    b("five-bridges", bridges, HAN_BRIDGES.length),
    b("loop2", loop2, 43),
    b("line-complete", complete, 1),
    b("trip-complete", done.some((r) => r.trip?.done) ? 1 : 0, 1),
    b("goal-day", goalReached(done, goal) ? 1 : 0, 1),
    b("focus-10h", Math.floor(tot.focusSec / 3600), 10),
    b("km-100", Math.floor(tot.km), 100),
    b("streak-7", tot.streak, 7),
    b("dex-half", dex, Math.ceil(EVENT_KINDS.length / 2)),
  ];
}

/** 이 기록으로 새로 얻은 배지 */
export function newlyEarned(records: RideRecord[], recordId: string, now = Date.now(), goal = 4): BadgeId[] {
  const before = new Set(badges(records.filter((r) => r.id !== recordId), now, goal).filter((x) => x.earned).map((x) => x.id));
  return badges(records, now, goal)
    .filter((x) => x.earned && !before.has(x.id))
    .map((x) => x.id);
}
