/**
 * 집중시간 → 2호선 구간 추천 (환승 없음)
 *
 * 1. 후보: 출발역 후보 × 내선순환 방향 도착역 (순환 경계 포함, 최대 30개 역)
 * 2. 연출 가능한 최소 시간보다 집중시간이 짧은 경로 제외
 * 3. 점수 = 예상 소요시간 오차 비율 − 풍경 보너스(한강 횡단·지상 구간)
 * 4. 상위 3개 (출발역 중복은 최대 2개까지)
 */
import { LINE2_META, STATIONS, estimateRouteSec, getSegment, routeDistanceKm, stationsBetween, type Station } from "../data/line2";
import { minJourneySec } from "../sim/journey";

export interface RouteSuggestion {
  stationIds: string[];
  from: Station;
  to: Station;
  /** 예상 소요시간 (초) = 공식 표준 운행시간 + 추정 정차시간 */
  estSec: number;
  /** 공식 역간 거리 합 (km) */
  distanceKm: number;
  stops: number;
  keywords: string[];
  tagline: string;
}

const ORIGINS = ["sillim", "sindorim", "yeongdeungpo-gu-office", "dangsan", "hapjeong", "wangsimni", "hanyang-univ", "seongsu", "gangbyeon"];
const DOWNTOWN = new Set(["city-hall", "euljiro-1ga", "euljiro-3ga", "euljiro-4ga", "ddp", "chungjeongno", "samseong", "seolleung", "yeoksam", "gangnam"]);

function describe(stations: Station[]): { keywords: string[]; tagline: string; scenic: number } {
  const ids = stations.map((s) => s.id);
  const marks = stations.slice(0, -1).flatMap((s, i) => getSegment(s.id, stations[i + 1].id).landmarks);
  const yanghwa = marks.includes("양화대교");
  const jamsil = marks.includes("잠실철교");
  const stream = marks.includes("중랑천") || marks.includes("도림천");
  const elevated = stations.filter((s) => s.structure === "elevated").length;
  const downtown = ids.some((id) => DOWNTOWN.has(id));
  const keywords: string[] = [];
  if (yanghwa) keywords.push("당산철교 한강");
  if (jamsil) keywords.push("잠실철교 한강");
  if (stream && !yanghwa && !jamsil) keywords.push("하천 교량");
  if (elevated >= 3) keywords.push("지상 고가");
  if (downtown) keywords.push("도심");
  keywords.push("지하 구간");
  let tagline: string;
  if (yanghwa && jamsil) tagline = "한강을 두 번 건너는 긴 여행";
  else if (jamsil) tagline = "고가 위 성수를 지나 잠실철교로 한강을 건너는 여행";
  else if (yanghwa) tagline = downtown ? "한강을 건너 도심 한가운데로 향하는 여행" : "양화대교를 바라보며 한강을 건너는 여행";
  else if (elevated >= 3) tagline = "창밖으로 서울 동네가 이어지는 고가 여행";
  else tagline = downtown ? "조용한 터널을 지나 도심으로" : "조용한 터널을 따라 달리는 시간";
  const scenic = (yanghwa ? 0.2 : 0) + (jamsil ? 0.2 : 0) + Math.min(0.15, elevated * 0.025);
  return { keywords: keywords.slice(0, 3), tagline, scenic };
}

export function recommendRoutes(focusSec: number, limit = 3): RouteSuggestion[] {
  const cands: Array<RouteSuggestion & { score: number }> = [];
  for (const o of ORIGINS) {
    const oi = STATIONS.findIndex((s) => s.id === o);
    // 순환선: 출발역에서 내선순환으로 최대 30개 역까지
    for (let k = 1; k <= 30; k++) {
      const stations = stationsBetween(o, STATIONS[(oi + k) % STATIONS.length].id);
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
        distanceKm: routeDistanceKm(stations),
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

export const DATA_NOTICE = `역 순서·운행시간·거리: ${LINE2_META.source.provider.replace(/ \(.*\)/, "")} 공식 데이터(${LINE2_META.source.updated} 갱신, ${LINE2_META.source.license}). 예상 소요시간에는 추정 정차시간이 포함됩니다.`;

export function formatMin(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m}분`;
}
