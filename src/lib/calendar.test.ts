import { describe, expect, it } from "vitest";
import { christmasSeason, specialDay, springPhase } from "./calendar";

const at = (iso: string) => new Date(iso);

describe("서울 달력", () => {
  it("봄 단계 (한국 시간)", () => {
    expect(springPhase(at("2026-03-10T03:00:00Z"))).toBe("early");
    expect(springPhase(at("2026-04-05T03:00:00Z"))).toBe("bloom");
    expect(springPhase(at("2026-04-20T03:00:00Z"))).toBe("late");
    // 3월 27일 23시(UTC) = 3월 28일 KST
    expect(springPhase(at("2026-03-27T16:00:00Z"))).toBe("bloom");
  });
  it("인사하는 날과 크리스마스 장식", () => {
    expect(specialDay(at("2026-12-24T12:00:00Z"))).toBe("christmas");
    expect(specialDay(at("2026-12-31T16:00:00Z"))).toBe("newyear");
    expect(specialDay(at("2026-10-09T03:00:00Z"))).toBe("hangul");
    expect(specialDay(at("2026-10-15T03:00:00Z"))).toBeNull();
    expect(christmasSeason(at("2026-12-10T03:00:00Z"))).toBe(true);
    expect(christmasSeason(at("2026-12-27T03:00:00Z"))).toBe(false);
  });
});
