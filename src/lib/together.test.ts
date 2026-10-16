import { describe, expect, it } from "vitest";
import { findRoute } from "@/data/lines";
import { decodeRide, encodeRide, roomOf } from "./together";

describe("함께 타기 링크", () => {
  const ids = findRoute("l4-ichon", "dangsan")!.map((s) => s.id);
  const ride = { stationIds: ids, startMs: 1792040000000, totalSec: 2700 };

  it("코드로 왕복 (환승 경로 포함)", () => {
    expect(decodeRide(encodeRide(ride))).toEqual(ride);
  });

  it("방 이름은 코드에서 결정론적, 형식 고정", () => {
    const code = encodeRide(ride);
    expect(roomOf(code)).toBe(roomOf(code));
    expect(roomOf(code)).toMatch(/^[a-z0-9]{12}$/);
    expect(roomOf(encodeRide({ ...ride, startMs: ride.startMs + 1000 }))).not.toBe(roomOf(code));
  });

  it("이어지지 않는 경로·틀린 형식은 거절", () => {
    expect(decodeRide(encodeRide({ ...ride, stationIds: ["dangsan", "gangnam"] }))).toBeNull();
    expect(decodeRide("garbage")).toBeNull();
    expect(decodeRide(encodeRide({ ...ride, totalSec: 10 }))).toBeNull();
  });
});
