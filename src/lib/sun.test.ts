import { describe, expect, it } from "vitest";
import { sunTimesSeoul } from "./sun";

const kst = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3600e3);
  return k.getUTCHours() * 60 + k.getUTCMinutes();
};

describe("서울 일출·일몰", () => {
  // 알려진 서울 일출·일몰 시각 근처 (대략, ±4분)
  it.each([
    ["2026-06-21T03:00:00Z", 5 * 60 + 11, 19 * 60 + 57],
    ["2026-12-21T03:00:00Z", 7 * 60 + 43, 17 * 60 + 17],
    ["2026-10-15T03:00:00Z", 6 * 60 + 39, 17 * 60 + 57],
    ["2026-03-20T03:00:00Z", 6 * 60 + 35, 18 * 60 + 44],
  ])("%s", (iso, rise, set) => {
    const { sunrise, sunset } = sunTimesSeoul(new Date(iso));
    expect(Math.abs(kst(sunrise) - rise)).toBeLessThanOrEqual(4);
    expect(Math.abs(kst(sunset) - set)).toBeLessThanOrEqual(4);
  });
});
