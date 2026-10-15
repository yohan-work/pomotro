/**
 * 집중시간 → 노선 구간 추천 (환승 없음)
 *
 * 1. 후보: 노선별 출발역 후보 × 같은 노선 도착역 (2호선은 내선순환 한 바퀴 직전까지, 3호선은 양방향)
 * 2. 연출 가능한 최소 시간보다 집중시간이 짧은 경로 제외
 * 3. 점수 = 예상 소요시간 오차 비율 − 풍경 보너스(한강 횡단·지상 구간)
 * 4. 상위 3개 (출발역 중복은 최대 2개까지)
 */
import { LINE_BY_ID, estimateRouteSec, getSegment, getStation, isTransferPair, routeDistanceKm, stationsBetween, windowFacing, type Station } from "../data/lines";
import { cityStyle } from "../data/scenery";
import type { StringKey } from "../i18n/strings";
import { minJourneySec } from "../sim/journey";

/** 달리는 구간 수 (환승 통로 제외) */
export const runCount = (stations: Station[]) => stations.slice(0, -1).filter((s, i) => !isTransferPair(s, stations[i + 1])).length;
/** 환승 횟수 */
export const transferCount = (stations: Station[]) => stations.length - 1 - runCount(stations);

export interface RouteSuggestion {
  stationIds: string[];
  from: Station;
  to: Station;
  /** 예상 소요시간 (초) = 공식 표준 운행시간 + 추정 정차시간 */
  estSec: number;
  /** 공식 역간 거리 합 (km) */
  distanceKm: number;
  stops: number;
  /** 화면 문구 키 (src/i18n/strings.ts) */
  keywords: StringKey[];
  tagline: StringKey;
  /** 운행시간이 공식 데이터가 아닌 추정 (경의중앙선) */
  estimated: boolean;
  /** 환승 횟수 */
  transfers: number;
}

const ORIGINS = [
  "sillim", "sindorim", "yeongdeungpo-gu-office", "dangsan", "hapjeong", "wangsimni", "hanyang-univ", "seongsu", "gangbyeon",
  "l3-gyeongbokgung", "l3-anguk", "l3-chungmuro", "l3-yaksu", "l3-geumho", "l3-oksu", "l3-apgujeong", "l3-express-bus-terminal", "l3-yangjae",
  "gj-cheongnyangni", "gj-wangsimni", "gj-oksu", "gj-yongsan", "gj-gongdeok", "gj-sangbong", "gj-guri", "gj-deokso", "gj-yangpyeong",
  "l1-seoul-station", "l1-cheongnyangni",
  "l4-chang-dong", "l4-hyehwa", "l4-seoul-station", "l4-ichon", "l4-dongjak", "l4-sadang",
  "l5-yeouido", "l5-gwanghwamun", "l5-cheonho", "l5m-gangdong",
  "l6-hapjeong", "l6-itaewon", "l6l-eungam",
  "l7-gunja", "l7-konkuk-univ", "l7-jayang", "l7-cheongdam", "l7-express-bus-terminal",
  "l8-jamsil", "l8-cheonho",
];
const DOWNTOWN = new Set([
  "city-hall", "euljiro-1ga", "euljiro-3ga", "euljiro-4ga", "ddp", "chungjeongno", "samseong", "seolleung", "yeoksam", "gangnam",
  "l3-gyeongbokgung", "l3-anguk", "l3-jongno-3ga", "l3-euljiro-3ga", "l3-chungmuro", "l3-express-bus-terminal",
  "l1-seoul-station", "l1-city-hall", "l1-jonggak", "l1-jongno-3-ga", "l4-myeong-dong", "l4-hoehyeon", "l4-chungmuro", "l4-seoul-station",
  "l5-gwanghwamun", "l5-jongno-3-ga", "l5-yeouido", "l7-gangnam-gu-office", "l7-nonhyeon", "l7-express-bus-terminal", "l8-jamsil",
]);

/** 출발역에서 갈 수 있는 도착역 목록 (같은 노선) */
function destinations(originId: string): string[] {
  const line = LINE_BY_ID[getStation(originId).line];
  const st = line.stations;
  const i = st.findIndex((s) => s.id === originId);
  if (line.loop) return Array.from({ length: st.length - 1 }, (_, k) => st[(i + 1 + k) % st.length].id);
  return st.filter((s) => s.id !== originId).map((s) => s.id);
}

