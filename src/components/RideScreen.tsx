"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAudio, unlockAudio } from "@/audio/instance";
import { getSegment, lineOf, type Station } from "@/data/lines";
import { lineName, stationName, tr, useT, type Lang, type StringKey } from "@/i18n";
import { Renderer } from "@/render/Renderer";
import { announce, stopAnnounce } from "@/audio/announce";
import { useConditions } from "@/lib/useConditions";
import { passingIntensity } from "@/render/scene";
import { timeOfDayKST, type TimeOfDay } from "@/render/palette";
import { elapsedSec, epochNow } from "@/sim/clock";
import { buildJourney, runX, sampleJourney, type Journey, type JourneyEvent, type SimSample } from "@/sim/journey";
import { cabinEventAt, planRideEvents, seedOf, seenEvents, type RideEvent, type RideEventKind } from "@/sim/rideEvents";
import { createTicker, notifyIfHidden } from "@/lib/background";
import { useAppStore, type ActiveSession } from "@/store/useAppStore";
import { IconExit, IconExpand, IconMute, IconPause, IconPip, IconPlay, IconSettings, IconVolume, Mascot } from "./Icons";
import { miniWindowSupported, openMiniWindow } from "./miniWindow";
import { SoundSettings, ViewSettings } from "./Panels";
import { CabinPassenger } from "./Passengers";
import { LineBadge } from "./LineBadge";
import { Garland } from "./Garland";
import { calendarNow, christmasSeason, specialDay } from "@/lib/calendar";
import { todayDone } from "@/lib/goals";
import styles from "./RideScreen.module.css";

export interface RideDebug {
  enabled: boolean;
  tod: TimeOfDay | null;
  /** 검증용 정지 화면: 시뮬레이션·애니메이션 시간을 이 값(초)에 고정 → 같은 입력이면 항상 같은 그림 */
  still?: number;
  /** 검증용: 이 깜짝 이벤트만 (가장 이른 배치로) */
  event?: RideEventKind | null;
  /** URL 로 자동 시작한 세션 — 검증 화면이 흔들리지 않게 깜짝 이벤트를 끈다 (event 로 강제 가능) */
  scripted?: boolean;
  /** 검증용 혼잡도 고정 (0..1) */
  crowd?: number;
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

/** 현재 상태에서 객실 LED 안내 문구 (한국어 화면은 국문·영문 병기) */
function ledText(j: Journey, s: SimSample, isBreak = false, lang: Lang = "ko"): string {
  const n = (st: Station) => stationName(st, lang);
  if (isBreak) return tr(lang, "led.break", { station: n(j.stations[0]) });
  const last = j.stations.length - 1;
  // 환승: 걷는 중이면 갈아탈 노선, 환승역에 서 있거나 다가가면 "갈아타는 곳"
  const lineAt = (i: number) => lineOf(j.stations[i].id);
  const xferLine = (i: number) => {
    const x = j.transfers.find((tp) => tp.stationIndex === i);
    return x ? lineAt(i + 1) : null;
  };
  const here = (i: number) => {
    const l = xferLine(i);
    return l ? `  ·  ${tr(lang, "led.transferHere", { line: lineName(l, "ko"), en: lineName(l, "en") })}` : "";
  };
  if (s.phase === "TRANSFER") {
    const l = lineAt(j.transfers.find((tp) => s.t >= tp.t0 && s.t < tp.t1)!.stationIndex + 1);
    return tr(lang, "led.transfer", { line: lineName(l, "ko"), en: lineName(l, "en") });
  }
  if (s.phase === "BOARDING" || s.phase === "ARRIVED" || s.phase === "COMPLETED") {
    const st = j.stations[s.stationIndex];
    if (s.stationIndex === last) return tr(lang, "led.terminal", { station: n(st), en: st.nameEn });
    const close = j.events.find((e) => e.type === "doorClose" && e.stationIndex === s.stationIndex);
    if (close && s.t >= close.t) return tr(lang, "led.doorsClosing");
    if (s.phase === "ARRIVED") return (lang === "ko" ? `${st.nameKo}  ${st.nameEn}` : st.nameEn) + here(s.stationIndex);
    return tr(lang, "led.bound", { station: n(j.stations[last]) });
  }
  const next = j.stations[s.nextIndex];
  const approach = j.events.find((e) => e.type === "approach" && e.stationIndex === s.nextIndex);
  if (approach && s.t >= approach.t) return tr(lang, "led.thisStop", { station: n(next), en: next.nameEn }) + here(s.nextIndex);
  return tr(lang, "led.nextStop", { station: n(next), en: next.nameEn });
}

function bridgeAt(j: Journey, x: number) {
  return j.sections.some((s) => (s.kind === "river" || s.kind === "bank") && x >= s.x0 && x <= s.x1) ? 1 : 0;
}

/** 혼잡도 (한국 시간): 평일 출퇴근 1, 낮·주말 0.5, 늦은 밤 0.2 — 연출 */
function crowdKST(d: Date): number {
  const k = new Date(d.getTime() + 9 * 3600e3);
  const h = k.getUTCHours();
  const weekday = k.getUTCDay() > 0 && k.getUTCDay() < 6;
  if (h >= 23 || h < 5) return 0.2;
  if (weekday && ((h >= 7 && h < 9) || (h >= 18 && h < 20))) return 1;
  return 0.5;
}

/** 안내기 글자 폭 (한글은 영문의 약 1.7배) */
const ledWidth = (s: string) => [...s].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 1.7 : 1), 0);

