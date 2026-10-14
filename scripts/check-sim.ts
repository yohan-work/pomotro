/**
 * 시뮬레이션 엔진 불변식 검사 (브라우저 없이 실행)
 *  - 총 시간 = 목표 집중시간
 *  - 위치는 단조 증가, 속도 연속, 속도/가속도 현실 범위
 *  - 정차역 위치에서 속도 0, 역 순서 일치
 */
import { buildJourney, sampleJourney, minJourneySec } from "../src/sim/journey";
import { SEGMENTS, STATIONS, routeDistanceKm, stationsBetween } from "../src/data/line2";
import { LINE2_OFFICIAL_LOOP_KM } from "../src/data/line2.official";

let failures = 0;
const check = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error("  ✗", msg);
  }
};

function run(label: string, ids: string[], totalSec: number) {
  const j = buildJourney({ stationIds: ids, totalSec });
  console.log(`\n▶ ${label}: ${ids.length - 1} segments, total ${j.totalSec.toFixed(1)}s (target ${totalSec}s, min ${minJourneySec(ids)}s)`);
  check(Math.abs(j.totalSec - totalSec) < 0.01, `total ${j.totalSec} != ${totalSec}`);
  for (const s of j.segments) {
    console.log(
      `  ${s.from.nameKo}→${s.to.nameKo}: D=${s.distance.toFixed(0)}m v=${(s.vCruise * 3.6).toFixed(1)}km/h ` +
        `acc ${s.tAccel.toFixed(1)}s cruise ${s.tCruise.toFixed(1)}s dec ${s.tDecel.toFixed(1)}s`,
    );
    check(s.vCruise * 3.6 <= 90 && s.vCruise * 3.6 >= 30, `cruise speed out of range ${s.vCruise}`);
  }
  let prev = sampleJourney(j, 0);
  let maxA = 0;
  let maxJump = 0;
  const dt = 1 / 60;
  const phases: string[] = [];
  for (let t = dt; t <= j.totalSec + 1; t += dt) {
    const s = sampleJourney(j, t);
    check(s.x >= prev.x - 1e-6, `x went backwards at t=${t.toFixed(2)}`);
    maxJump = Math.max(maxJump, Math.abs(s.v - prev.v));
    maxA = Math.max(maxA, Math.abs(s.a));
    if (phases[phases.length - 1] !== s.phase) phases.push(s.phase);
    prev = s;
  }
  console.log(`  max |a| ${maxA.toFixed(2)} m/s², max Δv/frame ${maxJump.toFixed(4)} m/s`);
  console.log(`  phases: ${phases.slice(0, 12).join(" → ")}${phases.length > 12 ? " …" : ""}`);
  check(maxA < 1.6, `acceleration too high ${maxA}`);
  check(maxJump < 0.05, `velocity discontinuity ${maxJump}`);
  check(prev.phase === "COMPLETED", "did not complete");
  j.stopX.forEach((x, i) => {
    const ev = j.events.find((e) => e.type === "arrive" && e.stationIndex === i);
    if (!ev) return;
    const s = sampleJourney(j, ev.t + 0.01);
    check(Math.abs(s.x - x) < 0.01 && s.v === 0, `not stopped at station ${i}`);
    check(s.nextIndex === i, `station index mismatch at ${i}`);
  });
}

// 노선 데이터 ↔ 공식 데이터 정합성
console.log(`▶ data: ${STATIONS.length} stations, ${SEGMENTS.length} segments`);
check(STATIONS.length === 43 && SEGMENTS.length === 43, "Line 2 loop should have 43 stations/segments");
const loopKm = SEGMENTS.reduce((a, s) => a + s.distanceKm, 0);
check(Math.abs(loopKm - LINE2_OFFICIAL_LOOP_KM) < 0.05, `loop km ${loopKm} != official ${LINE2_OFFICIAL_LOOP_KM}`);
check(SEGMENTS.find((s) => s.id === "dangsan__hapjeong")?.runSec === 150, "당산→합정 공식 운행시간 2분30초");
const wrap = stationsBetween("chungjeongno", "euljiro-1ga").map((s) => s.nameKo).join("→");
check(wrap === "충정로→시청→을지로입구", `circular route wrap: ${wrap}`);
check(routeDistanceKm(stationsBetween("dangsan", "hapjeong")) === 2, "당산→합정 2.0km");

run("demo 당산→합정", ["dangsan", "hapjeong"], 100);
run("demo 당산→합정 2분", ["dangsan", "hapjeong"], 120);
run("15분", stationsBetween("dangsan", "city-hall").map((s) => s.id), 15 * 60);
run("25분", stationsBetween("dangsan", "ddp").map((s) => s.id), 25 * 60);
run("잠실철교 단일 구간", ["gangbyeon", "jamsillaru"], 150);
run("40분 왕십리→종합운동장", stationsBetween("wangsimni", "sports-complex").map((s) => s.id), 40 * 60);
run("신림→당산 (지하→고가 진출)", stationsBetween("sillim", "dangsan").map((s) => s.id), 20 * 60);
run("순환 경계 통과 (아현→을지로3가)", stationsBetween("ahyeon", "euljiro-3ga").map((s) => s.id), 10 * 60);
run("60분 (짧은 노선 늘이기)", stationsBetween("dangsan", "sinchon").map((s) => s.id), 60 * 60);

// 휴식(한 역 정차) 여정
{
  const j = buildJourney({ stationIds: ["hapjeong"], totalSec: 300 });
  const mid = sampleJourney(j, 150);
  const end = sampleJourney(j, 300);
  console.log(`\n▶ break at 합정: ${mid.phase} v=${mid.v} doors=${mid.doorsOpen} → ${end.phase}`);
  check(mid.phase === "ARRIVED" && mid.v === 0 && mid.doorsOpen && mid.x === 0, "break: stopped at platform with doors open");
  check(end.phase === "COMPLETED" && Math.abs(mid.remainingSec - 150) < 0.01, "break: completes on time");
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll simulation checks passed");
