/**
 * 여행 하이라이트 영상 — 완주한 여행을 약 12초 영상으로 (서버 없이 브라우저에서).
 *
 * - 시뮬레이션이 시간의 순수 함수라서 여정의 어느 순간이든 바로 그릴 수 있다 → 볼거리 순간만 골라 잇는다
 *   (출발 → 한강 다리·고가·창밖 깜짝 이벤트 → 도착 → 승차권)
 * - 각 장면은 실제 속도 그대로 (빨리 돌리지 않는다). 장면 사이는 짧게 어두워졌다 밝아진다 (번쩍임 없음)
 * - 캔버스를 MediaRecorder 로 실시간 녹화. mp4 를 지원하면 mp4, 아니면 webm
 */
import { findRoute, getStation, stationsBetween } from "@/data/lines";
import { stationName, tr, type Lang } from "@/i18n";
import { Renderer } from "@/render/Renderer";
import { seasonKST, type Season } from "@/render/conditions";
import { timeOfDayKST, type TimeOfDay } from "@/render/palette";
import { buildJourney, sampleJourney, type Journey } from "@/sim/journey";
import { planRideEvents, seedOf } from "@/sim/rideEvents";
import type { RideRecord } from "@/store/useAppStore";
import { TICKET_H, TICKET_W, drawTicket } from "./ticket";

export const VIDEO_W = 1280;
export const VIDEO_H = 720;
const FPS = 30;
const FADE = 0.35;

interface Shot {
  /** 여정 시각 (초) */
  t0: number;
  dur: number;
}

export function highlightSupported(): boolean {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return false;
  const c = document.createElement("canvas");
  return typeof c.captureStream === "function" && Boolean(pickMime());
}

