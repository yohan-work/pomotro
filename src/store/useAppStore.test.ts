import { beforeEach, describe, expect, it } from "vitest";
import { POMODORO, useAppStore } from "./useAppStore";

const st = () => useAppStore.getState();
const finishFocus = () => {
  st().startSession({ mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "" });
  st().completeSession();
};

describe("session lifecycle", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeSession: null,
      records: [],
      lastRecordId: null,
      cycleCount: 0,
      lastFocusAt: 0,
      nextOriginId: null,
      pomodoro: { shortMin: 5, longMin: 15, longEvery: 4, autoContinue: false },
    });
  });

  it("records a completed focus ride once, even if completion fires twice", () => {
    st().startSession({ mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "글쓰기" });
    const session = st().activeSession!;
    st().completeSession();
    // 새로고침 직후 같은 세션이 다시 완료 판정을 받는 경우
    useAppStore.setState({ activeSession: session });
    st().completeSession();
    expect(st().records).toHaveLength(1);
    expect(st().records[0]).toMatchObject({ distanceKm: 2, task: "글쓰기", partial: false });
    expect(st().nextOriginId).toBe("hapjeong");
  });

  it("counts pomodoro cycles and gives a long break every 4th ride", () => {
    for (let i = 0; i < POMODORO.longEvery - 1; i++) finishFocus();
    st().startBreak("hapjeong");
    expect(st().activeSession).toMatchObject({ mode: "break", breakKind: "short", totalSec: POMODORO.shortBreakMin * 60 });
    st().completeSession();
    finishFocus();
    expect(st().cycleCount).toBe(POMODORO.longEvery);
    st().startBreak("hapjeong");
    expect(st().activeSession?.breakKind).toBe("long");
    expect(st().cycleCount).toBe(0);
  });

  it("records an abandoned session at its real end time and keeps it out of the current cycle", () => {
    const twoDaysAgo = Date.now() - 2 * 86400000;
    useAppStore.setState({
      activeSession: { id: "stale", mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "", startedAt: twoDaysAgo, pausedAccumMs: 0, pausedAt: null },
    });
    st().completeSession();
    const r = st().records[0];
    expect(r.completedAt).toBe(twoDaysAgo + 1500 * 1000);
    expect(r.partial).toBe(false);
    expect(st().cycleCount).toBe(0);
  });

  it("marks the task done on the record and clears the pending task", () => {
    useAppStore.setState({ task: "README 다듬기" });
    st().startSession({ mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "README 다듬기" });
    st().completeSession();
    const id = st().records[0].id;
    st().setTaskDone(id, false);
    expect(st().task).toBe("README 다듬기");
    st().setTaskDone(id, true);
    expect(st().records[0].taskDone).toBe(true);
    expect(st().task).toBe("");
  });

  it("uses the chosen break lengths and long-break interval", () => {
    st().setPomodoro({ shortMin: 3, longMin: 20, longEvery: 2 });
    finishFocus();
    st().startBreak("hapjeong");
    expect(st().activeSession?.totalSec).toBe(180);
    st().completeSession();
    finishFocus();
    st().startBreak("hapjeong");
    expect(st().activeSession).toMatchObject({ breakKind: "long", totalSec: 1200 });
  });

  it("auto-continues from the break station when enabled", () => {
    st().setPomodoro({ autoContinue: true });
    useAppStore.setState({ focusMinutes: 25 });
    st().startBreak("hapjeong");
    st().completeSession();
    const s = st().activeSession;
    expect(s?.mode).toBe("focus");
    expect(s?.stationIds[0]).toBe("hapjeong");
    expect(s?.totalSec).toBe(1500);
  });

  it("does not record breaks and resumes from the break station", () => {
    st().startBreak("gangnam");
    st().completeSession();
    expect(st().records).toHaveLength(0);
    expect(st().nextOriginId).toBe("gangnam");
    expect(st().breakJustEnded).toBe(true);
  });

  it("does not count demo or partial rides toward the cycle", () => {
    st().startSession({ mode: "demo", stationIds: ["dangsan", "hapjeong"], totalSec: 110, task: "" });
    st().completeSession();
    st().startSession({ mode: "focus", stationIds: ["dangsan", "hapjeong"], totalSec: 1500, task: "" });
    st().completeSession({ partialElapsedSec: 300, partialDistanceKm: 0.4 });
    expect(st().cycleCount).toBe(0);
    expect(st().nextOriginId).toBeNull();
    expect(st().records.map((r) => r.partial)).toEqual([false, true]);
  });
});
