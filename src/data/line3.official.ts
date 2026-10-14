/**
 * 자동 생성 파일 — 직접 수정하지 말 것. `npm run data:import` 로 다시 만든다.
 * 출처·라이선스: line2.official.ts 와 같은 데이터셋 (서울교통공사_역간거리 및 소요시간, 2024-09-02 갱신, 공공누리 제1유형 (출처표시))
 */

/** 3호선 지축 → 오금 인접 역간 표준 운행시간·거리 (서울교통공사 운영 구간) */
export const LINE3_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; runSec: number; distanceKm: number }> = [
  {
    "from": "지축",
    "to": "구파발",
    "runSec": 180,
    "distanceKm": 1.5
  },
  {
    "from": "구파발",
    "to": "연신내",
    "runSec": 120,
    "distanceKm": 2
  },
  {
    "from": "연신내",
    "to": "불광",
    "runSec": 90,
    "distanceKm": 1.3
  },
  {
    "from": "불광",
    "to": "녹번",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "녹번",
    "to": "홍제",
    "runSec": 120,
    "distanceKm": 1.6
  },
  {
    "from": "홍제",
    "to": "무악재",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "무악재",
    "to": "독립문",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "독립문",
    "to": "경복궁",
    "runSec": 120,
    "distanceKm": 1.6
  },
  {
    "from": "경복궁",
    "to": "안국",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "안국",
    "to": "종로3가",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "종로3가",
    "to": "을지로3가",
    "runSec": 60,
    "distanceKm": 0.6
  },
  {
    "from": "을지로3가",
    "to": "충무로",
    "runSec": 60,
    "distanceKm": 0.7
  },
  {
    "from": "충무로",
    "to": "동대입구",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "동대입구",
    "to": "약수",
    "runSec": 60,
    "distanceKm": 0.7
  },
  {
    "from": "약수",
    "to": "금호",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "금호",
    "to": "옥수",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "옥수",
    "to": "압구정",
    "runSec": 120,
    "distanceKm": 2.1
  },
  {
    "from": "압구정",
    "to": "신사",
    "runSec": 120,
    "distanceKm": 1.5
  },
  {
    "from": "신사",
    "to": "잠원",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "잠원",
    "to": "고속터미널",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "고속터미널",
    "to": "교대",
    "runSec": 120,
    "distanceKm": 1.6
  },
  {
    "from": "교대",
    "to": "남부터미널",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "남부터미널",
    "to": "양재",
    "runSec": 120,
    "distanceKm": 1.8
  },
  {
    "from": "양재",
    "to": "매봉",
    "runSec": 120,
    "distanceKm": 1.2
  },
  {
    "from": "매봉",
    "to": "도곡",
    "runSec": 90,
    "distanceKm": 0.8
  },
  {
    "from": "도곡",
    "to": "대치",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "대치",
    "to": "학여울",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "학여울",
    "to": "대청",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "대청",
    "to": "일원",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "일원",
    "to": "수서",
    "runSec": 120,
    "distanceKm": 1.8
  },
  {
    "from": "수서",
    "to": "가락시장",
    "runSec": 120,
    "distanceKm": 1.4
  },
  {
    "from": "가락시장",
    "to": "경찰병원",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "경찰병원",
    "to": "오금",
    "runSec": 60,
    "distanceKm": 0.8
  }
];

export const LINE3_OFFICIAL_KM = 38.2;
