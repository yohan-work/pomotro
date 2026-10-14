"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAudio, unlockAudio } from "@/audio/instance";
import { LINE_BY_ID, getStation, stationsBetween, type LineId, type Station } from "@/data/lines";
import { notifyStatus, requestNotifyPermission, type NotifyStatus } from "@/lib/background";
import { DEMO_ROUTE, describeRoute, recommendRoutes } from "@/lib/recommend";
import { useT } from "@/i18n";
import { LINE2_META } from "@/data/lines";
import { Renderer } from "@/render/Renderer";
import { timeOfDayKST } from "@/render/palette";
import { buildJourney, minJourneySec } from "@/sim/journey";
import { todayFocusSec, useAppStore } from "@/store/useAppStore";
import { IconArrow, IconClose, IconSettings, IconTrain, Mascot } from "./Icons";
import { PomodoroSettings, SoundSettings, ViewSettings } from "./Panels";
import { useConditions } from "@/lib/useConditions";
import LineMap from "./LineMap";
import styles from "./SetupScreen.module.css";

const PRESETS = [15, 25, 40, 60];

/**
 * 배경: 선택한 노선의 대표 장면 (실제 렌더러 재사용)
 * 한강 철교 → 하천 → 고가 시가지 → 출발역 승강장 순으로 가장 인상적인 구간을 고른다.
 */
