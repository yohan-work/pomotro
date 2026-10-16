import { describe, expect, it } from "vitest";
import { findRoute, stationsBetween } from "@/data/lines";
import type { RideRecord } from "@/store/useAppStore";
import { badges, bridgesCrossed, lineProgress, newlyEarned } from "./badges";

const NOW = Date.UTC(2026, 9, 15, 3);
let n = 0;
const ride = (ids: string[], extra: Partial<RideRecord> = {}): RideRecord => ({
  id: `r${n++}`,
  mode: "focus",
  fromId: ids[0],
  toId: ids[ids.length - 1],
  stationCount: ids.length - 1,
  focusSec: 1500,
  completedAt: NOW - 3600_000,
  task: "",
  partial: false,
  distanceKm: 5,
  ...(new Set(ids.map((id) => id.split("-")[0])).size > 1 ? { stationIds: ids } : {}),
  ...extra,
});
const earned = (recs: RideRecord[]) => badges(recs, NOW).filter((b) => b.earned).map((b) => b.id);

describe("배지·노선 진행", () => {
  it("첫 승차와 한강 다리", () => {
    const recs = [ride(["dangsan", "hapjeong"])];
    expect(earned(recs)).toEqual(expect.arrayContaining(["first-ride", "han-river"]));
    expect([...bridgesCrossed(recs)]).toEqual(["hangang-yanghwa"]);
    expect(earned(recs)).not.toContain("five-bridges");
  });

  it("다리 다섯을 모두 건너면 five-bridges, 반대 방향도 센다", () => {
    const recs = [
      ride(["hapjeong", "dangsan"].reverse()),
      ride(["gangbyeon", "jamsillaru"]),
      ride(["l3-apgujeong", "l3-oksu"]),
      ride(["l4-dongjak", "l4-ichon"]),
      ride(["l7-jayang", "l7-cheongdam"]),
    ];
    expect(bridgesCrossed(recs).size).toBe(5);
    expect(earned(recs)).toContain("five-bridges");
  });

  it("중도 하차는 진행에 넣지 않는다", () => {
    expect(earned([ride(["dangsan", "hapjeong"], { partial: true })])).not.toContain("han-river");
  });

  it("첫 환승과 새로 얻은 배지", () => {
    const first = ride(stationsBetween("dangsan", "hapjeong").map((s) => s.id));
    const xfer = ride(findRoute("l4-ichon", "dangsan")!.map((s) => s.id));
    const recs = [first, xfer];
    expect(earned(recs)).toContain("first-transfer");
    expect(newlyEarned(recs, xfer.id, NOW)).toEqual(expect.arrayContaining(["first-transfer"]));
    expect(newlyEarned(recs, xfer.id, NOW)).not.toContain("first-ride");
  });

  it("하루 목표: 같은 날 목표만큼 끝까지 달리면 (목표 0 이면 없음)", () => {
    const day = (k: number) => ride(["dangsan", "hapjeong"], { completedAt: NOW - 3600e3 * k });
    const recs = [day(1), day(2), day(3)];
    expect(badges(recs, NOW, 3).find((x) => x.id === "goal-day")!.earned).toBe(true);
    expect(badges(recs, NOW, 4).find((x) => x.id === "goal-day")!.earned).toBe(false);
    expect(badges(recs, NOW, 0).find((x) => x.id === "goal-day")!.earned).toBe(false);
  });

  it("호선별 진행: 지선·순환은 묶고 같은 이름은 한 역", () => {
    const p = lineProgress([ride(stationsBetween("l5m-gangdong", "l5m-macheon").map((s) => s.id))]);
    const five = p.find((x) => x.id === "5")!;
    expect(five.total).toBe(49 + 8 - 1);
    expect(five.visited).toBe(8);
    expect(p.find((x) => x.id === "2")!.total).toBe(43);
  });
});
