import { describe, expect, it } from "vitest";
import type { RideRecord } from "@/store/useAppStore";
import { kstWeek, todayDone, weekStartDay, weekSummary } from "./goals";
import { kstDay } from "./stats";

// 2026-10-15(목) 12:00 KST
const NOW = Date.UTC(2026, 9, 15, 3);
let n = 0;
const ride = (dayOffset: number, from: string, to: string, extra: Partial<RideRecord> = {}): RideRecord => ({
  id: `r${n++}`,
  mode: "focus",
  fromId: from,
  toId: to,
  stationCount: 1,
  focusSec: 1500,
  completedAt: NOW + dayOffset * 86400e3,
  task: "",
  partial: false,
  distanceKm: 2,
  ...extra,
});

describe("하루 목표·주간 회고", () => {
  it("주는 한국 시간 월요일 시작", () => {
    const w = kstWeek(NOW);
    // 10/12(월) 00:00 KST 는 같은 주, 10/11(일) 23:00 KST 는 지난주
    expect(kstWeek(Date.UTC(2026, 9, 11, 15))).toBe(w);
    expect(kstWeek(Date.UTC(2026, 9, 11, 14))).toBe(w - 1);
    expect(new Date((weekStartDay(w) * 86400 - 9 * 3600) * 1000 + 9 * 3600e3).getUTCDay()).toBe(1);
    expect(kstDay(NOW) - weekStartDay(w)).toBe(3);
  });

  it("오늘 목표 진행은 끝까지 달린 집중 여행만", () => {
    const recs = [ride(0, "dangsan", "hapjeong"), ride(0, "dangsan", "hapjeong", { partial: true }), ride(-1, "dangsan", "hapjeong"), ride(0, "dangsan", "hapjeong", { mode: "demo" })];
    expect(todayDone(recs, NOW)).toBe(1);
  });

  it("주간 요약: 횟수·분·새로 가 본 역·탄 호선·목표 채운 날·가장 많이 탄 날", () => {
    const recs = [
      ride(-10, "dangsan", "hapjeong"), // 지난주 이전: 당산·합정은 이미 가 본 역
      ride(-3, "dangsan", "hapjeong"), // 월요일
      ride(-3, "hapjeong", "hongik-univ"),
      ride(0, "l5m-gangdong", "l5m-dunchon-dong"),
      ride(0, "l5m-gangdong", "l5m-dunchon-dong", { partial: true, focusSec: 600 }),
    ];
    const s = weekSummary(recs, kstWeek(NOW), 2);
    expect(s.rides).toBe(3);
    expect(s.minutes).toBe(25 * 3 + 10);
    expect(s.activeDays).toBe(2);
    expect(s.newStations).toBe(3); // 홍대입구, 강동, 둔촌동
    expect(s.lines).toEqual(["2", "5"]);
    expect(s.goalDays).toBe(1); // 월요일 2번
    expect(s.bestDay?.minutes).toBe(50);
    expect(s.perDay[0]).toBe(50);
  });
});
