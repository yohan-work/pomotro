/**
 * 서울의 해 뜨고 지는 시각 — NOAA 근사식 (오차 1~2분). 데이터 없이 날짜만으로 계산한다.
 */
const LAT = 37.5665;
const LON = 126.978;
const rad = Math.PI / 180;

/** date 가 속한 한국 날짜의 일출·일몰 (UTC 기준 Date) */
export function sunTimesSeoul(date: Date): { sunrise: Date; sunset: Date } {
  // 한국 날짜의 정오(KST) 기준
  const kst = new Date(date.getTime() + 9 * 3600e3);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const noonUtc = Date.UTC(y, m, d, 3); // 12:00 KST
  const n = (noonUtc - Date.UTC(y, 0, 1)) / 86400e3 + 1;
  const g = ((2 * Math.PI) / 365) * (n - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) - Math.tan(LAT * rad) * Math.tan(decl)) / rad;
  // 분 (UTC 자정 기준)
  const rise = 720 - 4 * (LON + ha) - eqTime;
  const set = 720 - 4 * (LON - ha) - eqTime;
  // 식의 분은 그 날짜 UTC 자정 기준 (서울은 일출이 음수 = 전날 UTC)
  const day0 = Date.UTC(y, m, d);
  return { sunrise: new Date(day0 + rise * 60e3), sunset: new Date(day0 + set * 60e3) };
}
