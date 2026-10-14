/**
 * 서울 지하철 2호선 — 노선 데이터 (실제 데이터 영역)
 *
 * 이 파일에는 "실제 세계"에 대한 사실만 둔다. 화면 연출용 값(구간 길이, 풍경 배치 등)은
 * `src/data/scenery.ts`에 따로 둔다.
 *
 * 검증 상태
 * - ✅ 역 순서·역명(국문)·역간 표준 운행시간·역간 거리: 서울교통공사 공식 데이터
 *      (`line2.official.ts`, 「역간거리 및 소요시간」 2024-09-02 갱신, 공공누리 제1유형)
 * - ⚠️ 역번호·영문 역명·지상/지하 구조·진행 방위·랜드마크: 공개 정보 기반, 공식 데이터 대조 전
 * - ⚠️ 역 정차시간(`estDwellSec`): 추정치. 화면에는 "예상"으로 표시한다.
 */
import { LINE2_OFFICIAL_SEGMENTS, OFFICIAL_SOURCE } from "./line2.official";

export type StationStructure = "elevated" | "underground";
export type Heading = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface Station {
  id: string;
  /** 역번호 (2호선 내 표기) — 미검증 */
  code: string;
  nameKo: string;
  /** 미검증 */
  nameEn: string;
  /** 미검증 */
  structure: StationStructure;
}

export interface LineSegment {
  id: string;
  fromStationId: string;
  toStationId: string;
  /** 역간 표준 운행시간(정차 제외, 초) — 공식 */
  runSec: number;
  /** 역간 거리(km) — 공식 */
  distanceKm: number;
  /** 미검증 */
  landmarks: string[];
  /** 열차 진행 방위 (대략, 미검증) */
  heading: Heading;
}

export const LINE2_META = {
  line: "2",
  lineNameKo: "2호선",
  color: "#2E946B",
  direction: "내선순환",
  source: OFFICIAL_SOURCE,
  /** 역 정차시간 추정치 (초) */
  estDwellSec: 30,
} as const;

/** 본선 순환 (내선순환 순서, 시청부터). [id, 역번호, 국문, 영문, 구조, 다음 역까지 방위, 랜드마크] */
const RAW: Array<[string, string, string, string, StationStructure, Heading, string[]]> = [
  ["city-hall", "201", "시청", "City Hall", "underground", "E", []],
  ["euljiro-1ga", "202", "을지로입구", "Euljiro 1(il)-ga", "underground", "E", []],
  ["euljiro-3ga", "203", "을지로3가", "Euljiro 3(sam)-ga", "underground", "E", []],
  ["euljiro-4ga", "204", "을지로4가", "Euljiro 4(sa)-ga", "underground", "E", []],
  ["ddp", "205", "동대문역사문화공원", "Dongdaemun History & Culture Park", "underground", "E", []],
  ["sindang", "206", "신당", "Sindang", "underground", "E", []],
  ["sangwangsimni", "207", "상왕십리", "Sangwangsimni", "underground", "E", []],
  ["wangsimni", "208", "왕십리", "Wangsimni", "underground", "E", []],
  ["hanyang-univ", "209", "한양대", "Hanyang Univ.", "elevated", "SE", ["중랑천"]],
  ["ttukseom", "210", "뚝섬", "Ttukseom", "elevated", "E", []],
  ["seongsu", "211", "성수", "Seongsu", "elevated", "E", []],
  ["konkuk-univ", "212", "건대입구", "Konkuk Univ.", "elevated", "E", []],
  ["guui", "213", "구의", "Guui", "elevated", "E", []],
  ["gangbyeon", "214", "강변", "Gangbyeon", "elevated", "S", ["잠실철교", "한강", "올림픽대교", "롯데월드타워"]],
  ["jamsillaru", "215", "잠실나루", "Jamsillaru", "elevated", "S", []],
  ["jamsil", "216", "잠실", "Jamsil", "underground", "SW", []],
  ["jamsilsaenae", "217", "잠실새내", "Jamsilsaenae", "underground", "W", []],
  ["sports-complex", "218", "종합운동장", "Sports Complex", "underground", "W", []],
  ["samseong", "219", "삼성", "Samseong", "underground", "W", []],
  ["seolleung", "220", "선릉", "Seolleung", "underground", "W", []],
  ["yeoksam", "221", "역삼", "Yeoksam", "underground", "W", []],
  ["gangnam", "222", "강남", "Gangnam", "underground", "SW", []],
  ["seoul-natl-univ-of-education", "223", "교대", "Seoul Nat'l Univ. of Education", "underground", "W", []],
  ["seocho", "224", "서초", "Seocho", "underground", "W", []],
  ["bangbae", "225", "방배", "Bangbae", "underground", "SW", []],
  ["sadang", "226", "사당", "Sadang", "underground", "W", []],
  ["nakseongdae", "227", "낙성대", "Nakseongdae", "underground", "W", []],
  ["seoul-natl-univ", "228", "서울대입구", "Seoul Nat'l Univ.", "underground", "W", []],
  ["bongcheon", "229", "봉천", "Bongcheon", "underground", "W", []],
  ["sillim", "230", "신림", "Sillim", "underground", "W", []],
  ["sindaebang", "231", "신대방", "Sindaebang", "elevated", "W", ["도림천"]],
  ["guro-digital", "232", "구로디지털단지", "Guro Digital Complex", "elevated", "NW", ["도림천"]],
  ["daerim", "233", "대림", "Daerim", "elevated", "N", ["도림천"]],
  ["sindorim", "234", "신도림", "Sindorim", "elevated", "N", []],
  ["mullae", "235", "문래", "Mullae", "underground", "N", []],
  ["yeongdeungpo-gu-office", "236", "영등포구청", "Yeongdeungpo-gu Office", "underground", "N", []],
  ["dangsan", "237", "당산", "Dangsan", "elevated", "N", ["당산철교", "한강", "양화대교", "선유도공원"]],
  ["hapjeong", "238", "합정", "Hapjeong", "underground", "NE", []],
  ["hongik-univ", "239", "홍대입구", "Hongik Univ.", "underground", "E", []],
  ["sinchon", "240", "신촌", "Sinchon", "underground", "E", []],
  ["ewha", "241", "이대", "Ewha Womans Univ.", "underground", "E", []],
  ["ahyeon", "242", "아현", "Ahyeon", "underground", "E", []],
  ["chungjeongno", "243", "충정로", "Chungjeongno", "underground", "E", []],
];

