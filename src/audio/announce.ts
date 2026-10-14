/**
 * 안내방송 — 브라우저 내장 한국어 음성(Web Speech API). 기본 꺼짐.
 * 실제 기관 안내방송 음원을 쓰지 않고, 문구만 비슷한 형식으로 읽는다.
 */
const voices: Partial<Record<"ko" | "en", SpeechSynthesisVoice | null>> = {};

function pickVoice(lang: "ko" | "en"): SpeechSynthesisVoice | null {
  if (voices[lang] !== undefined) return voices[lang]!;
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null; // 아직 로드 전 — 다음 호출에서 다시 찾는다
  voices[lang] =
    lang === "ko"
      ? (list.find((v) => v.lang === "ko-KR" && /Yuna|Google|Heami|Sunhi/i.test(v.name)) ?? list.find((v) => v.lang.startsWith("ko")) ?? null)
      : (list.find((v) => v.lang === "en-US" && /Samantha|Google/i.test(v.name)) ?? list.find((v) => v.lang.startsWith("en")) ?? null);
  return voices[lang]!;
}

export function announceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function announce(text: string, volume: number, lang: "ko" | "en" = "ko") {
  if (!announceSupported() || volume <= 0) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ko" ? "ko-KR" : "en-US";
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = 0.95;
  u.pitch = 1.05;
  u.volume = Math.min(1, volume);
  synth.speak(u);
}

export function stopAnnounce() {
  if (announceSupported()) window.speechSynthesis.cancel();
}
