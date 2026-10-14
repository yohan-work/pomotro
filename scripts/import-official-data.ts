/**
 * 공식 데이터 가져오기 — 서울교통공사 「역간거리 및 소요시간」 (서울 열린데이터광장 OA-12034)
 *
 *   npm run data:import            # 원본 다운로드 → data/official/*.csv → src/data/line2.official.ts 생성
 *   npm run data:import -- --offline   # 이미 받은 CSV 로 재생성만
 *
 * 라이선스: 공공누리 제1유형 (출처표시, 상업적 이용·변경 가능). 출처: 서울교통공사.
 * 원본은 CP949 인코딩이며 UTF-8 로 변환해 저장한다. 값은 그대로 둔다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DATASET = {
  id: "OA-12034",
  title: "서울교통공사_역간거리 및 소요시간",
  page: "https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do",
  file: "서울교통공사 역간거리 및 소요시간_240810.csv",
  fileSeq: "9",
  updated: "2024-09-02",
  provider: "서울교통공사 (수송운영처)",
  license: "공공누리 제1유형 (출처표시)",
};
const CSV_PATH = "data/official/seoul-metro-station-distance-240810.csv";
const OUT = "src/data/line2.official.ts";

if (!process.argv.includes("--offline")) {
  mkdirSync("data/official", { recursive: true });
  const raw = execFileSync("curl", [
    "-sfL",
    "-X",
    "POST",
    "https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?&useCache=false",
    "-H",
    "Referer: https://data.seoul.go.kr/",
    "--data",
    `infId=${DATASET.id}&seqNo=&seq=${DATASET.fileSeq}&infSeq=1`,
  ]);
  const utf8 = new TextDecoder("euc-kr").decode(raw);
  if (!utf8.startsWith("연번,호선,역명")) throw new Error("Unexpected CSV header — dataset format changed?");
  writeFileSync(CSV_PATH, utf8.replace(/\r\n/g, "\n"));
  console.log(`downloaded → ${CSV_PATH}`);
}

const rows = readFileSync(CSV_PATH, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => l.split(","))
  .filter((c) => c[1] === "2");

// 본선 순환: 첫 '시청'부터 다시 '시청'까지 (이후 행은 성수·신정 지선)
const start = rows.findIndex((c) => c[2] === "시청");
const end = rows.findIndex((c, i) => i > start && c[2] === "시청");
if (start < 0 || end < 0) throw new Error("Line 2 loop not found");
const loop = rows.slice(start, end + 1);

const toSec = (mmss: string) => {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
};

const segments = loop.slice(1).map((c, i) => ({
  from: loop[i][2],
  to: c[2],
  runSec: toSec(c[3]),
  distanceKm: Number(c[4]),
}));
const total = Number(loop[loop.length - 1][5]);
const sum = segments.reduce((a, s) => a + s.distanceKm, 0);
if (Math.abs(sum - total) > 0.05) throw new Error(`distance sum ${sum} != cumulative ${total}`);

const body = `/**
 * 자동 생성 파일 — 직접 수정하지 말 것. \`npm run data:import\` 로 다시 만든다.
 *
 * 출처: ${DATASET.provider}, 「${DATASET.title}」 (서울 열린데이터광장 ${DATASET.id})
 *       ${DATASET.page}
 * 파일: ${DATASET.file} (데이터 갱신일 ${DATASET.updated})
 * 라이선스: ${DATASET.license}
 * 비고: 운행시간은 열차가 출발해 다음 역에 도착하는 표준 운행시간이며 열차 사정에 따라 달라질 수 있다 (정차시간 미포함).
 */

export const OFFICIAL_SOURCE = ${JSON.stringify({ ...DATASET, csv: CSV_PATH }, null, 2)} as const;

/** 2호선 본선 내선순환 (시청 → … → 충정로 → 시청) 인접 역간 표준 운행시간·거리 */
export const LINE2_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; runSec: number; distanceKm: number }> = ${JSON.stringify(segments, null, 2)};

