/**
 * 앱 상태 (Zustand + localStorage 영속화)
 *
 * 새로고침 복구 정책
 * - 진행 중 세션(activeSession)은 시작 시각·일시정지 누적 시간만 저장한다.
 * - 새로고침 후에는 벽시계 기준으로 경과시간을 다시 계산한다. 즉 새로고침하는 동안에도
 *   집중 시간은 계속 흐른 것으로 본다 (실제 시간과 일치).
 * - 일시정지 상태로 새로고침하면 일시정지 상태 그대로 복구된다.
 * - 새로고침 사이에 종료 시각이 지났다면 즉시 완료 처리한다.
 * - 오디오는 브라우저 정책상 사용자가 다시 한 번 눌러야 재개된다.
 *
 * 중복 기록 방지: 완료 기록은 세션 id 로 한 번만 추가된다 (completeSession 은 멱등).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Channel } from "../audio/AudioEngine";
import { getStation, routeDistanceKm, stationsBetween } from "../data/line2";
import { epochNow, pauseTiming, resumeTiming, type SessionTiming } from "../sim/clock";
import type { TimeOfDay } from "../render/palette";
import type { QualityMode } from "../render/Renderer";

export type SessionMode = "demo" | "focus" | "break";
export type BreakKind = "short" | "long";

/** 뽀모도로 기본값: 짧은 휴식 5분, 4회마다 긴 휴식 15분 */
export const POMODORO = { shortBreakMin: 5, longBreakMin: 15, longEvery: 4, staleCycleMs: 2 * 3600_000 };

export interface ActiveSession extends SessionTiming {
  id: string;
  mode: SessionMode;
  stationIds: string[];
  /** 목표 시간 = 타이머 총 시간 (초) */
  totalSec: number;
  task: string;
  breakKind?: BreakKind;
}

export interface RideRecord {
  id: string;
  mode: SessionMode;
  fromId: string;
  toId: string;
  stationCount: number;
  focusSec: number;
  completedAt: number;
  task: string;
  /** 도착 전 하차(중단)한 경우 */
  partial: boolean;
  /** 실제 이동 거리(km) — 공식 역간 거리 기준. 중도 하차 시 구간 진행 비율로 환산 */
  distanceKm: number;
}

export interface AppState {
  activeSession: ActiveSession | null;
  records: RideRecord[];
  /** 방금 끝난 세션 (완료 화면에 표시) */
  lastRecordId: string | null;
  focusMinutes: number;
  task: string;
  timeOfDay: TimeOfDay | "auto";
  reducedMotion: "system" | "on" | "off";
  quality: QualityMode;
  volumes: Record<Channel, number>;
  masterVolume: number;
  muted: boolean;
  /** 도착 시 브라우저 알림 (탭이 숨겨져 있을 때만) */
  notify: boolean;
  /** 긴 휴식 이후 완료한 집중 회차 */
  cycleCount: number;
  lastFocusAt: number;
  /** 다음 여행 출발역 (방금 도착한 역에서 이어 타기) */
  nextOriginId: string | null;
  /** 방금 휴식을 마쳤는지 (출발 화면 안내) */
  breakJustEnded: boolean;
  /** 진행 중 세션·완료 화면이 없을 때 보이는 화면 (저장하지 않음) */
  view: "home" | "records";
  setView: (v: "home" | "records") => void;

  setFocusMinutes: (m: number) => void;
  setTask: (t: string) => void;
  setTimeOfDay: (t: TimeOfDay | "auto") => void;
  setReducedMotion: (r: "system" | "on" | "off") => void;
  setQuality: (q: QualityMode) => void;
  setVolume: (c: Channel, v: number) => void;
  setMasterVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setNotify: (n: boolean) => void;
  setNextOrigin: (id: string | null) => void;
  /** 방금 도착한 역에서 휴식 시작 */
  startBreak: (stationId: string) => void;

  startSession: (s: { mode: SessionMode; stationIds: string[]; totalSec: number; task: string; seekSec?: number }) => void;
  pause: () => void;
  resume: () => void;
  completeSession: (opts?: { partialElapsedSec?: number; partialDistanceKm?: number }) => void;
  closeCompletion: () => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      records: [],
      lastRecordId: null,
      focusMinutes: 25,
      task: "",
      timeOfDay: "auto",
      reducedMotion: "system",
      volumes: { rolling: 0.8, rail: 0.7, chime: 0.7, door: 0.6, ambient: 0.35 },
      masterVolume: 0.8,
      muted: false,
      notify: true,
      cycleCount: 0,
      lastFocusAt: 0,
      nextOriginId: null,
      breakJustEnded: false,
      view: "home",
      setView: (v) => set({ view: v }),

      setFocusMinutes: (m) => set({ focusMinutes: m }),
      setTask: (t) => set({ task: t }),
      setTimeOfDay: (t) => set({ timeOfDay: t }),
      setReducedMotion: (r) => set({ reducedMotion: r }),
      quality: "auto",
      setQuality: (q) => set({ quality: q }),
      setVolume: (c, v) => set({ volumes: { ...get().volumes, [c]: v } }),
      setMasterVolume: (v) => set({ masterVolume: v }),
      setMuted: (m) => set({ muted: m }),
      setNotify: (n) => set({ notify: n }),
      setNextOrigin: (id) => set({ nextOriginId: id }),

