/**
 * 세션 시계 — 실제 경과시간(벽시계) 기반.
 *
 * 렌더링은 performance.now() 로 부드럽게 보간하되, 기준은 Date.now() 에 맞춘다.
 * 시스템 절전·탭 백그라운드 등으로 두 시계가 40ms 이상 어긋나면 즉시 Date.now() 로 재동기화한다.
 */

let offset = typeof performance !== "undefined" ? Date.now() - performance.now() : 0;

export function epochNow(): number {
  if (typeof performance === "undefined") return Date.now();
  const p = performance.now();
  const d = Date.now();
  if (Math.abs(p + offset - d) > 40) offset = d - p;
  return p + offset;
}

export interface SessionTiming {
  startedAt: number;
  pausedAccumMs: number;
  pausedAt: number | null;
}

export function elapsedSec(timing: SessionTiming, now = epochNow()): number {
  const end = timing.pausedAt ?? now;
  return Math.max(0, (end - timing.startedAt - timing.pausedAccumMs) / 1000);
}

export function pauseTiming(timing: SessionTiming, now = epochNow()): SessionTiming {
  if (timing.pausedAt !== null) return timing;
  return { ...timing, pausedAt: now };
}

export function resumeTiming(timing: SessionTiming, now = epochNow()): SessionTiming {
  if (timing.pausedAt === null) return timing;
  return { ...timing, pausedAccumMs: timing.pausedAccumMs + (now - timing.pausedAt), pausedAt: null };
}