function pickMime(): string | null {
  for (const m of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

function routeOf(rec: RideRecord): string[] {
  if (rec.stationIds) return rec.stationIds;
  try {
    return stationsBetween(rec.fromId, rec.toId).map((s) => s.id);
  } catch {
    return (findRoute(rec.fromId, rec.toId) ?? []).map((s) => s.id);
  }
}

/** 볼거리 순간 고르기 — 출발, 한강 다리(최대 2), 창밖 깜짝 이벤트, 지상 구간, 도착 */
export function pickShots(j: Journey, events: ReturnType<typeof planRideEvents>): Shot[] {
  const timeAt = (x: number) => {
    let lo = 0;
    let hi = j.totalSec;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (sampleJourney(j, mid).x < x) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const last = j.stopX.length - 1;
  const first = j.segments[0];
  const shots: Shot[] = [{ t0: Math.max(0, first.tStart - 1.5), dur: 3 }];
  const inRoute = j.sections.filter((s) => s.x0 >= 0 && s.x1 <= j.stopX[last]);
  const rivers = inRoute.filter((s) => s.kind === "river" && s.variant !== "stream").slice(0, 2);
  for (const r of rivers) shots.push({ t0: timeAt((r.x0 + r.x1) / 2) - 1.5, dur: 3 });
  for (const e of events) if (e.m !== undefined && e.kind !== "ttorong" && shots.length < 4) shots.push({ t0: e.t0 + 1, dur: 2.5 });
  if (shots.length < 3) {
    const open = inRoute.find((s) => (s.kind === "city" || s.kind === "riverside" || s.kind === "bank") && s.x1 - s.x0 > 120);
    if (open) shots.push({ t0: timeAt((open.x0 + open.x1) / 2) - 1.5, dur: 3 });
  }
  const arrive = j.events.find((e) => e.type === "arrive" && e.stationIndex === last);
  shots.push({ t0: (arrive?.t ?? j.totalSec) - 3, dur: 3.5 });
  return shots.sort((a, b) => a.t0 - b.t0).filter((s, i, arr) => i === 0 || s.t0 >= arr[i - 1].t0 + arr[i - 1].dur);
}

export interface HighlightResult {
  blob: Blob;
  ext: "mp4" | "webm";
}

export async function makeHighlight(rec: RideRecord, lang: Lang, todaySec: number, onProgress: (p: number) => void, todPref?: TimeOfDay): Promise<HighlightResult> {
  const mime = pickMime();
  if (!mime) throw new Error("unsupported");
  const ids = routeOf(rec);
  const journey = buildJourney({ stationIds: ids, totalSec: rec.focusSec });
  const events = planRideEvents(journey, seedOf(rec.id));
  const shots = pickShots(journey, events);
  const done = new Date(rec.completedAt);
  const tod: TimeOfDay = todPref ?? timeOfDayKST(done);
  const season: Season = seasonKST(done);

  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext("2d")!;
  const scene = document.createElement("canvas");
  const renderer = new Renderer(scene);
  renderer.resize(VIDEO_W, VIDEO_H, 1);
  const ticket = document.createElement("canvas");
  ticket.width = TICKET_W;
  ticket.height = TICKET_H;
  drawTicket(ticket.getContext("2d")!, rec, todaySec, lang);

  const from = getStation(ids[0]);
  const to = getStation(ids[ids.length - 1]);
  const title = `${stationName(from, lang)} → ${stationName(to, lang)}`;
  const sub = tr(lang, "video.sub", { n: Math.round(rec.focusSec / 60), km: rec.distanceKm.toFixed(1) });

  const ENDCARD = 2.6;
  const total = shots.reduce((a, s) => a + s.dur, 0) + ENDCARD;
  const stream = canvas.captureStream(FPS);
  const rec2 = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec2.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((res) => (rec2.onstop = () => res()));

  const drawText = (alpha: number) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, VIDEO_H - 200, 0, VIDEO_H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, VIDEO_H - 200, VIDEO_W, 200);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.font = "800 22px Pretendard, sans-serif";
    ctx.fillText("METRO", 48, VIDEO_H - 112);
    ctx.font = "800 48px Pretendard, sans-serif";
    ctx.fillText(title, 48, VIDEO_H - 60);
    ctx.font = "600 22px Pretendard, sans-serif";
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillText(sub, 48, VIDEO_H - 26);
    ctx.restore();
  };

  await document.fonts?.ready.catch(() => {});
  rec2.start(250);
  const t0 = performance.now();
  let shotIdx = -1;
  await new Promise<void>((resolve) => {
    const frame = () => {
      const el = (performance.now() - t0) / 1000;
      onProgress(Math.min(1, el / total));
      if (el >= total) return resolve();
      // 어느 장면인지
      let acc = 0;
      let k = 0;
      while (k < shots.length && el >= acc + shots[k].dur) acc += shots[k++].dur;
      if (k < shots.length) {
        const shot = shots[k];
        const local = el - acc;
        if (k !== shotIdx) {
          shotIdx = k;
          renderer.cut();
        }
        const t = Math.min(journey.totalSec - 0.01, shot.t0 + local);
        const s = sampleJourney(journey, t);
        renderer.render({
          journey,
          x: s.x,
          v: s.v,
          a: s.a,
          doorsOpen: s.doorsOpen,
          time: t,
          timeOfDay: tod,
          season,
          weather: "clear",
          reducedMotion: false,
          qualityMode: "high",
          events,
        });
        ctx.drawImage(scene, 0, 0, VIDEO_W, VIDEO_H);
        // 장면 사이: 짧게 어두워졌다 밝아진다
        const fade = Math.min(1, local / FADE, (shot.dur - local) / FADE);
        if (fade < 1) {
          ctx.fillStyle = `rgba(12,12,16,${(1 - Math.max(0, fade)) * 0.85})`;
          ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
        }
        // 제목은 첫 장면에
        if (k === 0) drawText(Math.min(1, local / 0.5, (shot.dur - local) / 0.5));
      } else {
        // 끝: 승차권
        const local = el - acc;
        const a = Math.min(1, local / 0.5);
        ctx.fillStyle = "#1c1d22";
        ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
        ctx.globalAlpha = a;
        const w = VIDEO_W * 0.78;
        const h = (w * TICKET_H) / TICKET_W;
        ctx.drawImage(ticket, (VIDEO_W - w) / 2, (VIDEO_H - h) / 2 - 24, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "600 20px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("pomotro.vercel.app", VIDEO_W / 2, VIDEO_H - 40);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  rec2.stop();
  await stopped;
  stream.getTracks().forEach((tk) => tk.stop());
  const type = mime.split(";")[0];
  return { blob: new Blob(chunks, { type }), ext: type === "video/mp4" ? "mp4" : "webm" };
}
