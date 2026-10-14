/**
 * 경의중앙선 (코레일 운영, 문산 ↔ 지평 본선) — 노선 데이터 (실제 데이터 영역)
 *
 * - ✅ 역 순서·국문 역명·역간 거리: 국가철도공단 「경의중앙선_역간거리」 (lineGJ.official.ts)
 * - ✅ 진행 방위: 국가철도공단 「경의중앙선_역위치」 좌표에서 계산 (좌표가 거리와 모순되는 역은 제외)
 * - ✅ 영문 역명: 국가철도공단 「RAFIS_역 정보」 (없는 4개 역은 표준 로마자 표기, 미검증)
 * - ⚠️ 역간 운행시간: 공개 데이터 없음 → 거리 기반 추정 (평균 70km/h + 가감속 40초). 화면에 "추정" 표기
 * - ⚠️ 지상/지하 구조·랜드마크: 공개 정보 기반, 공식 대조 전
 * - 제외: DMZ 셔틀 구간(도라산·임진강·운천), 서울역 지선
 */
import { GJ_OFFICIAL_SEGMENTS, GJ_OFFICIAL_STATIONS } from "./lineGJ.official";
import { buildLine, type Heading, type RawStation, type StationStructure } from "./network";

/** 국문 역명 → 앱 내부 id (노선 간 고유하도록 gj- 접두사) */
const ID: Record<string, string> = {
  문산: "munsan", "파주(두원대학)": "paju", "월롱(서영대학교)": "wollong", 금촌: "geumchon", 금릉: "geumneung", 운정: "unjeong",
  야당: "yadang", 탄현: "tanhyeon", 일산: "ilsan", 풍산: "pungsan", 백마: "baengma", 곡산: "goksan", 대곡: "daegok", 능곡: "neunggok",
  행신: "haengsin", 강매: "gangmae", 한국항공대: "korea-aerospace-univ", 수색: "susaek", 디지털미디어시티: "digital-media-city",
  가좌: "gajwa", 홍대입구: "hongik-univ", 서강대: "sogang-univ", 공덕: "gongdeok", 효창공원앞: "hyochang-park", 용산: "yongsan",
  이촌: "ichon", 서빙고: "seobinggo", 한남: "hannam", 옥수: "oksu", 응봉: "eungbong", 왕십리: "wangsimni", 청량리: "cheongnyangni",
  회기: "hoegi", 중랑: "jungnang", 상봉: "sangbong", 망우: "mangu", "양원(서울시북부병원)": "yangwon", 구리: "guri", 도농: "donong",
  양정: "yangjeong", 덕소: "deokso", 도심: "dosim", 팔당: "paldang", 운길산: "ungilsan", 양수: "yangsu", 신원: "sinwon", 국수: "guksu",
  "아신(아세아연합신학대)": "asin", 오빈: "obin", 양평: "yangpyeong", "원덕(추읍산)": "wondeok", 용문: "yongmun", 지평: "jipyeong",
};

/** RAFIS 에 없거나 표기를 다듬은 영문 역명 (미검증) */
const EN_OVERRIDE: Record<string, string> = {
  야당: "Yadang",
  디지털미디어시티: "Digital Media City",
  "양원(서울시북부병원)": "Yangwon",
  양정: "Yangjeong",
  홍대입구: "Hongik Univ.",
  한국항공대: "Korea Aerospace Univ.",
  운길산: "Ungilsan",
};

/** 지하역 (그 외는 지상·고가) — 미검증 */
const UNDERGROUND = new Set(["가좌", "디지털미디어시티", "홍대입구", "서강대", "공덕", "효창공원앞"]);

/** 구간 랜드마크 (출발역 기준, 미검증) */
const LANDMARKS: Record<string, string[]> = {
  용산: ["한강"],
  이촌: ["한강", "강남 스카이라인"],
  서빙고: ["한강", "반포대교"],
  한남: ["한강", "한남대교"],
  옥수: ["한강", "동호대교"],
  덕소: ["한강"],
  도심: ["팔당", "한강"],
  팔당: ["팔당호", "예봉산"],
  운길산: ["북한강", "운길산"],
};

const COMPASS: Heading[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Heading {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  const deg = (Math.atan2(y, x) / r + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}

const ST = GJ_OFFICIAL_STATIONS;
/** 좌표가 의심스러운 역은 건너뛰고 가장 가까운 정상 좌표로 방위를 구한다 */
function headingAt(i: number): Heading {
  let a = i;
  let b = i + 1;
  if (ST[a].positionSuspect && a > 0) a--;
  if (ST[b].positionSuspect && b < ST.length - 1) b++;
  return bearing(ST[a], ST[b]);
}

const RAW: RawStation[] = ST.map((s, i) => [
  `gj-${ID[s.nameKo]}`,
  `K${String(i + 1).padStart(2, "0")}`,
  s.nameKo.replace(/\(.*\)$/, ""),
  EN_OVERRIDE[s.nameKo] ?? s.nameEnOfficial ?? s.nameKo,
  (UNDERGROUND.has(s.nameKo) ? "underground" : "elevated") as StationStructure,
  i < ST.length - 1 ? headingAt(i) : headingAt(i - 1),
  LANDMARKS[s.nameKo.replace(/\(.*\)$/, "")] ?? [],
]);

/** 운행시간 추정: 평균 70km/h 주행 + 가감속 40초, 10초 단위 */
const estRunSec = (km: number) => Math.round((km / 70) * 3600 / 10 + 4) * 10;

const OFFICIAL = GJ_OFFICIAL_SEGMENTS.map((s) => ({
  from: s.from.replace(/\(.*\)$/, ""),
  to: s.to.replace(/\(.*\)$/, ""),
  distanceKm: s.distanceKm,
  runSec: estRunSec(s.distanceKm),
}));

export const LINE_GJ = buildLine(
  { id: "GJ", nameKo: "경의중앙선", nameEn: "Gyeongui–Jungang Line", badge: { ko: "경의", en: "GJ" }, color: "#77C4A3", loop: false, runTimeEstimated: true },
  RAW,
  OFFICIAL,
);
