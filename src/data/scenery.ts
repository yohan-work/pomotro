/**
 * 연출 데이터 (가상/시뮬레이션 영역)
 *
 * 창밖 풍경을 어떤 순서·길이로 보여줄지 정의한다. 여기의 길이(m)는 실제 측량값이 아니라
 * 화면 연출용 "시뮬레이션 미터"다. 실제 노선 데이터는 `line2.ts` 를 본다.
 */
import type { Station } from "./network";

export type SectionKind =
  | "platform" // 역 승강장 (지상/지하는 station.structure 로 구분)
  | "city" // 고가/지상 주거·상가 지역
  | "bank" // 한강 둔치 (한강공원, 강변도로)
  | "river" // 한강 위 철교
  | "portal-in" // 지상 → 터널 진입 (옹벽이 차오름)
  | "portal-out" // 터널 → 지상 진출
  | "tunnel";

/** 물 구간의 실제 장소 — 랜드마크 연출을 결정한다 */
export type WaterVariant =
  | "hangang-yanghwa" // 당산철교: 서쪽 창 → 양화대교·선유도·하류 노을
  | "hangang-jamsil" // 잠실철교: 동쪽 창 → 올림픽대교·롯데월드타워·아차산
  | "hangang-dongho" // 동호대교(도로 겸용 교량 한가운데): 남행 동쪽 창 → 성수대교·응봉산 / 북행 서쪽 창 → 한남대교·남산
  | "stream"; // 중랑천 등 하천

export interface SectionSpec {
  kind: SectionKind;
  variant?: WaterVariant;
  /** 최소 길이 (시뮬레이션 m) */
  length: number;
  /** 집중시간에 맞추기 위해 늘어날 수 있는 비율 가중치 (0이면 고정 길이) */
  stretch: number;
}

/** 지상 시가지의 동네 분위기 (연출) */
export type CityStyle = "residential" | "brick" | "office" | "highrise";

const AREA_STYLE: Record<string, CityStyle> = {
  // 성수동 붉은 벽돌 공장·창고 카페 지대
  ttukseom: "brick",
  seongsu: "brick",
  // G밸리 (구로디지털단지) 유리 오피스
  "guro-digital": "office",
  sindaebang: "office",
  // 고층 주상복합·대단지
  sindorim: "highrise",
  daerim: "highrise",
  jamsillaru: "highrise",
};

/** 구간의 시가지 스타일 — 양 끝 역 중 특색 있는 쪽을 따른다 */
export function cityStyle(fromId: string, toId: string): CityStyle {
  return AREA_STYLE[fromId] ?? AREA_STYLE[toId] ?? "residential";
}

/** 정차 위치 기준 승강장 반 길이 (10량 편성 승강장 약 200m 를 가정한 연출값) */
export const PLATFORM_HALF = 100;

/** 특정 구간 전용 연출 */
const CUSTOM: Record<string, SectionSpec[]> = {
  // 당산(고가) → 당산철교로 한강 횡단 → 북단 둔치 → 지하로 내려가 합정
  dangsan__hapjeong: [
    { kind: "city", length: 110, stretch: 0.15 },
    { kind: "bank", length: 55, stretch: 0 },
    { kind: "river", length: 600, stretch: 0, variant: "hangang-yanghwa" },
    { kind: "bank", length: 60, stretch: 0 },
    { kind: "city", length: 50, stretch: 0.1 },
    { kind: "portal-in", length: 140, stretch: 0 },
    { kind: "tunnel", length: 90, stretch: 1 },
  ],
  // 강변(북단 고가) → 잠실철교로 한강 횡단 → 잠실나루(남단 고가)
  gangbyeon__jamsillaru: [
    { kind: "city", length: 90, stretch: 0.3 },
    { kind: "bank", length: 70, stretch: 0 },
    { kind: "river", length: 760, stretch: 0, variant: "hangang-jamsil" },
    { kind: "bank", length: 70, stretch: 0 },
    { kind: "city", length: 50, stretch: 0.2 },
  ],
  // 3호선 옥수(고가) → 동호대교로 한강 횡단 → 압구정(지하)
  "l3-oksu__l3-apgujeong": [
    { kind: "city", length: 80, stretch: 0.2 },
    { kind: "bank", length: 60, stretch: 0 },
    { kind: "river", length: 720, stretch: 0, variant: "hangang-dongho" },
    { kind: "bank", length: 60, stretch: 0 },
    { kind: "city", length: 50, stretch: 0.1 },
    { kind: "portal-in", length: 140, stretch: 0 },
    { kind: "tunnel", length: 90, stretch: 1 },
  ],
  // 한양대 → 중랑천 교량 → 뚝섬
  "hanyang-univ__ttukseom": [
    { kind: "city", length: 110, stretch: 0.5 },
    { kind: "bank", length: 35, stretch: 0 },
    { kind: "river", length: 130, stretch: 0, variant: "stream" },
    { kind: "bank", length: 35, stretch: 0 },
    { kind: "city", length: 110, stretch: 0.5 },
  ],
};

/** 역 사이 중간 구간 연출 (승강장 구간 제외) */
export function middleSections(segmentId: string, from: Station, to: Station): SectionSpec[] {
  const custom = CUSTOM[segmentId];
  if (custom) return custom;
  // 직선 노선의 반대 방향: 정방향 연출을 거꾸로 (진입/진출 갱문도 뒤집는다)
  const [a0, b0] = segmentId.split("__");
  const fwd = CUSTOM[`${b0}__${a0}`];
  if (fwd) {
    const flip: Partial<Record<SectionKind, SectionKind>> = { "portal-in": "portal-out", "portal-out": "portal-in" };
    return [...fwd].reverse().map((sp) => ({ ...sp, kind: flip[sp.kind] ?? sp.kind }));
  }
  const a = from.structure;
  const b = to.structure;
  if (a === "underground" && b === "underground") return [{ kind: "tunnel", length: 160, stretch: 1 }];
  if (a === "elevated" && b === "elevated") return [{ kind: "city", length: 200, stretch: 1 }];
  if (a === "elevated")
    return [
      { kind: "city", length: 120, stretch: 0.4 },
      { kind: "portal-in", length: 140, stretch: 0 },
      { kind: "tunnel", length: 100, stretch: 1 },
    ];
  return [
    { kind: "tunnel", length: 100, stretch: 1 },
    { kind: "portal-out", length: 140, stretch: 0 },
    { kind: "city", length: 120, stretch: 0.4 },
  ];
}

/** 출발역 이전·도착역 이후에 보이는 배경 구간 */
export function leadSection(station: Station): SectionKind {
  return station.structure === "elevated" ? "city" : "tunnel";
}
