"use client";

import { useEffect, useRef, useState } from "react";
import { getStation } from "@/data/line2";
import { POMODORO, nextBreakKind, todayFocusSec, useAppStore } from "@/store/useAppStore";
import { IconArrow, IconDownload } from "./Icons";
import styles from "./CompleteScreen.module.css";
import { TICKET_H, TICKET_W, drawTicket, ticketBlob } from "./ticket";

export default function CompleteScreen({ recordId }: { recordId: string }) {
  const records = useAppStore((s) => s.records);
  const cycleCount = useAppStore((s) => s.cycleCount);
  const rec = records.find((r) => r.id === recordId);
  const ref = useRef<HTMLCanvasElement>(null);
  const [shareMsg, setShareMsg] = useState("");
  const today = todayFocusSec(records);

  useEffect(() => {
    if (!rec || !ref.current) return;
    const cv = ref.current;
    const draw = () => drawTicket(cv.getContext("2d")!, rec, today);
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [rec, today]);

  if (!rec) return null;
  const to = getStation(rec.toId);
  const canBreak = rec.mode === "focus" && !rec.partial;
  const breakKind = nextBreakKind(cycleCount);
  const breakMin = breakKind === "long" ? POMODORO.longBreakMin : POMODORO.shortBreakMin;

  const save = async () => {
    const blob = await ticketBlob(rec, today);
    if (!blob) return;
    const file = new File([blob], `metro-ticket-${rec.fromId}-${rec.toId}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "METRO 집중 승차권" });
        setShareMsg("공유했어요");
        return;
      } catch {
        /* 사용자가 취소하면 다운로드로 */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    setShareMsg("이미지를 저장했어요");
  };

  return (
    <main className={styles.done}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{rec.partial ? `${to.nameKo}까지 가는 길, 여기서 쉬어가요` : "목적지에 도착했어요!"}</h1>
        <p className={styles.sub}>
          {rec.partial
            ? `${Math.max(1, Math.round(rec.focusSec / 60))}분 동안 함께 달렸어요.`
            : `${Math.round(rec.focusSec / 60) || 1}분 집중 여행이 완료되었습니다.`}
        </p>
        <canvas ref={ref} width={TICKET_W} height={TICKET_H} className={styles.ticket} role="img" aria-label="집중 완료 승차권" />
        {rec.mode === "focus" && !rec.partial && (
          <div className={styles.cycle} aria-label={`뽀모도로 ${cycleCount}회차`}>
            {Array.from({ length: POMODORO.longEvery }, (_, i) => (
              <span key={i} className={i < cycleCount ? styles.cycleOn : styles.cycleDot} />
            ))}
            <span>{breakKind === "long" ? `${POMODORO.longEvery}번 달렸어요 · 이번엔 길게 쉬어요` : `${cycleCount}번째 집중 · ${POMODORO.longEvery}번마다 긴 휴식`}</span>
          </div>
        )}
        <div className={styles.actions}>
          {canBreak ? (
            <>
              <button className={styles.primary} onClick={() => useAppStore.getState().startBreak(rec.toId)} autoFocus>
                {to.nameKo}역에서 {breakMin}분 쉬기
              </button>
              <button className={styles.ghost} onClick={() => useAppStore.getState().closeCompletion()}>
                바로 이어 타기 <IconArrow width={18} height={18} />
              </button>
            </>
          ) : (
            <button className={styles.primary} onClick={() => useAppStore.getState().closeCompletion()} autoFocus>
              다음 여행 준비하기 <IconArrow width={18} height={18} />
            </button>
          )}
          <button className={styles.ghost} onClick={save}>
            <IconDownload width={18} height={18} /> 이미지로 저장
          </button>
        </div>
        {shareMsg && <p className={styles.msg}>{shareMsg}</p>}
      </div>
    </main>
  );
}
