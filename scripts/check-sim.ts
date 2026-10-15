/**
 * 시뮬레이션 엔진 불변식 검사 (브라우저 없이 실행)
 *  - 총 시간 = 목표 집중시간
 *  - 위치는 단조 증가, 속도 연속, 속도/가속도 현실 범위
 *  - 정차역 위치에서 속도 0, 역 순서 일치
 */
import { buildJourney, sampleJourney, minJourneySec } from "../src/sim/journey";
import { SEGMENTS, STATIONS } from "../src/data/line2";
import { routeDistanceKm, stationsBetween } from "../src/data/lines";
import { LINE2_OFFICIAL_LOOP_KM } from "../src/data/line2.official";
import { LINE3 } from "../src/data/line3";
import { LINE3_OFFICIAL_KM } from "../src/data/line3.official";
import { getStation } from "../src/data/lines";

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

// 3호선
console.log(`▶ line 3: ${LINE3.stations.length} stations, ${LINE3.segments.length} directed segments`);
check(LINE3.stations.length === 34 && LINE3.segments.length === 66, "Line 3 should have 34 stations and 33×2 segments");
const l3km = LINE3.segments.filter((_, i) => i % 2 === 0).reduce((a, s) => a + s.distanceKm, 0);
check(Math.abs(l3km - LINE3_OFFICIAL_KM) < 0.05, `line 3 km ${l3km} != official ${LINE3_OFFICIAL_KM}`);
check(routeDistanceKm(stationsBetween("l3-oksu", "l3-apgujeong")) === 2.1, "옥수→압구정 2.1km");
const back = stationsBetween("l3-apgujeong", "l3-geumho").map((s) => s.nameKo).join("→");
check(back === "압구정→옥수→금호", `line 3 reverse route: ${back}`);
check(getStation("l3-euljiro-3ga").nameKo === getStation("euljiro-3ga").nameKo, "transfer station names match");

// 경의중앙선 (국가철도공단 데이터, 운행시간 추정)
{
  const { LINE_GJ } = await import("../src/data/lineGJ");
  console.log(`▶ Gyeongui–Jungang: ${LINE_GJ.stations.length} stations, ${LINE_GJ.segments.length} directed segments`);
  check(LINE_GJ.stations.length === 53 && LINE_GJ.runTimeEstimated === true, "GJ 53 stations (문산~지평), run times flagged as estimated");
  const km = LINE_GJ.segments.filter((_, i) => i % 2 === 0).reduce((a, s) => a + s.distanceKm, 0);
  check(Math.abs(km - 122.3) < 0.05, `GJ total km ${km}`);
  const west = stationsBetween("gj-hannam", "gj-seobinggo");
  check(west.length === 2 && getStation("gj-hannam").nameEn === "Hannam", "GJ westbound riverside route");
}

// 서울교통공사 1·4·5·6·7·8호선 (+ 5호선 마천지선, 6호선 응암순환)
{
  const { METRO_OFFICIAL } = await import("../src/data/metro.official");
  const { LINE_BY_ID } = await import("../src/data/lines");
  const { latLonOf } = await import("../src/data/geo");
  const expect: Record<string, [number, number]> = { "1": [10, 7.8], "4": [26, 31.1], "5": [49, 52.8], "5M": [8, 7.0], "6": [34, 29.8], "6L": [6, 6.6], "7": [42, 46.9], "8": [19, 18.8] };
  for (const [id, [n, km]] of Object.entries(expect)) {
    const line = LINE_BY_ID[id as keyof typeof LINE_BY_ID];
    const segs = line.loop ? line.segments : line.segments.filter((_, i) => i % 2 === 0);
    const total = segs.reduce((a, s) => a + s.distanceKm, 0);
    check(line.stations.length === n, `${line.nameKo}: ${line.stations.length} stations (expected ${n})`);
    check(Math.abs(total - km) < 0.05, `${line.nameKo}: ${total.toFixed(1)} km (expected ${km})`);
    check(line.stations.every((st) => st.code && st.nameEn && latLonOf(st)), `${line.nameKo}: every station has official code, English name, coordinates`);
    check(METRO_OFFICIAL[id as keyof typeof METRO_OFFICIAL].segments.every((s) => s.runSec > 0), `${line.nameKo}: official run times`);
  }
  console.log(`▶ metro lines 1·4·5·6·7·8: ${Object.keys(expect).length} line definitions`);
  check(getStation("l4-buramsan").nameKo === "불암산", "renamed station shown with current name (당고개 → 불암산)");
  const loop6 = stationsBetween("l6l-gusan", "l6l-yeokchon").map((s) => s.nameKo).join("→");
  check(loop6 === "구산→응암→역촌", `6호선 응암순환 one-way wrap: ${loop6}`);
  // 2·3호선 역번호·영문명은 공식 데이터와 같아야 한다
  for (const n of ["2", "3"] as const)
    for (const st of LINE_BY_ID[n].stations) {
      const o = METRO_OFFICIAL[n].stations.find((x) => x.nameKo === st.nameKo);
      check(o?.code === st.code && o?.nameEn === st.nameEn, `${n}호선 ${st.nameKo}: code/English match official (${o?.code} ${o?.nameEn})`);
    }
}

