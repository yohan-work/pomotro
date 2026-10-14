/**
 * 연출 데이터 (가상/시뮬레이션 영역)
 *
 * 창밖 풍경을 어떤 순서·길이로 보여줄지 정의한다. 여기의 길이(m)는 실제 측량값이 아니라
 * 화면 연출용 "시뮬레이션 미터"다. 실제 노선 데이터는 `line2.ts` 를 본다.
 */
import type { Station } from "./line2";

export type SectionKind =
  | "platform" // 역 승강장 (지상/지하는 station.structure 로 구분)
  | "city" // 고가/지상 주거·상가 지역
  | "bank" // 한강 둔치 (한강공원, 강변도로)
  | "river" // 한강 위 철교
  | "portal-in" // 지상 → 터널 진입 (옹벽이 차오름)
  | "portal-out" // 터널 → 지상 진출
  | "tunnel";

export interface SectionSpec {
  kind: SectionKind;
  /** 최소 길이 (시뮬레이션 m) */
  length: number;
  /** 집중시간에 맞추기 위해 늘어날 수 있는 비율 가중치 (0이면 고정 길이) */
  stretch: number;
}

/** 정차 위치 기준 승강장 반 길이 (10량 편성 승강장 약 200m 를 가정한 연출값) */
export const PLATFORM_HALF = 100;

/** 특정 구간 전용 연출 */
const CUSTOM: Record<string, SectionSpec[]> = {
  // 당산(고가) → 당산철교로 한강 횡단 → 북단 둔치 → 지하로 내려가 합정
  dangsan__hapjeong: [
    { kind: "city", length: 110, stretch: 0.15 },
    { kind: "bank", length: 55, stretch: 0 },
    { kind: "river", length: 600, stretch: 0 },
    { kind: "bank", length: 60, stretch: 0 },
    { kind: "city", length: 50, stretch: 0.1 },
    { kind: "portal-in", length: 140, stretch: 0 },
    { kind: "tunnel", length: 90, stretch: 1 },
  ],
};

/** 역 사이 중간 구간 연출 (승강장 구간 제외) */
export function middleSections(segmentId: string, from: Station, to: Station): SectionSpec[] {
  const custom = CUSTOM[segmentId];
  if (custom) return custom;
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
