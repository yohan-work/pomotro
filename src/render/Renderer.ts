import { sectionAt, type Journey } from "../sim/journey";
import { type RideEvent } from "../sim/rideEvents";
import { applyConditions, type Season, type Weather } from "./conditions";
import { PALETTES, type TimeOfDay } from "./palette";
import { darknessAt, renderScene, type Frame } from "./scene";
import { SpriteCache } from "./sprites";

export interface RenderInput {
  journey: Journey;
  x: number;
  v: number;
  a: number;
  doorsOpen: boolean;
  /** 초 단위 단조 시간 (물결·구름 등 주변 애니메이션) */
  time: number;
  timeOfDay: TimeOfDay;
  season?: Season;
  weather?: Weather;
  reducedMotion: boolean;
  /** auto: 프레임 시간에 따라 자동 / high: 항상 고해상도 / low: 저해상도·간소화 */
  qualityMode?: QualityMode;
  /** 깜짝 이벤트 */
  events?: RideEvent[];
}

export type QualityMode = "auto" | "high" | "low";

/**
 * 창밖 캔버스 렌더러.
 * - 화면 크기/DPR 변화에 맞춰 캔버스를 다시 잡고 스프라이트 캐시를 비운다.
 * - 프레임 시간이 길어지면 해상도(quality)를 자동으로 낮춘다.
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites: SpriteCache;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private quality = 1;
  private doorOpen = 0;
  private darkness = 0;
  private sunAlpha = -1;
  private lastTime = -1;
  private frameAvg = 16;
  private lastPalette: string | null = null;
  private mode: QualityMode = "auto";
  fps = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.sprites = new SpriteCache(1);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => this.sprites.clear()).catch(() => {});
    }
  }

  resize(cssW: number, cssH: number) {
    const maxDpr = this.quality < 0.8 ? 1 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    if (cssW === this.W && cssH === this.H && dpr === this.dpr) return;
    this.W = cssW;
    this.H = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.sprites.clear(dpr);
  }

  /** 렌더 시간 측정 기반 품질 자동 조절 */
  private setMode(mode: QualityMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.quality = mode === "low" ? 0.6 : 1;
    this.dpr = 0;
    this.resize(this.W, this.H);
  }

  private adapt(frameMs: number) {
    this.frameAvg = this.frameAvg * 0.95 + frameMs * 0.05;
    if (this.mode !== "auto") return;
    if (this.frameAvg > 24 && this.quality > 0.6) {
      this.quality = 0.6;
      this.dpr = 0;
      this.resize(this.W, this.H);
    } else if (this.frameAvg < 10 && this.quality < 1) {
      this.quality = 1;
      this.dpr = 0;
      this.resize(this.W, this.H);
    }
  }

  render(input: RenderInput) {
    if (this.W === 0 || this.H === 0) return;
    this.setMode(input.qualityMode ?? "auto");
    const t0 = performance.now();
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, input.time - this.lastTime));
    this.lastTime = input.time;
    if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;

    const season = input.season ?? "autumn";
    const weather = input.weather ?? "clear";
    const palKey = `${input.timeOfDay}:${season}:${weather}`;
    if (this.lastPalette !== palKey) {
      this.sprites.clear();
      this.lastPalette = palKey;
    }

    // 스크린도어 개폐 / 터널 진입 밝기 — 부드럽게 따라간다
    const doorTarget = input.doorsOpen ? 1 : 0;
    this.doorOpen += Math.sign(doorTarget - this.doorOpen) * Math.min(Math.abs(doorTarget - this.doorOpen), dt / 1.4);
    const dTarget = darknessAt(input.journey, input.x);
    this.darkness += (dTarget - this.darkness) * Math.min(1, dt * 2.5);
    // 해는 서쪽(노을)에 있으므로 서향 창에서만 보인다
    const view = sectionAt(input.journey, input.x).view;
    // 흐리거나 비·눈이면 해가 보이지 않는다
    const sTarget = (view === "W" || view === "SW" || view === "NW") && weather === "clear" ? 1 : 0;
    if (this.sunAlpha < 0) this.sunAlpha = sTarget;
    this.sunAlpha += (sTarget - this.sunAlpha) * Math.min(1, dt * 0.8);
    if (dt === 0) {
      this.doorOpen = doorTarget;
      this.darkness = dTarget;
      this.sunAlpha = sTarget;
    }

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";

    // 주행 진동: 속도에 비례하는 아주 작은 상하 흔들림 (모션 감소 시 끔)
    const u = this.H / 100;
    const vn = Math.min(1, Math.abs(input.v) / 20);
    const sway = input.reducedMotion
      ? 0
      : (Math.sin(input.time * 2.3) * 0.12 + Math.sin(input.time * 7.1) * 0.04) * u * vn;
    // 출발·제동 시 관성으로 아주 약간 기우는 느낌 (수평 이동)
    const lean = input.reducedMotion ? 0 : -input.a * 0.35 * u;

    ctx.save();
    ctx.translate(lean, sway);
    ctx.scale(1.02, 1.02);
    ctx.translate(-this.W * 0.01, -this.H * 0.01);

    const frame: Frame = {
      ctx,
      W: this.W,
      H: this.H,
      u,
      cam: input.x,
      v: input.v,
      time: input.time,
      pal: applyConditions(PALETTES[input.timeOfDay], season, weather),
      weather,
      season,
      journey: input.journey,
      sprites: this.sprites,
      quality: this.quality,
      doorOpen: this.doorOpen,
      darkness: this.darkness,
      sunAlpha: this.sunAlpha,
      reducedMotion: input.reducedMotion,
      events: input.events ?? [],
    };
    renderScene(frame);
    ctx.restore();

    this.adapt(performance.now() - t0);
  }

  get stats() {
    return { fps: this.fps, quality: this.quality, renderMs: this.frameAvg, sprites: this.sprites.size, dpr: this.dpr };
  }

  /** 현재 어두움 정도 (실내 조명 연출에 사용) */
  get currentDarkness() {
    return this.darkness;
  }
}
