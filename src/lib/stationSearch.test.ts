import { describe, expect, it } from "vitest";
import { initials, searchStations } from "./stationSearch";

const names = (q: string) => searchStations(q).map((h) => h.nameKo);

describe("역 검색", () => {
  it("국문 부분 일치, 정확히 같은 이름이 먼저", () => {
    expect(names("자양")[0]).toBe("자양");
    expect(names("잠실")).toEqual(expect.arrayContaining(["잠실", "잠실나루", "잠실새내"]));
    expect(names("잠실")[0]).toBe("잠실");
    expect(names("동작역")[0]).toBe("동작");
  });

  it("초성 검색", () => {
    expect(initials("홍대입구")).toBe("ㅎㄷㅇㄱ");
    expect(names("ㅎㄷㅇㄱ")[0]).toBe("홍대입구");
    expect(names("ㅈㅇ")).toContain("자양");
  });

  it("영문 검색 (대소문자·기호 무시)", () => {
    expect(names("jayang")[0]).toBe("자양");
    expect(names("Seoul Nat")).toContain("서울대입구");
  });

  it("환승역은 한 결과로 묶고 노선별 역을 모두 담는다", () => {
    const hit = searchStations("왕십리")[0];
    expect(hit.nameKo).toBe("왕십리");
    expect(hit.stations.map((s) => s.line).sort()).toEqual(["2", "5", "GJ"].sort());
  });

  it("빈 검색어는 결과 없음, 개수 제한", () => {
    expect(searchStations("  ")).toEqual([]);
    expect(searchStations("ㅅ", 5).length).toBeLessThanOrEqual(5);
  });
});
