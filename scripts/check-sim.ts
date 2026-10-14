/**
 * 시뮬레이션 엔진 불변식 검사 (브라우저 없이 실행)
 *  - 총 시간 = 목표 집중시간
 *  - 위치는 단조 증가, 속도 연속, 속도/가속도 현실 범위
 *  - 정차역 위치에서 속도 0, 역 순서 일치
 */
import { buildJourney, sampleJourney, minJourneySec } from "../src/sim/journey";
import { stationsBetween } from "../src/data/line2";

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

run("demo 당산→합정", ["dangsan", "hapjeong"], 100);
run("demo 당산→합정 2분", ["dangsan", "hapjeong"], 120);
run("15분", stationsBetween("dangsan", "city-hall").map((s) => s.id), 15 * 60);
run("25분", stationsBetween("dangsan", "ddp").map((s) => s.id), 25 * 60);
run("잠실철교 단일 구간", ["gangbyeon", "jamsillaru"], 150);
run("40분 왕십리→종합운동장", stationsBetween("wangsimni", "sports-complex").map((s) => s.id), 40 * 60);
run("신림→당산 (지하→고가 진출)", stationsBetween("sillim", "dangsan").map((s) => s.id), 20 * 60);
run("60분 (짧은 노선 늘이기)", stationsBetween("dangsan", "sinchon").map((s) => s.id), 60 * 60);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll simulation checks passed");