/** 단소 승객이 부는 때: 앉고 6초 뒤, 이후 75초마다 (5초간) */
function dansoCues(events: RideEvent[]): number[] {
  const out: number[] = [];
  for (const e of events) if (e.kind === "danso") for (let c = e.t0 + 6; c < e.t1 - 6; c += 75) out.push(c);
  return out;
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
  const { t, name, lang } = useT();
  const surprisesOn = useAppStore((s) => s.surprises);
  const goal = useAppStore((s) => s.dailyGoal);
  // 이 여행이 오늘 몇 번째인지 (출발 시점 기준 — 여행 중에는 바뀌지 않는다)
  const [doneTodayAtStart] = useState(() => todayDone(useAppStore.getState().records));
  const plannedEvents = useMemo(() => {
    if (isBreak) return [];
    // 강제 이벤트는 검증 화면이 매번 같도록 이벤트 이름을 시드로
    if (debug.event) return planRideEvents(journey, seedOf(debug.event), debug.event);
    if (debug.scripted) return [];
    return planRideEvents(journey, seedOf(session.id));
  }, [journey, session.id, isBreak, debug.event, debug.scripted]);
  const rideEvents = surprisesOn || debug.event ? plannedEvents : [];
  const cues = useMemo(() => dansoCues(rideEvents), [rideEvents]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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
  const [canMini, setCanMini] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const closeMini = useRef<(() => void) | null>(null);
  useEffect(() => {
    setCanMini(miniWindowSupported());
    // 여행이 끝나거나 화면을 떠나면 미니 창도 닫는다
    return () => closeMini.current?.();
  }, []);
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
  const live = useRef({ tod, reducedMotion, quality: qualityPref, season: cond.season, springPhase: cond.springPhase, weather: cond.weather, announce: announceOn, lang, events: rideEvents, cues });
  live.current = { tod, reducedMotion, quality: qualityPref, season: cond.season, springPhase: cond.springPhase, weather: cond.weather, announce: announceOn, lang, events: rideEvents, cues };
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
    let lastDaylight = -1;

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
              () => {
                const L = live.current.lang;
                const xfer = journey.transfers.find((tp) => tp.stationIndex === e.stationIndex);
                const xferLine = xfer ? lineOf(journey.stations[e.stationIndex + 1].id) : null;
                announce(
                  tr(L, last ? "say.terminal" : "say.next", { station: stationName(st, L) }) + (xferLine ? " " + tr(L, "say.transfer", { line: lineName(xferLine, L) }) : ""),
                  audio.speechVolume(),
                  L,
                );
              },
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
        for (const c of live.current.cues) if (c > lastEventT && c <= t && t - c < 2.5 && !document.hidden) audio.danso();
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
          const L = live.current.lang;
          if (isBreak) notifyIfHidden(tr(L, "notify.breakOverTitle"), tr(L, "notify.breakOverBody", { station: stationName(dest, L) }));
          else notifyIfHidden(tr(L, "notify.arrivedTitle", { station: stationName(dest, L) }), tr(L, "notify.arrivedBody", { n: Math.round(s.totalSec / 60) }));
        }
        st.completeSession({ encounters: seenEvents(live.current.events, journey.totalSec) });
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
          springPhase: live.current.springPhase,
          weather: live.current.weather,
          events: live.current.events,
          crowd: debug.crowd ?? (debug.still !== undefined ? 0.5 : crowdKST(new Date())),
        });
        // 창으로 들어오는 햇빛: 낮·노을의 지상 구간에서만, 터널에 들어가면 서서히 사라진다
        const sun = { day: 1, sunset: 0.85, night: 0 }[live.current.tod] * (live.current.weather === "clear" ? 1 : 0.55);
        const daylight = Math.round((1 - renderer.currentDarkness) * sun * 100) / 100;
        if (Math.abs(daylight - lastDaylight) >= 0.01 && rootRef.current) {
          lastDaylight = daylight;
          rootRef.current.style.setProperty("--daylight", String(daylight));
        }
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

      // 서울 달력: 크리스마스·새해·한글날엔 안내기에 인사가 함께 돈다
      const greet = specialDay(calendarNow());
      const led = ledText(journey, sample, isBreak, live.current.lang) + (greet ? `  ·  ${tr(live.current.lang, `greet.${greet}` as StringKey)}` : "");
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
            ? tr(live.current.lang, "ride.titleBreak", { time: fmt(sample.remainingSec) })
            : sample.v > 0
              ? tr(live.current.lang, "ride.titleNext", { time: fmt(sample.remainingSec), station: stationName(nextSt, live.current.lang) })
              : `${fmt(sample.remainingSec)} · ${stationName(nextSt, live.current.lang)}`;
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
      document.title = baseTitle.includes("·") ? tr(live.current.lang, "app.title") : baseTitle;
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

  /** 미니 창: 다른 앱에서 일하는 동안 창밖·남은 시간·다음 역을 작은 창으로 */
  const toggleMini = async () => {
    if (closeMini.current) {
      closeMini.current();
      closeMini.current = null;
      setMiniOpen(false);
      return;
    }
    let last = sampleJourney(journey, 0);
    try {
      closeMini.current = await openMiniWindow({
        journey,
        sample: () => {
          const s = useAppStore.getState().activeSession;
          if (s && s.id === session.id) last = sampleJourney(journey, debug.still ?? elapsedSec(s));
          return { sample: last, paused: Boolean(s && s.pausedAt !== null) };
        },
        live: () => live.current,
        text: (s, p) => {
          const L = live.current.lang;
          const ln = lineOf(journey.stations[s.nextIndex].id);
          return {
            time: fmt(s.remainingSec),
            label: p ? tr(L, "ride.pause") : ledText(journey, s, isBreak, L).split("  ·  ")[0],
            color: ln.color,
            badge: ln.badge[L],
          };
        },
        labels: { pause: t("ride.pause"), resume: t("ride.resume"), title: t("ride.miniTitle") },
        onTogglePause: togglePause,
        onClose: () => {
          closeMini.current = null;
          setMiniOpen(false);
        },
      });
      setMiniOpen(true);
    } catch {
      closeMini.current = null;
    }
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
    st.completeSession({ partialElapsedSec: t, partialDistanceKm: Math.round(km * 10) / 10, encounters: seenEvents(rideEvents, t) });
  };

  const { sample, led, paused } = hud;
  const stations = journey.stations;
  const last = stations.length - 1;
  const next = stations[sample.nextIndex];
  const dest = stations[last];
  const atStation = sample.v === 0;
  // 진행 막대 위치: 환승 때 건너뛴 거리를 뺀 위치 비율
  const totalRun = runX(journey, journey.stopX[last]);
  const posPct = (i: number) => (runX(journey, journey.stopX[i]) / totalRun) * 100;
  const xferAt = new Set(journey.transfers.map((tp) => tp.stationIndex));
  /** 지금 타고 있는(갈아탈) 노선 */
  const line = lineOf(stations[sample.nextIndex].id);
  const legLines = [...new Set(stations.map((st) => st.line))].map((id) => lineOf(stations.find((st) => st.line === id)!.id));
  const xfer = journey.transfers.find((tp) => sample.t >= tp.t0 && sample.t < tp.t1);
  const focusMode = (idle || zen) && !paused && panel === "none";
  const ledParts = led.split("  ·  ");
  const ledShown = ledParts[ledPart % ledParts.length];
  const remainingStops = journey.segments.filter((sg) => sg.index >= (atStation ? sample.stationIndex : sample.nextIndex - 1)).length;
  const cabin = cabinEventAt(rideEvents, sample.t);
  const dansoPlaying = cues.some((c) => sample.t >= c && sample.t < c + 5);

  return (
    <div
      ref={rootRef}
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
          <span
            key={ledShown}
            className={styles.ledStatic}
            // 긴 영문 역명(예: Dongdaemun History & Culture Park)이 잘리지 않게 글자를 줄인다
            style={ledWidth(ledShown) > 30 ? { fontSize: `max(10px, ${((1.9 * 30) / ledWidth(ledShown)).toFixed(2)}vh)` } : undefined}
          >
            {ledShown}
          </span>
        </div>
      </div>

      {/* 창 */}
      <div className={styles.window}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label={t("ride.windowLabel")} role="img" />
        <div className={styles.glassEdge} />
        <div className={styles.sticker} aria-hidden>
          <Mascot size={56} mood={paused ? "sleepy" : "smile"} />
        </div>
        <div className={styles.decal} aria-hidden>
          <span className={styles.decalBadge} style={{ background: line.color }}>
            {line.badge[lang]}
          </span>
          {t("ride.doNotLean")}
        </div>
        {xfer && !paused && (
          <div className={styles.transferVeil} data-testid="transfer">
            <div className={styles.transferCard} role="status">
              <span className={styles.transferLines}>
                <LineBadge line={lineOf(stations[xfer.stationIndex].id)} />
                <span aria-hidden>→</span>
                <LineBadge line={lineOf(stations[xfer.stationIndex + 1].id)} />
              </span>
              <strong>{t("ride.transferTitle", { station: name(stations[xfer.stationIndex]), line: lineName(lineOf(stations[xfer.stationIndex + 1].id), lang) })}</strong>
              <span>{t("ride.transferInfo", { m: xfer.official.meters, time: fmt(xfer.official.sec) })}</span>
              <div className={styles.transferBar}>
                <i style={{ width: `${Math.min(100, ((sample.t - xfer.t0) / (xfer.t1 - xfer.t0)) * 100)}%` }} />
              </div>
              <span className={styles.walker} aria-hidden>
                <Mascot size={44} mood="smile" />
              </span>
            </div>
          </div>
        )}
        {paused && (
          <div className={styles.pausedVeil}>
            <div className={styles.pausedCard}>
              <strong>{t("ride.pausedTitle")}</strong>
              <span>{t("ride.pausedSub")}</span>
              <button className={styles.primaryBtn} onClick={togglePause}>
                <IconPlay width={16} height={16} /> {t("ride.resume")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 손잡이 */}
      <div className={styles.strapBar} />
      {christmasSeason(calendarNow()) && <Garland />}
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
      {cabin && (
        <CabinPassenger
          key={`${cabin.kind}:${cabin.t0}`}
          event={cabin}
          t={sample.t}
          playing={dansoPlaying}
          reducedMotion={reducedMotion}
          speech={t("event.vendorLine")}
        />
      )}
      <p className={styles.srOnly} aria-live="polite">
        {cabin ? t(`event.sr.${cabin.kind}` as StringKey) : ""}
      </p>
      <div className={styles.daylight} aria-hidden />

      {/* HUD */}
      <header className={styles.topLeft}>
        {legLines.length === 1 && (
          <span className={styles.lineBadge} style={{ background: line.color }}>
            {line.badge[lang]}
          </span>
        )}
        {legLines.length > 1 && (
          <span className={styles.legs} aria-label={legLines.map((l) => lineName(l, lang)).join(" → ")}>
            {legLines.map((l, k) => (
              <span key={l.id} className={l.id === line.id ? styles.legOn : styles.leg}>
                {k > 0 && "→"}
                <LineBadge line={l} showVariant={false} />
              </span>
            ))}
          </span>
        )}
        <span className={styles.routeName}>
          {isBreak ? (
            <>{t("ride.stoppedAt", { station: name(dest) })}</>
          ) : (
            <>
              {name(stations[0])} <span className={styles.arrow}>→</span> {name(dest)}
            </>
          )}
        </span>
        {session.mode === "demo" && <span className={styles.demoTag}>{t("ride.demo")}</span>}
        {isBreak && <span className={styles.demoTag}>{session.breakKind === "long" ? t("ride.longBreak") : t("ride.break")}</span>}
      </header>
      <div className={styles.topRight}>
        {session.task && <span className={styles.task}>{session.task}</span>}
        {session.mode === "focus" && goal > 0 && (
          <span className={styles.weatherChip}>{t("goal.rideChip", { n: doneTodayAtStart + 1, goal })}</span>
        )}
        {cond.live && (
          <span className={styles.weatherChip} title={t("ride.weatherTitle")}>
            {t("ride.weatherChip", { w: t(`weather.${cond.live.weather}`), t: cond.live.tempC })}
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
            ? t("ride.pause")
            : isBreak
              ? t("ride.breakLabel")
              : atStation && sample.stationIndex === last
                ? t("ride.arrived")
                : last >= 4 && remainingStops > 0
                  ? t("ride.remainingStops", { n: remainingStops })
                  : t("ride.remaining")}
        </div>
        {!isBreak && (
        <div className={styles.progress} aria-label={t("ride.progress", { n: Math.round(sample.progress * 100) })}>
          <div className={styles.track}>
            <div className={styles.trackFill} style={{ width: `${sample.progress * 100}%` }} />
            {journey.stopX.map((_, i) =>
              // 환승역은 한 점으로 (갈아탄 뒤의 역은 그리지 않는다)
              xferAt.has(i - 1) ? null : (
                <span
                  key={stations[i].id}
                  className={`${styles.stop} ${i <= sample.stationIndex && (atStation || i < sample.nextIndex) ? styles.stopDone : ""} ${xferAt.has(i) ? styles.stopTransfer : ""}`}
                  style={{ left: `${posPct(i)}%` }}
                  data-name={name(stations[i])}
                  title={name(stations[i])}
                />
              ),
            )}
            <span className={styles.trainDot} style={{ left: `${sample.progress * 100}%` }} />
          </div>
          <div className={styles.stopLabels}>
            <span>{name(stations[0])}</span>
            {!atStation && sample.nextIndex !== last && (
              <span className={styles.nextLabel} style={{ left: `${posPct(sample.nextIndex)}%` }}>
                {t("ride.nextStop")} <b>{name(next)}</b>
              </span>
            )}
            <span>{name(dest)}</span>
          </div>
        </div>
        )}
      </section>

      <nav className={styles.controls} aria-label={t("ride.controls")}>
        <button className={styles.ctrl} onClick={togglePause} aria-label={paused ? t("ride.resume") : t("ride.pause")} title={`${t("ride.pause")} (Space)`}>
          {paused ? <IconPlay /> : <IconPause />}
        </button>
        <button className={styles.ctrl} onClick={() => setPanel(panel === "sound" ? "none" : "sound")} aria-label={t("ride.soundSettings")}>
          {muted ? <IconMute /> : <IconVolume />}
        </button>
        <button className={styles.ctrl} onClick={() => setPanel(panel === "settings" ? "none" : "settings")} aria-label={t("ride.viewSettings")}>
          <IconSettings />
        </button>
        {canMini && (
          <button className={`${styles.ctrl} ${styles.ctrlWide}`} onClick={toggleMini} aria-label={t("ride.miniWindow")} aria-pressed={miniOpen} title={t("ride.miniWindow")}>
            <IconPip />
          </button>
        )}
        {canFullscreen && (
          <button className={`${styles.ctrl} ${styles.ctrlWide}`} onClick={fullscreen} aria-label={t("ride.fullscreen")}>
            <IconExpand />
          </button>
        )}
        {/* 좁은 화면에서는 내리기/휴식 끝내기를 조작 줄에 모은다 */}
        <button
          className={`${styles.ctrl} ${styles.ctrlNarrow}`}
          onClick={() => (isBreak ? useAppStore.getState().completeSession() : setPanel("exit"))}
          aria-label={isBreak ? t("ride.endBreak") : t("ride.getOff")}
        >
          {isBreak ? <IconPlay /> : <IconExit />}
        </button>
      </nav>

      {isBreak ? (
        <button className={styles.exitBtn} onClick={() => useAppStore.getState().completeSession()}>
          <IconPlay width={14} height={14} /> {t("ride.endBreak")}
        </button>
      ) : (
        <button className={styles.exitBtn} onClick={() => setPanel("exit")}>
          <IconExit width={16} height={16} /> {t("ride.getOff")}
        </button>
      )}

      {!audioOn && (
        <button className={styles.audioPrompt} onClick={enableAudio}>
          <IconVolume width={16} height={16} /> {t("ride.enableSound")}
        </button>
      )}

      {panel === "sound" && (
        <div className={styles.panel} role="dialog" aria-label={t("ride.soundSettings")}>
          <SoundSettings onClose={() => setPanel("none")} onEnable={enableAudio} audioOn={audioOn} />
        </div>
      )}
      {panel === "settings" && (
        <div className={styles.panel} role="dialog" aria-label={t("ride.viewSettings")}>
          <ViewSettings onClose={() => setPanel("none")} />
        </div>
      )}
      {panel === "exit" && (
        <div className={styles.panel} role="dialog" aria-label={t("ride.getOffConfirm")}>
          <strong className={styles.panelTitle}>{t("ride.getOffTitle")}</strong>
          <p className={styles.panelText}>{t("ride.getOffText")}</p>
          <div className={styles.panelRow}>
            <button className={styles.ghostBtn} onClick={() => setPanel("none")}>
              {t("ride.keepRiding")}
            </button>
            <button className={styles.primaryBtn} onClick={exitRide}>
              {t("ride.getOff")}
            </button>
          </div>
        </div>
      )}

      {showTips && (
        <div className={styles.tips} role="status">
          <span>
            {t("ride.tips")}
          </span>
          <button
            onClick={() => {
              setShowTips(false);
              useAppStore.getState().setSeenRideTips();
            }}
          >
            {t("ride.gotIt")}
          </button>
        </div>
      )}

      {debug.enabled && <pre ref={statsRef} className={styles.debug} />}
    </div>
  );
}
