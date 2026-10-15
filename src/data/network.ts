/**
 * 노선망 공용 타입과 빌더. 각 노선 파일(line2.ts, line3.ts)은 사실 데이터만 두고 이 빌더로 LineDef 를 만든다.
 */
export type LineId = "1" | "2" | "3" | "4" | "5" | "5M" | "6" | "6L" | "7" | "8" | "GJ";
export type StationStructure = "elevated" | "underground";
export type Heading = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface Station {
  id: string;
  line: LineId;
  /** 역번호 — 미검증 */
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

export interface LineDef {
  id: LineId;
  nameKo: string;
  nameEn: string;
  /** 노선 배지 글자 (원 안에 들어갈 짧은 표기) */
  badge: { ko: string; en: string };
  color: string;
  /** 운행시간이 공식 데이터가 아닌 추정이면 true (화면에 "추정" 표기) */
  runTimeEstimated?: boolean;
  /** 순환선이면 내선순환 한 방향, 아니면 양방향 */
  loop: boolean;
  stations: Station[];
  segments: LineSegment[];
}

export type RawStation = [id: string, code: string, nameKo: string, nameEn: string, structure: StationStructure, headingToNext: Heading, landmarksToNext: string[]];

export interface OfficialSegment {
  from: string;
  to: string;
  runSec: number;
  distanceKm: number;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const opposite = (h: Heading): Heading => COMPASS[(COMPASS.indexOf(h) + 4) % 8];

/**
 * 승객은 항상 "진행 방향 왼쪽 창"을 바라본다 (여정 내내 같은 자리).
 * 북쪽 진행 → 서쪽 창, 남쪽 진행 → 동쪽 창.
 */
export function windowFacing(heading: Heading): Heading {
  return COMPASS[(COMPASS.indexOf(heading) + 6) % 8];
}

/** 역 목록 + 공식 구간 데이터 → 노선. 공식 데이터와는 국문 역명으로 매칭하며, 없으면 즉시 실패 */
export function buildLine(
  meta: { id: LineId; nameKo: string; nameEn: string; badge: { ko: string; en: string }; color: string; loop: boolean; runTimeEstimated?: boolean },
  raw: RawStation[],
  official: ReadonlyArray<OfficialSegment>,
): LineDef {
  const stations: Station[] = raw.map(([id, code, nameKo, nameEn, structure]) => ({ id, line: meta.id, code, nameKo, nameEn, structure }));
  const count = meta.loop ? raw.length : raw.length - 1;
  const segments: LineSegment[] = [];
  for (let i = 0; i < count; i++) {
    const [id, , nameKo, , , heading, landmarks] = raw[i];
    const [nid, , nextKo] = raw[(i + 1) % raw.length];
    const off = official.find((s) => s.from === nameKo && s.to === nextKo);
    if (!off) throw new Error(`Official data missing for ${meta.nameKo} ${nameKo} → ${nextKo}`);
    segments.push({ id: `${id}__${nid}`, fromStationId: id, toStationId: nid, runSec: off.runSec, distanceKm: off.distanceKm, heading, landmarks });
    // 직선 노선은 반대 방향도 탈 수 있다 (운행시간·거리는 같다고 본다)
    if (!meta.loop) {
      segments.push({ id: `${nid}__${id}`, fromStationId: nid, toStationId: id, runSec: off.runSec, distanceKm: off.distanceKm, heading: opposite(heading), landmarks });
    }
  }
  return { ...meta, stations, segments };
}
