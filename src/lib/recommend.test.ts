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

  it("fills a 90-minute session (Line 2 almost a full loop, or a long Gyeongui–Jungang ride)", () => {
    const routes = recommendRoutes(90 * 60);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) expect(Math.abs(r.estSec - 90 * 60) / (90 * 60)).toBeLessThan(0.1);
    expect(routes.some((r) => r.from.line === "2" && r.stops >= 40)).toBe(true);
  });

  it("marks Gyeongui–Jungang run times as estimated and only shows the riverside keyword on the river side", () => {
    const west = describeRoute(["gj-hannam", "gj-seobinggo"]);
    const east = describeRoute(["gj-seobinggo", "gj-hannam"]);
    expect(west.estimated).toBe(true);
    expect(west.keywords).toContain("kw.riverside");
    expect(east.keywords).not.toContain("kw.riverside");
  });

  it("keeps every suggestion on the chosen origin when continuing a ride", () => {
    const routes = recommendRoutes(25 * 60, 3, "hapjeong");
    expect(routes.length).toBe(3);
    expect(routes.every((r) => r.from.id === "hapjeong")).toBe(true);
  });

  it("describes a picked route with official distance", () => {
    const r = describeRoute(["dangsan", "hapjeong"]);
    expect(r.distanceKm).toBe(2);
    expect(r.keywords).toContain("kw.dangsan");
  });
});
