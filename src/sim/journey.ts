/**
 * 여정(Journey) — 역 목록과 목표 시간으로부터 결정론적 타임라인을 만든다.
 *
 * 핵심 원칙
 * - 시뮬레이션 상태는 오직 경과시간 t 의 순수 함수다 (`sampleJourney`). 프레임 누적이 없으므로
 *   탭 비활성화·렌더 지연·새로고침 후에도 같은 t 면 같은 위치/속도가 나온다.
 * - 집중시간 ≠ 실제 운행시간일 때는 "재생 속도"를 바꾸지 않고 연출 구간(터널·시가지)의 길이를
 *   늘리거나 줄여 맞춘다. 열차 속도/가속도는 항상 현실적인 범위로 유지된다.
 *   실제 예상 운행시간은 노선 데이터(line2.ts)에서 별도로 표시한다.
 */
import { getSegment, getStation, isTransferPair, neighbors, transferBetween, windowFacing, type LineSegment, type Station, type Transfer } from "../data/lines";
import { PLATFORM_HALF, cityStyle, leadSection, middleSections, tunnelKind, type CityStyle, type SectionKind, type TunnelKind, type WaterVariant } from "../data/scenery";
import { ACCEL, DECEL, lookup } from "./profile";

export type SimPhase =
  | "IDLE"
  | "BOARDING"
  | "DEPARTING"
  | "MOVING"
  | "APPROACHING"
  | "ARRIVED"
  /** 환승역에서 걸어서 갈아타는 중 (공식 환승 소요시간) */
  | "TRANSFER"
  | "PAUSED"
  | "COMPLETED";

export interface Section {
  kind: SectionKind;
  x0: number;
  x1: number;
  /** platform 일 때 해당 역 */
  station?: Station;
  /** platform 일 때 여정 내 역 index */
  stationIndex?: number;
  /** river 일 때 실제 장소 */
  variant?: WaterVariant;
  /** 승객이 바라보는 창 방향 (진행 방향 왼쪽) */
  view: LineSegment["heading"];
  /** 지상 시가지 동네 분위기 */
  style?: CityStyle;
  /** 터널 모양 (터널 구간) */
  tunnel?: TunnelKind;
}

export interface SegmentPlan {
  index: number;
  from: Station;
  to: Station;
  xFrom: number;
  xTo: number;
  distance: number;
  vCruise: number;
  tStart: number;
  tAccel: number;
  tCruise: number;
  tDecel: number;
  sAccel: number;
  sCruise: number;
}

interface PhaseSpan {
  kind: Exclude<SimPhase, "IDLE" | "PAUSED" | "COMPLETED">;
  t0: number;
  t1: number;
  /** 정차·환승 중이면 역 index, 주행 중이면 segments 배열 index */
  ref: number;
}

export type JourneyEventType = "departChime" | "doorClose" | "depart" | "approach" | "arrive" | "doorOpen" | "transfer" | "complete";

export interface JourneyEvent {
  t: number;
  type: JourneyEventType;
  stationIndex: number;
}

export interface TransferPlan {
  /** 갈아타기 전 역 index (다음 index 가 같은 이름의 다른 노선 역) */
  stationIndex: number;
  t0: number;
  t1: number;
  official: Transfer;
}

export interface Journey {
  stations: Station[];
  /** 실제로 달리는 구간만 (환승 제외). SegmentPlan.index 는 출발역 index */
  segments: SegmentPlan[];
  transfers: TransferPlan[];
  sections: Section[];
  phases: PhaseSpan[];
  events: JourneyEvent[];
  stopX: number[];
  totalSec: number;
}

export interface JourneyConfig {
  stationIds: string[];
  totalSec: number;
}

/** 운행 파라미터 (연출값, 실제 차량 성능 근사) */
export const MOTION = {
  /** 평균 가속도 m/s² (≈ 2.6 km/h/s) */
  accel: 0.72,
  /** 평균 감속도 m/s² (≈ 3.2 km/h/s) */
  decel: 0.9,
  /** 목표 순항 속도 m/s (≈ 76 km/h) */
  cruise: 21,
  /** 최고 속도 상한 m/s */
  vMax: 25,
  boardingSec: 10,
  dwellSec: 20,
  finalHoldSec: 6,
};

