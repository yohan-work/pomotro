/**
 * 자동 생성 파일 — 직접 수정하지 말 것. `npm run data:import` 로 다시 만든다.
 *
 * 출처: 국가철도공단 (이용허락범위 제한 없음)
 *  - 「국가철도공단_경의중앙선_역간거리」 https://www.data.go.kr/data/15041327/fileData.do
 *  - 「국가철도공단_경의중앙선_역위치」 https://www.data.go.kr/data/15041487/fileData.do
 *  - 「국가철도공단_RAFIS_역 정보」(영문역명) https://www.data.go.kr/data/15132601/fileData.do
 * 운행시간은 포함하지 않는다 (공개 데이터 없음).
 */

/** 문산 → 지평 본선 역 (영문역명은 RAFIS, 없으면 null). positionSuspect = 좌표가 역간거리와 모순 (방위 계산에서 제외) */
export const GJ_OFFICIAL_STATIONS: ReadonlyArray<{ nameKo: string; nameEnOfficial: string | null; lat: number; lon: number; positionSuspect: boolean }> = [
  {
    "nameKo": "문산",
    "nameEnOfficial": "Munsan",
    "lat": 37.854565,
    "lon": 126.787531,
    "positionSuspect": false
  },
  {
    "nameKo": "파주(두원대학)",
    "nameEnOfficial": "Paju",
    "lat": 37.815194,
    "lon": 126.7925,
    "positionSuspect": false
  },
  {
    "nameKo": "월롱(서영대학교)",
    "nameEnOfficial": "Wollong",
    "lat": 37.796201,
    "lon": 126.792574,
    "positionSuspect": false
  },
  {
    "nameKo": "금촌",
    "nameEnOfficial": "Geumchon",
    "lat": 37.766106,
    "lon": 126.774515,
    "positionSuspect": false
  },
  {
    "nameKo": "금릉",
    "nameEnOfficial": "Geumneung",
    "lat": 37.751295,
    "lon": 126.765401,
    "positionSuspect": false
  },
  {
    "nameKo": "운정",
    "nameEnOfficial": "Unjeong",
    "lat": 37.725441,
    "lon": 126.767076,
    "positionSuspect": false
  },
  {
    "nameKo": "야당",
    "nameEnOfficial": null,
    "lat": 37.712749,
    "lon": 126.761535,
    "positionSuspect": false
  },
  {
    "nameKo": "탄현",
    "nameEnOfficial": "Tanhyeon",
    "lat": 37.694114,
    "lon": 126.761075,
    "positionSuspect": false
  },
  {
    "nameKo": "일산",
    "nameEnOfficial": "Ilsan",
    "lat": 37.682231,
    "lon": 126.769521,
    "positionSuspect": false
  },
  {
    "nameKo": "풍산",
    "nameEnOfficial": "Pungsan",
    "lat": 37.67258,
    "lon": 126.78612,
    "positionSuspect": false
  },
  {
    "nameKo": "백마",
    "nameEnOfficial": "Baengma",
    "lat": 37.658346,
    "lon": 126.794401,
    "positionSuspect": false
  },
  {
    "nameKo": "곡산",
    "nameEnOfficial": "Goksan",
    "lat": 37.645729,
    "lon": 126.801877,
    "positionSuspect": false
  },
  {
    "nameKo": "대곡",
    "nameEnOfficial": "Daegok",
    "lat": 37.631928,
    "lon": 126.8104,
    "positionSuspect": false
  },
  {
    "nameKo": "능곡",
    "nameEnOfficial": "Neunggok",
    "lat": 37.618741,
    "lon": 126.82089,
    "positionSuspect": false
  },
  {
    "nameKo": "행신",
    "nameEnOfficial": "Haengsin",
    "lat": 37.612125,
    "lon": 126.834063,
    "positionSuspect": false
  },
  {
    "nameKo": "강매",
    "nameEnOfficial": "Gangmae",
    "lat": 37.612596,
    "lon": 126.845437,
    "positionSuspect": false
  },
  {
    "nameKo": "한국항공대",
    "nameEnOfficial": "Korea Aerospace Univ",
    "lat": 37.637837,
    "lon": 126.832503,
    "positionSuspect": true
  },
  {
    "nameKo": "수색",
    "nameEnOfficial": "Susaek",
    "lat": 37.580855,
    "lon": 126.895681,
    "positionSuspect": false
  },
  {
    "nameKo": "디지털미디어시티",
    "nameEnOfficial": null,
    "lat": 37.577667,
    "lon": 126.900289,
    "positionSuspect": false
  },
  {
    "nameKo": "가좌",
    "nameEnOfficial": "Gajwa",
    "lat": 37.568611,
    "lon": 126.914841,
    "positionSuspect": false
  },
  {
    "nameKo": "홍대입구",
    "nameEnOfficial": "Hongik.Univ",
    "lat": 37.55808,
    "lon": 126.925533,
    "positionSuspect": false
  },
  {
    "nameKo": "서강대",
    "nameEnOfficial": "Sogang Univ.",
    "lat": 37.552132,
    "lon": 126.935389,
    "positionSuspect": false
  },
  {
    "nameKo": "공덕",
    "nameEnOfficial": "Gongdeok",
    "lat": 37.542611,
    "lon": 126.952134,
    "positionSuspect": false
  },
  {
    "nameKo": "효창공원앞",
    "nameEnOfficial": "Hyochang Park",
    "lat": 37.5387169,
    "lon": 126.9628411,
    "positionSuspect": false
  },
  {
    "nameKo": "용산",
    "nameEnOfficial": "Yongsan",
    "lat": 37.52989,
    "lon": 126.964775,
    "positionSuspect": false
  },
  {
    "nameKo": "이촌",
    "nameEnOfficial": "Ichon",
    "lat": 37.522278,
    "lon": 126.974722,
    "positionSuspect": false
  },
  {
    "nameKo": "서빙고",
    "nameEnOfficial": "Seobinggo",
    "lat": 37.52,
    "lon": 126.99,
    "positionSuspect": false
  },
  {
    "nameKo": "한남",
    "nameEnOfficial": "Hannam",
    "lat": 37.529361,
    "lon": 127.008984,
    "positionSuspect": false
  },
  {
    "nameKo": "옥수",
    "nameEnOfficial": "Oksu",
    "lat": 37.540486,
    "lon": 127.018522,
    "positionSuspect": false
  },
  {
    "nameKo": "응봉",
    "nameEnOfficial": "Eungbong",
    "lat": 37.550433,
    "lon": 127.034824,
    "positionSuspect": false
  },
  {
    "nameKo": "왕십리",
    "nameEnOfficial": "Wangsimni",
    "lat": 37.561128,
    "lon": 127.035505,
    "positionSuspect": false
  },
  {
    "nameKo": "청량리",
    "nameEnOfficial": "Cheongnyangni",
    "lat": 37.581043,
    "lon": 127.048516,
    "positionSuspect": false
  },
  {
    "nameKo": "회기",
    "nameEnOfficial": "Hoegi",
    "lat": 37.589676,
    "lon": 127.058071,
    "positionSuspect": false
  },
  {
    "nameKo": "중랑",
    "nameEnOfficial": "Jungnang",
    "lat": 37.594948,
    "lon": 127.076152,
    "positionSuspect": false
  },
  {
    "nameKo": "상봉",
    "nameEnOfficial": "Sangbong",
    "lat": 37.595254,
    "lon": 127.085853,
    "positionSuspect": false
  },
  {
    "nameKo": "망우",
    "nameEnOfficial": "Mangu",
    "lat": 37.599167,
    "lon": 127.092222,
    "positionSuspect": false
  },
  {
    "nameKo": "양원(서울시북부병원)",
    "nameEnOfficial": null,
    "lat": 37.6066,
    "lon": 127.108,
    "positionSuspect": false
  },
  {
    "nameKo": "구리",
    "nameEnOfficial": "Guri",
    "lat": 37.60326,
    "lon": 127.143373,
    "positionSuspect": false
  },
  {
    "nameKo": "도농",
    "nameEnOfficial": "Donong",
    "lat": 37.608756,
    "lon": 127.161105,
    "positionSuspect": false
  },
  {
    "nameKo": "양정",
    "nameEnOfficial": null,
    "lat": 37.604269,
    "lon": 127.194602,
    "positionSuspect": false
  },
  {
    "nameKo": "덕소",
    "nameEnOfficial": "Deokso",
    "lat": 37.586389,
    "lon": 127.209444,
    "positionSuspect": false
  },
  {
    "nameKo": "도심",
    "nameEnOfficial": "Dosim",
    "lat": 37.579628,
    "lon": 127.222798,
    "positionSuspect": false
  },
  {
    "nameKo": "팔당",
    "nameEnOfficial": "Paldang",
    "lat": 37.547321,
    "lon": 127.243896,
    "positionSuspect": false
  },
  {
    "nameKo": "운길산",
    "nameEnOfficial": "Ungil-san",
    "lat": 37.554659,
    "lon": 127.310089,
    "positionSuspect": false
  },
  {
    "nameKo": "양수",
    "nameEnOfficial": "Yangsu",
    "lat": 37.545998,
    "lon": 127.328948,
    "positionSuspect": false
  },
  {
    "nameKo": "신원",
    "nameEnOfficial": "Sinwon",
    "lat": 37.525981,
    "lon": 127.372481,
    "positionSuspect": false
  },
  {
    "nameKo": "국수",
    "nameEnOfficial": "Guksu",
    "lat": 37.516171,
    "lon": 127.399402,
    "positionSuspect": false
  },
  {
    "nameKo": "아신(아세아연합신학대)",
    "nameEnOfficial": "Asin",
    "lat": 37.513954,
    "lon": 127.443238,
    "positionSuspect": false
  },
  {
    "nameKo": "오빈",
    "nameEnOfficial": "Obin",
    "lat": 37.506061,
    "lon": 127.474053,
    "positionSuspect": false
  },
  {
    "nameKo": "양평",
    "nameEnOfficial": "Yangpyeong",
    "lat": 37.492674,
    "lon": 127.491858,
    "positionSuspect": false
  },
  {
    "nameKo": "원덕(추읍산)",
    "nameEnOfficial": "Wondeok",
    "lat": 37.468585,
    "lon": 127.547468,
    "positionSuspect": false
  },
  {
    "nameKo": "용문",
    "nameEnOfficial": "Yongmun",
    "lat": 37.482085,
    "lon": 127.594251,
    "positionSuspect": false
  },
  {
    "nameKo": "지평",
    "nameEnOfficial": "Jipyeong",
    "lat": 37.476849,
    "lon": 127.629633,
    "positionSuspect": false
  }
];

