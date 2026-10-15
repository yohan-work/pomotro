/**
 * 날씨·계절 — 시간대 팔레트 위에 덧씌우는 변형.
 * 같은 (시간대, 계절, 날씨) 조합이면 같은 팔레트 객체를 돌려준다 (스프라이트 캐시 무효화 기준).
 */
import type { Palette } from "./palette";
import { mix } from "./sprites";

export type Weather = "clear" | "cloudy" | "rain" | "snow" | "fog";
export type Season = "spring" | "summer" | "autumn" | "winter";

export const WEATHER_LABEL: Record<Weather, string> = { clear: "맑음", cloudy: "흐림", rain: "비", snow: "눈", fog: "안개" };
export const SEASON_LABEL: Record<Season, string> = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" };

/** 한국 시간 기준 계절 (3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울) */
export function seasonKST(date = new Date()): Season {
  const m = new Date(date.getTime() + (date.getTimezoneOffset() + 540) * 60000).getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

const SEASON_TREES: Record<Season, { tree: string[]; accent: string[]; accentRatio: number; bare: boolean }> = {
  // 연두 잎 사이 벚꽃
  spring: { tree: ["#9CC47E", "#A9CF8A", "#8DBA74", "#B3D492"], accent: ["#F4B8C8", "#F7CAD6", "#EFA9BE"], accentRatio: 0.45, bare: false },
  summer: { tree: ["#4F8A4C", "#5E9A55", "#477F45", "#6AA25C"], accent: ["#5E9A55"], accentRatio: 0, bare: false },
  // 은행·단풍 (기존 팔레트와 같은 비율)
  autumn: { tree: [], accent: [], accentRatio: 0.38, bare: false },
  winter: { tree: ["#8C7B6E", "#7E6E63", "#96877B"], accent: ["#8C7B6E"], accentRatio: 0, bare: true },
};

const cache = new Map<string, Palette>();

/** 봄 단계별 나무 (벚꽃 절정이 기본 — 설정에서 봄을 고르면 절정) */
const SPRING_PHASE_TREES = {
  // 이른 봄: 아직 연한 가지 사이 개나리
  early: { tree: ["#B7C29A", "#A9B98C", "#C2CBA6", "#9FB085"], accent: ["#F2D14B", "#F5DC6A"], accentRatio: 0.3, bare: false },
  // 늦봄: 짙어지는 신록, 드문드문 철쭉
  late: { tree: ["#7FB86A", "#8CC274", "#76AE62", "#98C980"], accent: ["#E58AB0", "#EE9CC0"], accentRatio: 0.08, bare: false },
} as const;

export function applyConditions(base: Palette, season: Season, weather: Weather, springPhase: "early" | "bloom" | "late" = "bloom"): Palette {
  const phase = season === "spring" ? springPhase : "bloom";
  const key = `${base.key}:${season}:${weather}:${phase}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p: Palette = { ...base, sky: [...base.sky] as Palette["sky"], tree: [...base.tree], treeAutumn: [...base.treeAutumn], sun: { ...base.sun } };

  // 계절: 나무 색. 밤·노을에는 시간대 톤으로 눌러 준다
  const st = phase !== "bloom" ? SPRING_PHASE_TREES[phase] : SEASON_TREES[season];
  const tone = (c: string) => (base.night > 0.5 ? mix(c, "#1f2a2a", 0.62) : base.key === "sunset" ? mix(c, "#b07a70", 0.18) : c);
  if (st.tree.length) {
    p.tree = st.tree.map(tone);
    p.treeAutumn = st.accent.map(tone);
  }
  p.accentRatio = st.accentRatio;
  p.bareTrees = st.bare;

  // 날씨: 하늘·연무·지면
  const grey = base.night > 0.5 ? "#262b3a" : base.key === "sunset" ? "#857a88" : "#97a1ab";
  if (weather === "cloudy" || weather === "rain" || weather === "snow" || weather === "fog") {
    const k = weather === "cloudy" ? 0.55 : weather === "fog" ? 0.75 : 0.7;
    p.sky = p.sky.map((c) => mix(c, grey, k)) as Palette["sky"];
    p.cloud = mix(base.cloud, base.night > 0.5 ? "#3a4058" : "#d4d8dc", 0.6);
    p.cloudShade = mix(base.cloudShade, base.night > 0.5 ? "#232838" : "#9aa1aa", 0.6);
    p.haze = mix(base.haze, grey, 0.5);
    p.hazeStrength = Math.min(1, base.hazeStrength + (weather === "fog" ? 0.45 : 0.2));
    p.overcast = weather === "cloudy" ? 0.7 : 1;
    p.sun = { ...p.sun, visible: false };
    p.waterTop = mix(base.waterTop, grey, 0.45);
    p.waterGlint = base.night > 0.5 ? base.waterGlint : "rgba(255,255,255,0.35)";
    p.mountainFar = mix(base.mountainFar, p.haze, 0.45);
    p.mountainNear = mix(base.mountainNear, p.haze, 0.35);
    p.skylineFar = mix(base.skylineFar, p.haze, 0.35);
    p.litRatio = Math.min(0.9, base.litRatio + 0.12);
  }
  if (weather === "rain") {
    // 젖은 길: 어둡고 반짝임
    p.road = mix(base.road, "#3d4148", 0.45);
    p.ground = mix(base.ground, "#5d6066", 0.25);
  }
  if (weather === "snow") {
    const snow = base.night > 0.5 ? "#b9c0d6" : "#f1f3f6";
    p.ground = mix(base.ground, snow, 0.6);
    p.groundFar = mix(base.groundFar, snow, 0.55);
    p.grass = mix(base.grass, snow, 0.65);
    p.grassDark = mix(base.grassDark, snow, 0.5);
    p.snowRoofs = true;
  }

  cache.set(key, p);
  return p;
}

/* ───────────── 서울 실시간 날씨 (Open-Meteo, 키 불필요) ───────────── */

export interface LiveWeather {
  weather: Weather;
  tempC: number;
  fetchedAt: number;
}

const CACHE_KEY = "metro-weather-v1";
const TTL = 30 * 60 * 1000;

/** WMO weather code → 연출 날씨 */
export function fromWmo(code: number): Weather {
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rain";
  if (code === 3) return "cloudy";
  return "clear";
}

export async function fetchSeoulWeather(): Promise<LiveWeather | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as LiveWeather | null;
    if (cached && Date.now() - cached.fetchedAt < TTL) return cached;
  } catch {
    /* 무시 */
  }
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,weather_code&timezone=Asia%2FSeoul";
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { current?: { temperature_2m: number; weather_code: number } };
    if (!d.current) return null;
    const out: LiveWeather = { weather: fromWmo(d.current.weather_code), tempC: Math.round(d.current.temperature_2m), fetchedAt: Date.now() };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch {
      /* 무시 */
    }
    return out;
  } catch {
    return null;
  }
}
