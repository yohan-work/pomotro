"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAudio, unlockAudio } from "@/audio/instance";
import { LINE_BY_ID, getStation, stationsBetween, type LineId, type Station } from "@/data/lines";
import { notifyStatus, requestNotifyPermission, type NotifyStatus } from "@/lib/background";
import { DATA_NOTICE, DEMO_ROUTE, describeRoute, formatMin, recommendRoutes } from "@/lib/recommend";
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
            <small>서울을 달리는 뽀모도로</small>
          </span>
          <button className={styles.myMap} onClick={() => useAppStore.getState().setView("records")}>
            나의 노선도
          </button>
          <button className={styles.iconBtn} onClick={() => setShowSettings(true)} aria-label="설정">
            <IconSettings width={18} height={18} />
          </button>
        </div>

        <h1 className={styles.title}>
          오늘은
          <br />
          어디로 떠날까요?
        </h1>
        <p className={styles.sub}>집중하는 동안, 서울의 한 구간을 함께 달려요.</p>

        <div className={styles.field}>
          <span className={styles.label}>집중 시간</span>
          <div className={styles.chips} role="radiogroup" aria-label="집중 시간">
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
                {m}분
              </button>
            ))}
            <button className={custom ? styles.chipOn : styles.chip} onClick={() => setCustom(true)} role="radio" aria-checked={custom}>
              직접 입력
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
              분 (5–120)
            </label>
          )}
        </div>

        {focusMinutes > 60 && (
          <p className={styles.longHint} role="note">
            긴 집중은 25분씩 나눠 타고 도착역에서 쉬어가길 추천해요. 2호선 한 바퀴는 약 85분, 3호선 끝에서 끝은 약 80분이라, 그보다 길면 터널 구간이 길게 늘어나요.
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>
            오늘의 할 일 <em>(선택)</em>
          </span>
          <input
            className={styles.input}
            placeholder="예: 사이드 프로젝트 개발하기"
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
              {breakJustEnded ? <b>휴식 끝! </b> : null}
              <b>{getStation(nextOriginId).nameKo}</b>역에서 이어 타기
            </span>
          </label>
        )}

        <div className={styles.actionsBlock}>
        <button className={styles.depart} onClick={depart} disabled={!route || tooShort}>
          출발하기 <IconArrow width={18} height={18} />
        </button>
        <label className={styles.notify}>
          <input type="checkbox" checked={notify && nStatus !== "denied"} disabled={nStatus === "denied"} onChange={(e) => setNotify(e.target.checked)} />
          다른 창에서 작업할 때 도착하면 알림 받기
        </label>
        {notify && nStatus !== "granted" && nStatus !== "default" && (
          <p className={styles.notifyHint} role="note">
            {nStatus === "denied"
              ? "브라우저에서 이 사이트 알림이 차단돼 있어요. 주소창의 사이트 설정에서 허용하면 받을 수 있어요."
              : nStatus === "needs-install"
                ? "iPhone에서는 공유 → 홈 화면에 추가한 뒤 열면 알림을 받을 수 있어요. 탭 제목과 소리로도 도착을 알려드려요."
                : "이 브라우저는 알림을 지원하지 않아요. 탭 제목과 소리로 도착을 알려드려요."}
          </p>
        )}
        <button className={styles.demo} onClick={demo}>
          1분 50초 체험 운행 · 당산 → 합정 (한강 철교)
        </button>

        <footer className={styles.foot}>
          {today > 0 && <span>오늘 {Math.round(today / 60)}분 달렸어요 · </span>}
          <span>{DATA_NOTICE}</span>
        </footer>
        </div>
        </div>
        <div className={styles.colRoute}>
        <div className={`${styles.field} ${styles.routeBlock}`}>
          <div className={styles.tabs} role="tablist" aria-label="노선 고르기">
            <button role="tab" aria-selected={tab === "recommend"} className={tab === "recommend" ? styles.tabOn : styles.tab} onClick={() => setTab("recommend")}>
              추천 노선
            </button>
            <button role="tab" aria-selected={tab === "pick"} className={tab === "pick" ? styles.tabOn : styles.tab} onClick={() => setTab("pick")}>
              직접 고르기
            </button>
          </div>
          {tab === "recommend" ? (
            <div className={styles.routes}>
              {routes[selected] && (
                <div className={styles.mapPreview}>
                  <LineMap originId={routes[selected].from.id} destId={routes[selected].to.id} label="선택한 추천 노선" />
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
                        {r.from.nameKo} → {r.to.nameKo}
                      </b>
                      <span className={styles.est}>예상 약 {formatMin(r.estSec)}</span>
                    </span>
                    <span className={styles.tagline}>{r.tagline}</span>
                    <span className={styles.routeMeta}>
                      {r.stops}개 역 · {r.distanceKm}km
                      {r.keywords.map((k) => (
                        <span key={k} className={styles.kw}>
                          {k}
                        </span>
                      ))}
                    </span>
                    {i === selected && diff !== 0 && (
                      <span className={styles.diff}>
                        실제 예상 소요시간과 {Math.abs(diff)}분 차이 — 집중시간 {focusMinutes}분에 맞춰 터널·시가지 구간을 늘리거나 줄여 연출해요.
                      </span>
                    )}
                  </button>
                );
              })}
              {routes.length === 0 && <p className={styles.empty}>이 시간에 맞는 구간이 아직 없어요. 집중 시간을 늘려보세요.</p>}
            </div>
          ) : (
            <div className={styles.picker}>
              <div className={styles.lineChips} role="radiogroup" aria-label="노선">
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
                    {LINE_BY_ID[l].nameKo}
                  </button>
                ))}
              </div>
              <LineMap originId={pickFrom} destId={pickTo} onPick={onPick} activeLine={pickLine} label="출발역과 도착역을 고르세요" />
              <p className={styles.pickHint} aria-live="polite">
                {!pickFrom ? (
                  "출발역을 눌러주세요"
                ) : !picked ? (
                  <>
                    <b>{getStation(pickFrom).nameKo}</b> 출발 · 도착역을 눌러주세요{pickLine === "2" ? " (내선순환)" : ""}
                  </>
                ) : (
                  <>
                    <b>
                      {picked.from.nameKo} → {picked.to.nameKo}
                    </b>{" "}
                    · {picked.stops}개 역 · {picked.distanceKm}km · 예상 약 {formatMin(picked.estSec)}
                    {tooShort ? (
                      <span className={styles.warn}>
                        이 구간은 연출에 최소 {Math.ceil(picked.minSec / 60)}분이 필요해요. 집중 시간을 늘리거나 가까운 역을 골라주세요.
                      </span>
                    ) : (
                      Math.round((focusSec - picked.estSec) / 60) !== 0 && (
                        <span className={styles.diff}>
                          실제 예상 소요시간과 {Math.abs(Math.round((focusSec - picked.estSec) / 60))}분 차이 — 집중시간에 맞춰 연출 구간을 조정해요.
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
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="설정" onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHead}>
              <strong>설정</strong>
              <button className={styles.iconBtn} onClick={() => setShowSettings(false)} aria-label="닫기" autoFocus>
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
            ? "처음이라면 1분 50초 체험 운행으로 한강부터 건너봐요."
            : "집중하는 모든 순간이, 좋은 곳으로 데려다줄 거예요."}
        </span>
      </div>
    </main>
  );
}