/** 본선 총 연장 (km) */
export const LINE2_OFFICIAL_LOOP_KM = ${total};
`;
writeFileSync(OUT, body);
console.log(`${segments.length} segments, ${total} km → ${OUT}`);

/* ───────── 3호선 (서울교통공사 구간 지축 → 오금) ───────── */
const rows3 = readFileSync(CSV_PATH, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => l.split(","))
  .filter((c) => c[1] === "3");
if (rows3[0]?.[2] !== "지축" || rows3[rows3.length - 1]?.[2] !== "오금") throw new Error("Line 3 range changed");
const seg3 = rows3.slice(1).map((c, i) => ({ from: rows3[i][2], to: c[2], runSec: toSec(c[3]), distanceKm: Number(c[4]) }));
const total3 = Number(rows3[rows3.length - 1][5]);
const sum3 = seg3.reduce((a, s) => a + s.distanceKm, 0);
if (Math.abs(sum3 - total3) > 0.05) throw new Error(`line 3 distance sum ${sum3} != cumulative ${total3}`);
const OUT3 = "src/data/line3.official.ts";
writeFileSync(
  OUT3,
  `/**
 * 자동 생성 파일 — 직접 수정하지 말 것. \`npm run data:import\` 로 다시 만든다.
 * 출처·라이선스: line2.official.ts 와 같은 데이터셋 (${DATASET.title}, ${DATASET.updated} 갱신, ${DATASET.license})
 */

/** 3호선 지축 → 오금 인접 역간 표준 운행시간·거리 (서울교통공사 운영 구간) */
export const LINE3_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; runSec: number; distanceKm: number }> = ${JSON.stringify(seg3, null, 2)};

