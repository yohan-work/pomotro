import { describe, expect, it } from "vitest";
import { countMembers, memberOf, parseBeat } from "./presenceKey";

describe("지금 타는 사람", () => {
  it("신호 검사: 익명 id(16자리 16진수)·알려진 노선·방 형식만", () => {
    expect(parseBeat({ id: "0123456789abcdef", line: "2" })).toEqual({ id: "0123456789abcdef", line: "2" });
    expect(parseBeat({ id: "0123456789abcdef", line: "5M", room: "abcd1234" })).toEqual({ id: "0123456789abcdef", line: "5M", room: "abcd1234" });
    expect(parseBeat({ id: "short", line: "2" })).toBeNull();
    expect(parseBeat({ id: "0123456789abcdef", line: "99" })).toBeNull();
    expect(parseBeat({ id: "0123456789abcdef", line: "2", room: "BAD ROOM" })).toBeNull();
    expect(parseBeat({ id: "0123456789abcdef", line: "2", name: "홍길동" })).toEqual({ id: "0123456789abcdef", line: "2" });
  });

  it("집계: 같은 사람은 한 번, 지선은 본선과 합치고, 방 인원", () => {
    const m = [
      memberOf({ id: "a".repeat(16), line: "2", room: "room0001" }),
      memberOf({ id: "b".repeat(16), line: "2", room: "room0001" }),
      memberOf({ id: "c".repeat(16), line: "5M" }),
      memberOf({ id: "c".repeat(16), line: "5" }), // 환승 직후 두 노선에 남은 같은 사람
      memberOf({ id: "d".repeat(16), line: "GJ" }),
    ];
    expect(countMembers(m, "room0001")).toEqual({ available: true, total: 4, lines: { "2": 2, "5": 1, GJ: 1 }, room: 2 });
    // 방에 들어가기 전 신호가 먼저 있어도 방 인원에 센다
    const before = [memberOf({ id: "e".repeat(16), line: "GJ" }), memberOf({ id: "e".repeat(16), line: "GJ", room: "room0002" })];
    expect(countMembers(before, "room0002").room).toBe(1);
  });
});
