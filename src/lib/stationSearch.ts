/**
 * 역 검색 — 국문(부분 일치·초성), 영문(대소문자·기호 무시). 같은 이름의 역(환승역)은 한 결과로 묶는다.
 */
import { LINES, type Station } from "../data/lines";

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** 한글 음절 → 초성 (그 외 문자는 그대로) */
export function initials(s: string): string {
  return [...s]
    .map((c) => {
      const code = c.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
    })
    .join("");
}

const isChoOnly = (q: string) => /^[ㄱ-ㅎ]+$/.test(q);
const normEn = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface StationHit {
  nameKo: string;
  nameEn: string;
  /** 이 이름의 역들 (노선별) — 노선 순서대로 */
  stations: Station[];
}

const GROUPS: StationHit[] = (() => {
  const m = new Map<string, StationHit>();
  for (const l of LINES)
    for (const st of l.stations) {
      const g = m.get(st.nameKo) ?? { nameKo: st.nameKo, nameEn: st.nameEn, stations: [] };
      if (!g.stations.some((x) => x.line === st.line)) g.stations.push(st);
      m.set(st.nameKo, g);
    }
  return [...m.values()];
})();

export function searchStations(query: string, limit = 8): StationHit[] {
  const q = query.trim().replace(/역$/, "");
  if (!q) return [];
  const qEn = normEn(q);
  const cho = isChoOnly(q);
  const scored: Array<[number, StationHit]> = [];
  for (const g of GROUPS) {
    const ko = g.nameKo;
    let score = -1;
    if (cho) {
      const ini = initials(ko);
      if (ini === q) score = 0;
      else if (ini.startsWith(q)) score = 1;
      else if (ini.includes(q)) score = 3;
    } else {
      if (ko === q) score = 0;
      else if (ko.startsWith(q)) score = 1;
      else if (ko.includes(q)) score = 2;
      else if (qEn.length >= 2) {
        const en = normEn(g.nameEn);
        if (en === qEn) score = 0;
        else if (en.startsWith(qEn)) score = 1.5;
        else if (en.includes(qEn)) score = 3;
      }
    }
    // 환승역(노선이 많은 역)을 조금 앞으로
    if (score >= 0) scored.push([score - Math.min(0.4, (g.stations.length - 1) * 0.1), g]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].nameKo.length - b[1].nameKo.length)
    .slice(0, limit)
    .map(([, g]) => g);
}
