import { describe, expect, it } from "vitest";
import { makeBackup, mergeRecords, parseBackup } from "./backup";
import type { RideRecord } from "../store/useAppStore";

const rec = (id: string, at: number): RideRecord => ({
  id, mode: "focus", fromId: "dangsan", toId: "hapjeong", stationCount: 1, focusSec: 1500, completedAt: at, task: "", partial: false, distanceKm: 2,
});

describe("backup", () => {
  it("round-trips records through an export file", () => {
    const parsed = parseBackup(makeBackup([rec("a", 1), rec("b", 2)]));
    expect(parsed.records.map((r) => r.id)).toEqual(["a", "b"]);
    expect(parsed.invalid).toBe(0);
  });

  it("drops records with unknown stations or bad fields", () => {
    const text = JSON.stringify({ app: "metro", version: 1, records: [rec("a", 1), { ...rec("b", 2), toId: "nowhere" }, { id: 3 }] });
    const parsed = parseBackup(text);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.invalid).toBe(2);
  });

  it("rejects files that are not METRO backups", () => {
    expect(() => parseBackup("not json")).toThrow();
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow();
  });

  it("merges without duplicates and keeps time order", () => {
    const { records, added } = mergeRecords([rec("a", 5)], [rec("a", 5), rec("b", 1)]);
    expect(added).toBe(1);
    expect(records.map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("keeps known encounters and drops unknown ones", () => {
    const { records } = parseBackup(
      JSON.stringify([{ id: "e", mode: "focus", fromId: "dangsan", toId: "hapjeong", stationCount: 1, focusSec: 60, completedAt: 1, encounters: ["danso", "ufo", "cat"] }]),
    );
    expect(records[0].encounters).toEqual(["danso", "cat"]);
  });
});