export const LINE3_OFFICIAL_KM = ${total3};
`,
);
console.log(`${seg3.length} segments, ${total3} km → ${OUT3}`);

/* ───────── 경의중앙선 (코레일 운영, 국가철도공단 데이터) ─────────
 * - 역간거리: 국가철도공단_경의중앙선_역간거리 (data.go.kr 15041327) — 값은 "다음 역까지" 거리.
 *   역 위치로 구한 직선거리와 대조해 확인했다 (반대 해석은 오차가 5배 이상).
 * - 역위치: 국가철도공단_경의중앙선_역위치 (15041487) — 위도·경도 → 진행 방위 계산
 * - 영문역명: 국가철도공단_RAFIS_역 정보 (15132601)
 * - 운행시간은 공개 데이터가 없어 이 파일에 넣지 않는다 (lineGJ.ts 에서 거리 기반 추정, 화면에 "추정" 표기)
 */
const GJ_FILES = [
  { id: "15041327", file: "data/official/krna-gyeongui-jungang-distance.csv", atch: "FILE_000000007709572" },
  { id: "15041487", file: "data/official/krna-gyeongui-jungang-position.csv", atch: "FILE_000000003510121" },
  { id: "15132601", file: "data/official/krna-rafis-stations.csv", atch: "FILE_000000002993444" },
];
if (!process.argv.includes("--offline")) {
  for (const f of GJ_FILES) {
    const raw = execFileSync("curl", ["-sfL", `https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=${f.atch}&fileDetailSn=1&insertDataPrcus=N`]);
    // 국가철도공단 파일은 CP949 — UTF-8 로 저장
    let text = new TextDecoder("euc-kr").decode(raw);
    if (!text.includes("역명")) text = new TextDecoder("utf-8").decode(raw);
    writeFileSync(f.file, text.replace(/\r\n/g, "\n"));
    console.log(`downloaded → ${f.file}`);
  }
}
const csvRows = (path: string) => {
  const [head, ...rest] = readFileSync(path, "utf8").trim().split("\n");
  const cols = head.split(",");
  return rest.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])) as Record<string, string>);
};
const gjDist = csvRows(GJ_FILES[0].file);
const gjPos = csvRows(GJ_FILES[1].file);
const rafis = csvRows(GJ_FILES[2].file);
const names = gjDist.map((r) => r["역명"]);
// 본선 문산 → 지평 (도라산·임진강·운천 DMZ 셔틀 구간과 서울역 지선 제외)
const i0 = names.indexOf("문산");
const i1 = names.indexOf("지평");
if (i0 < 0 || i1 < 0) throw new Error("Gyeongui–Jungang range changed");
const main = gjDist.slice(i0, i1 + 1);
const posOf = (n: string) => {
  const p = gjPos.find((r) => r["역명"] === n);
  if (!p) throw new Error(`position missing: ${n}`);
  return { lat: Number(p["위도"]), lon: Number(p["경도"]) };
};
const enOf = (n: string) => rafis.find((r) => r["역명"] === n || r["역명"] === n.split("(")[0])?.["영문역명"] ?? null;
const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const gjStations = main.map((r) => ({ nameKo: r["역명"], nameEnOfficial: enOf(r["역명"]), ...posOf(r["역명"]), positionSuspect: false }));
// 선로 거리는 직선거리보다 짧을 수 없다 (0.1km 반올림 여유). 어긋나는 구간을 찾는다
const short = main.slice(0, -1).map((r, i) => Number(r["역간거리(km)"]) < haversine(gjStations[i], gjStations[i + 1]) * 0.75 - 0.15);
// 어긋난 구간의 두 끝 중, 반대쪽 이웃 구간 비율도 낮은(직선거리가 너무 긴) 역의 좌표가 틀린 것
// (예: 한국항공대 — 실제와 약 5km 차이) → 방위 계산에서 제외
const ratio = (i: number) =>
  i < 0 || i >= main.length - 1 ? 1 : Number(main[i]["역간거리(km)"]) / Math.max(0.01, haversine(gjStations[i], gjStations[i + 1]));
short.forEach((bad, i) => {
  if (!bad) return;
  const suspect = ratio(i - 1) < ratio(i + 1) ? i : i + 1;
  gjStations[suspect].positionSuspect = true;
});
const suspects = gjStations.filter((s) => s.positionSuspect).map((s) => s.nameKo);
const unexplained = short.filter((x, i) => x && !gjStations[i].positionSuspect && !gjStations[i + 1].positionSuspect).length;
if (unexplained > 0 || suspects.length > 3) throw new Error(`distance/position check failed: ${unexplained} unexplained, suspects ${suspects}`);
if (suspects.length) console.warn(`position suspect (excluded from headings): ${suspects.join(", ")}`);
const gjSegments = main.slice(0, -1).map((r, i) => ({ from: r["역명"], to: main[i + 1]["역명"], distanceKm: Number(r["역간거리(km)"]) }));
const OUTGJ = "src/data/lineGJ.official.ts";
writeFileSync(
  OUTGJ,
  `/**
 * 자동 생성 파일 — 직접 수정하지 말 것. \`npm run data:import\` 로 다시 만든다.
 *
 * 출처: 국가철도공단 (이용허락범위 제한 없음)
 *  - 「국가철도공단_경의중앙선_역간거리」 https://www.data.go.kr/data/15041327/fileData.do
 *  - 「국가철도공단_경의중앙선_역위치」 https://www.data.go.kr/data/15041487/fileData.do
 *  - 「국가철도공단_RAFIS_역 정보」(영문역명) https://www.data.go.kr/data/15132601/fileData.do
 * 운행시간은 포함하지 않는다 (공개 데이터 없음).
 */

/** 문산 → 지평 본선 역 (영문역명은 RAFIS, 없으면 null). positionSuspect = 좌표가 역간거리와 모순 (방위 계산에서 제외) */
export const GJ_OFFICIAL_STATIONS: ReadonlyArray<{ nameKo: string; nameEnOfficial: string | null; lat: number; lon: number; positionSuspect: boolean }> = ${JSON.stringify(gjStations, null, 2)};

/** 인접 역간 거리 (km) */
export const GJ_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; distanceKm: number }> = ${JSON.stringify(gjSegments, null, 2)};
`,
);
console.log(`${gjSegments.length} segments, ${gjSegments.reduce((a, s) => a + s.distanceKm, 0).toFixed(1)} km → ${OUTGJ}`);
