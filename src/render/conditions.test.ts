import { describe, expect, it } from "vitest";
import { applyConditions, fromWmo, seasonKST } from "./conditions";
import { PALETTES } from "./palette";

describe("weather & season", () => {
  it("maps WMO weather codes to scene weather", () => {
    expect(fromWmo(0)).toBe("clear");
    expect(fromWmo(3)).toBe("cloudy");
    expect(fromWmo(45)).toBe("fog");
    expect(fromWmo(63)).toBe("rain");
    expect(fromWmo(81)).toBe("rain");
    expect(fromWmo(95)).toBe("rain");
    expect(fromWmo(73)).toBe("snow");
  });

  it("picks the Korean season from KST month", () => {
    expect(seasonKST(new Date("2026-04-10T03:00:00Z"))).toBe("spring");
    expect(seasonKST(new Date("2026-07-10T03:00:00Z"))).toBe("summer");
    expect(seasonKST(new Date("2026-10-14T03:00:00Z"))).toBe("autumn");
    expect(seasonKST(new Date("2026-11-30T14:30:00Z"))).toBe("autumn");
    expect(seasonKST(new Date("2026-11-30T15:30:00Z"))).toBe("winter");
  });

  it("hides the sun when it is not clear, caches palettes, keeps base palette intact", () => {
    const a = applyConditions(PALETTES.sunset, "autumn", "rain");
    expect(a.sun.visible).toBe(false);
    expect(applyConditions(PALETTES.sunset, "autumn", "rain")).toBe(a);
    expect(applyConditions(PALETTES.sunset, "autumn", "clear").sun.visible).toBe(true);
    expect(applyConditions(PALETTES.day, "winter", "snow")).toMatchObject({ bareTrees: true, snowRoofs: true });
    expect(PALETTES.sunset.sun.visible).toBe(true);
  });
});
