/**
 * 함께 타기 링크 — 같은 노선을 같은 출발 시각 기준으로 탄다. 시뮬레이션이 시간의 순수 함수라 모두 같은 장면을 본다.
 * 링크 = 경로·출발 시각·집중 시간만 담은 코드 (서버 없이 동작). 방 이름은 코드에서 결정론적으로 만든다.
 */
import { getSegment, getStation, isTransferPair, transferBetween } from "../data/lines";

export interface SharedRide {
  stationIds: string[];
  /** 출발 시각 (epoch ms, 일시정지 시간 반영) */
  startMs: number;
  totalSec: number;
}

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function encodeRide(r: SharedRide): string {
  return b64url(`1.${Math.round(r.startMs / 1000)}.${Math.round(r.totalSec)}.${r.stationIds.join(",")}`);
}

/** 코드 → 여행. 경로가 실제 구간·공식 환승으로 이어지지 않거나 형식이 틀리면 null */
export function decodeRide(code: string): SharedRide | null {
  try {
    const [v, start, total, ids] = unb64url(code).split(".");
    if (v !== "1") return null;
    const stationIds = ids.split(",");
    const startMs = Number(start) * 1000;
    const totalSec = Number(total);
    if (!Number.isFinite(startMs) || !(totalSec >= 60 && totalSec <= 4 * 3600) || stationIds.length < 2 || stationIds.length > 200) return null;
    const st = stationIds.map(getStation);
    for (let k = 1; k < st.length; k++) {
      if (isTransferPair(st[k - 1], st[k])) {
        if (!transferBetween(st[k - 1].id, st[k].id)) return null;
      } else getSegment(st[k - 1].id, st[k].id);
    }
    return { stationIds, startMs, totalSec };
  } catch {
    return null;
  }
}

/** 방 이름 (코드에서 결정론적, 영문 소문자·숫자 12자) */
export function roomOf(code: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return ((h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)).padEnd(12, "0").slice(0, 12);
}