const K = (1 - ACCEL.distFactor) / MOTION.accel + (1 - DECEL.distFactor) / MOTION.decel;
const RAMP_DIST_PER_V2 = ACCEL.distFactor / MOTION.accel + DECEL.distFactor / MOTION.decel;

/** 환승 정차: 도착 후 문 열린 채 잠시 → 걸어서 갈아타기 → 새 열차 탑승 */
const TRANSFER_ARRIVE_SEC = 8;

function transferOf(a: Station, b: Station): Transfer {
  const t = transferBetween(a.id, b.id);
  if (!t) throw new Error(`No official transfer ${a.id} → ${b.id}`);
  return t;
}

/** 정차·환승에 고정으로 드는 시간 (주행 제외) */
function fixedStopSec(stations: Station[]): number {
  const n = stations.length - 1;
  let sec = MOTION.boardingSec + MOTION.finalHoldSec;
  for (let i = 1; i < n; i++) {
    if (isTransferPair(stations[i], stations[i + 1])) sec += TRANSFER_ARRIVE_SEC + transferOf(stations[i], stations[i + 1]).sec + MOTION.boardingSec;
    else if (!isTransferPair(stations[i - 1], stations[i])) sec += MOTION.dwellSec;
  }
  return sec;
}

/** 이 역 목록을 연출하는 데 필요한 최소 시간 (초) */
export function minJourneySec(stationIds: string[]): number {
  const stations = stationIds.map(getStation);
  let sec = fixedStopSec(stations);
  for (let i = 0; i < stations.length - 1; i++) {
    if (isTransferPair(stations[i], stations[i + 1])) continue;
    const seg = getSegment(stations[i].id, stations[i + 1].id);
    const dMin = 2 * PLATFORM_HALF + middleSections(seg.id, stations[i], stations[i + 1]).reduce((a, s) => a + s.length, 0);
    const v = Math.min(MOTION.vMax, Math.sqrt(dMin / RAMP_DIST_PER_V2));
    sec += K * v + dMin / v;
  }
  return Math.ceil(sec);
}

/**
 * 한 역에 정차한 채 머무는 여정 (휴식). 승강장에 문을 연 채 서 있고, 시간이 끝나면 완료된다.
 */
function buildStayJourney(stationId: string, totalSec: number): Journey {
  const station = getStation(stationId);
  const nb = neighbors(station.id);
  const view = nb.next ? windowFacing(getSegment(station.id, nb.next.id).heading) : windowFacing(getSegment(station.id, nb.prev!.id).heading);
  return {
    stations: [station],
    segments: [],
    transfers: [],
    sections: [
      { kind: leadSection(station), x0: -2000, x1: -PLATFORM_HALF, view },
      { kind: "platform", x0: -PLATFORM_HALF, x1: PLATFORM_HALF, station, stationIndex: 0, view },
      { kind: leadSection(station), x0: PLATFORM_HALF, x1: 2000, view },
    ],
    phases: [{ kind: "ARRIVED", t0: 0, t1: totalSec, ref: 0 }],
    events: [{ t: totalSec, type: "complete", stationIndex: 0 }],
    stopX: [0],
    totalSec,
  };
}

/** 환승할 때 카메라가 건너뛰는 거리 (두 승강장 사이, 화면에 보이지 않는다) */
const TRANSFER_GAP = 600;

