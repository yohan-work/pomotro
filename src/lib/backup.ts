/**
 * 기록 백업 — 기록은 브라우저 localStorage 에만 있으므로 사용자가 직접 내보내고 가져올 수 있게 한다.
 * 형식: { app: "metro", version: 1, exportedAt, records: RideRecord[] }
 */
import { getStation } from "../data/lines";
import type { RideRecord } from "../store/useAppStore";
import { EVENT_KINDS, type RideEventKind } from "../sim/rideEvents";

export const BACKUP_FORMAT = { app: "metro", version: 1 } as const;

export function makeBackup(records: RideRecord[]): string {
  return JSON.stringify({ ...BACKUP_FORMAT, exportedAt: new Date().toISOString(), records }, null, 2);
}

const isStation = (id: unknown) => {
  if (typeof id !== "string") return false;
  try {
    getStation(id);
    return true;
  } catch {
    return false;
  }
};

/** 한 건 검증 — 알 수 없는 필드는 버리고, 필수 필드가 틀리면 null */
function sanitize(x: unknown): RideRecord | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (typeof r.id !== "string" || !r.id) return null;
  if (r.mode !== "focus" && r.mode !== "demo") return null;
  if (!isStation(r.fromId) || !isStation(r.toId)) return null;
  if (!num(r.focusSec) || !num(r.completedAt) || !num(r.stationCount)) return null;
  return {
    id: r.id,
    mode: r.mode,
    fromId: r.fromId as string,
    toId: r.toId as string,
    stationCount: r.stationCount as number,
    focusSec: r.focusSec as number,
    completedAt: r.completedAt as number,
    task: typeof r.task === "string" ? r.task.slice(0, 80) : "",
    partial: r.partial === true,
    distanceKm: num(r.distanceKm) ? (r.distanceKm as number) : 0,
    ...(typeof r.taskDone === "boolean" ? { taskDone: r.taskDone } : {}),
    ...(Array.isArray(r.stationIds) && r.stationIds.length >= 2 && r.stationIds.every(isStation) ? { stationIds: r.stationIds as string[] } : {}),
    ...(Array.isArray(r.encounters) ? { encounters: r.encounters.filter((k): k is RideEventKind => EVENT_KINDS.includes(k as RideEventKind)) } : {}),
  };
}

export interface ParsedBackup {
  records: RideRecord[];
  invalid: number;
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("not-json");
  }
  const list = Array.isArray(data) ? data : (data as { app?: string; records?: unknown }).app === "metro" ? (data as { records?: unknown }).records : null;
  if (!Array.isArray(list)) throw new Error("not-metro");
  const records: RideRecord[] = [];
  let invalid = 0;
  for (const x of list) {
    const r = sanitize(x);
    if (r) records.push(r);
    else invalid++;
  }
  return { records, invalid };
}

/** 기존 기록과 합치기 — 같은 id 는 기존 것을 유지, 시간순 정렬 */
export function mergeRecords(existing: RideRecord[], incoming: RideRecord[]): { records: RideRecord[]; added: number } {
  const ids = new Set(existing.map((r) => r.id));
  const fresh = incoming.filter((r) => !ids.has(r.id));
  return { records: [...existing, ...fresh].sort((a, b) => a.completedAt - b.completedAt).slice(-2000), added: fresh.length };
}
