"use client";

import { useEffect, useState } from "react";
import { timeOfDayKST, type TimeOfDay } from "@/render/palette";
import { stationsBetween } from "@/data/lines";
import { DEMO_ROUTE } from "@/lib/recommend";
import { minJourneySec } from "@/sim/journey";
import { EVENT_KINDS } from "@/sim/rideEvents";
import { tr, useLang } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import CompleteScreen from "./CompleteScreen";
import RecordsScreen from "./RecordsScreen";
import RideScreen, { type RideDebug } from "./RideScreen";
import SetupScreen from "./SetupScreen";

/**
 * 화면 전환: 진행 중 세션 → 시뮬레이션 / 방금 완료 → 승차권 / 그 외 → 출발 설정
 *
 * 개발·검증용 URL 파라미터
 *   ?autostart=demo        체험 운행 즉시 시작
 *   ?autostart=route&route=gangbyeon,jamsillaru&total=150[&mode=focus]   임의 구간 즉시 시작 (내선순환 순서)
 *   ?seek=40               시작 시점을 40초 앞으로 (스크린샷 검증용)
 *   ?tod=day|sunset|night  시간대 고정
 *   ?debug=1               FPS·시뮬레이션 상태 표시
 *   ?still=45              시뮬레이션·애니메이션 시간을 45초에 고정 (시각 비교 테스트용)
 *   ?event=danso           깜짝 이벤트 하나를 강제 (URL 자동 시작 세션은 기본적으로 깜짝 이벤트 없음)
 */
export default function ClientApp() {
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState<RideDebug>({ enabled: false, tod: null });
  const active = useAppStore((s) => s.activeSession);
  const lastRecordId = useAppStore((s) => s.lastRecordId);
  const view = useAppStore((s) => s.view);
  const todPref = useAppStore((s) => s.timeOfDay);
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    if (!useAppStore.getState().activeSession) document.title = tr(lang, "app.title");
  }, [lang]);

  // 밤(한국 시간 또는 직접 고른 밤 풍경)이거나 시스템이 다크 모드면 화면 전체를 어둡게
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const tod = debug.tod ?? (todPref === "auto" ? timeOfDayKST() : todPref);
      document.documentElement.dataset.theme = mq.matches || tod === "night" ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    const id = setInterval(apply, 60_000);
    return () => {
      mq.removeEventListener("change", apply);
      clearInterval(id);
    };
  }, [todPref, debug.tod]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tod = p.get("tod");
    setDebug({
      enabled: p.get("debug") === "1",
      tod: tod === "day" || tod === "sunset" || tod === "night" ? (tod as TimeOfDay) : null,
      still: p.get("still") !== null ? Number(p.get("still")) || 0 : undefined,
      event: EVENT_KINDS.find((k) => k === p.get("event")) ?? null,
      scripted: p.get("autostart") !== null,
    });
    const routeParam = p.get("route");
    if (p.get("autostart") === "route" && routeParam) {
      const [from, to] = routeParam.split(",");
      const ids = stationsBetween(from, to).map((st) => st.id);
      const total = Math.max(minJourneySec(ids), Number(p.get("total") ?? 0) || 0);
      const mode = p.get("mode") === "focus" ? "focus" : "demo";
      const st = useAppStore.getState();
      st.startSession({ mode, stationIds: ids, totalSec: total, task: mode === "focus" ? st.task.trim() : "", seekSec: Number(p.get("seek") ?? 0) || 0 });
    } else if (p.get("autostart") === "demo") {
      useAppStore.getState().startSession({
        mode: "demo",
        stationIds: DEMO_ROUTE.stationIds,
        totalSec: DEMO_ROUTE.totalSec,
        task: "",
        seekSec: Number(p.get("seek") ?? 0) || 0,
      });
    }
    setReady(true);
    // 프로덕션에서만 서비스 워커 등록 (개발 중 HMR 캐시 꼬임 방지)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!ready) return null;
  if (active) return <RideScreen key={active.id} session={active} debug={debug} />;
  if (lastRecordId) return <CompleteScreen recordId={lastRecordId} />;
  if (view === "records") return <RecordsScreen />;
  return <SetupScreen />;
}
