"use client";

/** 하루 목표 진행 고리 — 끝까지 달린 집중 여행 수 / 목표 */
export function GoalRing({ done, goal, size = 28 }: { done: number; goal: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth="3.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={p >= 1 ? "var(--c-accent)" : "var(--c-primary)"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
