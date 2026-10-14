import { describe, expect, it } from "vitest";
import { stationsBetween } from "@/data/lines";
import { buildJourney, sampleJourney } from "./journey";
import { EVENT_KINDS, RARE_KINDS, cabinEventAt, isCabinEvent, planRideEvents, seedOf, seenEvents, timeAtX } from "./rideEvents";

const journey = (from: string, to: string, min: number) =>
  buildJourney({ stationIds: stationsBetween(from, to).map((s) => s.id), totalSec: min * 60 });

describe("깜짝 이벤트", () => {
  const j = journey("sindorim", "seongsu", 25);

  it("같은 시드면 같은 이벤트", () => {
    expect(planRideEvents(j, seedOf("abc"))).toEqual(planRideEvents(j, seedOf("abc")));
  });

  it("한 번 탈 때 0~3개, 객실 승객은 한 번에 한 명, 시간 범위 안", () => {
    for (let s = 0; s < 400; s++) {
      const evs = planRideEvents(j, s);
      expect(evs.length).toBeLessThanOrEqual(3);
      const cabin = evs.filter((e) => isCabinEvent(e.kind));
      for (let a = 0; a < cabin.length; a++)
        for (let b = a + 1; b < cabin.length; b++) expect(cabin[a].t1 <= cabin[b].t0 || cabin[b].t1 <= cabin[a].t0).toBe(true);
      for (const e of evs) {
        expect(e.t0).toBeGreaterThanOrEqual(0);
        expect(e.t1).toBeLessThanOrEqual(j.totalSec);
        expect(e.t1).toBeGreaterThan(e.t0);
      }
    }
  });

  it("빈도: 25분 여정은 대부분 1번 이상, 희귀 이벤트는 드물게", () => {
    let some = 0;
    let rare = 0;
    const N = 1000;
    for (let s = 0; s < N; s++) {
      const evs = planRideEvents(j, s * 7919);
      if (evs.length) some++;
      if (evs.some((e) => RARE_KINDS.includes(e.kind))) rare++;
    }
    expect(some / N).toBeGreaterThan(0.6);
    expect(some / N).toBeLessThan(0.85);
    expect(rare / N).toBeLessThan(0.08);
  });

  it("짧은 여정은 많아야 일반 이벤트 1개, 휴식(한 역 정차)은 없음", () => {
    const short = journey("dangsan", "hapjeong", 3);
    for (let s = 0; s < 200; s++) expect(planRideEvents(short, s).filter((e) => !RARE_KINDS.includes(e.kind)).length).toBeLessThanOrEqual(1);
    expect(planRideEvents(buildJourney({ stationIds: ["hapjeong"], totalSec: 300 }), 1)).toEqual([]);
  });

  it("창밖 이벤트는 맞는 장소에: 오리배·괴물은 한강 철교, 고양이는 지상 역", () => {
    const bridge = journey("dangsan", "hapjeong", 5);
    for (const k of ["duckboat", "monster"] as const) {
      const [e] = planRideEvents(bridge, 1, k);
      expect(e, k).toBeDefined();
      const x = sampleJourney(bridge, (e.t0 + e.t1) / 2).x;
      const sec = bridge.sections.find((s) => x >= s.x0 && x <= s.x1)!;
      expect(sec.kind).toBe("river");
    }
    const [cat] = planRideEvents(bridge, 1, "cat");
    expect(bridge.stations[bridge.stopX.indexOf(cat.m!)].structure).not.toBe("underground");
    // 전 구간 지하는 고양이·열기구 없음
    const under = journey("euljiro-3ga", "ddp", 10);
    expect(planRideEvents(under, 1, "cat")).toEqual([]);
    expect(planRideEvents(under, 1, "balloon")).toEqual([]);
  });

  it("모든 종류가 어딘가에서는 나올 수 있다", () => {
    const routes = [j, journey("dangsan", "hapjeong", 5), journey("l3-oksu", "l3-apgujeong", 10), journey("gj-yongsan", "gj-yangpyeong", 60)];
    for (const k of EVENT_KINDS) expect(routes.some((r) => planRideEvents(r, 3, k).length > 0), k).toBe(true);
  });

  it("본 이벤트와 지금 객실 승객", () => {
    const [e] = planRideEvents(j, 1, "danso");
    expect(seenEvents([e], e.t0)).toEqual([]);
    expect(seenEvents([e], e.t0 + 2)).toEqual(["danso"]);
    expect(cabinEventAt([e], e.t0 + 1)?.kind).toBe("danso");
    expect(cabinEventAt([e], e.t1 + 1)).toBeUndefined();
  });

  it("timeAtX 는 sampleJourney 의 역함수", () => {
    const t = timeAtX(j, j.stopX[2]);
    expect(Math.abs(sampleJourney(j, t).x - j.stopX[2])).toBeLessThan(0.01);
  });
});
