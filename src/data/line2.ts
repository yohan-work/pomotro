/**
 * 서울 지하철 2호선 — 노선 데이터 (실제 데이터 영역)
 *
 * 이 파일에는 "실제 세계"에 대한 사실만 둔다. 화면 연출용 값(구간 길이, 풍경 배치 등)은
 * `src/data/scenery.ts`에 따로 둔다.
 *
 * 검증 상태
 * - 역명·역번호·역 순서(내선순환 방향): 일반 공개 노선도 기준. 공식 데이터 대조 전이다.
 * - 지상/지하 구조: 일반 공개 정보 기준. 공식 데이터 대조 전이다.
 * - 역간 운행시간(`estRunSec`): **추정치**. 공식 시간표/최단경로 API로 검증되지 않았다.
 *   화면에는 반드시 "예상" 또는 "추정"으로 표시한다.
 */

export type StationStructure = "elevated" | "underground";

export interface Station {
  id: string;
  /** 역번호 (2호선 내 표기) */
  code: string;
  nameKo: string;
  nameEn: string;
  structure: StationStructure;
}

export interface LineSegment {
  id: string;
  fromStationId: string;
  toStationId: string;
  /** 역간 예상 주행시간(정차 제외, 초). 추정치 */
  estRunSec: number;
  landmarks: string[];
  /** 열차 진행 방위 (대략) */
  heading: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
}

export const LINE2_META = {
  line: "2",
  lineNameKo: "2호선",
  color: "#2E946B",
  direction: "내선순환",
  source:
    "공개 노선도 기반 초안. 서울교통공사 역 정보·최단경로 API 대조 필요 (docs/architecture.md §데이터 참고)",
  asOf: "2026-10-14",
  verified: false,
  /** 역 정차시간 추정치 (초) */
  estDwellSec: 30,
} as const;

export const STATIONS: Station[] = [
  { id: "sillim", code: "230", nameKo: "신림", nameEn: "Sillim", structure: "underground" },
  { id: "sindaebang", code: "231", nameKo: "신대방", nameEn: "Sindaebang", structure: "elevated" },
  { id: "guro-digital", code: "232", nameKo: "구로디지털단지", nameEn: "Guro Digital Complex", structure: "elevated" },
  { id: "daerim", code: "233", nameKo: "대림", nameEn: "Daerim", structure: "elevated" },
  { id: "sindorim", code: "234", nameKo: "신도림", nameEn: "Sindorim", structure: "elevated" },
  { id: "mullae", code: "235", nameKo: "문래", nameEn: "Mullae", structure: "underground" },
  { id: "yeongdeungpo-gu-office", code: "236", nameKo: "영등포구청", nameEn: "Yeongdeungpo-gu Office", structure: "underground" },
  { id: "dangsan", code: "237", nameKo: "당산", nameEn: "Dangsan", structure: "elevated" },
  { id: "hapjeong", code: "238", nameKo: "합정", nameEn: "Hapjeong", structure: "underground" },
  { id: "hongik-univ", code: "239", nameKo: "홍대입구", nameEn: "Hongik Univ.", structure: "underground" },
  { id: "sinchon", code: "240", nameKo: "신촌", nameEn: "Sinchon", structure: "underground" },
  { id: "ewha", code: "241", nameKo: "이대", nameEn: "Ewha Womans Univ.", structure: "underground" },
  { id: "ahyeon", code: "242", nameKo: "아현", nameEn: "Ahyeon", structure: "underground" },
  { id: "chungjeongno", code: "243", nameKo: "충정로", nameEn: "Chungjeongno", structure: "underground" },
  { id: "city-hall", code: "201", nameKo: "시청", nameEn: "City Hall", structure: "underground" },
  { id: "euljiro-1ga", code: "202", nameKo: "을지로입구", nameEn: "Euljiro 1(il)-ga", structure: "underground" },
  { id: "euljiro-3ga", code: "203", nameKo: "을지로3가", nameEn: "Euljiro 3(sam)-ga", structure: "underground" },
  { id: "euljiro-4ga", code: "204", nameKo: "을지로4가", nameEn: "Euljiro 4(sa)-ga", structure: "underground" },
  { id: "ddp", code: "205", nameKo: "동대문역사문화공원", nameEn: "Dongdaemun History & Culture Park", structure: "underground" },
  { id: "sindang", code: "206", nameKo: "신당", nameEn: "Sindang", structure: "underground" },
  { id: "sangwangsimni", code: "207", nameKo: "상왕십리", nameEn: "Sangwangsimni", structure: "underground" },
  { id: "wangsimni", code: "208", nameKo: "왕십리", nameEn: "Wangsimni", structure: "underground" },
  { id: "hanyang-univ", code: "209", nameKo: "한양대", nameEn: "Hanyang Univ.", structure: "elevated" },
  { id: "ttukseom", code: "210", nameKo: "뚝섬", nameEn: "Ttukseom", structure: "elevated" },
  { id: "seongsu", code: "211", nameKo: "성수", nameEn: "Seongsu", structure: "elevated" },
  { id: "konkuk-univ", code: "212", nameKo: "건대입구", nameEn: "Konkuk Univ.", structure: "elevated" },
  { id: "guui", code: "213", nameKo: "구의", nameEn: "Guui", structure: "elevated" },
  { id: "gangbyeon", code: "214", nameKo: "강변", nameEn: "Gangbyeon", structure: "elevated" },
  { id: "jamsillaru", code: "215", nameKo: "잠실나루", nameEn: "Jamsillaru", structure: "elevated" },
  { id: "jamsil", code: "216", nameKo: "잠실", nameEn: "Jamsil", structure: "underground" },
  { id: "jamsilsaenae", code: "217", nameKo: "잠실새내", nameEn: "Jamsilsaenae", structure: "underground" },
  { id: "sports-complex", code: "218", nameKo: "종합운동장", nameEn: "Sports Complex", structure: "underground" },
];

