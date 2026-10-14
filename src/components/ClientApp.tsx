"use client";

import { useEffect, useState } from "react";
import type { TimeOfDay } from "@/render/palette";
import { DEMO_ROUTE } from "@/lib/recommend";
import { useAppStore } from "@/store/useAppStore";
import CompleteScreen from "./CompleteScreen";
import RideScreen, { type RideDebug } from "./RideScreen";
import SetupScreen from "./SetupScreen";

/**
 * 화면 전환: 진행 중 세션 → 시뮬레이션 / 방금 완료 → 승차권 / 그 외 → 출발 설정
 *
 * 개발·검증용 URL 파라미터
 *   ?autostart=demo        체험 운행 즉시 시작
 *   ?seek=40               시작 시점을 40초 앞으로 (스크린샷 검증용)
 *   ?tod=day|sunset|night  시간대 고정
 *   ?debug=1               FPS·시뮬레이션 상태 표시
 */
export default function ClientApp() {
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState<RideDebug>({ enabled: false, tod: null });
  const active = useAppStore((s) => s.activeSession);
  const lastRecordId = useAppStore((s) => s.lastRecordId);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tod = p.get("tod");
    setDebug({
      enabled: p.get("debug") === "1",
      tod: tod === "day" || tod === "sunset" || tod === "night" ? (tod as TimeOfDay) : null,
    });
    if (p.get("autostart") === "demo") {
      useAppStore.getState().startSession({
        mode: "demo",
        stationIds: DEMO_ROUTE.stationIds,
        totalSec: DEMO_ROUTE.totalSec,
        task: "",
        seekSec: Number(p.get("seek") ?? 0) || 0,
      });
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  if (active) return <RideScreen key={active.id} session={active} debug={debug} />;
  if (lastRecordId) return <CompleteScreen recordId={lastRecordId} />;
  return <SetupScreen />;
}