/** 인접 역간 거리 (km) */
export const GJ_OFFICIAL_SEGMENTS: ReadonlyArray<{ from: string; to: string; distanceKm: number }> = [
  {
    "from": "문산",
    "to": "파주(두원대학)",
    "distanceKm": 4.4
  },
  {
    "from": "파주(두원대학)",
    "to": "월롱(서영대학교)",
    "distanceKm": 2.2
  },
  {
    "from": "월롱(서영대학교)",
    "to": "금촌",
    "distanceKm": 4.1
  },
  {
    "from": "금촌",
    "to": "금릉",
    "distanceKm": 2.1
  },
  {
    "from": "금릉",
    "to": "운정",
    "distanceKm": 3.1
  },
  {
    "from": "운정",
    "to": "야당",
    "distanceKm": 1.5
  },
  {
    "from": "야당",
    "to": "탄현",
    "distanceKm": 2.1
  },
  {
    "from": "탄현",
    "to": "일산",
    "distanceKm": 1.7
  },
  {
    "from": "일산",
    "to": "풍산",
    "distanceKm": 1.9
  },
  {
    "from": "풍산",
    "to": "백마",
    "distanceKm": 1.7
  },
  {
    "from": "백마",
    "to": "곡산",
    "distanceKm": 1.6
  },
  {
    "from": "곡산",
    "to": "대곡",
    "distanceKm": 1.7
  },
  {
    "from": "대곡",
    "to": "능곡",
    "distanceKm": 1.8
  },
  {
    "from": "능곡",
    "to": "행신",
    "distanceKm": 1.5
  },
  {
    "from": "행신",
    "to": "강매",
    "distanceKm": 1
  },
  {
    "from": "강매",
    "to": "한국항공대",
    "distanceKm": 2.4
  },
  {
    "from": "한국항공대",
    "to": "수색",
    "distanceKm": 3.4
  },
  {
    "from": "수색",
    "to": "디지털미디어시티",
    "distanceKm": 0.6
  },
  {
    "from": "디지털미디어시티",
    "to": "가좌",
    "distanceKm": 1.7
  },
  {
    "from": "가좌",
    "to": "홍대입구",
    "distanceKm": 1.7
  },
  {
    "from": "홍대입구",
    "to": "서강대",
    "distanceKm": 0.9
  },
  {
    "from": "서강대",
    "to": "공덕",
    "distanceKm": 1.9
  },
  {
    "from": "공덕",
    "to": "효창공원앞",
    "distanceKm": 1
  },
  {
    "from": "효창공원앞",
    "to": "용산",
    "distanceKm": 1.5
  },
  {
    "from": "용산",
    "to": "이촌",
    "distanceKm": 1.9
  },
  {
    "from": "이촌",
    "to": "서빙고",
    "distanceKm": 1.7
  },
  {
    "from": "서빙고",
    "to": "한남",
    "distanceKm": 1.9
  },
  {
    "from": "한남",
    "to": "옥수",
    "distanceKm": 1.6
  },
  {
    "from": "옥수",
    "to": "응봉",
    "distanceKm": 1.8
  },
  {
    "from": "응봉",
    "to": "왕십리",
    "distanceKm": 1.4
  },
  {
    "from": "왕십리",
    "to": "청량리",
    "distanceKm": 2.4
  },
  {
    "from": "청량리",
    "to": "회기",
    "distanceKm": 1.4
  },
  {
    "from": "회기",
    "to": "중랑",
    "distanceKm": 1.8
  },
  {
    "from": "중랑",
    "to": "상봉",
    "distanceKm": 0.8
  },
  {
    "from": "상봉",
    "to": "망우",
    "distanceKm": 0.6
  },
  {
    "from": "망우",
    "to": "양원(서울시북부병원)",
    "distanceKm": 1.7
  },
  {
    "from": "양원(서울시북부병원)",
    "to": "구리",
    "distanceKm": 3.2
  },
  {
    "from": "구리",
    "to": "도농",
    "distanceKm": 1.7
  },
  {
    "from": "도농",
    "to": "양정",
    "distanceKm": 3.7
  },
  {
    "from": "양정",
    "to": "덕소",
    "distanceKm": 2.3
  },
  {
    "from": "덕소",
    "to": "도심",
    "distanceKm": 1.5
  },
  {
    "from": "도심",
    "to": "팔당",
    "distanceKm": 4.2
  },
  {
    "from": "팔당",
    "to": "운길산",
    "distanceKm": 6.4
  },
  {
    "from": "운길산",
    "to": "양수",
    "distanceKm": 1.9
  },
  {
    "from": "양수",
    "to": "신원",
    "distanceKm": 4.7
  },
  {
    "from": "신원",
    "to": "국수",
    "distanceKm": 2.9
  },
  {
    "from": "국수",
    "to": "아신(아세아연합신학대)",
    "distanceKm": 4.1
  },
  {
    "from": "아신(아세아연합신학대)",
    "to": "오빈",
    "distanceKm": 2.8
  },
  {
    "from": "오빈",
    "to": "양평",
    "distanceKm": 2.2
  },
  {
    "from": "양평",
    "to": "원덕(추읍산)",
    "distanceKm": 5.8
  },
  {
    "from": "원덕(추읍산)",
    "to": "용문",
    "distanceKm": 4.8
  },
  {
    "from": "용문",
    "to": "지평",
    "distanceKm": 3.6
  }
];