// 환승 (서울교통공사 공식 환승 거리·소요시간)
{
  const { findRoute, transferBetween } = await import("../src/data/lines");
  const r = findRoute("l4-ichon", "dangsan")!;
  const path = r.map((s) => `${s.line}:${s.nameKo}`).join(" ");
  check(r.filter((s, i) => i > 0 && r[i - 1].line !== s.line).length === 1 && path.includes("4:사당 2:사당"), `이촌(4) → 당산: 사당에서 한 번 환승 (${path})`);
  check(transferBetween("sadang", "l4-sadang")?.meters === 74 && transferBetween("sadang", "l4-sadang")?.sec === 62, "사당 2↔4호선 공식 환승 74m · 1분 2초");
  check(findRoute("l7-jayang", "hapjeong")!.at(-1)!.line !== "2" || findRoute("l7-jayang", "hapjeong")!.at(-2)!.nameKo !== "합정", "도착역에서 괜히 갈아타지 않는다");
  const ids = r.map((s) => s.id);
  run("환승 이촌(4)→사당→당산(2)", ids, 45 * 60);
  const j = buildJourney({ stationIds: ids, totalSec: 45 * 60 });
  const tr = j.transfers[0];
  check(j.transfers.length === 1 && Math.abs(tr.t1 - tr.t0 - 62) < 0.01, `transfer phase lasts the official 62s (${(tr.t1 - tr.t0).toFixed(1)}s)`);
  const mid = sampleJourney(j, (tr.t0 + tr.t1) / 2 + 1);
  check(mid.phase === "TRANSFER" && mid.v === 0 && j.stations[mid.stationIndex].line === "2", "after half the walk the view is on the Line 2 platform");
  const after = sampleJourney(j, tr.t1 + 1);
  check(after.phase === "BOARDING" && after.doorsOpen, "board the Line 2 train after the transfer");
  check(minJourneySec(ids) < 45 * 60, `min journey ${minJourneySec(ids)}s`);
}

run("demo 당산→합정", ["dangsan", "hapjeong"], 100);
run("동작대교 남행 이촌→동작", ["l4-ichon", "l4-dongjak"], 200);
run("청담대교 북행 청담→자양", ["l7-cheongdam", "l7-jayang"], 200);
run("4호선 장거리 불암산→남태령", stationsBetween("l4-buramsan", "l4-namtaeryeong").map((s) => s.id), 70 * 60);
run("demo 당산→합정 2분", ["dangsan", "hapjeong"], 120);
run("15분", stationsBetween("dangsan", "city-hall").map((s) => s.id), 15 * 60);
run("25분", stationsBetween("dangsan", "ddp").map((s) => s.id), 25 * 60);
run("잠실철교 단일 구간", ["gangbyeon", "jamsillaru"], 150);
run("40분 왕십리→종합운동장", stationsBetween("wangsimni", "sports-complex").map((s) => s.id), 40 * 60);
run("신림→당산 (지하→고가 진출)", stationsBetween("sillim", "dangsan").map((s) => s.id), 20 * 60);
run("순환 경계 통과 (아현→을지로3가)", stationsBetween("ahyeon", "euljiro-3ga").map((s) => s.id), 10 * 60);
run("동호대교 남행 옥수→압구정", ["l3-oksu", "l3-apgujeong"], 140);
run("동호대교 북행 압구정→옥수", ["l3-apgujeong", "l3-oksu"], 140);
run("3호선 25분 충무로→양재", stationsBetween("l3-chungmuro", "l3-yangjae").map((s) => s.id), 25 * 60);
run("경의중앙 강변 서행 왕십리→용산", stationsBetween("gj-wangsimni", "gj-yongsan").map((s) => s.id), 15 * 60);
run("경의중앙 팔당 덕소→양수", stationsBetween("gj-deokso", "gj-yangsu").map((s) => s.id), 15 * 60);
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
