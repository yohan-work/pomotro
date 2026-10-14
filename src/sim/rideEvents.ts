/**
 * 깜짝 이벤트 — 한 번 타는 동안 0~2번, 객실에 별난 승객이 타거나 창밖에 뭔가 지나간다.
 *
 * - 시뮬레이션처럼 결정론적이다: 같은 여정 + 같은 시드(세션 id)면 항상 같은 이벤트가 같은 때 나온다.
 *   새로고침해도 단소 아저씨는 같은 역에서 탄다.
 * - 이벤트는 연출이다. 실제 운행 정보와 섞지 않고, 놀래키지 않는다 (번쩍임·갑툭튀 없음).
 */
import { passingTrains } from "../render/scene/passing";
import { hash2, rng } from "../render/rng";
import { sampleJourney, type Journey } from "./journey";

export type RideEventKind =
  // 객실 승객 (맞은편 좌석에 앉았다가 내린다)
  | "danso"
  | "puppy"
  | "sleeper"
  | "hiker"
  // 객실을 가로질러 지나간다
  | "vendor"
  // 창밖
  | "balloon"
  | "duckboat"
  | "cat"
  // 희귀
  | "monster"
  | "ttorong";

export const EVENT_KINDS: readonly RideEventKind[] = ["danso", "vendor", "puppy", "sleeper", "hiker", "balloon", "duckboat", "cat", "monster", "ttorong"];
export const RARE_KINDS: readonly RideEventKind[] = ["monster", "ttorong"];
const SEATED: readonly RideEventKind[] = ["danso", "puppy", "sleeper", "hiker"];
export const isCabinEvent = (k: RideEventKind) => SEATED.includes(k) || k === "vendor";

export interface RideEvent {
  kind: RideEventKind;
  /** 보이기 시작하는 시각 (초) */
  t0: number;
  /** 사라지는 시각 (초) */
  t1: number;
  /** 창밖 이벤트의 트랙 좌표 (시뮬레이션 m) */
  m?: number;
  /** 0..1 결정론적 변주 (앉는 자리, 방향 등) */
  r: number;
}

/** 세션 id → 시드 */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 열차가 트랙 위치 x 에 처음 닿는 시각 (위치는 시간에 대해 단조 증가) */
export function timeAtX(j: Journey, x: number): number {
  let lo = 0;
  let hi = j.totalSec;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (sampleJourney(j, mid).x < x) lo = mid;
    else hi = mid;
  }
  return hi;
}

const evT = (j: Journey, type: string, i: number) => j.events.find((e) => e.type === type && e.stationIndex === i)?.t;

/** 종류별로 가능한 배치 후보 */
function candidates(j: Journey, kind: RideEventKind): Omit<RideEvent, "r">[] {
  const n = j.stations.length - 1;
  const lastStop = j.stopX[n];
  const out: Omit<RideEvent, "r">[] = [];
  if (n < 1) return out;

  if (SEATED.includes(kind)) {
    // b 역에서 타서 a 역에서 내린다 (최대 3정거장). 출발역 손님은 처음부터 앉아 있다.
    for (let b = 0; b < n; b++) {
      for (let a = b + 1; a <= Math.min(n, b + 3); a++) {
        const t0 = b === 0 ? 3 : (evT(j, "doorOpen", b) ?? 0) + 3;
        const t1 = a === n ? j.totalSec - 2 : (evT(j, "doorOpen", a) ?? j.totalSec) + 2;
        if (t1 - t0 > 40) out.push({ kind, t0, t1 });
      }
    }
    return out;
  }

  if (kind === "vendor") {
    // 순항 중 칸을 가로질러 지나간다
    for (const s of j.segments) {
      if (s.tCruise < 26) continue;
      const t0 = s.tStart + s.tAccel + 4;
      out.push({ kind, t0, t1: t0 + 18 });
    }
    return out;
  }

  if (kind === "cat") {
    // 지상 역 승강장에 앉아 있는 고양이 — 정차하는 동안 보인다
    j.stations.forEach((st, i) => {
      if (st.structure === "underground") return;
      const t0 = i === 0 ? 0 : (evT(j, "arrive", i) ?? 0);
      const t1 = i === n ? j.totalSec : (evT(j, "depart", i) ?? j.totalSec);
      out.push({ kind, t0, t1, m: j.stopX[i] });
    });
    return out;
  }

  if (kind === "ttorong") {
    for (const a of passingTrains(j)) {
      const t0 = timeAtX(j, a - 6);
      out.push({ kind, t0, t1: t0 + 4, m: a });
    }
    return out;
  }

  for (const sec of j.sections) {
    if (sec.x0 < 0 || sec.x1 > lastStop) continue;
    const ok =
      kind === "balloon"
        ? (sec.kind === "city" || sec.kind === "bank" || sec.kind === "river" || sec.kind === "riverside") && sec.x1 - sec.x0 > 200
        : kind === "duckboat"
          ? sec.kind === "river" && (sec.variant === "hangang-yanghwa" || sec.variant === "hangang-jamsil" || sec.variant === "hangang-dongho")
          : kind === "monster"
            ? sec.kind === "river" && sec.variant !== "stream"
            : false;
    if (!ok) continue;
    out.push({ kind, t0: timeAtX(j, sec.x0), t1: timeAtX(j, sec.x1), m: (sec.x0 + sec.x1) / 2 });
  }
  return out;
}