export function buildJourney(config: JourneyConfig): Journey {
  if (config.stationIds.length === 1) return buildStayJourney(config.stationIds[0], config.totalSec);
  const stations = config.stationIds.map(getStation);
  if (stations.length < 2) throw new Error("Journey needs at least one station");
  const n = stations.length - 1;
  const isX = (i: number) => i >= 0 && i < n && isTransferPair(stations[i], stations[i + 1]);
  // 구간 i (역 i → i+1): 달리는 구간이면 노선 데이터, 환승이면 null
  const raw = Array.from({ length: n }, (_, i) => (isX(i) ? null : getSegment(stations[i].id, stations[i + 1].id)));
  // 창 방향: 환승 구간은 이어지는 구간의 방향을 따른다
  const views: LineSegment["heading"][] = [];
  for (let i = n - 1; i >= 0; i--) views[i] = raw[i] ? windowFacing(raw[i]!.heading) : (views[i + 1] ?? windowFacing(raw.findLast((r) => r)!.heading));
  for (let i = 0; i < n; i++) if (!raw[i] && i > 0 && raw[i - 1]) views[i] = views[i + 1] ?? views[i - 1];

  const moveSec = Math.max(1, config.totalSec - fixedStopSec(stations));
  const weightSum = raw.reduce((a, s) => a + (s?.runSec ?? 0), 0);

  const segments: SegmentPlan[] = [];
  const transfers: TransferPlan[] = [];
  const sections: Section[] = [];
  const phases: PhaseSpan[] = [];
  const events: JourneyEvent[] = [];
  const stopX: number[] = [0];

  // 출발역 이전 배경 + 출발역 승강장
  const styleOf = (i: number) => cityStyle(stations[i].id, stations[Math.min(n, i + 1)].id);
  sections.push({ kind: leadSection(stations[0]), x0: -2000, x1: -PLATFORM_HALF, view: views[0], style: styleOf(0) });
  sections.push({ kind: "platform", x0: -PLATFORM_HALF, x1: PLATFORM_HALF, station: stations[0], stationIndex: 0, view: views[0], style: styleOf(0) });

  let t = 0;
  let x = 0;
  phases.push({ kind: "BOARDING", t0: 0, t1: MOTION.boardingSec, ref: 0 });
  t = MOTION.boardingSec;

  for (let i = 0; i < n; i++) {
    const seg = raw[i];
    if (!seg) {
      // ── 환승: 역 i 에서 내려 걸어서 역 i+1(같은 이름, 다른 노선) 승강장으로 ──
      const official = transferOf(stations[i], stations[i + 1]);
      phases.push({ kind: "TRANSFER", t0: t, t1: t + official.sec, ref: i });
      events.push({ t, type: "transfer", stationIndex: i + 1 });
      transfers.push({ stationIndex: i, t0: t, t1: t + official.sec, official });
      t += official.sec;
      // 두 승강장 사이(보이지 않음): 각 역의 바깥 배경
      const xNew = x + 2 * PLATFORM_HALF + TRANSFER_GAP;
      const mid = x + PLATFORM_HALF + TRANSFER_GAP / 2;
      sections.push({ kind: leadSection(stations[i]), x0: x + PLATFORM_HALF, x1: mid, view: views[i], style: styleOf(i) });
      sections.push({ kind: leadSection(stations[i + 1]), x0: mid, x1: xNew - PLATFORM_HALF, view: views[i + 1] ?? views[i], style: styleOf(i + 1) });
      sections.push({ kind: "platform", x0: xNew - PLATFORM_HALF, x1: xNew + PLATFORM_HALF, station: stations[i + 1], stationIndex: i + 1, view: views[i + 1] ?? views[i], style: styleOf(i + 1) });
      x = xNew;
      stopX.push(x);
      // 새 열차에 탄다
      if (i + 1 < n) {
        phases.push({ kind: "BOARDING", t0: t, t1: t + MOTION.boardingSec, ref: i + 1 });
        t += MOTION.boardingSec;
      }
      continue;
    }

    const specs = middleSections(seg.id, stations[i], stations[i + 1]);
    const dMin = 2 * PLATFORM_HALF + specs.reduce((a, sp) => a + sp.length, 0);
    const T = (moveSec * seg.runSec) / weightSum;

    // 목표 순항속도로 T 를 채우는 거리. 최소 연출 길이보다 짧으면 속도를 조정한다.
    let v = MOTION.cruise;
    let D = T * v - K * v * v;
    if (D < dMin) {
      D = dMin;
      const disc = T * T - 4 * K * D;
      v = disc >= 0 ? (T - Math.sqrt(disc)) / (2 * K) : T / (2 * K);
    }
    v = Math.min(v, MOTION.vMax, Math.sqrt(D / RAMP_DIST_PER_V2));

    const tAccel = v / MOTION.accel;
    const tDecel = v / MOTION.decel;
    const sAccel = v * tAccel * ACCEL.distFactor;
    const sDecel = v * tDecel * DECEL.distFactor;
    const sCruise = Math.max(0, D - sAccel - sDecel);
    const tCruise = sCruise / v;

    // 연출 구간 배치: 남는 거리를 stretch 가중치로 분배
    const extra = D - dMin;
    const stretchSum = specs.reduce((a, sp) => a + sp.stretch, 0);
    let cx = x + PLATFORM_HALF;
    specs.forEach((sp, k) => {
      const add = stretchSum > 0 ? (extra * sp.stretch) / stretchSum : k === specs.length - 1 ? extra : 0;
      const len = sp.length + add;
      sections.push({
        kind: sp.kind,
        x0: cx,
        x1: cx + len,
        variant: sp.variant,
        view: views[i],
        style: cityStyle(stations[i].id, stations[i + 1].id),
        ...(sp.kind === "tunnel" ? { tunnel: tunnelKind(stations[i].id, stations[i + 1].id) } : {}),
      });
      cx += len;
    });
    const xTo = x + D;
    sections.push({
      kind: "platform",
      x0: xTo - PLATFORM_HALF,
      x1: xTo + PLATFORM_HALF,
      station: stations[i + 1],
      stationIndex: i + 1,
      view: views[Math.min(i + 1, n - 1)],
      style: cityStyle(stations[i].id, stations[i + 1].id),
    });

    const segIdx = segments.length;
    segments.push({ index: i, from: stations[i], to: stations[i + 1], xFrom: x, xTo, distance: D, vCruise: v, tStart: t, tAccel, tCruise, tDecel, sAccel, sCruise });

    events.push({ t: Math.max(0.6, t - 7.5), type: "departChime", stationIndex: i });
    events.push({ t: Math.max(1.2, t - 5), type: "doorClose", stationIndex: i });
    events.push({ t, type: "depart", stationIndex: i });

    phases.push({ kind: "DEPARTING", t0: t, t1: t + tAccel, ref: segIdx });
    phases.push({ kind: "MOVING", t0: t + tAccel, t1: t + tAccel + tCruise, ref: segIdx });
    const tDecelStart = t + tAccel + tCruise;
    phases.push({ kind: "APPROACHING", t0: tDecelStart, t1: tDecelStart + tDecel, ref: segIdx });
    events.push({ t: Math.max(t + 2, tDecelStart - 8), type: "approach", stationIndex: i + 1 });

    t = tDecelStart + tDecel;
    x = xTo;
    stopX.push(x);
    events.push({ t, type: "arrive", stationIndex: i + 1 });
    events.push({ t: t + 1.2, type: "doorOpen", stationIndex: i + 1 });

    if (i < n - 1) {
      if (isX(i + 1)) {
        // 다음은 환승: 문 열린 채 잠시 섰다가 내린다
        phases.push({ kind: "ARRIVED", t0: t, t1: t + TRANSFER_ARRIVE_SEC, ref: i + 1 });
        t += TRANSFER_ARRIVE_SEC;
      } else {
        phases.push({ kind: "ARRIVED", t0: t, t1: t + MOTION.dwellSec * 0.4, ref: i + 1 });
        phases.push({ kind: "BOARDING", t0: t + MOTION.dwellSec * 0.4, t1: t + MOTION.dwellSec, ref: i + 1 });
        t += MOTION.dwellSec;
      }
    }
  }

  // 남은 시간(반올림 오차 등)은 종착역 정차에 흡수해 총 시간 = 목표 집중시간이 되게 한다.
  const totalSec = Math.max(t + 2, config.totalSec);
  phases.push({ kind: "ARRIVED", t0: t, t1: totalSec, ref: n });
  events.push({ t: totalSec, type: "complete", stationIndex: n });
  const lastRun = raw.findLastIndex((r) => r);
  sections.push({ kind: leadSection(stations[n]), x0: x + PLATFORM_HALF, x1: x + 4000, view: views[n - 1], style: cityStyle(stations[lastRun].id, stations[lastRun + 1].id) });

  events.sort((a, b) => a.t - b.t);
  return { stations, segments, transfers, sections, phases, events, stopX, totalSec };
}

