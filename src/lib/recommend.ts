/**
 * 집중시간 → 2호선 구간 추천 (환승 없음)
 *
 * 1. 후보: 출발역 후보 × 내선순환 방향 모든 도착역
 * 2. 연출 가능한 최소 시간보다 집중시간이 짧은 경로 제외
 * 3. 점수 = 예상 소요시간 오차 비율 − 풍경 보너스(한강 횡단·지상 구간)
 * 4. 상위 3개 (출발역 중복은 최대 2개까지)
 */
import { LINE2_META, STATIONS, estimateRouteSec, getSegment, stationsBetween, type Station } from "../data/line2";
import { minJourneySec } from "../sim/journey";

export interface RouteSuggestion {
  stationIds: string[];
  from: Station;
  to: Station;
  /** 공개 정보 기반 예상 소요시간 (추정, 초) */
  estSec: number;
  stops: number;
  keywords: string[];
  tagline: string;
}

const ORIGINS = ["dangsan", "yeongdeungpo-gu-office", "sindorim", "hapjeong"];
const DOWNTOWN = new Set(["city-hall", "euljiro-1ga", "euljiro-3ga", "euljiro-4ga", "ddp", "chungjeongno"]);

function describe(stations: Station[]): { keywords: string[]; tagline: string; scenic: number } {
  const ids = stations.map((s) => s.id);
  const crossesRiver = stations.some((s, i) => i < stations.length - 1 && getSegment(s.id, stations[i + 1].id).landmarks.includes("한강"));
  const elevated = stations.filter((s) => s.structure === "elevated").length;
  const downtown = ids.some((id) => DOWNTOWN.has(id));
  const keywords: string[] = [];
  if (crossesRiver) keywords.push("한강 철교");
  if (elevated) keywords.push("지상 구간");
  keywords.push("지하 구간");
  if (downtown) keywords.push("도심");
  const tagline = crossesRiver
    ? downtown
      ? "한강을 건너 도심 한가운데로 향하는 여행"
      : "노을 진 한강을 건너는 짧은 여행"
    : downtown
      ? "조용한 터널을 지나 도심으로"
      : "조용한 터널을 따라 달리는 시간";
  return { keywords: keywords.slice(0, 3), tagline, scenic: (crossesRiver ? 0.25 : 0) + (elevated ? 0.05 : 0) };
}

export function recommendRoutes(focusSec: number, limit = 3): RouteSuggestion[] {
  const cands: Array<RouteSuggestion & { score: number }> = [];
  for (const o of ORIGINS) {
    const oi = STATIONS.findIndex((s) => s.id === o);
    for (let k = oi + 1; k < STATIONS.length; k++) {
      const stations = stationsBetween(o, STATIONS[k].id);
      const ids = stations.map((s) => s.id);
      if (minJourneySec(ids) > focusSec) continue;
      const estSec = estimateRouteSec(stations);
      const d = describe(stations);
      const err = Math.abs(estSec - focusSec) / focusSec;
      cands.push({
        stationIds: ids,
        from: stations[0],
        to: stations[stations.length - 1],
        estSec,
        stops: stations.length - 1,
        keywords: d.keywords,
        tagline: d.tagline,
        score: err - d.scenic,
      });
    }
  }
  cands.sort((a, b) => a.score - b.score);
  const out: RouteSuggestion[] = [];
  const perOrigin = new Map<string, number>();
  for (const c of cands) {
    const n = perOrigin.get(c.from.id) ?? 0;
    if (n >= 2) continue;
    perOrigin.set(c.from.id, n + 1);
    const { score: _score, ...rest } = c;
    void _score;
    out.push(rest);
    if (out.length >= limit) break;
  }
  return out;
}

/** 체험 운행: 당산 → 합정 한 구간을 약 1분 50초로 */
export const DEMO_ROUTE = { stationIds: ["dangsan", "hapjeong"], totalSec: 110 };

export const DATA_NOTICE = `노선·역 순서는 공개 노선도 기준, 소요시간은 추정치입니다 (기준일 ${LINE2_META.asOf}, 공식 데이터 미검증).`;

export function formatMin(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m}분`;
}
