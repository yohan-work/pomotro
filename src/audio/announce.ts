/**
 * 안내방송 — 브라우저 내장 한국어 음성(Web Speech API). 기본 꺼짐.
 * 실제 기관 안내방송 음원을 쓰지 않고, 문구만 비슷한 형식으로 읽는다.
 */
let voice: SpeechSynthesisVoice | null | undefined;

function koVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null; // 아직 로드 전 — 다음 호출에서 다시 찾는다
  voice = list.find((v) => v.lang === "ko-KR" && /Yuna|Google|Heami|Sunhi/i.test(v.name)) ?? list.find((v) => v.lang.startsWith("ko")) ?? null;
  return voice;
}

export function announceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function announce(text: string, volume: number) {
  if (!announceSupported() || volume <= 0) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  const v = koVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.pitch = 1.05;
  u.volume = Math.min(1, volume);
  synth.speak(u);
}

export function stopAnnounce() {
  if (announceSupported()) window.speechSynthesis.cancel();
}
