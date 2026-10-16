"use client";

import { CHANNELS } from "@/audio/AudioEngine";
import { getAudio } from "@/audio/instance";
import { useT, type StringKey } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import styles from "./Panels.module.css";

function Segment<V extends string>({ value, opts, onPick }: { value: V; opts: Array<[V, StringKey]>; onPick: (v: V) => void }) {
  const { t } = useT();
  return (
    <div className={styles.segment}>
      {opts.map(([v, k]) => (
        <button key={v} className={value === v ? styles.segOn : ""} onClick={() => onPick(v)}>
          {t(k)}
        </button>
      ))}
    </div>
  );
}

export function SoundSettings({ onClose, onEnable, audioOn }: { onClose?: () => void; onEnable: () => void; audioOn: boolean }) {
  const { t } = useT();
  const volumes = useAppStore((s) => s.volumes);
  const master = useAppStore((s) => s.masterVolume);
  const muted = useAppStore((s) => s.muted);
  const announceOn = useAppStore((s) => s.announce);
  const { setVolume, setMasterVolume, setMuted } = useAppStore.getState();
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>{t("panel.sound")}</strong>
        {onClose && (
          <button className={styles.textBtn} onClick={onClose}>
            {t("common.close")}
          </button>
        )}
      </div>
      {!audioOn && (
        <button className={styles.primaryBtn} onClick={onEnable} style={{ width: "100%", marginBottom: 12 }}>
          {t("panel.enableSound")}
        </button>
      )}
      <label className={styles.slider}>
        <span>{t("panel.master")}</span>
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
          <span>{t(`ch.${c}` as StringKey)}</span>
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
        <input type="checkbox" checked={announceOn} onChange={(e) => useAppStore.getState().setAnnounce(e.target.checked)} /> {t("panel.announce")}
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} /> {t("panel.muteAll")}
      </label>
    </div>
  );
}

export function ViewSettings({ onClose }: { onClose?: () => void }) {
  const { t } = useT();
  const tod = useAppStore((s) => s.timeOfDay);
  const rm = useAppStore((s) => s.reducedMotion);
  const q = useAppStore((s) => s.quality);
  const weather = useAppStore((s) => s.weatherPref);
  const season = useAppStore((s) => s.seasonPref);
  const lang = useAppStore((s) => s.langPref);
  const surprises = useAppStore((s) => s.surprises);
  const presence = useAppStore((s) => s.presence);
  const { setWeatherPref, setSeasonPref, setTimeOfDay, setReducedMotion, setQuality, setLangPref } = useAppStore.getState();
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>{t("panel.view")}</strong>
        {onClose && (
          <button className={styles.textBtn} onClick={onClose}>
            {t("common.close")}
          </button>
        )}
      </div>
      <Segment
        value={tod}
        onPick={setTimeOfDay}
        opts={[
          ["auto", "opt.autoKst"],
          ["day", "tod.day"],
          ["sunset", "tod.sunset"],
          ["night", "tod.night"],
        ]}
      />
      <p className={styles.panelText} style={{ margin: "12px 0 0" }}>
        {t("panel.zenHint")}
      </p>
      <strong className={styles.panelSub}>{t("panel.weather")}</strong>
      <Segment
        value={weather}
        onPick={setWeatherPref}
        opts={[
          ["auto", "opt.seoulLive"],
          ["clear", "weather.clear"],
          ["cloudy", "weather.cloudy"],
          ["rain", "weather.rain"],
          ["snow", "weather.snow"],
        ]}
      />
      <strong className={styles.panelSub}>{t("panel.season")}</strong>
      <Segment
        value={season}
        onPick={setSeasonPref}
        opts={[
          ["auto", "opt.auto"],
          ["spring", "season.spring"],
          ["summer", "season.summer"],
          ["autumn", "season.autumn"],
          ["winter", "season.winter"],
        ]}
      />
      <strong className={styles.panelSub}>{t("panel.quality")}</strong>
      <Segment
        value={q}
        onPick={setQuality}
        opts={[
          ["auto", "opt.auto"],
          ["high", "opt.high"],
          ["low", "opt.low"],
        ]}
      />
      <strong className={styles.panelSub}>{t("panel.motion")}</strong>
      <Segment
        value={rm}
        onPick={setReducedMotion}
        opts={[
          ["system", "opt.system"],
          ["on", "opt.on"],
          ["off", "opt.off"],
        ]}
      />
      <label className={styles.check} style={{ marginTop: 12 }}>
        <input type="checkbox" checked={surprises} onChange={(e) => useAppStore.getState().setSurprises(e.target.checked)} /> {t("panel.surprises")}
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={presence} onChange={(e) => useAppStore.getState().setPresence(e.target.checked)} /> {t("presence.setting")}
      </label>
      <strong className={styles.panelSub}>{t("panel.language")}</strong>
      <div className={styles.segment}>
        {(
          [
            ["auto", t("opt.auto")],
            ["ko", "한국어"],
            ["en", "English"],
          ] as const
        ).map(([v, l]) => (
          <button key={v} className={lang === v ? styles.segOn : ""} onClick={() => setLangPref(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 뽀모도로 휴식 설정 */
export function PomodoroSettings() {
  const { t } = useT();
  const p = useAppStore((s) => s.pomodoro);
  const set = useAppStore.getState().setPomodoro;
  const row = (label: StringKey, value: number, opts: number[], unit: StringKey, key: "shortMin" | "longMin" | "longEvery") => (
    <>
      <strong className={styles.panelSub}>{t(label)}</strong>
      <div className={styles.segment}>
        {opts.map((o) => (
          <button key={o} className={value === o ? styles.segOn : ""} onClick={() => set({ [key]: o })}>
            {t(unit, { n: o })}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <div>
      <div className={styles.panelHead}>
        <strong className={styles.panelTitle}>{t("panel.break")}</strong>
      </div>
      {row("panel.shortBreak", p.shortMin, [3, 5, 10], "panel.unitMin", "shortMin")}
      {row("panel.longBreak", p.longMin, [15, 20, 30], "panel.unitMin", "longMin")}
      {row("panel.longEvery", p.longEvery, [3, 4, 5], "panel.unitEvery", "longEvery")}
      <label className={styles.check} style={{ marginTop: 12 }}>
        <input type="checkbox" checked={p.autoContinue} onChange={(e) => set({ autoContinue: e.target.checked })} /> {t("panel.autoContinue")}
      </label>
    </div>
  );
}