/** 내선순환 방향 인접 역간 구간. estRunSec 는 추정치 */
const RUN: Array<[string, string, number, LineSegment["heading"], string[]]> = [
  ["sillim", "sindaebang", 110, "W", []],
  ["sindaebang", "guro-digital", 90, "W", ["도림천"]],
  ["guro-digital", "daerim", 100, "NW", ["도림천"]],
  ["daerim", "sindorim", 100, "N", ["도림천"]],
  ["sindorim", "mullae", 100, "N", []],
  ["mullae", "yeongdeungpo-gu-office", 90, "N", []],
  ["yeongdeungpo-gu-office", "dangsan", 100, "N", []],
  ["dangsan", "hapjeong", 150, "N", ["당산철교", "한강", "양화대교", "선유도공원"]],
  ["hapjeong", "hongik-univ", 90, "NE", []],
  ["hongik-univ", "sinchon", 100, "E", []],
  ["sinchon", "ewha", 80, "E", []],
  ["ewha", "ahyeon", 80, "E", []],
  ["ahyeon", "chungjeongno", 90, "E", []],
  ["chungjeongno", "city-hall", 110, "E", []],
  ["city-hall", "euljiro-1ga", 80, "E", []],
  ["euljiro-1ga", "euljiro-3ga", 80, "E", []],
  ["euljiro-3ga", "euljiro-4ga", 80, "E", []],
  ["euljiro-4ga", "ddp", 80, "E", []],
  ["ddp", "sindang", 90, "E", []],
  ["sindang", "sangwangsimni", 80, "E", []],
  ["sangwangsimni", "wangsimni", 80, "E", []],
  ["wangsimni", "hanyang-univ", 100, "E", []],
  ["hanyang-univ", "ttukseom", 120, "SE", ["중랑천"]],
  ["ttukseom", "seongsu", 80, "E", []],
  ["seongsu", "konkuk-univ", 100, "E", []],
  ["konkuk-univ", "guui", 90, "E", []],
  ["guui", "gangbyeon", 80, "E", []],
  ["gangbyeon", "jamsillaru", 140, "S", ["잠실철교", "한강", "올림픽대교", "롯데월드타워"]],
  ["jamsillaru", "jamsil", 100, "S", []],
  ["jamsil", "jamsilsaenae", 90, "SW", []],
  ["jamsilsaenae", "sports-complex", 80, "W", []],
];

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/**
 * 승객은 항상 "진행 방향 왼쪽 창"을 바라본다 (여정 내내 같은 자리).
 * 북쪽 진행 → 서쪽 창, 남쪽 진행 → 동쪽 창.
 */
export function windowFacing(heading: LineSegment["heading"]): LineSegment["heading"] {
  return COMPASS[(COMPASS.indexOf(heading) + 6) % 8];
}

export const SEGMENTS: LineSegment[] = RUN.map(([from, to, est, heading, landmarks]) => ({
  id: `${from}__${to}`,
  fromStationId: from,
  toStationId: to,
  estRunSec: est,
  heading,
  landmarks,
}));

const stationById = new Map(STATIONS.map((s) => [s.id, s]));
const segmentByPair = new Map(SEGMENTS.map((s) => [`${s.fromStationId}>${s.toStationId}`, s]));

export function getStation(id: string): Station {
  const s = stationById.get(id);
  if (!s) throw new Error(`Unknown station: ${id}`);
  return s;
}

export function getSegment(fromId: string, toId: string): LineSegment {
  const s = segmentByPair.get(`${fromId}>${toId}`);
  if (!s) throw new Error(`No direct segment ${fromId} → ${toId}`);
  return s;
}

/** 내선순환 방향으로 from → to 역 순서 (환승 없음) */
export function stationsBetween(fromId: string, toId: string): Station[] {
  const i = STATIONS.findIndex((s) => s.id === fromId);
  const j = STATIONS.findIndex((s) => s.id === toId);
  if (i < 0 || j < 0 || j <= i) throw new Error(`Invalid route ${fromId} → ${toId}`);
  return STATIONS.slice(i, j + 1);
}

/** 경로의 예상 소요시간(추정, 초): 주행 + 중간역 정차 */
export function estimateRouteSec(stations: Station[]): number {
  let sec = 0;
  for (let k = 0; k < stations.length - 1; k++) {
    sec += getSegment(stations[k].id, stations[k + 1].id).estRunSec;
    if (k > 0) sec += LINE2_META.estDwellSec;
  }
  return sec;
}

/** 노선도상 이웃 역 (내선순환 기준 이전/다음). 목록 끝이면 null */
export function neighbors(id: string): { prev: Station | null; next: Station | null } {
  const i = STATIONS.findIndex((s) => s.id === id);
  return { prev: i > 0 ? STATIONS[i - 1] : null, next: i >= 0 && i < STATIONS.length - 1 ? STATIONS[i + 1] : null };
}
