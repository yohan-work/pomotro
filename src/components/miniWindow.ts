/**
 * 미니 창 — Document Picture-in-Picture 로 창밖 풍경·남은 시간·다음 역을 작은 창에 띄운다.
 *
 * - 메인 탭이 가려지면 메인 rAF 가 멈추므로, 미니 창은 자기 창의 rAF 로 직접 그린다 (같은 순수 함수 sampleJourney).
 * - 완료 판정·소리·이벤트는 메인 화면이 그대로 맡는다 (숨겨진 탭에서는 Worker 틱).
 * - DOM 은 직접 만든다 (React 포털 없이) — 글자만 4Hz 로 바꾼다.
 */
import { Renderer, type QualityMode } from "@/render/Renderer";
import type { Season, Weather } from "@/render/conditions";
import type { TimeOfDay } from "@/render/palette";
import type { Journey, SimSample } from "@/sim/journey";
import type { RideEvent } from "@/sim/rideEvents";

interface DocPip {
  requestWindow(opts: { width: number; height: number }): Promise<Window>;
  window: Window | null;
}
const api = () => (typeof window !== "undefined" ? (window as unknown as { documentPictureInPicture?: DocPip }).documentPictureInPicture : undefined);

export const miniWindowSupported = () => Boolean(api());

export interface MiniLive {
  tod: TimeOfDay;
  reducedMotion: boolean;
  quality: QualityMode;
  season: Season;
  weather: Weather;
  events: RideEvent[];
}

export interface MiniOptions {
  journey: Journey;
  /** 지금 시뮬레이션 상태 (메인 화면과 같은 함수) */
  sample: () => { sample: SimSample; paused: boolean };
  live: () => MiniLive;
  /** 남은 시간·다음 역 등 글자 */
  text: (s: SimSample, paused: boolean) => { time: string; label: string; color: string; badge: string };
  labels: { pause: string; resume: string; title: string };
  onTogglePause: () => void;
  onClose: () => void;
}

// 버튼 아이콘 — 이모지 대신 자체 SVG (Icons.tsx 와 같은 모양)
const PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;
const PAUSE = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/></svg>`;

const CSS = `
html,body{margin:0;height:100%;background:#111;overflow:hidden;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo",system-ui,sans-serif;color:#fff}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.hud{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(transparent,rgba(0,0,0,.55))}
.badge{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 5px;border-radius:999px;font-size:12px;font-weight:800;color:#fff}
.time{font-size:26px;font-weight:800;letter-spacing:.02em;font-variant-numeric:tabular-nums;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.label{flex:1;min-width:0;font-size:12.5px;font-weight:600;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 4px rgba(0,0,0,.5)}
button{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:999px;background:rgba(255,255,255,.9);color:#222;cursor:pointer}
.veil{position:absolute;inset:0;display:none;place-items:center;background:rgba(20,22,30,.45);font-size:15px;font-weight:700}
.paused .veil{display:grid}
`;

/** 미니 창을 연다. 닫는 함수를 돌려준다 (이미 열려 있으면 그 창을 닫고 새로 연다). */
export async function openMiniWindow(o: MiniOptions): Promise<() => void> {
  const pip = api();
  if (!pip) throw new Error("Document Picture-in-Picture not supported");
  pip.window?.close();
  const win = await pip.requestWindow({ width: 400, height: 240 });
  const doc = win.document;
  doc.title = o.labels.title;
  // 메인 문서의 글꼴(@font-face)을 가져온다
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules).filter((r) => r instanceof CSSFontFaceRule).map((r) => r.cssText).join("\n");
      if (rules) {
        const st = doc.createElement("style");
        st.textContent = rules;
        doc.head.append(st);
      }
    } catch {
      /* 다른 출처 스타일시트는 건너뛴다 */
    }
  }
  const style = doc.createElement("style");
  style.textContent = CSS;
  doc.head.append(style);
  doc.body.innerHTML = `<canvas aria-hidden="true"></canvas><div class="veil"></div><div class="hud"><span class="badge"></span><span class="time"></span><span class="label"></span><button type="button"></button></div>`;
  const canvas = doc.querySelector("canvas")!;
  const veil = doc.querySelector<HTMLElement>(".veil")!;
  const badge = doc.querySelector<HTMLElement>(".badge")!;
  const time = doc.querySelector<HTMLElement>(".time")!;
  const label = doc.querySelector<HTMLElement>(".label")!;
  const btn = doc.querySelector<HTMLButtonElement>("button")!;
  btn.addEventListener("click", o.onTogglePause);

  const renderer = new Renderer(canvas);
  const fit = () => renderer.resize(win.innerWidth, win.innerHeight);
  fit();
  win.addEventListener("resize", fit);

  let raf = 0;
  let lastText = 0;
  let closed = false;
  const frame = () => {
    if (closed) return;
    const { sample, paused } = o.sample();
    const L = o.live();
    renderer.render({
      journey: o.journey,
      x: sample.x,
      v: sample.v,
      a: paused ? 0 : sample.a,
      doorsOpen: sample.doorsOpen,
      time: performance.now() / 1000,
      timeOfDay: L.tod,
      reducedMotion: L.reducedMotion,
      qualityMode: L.quality === "high" ? "auto" : L.quality,
      season: L.season,
      weather: L.weather,
      events: L.events,
    });
    const now = performance.now();
    if (now - lastText > 250) {
      lastText = now;
      const tx = o.text(sample, paused);
      if (time.textContent !== tx.time) time.textContent = tx.time;
      if (label.textContent !== tx.label) label.textContent = tx.label;
      badge.textContent = tx.badge;
      badge.style.background = tx.color;
      const icon = paused ? PLAY : PAUSE;
      if (btn.dataset.icon !== icon) {
        btn.dataset.icon = icon;
        btn.innerHTML = icon;
      }
      btn.setAttribute("aria-label", paused ? o.labels.resume : o.labels.pause);
      veil.textContent = paused ? o.labels.pause : "";
      doc.body.classList.toggle("paused", paused);
    }
    raf = win.requestAnimationFrame(frame);
  };
  raf = win.requestAnimationFrame(frame);

  const close = () => {
    if (closed) return;
    closed = true;
    win.cancelAnimationFrame(raf);
    win.close();
  };
  win.addEventListener("pagehide", () => {
    closed = true;
    o.onClose();
  });
  return close;
}
