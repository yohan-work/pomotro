/** 창밖 장면 — 합성 */
import { sectionsInRange, type Journey } from "../../sim/journey";
import { SPEED, WATER_Y, type Frame, visRange } from "./core";
import { drawSky } from "./sky";
import { drawFar } from "./far";
import { riverNearby, drawWater, drawIsland, drawYanghwa, drawBoat, drawBirds, drawLotteTower, drawOlympicBridge } from "./water";
import { drawMid, drawNear } from "./city";
import { drawPlatformBack, drawPlatformFront } from "./station";
import { drawTrack } from "./track";
import { drawDonghoFar, drawDonghoNeighbor } from "./dongho";
import { drawCrossingBridges } from "./gyeongui";
import { drawDongjakFar, drawDongjakNeighbor } from "./bridges";
import { drawPassingTrain } from "./passing";
import { drawBalloons, drawDuckboats, drawMonster, drawPlatformCat } from "./surprise";
import { drawFore, drawPrecip, drawDroplets, drawGlass } from "./effects";

/* ═════════════════════════════ 합성 ═════════════════════════════ */

/** 창 중앙 근처가 실외를 볼 수 있는지 — 보이지 않으면 원경 레이어를 건너뛴다 */
export function outdoorHidden(f: Frame): boolean {
  const [m0, m1] = visRange(f, SPEED.platformBack, 10);
  return sectionsInRange(f.journey, m0, m1).every(
    (s) => s.kind === "tunnel" || (s.kind === "platform" && s.station!.structure === "underground"),
  );
}

/** 0..1: 창 중앙이 얼마나 어두운 구간에 있는지 (터널 = 1) */
export function darknessAt(j: Journey, x: number): number {
  const secs = j.sections;
  let d = 0;
  for (const s of secs) {
    if (x < s.x0 || x > s.x1) continue;
    if (s.kind === "tunnel") d = 1;
    else if (s.kind === "platform") d = s.station!.structure === "underground" ? 0.35 : 0;
    else if (s.kind === "portal-in") d = Math.min(1, Math.max(0, (x - s.x0) / (s.x1 - s.x0))) * 0.7;
    else if (s.kind === "portal-out") d = (1 - Math.min(1, Math.max(0, (x - s.x0) / (s.x1 - s.x0)))) * 0.7;
  }
  return d;
}

export function renderScene(f: Frame) {
  const { ctx } = f;
  if (!outdoorHidden(f)) {
    drawSky(f);
    drawFar(f);
    drawBalloons(f);
    for (const sec of f.journey.sections) {
      if (sec.kind !== "river") continue;
      if (sec.variant === "hangang-jamsil") drawLotteTower(f, sec);
      else if (sec.variant === "hangang-dongho") drawDonghoFar(f, sec);
      else if (sec.variant === "hangang-dongjak") drawDongjakFar(f, sec);
      else if (sec.variant === "hangang-cheongdam" && !(sec.view === "W" || sec.view === "NW" || sec.view === "SW")) drawLotteTower(f, sec);
    }
    if (riverNearby(f)) {
      drawWater(f);
      drawBirds(f);
      for (const sec of f.journey.sections) {
        if (sec.kind !== "river") continue;
        if (sec.variant === "hangang-yanghwa") {
          drawIsland(f, sec);
          drawBoat(f, sec);
          drawYanghwa(f, sec);
        } else if (sec.variant === "hangang-jamsil") {
          drawBoat(f, sec);
          drawOlympicBridge(f, sec);
        } else if (sec.variant === "hangang-dongho") {
          drawBoat(f, sec);
          drawDonghoNeighbor(f, sec);
        } else if (sec.variant === "hangang-dongjak") {
          drawBoat(f, sec);
          drawDongjakNeighbor(f, sec);
        } else if (sec.variant === "hangang-cheongdam") {
          drawBoat(f, sec);
          // 북행 서쪽 창: 영동대교 (거더교 — 동호대교 장면의 이웃 다리와 같은 모양)
          if (sec.view === "W" || sec.view === "NW" || sec.view === "SW") drawDonghoNeighbor(f, sec);
        }
      }
      drawMonster(f);
      drawDuckboats(f);
      for (const sec of f.journey.sections) if (sec.kind === "riverside") drawCrossingBridges(f, sec);
    } else {
      ctx.fillStyle = f.pal.groundFar;
      ctx.fillRect(0, WATER_Y * f.u, f.W, f.H);
    }
    drawMid(f);
    drawNear(f);
    drawPrecip(f);
  }
  drawPlatformBack(f);
  drawPlatformFront(f);
  drawPlatformCat(f);
  drawTrack(f);
  drawPassingTrain(f);
  drawFore(f);
  if (f.weather === "rain") drawDroplets(f);
  drawGlass(f);
}

export { SPEED, type Frame } from "./core";
export { PASSING, passingIntensity, passingTrains } from "./passing";
