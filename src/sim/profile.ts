/**
 * 가감속 램프 프로파일.
 *
 * 가속도 모양 함수 g(x) (x∈[0,1]) 를 수치 적분해 정규화된 속도 F(x), 거리 S(x) 테이블을 만든다.
 * - 가속: v = V·F(τ/T),        s = V·T·S(τ/T)
 * - 감속: v = V·(1−F(τ/T)),    s = V·T·(τ/T − S(τ/T))
 * 가속도가 0에서 부드럽게 시작하고 끝나므로 출발·정차 순간에 덜컥거리지 않는다.
 */

const N = 1024;

export interface Ramp {
  /** 정규화 속도 F(x) */
  vel: Float64Array;
  /** 정규화 거리 S(x) = ∫F */
  dist: Float64Array;
  /** 정규화 가속도 dF/dx */
  acc: Float64Array;
  /** 램프 동안 이동거리 / (V·T) */
  distFactor: number;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function buildRamp(shape: (x: number) => number, decel: boolean): Ramp {
  const g = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) g[i] = shape(i / N);
  const F = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) F[i] = F[i - 1] + (g[i - 1] + g[i]) / 2 / N;
  const norm = F[N];
  for (let i = 0; i <= N; i++) {
    F[i] /= norm;
    g[i] /= norm;
  }
  const S = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) S[i] = S[i - 1] + (F[i - 1] + F[i]) / 2 / N;
  return { vel: F, dist: S, acc: g, distFactor: decel ? 1 - S[N] : S[N] };
}

/** 저속에서 거의 일정한 견인력, 고속에서 서서히 줄어드는 전동차 가속 */
export const ACCEL = buildRamp(
  (x) => smoothstep(0, 0.07, x) * (1 - 0.6 * smoothstep(0.25, 0.85, x)) * (1 - smoothstep(0.8, 1, x)),
  false,
);

/** 일정한 상용제동 후 정차 직전 제동을 풀어 부드럽게 멈춘다 */
export const DECEL = buildRamp(
  (x) => smoothstep(0, 0.1, x) * (1 - 0.85 * smoothstep(0.84, 1, x)),
  true,
);

export function lookup(table: Float64Array, x: number): number {
  if (x <= 0) return table[0];
  if (x >= 1) return table[N];
  const f = x * N;
  const i = Math.floor(f);
  const r = f - i;
  return table[i] * (1 - r) + table[i + 1] * r;
}
