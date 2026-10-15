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

/* ───────── 서울교통공사 1·4·5·6·7·8호선 + 전 노선 역 좌표·영문명 ─────────
 * - 운행시간·거리: 위와 같은 서울교통공사 「역간거리 및 소요시간」
 * - 역 좌표: 서울시 「역사마스터 정보」 (서울 열린데이터광장 OA-21232, subwayStationMaster)
 * - 영문 역명·역번호: 서울시 「지하철 노선별 역 정보」 (SearchSTNBySubwayLineInfo)
 * 두 API 는 인증키가 필요하다 (.env.local 의 SEOUL_OPENAPI_KEY). 받은 원본은 CSV 로 저장해 두므로
 * 키가 없으면 저장된 CSV 로 재생성만 한다. 빌드·배포에는 키가 필요 없다.
 */
const MASTER_CSV = "data/official/seoul-station-master.csv";
const NAMES_CSV = "data/official/seoul-station-names.csv";
const envKey = (() => {
  if (process.env.SEOUL_OPENAPI_KEY) return process.env.SEOUL_OPENAPI_KEY;
  try {
    return /^SEOUL_OPENAPI_KEY=(.+)$/m.exec(readFileSync(".env.local", "utf8"))?.[1]?.trim();
  } catch {
    return undefined;
  }
})();
const toCsv = (rows: Array<Record<string, string>>, cols: string[]) =>
  [cols.join(","), ...rows.map((r) => cols.map((c) => String(r[c] ?? "").replace(/,/g, " ").trim()).join(","))].join("\n") + "\n";
if (!process.argv.includes("--offline") && envKey) {
  const api = (service: string) => {
    const raw = execFileSync("curl", ["-sf", `http://openapi.seoul.go.kr:8088/${envKey}/json/${service}/1/1000/`]).toString();
    const body = JSON.parse(raw)[service];
    if (!body?.row?.length) throw new Error(`${service}: empty response`);
    return body.row as Array<Record<string, string>>;
  };
  writeFileSync(MASTER_CSV, toCsv(api("subwayStationMaster"), ["BLDN_ID", "BLDN_NM", "ROUTE", "LAT", "LOT"]));
  writeFileSync(NAMES_CSV, toCsv(api("SearchSTNBySubwayLineInfo"), ["STATION_CD", "STATION_NM", "STATION_NM_ENG", "LINE_NUM", "FR_CODE"]));
  console.log(`downloaded → ${MASTER_CSV}, ${NAMES_CSV}`);
} else if (!process.argv.includes("--offline")) console.warn("SEOUL_OPENAPI_KEY 없음 — 저장된 역 좌표·영문명 CSV 로 재생성");

