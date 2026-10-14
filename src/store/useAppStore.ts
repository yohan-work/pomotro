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
import { epochNow, pauseTiming, resumeTiming, type SessionTiming } from "../sim/clock";
import type { TimeOfDay } from "../render/palette";

export type SessionMode = "demo" | "focus";

export interface ActiveSession extends SessionTiming {
  id: string;
  mode: SessionMode;
  stationIds: string[];
  /** 목표 시간 = 타이머 총 시간 (초) */
  totalSec: number;
  task: string;
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
  volumes: Record<Channel, number>;
  masterVolume: number;
  muted: boolean;

  setFocusMinutes: (m: number) => void;
  setTask: (t: string) => void;
  setTimeOfDay: (t: TimeOfDay | "auto") => void;
  setReducedMotion: (r: "system" | "on" | "off") => void;
  setVolume: (c: Channel, v: number) => void;
  setMasterVolume: (v: number) => void;
  setMuted: (m: boolean) => void;

  startSession: (s: { mode: SessionMode; stationIds: string[]; totalSec: number; task: string; seekSec?: number }) => void;
  pause: () => void;
  resume: () => void;
  completeSession: (opts?: { partialElapsedSec?: number }) => void;
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

      setFocusMinutes: (m) => set({ focusMinutes: m }),
      setTask: (t) => set({ task: t }),
      setTimeOfDay: (t) => set({ timeOfDay: t }),
      setReducedMotion: (r) => set({ reducedMotion: r }),
      setVolume: (c, v) => set({ volumes: { ...get().volumes, [c]: v } }),
      setMasterVolume: (v) => set({ masterVolume: v }),
      setMuted: (m) => set({ muted: m }),

      startSession: ({ mode, stationIds, totalSec, task, seekSec = 0 }) =>
        set({
          lastRecordId: null,
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
        };
        set({ activeSession: null, records: [...get().records, rec].slice(-500), lastRecordId: s.id });
      },

      closeCompletion: () => set({ lastRecordId: null }),
    }),
    {
      name: "metro-focus-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        activeSession: s.activeSession,
        records: s.records,
        lastRecordId: s.lastRecordId,
        focusMinutes: s.focusMinutes,
        task: s.task,
        timeOfDay: s.timeOfDay,
        reducedMotion: s.reducedMotion,
        volumes: s.volumes,
        masterVolume: s.masterVolume,
        muted: s.muted,
      }),
    },
  ),
);

/** 오늘(KST) 누적 집중 시간 (초) */
export function todayFocusSec(records: RideRecord[], now = Date.now()): number {
  const kstDay = (t: number) => Math.floor((t + 9 * 3600 * 1000) / 86400000);
  const today = kstDay(now);
  return records.filter((r) => r.mode === "focus" && kstDay(r.completedAt) === today).reduce((a, r) => a + r.focusSec, 0);
}
