"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAudio, unlockAudio } from "@/audio/instance";
import { getSegment, lineOf } from "@/data/lines";
import { Renderer } from "@/render/Renderer";
import { WEATHER_LABEL } from "@/render/conditions";
import { announce, stopAnnounce } from "@/audio/announce";
import { useConditions } from "@/lib/useConditions";
import { passingIntensity } from "@/render/scene";
import { timeOfDayKST, type TimeOfDay } from "@/render/palette";
import { elapsedSec, epochNow } from "@/sim/clock";
import { buildJourney, sampleJourney, type Journey, type JourneyEvent, type SimSample } from "@/sim/journey";
import { createTicker, notifyIfHidden } from "@/lib/background";
import { useAppStore, type ActiveSession } from "@/store/useAppStore";
import { IconExit, IconExpand, IconMute, IconPause, IconPlay, IconSettings, IconVolume, Mascot } from "./Icons";
import { SoundSettings, ViewSettings } from "./Panels";
import styles from "./RideScreen.module.css";

export interface RideDebug {
  enabled: boolean;
  tod: TimeOfDay | null;
  /** 검증용 정지 화면: 시뮬레이션·애니메이션 시간을 이 값(초)에 고정 → 같은 입력이면 항상 같은 그림 */
  still?: number;
}

interface Hud {
  sample: SimSample;
  led: string;
  paused: boolean;
}

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** 현재 상태에서 객실 LED 안내 문구 */
function ledText(j: Journey, s: SimSample, isBreak = false): string {
  if (isBreak) return `${j.stations[0].nameKo}역에서 잠시 쉬어가요  ·  Take a short break`;
  const last = j.stations.length - 1;
  if (s.phase === "BOARDING" || s.phase === "ARRIVED" || s.phase === "COMPLETED") {
    const st = j.stations[s.stationIndex];
    if (s.stationIndex === last) return `종착역 ${st.nameKo}입니다  ·  ${st.nameEn}`;
    const close = j.events.find((e) => e.type === "doorClose" && e.stationIndex === s.stationIndex);
    if (close && s.t >= close.t) return "출입문 닫습니다  ·  The doors are closing";
    if (s.phase === "ARRIVED") return `${st.nameKo}  ${st.nameEn}`;
    return `이번 열차는 ${j.stations[last].nameKo}행입니다`;
  }
  const next = j.stations[s.nextIndex];
  const approach = j.events.find((e) => e.type === "approach" && e.stationIndex === s.nextIndex);
  if (approach && s.t >= approach.t) return `이번 역은 ${next.nameKo}입니다  ·  This stop is ${next.nameEn}`;
  return `다음 역은 ${next.nameKo}입니다  ·  Next stop is ${next.nameEn}`;
}

function bridgeAt(j: Journey, x: number) {
  return j.sections.some((s) => (s.kind === "river" || s.kind === "bank") && x >= s.x0 && x <= s.x1) ? 1 : 0;
}

const STRAPS = 6;
/** 입력이 없으면 이 시간 뒤 집중 모드(HUD 숨김) */
const IDLE_MS = 5000;

