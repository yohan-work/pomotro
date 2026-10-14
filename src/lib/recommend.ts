/**
 * 집중시간 → 노선 구간 추천 (환승 없음)
 *
 * 1. 후보: 노선별 출발역 후보 × 같은 노선 도착역 (2호선은 내선순환 한 바퀴 직전까지, 3호선은 양방향)
 * 2. 연출 가능한 최소 시간보다 집중시간이 짧은 경로 제외
 * 3. 점수 = 예상 소요시간 오차 비율 − 풍경 보너스(한강 횡단·지상 구간)
 * 4. 상위 3개 (출발역 중복은 최대 2개까지)
 */
import { LINE2_META, LINE_BY_ID, estimateRouteSec, getSegment, getStation, routeDistanceKm, stationsBetween, type Station } from "../data/lines";
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

const ORIGINS = [
  "sillim", "sindorim", "yeongdeungpo-gu-office", "dangsan", "hapjeong", "wangsimni", "hanyang-univ", "seongsu", "gangbyeon",
  "l3-gyeongbokgung", "l3-anguk", "l3-chungmuro", "l3-yaksu", "l3-geumho", "l3-oksu", "l3-apgujeong", "l3-express-bus-terminal", "l3-yangjae",
];
const DOWNTOWN = new Set([
  "city-hall", "euljiro-1ga", "euljiro-3ga", "euljiro-4ga", "ddp", "chungjeongno", "samseong", "seolleung", "yeoksam", "gangnam",
  "l3-gyeongbokgung", "l3-anguk", "l3-jongno-3ga", "l3-euljiro-3ga", "l3-chungmuro", "l3-express-bus-terminal",
]);

/** 출발역에서 갈 수 있는 도착역 목록 (같은 노선) */
function destinations(originId: string): string[] {
  const line = LINE_BY_ID[getStation(originId).line];
  const st = line.stations;
  const i = st.findIndex((s) => s.id === originId);
  if (line.loop) return Array.from({ length: st.length - 1 }, (_, k) => st[(i + 1 + k) % st.length].id);
  return st.filter((s) => s.id !== originId).map((s) => s.id);
}

function describe(stations: Station[]): { keywords: string[]; tagline: string; scenic: number } {
  const ids = stations.map((s) => s.id);
  const marks = stations.slice(0, -1).flatMap((s, i) => getSegment(s.id, stations[i + 1].id).landmarks);
  const yanghwa = marks.includes("양화대교");
  const jamsil = marks.includes("잠실철교");
  const dongho = marks.includes("동호대교");
  const stream = marks.includes("중랑천") || marks.includes("도림천");
  const elevated = stations.filter((s) => s.structure === "elevated").length;
  const downtown = ids.some((id) => DOWNTOWN.has(id));
  const keywords: string[] = [];
  if (yanghwa) keywords.push("당산철교 한강");
  if (jamsil) keywords.push("잠실철교 한강");
  if (dongho) keywords.push("동호대교 한강");
  if (stream && !yanghwa && !jamsil && !dongho) keywords.push("하천 교량");
  if (elevated >= 3) keywords.push("지상 고가");
  if (downtown) keywords.push("도심");
  keywords.push("지하 구간");
  let tagline: string;
  if (yanghwa && jamsil) tagline = "한강을 두 번 건너는 긴 여행";
  else if (dongho) tagline = stations[0].id === "l3-apgujeong" || stations.findIndex((x) => x.id === "l3-apgujeong") < stations.findIndex((x) => x.id === "l3-oksu") ? "동호대교를 건너 남산을 바라보며 강북으로" : "동호대교 한가운데로 한강을 건너는 여행";
  else if (jamsil) tagline = "고가 위 성수를 지나 잠실철교로 한강을 건너는 여행";
  else if (yanghwa) tagline = downtown ? "한강을 건너 도심 한가운데로 향하는 여행" : "양화대교를 바라보며 한강을 건너는 여행";
  else if (elevated >= 3) tagline = "창밖으로 서울 동네가 이어지는 고가 여행";
  else tagline = downtown ? "조용한 터널을 지나 도심으로" : "조용한 터널을 따라 달리는 시간";
  const scenic = (yanghwa ? 0.2 : 0) + (jamsil ? 0.2 : 0) + (dongho ? 0.2 : 0) + Math.min(0.15, elevated * 0.025);
  return { keywords: keywords.slice(0, 3), tagline, scenic };
}

export function recommendRoutes(focusSec: number, limit = 3, originId?: string): RouteSuggestion[] {
  const cands: Array<RouteSuggestion & { score: number }> = [];
  for (const o of originId ? [originId] : ORIGINS) {
    for (const to of destinations(o)) {
      const stations = stationsBetween(o, to);
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
  const picked = new Set<(typeof cands)[number]>();
  const perOrigin = new Map<string, number>();
  const take = (c: (typeof cands)[number]) => {
    picked.add(c);
    perOrigin.set(c.from.id, (perOrigin.get(c.from.id) ?? 0) + 1);
    const { score: _score, ...rest } = c;
    void _score;
    out.push(rest);
  };
  // 노선 다양성: 시간이 잘 맞는(오차 20% 이내) 노선은 최소 1개씩
  if (!originId) {
    for (const line of new Set(cands.map((c) => c.from.line))) {
      const best = cands.find((c) => c.from.line === line && Math.abs(c.estSec - focusSec) / focusSec < 0.2);
      if (best && out.length < limit) take(best);
    }
  }
  for (const c of cands) {
    if (out.length >= limit) break;
    if (picked.has(c)) continue;
    if (!originId && (perOrigin.get(c.from.id) ?? 0) >= 2) continue;
    take(c);
  }
  // 점수순으로 다시 정렬
  out.sort((a, b) => cands.findIndex((c) => c.stationIds === a.stationIds) - cands.findIndex((c) => c.stationIds === b.stationIds));
  return out;
}

/** 체험 운행: 당산 → 합정 한 구간을 약 1분 50초로 */
/** 직접 고른 구간 요약 */
export function describeRoute(stationIds: string[]): RouteSuggestion {
  const stations = stationIds.map(getStation);
  const d = describe(stations);
  return {
    stationIds,
    from: stations[0],
    to: stations[stations.length - 1],
    estSec: estimateRouteSec(stations),
    distanceKm: routeDistanceKm(stations),
    stops: stations.length - 1,
    keywords: d.keywords,
    tagline: d.tagline,
  };
}

export const DEMO_ROUTE = { stationIds: ["dangsan", "hapjeong"], totalSec: 110 };

export const DATA_NOTICE = `역 순서·운행시간·거리: ${LINE2_META.source.provider.replace(/ \(.*\)/, "")} 공식 데이터(${LINE2_META.source.updated} 갱신, ${LINE2_META.source.license}). 예상 소요시간에는 추정 정차시간이 포함됩니다.`;

export function formatMin(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m}분`;
}
