"use client";

import { useEffect, useRef, useState } from "react";
import { getStation } from "@/data/lines";
import { useT, type StringKey } from "@/i18n";
import { track } from "@/lib/analytics";
import { LATE_COMPLETION_MS, nextBreakKind, todayFocusSec, todaySummary, useAppStore } from "@/store/useAppStore";
import { IconArrow, IconDownload, IconPlay } from "./Icons";
import { EncounterIcon } from "./Passengers";
import { BadgeIcon } from "./BadgeIcon";
import { newlyEarned } from "@/lib/badges";
import { tripDone, tripSummary } from "@/lib/trips";
import styles from "./CompleteScreen.module.css";
import { TICKET_H, TICKET_W, drawTicket, ticketBlob } from "./ticket";
import { highlightSupported, makeHighlight } from "./highlight";

export default function CompleteScreen({ recordId }: { recordId: string }) {
  const { t, name, lang } = useT();
  const records = useAppStore((s) => s.records);
  const trip = useAppStore((s) => s.trip);
  const cycleCount = useAppStore((s) => s.cycleCount);
  const prefs = useAppStore((s) => s.pomodoro);
  const rec = records.find((r) => r.id === recordId);
  const ref = useRef<HTMLCanvasElement>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [canVideo, setCanVideo] = useState(false);
  const [videoPct, setVideoPct] = useState<number | null>(null);
  useEffect(() => setCanVideo(highlightSupported()), []);
  const today = todayFocusSec(records);
  const summary = todaySummary(records);

  useEffect(() => {
    if (!rec || !ref.current) return;
    const cv = ref.current;
    const draw = () => drawTicket(cv.getContext("2d")!, rec, today, lang);
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [rec, today, lang]);

  if (!rec) return null;
  const fresh = rec.mode === "focus" && !rec.partial ? newlyEarned(records, rec.id) : [];
  const to = getStation(rec.toId);
  const late = Date.now() - rec.completedAt > LATE_COMPLETION_MS;
  const canBreak = rec.mode === "focus" && !rec.partial && !late;
  const breakKind = nextBreakKind(cycleCount, prefs.longEvery);
  const breakMin = breakKind === "long" ? prefs.longMin : prefs.shortMin;

  /** 공유할 수 있으면 공유, 아니면 내려받기 */
  const shareOrDownload = async (file: File, title: string) => {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return "shared" as const;
      } catch {
        /* 취소하면 내려받기로 */
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "saved" as const;
  };

  const video = async () => {
    if (videoPct !== null) return;
    setShareMsg("");
    setVideoPct(0);
    try {
      const { blob, ext } = await makeHighlight(rec, lang, today, (p) => setVideoPct(Math.round(p * 100)));
      const file = new File([blob], `metro-${rec.fromId}-${rec.toId}.${ext}`, { type: blob.type });
      const how = await shareOrDownload(file, t("done.shareTitle"));
      setShareMsg(how === "shared" ? t("done.shared") : t("done.videoSaved"));
    } catch {
      setShareMsg(t("done.videoFailed"));
    } finally {
      setVideoPct(null);
    }
  };

  const save = async () => {
    const blob = await ticketBlob(rec, today, lang);
    if (!blob) return;
    const file = new File([blob], `metro-ticket-${rec.fromId}-${rec.toId}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t("done.shareTitle") });
        track("ticket_share", { method: "share" });
        setShareMsg(t("done.shared"));
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
    track("ticket_share", { method: "download" });
    setShareMsg(t("done.saved"));
  };

  return (
    <main className={styles.done}>
      <div className={styles.inner}>
        <h1 className={styles.title}>
          {rec.partial ? t("done.titlePartial", { station: name(to) }) : late ? t("done.titleLate") : t("done.title")}
        </h1>
        <p className={styles.sub}>
          {rec.partial
            ? t("done.subPartial", { n: Math.max(1, Math.round(rec.focusSec / 60)) })
            : late
              ? t("done.subLate", { when: new Date(rec.completedAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }), station: name(to) })
              : t("done.sub", { n: Math.round(rec.focusSec / 60) || 1 })}
        </p>
        <canvas ref={ref} width={TICKET_W} height={TICKET_H} className={styles.ticket} role="img" aria-label={t("done.ticketLabel")} />
        {rec.task && rec.mode !== "demo" && (
          <div className={styles.taskCheck} role="group" aria-label={t("done.taskCheck")}>
            {rec.taskDone === undefined ? (
              <>
                <span>{t("done.taskAsk", { task: rec.task })}</span>
                <button className={styles.chipYes} onClick={() => useAppStore.getState().setTaskDone(rec.id, true)}>
                  {t("done.taskYes")}
                </button>
                <button className={styles.chipNo} onClick={() => useAppStore.getState().setTaskDone(rec.id, false)}>
                  {t("done.taskNo")}
                </button>
              </>
            ) : rec.taskDone ? (
              <span>{t("done.taskDone", { task: rec.task })}</span>
            ) : (
              <span>{t("done.taskLater", { task: rec.task })}</span>
            )}
          </div>
        )}
        {rec.trip && trip && trip.id === rec.trip.id && (
          <p className={styles.today} role="status">
            {rec.trip.done
              ? <b>{t("done.tripDone", { name: t(`trip.${rec.trip.id}` as StringKey) })}</b>
              : t("done.tripProgress", {
                  name: t(`trip.${rec.trip.id}` as StringKey),
                  n: tripDone(trip.id, trip.progress),
                  total: tripSummary(trip.id).stations,
                  p: Math.round((tripDone(trip.id, trip.progress) / tripSummary(trip.id).stations) * 100),
                })}
          </p>
        )}
        {fresh.length > 0 && (
          <div className={styles.encounters}>
            <span className={styles.encLabel}>{t("done.newBadges")}</span>
            <ul>
              {fresh.map((b) => (
                <li key={b}>
                  <BadgeIcon id={b} earned size={36} />
                  <span>
                    <b>{t(`badge.${b}` as StringKey)}</b>
                    <small>{t(`badge.${b}.desc` as StringKey)}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {rec.encounters && rec.encounters.length > 0 && (
          <div className={styles.encounters}>
            <span className={styles.encLabel}>{t("complete.encounters")}</span>
            <ul>
              {rec.encounters.map((k) => (
                <li key={k}>
                  <EncounterIcon kind={k} size={36} />
                  <span>
                    <b>{t(`event.name.${k}`)}</b>
                    <small>{t(`event.desc.${k}`)}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {canBreak && (
          <div className={styles.cycle} aria-label={t("done.cycleLabel", { n: cycleCount })}>
            {Array.from({ length: prefs.longEvery }, (_, i) => (
              <span key={i} className={i < cycleCount ? styles.cycleOn : styles.cycleDot} />
            ))}
            <span>{breakKind === "long" ? t("done.cycleLong", { n: prefs.longEvery }) : t("done.cycle", { n: cycleCount, every: prefs.longEvery })}</span>
          </div>
        )}
        {rec.mode === "focus" && summary.count > 0 && (
          <p className={styles.today}>
            {t("done.today", { count: summary.count, min: Math.round(summary.sec / 60), km: summary.km.toFixed(1) })}
          </p>
        )}
        <div className={styles.actions}>
          {canBreak ? (
            <>
              <button className={styles.primary} onClick={() => useAppStore.getState().startBreak(rec.toId)} autoFocus>
                {t("done.restAt", { station: name(to), n: breakMin })}
              </button>
              <button className={styles.ghost} onClick={() => useAppStore.getState().closeCompletion()}>
                {t("done.continue")} <IconArrow width={18} height={18} />
              </button>
            </>
          ) : (
            <button className={styles.primary} onClick={() => useAppStore.getState().closeCompletion()} autoFocus>
              {t("done.next")} <IconArrow width={18} height={18} />
            </button>
          )}
          <button className={styles.ghost} onClick={save}>
            <IconDownload width={18} height={18} /> {t("common.saveImage")}
          </button>
          {canVideo && !rec.partial && (
            <button className={styles.ghost} onClick={video} disabled={videoPct !== null} aria-live="polite">
              <IconPlay width={16} height={16} /> {videoPct === null ? t("done.video") : t("done.videoMaking", { p: videoPct })}
            </button>
          )}
        </div>
        <button
          className={styles.link}
          onClick={() => {
            const st = useAppStore.getState();
            st.closeCompletion();
            st.setView("records");
          }}
        >
          {t("done.myMap")}
        </button>
        {shareMsg && <p className={styles.msg}>{shareMsg}</p>}
      </div>
    </main>
  );
}
