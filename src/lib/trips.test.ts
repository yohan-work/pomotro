import { describe, expect, it } from "vitest";
import { getSegment, isTransferPair, transferBetween } from "@/data/lines";
import { middleSections } from "@/data/scenery";
import { minJourneySec } from "@/sim/journey";
import { TRIPS, nextLeg, tripDone, tripPath, tripSummary } from "./trips";

describe("장거리 여행", () => {
  it("모든 코스 경로는 실제 구간·공식 환승으로만 이어진다", () => {
    for (const t of TRIPS) {
      const p = tripPath(t.id);
      for (let k = 1; k < p.length; k++) {
        if (isTransferPair(p[k - 1], p[k])) expect(transferBetween(p[k - 1].id, p[k].id), `${t.id} ${p[k - 1].id}>${p[k].id}`).toBeDefined();
        else expect(() => getSegment(p[k - 1].id, p[k].id)).not.toThrow();
      }
    }
  });

  it("2호선 한 바퀴는 43구간, 다리 순례는 다리 다섯을 모두 건넌다", () => {
    expect(tripSummary("loop2").stations).toBe(43);
    const p = tripPath("bridges");
    const bridges = new Set<string>();
    for (let k = 1; k < p.length; k++) {
      if (isTransferPair(p[k - 1], p[k])) continue;
      const seg = getSegment(p[k - 1].id, p[k].id);
      for (const s of middleSections(seg.id, p[k - 1], p[k])) if (s.kind === "river" && s.variant?.startsWith("hangang-")) bridges.add(s.variant);
    }
    expect([...bridges].sort()).toEqual(["hangang-cheongdam", "hangang-dongho", "hangang-dongjak", "hangang-jamsil", "hangang-yanghwa"]);
  });

  it("다음 구간은 집중시간 안, 끝까지 이어 달리면 코스가 끝난다", () => {
    for (const t of TRIPS) {
      let progress = 0;
      let legs = 0;
      for (;;) {
        const leg = nextLeg(t.id, progress, 25 * 60);
        if (!leg) break;
        expect(leg.to).toBeGreaterThan(leg.from);
        expect(minJourneySec(leg.stationIds)).toBeLessThanOrEqual(25 * 60);
        // 환승으로 시작하거나 끝나지 않는다
        const p = tripPath(t.id);
        expect(isTransferPair(p[leg.from], p[leg.from + 1])).toBe(false);
        expect(isTransferPair(p[leg.to - 1], p[leg.to])).toBe(false);
        progress = leg.to;
        legs++;
        expect(legs).toBeLessThan(40);
      }
      expect(progress).toBe(tripPath(t.id).length - 1);
      expect(tripDone(t.id, progress)).toBe(tripSummary(t.id).stations);
    }
  });

  it("집중시간이 길수록 구간이 길다", () => {
    expect(nextLeg("loop2", 0, 60 * 60)!.to).toBeGreaterThan(nextLeg("loop2", 0, 15 * 60)!.to);
  });
});
