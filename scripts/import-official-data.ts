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