export const STATIONS: Station[] = RAW.map(([id, code, nameKo, nameEn, structure]) => ({ id, code, nameKo, nameEn, structure }));

/** 인접 역간 구간 (순환: 마지막 → 첫 역 포함). 운행시간·거리는 공식 데이터에서 역명으로 매칭 */
export const SEGMENTS: LineSegment[] = RAW.map(([id, , nameKo, , , heading, landmarks], i) => {
  const [nid, , nextKo] = RAW[(i + 1) % RAW.length];
  const off = LINE2_OFFICIAL_SEGMENTS.find((s) => s.from === nameKo && s.to === nextKo);
  if (!off) throw new Error(`Official data missing for ${nameKo} → ${nextKo}`);
  return {
    id: `${id}__${nid}`,
    fromStationId: id,
    toStationId: nid,
    runSec: off.runSec,
    distanceKm: off.distanceKm,
    heading,
    landmarks,
  };
});

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/**
 * 승객은 항상 "진행 방향 왼쪽 창"을 바라본다 (여정 내내 같은 자리).
 * 북쪽 진행 → 서쪽 창, 남쪽 진행 → 동쪽 창.
 */
export function windowFacing(heading: Heading): Heading {
  return COMPASS[(COMPASS.indexOf(heading) + 6) % 8];
}

const indexById = new Map(STATIONS.map((s, i) => [s.id, i]));
const segmentByPair = new Map(SEGMENTS.map((s) => [`${s.fromStationId}>${s.toStationId}`, s]));

export function getStation(id: string): Station {
  const i = indexById.get(id);
  if (i === undefined) throw new Error(`Unknown station: ${id}`);
  return STATIONS[i];
}

export function getSegment(fromId: string, toId: string): LineSegment {
  const s = segmentByPair.get(`${fromId}>${toId}`);
  if (!s) throw new Error(`No direct segment ${fromId} → ${toId}`);
  return s;
}

/** 내선순환 방향으로 from → to 역 순서 (환승 없음, 순환 경계를 넘어갈 수 있음) */
export function stationsBetween(fromId: string, toId: string): Station[] {
  const i = indexById.get(fromId);
  const j = indexById.get(toId);
  if (i === undefined || j === undefined || i === j) throw new Error(`Invalid route ${fromId} → ${toId}`);
  const n = STATIONS.length;
  const len = ((j - i + n) % n) + 1;
  return Array.from({ length: len }, (_, k) => STATIONS[(i + k) % n]);
}

/** 경로의 예상 소요시간(초): 공식 표준 운행시간 합 + 중간역 정차(추정) */
export function estimateRouteSec(stations: Station[]): number {
  let sec = 0;
  for (let k = 0; k < stations.length - 1; k++) {
    sec += getSegment(stations[k].id, stations[k + 1].id).runSec;
    if (k > 0) sec += LINE2_META.estDwellSec;
  }
  return sec;
}

/** 경로의 실제 거리(km) — 공식 역간 거리 합 */
export function routeDistanceKm(stations: Station[]): number {
  let km = 0;
  for (let k = 0; k < stations.length - 1; k++) km += getSegment(stations[k].id, stations[k + 1].id).distanceKm;
  return Math.round(km * 10) / 10;
}

/** 노선도상 이웃 역 (내선순환 기준 이전/다음, 순환) */
export function neighbors(id: string): { prev: Station; next: Station } {
  const i = indexById.get(id)!;
  const n = STATIONS.length;
  return { prev: STATIONS[(i - 1 + n) % n], next: STATIONS[(i + 1) % n] };
}
