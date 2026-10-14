/**
 * 시간대별 팔레트 (낮 / 노을 / 밤).
 * 창은 서쪽을 향한다 — 노을 때 해가 창 정면 한강 하류 위로 진다.
 */

export type TimeOfDay = "day" | "sunset" | "night";

export interface Palette {
  key: TimeOfDay;
  sky: [string, string, string];
  sun: { x: number; y: number; r: number; color: string; glow: string; visible: boolean };
  cloud: string;
  cloudShade: string;
  haze: string;
  hazeStrength: number;
  mountainFar: string;
  mountainNear: string;
  skylineFar: string;
  skylineNear: string;
  skylineWindow: string;
  waterTop: string;
  waterBottom: string;
  waterGlint: string;
  ground: string;
  groundFar: string;
  grass: string;
  grassDark: string;
  road: string;
  /** 건물 외벽 */
  walls: string[];
  accents: string[];
  /** 창문 유리 (주간 반사 / 야간 불빛) */
  glass: string;
  glassLit: string;
  litRatio: number;
  shade: string;
  tree: string[];
  treeAutumn: string[];
  steel: string;
  steelDark: string;
  concrete: string;
  concreteDark: string;
  /** 전체 장면 위에 곱해지는 분위기 색 */
  tint: string;
  tintAlpha: number;
  lamp: string;
  night: number;
}

export const PALETTES: Record<TimeOfDay, Palette> = {
  day: {
    key: "day",
    sky: ["#8FC3E8", "#BFDDF0", "#EEF2EC"],
    sun: { x: 0.18, y: -0.2, r: 0, color: "#FFF6DA", glow: "rgba(255,240,200,0.35)", visible: false },
    cloud: "#FFFFFF",
    cloudShade: "#DCE6EF",
    haze: "#DCE8EE",
    hazeStrength: 0.55,
    mountainFar: "#A9BFC9",
    mountainNear: "#8EAAA3",
    skylineFar: "#B9C7CF",
    skylineNear: "#A3B4BE",
    skylineWindow: "#D7E2E8",
    waterTop: "#B8D4DD",
    waterBottom: "#5E97A6",
    waterGlint: "rgba(255,255,255,0.75)",
    ground: "#CBBFAA",
    groundFar: "#C4C6B8",
    grass: "#9CC28A",
    grassDark: "#7BA872",
    road: "#9C9A96",
    walls: ["#F4EEE3", "#EFE6D6", "#E9EEF0", "#F2E4D8", "#E3E9DF", "#F6F1E8"],
    accents: ["#7DB7A0", "#E9A47E", "#7FA7C9", "#E7C36F", "#C99BB5", "#8CBF8F"],
    glass: "#9DBBD0",
    glassLit: "#FFE7A8",
    litRatio: 0.0,
    shade: "rgba(60,70,90,0.18)",
    tree: ["#77A86A", "#8DBA74", "#6A9A62", "#9CC47E"],
    treeAutumn: ["#E2B34E", "#E79A55", "#D8C25A"],
    steel: "#3E8F6C",
    steelDark: "#2C6E52",
    concrete: "#C9C4BA",
    concreteDark: "#A7A197",
    tint: "#FFF4E0",
    tintAlpha: 0.0,
    lamp: "#FFF3C4",
    night: 0,
  },
  sunset: {
    key: "sunset",
    sky: ["#6E7FB8", "#E9A6A0", "#FBD49B"],
    sun: { x: 0.64, y: 0.36, r: 3.2, color: "#FFE9B8", glow: "rgba(255,190,120,0.55)", visible: true },
    cloud: "#F8C9B4",
    cloudShade: "#B993AE",
    haze: "#F2C7A8",
    hazeStrength: 0.6,
    mountainFar: "#B48FA6",
    mountainNear: "#8E7795",
    skylineFar: "#A98BA2",
    skylineNear: "#86728F",
    skylineWindow: "#FFD9A0",
    waterTop: "#F6C9A2",
    waterBottom: "#6C6E95",
    waterGlint: "rgba(255,230,180,0.9)",
    ground: "#A8918A",
    groundFar: "#9B8590",
    grass: "#8C9C6E",
    grassDark: "#6F7F5E",
    road: "#80767A",
    walls: ["#EED3C2", "#E8C8B8", "#D9CBD0", "#EBCDB6", "#D6C8C0", "#F0DACB"],
    accents: ["#6E9F8E", "#E08C6B", "#7690B5", "#E2B064", "#B98AA6", "#7FAE85"],
    glass: "#C99A9A",
    glassLit: "#FFD38A",
    litRatio: 0.18,
    shade: "rgba(70,50,90,0.22)",
    tree: ["#6F8A5E", "#7F9663", "#5F7A55", "#8C9E68"],
    treeAutumn: ["#D9974A", "#D97F4D", "#CDA352"],
    steel: "#3B7F65",
    steelDark: "#2A5E4B",
    concrete: "#BBA8A2",
    concreteDark: "#957F80",
    tint: "#FF9E6E",
    tintAlpha: 0.08,
    lamp: "#FFD98F",
    night: 0.3,
  },
  night: {
    key: "night",
    sky: ["#16203F", "#2B3A63", "#4A4E72"],
    sun: { x: 0.3, y: 0.16, r: 1.6, color: "#F3F0DC", glow: "rgba(220,225,255,0.18)", visible: true },
    cloud: "#3C4670",
    cloudShade: "#2A3258",
    haze: "#3D4569",
    hazeStrength: 0.5,
    mountainFar: "#2C3558",
    mountainNear: "#232B49",
    skylineFar: "#2F3759",
    skylineNear: "#252C4A",
    skylineWindow: "#FFD48A",
    waterTop: "#3A4369",
    waterBottom: "#141A33",
    waterGlint: "rgba(255,220,150,0.85)",
    ground: "#2E3148",
    groundFar: "#2A2E47",
    grass: "#2E3E3C",
    grassDark: "#243231",
    road: "#34364A",
    walls: ["#4A4D66", "#53516A", "#44506A", "#575067", "#4B5464", "#5A5870"],
    accents: ["#3F7A6B", "#A8664E", "#4C6A92", "#B08C4C", "#8A6585", "#5C8A66"],
    glass: "#2F3A58",
    glassLit: "#FFD48A",
    litRatio: 0.55,
    shade: "rgba(10,10,30,0.3)",
    tree: ["#2F4741", "#35503F", "#283E39", "#3A5544"],
    treeAutumn: ["#5B5236", "#5E4A35", "#585236"],
    steel: "#2E6A55",
    steelDark: "#214C3E",
    concrete: "#4A4A5E",
    concreteDark: "#38384B",
    tint: "#3A4280",
    tintAlpha: 0.12,
    lamp: "#FFD48A",
    night: 1,
  },
};

/** 한국 시간(KST) 기준 기본 시간대 */
export function timeOfDayKST(date = new Date()): TimeOfDay {
  const kst = new Date(date.getTime() + (date.getTimezoneOffset() + 540) * 60000);
  const h = kst.getHours() + kst.getMinutes() / 60;
  if (h >= 6.5 && h < 16.5) return "day";
  if (h >= 16.5 && h < 18.8) return "sunset";
  return "night";
}
