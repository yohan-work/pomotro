"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAudio, unlockAudio } from "@/audio/instance";
import { LINES, LINE_BY_ID, findRoute, getStation, type LineId, type Station } from "@/data/lines";
import { notifyStatus, requestNotifyPermission, type NotifyStatus } from "@/lib/background";
import { DEMO_ROUTE, describeRoute, recommendRoutes } from "@/lib/recommend";
import { useT, type StringKey } from "@/i18n";
import { LINE2_META } from "@/data/lines";
import { Renderer } from "@/render/Renderer";
import { timeOfDayKST } from "@/render/palette";
import { buildJourney, minJourneySec } from "@/sim/journey";
import { todayFocusSec, useAppStore } from "@/store/useAppStore";
import { IconArrow, IconClose, IconSettings, IconTrain, Mascot } from "./Icons";
import { PomodoroSettings, SoundSettings, ViewSettings } from "./Panels";
import { useConditions } from "@/lib/useConditions";
import { rideParams, track } from "@/lib/analytics";
import LineMap from "./LineMap";
import { LineBadge } from "./LineBadge";
import { StationSearch } from "./StationSearch";
import { TripPanel } from "./TripPanel";
import { nextLeg, tripDone, tripSummary } from "@/lib/trips";
import styles from "./SetupScreen.module.css";

const PRESETS = [15, 25, 40, 60];

/**
 * 배경: 선택한 노선의 대표 장면 (실제 렌더러 재사용)
 * 한강 철교 → 하천 → 고가 시가지 → 출발역 승강장 순으로 가장 인상적인 구간을 고른다.
 */
function ScenePreview({ stationIds }: { stationIds: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tod = useAppStore((s) => s.timeOfDay);
  const { season, weather, springPhase } = useConditions();
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
        springPhase,
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
  }, [key, tod, season, weather, springPhase]);
  return <canvas ref={ref} className={styles.preview} aria-hidden />;
}

