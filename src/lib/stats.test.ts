import { describe, expect, it } from "vitest";
import type { RideRecord } from "../store/useAppStore";
import { lastWeek, totals, visited } from "./stats";

const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 14, 3); // 2026-10-14 12:00 KST
const rec = (p: Partial<RideRecord>): RideRecord => ({
  id: Math.random().toString(36),
  mode: "focus",
  fromId: "dangsan",
  toId: "hapjeong",
  stationCount: 1,
  focusSec: 1500,
  completedAt: NOW,
  task: "",
  partial: false,
  distanceKm: 2,
  ...p,
});

describe("stats", () => {
  it("counts a streak from today, or from yesterday if today has no ride yet", () => {
    const rs = [rec({ completedAt: NOW }), rec({ completedAt: NOW - DAY }), rec({ completedAt: NOW - 3 * DAY })];
    expect(totals(rs, NOW).streak).toBe(2);
    expect(totals(rs.slice(1), NOW).streak).toBe(1);
    expect(totals([], NOW).streak).toBe(0);
  });

  it("ignores demo rides and leaves partial rides out of the visited map", () => {
    const rs = [
      rec({ fromId: "dangsan", toId: "sinchon" }),
      rec({ mode: "demo", fromId: "gangnam", toId: "sadang" }),
      rec({ partial: true, fromId: "jamsil", toId: "gangnam" }),
    ];
    const v = visited(rs);
    expect([...v.stations]).toEqual(["dangsan", "hapjeong", "hongik-univ", "sinchon"]);
    expect(v.segments.has("dangsan__hapjeong")).toBe(true);
    expect(v.stations.has("gangnam")).toBe(false);
    const t = totals(rs, NOW);
    expect(t.rides).toBe(1);
    expect(t.focusSec).toBe(3000);
  });

  it("builds 7 days ending today with minutes per day", () => {
    const w = lastWeek([rec({ completedAt: NOW }), rec({ completedAt: NOW - 2 * DAY, focusSec: 600 })], NOW);
    expect(w).toHaveLength(7);
    expect(w[6]).toMatchObject({ label: "오늘", minutes: 25, isToday: true });
    expect(w[4].minutes).toBe(10);
  });
});
