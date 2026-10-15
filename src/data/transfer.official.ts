/**
 * 자동 생성 파일 — 직접 수정하지 말 것. `npm run data:import` 로 다시 만든다.
 *
 * 출처: 서울교통공사 「환승역거리 소요시간 정보」 https://www.data.go.kr/data/15044419/fileData.do (이용허락범위 제한 없음, 2025-12-31 기준)
 * 소요시간은 환승거리를 보행속도 1.2m/s 로 나눈 값. 역명은 현재 역명 (개명 반영).
 */

export const TRANSFER_OFFICIAL: ReadonlyArray<{ line: string; station: string; toLine: string; meters: number; sec: number }> = [
  {
    "line": "1",
    "station": "서울역",
    "toLine": "4호선",
    "meters": 159,
    "sec": 133
  },
  {
    "line": "1",
    "station": "서울역",
    "toLine": "공항철도",
    "meters": 309,
    "sec": 258
  },
  {
    "line": "1",
    "station": "서울역",
    "toLine": "경의중앙선",
    "meters": 164,
    "sec": 137
  },
  {
    "line": "1",
    "station": "서울역",
    "toLine": "GTX-A",
    "meters": 172,
    "sec": 143
  },
  {
    "line": "1",
    "station": "시청",
    "toLine": "2호선",
    "meters": 101,
    "sec": 84
  },
  {
    "line": "1",
    "station": "종로3가",
    "toLine": "3호선",
    "meters": 118,
    "sec": 98
  },
  {
    "line": "1",
    "station": "종로3가",
    "toLine": "5호선",
    "meters": 312,
    "sec": 260
  },
  {
    "line": "1",
    "station": "동대문",
    "toLine": "4호선",
    "meters": 194,
    "sec": 162
  },
  {
    "line": "1",
    "station": "동묘앞",
    "toLine": "6호선",
    "meters": 96,
    "sec": 80
  },
  {
    "line": "1",
    "station": "신설동",
    "toLine": "2호선",
    "meters": 159,
    "sec": 133
  },
  {
    "line": "1",
    "station": "신설동",
    "toLine": "우이신설선",
    "meters": 129,
    "sec": 108
  },
  {
    "line": "1",
    "station": "청량리",
    "toLine": "경의중앙선",
    "meters": 165,
    "sec": 138
  },
  {
    "line": "1",
    "station": "청량리",
    "toLine": "경춘선",
    "meters": 203,
    "sec": 169
  },
  {
    "line": "1",
    "station": "청량리",
    "toLine": "수인분당선",
    "meters": 180,
    "sec": 150
  },
  {
    "line": "2",
    "station": "시청",
    "toLine": "1호선",
    "meters": 101,
    "sec": 84
  },
  {
    "line": "2",
    "station": "을지로3가",
    "toLine": "3호선",
    "meters": 149,
    "sec": 124
  },
  {
    "line": "2",
    "station": "을지로4가",
    "toLine": "5호선",
    "meters": 77,
    "sec": 64
  },
  {
    "line": "2",
    "station": "동대문역사문화공원",
    "toLine": "4호선",
    "meters": 45,
    "sec": 38
  },
  {
    "line": "2",
    "station": "동대문역사문화공원",
    "toLine": "5호선",
    "meters": 234,
    "sec": 195
  },
  {
    "line": "2",
    "station": "신당",
    "toLine": "6호선",
    "meters": 242,
    "sec": 202
  },
  {
    "line": "2",
    "station": "왕십리",
    "toLine": "수인분당선",
    "meters": 99,
    "sec": 83
  },
  {
    "line": "2",
    "station": "왕십리",
    "toLine": "5호선",
    "meters": 86,
    "sec": 72
  },
  {
    "line": "2",
    "station": "왕십리",
    "toLine": "경의중앙선",
    "meters": 50,
    "sec": 42
  },
  {
    "line": "2",
    "station": "성수",
    "toLine": "2호선",
    "meters": 23,
    "sec": 19
  },
  {
    "line": "2",
    "station": "건대입구",
    "toLine": "7호선",
    "meters": 77,
    "sec": 64
  },
  {
    "line": "2",
    "station": "잠실",
    "toLine": "8호선",
    "meters": 190,
    "sec": 158
  },
  {
    "line": "2",
    "station": "종합운동장",
    "toLine": "9호선",
    "meters": 94,
    "sec": 78
  },
  {
    "line": "2",
    "station": "선릉",
    "toLine": "수인분당선",
    "meters": 81,
    "sec": 68
  },
  {
    "line": "2",
    "station": "강남",
    "toLine": "신분당선",
    "meters": 214,
    "sec": 178
  },
  {
    "line": "2",
    "station": "교대",
    "toLine": "3호선",
    "meters": 75,
    "sec": 63
  },
  {
    "line": "2",
    "station": "사당",
    "toLine": "4호선",
    "meters": 74,
    "sec": 62
  },
  {
    "line": "2",
    "station": "신림",
    "toLine": "신림선",
    "meters": 88,
    "sec": 73
  },
  {
    "line": "2",
    "station": "대림",
    "toLine": "7호선",
    "meters": 276,
    "sec": 230
  },
  {
    "line": "2",
    "station": "신도림",
    "toLine": "1호선",
    "meters": 81,
    "sec": 68
  },
  {
    "line": "2",
    "station": "신도림",
    "toLine": "2호선",
    "meters": 81,
    "sec": 68
  },
  {
    "line": "2",
    "station": "영등포구청",
    "toLine": "5호선",
    "meters": 110,
    "sec": 92
  },
  {
    "line": "2",
    "station": "당산",
    "toLine": "9호선",
    "meters": 105,
    "sec": 88
  },
  {
    "line": "2",
    "station": "합정",
    "toLine": "6호선",
    "meters": 82,
    "sec": 68
  },
  {
    "line": "2",
    "station": "홍대입구",
    "toLine": "공항철도",
    "meters": 355,
    "sec": 296
  },
  {
    "line": "2",
    "station": "홍대입구",
    "toLine": "경의중앙선",
    "meters": 305,
    "sec": 254
  },
  {
    "line": "2",
    "station": "충정로",
    "toLine": "5호선",
    "meters": 212,
    "sec": 177
  },
  {
    "line": "2",
    "station": "신설동",
    "toLine": "1호선",
    "meters": 159,
    "sec": 133
  },
  {
    "line": "2",
    "station": "신설동",
    "toLine": "우이신설선",
    "meters": 273,
    "sec": 228
  },
  {
    "line": "3",
    "station": "종로3가",
    "toLine": "1호선",
    "meters": 118,
    "sec": 98
  },
  {
    "line": "3",
    "station": "종로3가",
    "toLine": "5호선",
    "meters": 117,
    "sec": 98
  },
  {
    "line": "3",
    "station": "을지로3가",
    "toLine": "2호선",
    "meters": 149,
    "sec": 124
  },
  {
    "line": "3",
    "station": "교대",
    "toLine": "2호선",
    "meters": 75,
    "sec": 63
  },
  {
    "line": "3",
    "station": "양재",
    "toLine": "신분당선",
    "meters": 93,
    "sec": 78
  },
  {
    "line": "3",
    "station": "연신내",
    "toLine": "6호선",
    "meters": 181,
    "sec": 151
  },
  {
    "line": "3",
    "station": "연신내",
    "toLine": "GTX-A",
    "meters": 241,
    "sec": 201
  },
  {
    "line": "3",
    "station": "불광",
    "toLine": "6호선",
    "meters": 100,
    "sec": 83
  },
  {
    "line": "3",
    "station": "충무로",
    "toLine": "4호선",
    "meters": 17,
    "sec": 14
  },
  {
    "line": "3",
    "station": "약수",
    "toLine": "6호선",
    "meters": 130,
    "sec": 108
  },
  {
    "line": "3",
    "station": "옥수",
    "toLine": "경의중앙선",
    "meters": 155,
    "sec": 129
  },
  {
    "line": "3",
    "station": "신사",
    "toLine": "신분당선",
    "meters": 77,
    "sec": 64
  },
  {
    "line": "3",
    "station": "고속터미널",
    "toLine": "7호선",
    "meters": 169,
    "sec": 141
  },
  {
    "line": "3",
    "station": "고속터미널",
    "toLine": "9호선",
    "meters": 155,
    "sec": 129
  },
  {
    "line": "3",
    "station": "도곡",
    "toLine": "수인분당선",
    "meters": 78,
    "sec": 65
  },
  {
    "line": "3",
    "station": "수서",
    "toLine": "국철",
    "meters": 92,
    "sec": 77
  },
  {
    "line": "3",
    "station": "수서",
    "toLine": "GTX-A",
    "meters": 276,
    "sec": 230
  },
  {
    "line": "3",
    "station": "가락시장",
    "toLine": "8호선",
    "meters": 35,
    "sec": 29
  },
  {
    "line": "3",
    "station": "오금",
    "toLine": "5호선",
    "meters": 65,
    "sec": 54
  },
  {
    "line": "4",
    "station": "서울역",
    "toLine": "1호선",
    "meters": 159,
    "sec": 133
  },
  {
    "line": "4",
    "station": "서울역",
    "toLine": "공항철도",
    "meters": 224,
    "sec": 187
  },
  {
    "line": "4",
    "station": "서울역",
    "toLine": "경의중앙선",
    "meters": 323,
    "sec": 269
  },
  {
    "line": "4",
    "station": "서울역",
    "toLine": "GTX-A",
    "meters": 264,
    "sec": 220
  },
  {
    "line": "4",
    "station": "동대문",
    "toLine": "1호선",
    "meters": 194,
    "sec": 162
  },
  {
    "line": "4",
    "station": "동대문역사문화공원",
    "toLine": "2호선",
    "meters": 45,
    "sec": 38
  },
  {
    "line": "4",
    "station": "동대문역사문화공원",
    "toLine": "5호선",
    "meters": 107,
    "sec": 89
  },
  {
    "line": "4",
    "station": "사당",
    "toLine": "2호선",
    "meters": 74,
    "sec": 62
  },
  {
    "line": "4",
    "station": "충무로",
    "toLine": "3호선",
    "meters": 17,
    "sec": 14
  },
  {
    "line": "4",
    "station": "노원",
    "toLine": "7호선",
    "meters": 278,
    "sec": 232
  },
  {
    "line": "4",
    "station": "창동",
    "toLine": "1호선",
    "meters": 84,
    "sec": 70
  },
  {
    "line": "4",
    "station": "성신여대입구",
    "toLine": "우이신설선",
    "meters": 7,
    "sec": 6
  },
  {
    "line": "4",
    "station": "이촌",
    "toLine": "경의중앙선",
    "meters": 78,
    "sec": 65
  },
  {
    "line": "4",
    "station": "삼각지",
    "toLine": "6호선",
    "meters": 155,
    "sec": 129
  },
  {
    "line": "4",
    "station": "동작",
    "toLine": "9호선",
    "meters": 245,
    "sec": 204
  },
  {
    "line": "4",
    "station": "총신대입구",
    "toLine": "7호선",
    "meters": 171,
    "sec": 143
  },
  {
    "line": "5",
    "station": "김포공항",
    "toLine": "공항철도",
    "meters": 122,
    "sec": 282
  },
  {
    "line": "5",
    "station": "김포공항",
    "toLine": "9호선",
    "meters": 106,
    "sec": 88
  },
  {
    "line": "5",
    "station": "김포공항",
    "toLine": "김포골드라인",
    "meters": 200,
    "sec": 167
  },
  {
    "line": "5",
    "station": "김포공항",
    "toLine": "서해선",
    "meters": 100,
    "sec": 83
  },
  {
    "line": "5",
    "station": "까치산",
    "toLine": "2호선",
    "meters": 17,
    "sec": 14
  },
  {
    "line": "5",
    "station": "영등포구청",
    "toLine": "2호선",
    "meters": 110,
    "sec": 92
  },
  {
    "line": "5",
    "station": "신길",
    "toLine": "1호선",
    "meters": 242,
    "sec": 202
  },
  {
    "line": "5",
    "station": "여의도",
    "toLine": "9호선",
    "meters": 68,
    "sec": 57
  },
  {
    "line": "5",
    "station": "공덕",
    "toLine": "6호선",
    "meters": 73,
    "sec": 61
  },
  {
    "line": "5",
    "station": "공덕",
    "toLine": "공항철도",
    "meters": 275,
    "sec": 229
  },
  {
    "line": "5",
    "station": "공덕",
    "toLine": "경의중앙선",
    "meters": 214,
    "sec": 178
  },
  {
    "line": "5",
    "station": "충정로",
    "toLine": "2호선",
    "meters": 212,
    "sec": 177
  },
  {
    "line": "5",
    "station": "종로3가",
    "toLine": "1호선",
    "meters": 312,
    "sec": 260
  },
  {
    "line": "5",
    "station": "종로3가",
    "toLine": "3호선",
    "meters": 117,
    "sec": 98
  },
  {
    "line": "5",
    "station": "을지로4가",
    "toLine": "2호선",
    "meters": 77,
    "sec": 64
  },
  {
    "line": "5",
    "station": "동대문역사문화공원",
    "toLine": "2호선",
    "meters": 234,
    "sec": 195
  },
  {
    "line": "5",
    "station": "동대문역사문화공원",
    "toLine": "4호선",
    "meters": 107,
    "sec": 89
  },
  {
    "line": "5",
    "station": "청구",
    "toLine": "6호선",
    "meters": 104,
    "sec": 87
  },
  {
    "line": "5",
    "station": "왕십리",
    "toLine": "2호선",
    "meters": 86,
    "sec": 72
  },
  {
    "line": "5",
    "station": "왕십리",
    "toLine": "경의중앙선",
    "meters": 198,
    "sec": 165
  },
  {
    "line": "5",
    "station": "왕십리",
    "toLine": "수인분당선",
    "meters": 244,
    "sec": 203
  },
  {
    "line": "5",
    "station": "군자",
    "toLine": "7호선",
    "meters": 75,
    "sec": 63
  },
  {
    "line": "5",
    "station": "천호",
    "toLine": "8호선",
    "meters": 35,
    "sec": 29
  },
  {
    "line": "5",
    "station": "강동",
    "toLine": "5호선",
    "meters": 19,
    "sec": 16
  },
  {
    "line": "5",
    "station": "올림픽공원",
    "toLine": "9호선",
    "meters": 93,
    "sec": 78
  },
  {
    "line": "5",
    "station": "오금",
    "toLine": "3호선",
    "meters": 65,
    "sec": 54
  },
  {
    "line": "6",
    "station": "신내",
    "toLine": "경춘선",
    "meters": 50,
    "sec": 42
  },
  {
    "line": "6",
    "station": "태릉입구",
    "toLine": "7호선",
    "meters": 46,
    "sec": 38
  },
  {
    "line": "6",
    "station": "석계",
    "toLine": "경원선",
    "meters": 125,
    "sec": 104
  },
  {
    "line": "6",
    "station": "동묘앞",
    "toLine": "1호선",
    "meters": 96,
    "sec": 80
  },
  {
    "line": "6",
    "station": "신당",
    "toLine": "2호선",
    "meters": 242,
    "sec": 202
  },
  {
    "line": "6",
    "station": "보문",
    "toLine": "우이신설선",
    "meters": 87,
    "sec": 73
  },
  {
    "line": "6",
    "station": "청구",
    "toLine": "5호선",
    "meters": 104,
    "sec": 87
  },
  {
    "line": "6",
    "station": "약수",
    "toLine": "3호선",
    "meters": 130,
    "sec": 108
  },
  {
    "line": "6",
    "station": "삼각지",
    "toLine": "4호선",
    "meters": 155,
    "sec": 129
  },
  {
    "line": "6",
    "station": "효창공원앞",
    "toLine": "경의중앙선",
    "meters": 110,
    "sec": 92
  },
  {
    "line": "6",
    "station": "공덕",
    "toLine": "5호선",
    "meters": 73,
    "sec": 61
  },
  {
    "line": "6",
    "station": "공덕",
    "toLine": "공항철도",
    "meters": 265,
    "sec": 221
  },
  {
    "line": "6",
    "station": "공덕",
    "toLine": "경의중앙선",
    "meters": 152,
    "sec": 127
  },
  {
    "line": "6",
    "station": "합정",
    "toLine": "2호선",
    "meters": 82,
    "sec": 68
  },
  {
    "line": "6",
    "station": "디지털미디어시티",
    "toLine": "경의중앙선",
    "meters": 55,
    "sec": 46
  },
  {
    "line": "6",
    "station": "디지털미디어시티",
    "toLine": "공항철도",
    "meters": 186,
    "sec": 155
  },
  {
    "line": "6",
    "station": "불광",
    "toLine": "3호선",
    "meters": 100,
    "sec": 83
  },
  {
    "line": "6",
    "station": "연신내",
    "toLine": "3호선",
    "meters": 181,
    "sec": 151
  },
  {
    "line": "6",
    "station": "연신내",
    "toLine": "GTX-A",
    "meters": 187,
    "sec": 156
  },
  {
    "line": "7",
    "station": "도봉산",
    "toLine": "1호선",
    "meters": 44,
    "sec": 37
  },
  {
    "line": "7",
    "station": "노원",
    "toLine": "4호선",
    "meters": 278,
    "sec": 232
  },
  {
    "line": "7",
    "station": "태릉입구",
    "toLine": "6호선",
    "meters": 46,
    "sec": 38
  },
  {
    "line": "7",
    "station": "상봉",
    "toLine": "경의중앙선",
    "meters": 100,
    "sec": 83
  },
  {
    "line": "7",
    "station": "상봉",
    "toLine": "경춘선",
    "meters": 100,
    "sec": 83
  },
  {
    "line": "7",
    "station": "군자",
    "toLine": "5호선",
    "meters": 75,
    "sec": 63
  },
  {
    "line": "7",
    "station": "건대입구",
    "toLine": "2호선",
    "meters": 77,
    "sec": 64
  },
  {
    "line": "7",
    "station": "강남구청",
    "toLine": "수인분당선",
    "meters": 125,
    "sec": 104
  },
  {
    "line": "7",
    "station": "논현",
    "toLine": "신분당선",
    "meters": 80,
    "sec": 67
  },
  {
    "line": "7",
    "station": "고속터미널",
    "toLine": "3호선",
    "meters": 169,
    "sec": 141
  },
  {
    "line": "7",
    "station": "고속터미널",
    "toLine": "9호선",
    "meters": 314,
    "sec": 262
  },
  {
    "line": "7",
    "station": "이수",
    "toLine": "4호선",
    "meters": 171,
    "sec": 143
  },
  {
    "line": "7",
    "station": "보라매",
    "toLine": "신림선",
    "meters": 71,
    "sec": 59
  },
  {
    "line": "7",
    "station": "대림",
    "toLine": "2호선",
    "meters": 276,
    "sec": 230
  },
  {
    "line": "7",
    "station": "가산디지털단지",
    "toLine": "1호선",
    "meters": 110,
    "sec": 92
  },
  {
    "line": "7",
    "station": "온수",
    "toLine": "1호선",
    "meters": 102,
    "sec": 85
  },
  {
    "line": "8",
    "station": "천호",
    "toLine": "5호선",
    "meters": 35,
    "sec": 29
  },
  {
    "line": "8",
    "station": "석촌",
    "toLine": "9호선",
    "meters": 82,
    "sec": 68
  },
  {
    "line": "8",
    "station": "잠실",
    "toLine": "2호선",
    "meters": 190,
    "sec": 158
  },
  {
    "line": "8",
    "station": "가락시장",
    "toLine": "3호선",
    "meters": 35,
    "sec": 29
  },
  {
    "line": "8",
    "station": "복정",
    "toLine": "수인분당선",
    "meters": 16,
    "sec": 13
  },
  {
    "line": "8",
    "station": "모란",
    "toLine": "수인분당선",
    "meters": 99,
    "sec": 83
  }
];