export default function SetupScreen() {
  const { t, name, lang, lineName } = useT();
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
  const trip = useAppStore((s) => s.trip);
  const [tab, setTab] = useState<"recommend" | "pick" | "trip">(() => (useAppStore.getState().trip && !useAppStore.getState().trip!.doneAt ? "trip" : "recommend"));
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
  /** 처음 온 사람: 추천만 (직접 고르기·장거리는 첫 승차 뒤) */
  const firstVisit = records.length === 0 && !trip;

  const picked = useMemo(() => {
    if (!pickFrom || !pickTo) return null;
    const route = findRoute(pickFrom, pickTo);
    if (!route) return null;
    const ids = route.map((st) => st.id);
    return { ...describeRoute(ids), minSec: minJourneySec(ids) };
  }, [pickFrom, pickTo]);
  const tripLeg = useMemo(() => (trip && !trip.doneAt ? nextLeg(trip.id, trip.progress, focusSec) : null), [trip, focusSec]);
  const tripRoute = useMemo(() => (tripLeg ? { ...describeRoute(tripLeg.stationIds), minSec: minJourneySec(tripLeg.stationIds) } : null), [tripLeg]);
  const tooShort = (tab === "pick" && picked !== null && focusSec < picked.minSec) || (tab === "trip" && tripRoute !== null && focusSec < tripRoute.minSec);
  const route = tab === "pick" ? picked : tab === "trip" ? tripRoute : routes[selected];

  /** 검색으로 고른 역: 출발역이 있으면 도착역(다른 노선이면 환승 경로), 없으면 출발역 */
  const onSearchPick = (st: Station) => {
    setPickLine(st.line);
    if (pickFrom && !pickTo && getStation(pickFrom).nameKo !== st.nameKo) {
      setPickTo(st.id);
      return;
    }
    setPickFrom(st.id);
    setPickTo(null);
  };

  const onPick = (st: Station) => {
    if (!pickFrom || pickTo) {
      setPickFrom(st.id);
      setPickTo(null);
    } else if (st.id === pickFrom) setPickFrom(null);
    // 같은 역의 다른 노선을 누르면 출발 노선만 바꾼다
    else if (st.nameKo === getStation(pickFrom).nameKo) setPickFrom(st.id);
    else setPickTo(st.id);
  };

  const depart = () => {
    if (!route || tooShort) return;
    unlockAudio();
    if (notify) void requestNotifyPermission().then(() => setNStatus(notifyStatus()));
    track("ride_start", { mode: "focus", source: tab, ...rideParams(route.stationIds, focusSec) });
    startSession({
      mode: "focus",
      stationIds: route.stationIds,
      totalSec: focusSec,
      task: task.trim(),
      ...(tab === "trip" && trip && tripLeg ? { trip: { id: trip.id, to: tripLeg.to } } : {}),
    });
  };

  const demo = () => {
    unlockAudio();
    track("ride_start", { mode: "demo", ...rideParams(DEMO_ROUTE.stationIds, DEMO_ROUTE.totalSec) });
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

        {/* 이어 가기: 진행 중인 장거리 여행이 먼저, 아니면 지난 도착역에서 */}
        {trip && !trip.doneAt && tripLeg && (
          <div className={styles.continueCard}>
            <span className={styles.continueText}>
              <small>{t("setup.tripOngoing", { n: tripDone(trip.id, trip.progress), total: tripSummary(trip.id).stations })}</small>
              <b>{t(`trip.${trip.id}` as StringKey)}</b>
              <span>
                {t("trip.next")} {name(getStation(tripLeg.stationIds[0]))} → {name(getStation(tripLeg.stationIds.at(-1)!))}
              </span>
            </span>
            <button className={tab === "trip" ? styles.continueOn : styles.continueBtn} onClick={() => setTab("trip")} aria-pressed={tab === "trip"}>
              {tab === "trip" ? t("setup.tripSelected") : t("setup.tripContinue")}
            </button>
          </div>
        )}
        {nextOriginId && tab !== "trip" && (
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
        {route && (
          <p className={styles.routeSummary} aria-live="polite">
            <span className={styles.summaryDot} style={{ background: LINE_BY_ID[route.from.line].color }} />
            <b>
              {name(route.from)} → {name(route.to)}
            </b>
            <span>
              {" "}
              · {t(route.estimated ? "common.minApproxEst" : "common.minApprox", { n: Math.round(route.estSec / 60) })}
            </span>
          </p>
        )}
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
        </div>
        <div className={styles.extras}>
        {firstVisit ? (
          <button className={styles.demo} onClick={demo}>
            {t("setup.demo")}
          </button>
        ) : (
          <button className={styles.demoLink} onClick={demo}>
            {t("setup.demoShort")}
          </button>
        )}

        <footer className={styles.foot}>
          {today > 0 && <span>{t("setup.todayRode", { n: Math.round(today / 60) })} </span>}
          <details className={styles.sources}>
            <summary>{t("setup.sources")}</summary>
            <span>{t("setup.dataNotice", { date: LINE2_META.source.updated })}</span> <span>{t("setup.dataNoticeGJ")}</span> <span>{t("setup.dataNoticeMore")}</span>
          </details>
        </footer>
        </div>
        </div>
        <div className={styles.colRoute}>
        <div className={`${styles.field} ${styles.routeBlock}`}>
          {!firstVisit && (
          <div className={styles.tabs} role="tablist" aria-label={t("setup.routeTabs")}>
            <button role="tab" aria-selected={tab === "recommend"} className={tab === "recommend" ? styles.tabOn : styles.tab} onClick={() => setTab("recommend")}>
              {t("setup.recommended")}
            </button>
            <button role="tab" aria-selected={tab === "pick"} className={tab === "pick" ? styles.tabOn : styles.tab} onClick={() => setTab("pick")}>
              {t("setup.pick")}
            </button>
            <button role="tab" aria-selected={tab === "trip"} className={tab === "trip" ? styles.tabOn : styles.tab} onClick={() => setTab("trip")}>
              {t("setup.trip")}
            </button>
          </div>
          )}
          {tab === "trip" ? (
            <TripPanel leg={tripLeg} focusMin={focusMinutes} />
          ) : tab === "recommend" ? (
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
                        {LINE_BY_ID[r.from.line].badge[lang]}
                      </span>
                      <b>
                        {name(r.from)} → {name(r.to)}
                      </b>
                      <span className={styles.est}>{t(r.estimated ? "common.minApproxEst" : "common.minApprox", { n: Math.round(r.estSec / 60) })}</span>
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
              <StationSearch onPick={onSearchPick} />
              <div className={styles.lineChips} role="radiogroup" aria-label={t("setup.line")}>
                {LINES.map((ln) => ln.id).map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={pickLine === l}
                    aria-label={lineName(LINE_BY_ID[l])}
                    title={lineName(LINE_BY_ID[l])}
                    className={pickLine === l ? styles.lineChipOn : styles.lineChip}
                    style={pickLine === l ? { borderColor: LINE_BY_ID[l].color, boxShadow: `inset 0 0 0 1px ${LINE_BY_ID[l].color}` } : undefined}
                    onClick={() => {
                      // 출발역만 고른 상태면 그대로 두고(다른 노선의 역을 도착역으로 → 환승 경로),
                      // 경로를 다 고른 상태면 새로 고른다
                      setPickLine(l);
                      if (pickTo) {
                        setPickFrom(null);
                        setPickTo(null);
                      }
                    }}
                  >
                    <LineBadge line={LINE_BY_ID[l]} />
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
                    · {t("common.stopsKm", { n: picked.stops, km: picked.distanceKm })}
                    {picked.transfers > 0 && <> · {t("common.transfers", { n: picked.transfers })}</>} · {t(picked.estimated ? "common.minApproxEst" : "common.minApprox", { n: Math.round(picked.estSec / 60) })}
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
