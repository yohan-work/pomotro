"use client";

import { useMemo, useState } from "react";
import { LINE_BY_ID, type LineId } from "@/data/lines";
import { useT } from "@/i18n";
import { kstWeek, weekStartDay, weekSummary } from "@/lib/goals";
import { useAppStore, type RideRecord } from "@/store/useAppStore";
import { IconDownload } from "./Icons";
import { LineBadge } from "./LineBadge";
import { recapBlob } from "./recapCard";
import styles from "./WeeklyRecap.module.css";

/** 주간 회고 — 이번 주 / 지난주 요약과 회고 카드 저장·공유 */
export function WeeklyRecap({ records }: { records: RideRecord[] }) {
  const { t, lang } = useT();
  const goal = useAppStore((s) => s.dailyGoal);
  const now = kstWeek(Date.now());
  const [week, setWeek] = useState(now);
  const s = useMemo(() => weekSummary(records, week, goal), [records, week, goal]);
  const [msg, setMsg] = useState("");
  const days = t("recap.days").split(",");
  const max = Math.max(1, ...s.perDay);

  const save = async () => {
    const blob = await recapBlob(s, lang);
    if (!blob) return;
    const file = new File([blob], `metro-week-${weekStartDay(week)}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t("recap.title") });
        setMsg(t("done.shared"));
        return;
      } catch {
        /* 취소하면 내려받기 */
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setMsg(t("done.saved"));
  };

  return (
    <section className={styles.recap} aria-label={t("recap.title")}>
      <div className={styles.head}>
        <h2>{t("recap.title")}</h2>
        <div className={styles.toggle} role="radiogroup" aria-label={t("recap.title")}>
          {[now, now - 1].map((w) => (
            <button key={w} role="radio" aria-checked={week === w} className={week === w ? styles.on : ""} onClick={() => setWeek(w)}>
              {w === now ? t("recap.thisWeek") : t("recap.lastWeek")}
            </button>
          ))}
        </div>
      </div>
      {s.rides === 0 && s.minutes === 0 ? (
        <p className={styles.empty}>{t("recap.empty")}</p>
      ) : (
        <>
          <dl className={styles.grid}>
            <div>
              <dt>{t("recap.rides")}</dt>
              <dd>{s.rides}</dd>
            </div>
            <div>
              <dt>{t("recap.minutes")}</dt>
              <dd>{t("common.min", { n: s.minutes })}</dd>
            </div>
            <div>
              <dt>{t("recap.km")}</dt>
              <dd>{s.km.toFixed(1)}km</dd>
            </div>
            <div>
              <dt>{t("recap.newStations")}</dt>
              <dd>{s.newStations}</dd>
            </div>
            {goal > 0 && (
              <div>
                <dt>{t("recap.goalDays")}</dt>
                <dd>
                  {s.goalDays}/{7}
                </dd>
              </div>
            )}
          </dl>
          <div className={styles.bars} role="img" aria-label={s.perDay.map((m, k) => `${days[k]} ${m}`).join(", ")}>
            {s.perDay.map((m, k) => (
              <span key={k}>
                <i style={{ height: `${(m / max) * 100}%` }} />
                <small>{days[k]}</small>
              </span>
            ))}
          </div>
          <div className={styles.foot}>
            <span className={styles.lines} aria-label={t("recap.lines")}>
              {s.lines.map((id) => LINE_BY_ID[id as LineId] && <LineBadge key={id} line={LINE_BY_ID[id as LineId]} showVariant={false} />)}
            </span>
            {s.bestDay && <small>{t("recap.best", { day: days[s.bestDay.day - weekStartDay(week)], m: s.bestDay.minutes })}</small>}
          </div>
          <button className={styles.save} onClick={save}>
            <IconDownload width={16} height={16} /> {t("recap.save")}
          </button>
          {msg && <p className={styles.msg}>{msg}</p>}
        </>
      )}
    </section>
  );
}