      startBreak: (stationId) => {
        const kind = nextBreakKind(get().cycleCount);
        set({
          lastRecordId: null,
          cycleCount: kind === "long" ? 0 : get().cycleCount,
          activeSession: {
            id: uid(),
            mode: "break",
            breakKind: kind,
            stationIds: [stationId],
            totalSec: (kind === "long" ? POMODORO.longBreakMin : POMODORO.shortBreakMin) * 60,
            task: "",
            startedAt: epochNow(),
            pausedAccumMs: 0,
            pausedAt: null,
          },
        });
      },

      startSession: ({ mode, stationIds, totalSec, task, seekSec = 0 }) =>
        set({
          lastRecordId: null,
          breakJustEnded: false,
          activeSession: {
            id: uid(),
            mode,
            stationIds,
            totalSec,
            task,
            startedAt: epochNow() - seekSec * 1000,
            pausedAccumMs: 0,
            pausedAt: null,
          },
        }),

      pause: () => {
        const s = get().activeSession;
        if (s) set({ activeSession: { ...s, ...pauseTiming(s) } });
      },
      resume: () => {
        const s = get().activeSession;
        if (s) set({ activeSession: { ...s, ...resumeTiming(s) } });
      },

      completeSession: (opts) => {
        const s = get().activeSession;
        if (!s) return;
        if (s.mode === "break") {
          // 휴식은 기록하지 않는다. 같은 역에서 이어 탈 수 있게 출발 화면으로.
          set({ activeSession: null, nextOriginId: s.stationIds[0], breakJustEnded: true });
          return;
        }
        if (get().records.some((r) => r.id === s.id)) {
          set({ activeSession: null, lastRecordId: s.id });
          return;
        }
        const partial = opts?.partialElapsedSec !== undefined;
        const rec: RideRecord = {
          id: s.id,
          mode: s.mode,
          fromId: s.stationIds[0],
          toId: s.stationIds[s.stationIds.length - 1],
          stationCount: s.stationIds.length - 1,
          focusSec: Math.round(partial ? opts!.partialElapsedSec! : s.totalSec),
          completedAt: Date.now(),
          task: s.task,
          partial,
          distanceKm: partial ? (opts!.partialDistanceKm ?? 0) : routeDistanceKm(s.stationIds.map(getStation)),
        };
        const now = Date.now();
        const counts = s.mode === "focus" && !partial;
        const stale = now - get().lastFocusAt > POMODORO.staleCycleMs;
        set({
          activeSession: null,
          records: [...get().records, rec].slice(-500),
          lastRecordId: s.id,
          nextOriginId: counts ? rec.toId : get().nextOriginId,
          cycleCount: counts ? (stale ? 1 : get().cycleCount + 1) : get().cycleCount,
          lastFocusAt: counts ? now : get().lastFocusAt,
        });
      },

      closeCompletion: () => set({ lastRecordId: null }),
    }),
    {
      name: "metro-focus-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // v1 기록에는 거리가 없다 → 공식 거리로 채운다 (중도 하차 기록은 0)
      migrate: (persisted, version) => {
        const st = persisted as { records?: RideRecord[] };
        if (version < 2 && st.records) {
          st.records = st.records.map((r) => ({
            ...r,
            distanceKm: r.distanceKm ?? (r.partial ? 0 : safeDistance(r.fromId, r.toId)),
          }));
        }
        return st as AppState;
      },
      partialize: (s) => ({
        activeSession: s.activeSession,
        records: s.records,
        lastRecordId: s.lastRecordId,
        focusMinutes: s.focusMinutes,
        task: s.task,
        timeOfDay: s.timeOfDay,
        reducedMotion: s.reducedMotion,
        quality: s.quality,
        volumes: s.volumes,
        masterVolume: s.masterVolume,
        muted: s.muted,
        notify: s.notify,
        cycleCount: s.cycleCount,
        lastFocusAt: s.lastFocusAt,
        nextOriginId: s.nextOriginId,
        breakJustEnded: s.breakJustEnded,
      }),
    },
  ),
);

function safeDistance(fromId: string, toId: string): number {
  try {
    return routeDistanceKm(stationsBetween(fromId, toId));
  } catch {
    return 0;
  }
}

/** 지금까지 회차로 다음 휴식 종류 결정 (완료 직후 cycleCount 기준) */
export function nextBreakKind(cycleCount: number): BreakKind {
  return cycleCount >= POMODORO.longEvery ? "long" : "short";
}

/** 오늘(KST) 집중 기록 요약 */
export function todaySummary(records: RideRecord[], now = Date.now()): { count: number; sec: number; km: number } {
  const kstDay = (t: number) => Math.floor((t + 9 * 3600 * 1000) / 86400000);
  const today = kstDay(now);
  const list = records.filter((r) => r.mode === "focus" && kstDay(r.completedAt) === today);
  return {
    count: list.length,
    sec: list.reduce((a, r) => a + r.focusSec, 0),
    km: Math.round(list.reduce((a, r) => a + (r.distanceKm ?? 0), 0) * 10) / 10,
  };
}

/** 오늘(KST) 누적 집중 시간 (초) */
export function todayFocusSec(records: RideRecord[], now = Date.now()): number {
  const kstDay = (t: number) => Math.floor((t + 9 * 3600 * 1000) / 86400000);
  const today = kstDay(now);
  return records.filter((r) => r.mode === "focus" && kstDay(r.completedAt) === today).reduce((a, r) => a + r.focusSec, 0);
}
