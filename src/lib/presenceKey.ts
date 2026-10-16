/**
 * 지금 타는 사람 — 서버·클라이언트 공용 규칙 (순수 함수, 테스트 가능).
 * Redis 정렬 집합 하나에 "노선|방|익명id" 를 넣고 점수는 만료 시각(ms). 개인정보는 넣지 않는다.
 */
import { LINES } from "../data/lines";

export const PRESENCE_KEY = "metro:riders";
/** 신호 간격과 만료 — 신호를 두 번 놓치면 사라진다 */
export const HEARTBEAT_MS = 60_000;
export const EXPIRE_MS = 150_000;

const LINE_IDS = new Set<string>(LINES.map((l) => l.id));
const ID_RE = /^[a-f0-9]{16}$/;
const ROOM_RE = /^[a-z0-9]{8,16}$/;

export interface Beat {
  id: string;
  line: string;
  room?: string;
}

/** 들어온 신호 검사 — 맞지 않으면 null */
export function parseBeat(x: unknown): Beat | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !ID_RE.test(o.id)) return null;
  if (typeof o.line !== "string" || !LINE_IDS.has(o.line)) return null;
  if (o.room !== undefined && (typeof o.room !== "string" || !ROOM_RE.test(o.room))) return null;
  return { id: o.id, line: o.line, ...(o.room ? { room: o.room as string } : {}) };
}

export const memberOf = (b: Beat) => `${b.line}|${b.room ?? "-"}|${b.id}`;

export interface PresenceCounts {
  available: boolean;
  total: number;
  /** 호선별 (지선·순환은 본선과 합친다) */
  lines: Record<string, number>;
  /** 요청한 방의 인원 */
  room?: number;
}

/** 살아 있는 멤버 목록 → 집계 (같은 익명 id 는 한 사람) */
export function countMembers(members: string[], room?: string): PresenceCounts {
  // 같은 사람이 노선을 갈아타거나 방에 들어가면 잠깐 두 멤버로 남는다 → id 로 한 번씩만
  const seen = new Set<string>();
  const inRoom = new Set<string>();
  const lines: Record<string, number> = {};
  for (const m of members) {
    const [line, r, id] = m.split("|");
    if (!id) continue;
    if (room && r === room) inRoom.add(id);
    if (seen.has(id)) continue;
    seen.add(id);
    const g = line.replace(/[ML]$/, "");
    lines[g] = (lines[g] ?? 0) + 1;
  }
  return { available: true, total: seen.size, lines, ...(room ? { room: inRoom.size } : {}) };
}
