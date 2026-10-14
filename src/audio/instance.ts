import { AudioEngine, CHANNELS } from "./AudioEngine";
import { useAppStore } from "../store/useAppStore";

let engine: AudioEngine | null = null;

/** 앱 전체에서 하나의 오디오 엔진을 공유한다 (사용자 동작 이후에만 start) */
export function getAudio(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}

/** 사용자 클릭 핸들러 안에서 호출: 오디오 시작 + 저장된 볼륨 적용 */
export function unlockAudio() {
  const a = getAudio();
  a.start();
  const s = useAppStore.getState();
  for (const c of CHANNELS) a.setVolume(c, s.volumes[c]);
  a.setMaster(s.masterVolume, s.muted);
}