/** 일반 이벤트의 상대 빈도 (경의중앙선·3호선은 등산객이 잦다) */
function weight(j: Journey, kind: RideEventKind): number {
  if (kind === "hiker") return j.stations[0].line === "2" ? 0.6 : 2;
  if (kind === "balloon") return 0.8;
  return 1;
}

const overlaps = (a: { t0: number; t1: number }, b: { t0: number; t1: number }) => a.t0 < b.t1 + 20 && b.t0 < a.t1 + 20;

/**
 * 이번 여정의 이벤트. force 를 주면 그 종류 하나만 (검증·미리보기용, 가장 이른 배치).
 */
export function planRideEvents(j: Journey, seed: number, force?: RideEventKind): RideEvent[] {
  if (j.stations.length < 2) return [];
  const r = rng(hash2(seed, 4401));
  if (force) {
    const c = candidates(j, force).sort((a, b) => a.t0 - b.t0)[0];
    return c ? [{ ...c, r: r() }] : [];
  }

  // 몇 번 나올지: 짧은 여정은 많아야 한 번
  const x = r();
  const count = j.totalSec < 600 ? (x < 0.5 ? 0 : 1) : x < 0.25 ? 0 : x < 0.75 ? 1 : 2;
  const picked: RideEvent[] = [];
  const pool = EVENT_KINDS.filter((k) => !RARE_KINDS.includes(k))
    .map((k) => ({ k, c: candidates(j, k), w: weight(j, k) }))
    .filter((p) => p.c.length > 0);

  const place = (kind: RideEventKind, cs: Omit<RideEvent, "r">[]) => {
    // 객실 이벤트는 한 번에 한 명만, 창밖 이벤트는 다른 이벤트와 시간이 겹치지 않게
    const free = cs.filter((c) => picked.every((p) => !overlaps(p, c)));
    if (!free.length) return false;
    const c = free[Math.floor(r() * free.length) % free.length];
    picked.push({ ...c, kind, r: r() });
    return true;
  };

  for (let k = 0; k < count && pool.length; k++) {
    const total = pool.reduce((a, p) => a + p.w, 0);
    let pickW = r() * total;
    let idx = 0;
    while (idx < pool.length - 1 && pickW >= pool[idx].w) pickW -= pool[idx++].w;
    const p = pool.splice(idx, 1)[0];
    if (!place(p.k, p.c)) k--;
  }

  // 희귀 이벤트: 스무 번에 한 번쯤
  if (r() < 0.05) {
    const rare = RARE_KINDS.map((k) => ({ k, c: candidates(j, k) })).filter((p) => p.c.length > 0);
    if (rare.length) {
      const p = rare[Math.floor(r() * rare.length) % rare.length];
      place(p.k, p.c);
    }
  }
  return picked.sort((a, b) => a.t0 - b.t0);
}

/** t 시점까지 "본" 이벤트 종류 (기록용) */
export function seenEvents(events: RideEvent[], t: number): RideEventKind[] {
  return [...new Set(events.filter((e) => t >= e.t0 + 1).map((e) => e.kind))];
}

/** t 시점에 객실에 있는 승객 이벤트 */
export function cabinEventAt(events: RideEvent[], t: number): RideEvent | undefined {
  return events.find((e) => isCabinEvent(e.kind) && t >= e.t0 && t < e.t1);
}
