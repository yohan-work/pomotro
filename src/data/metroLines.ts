/**
 * 서울교통공사 1·4·5·6·7·8호선 — 노선 데이터 (실제 데이터 영역)
 *
 * - ✅ 역 순서·국문 역명·역간 표준 운행시간·거리: 서울교통공사 「역간거리 및 소요시간」
 * - ✅ 역번호·영문 역명: 서울시 「지하철 노선별 역 정보」, 역명은 현재 공식 역명 (당고개 → 불암산)
 * - ✅ 진행 방위: 서울시 「역사마스터 정보」 역 좌표에서 계산
 *   (모두 metro.official.ts, `npm run data:import` 로 생성)
 * - ⚠️ 지상/지하 구조·랜드마크: 공개 정보 기반, 공식 대조 전
 * - 5호선은 방화 ↔ 하남검단산 본선과 강동 ↔ 마천 지선(5M)으로, 6호선은 응암 ↔ 신내 본선과
 *   응암순환(6L, 응암 → 역촌 → … → 구산 → 응암 한 방향)으로 나눈다. 갈아타기는 아직 지원하지 않는다.
 * - 서울교통공사 운영 구간만: 1호선 서울역 ↔ 청량리, 4호선 불암산 ↔ 남태령, 7호선 장암 ↔ 온수, 8호선 암사역사공원 ↔ 모란
 */
import { METRO_OFFICIAL, type OfficialStation } from "./metro.official";
import { buildLine, type Heading, type LineDef, type LineId, type RawStation } from "./network";

const COMPASS: Heading[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Heading {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  const deg = (Math.atan2(y, x) / r + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}

/** 영문 역명 → id 조각 ("Seoul Nat'l Univ." → "seoul-natl-univ", "Jongno 3(sam)-ga" → "jongno-3-ga") */
export const slug = (en: string) =>
  en
    .toLowerCase()
    .replace(/\([a-z]+\)/g, "")
    .replace(/&/g, "and")
    .replace(/['.`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** 지상·고가역 (그 외 지하) — 미검증 */
const ABOVE_GROUND: Partial<Record<LineId, string[]>> = {
  "4": ["불암산", "상계", "노원", "창동", "동작"],
  "6": ["신내"],
  "7": ["장암", "자양"],
};

/** 구간 랜드마크 (출발역 → 다음 역, 양방향 공통, 미검증) */
const LANDMARKS: Partial<Record<LineId, Record<string, string[]>>> = {
  "4": { 이촌: ["동작대교", "한강"], 불암산: ["불암산", "수락산"], 상계: ["수락산"], 노원: ["도봉산"] },
  "7": { 건대입구: ["뚝섬한강공원"], 자양: ["청담대교", "한강", "뚝섬한강공원"], 장암: ["도봉산", "수락산"] },
  "1": { 종각: ["보신각"], 종로5가: ["종로"] },
};

interface Meta {
  id: LineId;
  prefix: string;
  nameKo: string;
  nameEn: string;
  badge: { ko: string; en: string };
  variant?: { ko: string; en: string };
  color: string;
}

function metroLine(meta: Meta, key: keyof typeof METRO_OFFICIAL, structureLine: LineId = meta.id): LineDef {
  const off = METRO_OFFICIAL[key];
  const st: OfficialStation[] = off.stations;
  const above = new Set(ABOVE_GROUND[structureLine] ?? []);
  const marks = LANDMARKS[structureLine] ?? {};
  const raw: RawStation[] = st.map((s, i) => {
    const next = st[i + 1] ?? (off.loop ? st[0] : undefined);
    return [
      `${meta.prefix}-${slug(s.nameEn)}`,
      s.code,
      s.nameKo,
      s.nameEn,
      above.has(s.nameKo) ? "elevated" : "underground",
      next ? bearing(s, next) : bearing(st[i - 1], s),
      marks[s.nameKo] ?? [],
    ];
  });
  const { prefix: _p, ...m } = meta;
  void _p;
  return buildLine({ ...m, loop: off.loop }, raw, off.segments);
}

export const LINE1 = metroLine({ id: "1", prefix: "l1", nameKo: "1호선", nameEn: "Line 1", badge: { ko: "1", en: "1" }, color: "#0052A4" }, "1");
export const LINE4 = metroLine({ id: "4", prefix: "l4", nameKo: "4호선", nameEn: "Line 4", badge: { ko: "4", en: "4" }, color: "#00A5DE" }, "4");
export const LINE5 = metroLine({ id: "5", prefix: "l5", nameKo: "5호선", nameEn: "Line 5", badge: { ko: "5", en: "5" }, color: "#996CAC" }, "5");
export const LINE5M = metroLine({ id: "5M", prefix: "l5m", nameKo: "5호선 마천지선", nameEn: "Line 5 Macheon Branch", badge: { ko: "5", en: "5" }, variant: { ko: "마천", en: "Macheon" }, color: "#996CAC" }, "5M", "5");
export const LINE6 = metroLine({ id: "6", prefix: "l6", nameKo: "6호선", nameEn: "Line 6", badge: { ko: "6", en: "6" }, color: "#CD7C2F" }, "6");
export const LINE6L = metroLine({ id: "6L", prefix: "l6l", nameKo: "6호선 응암순환", nameEn: "Line 6 Eungam Loop", badge: { ko: "6", en: "6" }, variant: { ko: "응암순환", en: "Loop" }, color: "#CD7C2F" }, "6L", "6");
export const LINE7 = metroLine({ id: "7", prefix: "l7", nameKo: "7호선", nameEn: "Line 7", badge: { ko: "7", en: "7" }, color: "#747F00" }, "7");
export const LINE8 = metroLine({ id: "8", prefix: "l8", nameKo: "8호선", nameEn: "Line 8", badge: { ko: "8", en: "8" }, color: "#E6186C" }, "8");
