/**
 * 창밖 2.5D 패럴랙스 장면.
 *
 * 좌표계
 * - 트랙 좌표 m (시뮬레이션 미터). 카메라(창 중앙)는 열차 위치 `cam`.
 * - 레이어마다 시차 계수 s 를 가진다: 화면 x = W/2 + (m − cam) · s · u   (u = 창 높이의 1%)
 *   → 열차가 +m 로 달리면 풍경은 오른쪽 → 왼쪽으로 흐른다 (서쪽 창 기준, 열차는 북쪽 진행).
 * - 각 레이어의 오브젝트는 트랙 좌표 셀 단위로 결정론적으로 생성된다. 같은 위치에는 항상 같은 풍경.
 * - 오브젝트가 무엇인지(시가지/둔치/강/터널/역)는 그 오브젝트의 앵커 m 이 속한 연출 구간이 결정한다.
 *   느린 레이어일수록 넓은 트랙 범위를 비추므로 구간 전환이 레이어별로 자연스럽게 엇갈린다.
 */
import { sectionsInRange, type Journey, type Section } from "../../sim/journey";
import { type RideEvent } from "../../sim/rideEvents";
import { type Palette } from "../palette";
import { type Season, type Weather } from "../conditions";
import { hash2, rng } from "../rng";
import { type SpriteCache } from "../sprites";

export const SPEED = {
  cloud: 0.004,
  mountainFar: 0.014,
  mountainNear: 0.028,
  skyline: 0.075,
  island: 0.24,
  yanghwa: 0.42,
  mid: 0.62,
  near: 1.55,
  platformBack: 2.3,
  platform: 3.0,
  track: 4.2,
  fore: 7.2,
} as const;

/** 수평선 (u) */
export const HZ = 47;
/** 수면 시작 (u) */
export const WATER_Y = 51;

export interface Frame {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  u: number;
  cam: number;
  v: number;
  time: number;
  pal: Palette;
  journey: Journey;
  sprites: SpriteCache;
  quality: number;
  /** 스크린도어 열림 0..1 */
  doorOpen: number;
  /** 0 = 실외 밝기, 1 = 터널 안 (창 반사 강도) */
  darkness: number;
  /** 0..1 해가 창 방향에 있는지 (서향 창일 때만 노을 해가 보인다) */
  sunAlpha: number;
  reducedMotion: boolean;
  weather: Weather;
  season: Season;
  /** 깜짝 이벤트 (창밖에 그릴 것만 쓴다) */
  events: RideEvent[];
}

export type Land = "city" | "bank" | "river" | "none";

/** 강변 선로에서 강 쪽(남쪽)을 보고 있는지 */
export const riverSideView = (sec: Section) => sec.view === "S" || sec.view === "SE" || sec.view === "SW";

export function landOf(sec: Section, layer: "mid" | "near" = "near"): Land {
  switch (sec.kind) {
    case "riverside":
      // 강 쪽 창: 근경은 강변 공원, 중경은 강물 / 반대쪽 창: 평범한 시가지
      if (!riverSideView(sec)) return "city";
      return layer === "mid" ? "river" : "bank";
    case "river":
      // 좁은 하천은 중경에서는 건너편 둑(강변도로·아파트)이 바로 보인다
      if (sec.variant === "stream" && layer === "mid") return "bank";
      return "river";
    case "bank":
      return "bank";
    case "tunnel":
      return "none";
    case "platform":
      return sec.station!.structure === "elevated" ? "city" : "none";
    default:
      return "city";
  }
}

export const sx = (f: Frame, m: number, s: number) => f.W / 2 + (m - f.cam) * s * f.u;
export const mAt = (f: Frame, x: number, s: number) => f.cam + (x - f.W / 2) / (s * f.u);

export function visRange(f: Frame, s: number, marginPx: number): [number, number] {
  const half = (f.W / 2 + marginPx) / (s * f.u);
  return [f.cam - half, f.cam + half];
}

export interface Span {
  sec: Section;
  xa: number;
  xb: number;
}

/** 레이어 s 에서 보이는 연출 구간들의 화면 x 구간 */
export function spans(f: Frame, s: number, margin = 0): Span[] {
  const [m0, m1] = visRange(f, s, margin);
  return sectionsInRange(f.journey, m0, m1).map((sec) => ({
    sec,
    xa: Math.max(-margin, sx(f, sec.x0, s)),
    xb: Math.min(f.W + margin, sx(f, sec.x1, s)),
  }));
}

export function sectionAtM(f: Frame, m: number): Section {
  const s = f.journey.sections;
  if (m < s[0].x0) return s[0];
  for (let i = s.length - 1; i >= 0; i--) if (s[i].x0 <= m) return s[i];
  return s[0];
}

/** 셀 단위 결정론적 반복 */
export function forCells(f: Frame, s: number, cell: number, margin: number, seed: number, fn: (m: number, r: () => number, idx: number) => void) {
  const [m0, m1] = visRange(f, s, margin);
  const i0 = Math.floor(m0 / cell);
  const i1 = Math.ceil(m1 / cell);
  for (let i = i0; i <= i1; i++) fn(i * cell, rng(hash2(i, seed)), i);
}