function describe(stations: Station[]): { keywords: StringKey[]; tagline: StringKey; scenic: number } {
  const ids = stations.map((s) => s.id);
  // 실제로 달리는 구간만 (환승 통로 제외)
  const segIdx = stations.slice(0, -1).map((_, i) => i).filter((i) => !isTransferPair(stations[i], stations[i + 1]));
  const marks = segIdx.flatMap((i) => getSegment(stations[i].id, stations[i + 1].id).landmarks);
  const yanghwa = marks.includes("양화대교");
  const jamsil = marks.includes("잠실철교");
  const dongho = marks.includes("동호대교") && stations[0].line === "3";
  const dongjak = marks.includes("동작대교");
  const cheongdam = marks.includes("청담대교");
  const stream = marks.includes("중랑천") || marks.includes("도림천");
  // 경의중앙선 강변: 남향(서행)일 때만 창밖이 강
  const leftView = (i: number) => windowFacing(getSegment(stations[i].id, stations[i + 1].id).heading);
  const southward = (h: string) => h === "S" || h === "SE" || h === "SW";
  const riverside = segIdx.some((i) => {
    if (stations[i].line !== "GJ") return false;
    const lm = getSegment(stations[i].id, stations[i + 1].id).landmarks;
    return ["강남 스카이라인", "반포대교", "한남대교"].some((l) => lm.includes(l));
  });
  const riversideView = riverside && segIdx.some((i) => getSegment(stations[i].id, stations[i + 1].id).landmarks.includes("한강") && stations[i].line === "GJ" && southward(leftView(i)));
  const paldang = marks.includes("팔당호") || marks.includes("팔당");
  const bukhan = marks.includes("북한강");
  const rural = stations.some((st) => cityStyle(st.id, st.id) === "rural");
  const elevated = stations.filter((s) => s.structure === "elevated").length;
  const downtown = ids.some((id) => DOWNTOWN.has(id));
  const keywords: StringKey[] = [];
  if (yanghwa) keywords.push("kw.dangsan");
  if (jamsil) keywords.push("kw.jamsil");
  if (dongho) keywords.push("kw.dongho");
  if (dongjak) keywords.push("kw.dongjak");
  if (cheongdam) keywords.push("kw.cheongdam");
  if (riversideView) keywords.push("kw.riverside");
  if (paldang) keywords.push("kw.paldang");
  if (bukhan) keywords.push("kw.bukhan");
  if (rural && !paldang) keywords.push("kw.rural");
  if (stream && !yanghwa && !jamsil && !dongho && !dongjak && !cheongdam) keywords.push("kw.stream");
  if (elevated >= 3) keywords.push("kw.elevated");
  if (downtown) keywords.push("kw.downtown");
  if (segIdx.length < stations.length - 1) keywords.unshift("kw.transfer");
  if (stations.some((st) => st.structure === "underground")) keywords.push("kw.underground");
  let tagline: StringKey;
  if (yanghwa && jamsil) tagline = "tag.twoRivers";
  else if (paldang || bukhan) tagline = "tag.paldang";
  else if (riversideView) tagline = "tag.riverside";
  else if (riverside) tagline = "tag.riversideNorth";
  else if (rural) tagline = "tag.rural";
  else if (dongho) tagline = stations[0].id === "l3-apgujeong" || stations.findIndex((x) => x.id === "l3-apgujeong") < stations.findIndex((x) => x.id === "l3-oksu") ? "tag.donghoNorth" : "tag.donghoSouth";
  else if (dongjak) {
    const i = segIdx.find((k) => getSegment(stations[k].id, stations[k + 1].id).landmarks.includes("동작대교"))!;
    tagline = southward(getSegment(stations[i].id, stations[i + 1].id).heading) ? "tag.dongjakSouth" : "tag.dongjakNorth";
  }
  else if (cheongdam) tagline = "tag.cheongdam";
  else if (jamsil) tagline = "tag.jamsil";
  else if (yanghwa) tagline = downtown ? "tag.yanghwaDowntown" : "tag.yanghwa";
  else if (elevated >= 3) tagline = "tag.elevated";
  else tagline = downtown ? "tag.tunnelDowntown" : "tag.tunnel";
  const scenic = (yanghwa ? 0.2 : 0) + (jamsil ? 0.2 : 0) + (dongho ? 0.2 : 0) + (dongjak ? 0.2 : 0) + (cheongdam ? 0.2 : 0) + (riversideView ? 0.2 : 0) + (paldang || bukhan ? 0.2 : 0) + Math.min(0.15, elevated * 0.025);
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
        stops: runCount(stations),
        keywords: d.keywords,
        tagline: d.tagline,
        estimated: stations.some((st) => LINE_BY_ID[st.line].runTimeEstimated),
        transfers: transferCount(stations),
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
  // 노선 다양성: 점수순으로 보되, 시간이 잘 맞는(오차 10% 이내) 후보는 서로 다른 노선부터 채운다
  if (!originId) {
    const used = new Set<string>();
    for (const c of cands) {
      if (out.length >= limit) break;
      const line = c.from.line.replace(/[ML]$/, ""); // 지선·순환은 같은 호선으로 본다
      if (used.has(line) || Math.abs(c.estSec - focusSec) / focusSec >= 0.1) continue;
      used.add(line);
      take(c);
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
    stops: runCount(stations),
    keywords: d.keywords,
    tagline: d.tagline,
    estimated: stations.some((st) => LINE_BY_ID[st.line].runTimeEstimated),
    transfers: transferCount(stations),
  };
}

export const DEMO_ROUTE = { stationIds: ["dangsan", "hapjeong"], totalSec: 110 };


