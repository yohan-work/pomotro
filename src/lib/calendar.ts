/**
 * 서울 달력 — 날짜에 따라 달라지는 풍경과 인사 (연출, 한국 시간 기준).
 * 검증용으로 "오늘"을 바꿀 수 있다 (?date=2026-12-24).
 */
let override: Date | null = null;
export function setCalendarDate(d: Date | null) {
  override = d;
}
/** 달력 기준 "지금" (타이머에는 쓰지 않는다) */
export function calendarNow(): Date {
  return override ?? new Date();
}

const md = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3600e3);
  return { m: k.getUTCMonth() + 1, d: k.getUTCDate() };
};

/** 봄 단계: 이른 봄(개나리) → 벚꽃 절정(서울은 대개 4월 초) → 늦봄(신록·철쭉). 연출 근사 */
export type SpringPhase = "early" | "bloom" | "late";
export function springPhase(date: Date): SpringPhase {
  const { m, d } = md(date);
  if (m < 3 || (m === 3 && d < 28)) return "early";
  if (m === 3 || (m === 4 && d <= 15)) return "bloom";
  return "late";
}

export type SpecialDay = "christmas" | "newyear" | "hangul";
/** 안내기에 인사를 띄우는 날 */
export function specialDay(date: Date): SpecialDay | null {
  const { m, d } = md(date);
  if (m === 12 && (d === 24 || d === 25)) return "christmas";
  if (m === 1 && d === 1) return "newyear";
  if (m === 10 && d === 9) return "hangul";
  return null;
}

/** 객실 크리스마스 장식 기간 (12월 1~25일) */
export function christmasSeason(date: Date): boolean {
  const { m, d } = md(date);
  return m === 12 && d <= 25;
}
