import { describe, expect, it } from "vitest";
import { minJourneySec } from "../sim/journey";
import { describeRoute, recommendRoutes } from "./recommend";

describe("recommendRoutes", () => {
  for (const min of [15, 25, 40, 60]) {
    it(`suggests feasible routes close to ${min} minutes`, () => {
      const routes = recommendRoutes(min * 60);
      expect(routes.length).toBeGreaterThan(0);
      for (const r of routes) {
        expect(minJourneySec(r.stationIds)).toBeLessThanOrEqual(min * 60);
        expect(Math.abs(r.estSec - min * 60) / (min * 60)).toBeLessThan(0.3);
      }
    });
  }

  it("keeps every suggestion on the chosen origin when continuing a ride", () => {
    const routes = recommendRoutes(25 * 60, 3, "hapjeong");
    expect(routes.length).toBe(3);
    expect(routes.every((r) => r.from.id === "hapjeong")).toBe(true);
  });

  it("describes a picked route with official distance", () => {
    const r = describeRoute(["dangsan", "hapjeong"]);
    expect(r.distanceKm).toBe(2);
    expect(r.keywords).toContain("당산철교 한강");
  });
});
