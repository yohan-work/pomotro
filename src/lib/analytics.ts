/**
 * Google Analytics 4 (gtag.js) — 홍보 효과 측정용 최소 이벤트.
 *
 * - 측정 ID 는 `NEXT_PUBLIC_GA_ID` 환경변수. 없으면 스크립트도 이벤트도 없다.
 * - 프로덕션 빌드에서만, 자동화 브라우저(검증 스크립트의 headless Chrome)는 제외.
 * - 할 일 문구 등 사용자가 입력한 내용은 보내지 않는다. 역 id·분·횟수만.
 */
import { lineOf } from "../data/lines";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** 이 브라우저에서 수집할지 — 레이아웃의 스크립트 삽입 판단과 같은 기준 */
export function analyticsEnabled(): boolean {
  if (!GA_ID || process.env.NODE_ENV !== "production") return false;
  if (typeof window === "undefined") return false;
  return !navigator.webdriver;
}

type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}): void {
  if (!analyticsEnabled()) return;
  window.gtag?.("event", event, params);
}

/** 여행 공통 파라미터 */
export function rideParams(stationIds: string[], totalSec: number): Params {
  const from = stationIds[0];
  const to = stationIds[stationIds.length - 1];
  return {
    line: lineOf(from).id,
    from_station: from,
    to_station: to,
    stations: stationIds.length - 1,
    minutes: Math.round(totalSec / 60),
  };
}
