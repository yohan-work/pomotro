"use client";

import { useMemo, useState } from "react";
import { getStation, isTransferPair } from "@/data/lines";
import { useT, type StringKey } from "@/i18n";
import { TRIPS, tripDone, tripPath, tripSummary, type TripLeg } from "@/lib/trips";
import { useAppStore } from "@/store/useAppStore";
import LineMap from "./LineMap";
import styles from "./TripPanel.module.css";

/** 장거리 여행 — 코스 고르기 / 진행 중인 여행의 다음 구간 */
export function TripPanel({ leg, focusMin }: { leg: TripLeg | null; focusMin: number }) {
  const { t, name } = useT();
  const trip = useAppStore((s) => s.trip);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const done = useMemo(() => {
    if (!trip) return new Set<string>();
    const p = tripPath(trip.id).slice(0, trip.progress + 1);
    const out = new Set<string>();
    for (let k = 1; k < p.length; k++) if (!isTransferPair(p[k - 1], p[k])) out.add(`${p[k - 1].id}__${p[k].id}`);
    return out;
  }, [trip]);

  if (!trip || trip.doneAt) {
    return (
      <div className={styles.list}>
        {trip?.doneAt && (
          <p className={styles.finished} role="status">
            {t("trip.finished", { name: t(`trip.${trip.id}` as StringKey) })}
          </p>
        )}
        <p className={styles.hint}>{t("trip.hint")}</p>
        {TRIPS.map((tp) => {
          const sum = tripSummary(tp.id);
          return (
            <div key={tp.id} className={styles.preset}>
              <span className={styles.presetText}>
                <b>{t(`trip.${tp.id}` as StringKey)}</b>
                <small>{t(`trip.${tp.id}.desc` as StringKey)}</small>
                <small className={styles.meta}>
                  {t("trip.meta", { n: sum.stations, km: sum.km.toFixed(1), h: (sum.estSec / 3600).toFixed(1), times: Math.ceil(sum.estSec / (focusMin * 60)), m: focusMin })}
                </small>
              </span>
              <button className={styles.start} onClick={() => useAppStore.getState().startTrip(tp.id)}>
                {t("trip.start")}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const sum = tripSummary(trip.id);
  const doneCount = tripDone(trip.id, trip.progress);
  const pct = Math.round((doneCount / sum.stations) * 100);
  const path = tripPath(trip.id);
  return (
    <div className={styles.current}>
      <div className={styles.head}>
        <b>{t(`trip.${trip.id}` as StringKey)}</b>
        <span>{t("trip.progress", { n: doneCount, total: sum.stations, p: pct })}</span>
      </div>
      <div className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("trip.progressLabel")}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.map}>
        <LineMap visited={done} routeIds={leg?.stationIds} originId={leg?.stationIds[0]} destId={leg?.stationIds.at(-1)} label={t("trip.mapLabel")} />
      </div>
      {leg && (
        <p className={styles.next}>
          {t("trip.next")} <b>{name(getStation(leg.stationIds[0]))} → {name(getStation(leg.stationIds.at(-1)!))}</b>
          <span>
            {" "}
            · {t("trip.nextMeta", { n: tripDone(trip.id, leg.to) - doneCount, m: Math.round(leg.estSec / 60) })}
          </span>
          {leg.to === path.length - 1 && <em className={styles.last}>{t("trip.lastLeg")}</em>}
        </p>
      )}
      {confirmQuit ? (
        <p className={styles.quitRow}>
          {t("trip.quitAsk")}{" "}
          <button className={styles.link} onClick={() => useAppStore.getState().quitTrip()}>
            {t("trip.quitYes")}
          </button>{" "}
          <button className={styles.link} onClick={() => setConfirmQuit(false)}>
            {t("common.cancel")}
          </button>
        </p>
      ) : (
        <button className={styles.link} onClick={() => setConfirmQuit(true)}>
          {t("trip.quit")}
        </button>
      )}
    </div>
  );
}
