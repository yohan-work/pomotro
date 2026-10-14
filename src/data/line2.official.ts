/**
 * 자동 생성 파일 — 직접 수정하지 말 것. `npm run data:import` 로 다시 만든다.
 *
 * 출처: 서울교통공사 (수송운영처), 「서울교통공사_역간거리 및 소요시간」 (서울 열린데이터광장 OA-12034)
 *       https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do
 * 파일: 서울교통공사 역간거리 및 소요시간_240810.csv (데이터 갱신일 2024-09-02)
 * 라이선스: 공공누리 제1유형 (출처표시)
 * 비고: 운행시간은 열차가 출발해 다음 역에 도착하는 표준 운행시간이며 열차 사정에 따라 달라질 수 있다 (정차시간 미포함).
 */

export const OFFICIAL_SOURCE = {
  "id": "OA-12034",
  "title": "서울교통공사_역간거리 및 소요시간",
  "page": "https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do",
  "file": "서울교통공사 역간거리 및 소요시간_240810.csv",
  "fileSeq": "9",
  "updated": "2024-09-02",
  "provider": "서울교통공사 (수송운영처)",
  "license": "공공누리 제1유형 (출처표시)",
  "csv": "data/official/seoul-metro-station-distance-240810.csv"
} as const;

/** 2호선 본선 내선순환 (시청 → … → 충정로 → 시청) 인접 역간 표준 운행시간·거리 */
export const LINE2_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; runSec: number; distanceKm: number }> = [
  {
    "from": "시청",
    "to": "을지로입구",
    "runSec": 90,
    "distanceKm": 0.7
  },
  {
    "from": "을지로입구",
    "to": "을지로3가",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "을지로3가",
    "to": "을지로4가",
    "runSec": 60,
    "distanceKm": 0.6
  },
  {
    "from": "을지로4가",
    "to": "동대문역사문화공원",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "동대문역사문화공원",
    "to": "신당",
    "runSec": 90,
    "distanceKm": 0.9
  },
  {
    "from": "신당",
    "to": "상왕십리",
    "runSec": 60,
    "distanceKm": 0.9
  },
  {
    "from": "상왕십리",
    "to": "왕십리",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "왕십리",
    "to": "한양대",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "한양대",
    "to": "뚝섬",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "뚝섬",
    "to": "성수",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "성수",
    "to": "건대입구",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "건대입구",
    "to": "구의",
    "runSec": 120,
    "distanceKm": 1.6
  },
  {
    "from": "구의",
    "to": "강변",
    "runSec": 60,
    "distanceKm": 0.9
  },
  {
    "from": "강변",
    "to": "잠실나루",
    "runSec": 120,
    "distanceKm": 1.8
  },
  {
    "from": "잠실나루",
    "to": "잠실",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "잠실",
    "to": "잠실새내",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "잠실새내",
    "to": "종합운동장",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "종합운동장",
    "to": "삼성",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "삼성",
    "to": "선릉",
    "runSec": 90,
    "distanceKm": 1.3
  },
  {
    "from": "선릉",
    "to": "역삼",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "역삼",
    "to": "강남",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "강남",
    "to": "교대",
    "runSec": 90,
    "distanceKm": 1.2
  },
  {
    "from": "교대",
    "to": "서초",
    "runSec": 60,
    "distanceKm": 0.7
  },
  {
    "from": "서초",
    "to": "방배",
    "runSec": 120,
    "distanceKm": 1.7
  },
  {
    "from": "방배",
    "to": "사당",
    "runSec": 150,
    "distanceKm": 1.6
  },
  {
    "from": "사당",
    "to": "낙성대",
    "runSec": 120,
    "distanceKm": 1.7
  },
  {
    "from": "낙성대",
    "to": "서울대입구",
    "runSec": 90,
    "distanceKm": 1
  },
  {
    "from": "서울대입구",
    "to": "봉천",
    "runSec": 60,
    "distanceKm": 1
  },
  {
    "from": "봉천",
    "to": "신림",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "신림",
    "to": "신대방",
    "runSec": 120,
    "distanceKm": 1.8
  },
  {
    "from": "신대방",
    "to": "구로디지털단지",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "구로디지털단지",
    "to": "대림",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "대림",
    "to": "신도림",
    "runSec": 150,
    "distanceKm": 1.8
  },
  {
    "from": "신도림",
    "to": "문래",
    "runSec": 120,
    "distanceKm": 1.2
  },
  {
    "from": "문래",
    "to": "영등포구청",
    "runSec": 60,
    "distanceKm": 0.9
  },
  {
    "from": "영등포구청",
    "to": "당산",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "당산",
    "to": "합정",
    "runSec": 150,
    "distanceKm": 2
  },
  {
    "from": "합정",
    "to": "홍대입구",
    "runSec": 90,
    "distanceKm": 1.1
  },
  {
    "from": "홍대입구",
    "to": "신촌",
    "runSec": 120,
    "distanceKm": 1.3
  },
  {
    "from": "신촌",
    "to": "이대",
    "runSec": 60,
    "distanceKm": 0.8
  },
  {
    "from": "이대",
    "to": "아현",
    "runSec": 60,
    "distanceKm": 0.9
  },
  {
    "from": "아현",
    "to": "충정로",
    "runSec": 90,
    "distanceKm": 0.8
  },
  {
    "from": "충정로",
    "to": "시청",
    "runSec": 90,
    "distanceKm": 1.1
  }
];

/** 본선 총 연장 (km) */
export const LINE2_OFFICIAL_LOOP_KM = 48.8;
