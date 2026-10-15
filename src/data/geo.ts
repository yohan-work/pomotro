/**
 * 역 좌표 (위도·경도) — 노선도 배치용. 모두 공식 데이터:
 * 서울교통공사 노선은 서울시 「역사마스터 정보」, 경의중앙선은 국가철도공단 「역위치」 (metro/lineGJ.official.ts).
 * 좌표가 거리와 모순되는 역(positionSuspect)은 양옆 역 사이에 놓는다.
 */
import { GJ_OFFICIAL_STATIONS } from "./lineGJ.official";
import { METRO_OFFICIAL } from "./metro.official";
import { LINES, type LineId, type Station } from "./lines";

export interface LatLon {
  lat: number;
  lon: number;
}

const COORD = new Map<string, LatLon>();
for (const line of LINES) {
  if (line.id === "GJ") {
    const st = GJ_OFFICIAL_STATIONS;
    line.stations.forEach((s, i) => {
      const o = st[i];
      if (!o.positionSuspect) COORD.set(s.id, { lat: o.lat, lon: o.lon });
      else {
        const a = st[i - 1];
        const b = st[i + 1];
        COORD.set(s.id, { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });
      }
    });
    continue;
  }
  const off = METRO_OFFICIAL[line.id as Exclude<LineId, "GJ">];
  for (const s of line.stations) {
    const o = off.stations.find((x) => x.nameKo === s.nameKo);
    if (!o) throw new Error(`좌표 없음: ${line.nameKo} ${s.nameKo}`);
    COORD.set(s.id, { lat: o.lat, lon: o.lon });
  }
}

export function latLonOf(st: Station): LatLon {
  return COORD.get(st.id)!;
}