const master = csvRows(MASTER_CSV);
const nameRows = csvRows(NAMES_CSV);
/** 운행 데이터 역명 → 다른 데이터셋의 옛/다른 표기 */
const ALIAS: Record<string, string[]> = { 자양: ["뚝섬유원지", "자양(뚝섬한강공원)"], 신내역: ["신내"], 당고개: ["불암산"] };
const clean = (n: string) => n.trim().replace(/\(.*\)$/, "");
const cands = (n: string) => [clean(n), ...(ALIAS[n.trim()] ?? [])];
const missing: string[] = [];
const renamed = new Map<string, string>();
function stationInfo(line: string, nameKo: string) {
  const m = master.find((r) => r.ROUTE === `${line}호선` && cands(nameKo).includes(clean(r.BLDN_NM)));
  const nm = nameRows.find((r) => r.LINE_NUM === `0${line}호선` && cands(nameKo).includes(clean(r.STATION_NM)));
  if (!m || !nm) {
    missing.push(`${line}호선 ${nameKo}${m ? "" : " (좌표)"}${nm ? "" : " (영문명)"}`);
    return { nameKo: clean(nameKo), nameEn: "", code: "", lat: 0, lon: 0 };
  }
  // 표시 역명은 현재 공식 역명 (예: 당고개 → 불암산, 2024년 개명). 운행 데이터와는 renamed 로 잇는다
  const current = clean(nm.STATION_NM);
  if (current !== clean(nameKo)) renamed.set(clean(nameKo), current);
  // API 원문에서 '&' 가 빠지고(공백 두 칸) 아포스트로피가 백틱으로 온다 → 표기만 바로잡는다
  const nameEn = nm.STATION_NM_ENG.replace(/`/g, "'").replace(/\s{2,}/g, " & ").trim();
  return { nameKo: current, nameEn, code: nm.FR_CODE, lat: Number(m.LAT), lon: Number(m.LOT) };
}

const csvLine = (n: string) =>
  readFileSync(CSV_PATH, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => c[1] === n)
    .map((c) => ({ name: c[2].trim() === "신내역" ? "신내" : c[2].trim(), runSec: toSec(c[3]), km: Number(c[4]), cum: Number(c[5]) }));
type Row = ReturnType<typeof csvLine>[number];
const cur = (n: string) => renamed.get(n) ?? n;
const segsOf = (rows: Row[]) => rows.slice(1).map((r, i) => ({ from: cur(rows[i].name), to: cur(r.name), runSec: r.runSec, distanceKm: r.km }));
function checkSum(n: string, rows: Row[]) {
  const sum = rows.reduce((a, r) => a + r.km, 0);
  if (Math.abs(sum - rows[rows.length - 1].cum) > 0.05) throw new Error(`${n}호선 distance sum ${sum} != cumulative ${rows[rows.length - 1].cum}`);
}

type OfficialLine = { stations: ReturnType<typeof stationInfo>[]; segments: ReturnType<typeof segsOf>; loop: boolean };
const lines: Record<string, OfficialLine> = {};
const plain = (n: string) => {
  const rows = csvLine(n);
  checkSum(n, rows);
  lines[n] = { stations: rows.map((r) => stationInfo(n, r.name)), segments: segsOf(rows), loop: false };
};
for (const n of ["1", "4", "7", "8"]) plain(n);

// 5호선: 방화 → 하남검단산 본선 + 강동 → 마천 지선 (데이터는 본선 뒤에 지선이 이어 붙어 있고, 둔촌동 행의 값이 강동→둔촌동)
{
  const rows = csvLine("5");
  checkSum("5", rows);
  const end = rows.findIndex((r) => r.name === "하남검단산");
  const main = rows.slice(0, end + 1);
  const gd = rows.find((r) => r.name === "강동")!;
  const branch = [gd, ...rows.slice(end + 1)];
  if (branch[1].name !== "둔촌동" || branch[branch.length - 1].name !== "마천") throw new Error("5호선 마천지선 형식 변경?");
  lines["5"] = { stations: main.map((r) => stationInfo("5", r.name)), segments: segsOf(main), loop: false };
  lines["5M"] = { stations: branch.map((r) => stationInfo("5", r.name)), segments: segsOf(branch), loop: false };
}
// 6호선: 응암순환(응암 → 역촌 → 불광 → 독바위 → 연신내 → 구산 → 응암, 한 방향) + 응암 → 신내 본선
{
  const rows = csvLine("6");
  checkSum("6", rows);
  const back = rows.findIndex((r, i) => i > 0 && r.name === "응암");
  const loopRows = rows.slice(0, back + 1);
  const main = rows.slice(back);
  lines["6L"] = { stations: loopRows.slice(0, -1).map((r) => stationInfo("6", r.name)), segments: segsOf(loopRows), loop: true };
  lines["6"] = { stations: main.map((r) => stationInfo("6", r.name)), segments: segsOf(main), loop: false };
}
// 2·3호선은 역 좌표·영문명·역번호만 (운행 데이터는 line2/line3.official.ts)
for (const n of ["2", "3"]) {
  let rows = csvLine(n);
  // 2호선은 본선 순환만 (성수·신정 지선 제외)
  if (n === "2") rows = rows.slice(rows.findIndex((r) => r.name === "시청"), rows.findIndex((r, i) => i > 0 && r.name === "시청"));
  const seen = new Set<string>();
  const uniq = rows.filter((r) => !seen.has(r.name) && seen.add(r.name));
  lines[n] = { stations: uniq.map((r) => stationInfo(n, r.name)), segments: [], loop: n === "2" };
}

if (missing.length) throw new Error(`역 정보를 찾지 못함: ${missing.join(", ")}`);
const OUTM = "src/data/metro.official.ts";
writeFileSync(
  OUTM,
  `/**
 * 자동 생성 파일 — 직접 수정하지 말 것. \`npm run data:import\` 로 다시 만든다.
 *
 * 출처 (모두 공공누리 제1유형, 출처표시)
 *  - 운행시간·거리: 서울교통공사 「${DATASET.title}」 (${DATASET.id}, ${DATASET.updated} 갱신)
 *  - 역 좌표: 서울특별시 「서울시 역사마스터 정보」 (서울 열린데이터광장 OA-21232)
 *  - 영문 역명·역번호: 서울특별시 「서울시 지하철 노선별 역 정보」 (SearchSTNBySubwayLineInfo)
 * 운행시간은 정차시간을 포함하지 않는 표준 운행시간. 2·3호선은 역 정보만 (운행 데이터는 line2/line3.official.ts).
 * 5M = 5호선 마천지선(강동 → 마천), 6L = 6호선 응암순환(한 방향 순환).
 */

export interface OfficialStation {
  nameKo: string;
  nameEn: string;
  code: string;
  lat: number;
  lon: number;
}

export const METRO_OFFICIAL: Record<"1" | "2" | "3" | "4" | "5" | "5M" | "6" | "6L" | "7" | "8", { loop: boolean; stations: OfficialStation[]; segments: Array<{ from: string; to: string; runSec: number; distanceKm: number }> }> = ${JSON.stringify(lines, null, 2)};
`,
);
console.log(`metro lines ${Object.keys(lines).join(" ")} → ${OUTM}`);
if (renamed.size) console.log(`개명 역 (현재 역명으로 표시): ${[...renamed].map(([a, b]) => `${a}→${b}`).join(", ")}`);
