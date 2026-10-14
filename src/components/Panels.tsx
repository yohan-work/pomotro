"use client";

import { CHANNELS, type Channel } from "@/audio/AudioEngine";
import { getAudio } from "@/audio/instance";
import { useAppStore } from "@/store/useAppStore";
import styles from "./Panels.module.css";

const CHANNEL_LABEL: Record<Channel, string> = {
  rolling: "주행음",
  rail: "레일 소리",
  chime: "안내 차임",
  door: "출입문",
  ambient: "객실 앰비언트",
};

export function SoundSettings({ onClose, onEnable, audioOn }: { onClose?: () => void; onEnable: () => void; audioOn: boolean }) {
  const volumes = useAppStore((s) => s.volumes);
  const master = useAppStore((s) => s.masterVolume);
  const muted = useAppStore((s) => s.muted);
  const announceOn = useAppStore((s) => s.announce);
  const { setVolume, setMasterVolume, setMuted } = useAppStore.getState();
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>소리</strong>
        {onClose && (
          <button className={styles.textBtn} onClick={onClose}>
            닫기
          </button>
        )}
      </div>
      {!audioOn && (
        <button className={styles.primaryBtn} onClick={onEnable} style={{ width: "100%", marginBottom: 12 }}>
          소리 켜기
        </button>
      )}
      <label className={styles.slider}>
        <span>전체</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={master}
          onChange={(e) => {
            setMasterVolume(+e.target.value);
            getAudio().setMaster(+e.target.value, muted);
          }}
        />
      </label>
      {CHANNELS.map((c) => (
        <label key={c} className={styles.slider}>
          <span>{CHANNEL_LABEL[c]}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volumes[c]}
            onChange={(e) => {
              setVolume(c, +e.target.value);
              getAudio().setVolume(c, +e.target.value);
            }}
          />
        </label>
      ))}
      <label className={styles.check}>
        <input type="checkbox" checked={announceOn} onChange={(e) => useAppStore.getState().setAnnounce(e.target.checked)} /> 역 안내방송 (음성)
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} /> 모두 음소거
      </label>
    </div>
  );
}

export function ViewSettings({ onClose }: { onClose?: () => void }) {
  const tod = useAppStore((s) => s.timeOfDay);
  const rm = useAppStore((s) => s.reducedMotion);
  const q = useAppStore((s) => s.quality);
  const weather = useAppStore((s) => s.weatherPref);
  const season = useAppStore((s) => s.seasonPref);
  const { setWeatherPref, setSeasonPref } = useAppStore.getState();
  const weatherOpts: Array<[typeof weather, string]> = [
    ["auto", "서울 실시간"],
    ["clear", "맑음"],
    ["cloudy", "흐림"],
    ["rain", "비"],
    ["snow", "눈"],
  ];
  const seasonOpts: Array<[typeof season, string]> = [
    ["auto", "자동"],
    ["spring", "봄"],
    ["summer", "여름"],
    ["autumn", "가을"],
    ["winter", "겨울"],
  ];
  const { setTimeOfDay, setReducedMotion, setQuality } = useAppStore.getState();
  const qOpts: Array<[typeof q, string]> = [
    ["auto", "자동"],
    ["high", "높음"],
    ["low", "낮음 (배터리 절약)"],
  ];
  const todOpts: Array<[typeof tod, string]> = [
    ["auto", "자동 (한국 시간)"],
    ["day", "낮"],
    ["sunset", "노을"],
    ["night", "밤"],
  ];
  const rmOpts: Array<[typeof rm, string]> = [
    ["system", "시스템 설정"],
    ["on", "켜기"],
    ["off", "끄기"],
  ];
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>창밖 풍경</strong>
        {onClose && (
          <button className={styles.textBtn} onClick={onClose}>
            닫기
          </button>
        )}
      </div>
      <div className={styles.segment}>
        {todOpts.map(([v, l]) => (
          <button key={v} className={tod === v ? styles.segOn : ""} onClick={() => setTimeOfDay(v)}>
            {l}
          </button>
        ))}
      </div>
      <p className={styles.panelText} style={{ margin: "12px 0 0" }}>
        5초 동안 입력이 없으면 버튼이 사라져요. <b>H</b> 키로 집중 모드를 켜고 끌 수 있어요.
      </p>
      <strong className={styles.panelSub}>날씨</strong>
      <div className={styles.segment}>
        {weatherOpts.map(([v, l]) => (
          <button key={v} className={weather === v ? styles.segOn : ""} onClick={() => setWeatherPref(v)}>
            {l}
          </button>
        ))}
      </div>
      <strong className={styles.panelSub}>계절</strong>
      <div className={styles.segment}>
        {seasonOpts.map(([v, l]) => (
          <button key={v} className={season === v ? styles.segOn : ""} onClick={() => setSeasonPref(v)}>
            {l}
          </button>
        ))}
      </div>
      <strong className={styles.panelSub}>그래픽 품질</strong>
      <div className={styles.segment}>
        {qOpts.map(([v, l]) => (
          <button key={v} className={q === v ? styles.segOn : ""} onClick={() => setQuality(v)}>
            {l}
          </button>
        ))}
      </div>
      <strong className={styles.panelSub}>모션 줄이기</strong>
      <div className={styles.segment}>
        {rmOpts.map(([v, l]) => (
          <button key={v} className={rm === v ? styles.segOn : ""} onClick={() => setReducedMotion(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 뽀모도로 휴식 설정 */
export function PomodoroSettings() {
  const p = useAppStore((s) => s.pomodoro);
  const set = useAppStore.getState().setPomodoro;
  const row = (label: string, value: number, opts: number[], unit: string, key: "shortMin" | "longMin" | "longEvery") => (
    <>
      <strong className={styles.panelSub}>{label}</strong>
      <div className={styles.segment}>
        {opts.map((o) => (
          <button key={o} className={value === o ? styles.segOn : ""} onClick={() => set({ [key]: o })}>
            {o}
            {unit}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>휴식</strong>
      </div>
      {row("짧은 휴식", p.shortMin, [3, 5, 10], "분", "shortMin")}
      {row("긴 휴식", p.longMin, [15, 20, 30], "분", "longMin")}
      {row("긴 휴식 주기", p.longEvery, [3, 4, 5], "번마다", "longEvery")}
      <label className={styles.check} style={{ marginTop: 12 }}>
        <input type="checkbox" checked={p.autoContinue} onChange={(e) => set({ autoContinue: e.target.checked })} /> 휴식이 끝나면 같은 역에서 자동
        출발
      </label>
    </div>
  );
}