export interface SimSample {
  t: number;
  phase: SimPhase;
  /** 트랙 위치 (시뮬레이션 m) */
  x: number;
  /** 속도 m/s */
  v: number;
  /** 가속도 m/s² (감속은 음수) */
  a: number;
  /** 마지막으로 정차/출발한 역 index */
  stationIndex: number;
  /** 다음 정차역 index (정차 중이면 현재 역) */
  nextIndex: number;
  doorsOpen: boolean;
  /** 0..1 — 첫 역~마지막 역 거리 기준 진행률 */
  progress: number;
  remainingSec: number;
}

/**
 * 진행 막대용 위치: 환승 때 건너뛴 거리(두 승강장 사이)를 뺀 트랙 위치.
 * 환승역 두 정차 위치는 같은 점이 된다.
 */
export function runX(j: Journey, x: number): number {
  let gap = 0;
  for (const tr of j.transfers) {
    const a = j.stopX[tr.stationIndex];
    const b = j.stopX[tr.stationIndex + 1];
    if (x >= b) gap += b - a;
  }
  return x - gap;
}

export function sampleJourney(j: Journey, tRaw: number): SimSample {
  const t = Math.min(Math.max(tRaw, 0), j.totalSec);
  const totalX = runX(j, j.stopX[j.stopX.length - 1]);
  const remainingSec = Math.max(0, j.totalSec - t);

  if (tRaw >= j.totalSec) {
    const last = j.stations.length - 1;
    return { t, phase: "COMPLETED", x: j.stopX[j.stopX.length - 1], v: 0, a: 0, stationIndex: last, nextIndex: last, doorsOpen: true, progress: 1, remainingSec: 0 };
  }

  // phases 는 시간순 → 이진 탐색
  let lo = 0;
  let hi = j.phases.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (j.phases[mid].t0 <= t) lo = mid;
    else hi = mid - 1;
  }
  const ph = j.phases[lo];

  if (ph.kind === "TRANSFER") {
    // 걸어가는 동안 화면은 안내 카드로 덮이고, 중간에 새 노선 승강장으로 건너뛴다
    const half = t < (ph.t0 + ph.t1) / 2;
    const si = half ? ph.ref : ph.ref + 1;
    const x = j.stopX[si];
    return { t, phase: "TRANSFER", x, v: 0, a: 0, stationIndex: si, nextIndex: si, doorsOpen: true, progress: totalX > 0 ? runX(j, x) / totalX : 0, remainingSec };
  }

  if (ph.kind === "BOARDING" || ph.kind === "ARRIVED") {
    const si = ph.ref;
    const x = j.stopX[si];
    const closeEv = j.events.find((e) => e.type === "doorClose" && e.stationIndex === si);
    const openEv = j.events.find((e) => e.type === "doorOpen" && e.stationIndex === si);
    const opened = si === 0 || (openEv ? t >= openEv.t : true);
    const closed = closeEv ? t >= closeEv.t + 2.5 : false;
    return {
      t,
      phase: ph.kind,
      x,
      v: 0,
      a: 0,
      stationIndex: si,
      nextIndex: si,
      doorsOpen: opened && !closed,
      progress: totalX > 0 ? runX(j, x) / totalX : 0,
      remainingSec,
    };
  }

  const seg = j.segments[ph.ref];
  const tau = t - seg.tStart;
  const V = seg.vCruise;
  let x: number;
  let v: number;
  let a: number;
  if (tau < seg.tAccel) {
    const u = tau / seg.tAccel;
    x = seg.xFrom + V * seg.tAccel * lookup(ACCEL.dist, u);
    v = V * lookup(ACCEL.vel, u);
    a = (V / seg.tAccel) * lookup(ACCEL.acc, u);
  } else if (tau < seg.tAccel + seg.tCruise) {
    x = seg.xFrom + seg.sAccel + V * (tau - seg.tAccel);
    v = V;
    a = 0;
  } else {
    const u = Math.min(1, (tau - seg.tAccel - seg.tCruise) / seg.tDecel);
    x = seg.xFrom + seg.sAccel + seg.sCruise + V * seg.tDecel * (u - lookup(DECEL.dist, u));
    v = V * (1 - lookup(DECEL.vel, u));
    a = -(V / seg.tDecel) * lookup(DECEL.acc, u);
  }
  return {
    t,
    phase: ph.kind,
    x,
    v,
    a,
    stationIndex: seg.index,
    nextIndex: seg.index + 1,
    doorsOpen: false,
    progress: totalX > 0 ? runX(j, x) / totalX : 0,
    remainingSec,
  };
}

/** x 위치의 연출 구간 */
export function sectionAt(j: Journey, x: number): Section {
  const s = j.sections;
  if (x < s[0].x0) return s[0];
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid].x0 <= x) lo = mid;
    else hi = mid - 1;
  }
  return s[lo];
}

/** [x0, x1] 범위와 겹치는 구간 index 범위 */
export function sectionsInRange(j: Journey, x0: number, x1: number): Section[] {
  const out: Section[] = [];
  for (const s of j.sections) {
    if (s.x1 >= x0 && s.x0 <= x1) out.push(s);
  }
  return out;
}