export default function RideScreen({ session, debug }: { session: ActiveSession; debug: RideDebug }) {
  const journey = useMemo(
    () => buildJourney({ stationIds: session.stationIds, totalSec: session.totalSec }),
    // 세션 id 가 같으면 여정도 같다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.id],
  );
  const isBreak = session.mode === "break";
  const line = lineOf(session.stationIds[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strapRefs = useRef<Array<HTMLDivElement | null>>([]);
  const statsRef = useRef<HTMLPreElement>(null);
  const [hud, setHud] = useState<Hud>(() => {
    const s = sampleJourney(journey, elapsedSec(session));
    return { sample: s, led: ledText(journey, s, isBreak), paused: session.pausedAt !== null };
  });
  const [audioOn, setAudioOn] = useState(() => getAudio().started);
  const [panel, setPanel] = useState<"none" | "sound" | "settings" | "exit">("none");
  const [idle, setIdle] = useState(false);
  const [zen, setZen] = useState(false);
  const [ledPart, setLedPart] = useState(0);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const seenTips = useAppStore((s) => s.seenRideTips);
  const [showTips, setShowTips] = useState(false);
  // 첫 주행에서만 8초간 짧은 안내
  useEffect(() => {
    if (seenTips || debug.enabled) return;
    setShowTips(true);
    const id = setTimeout(() => {
      setShowTips(false);
      useAppStore.getState().setSeenRideTips();
    }, 8000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setCanFullscreen(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen)), []);
  const [clock, setClock] = useState(() => new Date());

  const timeOfDayPref = useAppStore((s) => s.timeOfDay);
  const reducedPref = useAppStore((s) => s.reducedMotion);
  const qualityPref = useAppStore((s) => s.quality);
  const muted = useAppStore((s) => s.muted);
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(mq.matches);
    const on = () => setSystemReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const reducedMotion = reducedPref === "on" || (reducedPref === "system" && systemReduced);
  const tod: TimeOfDay = debug.tod ?? (timeOfDayPref === "auto" ? timeOfDayKST(clock) : timeOfDayPref);

  // 렌더 루프에서 읽는 최신 설정
  const cond = useConditions();
  const announceOn = useAppStore((s) => s.announce);
  const live = useRef({ tod, reducedMotion, quality: qualityPref, season: cond.season, weather: cond.weather, announce: announceOn });
  live.current = { tod, reducedMotion, quality: qualityPref, season: cond.season, weather: cond.weather, announce: announceOn };
  useEffect(() => getAudio().setRain(cond.weather === "rain"), [cond.weather]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  /* ─────────────── 시뮬레이션 + 렌더 루프 ─────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new Renderer(canvas);
    const audio = getAudio();
    if (debug.enabled) (window as unknown as { __metroAudio: unknown }).__metroAudio = audio;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      renderer.resize(r.width, r.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let lastEventT: number | null = null;
    let lastHud = 0;
    let lastLed = "";
    let lastPaused: boolean | null = null;
    let lastPhase = "";
    let completed = false;
    const theta = new Float64Array(STRAPS);
    const omega = new Float64Array(STRAPS);
    let lastFrame = performance.now();

    const fire = (e: JourneyEvent) => {
      switch (e.type) {
        case "departChime":
          audio.departChime();
          break;
        case "doorClose":
          audio.doorClose();
          break;
        case "approach": {
          audio.arrivalChime();
          if (live.current.announce && !isBreak) {
            const st = journey.stations[e.stationIndex];
            const last = e.stationIndex === journey.stations.length - 1;
            // 차임이 끝난 뒤 읽는다
            setTimeout(
              () => announce(last ? `이번 역은 종착역인 ${st.nameKo}역입니다. 두고 내리는 물건 없이 안녕히 가십시오.` : `이번 역은 ${st.nameKo}, ${st.nameKo}역입니다.`, audio.speechVolume()),
              1300,
            );
          }
          break;
        }
        case "doorOpen":
          audio.doorOpen();
          break;
      }
    };

    const tick = (render: boolean) => {
      const st = useAppStore.getState();
      const s = st.activeSession;
      if (!s || s.id !== session.id || completed) return;
      const now = epochNow();
      const t = debug.still ?? elapsedSec(s, now);
      const paused = s.pausedAt !== null;
      const sample = sampleJourney(journey, t);

      // 시간 기반 이벤트 (새로고침 직후에는 과거 이벤트를 재생하지 않는다)
      if (lastEventT === null) lastEventT = t;
      else if (t > lastEventT) {
        for (const e of journey.events) if (e.t > lastEventT && e.t <= t && t - e.t < 2.5) fire(e);
        lastEventT = t;
      }

      const enclosed = renderer.currentDarkness;
      if (paused) audio.suspendMotion();
      else
        audio.update({
          v: sample.v,
          a: sample.a,
          x: sample.x,
          enclosed,
          bridge: bridgeAt(journey, sample.x),
          moving: sample.v > 0,
          passing: passingIntensity(journey, sample.x),
        });

      if (sample.phase === "COMPLETED") {
        completed = true;
        audio.suspendMotion();
        const dest = journey.stations[journey.stations.length - 1];
        if (st.notify) {
          if (isBreak) notifyIfHidden("휴식 끝", `${dest.nameKo}역에서 다시 출발해요`);
          else notifyIfHidden(`${dest.nameKo}에 도착했어요`, `${Math.round(s.totalSec / 60)}분 집중 완료 · 잠깐 쉬어갈까요?`);
        }
        st.completeSession();
        return;
      }

      if (render) {
        const nowP = performance.now();
        const dt = Math.min(0.05, (nowP - lastFrame) / 1000);
        lastFrame = nowP;
        renderer.render({
          journey,
          x: sample.x,
          v: sample.v,
          a: paused ? 0 : sample.a,
          doorsOpen: sample.doorsOpen,
          time: debug.still ?? nowP / 1000,
          timeOfDay: live.current.tod,
          reducedMotion: live.current.reducedMotion,
          qualityMode: live.current.quality,
          season: live.current.season,
          weather: live.current.weather,
        });
        // 손잡이: 가감속 관성 + 주행 흔들림을 받는 감쇠 진자
        const rm = live.current.reducedMotion;
        for (let k = 0; k < STRAPS; k++) {
          const sway = rm ? 0 : Math.sin(nowP / 1000 * (1.7 + k * 0.13) + k) * Math.min(1, sample.v / 18) * 1.4;
          const target = rm ? 0 : -sample.a * 7 + sway;
          const acc = -18 * (theta[k] - target) - 2.6 * omega[k];
          omega[k] += acc * dt;
          theta[k] += omega[k] * dt;
          const el = strapRefs.current[k];
          if (el) el.style.transform = `rotate(${theta[k].toFixed(2)}deg)`;
        }
        if (debug.enabled && statsRef.current) {
          const r = renderer.stats;
          statsRef.current.textContent =
            `fps ${r.fps.toFixed(0)}  render ${r.renderMs.toFixed(1)}ms  q ${r.quality}  dpr ${r.dpr}\n` +
            `t ${t.toFixed(1)}/${journey.totalSec}s  ${sample.phase}\n` +
            `x ${sample.x.toFixed(1)}m  v ${(sample.v * 3.6).toFixed(1)}km/h  a ${sample.a.toFixed(2)}`;
        }
      }

      const led = ledText(journey, sample, isBreak);
      if (now - lastHud > 250 || led !== lastLed || paused !== lastPaused || sample.phase !== lastPhase) {
        lastHud = now;
        lastLed = led;
        lastPaused = paused;
        lastPhase = sample.phase;
        setHud({ sample, led, paused });
        const nextSt = journey.stations[sample.nextIndex];
        document.title = paused
          ? `⏸ ${fmt(sample.remainingSec)} · METRO`
          : isBreak
            ? `${fmt(sample.remainingSec)} · 휴식 중`
            : `${fmt(sample.remainingSec)} · ${sample.v > 0 ? `다음 역 ${nextSt.nameKo}` : nextSt.nameKo}`;
      }
    };

    const frame = () => {
      tick(true);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // 탭이 숨겨지면 렌더링을 멈추고(rAF 정지) 타이머·사운드·완료 판정만 유지한다.
    // 숨겨진 탭의 일반 타이머는 스로틀링되므로 Worker 틱을 쓴다.
    const ticker = createTicker(() => {
      if (document.hidden) tick(false);
    }, 500);
    const baseTitle = document.title;

    return () => {
      cancelAnimationFrame(raf);
      ticker.stop();
      stopAnnounce();
      document.title = baseTitle.includes("·") ? "METRO — 서울을 달리는 뽀모도로" : baseTitle;
      ro.disconnect();
      audio.suspendMotion();
    };
  }, [journey, session.id, debug.enabled]);

  useEffect(() => {
    getAudio().setMaster(useAppStore.getState().masterVolume, muted);
  }, [muted]);

  /* ─────────────── 조작 ─────────────── */
  const togglePause = () => {
    const st = useAppStore.getState();
    if (st.activeSession?.pausedAt !== null) st.resume();
    else st.pause();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePause();
      } else if (e.key === "Escape") setPanel("none");
      else if (e.key === "h" || e.key === "H" || e.key === "ㅗ") setZen((z) => !z);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 입력이 없으면 HUD 를 숨겨 창밖에 집중 (마우스·터치·키 입력 시 다시 보임)
  useEffect(() => {
    let t = setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    const evs = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      evs.forEach((ev) => window.removeEventListener(ev, wake));
    };
  }, []);

  // LED: 국문/영문 문구를 4초마다 번갈아 고정 표시 (실제 객실 안내기 방식)
  useEffect(() => {
    setLedPart(0);
    const id = setInterval(() => setLedPart((p) => p + 1), 4000);
    return () => clearInterval(id);
  }, [hud.led]);

  const enableAudio = () => {
    unlockAudio();
    setAudioOn(true);
  };

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitRide = () => {
    const st = useAppStore.getState();
    const s = st.activeSession;
    if (!s) return;
    const t = elapsedSec(s);
    const smp = sampleJourney(journey, t);
    // 지나온 구간의 공식 거리 + 현재 구간은 연출 거리 진행 비율로 환산
    let km = 0;
    for (const seg of journey.segments) {
      const official = getSegment(seg.from.id, seg.to.id).distanceKm;
      if (smp.x >= seg.xTo) km += official;
      else if (smp.x > seg.xFrom) km += (official * (smp.x - seg.xFrom)) / seg.distance;
    }
    st.completeSession({ partialElapsedSec: t, partialDistanceKm: Math.round(km * 10) / 10 });
  };

  const { sample, led, paused } = hud;
  const stations = journey.stations;
  const last = stations.length - 1;
  const next = stations[sample.nextIndex];
  const dest = stations[last];
  const atStation = sample.v === 0;
  const totalX = journey.stopX[last];
  const focusMode = (idle || zen) && !paused && panel === "none";
  const ledParts = led.split("  ·  ");
  const ledShown = ledParts[ledPart % ledParts.length];
  const remainingStops = last - (atStation ? sample.stationIndex : sample.nextIndex - 1);

  return (
    <div
      className={`${styles.ride} ${styles[`tod_${tod}`]} ${focusMode ? styles.zen : ""}`}
      data-phase={sample.phase}
      data-focus={focusMode ? "on" : "off"}
      data-testid="ride"
    >
      <div className={styles.wall} />
      <div className={styles.ceiling}>
        <div className={styles.lightStrip} />
      </div>

      {/* 객실 LED 안내기 */}
      {/* 스크린리더: 4초 교대 표시가 아니라 안내 내용이 바뀔 때만 한국어로 한 번 읽는다 */}
      <p className={styles.srOnly} aria-live="polite">
        {ledParts[0]}
      </p>
      <div className={styles.led} aria-hidden="true">
        <div className={styles.ledInner}>
          <span key={ledShown} className={styles.ledStatic}>
            {ledShown}
          </span>
        </div>
      </div>

      {/* 창 */}
      <div className={styles.window}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="지하철 창밖 풍경" role="img" />
        <div className={styles.glassEdge} />
        <div className={styles.sticker} aria-hidden>
          <Mascot size={56} mood={paused ? "sleepy" : "smile"} />
        </div>
        <div className={styles.decal} aria-hidden>
          <span className={styles.decalBadge} style={{ background: line.color }}>
            {line.id}
          </span>
          기대지 마세요
        </div>
        {paused && (
          <div className={styles.pausedVeil}>
            <div className={styles.pausedCard}>
              <strong>잠시 쉬어가는 중</strong>
              <span>준비되면 다시 출발해요</span>
              <button className={styles.primaryBtn} onClick={togglePause}>
                <IconPlay width={16} height={16} /> 다시 출발
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 손잡이 */}
      <div className={styles.strapBar} />
      <div className={styles.straps} aria-hidden>
        {Array.from({ length: STRAPS }, (_, k) => (
          <div
            key={k}
            ref={(el) => {
              strapRefs.current[k] = el;
            }}
            className={styles.strap}
            style={{ left: `${14 + k * 14.4}%` }}
            data-k={k}
          >
            <div className={styles.belt} />
            <svg className={styles.handle} viewBox="0 0 40 40">
              <path d="M20 3 L36 33 Q37 37 33 37 L7 37 Q3 37 4 33 Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
      <div className={styles.pole} aria-hidden />
      <div className={`${styles.pole} ${styles.poleRight}`} aria-hidden />

      {/* 좌석 */}
      <div className={styles.seatBack} aria-hidden />
      <div className={styles.seatCushion} aria-hidden />

      {/* HUD */}
      <header className={styles.topLeft}>
        <span className={styles.lineBadge} style={{ background: line.color }}>
          {line.id}
        </span>
        <span className={styles.routeName}>
          {isBreak ? (
            <>{dest.nameKo}역 정차 중</>
          ) : (
            <>
              {stations[0].nameKo} <span className={styles.arrow}>→</span> {dest.nameKo}
            </>
          )}
        </span>
        {session.mode === "demo" && <span className={styles.demoTag}>체험 운행</span>}
        {isBreak && <span className={styles.demoTag}>{session.breakKind === "long" ? "긴 휴식" : "휴식"}</span>}
      </header>
      <div className={styles.topRight}>
        {session.task && <span className={styles.task}>{session.task}</span>}
        {cond.live && (
          <span className={styles.weatherChip} title="서울 실시간 날씨">
            서울 {WEATHER_LABEL[cond.live.weather]} · {cond.live.tempC}°
          </span>
        )}
        <time className={styles.clock}>
          {clock.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" })}
        </time>
      </div>

      <section className={styles.timerBlock}>
        <div className={styles.timer} data-testid="timer">
          {fmt(sample.remainingSec)}
        </div>
        <div className={styles.timerLabel}>
          {paused
            ? "일시정지"
            : isBreak
              ? "다시 출발까지 · 창밖을 보며 잠시 쉬어요"
              : atStation && sample.stationIndex === last
                ? "도착했어요"
                : last >= 4 && remainingStops > 0
                  ? `목적지까지 남은 시간 · ${remainingStops}개 역`
                  : "목적지까지 남은 시간"}
        </div>
        {!isBreak && (
        <div className={styles.progress} aria-label={`진행률 ${Math.round(sample.progress * 100)}%`}>
          <div className={styles.track}>
            <div className={styles.trackFill} style={{ width: `${sample.progress * 100}%` }} />
            {journey.stopX.map((x, i) => (
              <span
                key={stations[i].id}
                className={`${styles.stop} ${i <= sample.stationIndex && (atStation || i < sample.nextIndex) ? styles.stopDone : ""}`}
                style={{ left: `${(x / totalX) * 100}%` }}
                data-name={stations[i].nameKo}
                title={stations[i].nameKo}
              />
            ))}
            <span className={styles.trainDot} style={{ left: `${sample.progress * 100}%` }} />
          </div>
          <div className={styles.stopLabels}>
            <span>{stations[0].nameKo}</span>
            {!atStation && sample.nextIndex !== last && (
              <span className={styles.nextLabel} style={{ left: `${(journey.stopX[sample.nextIndex] / totalX) * 100}%` }}>
                다음 역 <b>{next.nameKo}</b>
              </span>
            )}
            <span>{dest.nameKo}</span>
          </div>
        </div>
        )}
      </section>

      <nav className={styles.controls} aria-label="운행 조작">
        <button className={styles.ctrl} onClick={togglePause} aria-label={paused ? "다시 출발" : "일시정지"} title="일시정지 (Space)">
          {paused ? <IconPlay /> : <IconPause />}
        </button>
        <button className={styles.ctrl} onClick={() => setPanel(panel === "sound" ? "none" : "sound")} aria-label="소리 설정">
          {muted ? <IconMute /> : <IconVolume />}
        </button>
        <button className={styles.ctrl} onClick={() => setPanel(panel === "settings" ? "none" : "settings")} aria-label="화면 설정">
          <IconSettings />
        </button>
        {canFullscreen && (
          <button className={`${styles.ctrl} ${styles.ctrlWide}`} onClick={fullscreen} aria-label="전체 화면">
            <IconExpand />
          </button>
        )}
        {/* 좁은 화면에서는 내리기/휴식 끝내기를 조작 줄에 모은다 */}
        <button
          className={`${styles.ctrl} ${styles.ctrlNarrow}`}
          onClick={() => (isBreak ? useAppStore.getState().completeSession() : setPanel("exit"))}
          aria-label={isBreak ? "휴식 끝내기" : "내리기"}
        >
          {isBreak ? <IconPlay /> : <IconExit />}
        </button>
      </nav>

      {isBreak ? (
        <button className={styles.exitBtn} onClick={() => useAppStore.getState().completeSession()}>
          <IconPlay width={14} height={14} /> 휴식 끝내기
        </button>
      ) : (
        <button className={styles.exitBtn} onClick={() => setPanel("exit")}>
          <IconExit width={16} height={16} /> 내리기
        </button>
      )}

      {!audioOn && (
        <button className={styles.audioPrompt} onClick={enableAudio}>
          <IconVolume width={16} height={16} /> 소리 켜기
        </button>
      )}

      {panel === "sound" && (
        <div className={styles.panel} role="dialog" aria-label="소리 설정">
          <SoundSettings onClose={() => setPanel("none")} onEnable={enableAudio} audioOn={audioOn} />
        </div>
      )}
      {panel === "settings" && (
        <div className={styles.panel} role="dialog" aria-label="화면 설정">
          <ViewSettings onClose={() => setPanel("none")} />
        </div>
      )}
      {panel === "exit" && (
        <div className={styles.panel} role="dialog" aria-label="내리기 확인">
          <strong className={styles.panelTitle}>여기서 내릴까요?</strong>
          <p className={styles.panelText}>지금까지 달린 시간만 기록돼요.</p>
          <div className={styles.panelRow}>
            <button className={styles.ghostBtn} onClick={() => setPanel("none")}>
              계속 타기
            </button>
            <button className={styles.primaryBtn} onClick={exitRide}>
              내리기
            </button>
          </div>
        </div>
      )}

      {showTips && (
        <div className={styles.tips} role="status">
          <span>
            <b>Space</b> 일시정지 · <b>H</b> 집중 모드 · 도착하면 그 역에서 쉬어갈 수 있어요
          </span>
          <button
            onClick={() => {
              setShowTips(false);
              useAppStore.getState().setSeenRideTips();
            }}
          >
            알겠어요
          </button>
        </div>
      )}

      {debug.enabled && <pre ref={statsRef} className={styles.debug} />}
    </div>
  );
}