function ScenePreview({ stationIds }: { stationIds: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tod = useAppStore((s) => s.timeOfDay);
  const { season, weather } = useConditions();
  const key = stationIds.join(">");
  useEffect(() => {
    const canvas = ref.current!;
    const renderer = new Renderer(canvas);
    const journey = buildJourney({ stationIds, totalSec: Math.max(minJourneySec(stationIds), 600) });
    const inRoute = journey.sections.filter((s) => s.x0 >= 0 && s.x1 <= journey.stopX[journey.stopX.length - 1]);
    const pick =
      inRoute.find((s) => s.kind === "river" && s.variant !== "stream") ??
      inRoute.find((s) => s.kind === "river") ??
      inRoute.find((s) => s.kind === "city" && s.x1 - s.x0 > 160) ??
      null;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      renderer.resize(r.width, r.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      let x = 0;
      if (pick) {
        const span = Math.max(1, pick.x1 - pick.x0 - 160);
        x = pick.x0 + 80 + (((reduced ? 0.35 : 0) * span + t * 2.2) % span);
      }
      renderer.render({
        journey,
        x,
        v: pick ? 2.2 : 0,
        a: 0,
        doorsOpen: !pick,
        time: performance.now() / 1000,
        timeOfDay: tod === "auto" ? timeOfDayKST() : tod,
        reducedMotion: true,
        season,
        weather,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // 노선이 바뀔 때만 다시 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tod, season, weather]);
  return <canvas ref={ref} className={styles.preview} aria-hidden />;
}

export default function SetupScreen() {
  const { t, name } = useT();
  const focusMinutes = useAppStore((s) => s.focusMinutes);
  const task = useAppStore((s) => s.task);
  const records = useAppStore((s) => s.records);
  const nextOriginId = useAppStore((s) => s.nextOriginId);
  const [nStatus, setNStatus] = useState<NotifyStatus>("default");
  useEffect(() => setNStatus(notifyStatus()), []);
  const breakJustEnded = useAppStore((s) => s.breakJustEnded);
  const notify = useAppStore((s) => s.notify);
  const { setFocusMinutes, setTask, startSession, setNotify } = useAppStore.getState();
  const [custom, setCustom] = useState(!PRESETS.includes(focusMinutes));
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"recommend" | "pick">("recommend");
  const [showSettings, setShowSettings] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  useEffect(() => {
    if (!showSettings) return;
    setAudioOn(getAudio().started);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowSettings(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSettings]);
  const [continueRide, setContinueRide] = useState(Boolean(nextOriginId));
  const [pickFrom, setPickFrom] = useState<string | null>(nextOriginId);
  const [pickTo, setPickTo] = useState<string | null>(null);
  const [pickLine, setPickLine] = useState<LineId>(() => (nextOriginId ? getStation(nextOriginId).line : "2"));

  const focusSec = focusMinutes * 60;
  const origin = continueRide && nextOriginId ? nextOriginId : undefined;
  const routes = useMemo(() => recommendRoutes(focusSec, 3, origin), [focusSec, origin]);
  useEffect(() => setSelected(0), [focusMinutes, origin]);
  const today = todayFocusSec(records);

  const picked = useMemo(() => {
    if (!pickFrom || !pickTo) return null;
    const ids = stationsBetween(pickFrom, pickTo).map((st) => st.id);
    return { ...describeRoute(ids), minSec: minJourneySec(ids) };
  }, [pickFrom, pickTo]);
  const tooShort = tab === "pick" && picked !== null && focusSec < picked.minSec;
  const route = tab === "pick" ? picked : routes[selected];

  const onPick = (st: Station) => {
    if (!pickFrom || pickTo) {
      setPickFrom(st.id);
      setPickTo(null);
    } else if (st.id === pickFrom) setPickFrom(null);
    else setPickTo(st.id);
  };

  const depart = () => {
    if (!route || tooShort) return;
    unlockAudio();
    if (notify) void requestNotifyPermission().then(() => setNStatus(notifyStatus()));
    startSession({ mode: "focus", stationIds: route.stationIds, totalSec: focusSec, task: task.trim() });
  };

  const demo = () => {
    unlockAudio();
    startSession({ mode: "demo", stationIds: DEMO_ROUTE.stationIds, totalSec: DEMO_ROUTE.totalSec, task: task.trim() });
  };

  return (
    <main className={styles.setup}>
      <ScenePreview stationIds={route?.stationIds ?? DEMO_ROUTE.stationIds} />
      <div className={styles.scrim} />

      <section className={styles.card}>
        <div className={styles.colMain}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <IconTrain width={18} height={18} />
          </span>
          <span>
            <b>METRO</b>
            <small>{t("app.tagline")}</small>
          </span>
          <button className={styles.myMap} onClick={() => useAppStore.getState().setView("records")}>
            {t("setup.myMap")}
          </button>
          <button className={styles.iconBtn} onClick={() => setShowSettings(true)} aria-label={t("common.settings")}>
            <IconSettings width={18} height={18} />
          </button>
        </div>

        <h1 className={styles.title}>
          {t("setup.title1")}
          <br />
          {t("setup.title2")}
        </h1>
        <p className={styles.sub}>{t("setup.sub")}</p>

        <div className={styles.field}>
          <span className={styles.label}>{t("setup.focusTime")}</span>
          <div className={styles.chips} role="radiogroup" aria-label={t("setup.focusTime")}>
            {PRESETS.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={!custom && focusMinutes === m}
                className={!custom && focusMinutes === m ? styles.chipOn : styles.chip}
                onClick={() => {
                  setCustom(false);
                  setFocusMinutes(m);
                }}
              >
                {t("common.min", { n: m })}
              </button>
            ))}
            <button className={custom ? styles.chipOn : styles.chip} onClick={() => setCustom(true)} role="radio" aria-checked={custom}>
              {t("setup.custom")}
            </button>
          </div>
          {custom && (
            <label className={styles.customRow}>
              <input
                type="number"
                min={5}
                max={120}
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(Math.max(5, Math.min(120, Math.round(+e.target.value || 5))))}
              />
              {t("setup.customUnit")}
            </label>
          )}
        </div>

        {focusMinutes > 60 && (
          <p className={styles.longHint} role="note">
            {t("setup.longHint")}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>
            {t("setup.task")} <em>{t("setup.optional")}</em>
          </span>
          <input
            className={styles.input}
            placeholder={t("setup.taskPlaceholder")}
            value={task}
            maxLength={40}
            onChange={(e) => setTask(e.target.value)}
          />
        </label>

        {nextOriginId && (
          <label className={styles.continue}>
            <input
              type="checkbox"
              checked={continueRide}
              onChange={(e) => {
                setContinueRide(e.target.checked);
                setPickFrom(e.target.checked ? nextOriginId : null);
                if (e.target.checked && nextOriginId) setPickLine(getStation(nextOriginId).line);
                setPickTo(null);
              }}
            />
            <span>
              {breakJustEnded ? <b>{t("setup.breakOver")}</b> : null}
              {t("setup.continueFrom", { station: name(getStation(nextOriginId)) })}
            </span>
          </label>
        )}

        <div className={styles.actionsBlock}>
        <button className={styles.depart} onClick={depart} disabled={!route || tooShort}>
          {t("setup.depart")} <IconArrow width={18} height={18} />
        </button>
        <label className={styles.notify}>
          <input type="checkbox" checked={notify && nStatus !== "denied"} disabled={nStatus === "denied"} onChange={(e) => setNotify(e.target.checked)} />
          {t("setup.notify")}
        </label>
        {notify && nStatus !== "granted" && nStatus !== "default" && (
          <p className={styles.notifyHint} role="note">
            {nStatus === "denied"
              ? t("setup.notifyDenied")
              : nStatus === "needs-install"
                ? t("setup.notifyInstall")
                : t("setup.notifyUnsupported")}
          </p>
        )}
        <button className={styles.demo} onClick={demo}>
          {t("setup.demo")}
        </button>

        <footer className={styles.foot}>
          {today > 0 && <span>{t("setup.todayRode", { n: Math.round(today / 60) })}</span>}
          <span>{t("setup.dataNotice", { date: LINE2_META.source.updated })}</span>
        </footer>
        </div>
        </div>
        <div className={styles.colRoute}>
        <div className={`${styles.field} ${styles.routeBlock}`}>
          <div className={styles.tabs} role="tablist" aria-label={t("setup.routeTabs")}>
            <button role="tab" aria-selected={tab === "recommend"} className={tab === "recommend" ? styles.tabOn : styles.tab} onClick={() => setTab("recommend")}>
              {t("setup.recommended")}
            </button>
            <button role="tab" aria-selected={tab === "pick"} className={tab === "pick" ? styles.tabOn : styles.tab} onClick={() => setTab("pick")}>
              {t("setup.pick")}
            </button>
          </div>
          {tab === "recommend" ? (
            <div className={styles.routes}>
              {routes[selected] && (
                <div className={styles.mapPreview}>
                  <LineMap originId={routes[selected].from.id} destId={routes[selected].to.id} label={t("setup.recMapLabel")} />
                </div>
              )}
              {routes.map((r, i) => {
                const diff = Math.round((focusSec - r.estSec) / 60);
                return (
                  <button key={r.stationIds.join(">")} className={i === selected ? styles.routeOn : styles.route} onClick={() => setSelected(i)}>
                    <span className={styles.routeTop}>
                      <span className={styles.lineDot} style={{ background: LINE_BY_ID[r.from.line].color }}>
                        {r.from.line}
                      </span>
                      <b>
                        {name(r.from)} → {name(r.to)}
                      </b>
                      <span className={styles.est}>{t("common.minApprox", { n: Math.round(r.estSec / 60) })}</span>
                    </span>
                    <span className={styles.tagline}>{t(r.tagline)}</span>
                    <span className={styles.routeMeta}>
                      {t("common.stopsKm", { n: r.stops, km: r.distanceKm })}
                      {r.keywords.map((k) => (
                        <span key={k} className={styles.kw}>
                          {t(k)}
                        </span>
                      ))}
                    </span>
                    {i === selected && diff !== 0 && (
                      <span className={styles.diff}>
                        {t("setup.diff", { d: Math.abs(diff), m: focusMinutes })}
                      </span>
                    )}
                  </button>
                );
              })}
              {routes.length === 0 && <p className={styles.empty}>{t("setup.noRoutes")}</p>}
            </div>
          ) : (
            <div className={styles.picker}>
              <div className={styles.lineChips} role="radiogroup" aria-label={t("setup.line")}>
                {(["2", "3"] as LineId[]).map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={pickLine === l}
                    className={pickLine === l ? styles.lineChipOn : styles.lineChip}
                    style={pickLine === l ? { background: LINE_BY_ID[l].color, borderColor: LINE_BY_ID[l].color } : undefined}
                    onClick={() => {
                      if (l === pickLine) return;
                      setPickLine(l);
                      setPickFrom(null);
                      setPickTo(null);
                    }}
                  >
                    {t("line.name", { n: l })}
                  </button>
                ))}
              </div>
              <LineMap originId={pickFrom} destId={pickTo} onPick={onPick} activeLine={pickLine} label={t("setup.pickMapLabel")} />
              <p className={styles.pickHint} aria-live="polite">
                {!pickFrom ? (
                  t("setup.pickOrigin")
                ) : !picked ? (
                  <>
                    {t("setup.pickDest", { station: name(getStation(pickFrom)) })}
                    {pickLine === "2" ? t("setup.innerLoop") : ""}
                  </>
                ) : (
                  <>
                    <b>
                      {name(picked.from)} → {name(picked.to)}
                    </b>{" "}
                    · {t("common.stopsKm", { n: picked.stops, km: picked.distanceKm })} · {t("common.minApprox", { n: Math.round(picked.estSec / 60) })}
                    {tooShort ? (
                      <span className={styles.warn}>
                        {t("setup.tooShort", { n: Math.ceil(picked.minSec / 60) })}
                      </span>
                    ) : (
                      Math.round((focusSec - picked.estSec) / 60) !== 0 && (
                        <span className={styles.diff}>
                          {t("setup.diffShort", { d: Math.abs(Math.round((focusSec - picked.estSec) / 60)) })}
                        </span>
                      )
                    )}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        </div>
      </section>

      {showSettings && (
        <div className={styles.dialogBack} onClick={() => setShowSettings(false)}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t("common.settings")} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHead}>
              <strong>{t("common.settings")}</strong>
              <button className={styles.iconBtn} onClick={() => setShowSettings(false)} aria-label={t("common.close")} autoFocus>
                <IconClose width={18} height={18} />
              </button>
            </div>
            <ViewSettings />
            <hr className={styles.rule} />
            <PomodoroSettings />
            <hr className={styles.rule} />
            <SoundSettings
              audioOn={audioOn}
              onEnable={() => {
                unlockAudio();
                setAudioOn(true);
              }}
            />
          </div>
        </div>
      )}

      <div className={styles.mascot} aria-hidden>
        <Mascot size={72} />
        <span className={styles.bubble}>
          {records.length === 0
            ? t("setup.mascotFirst")
            : t("setup.mascot")}
        </span>
      </div>
    </main>
  );
}
