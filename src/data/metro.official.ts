/**
 * 자동 생성 파일 — 직접 수정하지 말 것. `npm run data:import` 로 다시 만든다.
 *
 * 출처 (모두 공공누리 제1유형, 출처표시)
 *  - 운행시간·거리: 서울교통공사 「서울교통공사_역간거리 및 소요시간」 (OA-12034, 2024-09-02 갱신)
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

export const METRO_OFFICIAL: Record<"1" | "2" | "3" | "4" | "5" | "5M" | "6" | "6L" | "7" | "8", { loop: boolean; stations: OfficialStation[]; segments: Array<{ from: string; to: string; runSec: number; distanceKm: number }> }> = {
  "1": {
    "stations": [
      {
        "nameKo": "서울역",
        "nameEn": "Seoul Station",
        "code": "133",
        "lat": 37.556228,
        "lon": 126.972135
      },
      {
        "nameKo": "시청",
        "nameEn": "City Hall",
        "code": "132",
        "lat": 37.565715,
        "lon": 126.977088
      },
      {
        "nameKo": "종각",
        "nameEn": "Jonggak",
        "code": "131",
        "lat": 37.570161,
        "lon": 126.982923
      },
      {
        "nameKo": "종로3가",
        "nameEn": "Jongno 3(sam)-ga",
        "code": "130",
        "lat": 37.570406,
        "lon": 126.991847
      },
      {
        "nameKo": "종로5가",
        "nameEn": "Jongno 5(o)-ga",
        "code": "129",
        "lat": 37.570926,
        "lon": 127.001849
      },
      {
        "nameKo": "동대문",
        "nameEn": "Dongdaemun",
        "code": "128",
        "lat": 37.571687,
        "lon": 127.01093
      },
      {
        "nameKo": "동묘앞",
        "nameEn": "Dongmyo",
        "code": "127",
        "lat": 37.573197,
        "lon": 127.01648
      },
      {
        "nameKo": "신설동",
        "nameEn": "Sinseol-dong",
        "code": "126",
        "lat": 37.576048,
        "lon": 127.024634
      },
      {
        "nameKo": "제기동",
        "nameEn": "Jegi-dong",
        "code": "125",
        "lat": 37.578103,
        "lon": 127.034893
      },
      {
        "nameKo": "청량리",
        "nameEn": "Cheongnyangni",
        "code": "124",
        "lat": 37.579956,
        "lon": 127.044585
      }
    ],
    "segments": [
      {
        "from": "서울역",
        "to": "시청",
        "runSec": 120,
        "distanceKm": 1.1
      },
      {
        "from": "시청",
        "to": "종각",
        "runSec": 120,
        "distanceKm": 1
      },
      {
        "from": "종각",
        "to": "종로3가",
        "runSec": 90,
        "distanceKm": 0.8
      },
      {
        "from": "종로3가",
        "to": "종로5가",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "종로5가",
        "to": "동대문",
        "runSec": 90,
        "distanceKm": 0.8
      },
      {
        "from": "동대문",
        "to": "동묘앞",
        "runSec": 60,
        "distanceKm": 0.6
      },
      {
        "from": "동묘앞",
        "to": "신설동",
        "runSec": 90,
        "distanceKm": 0.7
      },
      {
        "from": "신설동",
        "to": "제기동",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "제기동",
        "to": "청량리",
        "runSec": 90,
        "distanceKm": 1
      }
    ],
    "loop": false
  },
  "2": {
    "stations": [
      {
        "nameKo": "시청",
        "nameEn": "City Hall",
        "code": "201",
        "lat": 37.563588,
        "lon": 126.975411
      },
      {
        "nameKo": "을지로입구",
        "nameEn": "Euljiro 1(il)-ga",
        "code": "202",
        "lat": 37.566014,
        "lon": 126.982618
      },
      {
        "nameKo": "을지로3가",
        "nameEn": "Euljiro 3(sam)-ga",
        "code": "203",
        "lat": 37.566306,
        "lon": 126.991696
      },
      {
        "nameKo": "을지로4가",
        "nameEn": "Euljiro 4(sa)-ga",
        "code": "204",
        "lat": 37.566595,
        "lon": 126.997817
      },
      {
        "nameKo": "동대문역사문화공원",
        "nameEn": "Dongdaemun History & Culture Park",
        "code": "205",
        "lat": 37.565613,
        "lon": 127.009054
      },
      {
        "nameKo": "신당",
        "nameEn": "Sindang",
        "code": "206",
        "lat": 37.56564,
        "lon": 127.019614
      },
      {
        "nameKo": "상왕십리",
        "nameEn": "Sangwangsimni",
        "code": "207",
        "lat": 37.564354,
        "lon": 127.029354
      },
      {
        "nameKo": "왕십리",
        "nameEn": "Wangsimni",
        "code": "208",
        "lat": 37.561238,
        "lon": 127.036954
      },
      {
        "nameKo": "한양대",
        "nameEn": "Hanyang Univ.",
        "code": "209",
        "lat": 37.555273,
        "lon": 127.043655
      },
      {
        "nameKo": "뚝섬",
        "nameEn": "Ttukseom",
        "code": "210",
        "lat": 37.547184,
        "lon": 127.047367
      },
      {
        "nameKo": "성수",
        "nameEn": "Seongsu",
        "code": "211",
        "lat": 37.544581,
        "lon": 127.055961
      },
      {
        "nameKo": "건대입구",
        "nameEn": "Konkuk Univ.",
        "code": "212",
        "lat": 37.540373,
        "lon": 127.069191
      },
      {
        "nameKo": "구의",
        "nameEn": "Guui",
        "code": "213",
        "lat": 37.537077,
        "lon": 127.085916
      },
      {
        "nameKo": "강변",
        "nameEn": "Gangbyeon",
        "code": "214",
        "lat": 37.535095,
        "lon": 127.094681
      },
      {
        "nameKo": "잠실나루",
        "nameEn": "Jamsillaru",
        "code": "215",
        "lat": 37.520733,
        "lon": 127.10379
      },
      {
        "nameKo": "잠실",
        "nameEn": "Jamsil",
        "code": "216",
        "lat": 37.513262,
        "lon": 127.100159
      },
      {
        "nameKo": "잠실새내",
        "nameEn": "Jamsilsaenae",
        "code": "217",
        "lat": 37.511687,
        "lon": 127.086162
      },
      {
        "nameKo": "종합운동장",
        "nameEn": "Sports Complex",
        "code": "218",
        "lat": 37.511022,
        "lon": 127.073704
      },
      {
        "nameKo": "삼성",
        "nameEn": "Samseong",
        "code": "219",
        "lat": 37.508844,
        "lon": 127.06316
      },
      {
        "nameKo": "선릉",
        "nameEn": "Seolleung",
        "code": "220",
        "lat": 37.504286,
        "lon": 127.048203
      },
      {
        "nameKo": "역삼",
        "nameEn": "Yeoksam",
        "code": "221",
        "lat": 37.500622,
        "lon": 127.036456
      },
      {
        "nameKo": "강남",
        "nameEn": "Gangnam",
        "code": "222",
        "lat": 37.49799,
        "lon": 127.027912
      },
      {
        "nameKo": "교대",
        "nameEn": "Seoul Nat'l Univ. of Education",
        "code": "223",
        "lat": 37.493961,
        "lon": 127.014667
      },
      {
        "nameKo": "서초",
        "nameEn": "Seocho",
        "code": "224",
        "lat": 37.491897,
        "lon": 127.007917
      },
      {
        "nameKo": "방배",
        "nameEn": "Bangbae",
        "code": "225",
        "lat": 37.481426,
        "lon": 126.997596
      },
      {
        "nameKo": "사당",
        "nameEn": "Sadang",
        "code": "226",
        "lat": 37.476538,
        "lon": 126.981544
      },
      {
        "nameKo": "낙성대",
        "nameEn": "Nakseongdae",
        "code": "227",
        "lat": 37.47693,
        "lon": 126.963693
      },
      {
        "nameKo": "서울대입구",
        "nameEn": "Seoul Nat'l Univ.",
        "code": "228",
        "lat": 37.481247,
        "lon": 126.952739
      },
      {
        "nameKo": "봉천",
        "nameEn": "Bongcheon",
        "code": "229",
        "lat": 37.482362,
        "lon": 126.941892
      },
      {
        "nameKo": "신림",
        "nameEn": "Sillim",
        "code": "230",
        "lat": 37.484201,
        "lon": 126.929715
      },
      {
        "nameKo": "신대방",
        "nameEn": "Sindaebang",
        "code": "231",
        "lat": 37.487462,
        "lon": 126.913149
      },
      {
        "nameKo": "구로디지털단지",
        "nameEn": "Guro Digital Complex",
        "code": "232",
        "lat": 37.485266,
        "lon": 126.901401
      },
      {
        "nameKo": "대림",
        "nameEn": "Daerim",
        "code": "233",
        "lat": 37.493243,
        "lon": 126.894932
      },
      {
        "nameKo": "신도림",
        "nameEn": "Sindorim",
        "code": "234",
        "lat": 37.508961,
        "lon": 126.891084
      },
      {
        "nameKo": "문래",
        "nameEn": "Mullae",
        "code": "235",
        "lat": 37.517933,
        "lon": 126.89476
      },
      {
        "nameKo": "영등포구청",
        "nameEn": "Yeongdeungpo-gu Office",
        "code": "236",
        "lat": 37.525706,
        "lon": 126.89661
      },
      {
        "nameKo": "당산",
        "nameEn": "Dangsan",
        "code": "237",
        "lat": 37.534946,
        "lon": 126.902767
      },
      {
        "nameKo": "합정",
        "nameEn": "Hapjeong",
        "code": "238",
        "lat": 37.549457,
        "lon": 126.913808
      },
      {
        "nameKo": "홍대입구",
        "nameEn": "Hongik Univ.",
        "code": "239",
        "lat": 37.55679,
        "lon": 126.923708
      },
      {
        "nameKo": "신촌",
        "nameEn": "Sinchon",
        "code": "240",
        "lat": 37.555131,
        "lon": 126.936926
      },
      {
        "nameKo": "이대",
        "nameEn": "Ewha Womans Univ.",
        "code": "241",
        "lat": 37.556733,
        "lon": 126.946013
      },
      {
        "nameKo": "아현",
        "nameEn": "Ahyeon",
        "code": "242",
        "lat": 37.557345,
        "lon": 126.956141
      },
      {
        "nameKo": "충정로",
        "nameEn": "Chungjeongno",
        "code": "243",
        "lat": 37.559704,
        "lon": 126.964378
      }
    ],
    "segments": [],
    "loop": true
  },
  "3": {
    "stations": [
      {
        "nameKo": "지축",
        "nameEn": "Jichuk",
        "code": "319",
        "lat": 37.648033,
        "lon": 126.913917
      },
      {
        "nameKo": "구파발",
        "nameEn": "Gupabal",
        "code": "320",
        "lat": 37.636763,
        "lon": 126.918821
      },
      {
        "nameKo": "연신내",
        "nameEn": "Yeonsinnae",
        "code": "321",
        "lat": 37.619229,
        "lon": 126.921038
      },
      {
        "nameKo": "불광",
        "nameEn": "Bulgwang",
        "code": "322",
        "lat": 37.610553,
        "lon": 126.92982
      },
      {
        "nameKo": "녹번",
        "nameEn": "Nokbeon",
        "code": "323",
        "lat": 37.600927,
        "lon": 126.935756
      },
      {
        "nameKo": "홍제",
        "nameEn": "Hongje",
        "code": "324",
        "lat": 37.589066,
        "lon": 126.943736
      },
      {
        "nameKo": "무악재",
        "nameEn": "Muakjae",
        "code": "325",
        "lat": 37.582299,
        "lon": 126.950291
      },
      {
        "nameKo": "독립문",
        "nameEn": "Dongnimmun",
        "code": "326",
        "lat": 37.574571,
        "lon": 126.957748
      },
      {
        "nameKo": "경복궁",
        "nameEn": "Gyeongbokgung",
        "code": "327",
        "lat": 37.575762,
        "lon": 126.97353
      },
      {
        "nameKo": "안국",
        "nameEn": "Anguk",
        "code": "328",
        "lat": 37.576477,
        "lon": 126.985443
      },
      {
        "nameKo": "종로3가",
        "nameEn": "Jongno 3(sam)-ga",
        "code": "329",
        "lat": 37.571605,
        "lon": 126.991791
      },
      {
        "nameKo": "을지로3가",
        "nameEn": "Euljiro 3(sam)-ga",
        "code": "330",
        "lat": 37.566672,
        "lon": 126.992548
      },
      {
        "nameKo": "충무로",
        "nameEn": "Chungmuro",
        "code": "331",
        "lat": 37.56143,
        "lon": 126.994072
      },
      {
        "nameKo": "동대입구",
        "nameEn": "Dongguk Univ.",
        "code": "332",
        "lat": 37.559052,
        "lon": 127.005602
      },
      {
        "nameKo": "약수",
        "nameEn": "Yaksu",
        "code": "333",
        "lat": 37.554867,
        "lon": 127.010541
      },
      {
        "nameKo": "금호",
        "nameEn": "Geumho",
        "code": "334",
        "lat": 37.548034,
        "lon": 127.015872
      },
      {
        "nameKo": "옥수",
        "nameEn": "Oksu",
        "code": "335",
        "lat": 37.541684,
        "lon": 127.017269
      },
      {
        "nameKo": "압구정",
        "nameEn": "Apgujeong",
        "code": "336",
        "lat": 37.527072,
        "lon": 127.028461
      },
      {
        "nameKo": "신사",
        "nameEn": "Sinsa",
        "code": "337",
        "lat": 37.516334,
        "lon": 127.020114
      },
      {
        "nameKo": "잠원",
        "nameEn": "Jamwon",
        "code": "338",
        "lat": 37.512759,
        "lon": 127.01122
      },
      {
        "nameKo": "고속터미널",
        "nameEn": "Express Bus Terminal",
        "code": "339",
        "lat": 37.504891,
        "lon": 127.004916
      },
      {
        "nameKo": "교대",
        "nameEn": "Seoul Nat'l Univ. of Education",
        "code": "340",
        "lat": 37.493025,
        "lon": 127.013786
      },
      {
        "nameKo": "남부터미널",
        "nameEn": "Nambu Bus Terminal",
        "code": "341",
        "lat": 37.485013,
        "lon": 127.016189
      },
      {
        "nameKo": "양재",
        "nameEn": "Yangjae",
        "code": "342",
        "lat": 37.484477,
        "lon": 127.033902
      },
      {
        "nameKo": "매봉",
        "nameEn": "Maebong",
        "code": "343",
        "lat": 37.486947,
        "lon": 127.046769
      },
      {
        "nameKo": "도곡",
        "nameEn": "Dogok",
        "code": "344",
        "lat": 37.490922,
        "lon": 127.055452
      },
      {
        "nameKo": "대치",
        "nameEn": "Daechi",
        "code": "345",
        "lat": 37.494612,
        "lon": 127.063642
      },
      {
        "nameKo": "학여울",
        "nameEn": "Hangnyeoul",
        "code": "346",
        "lat": 37.496663,
        "lon": 127.070594
      },
      {
        "nameKo": "대청",
        "nameEn": "Daecheong",
        "code": "347",
        "lat": 37.493514,
        "lon": 127.079532
      },
      {
        "nameKo": "일원",
        "nameEn": "Irwon",
        "code": "348",
        "lat": 37.483681,
        "lon": 127.08439
      },
      {
        "nameKo": "수서",
        "nameEn": "Suseo",
        "code": "349",
        "lat": 37.487378,
        "lon": 127.101907
      },
      {
        "nameKo": "가락시장",
        "nameEn": "Garak Market",
        "code": "350",
        "lat": 37.492245,
        "lon": 127.117757
      },
      {
        "nameKo": "경찰병원",
        "nameEn": "National Police Hospital",
        "code": "351",
        "lat": 37.495918,
        "lon": 127.12454
      },
      {
        "nameKo": "오금",
        "nameEn": "Ogeum",
        "code": "352",
        "lat": 37.502129,
        "lon": 127.128319
      }
    ],
    "segments": [],
    "loop": false
  },
  "4": {
    "stations": [
      {
        "nameKo": "불암산",
        "nameEn": "Buramsan",
        "code": "409",
        "lat": 37.670272,
        "lon": 127.079066
      },
      {
        "nameKo": "상계",
        "nameEn": "Sanggye",
        "code": "410",
        "lat": 37.660878,
        "lon": 127.073572
      },
      {
        "nameKo": "노원",
        "nameEn": "Nowon",
        "code": "411",
        "lat": 37.65627,
        "lon": 127.063276
      },
      {
        "nameKo": "창동",
        "nameEn": "Chang-dong",
        "code": "412",
        "lat": 37.653088,
        "lon": 127.047274
      },
      {
        "nameKo": "쌍문",
        "nameEn": "Ssangmun",
        "code": "413",
        "lat": 37.648627,
        "lon": 127.034709
      },
      {
        "nameKo": "수유",
        "nameEn": "Suyu",
        "code": "414",
        "lat": 37.638052,
        "lon": 127.025732
      },
      {
        "nameKo": "미아",
        "nameEn": "Mia",
        "code": "415",
        "lat": 37.62667,
        "lon": 127.025983
      },
      {
        "nameKo": "미아사거리",
        "nameEn": "Miasageori",
        "code": "416",
        "lat": 37.613292,
        "lon": 127.030053
      },
      {
        "nameKo": "길음",
        "nameEn": "Gireum",
        "code": "417",
        "lat": 37.603407,
        "lon": 127.025053
      },
      {
        "nameKo": "성신여대입구",
        "nameEn": "Sungshin Women's Univ.",
        "code": "418",
        "lat": 37.592612,
        "lon": 127.016441
      },
      {
        "nameKo": "한성대입구",
        "nameEn": "Hansung Univ.",
        "code": "419",
        "lat": 37.588458,
        "lon": 127.006221
      },
      {
        "nameKo": "혜화",
        "nameEn": "Hyehwa",
        "code": "420",
        "lat": 37.582336,
        "lon": 127.001844
      },
      {
        "nameKo": "동대문",
        "nameEn": "Dongdaemun",
        "code": "421",
        "lat": 37.57093,
        "lon": 127.009287
      },
      {
        "nameKo": "동대문역사문화공원",
        "nameEn": "Dongdaemun History & Culture Park",
        "code": "422",
        "lat": 37.565133,
        "lon": 127.007885
      },
      {
        "nameKo": "충무로",
        "nameEn": "Chungmuro",
        "code": "423",
        "lat": 37.561207,
        "lon": 126.99408
      },
      {
        "nameKo": "명동",
        "nameEn": "Myeong-dong",
        "code": "424",
        "lat": 37.560989,
        "lon": 126.986325
      },
      {
        "nameKo": "회현",
        "nameEn": "Hoehyeon",
        "code": "425",
        "lat": 37.558514,
        "lon": 126.978246
      },
      {
        "nameKo": "서울역",
        "nameEn": "Seoul Station",
        "code": "426",
        "lat": 37.55281,
        "lon": 126.972556
      },
      {
        "nameKo": "숙대입구",
        "nameEn": "Sookmyung Women's Univ.",
        "code": "427",
        "lat": 37.54456,
        "lon": 126.972106
      },
      {
        "nameKo": "삼각지",
        "nameEn": "Samgakji",
        "code": "428",
        "lat": 37.534075,
        "lon": 126.9726
      },
      {
        "nameKo": "신용산",
        "nameEn": "Sinyongsan",
        "code": "429",
        "lat": 37.52917,
        "lon": 126.967894
      },
      {
        "nameKo": "이촌",
        "nameEn": "Ichon",
        "code": "430",
        "lat": 37.522295,
        "lon": 126.974733
      },
      {
        "nameKo": "동작",
        "nameEn": "Dongjak",
        "code": "431",
        "lat": 37.502852,
        "lon": 126.980347
      },
      {
        "nameKo": "총신대입구",
        "nameEn": "Chongshin Univ.",
        "code": "432",
        "lat": 37.486263,
        "lon": 126.981989
      },
      {
        "nameKo": "사당",
        "nameEn": "Sadang",
        "code": "433",
        "lat": 37.476955,
        "lon": 126.981651
      },
      {
        "nameKo": "남태령",
        "nameEn": "Namtaeryeong",
        "code": "434",
        "lat": 37.463873,
        "lon": 126.989134
      }
    ],
    "segments": [
      {
        "from": "불암산",
        "to": "상계",
        "runSec": 90,
        "distanceKm": 1.2
      },
      {
        "from": "상계",
        "to": "노원",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "노원",
        "to": "창동",
        "runSec": 120,
        "distanceKm": 1.4
      },
      {
        "from": "창동",
        "to": "쌍문",
        "runSec": 90,
        "distanceKm": 1.3
      },
      {
        "from": "쌍문",
        "to": "수유",
        "runSec": 120,
        "distanceKm": 1.5
      },
      {
        "from": "수유",
        "to": "미아",
        "runSec": 90,
        "distanceKm": 1.4
      },
      {
        "from": "미아",
        "to": "미아사거리",
        "runSec": 120,
        "distanceKm": 1.5
      },
      {
        "from": "미아사거리",
        "to": "길음",
        "runSec": 90,
        "distanceKm": 1.3
      },
      {
        "from": "길음",
        "to": "성신여대입구",
        "runSec": 120,
        "distanceKm": 1.4
      },
      {
        "from": "성신여대입구",
        "to": "한성대입구",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "한성대입구",
        "to": "혜화",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "혜화",
        "to": "동대문",
        "runSec": 120,
        "distanceKm": 1.5
      },
      {
        "from": "동대문",
        "to": "동대문역사문화공원",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "동대문역사문화공원",
        "to": "충무로",
        "runSec": 120,
        "distanceKm": 1.3
      },
      {
        "from": "충무로",
        "to": "명동",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "명동",
        "to": "회현",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "회현",
        "to": "서울역",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "서울역",
        "to": "숙대입구",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "숙대입구",
        "to": "삼각지",
        "runSec": 90,
        "distanceKm": 1.2
      },
      {
        "from": "삼각지",
        "to": "신용산",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "신용산",
        "to": "이촌",
        "runSec": 90,
        "distanceKm": 1.3
      },
      {
        "from": "이촌",
        "to": "동작",
        "runSec": 180,
        "distanceKm": 2.7
      },
      {
        "from": "동작",
        "to": "총신대입구",
        "runSec": 150,
        "distanceKm": 1.8
      },
      {
        "from": "총신대입구",
        "to": "사당",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "사당",
        "to": "남태령",
        "runSec": 90,
        "distanceKm": 1.6
      }
    ],
    "loop": false
  },
  "5": {
    "stations": [
      {
        "nameKo": "방화",
        "nameEn": "Banghwa",
        "code": "510",
        "lat": 37.577446,
        "lon": 126.812741
      },
      {
        "nameKo": "개화산",
        "nameEn": "Gaehwasan",
        "code": "511",
        "lat": 37.572399,
        "lon": 126.806171
      },
      {
        "nameKo": "김포공항",
        "nameEn": "Gimpo Intl. Airport",
        "code": "512",
        "lat": 37.562384,
        "lon": 126.801292
      },
      {
        "nameKo": "송정",
        "nameEn": "Songjeong",
        "code": "513",
        "lat": 37.561184,
        "lon": 126.811973
      },
      {
        "nameKo": "마곡",
        "nameEn": "Magok",
        "code": "514",
        "lat": 37.560183,
        "lon": 126.825448
      },
      {
        "nameKo": "발산",
        "nameEn": "Balsan",
        "code": "515",
        "lat": 37.558598,
        "lon": 126.837668
      },
      {
        "nameKo": "우장산",
        "nameEn": "Ujangsan",
        "code": "516",
        "lat": 37.548768,
        "lon": 126.836318
      },
      {
        "nameKo": "화곡",
        "nameEn": "Hwagok",
        "code": "517",
        "lat": 37.541513,
        "lon": 126.840461
      },
      {
        "nameKo": "까치산",
        "nameEn": "Kkachisan",
        "code": "518",
        "lat": 37.531768,
        "lon": 126.846683
      },
      {
        "nameKo": "신정",
        "nameEn": "Sinjeong",
        "code": "519",
        "lat": 37.524997,
        "lon": 126.856191
      },
      {
        "nameKo": "목동",
        "nameEn": "Mok-dong",
        "code": "520",
        "lat": 37.526065,
        "lon": 126.864931
      },
      {
        "nameKo": "오목교",
        "nameEn": "Omokgyo",
        "code": "521",
        "lat": 37.524496,
        "lon": 126.875181
      },
      {
        "nameKo": "양평",
        "nameEn": "Yangpyeong",
        "code": "522",
        "lat": 37.525569,
        "lon": 126.886129
      },
      {
        "nameKo": "영등포구청",
        "nameEn": "Yeongdeungpo-gu Office",
        "code": "523",
        "lat": 37.5242,
        "lon": 126.89503
      },
      {
        "nameKo": "영등포시장",
        "nameEn": "Yeongdeungpo Market",
        "code": "524",
        "lat": 37.522669,
        "lon": 126.905139
      },
      {
        "nameKo": "신길",
        "nameEn": "Singil",
        "code": "525",
        "lat": 37.517623,
        "lon": 126.914839
      },
      {
        "nameKo": "여의도",
        "nameEn": "Yeouido",
        "code": "526",
        "lat": 37.521747,
        "lon": 126.924357
      },
      {
        "nameKo": "여의나루",
        "nameEn": "Yeouinaru",
        "code": "527",
        "lat": 37.527098,
        "lon": 126.932901
      },
      {
        "nameKo": "마포",
        "nameEn": "Mapo",
        "code": "528",
        "lat": 37.539574,
        "lon": 126.945932
      },
      {
        "nameKo": "공덕",
        "nameEn": "Gongdeok",
        "code": "529",
        "lat": 37.544431,
        "lon": 126.951372
      },
      {
        "nameKo": "애오개",
        "nameEn": "Aeogae",
        "code": "530",
        "lat": 37.553736,
        "lon": 126.95682
      },
      {
        "nameKo": "충정로",
        "nameEn": "Chungjeongno",
        "code": "531",
        "lat": 37.560236,
        "lon": 126.9629
      },
      {
        "nameKo": "서대문",
        "nameEn": "Seodaemun",
        "code": "532",
        "lat": 37.565773,
        "lon": 126.966641
      },
      {
        "nameKo": "광화문",
        "nameEn": "Gwanghwamun",
        "code": "533",
        "lat": 37.571525,
        "lon": 126.97717
      },
      {
        "nameKo": "종로3가",
        "nameEn": "Jongno 3(sam)-ga",
        "code": "534",
        "lat": 37.57254,
        "lon": 126.990305
      },
      {
        "nameKo": "을지로4가",
        "nameEn": "Euljiro 4(sa)-ga",
        "code": "535",
        "lat": 37.567352,
        "lon": 126.998032
      },
      {
        "nameKo": "동대문역사문화공원",
        "nameEn": "Dongdaemun History & Culture Park",
        "code": "536",
        "lat": 37.564665,
        "lon": 127.005353
      },
      {
        "nameKo": "청구",
        "nameEn": "Cheonggu",
        "code": "537",
        "lat": 37.560276,
        "lon": 127.013639
      },
      {
        "nameKo": "신금호",
        "nameEn": "Singeumho",
        "code": "538",
        "lat": 37.554548,
        "lon": 127.020331
      },
      {
        "nameKo": "행당",
        "nameEn": "Haengdang",
        "code": "539",
        "lat": 37.557322,
        "lon": 127.029476
      },
      {
        "nameKo": "왕십리",
        "nameEn": "Wangsimni",
        "code": "540",
        "lat": 37.56184,
        "lon": 127.037059
      },
      {
        "nameKo": "마장",
        "nameEn": "Majang",
        "code": "541",
        "lat": 37.5661,
        "lon": 127.042973
      },
      {
        "nameKo": "답십리",
        "nameEn": "Dapsimni",
        "code": "542",
        "lat": 37.566747,
        "lon": 127.052704
      },
      {
        "nameKo": "장한평",
        "nameEn": "Janghanpyeong",
        "code": "543",
        "lat": 37.56144,
        "lon": 127.064623
      },
      {
        "nameKo": "군자",
        "nameEn": "Gunja",
        "code": "544",
        "lat": 37.557088,
        "lon": 127.079577
      },
      {
        "nameKo": "아차산",
        "nameEn": "Achasan",
        "code": "545",
        "lat": 37.551691,
        "lon": 127.089761
      },
      {
        "nameKo": "광나루",
        "nameEn": "Gwangnaru",
        "code": "546",
        "lat": 37.545303,
        "lon": 127.10357
      },
      {
        "nameKo": "천호",
        "nameEn": "Cheonho",
        "code": "547",
        "lat": 37.53864,
        "lon": 127.123308
      },
      {
        "nameKo": "강동",
        "nameEn": "Gangdong",
        "code": "548",
        "lat": 37.535804,
        "lon": 127.132481
      },
      {
        "nameKo": "길동",
        "nameEn": "Gil-dong",
        "code": "549",
        "lat": 37.537801,
        "lon": 127.140004
      },
      {
        "nameKo": "굽은다리",
        "nameEn": "Gubeundari",
        "code": "550",
        "lat": 37.545477,
        "lon": 127.142853
      },
      {
        "nameKo": "명일",
        "nameEn": "Myeongil",
        "code": "551",
        "lat": 37.55137,
        "lon": 127.143999
      },
      {
        "nameKo": "고덕",
        "nameEn": "Godeok",
        "code": "552",
        "lat": 37.555004,
        "lon": 127.154151
      },
      {
        "nameKo": "상일동",
        "nameEn": "Sangil-dong",
        "code": "553",
        "lat": 37.556712,
        "lon": 127.166417
      },
      {
        "nameKo": "강일",
        "nameEn": "Gangil",
        "code": "554",
        "lat": 37.55749,
        "lon": 127.17593
      },
      {
        "nameKo": "미사",
        "nameEn": "Misa",
        "code": "555",
        "lat": 37.560927,
        "lon": 127.193877
      },
      {
        "nameKo": "하남풍산",
        "nameEn": "Hanam Pungsan",
        "code": "556",
        "lat": 37.552034,
        "lon": 127.203864
      },
      {
        "nameKo": "하남시청",
        "nameEn": "Hanam City Hall",
        "code": "557",
        "lat": 37.54205,
        "lon": 127.20612
      },
      {
        "nameKo": "하남검단산",
        "nameEn": "Hanam Geomdansan",
        "code": "558",
        "lat": 37.53972,
        "lon": 127.22345
      }
    ],
    "segments": [
      {
        "from": "방화",
        "to": "개화산",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "개화산",
        "to": "김포공항",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "김포공항",
        "to": "송정",
        "runSec": 130,
        "distanceKm": 1.2
      },
      {
        "from": "송정",
        "to": "마곡",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "마곡",
        "to": "발산",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "발산",
        "to": "우장산",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "우장산",
        "to": "화곡",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "화곡",
        "to": "까치산",
        "runSec": 90,
        "distanceKm": 1.2
      },
      {
        "from": "까치산",
        "to": "신정",
        "runSec": 110,
        "distanceKm": 1.3
      },
      {
        "from": "신정",
        "to": "목동",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "목동",
        "to": "오목교",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "오목교",
        "to": "양평",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "양평",
        "to": "영등포구청",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "영등포구청",
        "to": "영등포시장",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "영등포시장",
        "to": "신길",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "신길",
        "to": "여의도",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "여의도",
        "to": "여의나루",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "여의나루",
        "to": "마포",
        "runSec": 120,
        "distanceKm": 1.8
      },
      {
        "from": "마포",
        "to": "공덕",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "공덕",
        "to": "애오개",
        "runSec": 80,
        "distanceKm": 1.1
      },
      {
        "from": "애오개",
        "to": "충정로",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "충정로",
        "to": "서대문",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "서대문",
        "to": "광화문",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "광화문",
        "to": "종로3가",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "종로3가",
        "to": "을지로4가",
        "runSec": 100,
        "distanceKm": 1
      },
      {
        "from": "을지로4가",
        "to": "동대문역사문화공원",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "동대문역사문화공원",
        "to": "청구",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "청구",
        "to": "신금호",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "신금호",
        "to": "행당",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "행당",
        "to": "왕십리",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "왕십리",
        "to": "마장",
        "runSec": 60,
        "distanceKm": 0.7
      },
      {
        "from": "마장",
        "to": "답십리",
        "runSec": 100,
        "distanceKm": 1
      },
      {
        "from": "답십리",
        "to": "장한평",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "장한평",
        "to": "군자",
        "runSec": 100,
        "distanceKm": 1.5
      },
      {
        "from": "군자",
        "to": "아차산",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "아차산",
        "to": "광나루",
        "runSec": 110,
        "distanceKm": 1.5
      },
      {
        "from": "광나루",
        "to": "천호",
        "runSec": 130,
        "distanceKm": 2
      },
      {
        "from": "천호",
        "to": "강동",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "강동",
        "to": "길동",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "길동",
        "to": "굽은다리",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "굽은다리",
        "to": "명일",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "명일",
        "to": "고덕",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "고덕",
        "to": "상일동",
        "runSec": 100,
        "distanceKm": 1.1
      },
      {
        "from": "상일동",
        "to": "강일",
        "runSec": 110,
        "distanceKm": 0.8
      },
      {
        "from": "강일",
        "to": "미사",
        "runSec": 110,
        "distanceKm": 1.7
      },
      {
        "from": "미사",
        "to": "하남풍산",
        "runSec": 150,
        "distanceKm": 2.1
      },
      {
        "from": "하남풍산",
        "to": "하남시청",
        "runSec": 110,
        "distanceKm": 1.3
      },
      {
        "from": "하남시청",
        "to": "하남검단산",
        "runSec": 150,
        "distanceKm": 1.6
      }
    ],
    "loop": false
  },
  "6": {
    "stations": [
      {
        "nameKo": "응암",
        "nameEn": "Eungam",
        "code": "610",
        "lat": 37.598605,
        "lon": 126.915577
      },
      {
        "nameKo": "새절",
        "nameEn": "Saejeol",
        "code": "616",
        "lat": 37.591148,
        "lon": 126.913629
      },
      {
        "nameKo": "증산",
        "nameEn": "Jeungsan",
        "code": "617",
        "lat": 37.583876,
        "lon": 126.909645
      },
      {
        "nameKo": "디지털미디어시티",
        "nameEn": "Digital Media City",
        "code": "618",
        "lat": 37.576108,
        "lon": 126.901391
      },
      {
        "nameKo": "월드컵경기장",
        "nameEn": "World Cup Stadium",
        "code": "619",
        "lat": 37.569532,
        "lon": 126.899298
      },
      {
        "nameKo": "마포구청",
        "nameEn": "Mapo-gu Office",
        "code": "620",
        "lat": 37.563515,
        "lon": 126.903343
      },
      {
        "nameKo": "망원",
        "nameEn": "Mangwon",
        "code": "621",
        "lat": 37.556094,
        "lon": 126.910052
      },
      {
        "nameKo": "합정",
        "nameEn": "Hapjeong",
        "code": "622",
        "lat": 37.549209,
        "lon": 126.913366
      },
      {
        "nameKo": "상수",
        "nameEn": "Sangsu",
        "code": "623",
        "lat": 37.547716,
        "lon": 126.922852
      },
      {
        "nameKo": "광흥창",
        "nameEn": "Gwangheungchang",
        "code": "624",
        "lat": 37.547456,
        "lon": 126.931993
      },
      {
        "nameKo": "대흥",
        "nameEn": "Daeheung",
        "code": "625",
        "lat": 37.547771,
        "lon": 126.942069
      },
      {
        "nameKo": "공덕",
        "nameEn": "Gongdeok",
        "code": "626",
        "lat": 37.543555,
        "lon": 126.951678
      },
      {
        "nameKo": "효창공원앞",
        "nameEn": "Hyochang park",
        "code": "627",
        "lat": 37.539233,
        "lon": 126.961384
      },
      {
        "nameKo": "삼각지",
        "nameEn": "Samgakji",
        "code": "628",
        "lat": 37.535534,
        "lon": 126.974032
      },
      {
        "nameKo": "녹사평",
        "nameEn": "Noksapyeong",
        "code": "629",
        "lat": 37.534675,
        "lon": 126.986695
      },
      {
        "nameKo": "이태원",
        "nameEn": "Itaewon",
        "code": "630",
        "lat": 37.534488,
        "lon": 126.994302
      },
      {
        "nameKo": "한강진",
        "nameEn": "Hangangjin",
        "code": "631",
        "lat": 37.539631,
        "lon": 127.001725
      },
      {
        "nameKo": "버티고개",
        "nameEn": "Beotigogae",
        "code": "632",
        "lat": 37.548013,
        "lon": 127.007055
      },
      {
        "nameKo": "약수",
        "nameEn": "Yaksu",
        "code": "633",
        "lat": 37.554263,
        "lon": 127.010358
      },
      {
        "nameKo": "청구",
        "nameEn": "Cheonggu",
        "code": "634",
        "lat": 37.560608,
        "lon": 127.013986
      },
      {
        "nameKo": "신당",
        "nameEn": "Sindang",
        "code": "635",
        "lat": 37.566154,
        "lon": 127.016146
      },
      {
        "nameKo": "동묘앞",
        "nameEn": "Dongmyo",
        "code": "636",
        "lat": 37.572279,
        "lon": 127.015653
      },
      {
        "nameKo": "창신",
        "nameEn": "Changsin",
        "code": "637",
        "lat": 37.579661,
        "lon": 127.015241
      },
      {
        "nameKo": "보문",
        "nameEn": "Bomun",
        "code": "638",
        "lat": 37.585274,
        "lon": 127.019351
      },
      {
        "nameKo": "안암",
        "nameEn": "Anam",
        "code": "639",
        "lat": 37.586272,
        "lon": 127.029005
      },
      {
        "nameKo": "고려대",
        "nameEn": "Korea Univ.",
        "code": "640",
        "lat": 37.590508,
        "lon": 127.036296
      },
      {
        "nameKo": "월곡",
        "nameEn": "Wolgok",
        "code": "641",
        "lat": 37.601948,
        "lon": 127.041518
      },
      {
        "nameKo": "상월곡",
        "nameEn": "Sangwolgok",
        "code": "642",
        "lat": 37.606377,
        "lon": 127.048491
      },
      {
        "nameKo": "돌곶이",
        "nameEn": "Dolgoji",
        "code": "643",
        "lat": 37.610537,
        "lon": 127.056431
      },
      {
        "nameKo": "석계",
        "nameEn": "Seokgye",
        "code": "644",
        "lat": 37.614872,
        "lon": 127.065595
      },
      {
        "nameKo": "태릉입구",
        "nameEn": "Taereung",
        "code": "645",
        "lat": 37.617338,
        "lon": 127.074735
      },
      {
        "nameKo": "화랑대",
        "nameEn": "Hwarangdae",
        "code": "646",
        "lat": 37.620064,
        "lon": 127.084689
      },
      {
        "nameKo": "봉화산",
        "nameEn": "Bonghwasan",
        "code": "647",
        "lat": 37.617283,
        "lon": 127.091401
      },
      {
        "nameKo": "신내",
        "nameEn": "Sinnae",
        "code": "648",
        "lat": 37.613174,
        "lon": 127.102231
      }
    ],
    "segments": [
      {
        "from": "응암",
        "to": "새절",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "새절",
        "to": "증산",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "증산",
        "to": "디지털미디어시티",
        "runSec": 80,
        "distanceKm": 1.1
      },
      {
        "from": "디지털미디어시티",
        "to": "월드컵경기장",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "월드컵경기장",
        "to": "마포구청",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "마포구청",
        "to": "망원",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "망원",
        "to": "합정",
        "runSec": 80,
        "distanceKm": 0.8
      },
      {
        "from": "합정",
        "to": "상수",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "상수",
        "to": "광흥창",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "광흥창",
        "to": "대흥",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "대흥",
        "to": "공덕",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "공덕",
        "to": "효창공원앞",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "효창공원앞",
        "to": "삼각지",
        "runSec": 90,
        "distanceKm": 1.2
      },
      {
        "from": "삼각지",
        "to": "녹사평",
        "runSec": 100,
        "distanceKm": 1.1
      },
      {
        "from": "녹사평",
        "to": "이태원",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "이태원",
        "to": "한강진",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "한강진",
        "to": "버티고개",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "버티고개",
        "to": "약수",
        "runSec": 70,
        "distanceKm": 0.7
      },
      {
        "from": "약수",
        "to": "청구",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "청구",
        "to": "신당",
        "runSec": 70,
        "distanceKm": 0.7
      },
      {
        "from": "신당",
        "to": "동묘앞",
        "runSec": 60,
        "distanceKm": 0.6
      },
      {
        "from": "동묘앞",
        "to": "창신",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "창신",
        "to": "보문",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "보문",
        "to": "안암",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "안암",
        "to": "고려대",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "고려대",
        "to": "월곡",
        "runSec": 100,
        "distanceKm": 1.4
      },
      {
        "from": "월곡",
        "to": "상월곡",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "상월곡",
        "to": "돌곶이",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "돌곶이",
        "to": "석계",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "석계",
        "to": "태릉입구",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "태릉입구",
        "to": "화랑대",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "화랑대",
        "to": "봉화산",
        "runSec": 80,
        "distanceKm": 0.7
      },
      {
        "from": "봉화산",
        "to": "신내",
        "runSec": 270,
        "distanceKm": 1.3
      }
    ],
    "loop": false
  },
  "7": {
    "stations": [
      {
        "nameKo": "장암",
        "nameEn": "Jangam",
        "code": "709",
        "lat": 37.700109,
        "lon": 127.053196
      },
      {
        "nameKo": "도봉산",
        "nameEn": "Dobongsan",
        "code": "710",
        "lat": 37.689241,
        "lon": 127.046509
      },
      {
        "nameKo": "수락산",
        "nameEn": "Suraksan",
        "code": "711",
        "lat": 37.67785,
        "lon": 127.055315
      },
      {
        "nameKo": "마들",
        "nameEn": "Madeul",
        "code": "712",
        "lat": 37.66494,
        "lon": 127.057675
      },
      {
        "nameKo": "노원",
        "nameEn": "Nowon",
        "code": "713",
        "lat": 37.654836,
        "lon": 127.060462
      },
      {
        "nameKo": "중계",
        "nameEn": "Junggye",
        "code": "714",
        "lat": 37.644583,
        "lon": 127.064303
      },
      {
        "nameKo": "하계",
        "nameEn": "Hagye",
        "code": "715",
        "lat": 37.636352,
        "lon": 127.06799
      },
      {
        "nameKo": "공릉",
        "nameEn": "Gongneung",
        "code": "716",
        "lat": 37.625742,
        "lon": 127.072896
      },
      {
        "nameKo": "태릉입구",
        "nameEn": "Taereung",
        "code": "717",
        "lat": 37.618294,
        "lon": 127.075397
      },
      {
        "nameKo": "먹골",
        "nameEn": "Meokgol",
        "code": "718",
        "lat": 37.610637,
        "lon": 127.077725
      },
      {
        "nameKo": "중화",
        "nameEn": "Junghwa",
        "code": "719",
        "lat": 37.602545,
        "lon": 127.079264
      },
      {
        "nameKo": "상봉",
        "nameEn": "Sangbong",
        "code": "720",
        "lat": 37.595577,
        "lon": 127.085716
      },
      {
        "nameKo": "면목",
        "nameEn": "Myeonmok",
        "code": "721",
        "lat": 37.588579,
        "lon": 127.087503
      },
      {
        "nameKo": "사가정",
        "nameEn": "Sagajeong",
        "code": "722",
        "lat": 37.580894,
        "lon": 127.088478
      },
      {
        "nameKo": "용마산",
        "nameEn": "Yongmasan",
        "code": "723",
        "lat": 37.573647,
        "lon": 127.086727
      },
      {
        "nameKo": "중곡",
        "nameEn": "Junggok",
        "code": "724",
        "lat": 37.565923,
        "lon": 127.08432
      },
      {
        "nameKo": "군자",
        "nameEn": "Gunja",
        "code": "725",
        "lat": 37.556897,
        "lon": 127.079338
      },
      {
        "nameKo": "어린이대공원",
        "nameEn": "Children's Grand Park",
        "code": "726",
        "lat": 37.548014,
        "lon": 127.074658
      },
      {
        "nameKo": "건대입구",
        "nameEn": "Konkuk Univ.",
        "code": "727",
        "lat": 37.540786,
        "lon": 127.071011
      },
      {
        "nameKo": "자양",
        "nameEn": "Jayang",
        "code": "728",
        "lat": 37.53154,
        "lon": 127.066704
      },
      {
        "nameKo": "청담",
        "nameEn": "Cheongdam",
        "code": "729",
        "lat": 37.519365,
        "lon": 127.05335
      },
      {
        "nameKo": "강남구청",
        "nameEn": "Gangnam-gu Office",
        "code": "730",
        "lat": 37.517179,
        "lon": 127.041255
      },
      {
        "nameKo": "학동",
        "nameEn": "Hak-dong",
        "code": "731",
        "lat": 37.514229,
        "lon": 127.031656
      },
      {
        "nameKo": "논현",
        "nameEn": "Nonhyeon",
        "code": "732",
        "lat": 37.511093,
        "lon": 127.021415
      },
      {
        "nameKo": "반포",
        "nameEn": "Banpo",
        "code": "733",
        "lat": 37.508178,
        "lon": 127.011727
      },
      {
        "nameKo": "고속터미널",
        "nameEn": "Express Bus Terminal",
        "code": "734",
        "lat": 37.503367,
        "lon": 127.005068
      },
      {
        "nameKo": "내방",
        "nameEn": "Naebang",
        "code": "735",
        "lat": 37.487618,
        "lon": 126.993513
      },
      {
        "nameKo": "이수",
        "nameEn": "Isu",
        "code": "736",
        "lat": 37.485196,
        "lon": 126.981605
      },
      {
        "nameKo": "남성",
        "nameEn": "Namseong",
        "code": "737",
        "lat": 37.484596,
        "lon": 126.971251
      },
      {
        "nameKo": "숭실대입구",
        "nameEn": "Soongsil Univ.",
        "code": "738",
        "lat": 37.496029,
        "lon": 126.953822
      },
      {
        "nameKo": "상도",
        "nameEn": "Sangdo",
        "code": "739",
        "lat": 37.502834,
        "lon": 126.94791
      },
      {
        "nameKo": "장승배기",
        "nameEn": "Jangseungbaegi",
        "code": "740",
        "lat": 37.504898,
        "lon": 126.93915
      },
      {
        "nameKo": "신대방삼거리",
        "nameEn": "Sindaebangsamgeori",
        "code": "741",
        "lat": 37.499701,
        "lon": 126.928276
      },
      {
        "nameKo": "보라매",
        "nameEn": "Boramae",
        "code": "742",
        "lat": 37.499872,
        "lon": 126.920428
      },
      {
        "nameKo": "신풍",
        "nameEn": "Sinpung",
        "code": "743",
        "lat": 37.50008,
        "lon": 126.90993
      },
      {
        "nameKo": "대림",
        "nameEn": "Daerim",
        "code": "744",
        "lat": 37.493013,
        "lon": 126.897075
      },
      {
        "nameKo": "남구로",
        "nameEn": "Namguro",
        "code": "745",
        "lat": 37.486056,
        "lon": 126.887249
      },
      {
        "nameKo": "가산디지털단지",
        "nameEn": "Gasan Digital Complex",
        "code": "746",
        "lat": 37.480338,
        "lon": 126.882656
      },
      {
        "nameKo": "철산",
        "nameEn": "Cheolsan",
        "code": "747",
        "lat": 37.47605,
        "lon": 126.867911
      },
      {
        "nameKo": "광명사거리",
        "nameEn": "Gwangmyeongsageori",
        "code": "748",
        "lat": 37.479252,
        "lon": 126.854876
      },
      {
        "nameKo": "천왕",
        "nameEn": "Cheonwang",
        "code": "749",
        "lat": 37.486637,
        "lon": 126.838713
      },
      {
        "nameKo": "온수",
        "nameEn": "Onsu",
        "code": "750",
        "lat": 37.492092,
        "lon": 126.823023
      }
    ],
    "segments": [
      {
        "from": "장암",
        "to": "도봉산",
        "runSec": 270,
        "distanceKm": 1.4
      },
      {
        "from": "도봉산",
        "to": "수락산",
        "runSec": 140,
        "distanceKm": 1.6
      },
      {
        "from": "수락산",
        "to": "마들",
        "runSec": 120,
        "distanceKm": 1.4
      },
      {
        "from": "마들",
        "to": "노원",
        "runSec": 90,
        "distanceKm": 1.2
      },
      {
        "from": "노원",
        "to": "중계",
        "runSec": 80,
        "distanceKm": 1.1
      },
      {
        "from": "중계",
        "to": "하계",
        "runSec": 70,
        "distanceKm": 1
      },
      {
        "from": "하계",
        "to": "공릉",
        "runSec": 90,
        "distanceKm": 1.3
      },
      {
        "from": "공릉",
        "to": "태릉입구",
        "runSec": 60,
        "distanceKm": 0.8
      },
      {
        "from": "태릉입구",
        "to": "먹골",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "먹골",
        "to": "중화",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "중화",
        "to": "상봉",
        "runSec": 110,
        "distanceKm": 1
      },
      {
        "from": "상봉",
        "to": "면목",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "면목",
        "to": "사가정",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "사가정",
        "to": "용마산",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "용마산",
        "to": "중곡",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "중곡",
        "to": "군자",
        "runSec": 80,
        "distanceKm": 1.1
      },
      {
        "from": "군자",
        "to": "어린이대공원",
        "runSec": 80,
        "distanceKm": 1.1
      },
      {
        "from": "어린이대공원",
        "to": "건대입구",
        "runSec": 80,
        "distanceKm": 0.8
      },
      {
        "from": "건대입구",
        "to": "자양",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "자양",
        "to": "청담",
        "runSec": 150,
        "distanceKm": 2
      },
      {
        "from": "청담",
        "to": "강남구청",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "강남구청",
        "to": "학동",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "학동",
        "to": "논현",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "논현",
        "to": "반포",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "반포",
        "to": "고속터미널",
        "runSec": 90,
        "distanceKm": 0.9
      },
      {
        "from": "고속터미널",
        "to": "내방",
        "runSec": 150,
        "distanceKm": 2.2
      },
      {
        "from": "내방",
        "to": "이수",
        "runSec": 90,
        "distanceKm": 1
      },
      {
        "from": "이수",
        "to": "남성",
        "runSec": 80,
        "distanceKm": 1
      },
      {
        "from": "남성",
        "to": "숭실대입구",
        "runSec": 150,
        "distanceKm": 2
      },
      {
        "from": "숭실대입구",
        "to": "상도",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "상도",
        "to": "장승배기",
        "runSec": 150,
        "distanceKm": 0.9
      },
      {
        "from": "장승배기",
        "to": "신대방삼거리",
        "runSec": 110,
        "distanceKm": 1.2
      },
      {
        "from": "신대방삼거리",
        "to": "보라매",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "보라매",
        "to": "신풍",
        "runSec": 140,
        "distanceKm": 0.9
      },
      {
        "from": "신풍",
        "to": "대림",
        "runSec": 120,
        "distanceKm": 1.4
      },
      {
        "from": "대림",
        "to": "남구로",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "남구로",
        "to": "가산디지털단지",
        "runSec": 80,
        "distanceKm": 0.8
      },
      {
        "from": "가산디지털단지",
        "to": "철산",
        "runSec": 120,
        "distanceKm": 1.4
      },
      {
        "from": "철산",
        "to": "광명사거리",
        "runSec": 110,
        "distanceKm": 1.3
      },
      {
        "from": "광명사거리",
        "to": "천왕",
        "runSec": 120,
        "distanceKm": 1.7
      },
      {
        "from": "천왕",
        "to": "온수",
        "runSec": 140,
        "distanceKm": 1.5
      }
    ],
    "loop": false
  },
  "8": {
    "stations": [
      {
        "nameKo": "암사역사공원",
        "nameEn": "Amsa History Park",
        "code": "809",
        "lat": 37.55695,
        "lon": 127.13702
      },
      {
        "nameKo": "암사",
        "nameEn": "Amsa",
        "code": "810",
        "lat": 37.55021,
        "lon": 127.127562
      },
      {
        "nameKo": "천호",
        "nameEn": "Cheonho",
        "code": "811",
        "lat": 37.538113,
        "lon": 127.123254
      },
      {
        "nameKo": "강동구청",
        "nameEn": "Gangdong-gu Office",
        "code": "812",
        "lat": 37.530341,
        "lon": 127.120508
      },
      {
        "nameKo": "몽촌토성",
        "nameEn": "Mongchontoseong",
        "code": "813",
        "lat": 37.517409,
        "lon": 127.112359
      },
      {
        "nameKo": "잠실",
        "nameEn": "Jamsil",
        "code": "814",
        "lat": 37.514692,
        "lon": 127.104338
      },
      {
        "nameKo": "석촌",
        "nameEn": "Seokchon",
        "code": "815",
        "lat": 37.505557,
        "lon": 127.106832
      },
      {
        "nameKo": "송파",
        "nameEn": "Songpa",
        "code": "816",
        "lat": 37.499703,
        "lon": 127.112183
      },
      {
        "nameKo": "가락시장",
        "nameEn": "Garak Market",
        "code": "817",
        "lat": 37.492888,
        "lon": 127.118398
      },
      {
        "nameKo": "문정",
        "nameEn": "Munjeong",
        "code": "818",
        "lat": 37.485855,
        "lon": 127.1225
      },
      {
        "nameKo": "장지",
        "nameEn": "Jangji",
        "code": "819",
        "lat": 37.478703,
        "lon": 127.126191
      },
      {
        "nameKo": "복정",
        "nameEn": "Bokjeong",
        "code": "820",
        "lat": 37.471052,
        "lon": 127.126732
      },
      {
        "nameKo": "남위례",
        "nameEn": "Namwirye",
        "code": "821",
        "lat": 37.4624,
        "lon": 127.13977
      },
      {
        "nameKo": "산성",
        "nameEn": "Sanseong",
        "code": "822",
        "lat": 37.457122,
        "lon": 127.149908
      },
      {
        "nameKo": "남한산성입구",
        "nameEn": "Namhansanseong",
        "code": "823",
        "lat": 37.451535,
        "lon": 127.159816
      },
      {
        "nameKo": "단대오거리",
        "nameEn": "Dandaeogeori",
        "code": "824",
        "lat": 37.44521,
        "lon": 127.156866
      },
      {
        "nameKo": "신흥",
        "nameEn": "Sinheung",
        "code": "825",
        "lat": 37.440918,
        "lon": 127.147564
      },
      {
        "nameKo": "수진",
        "nameEn": "Sujin",
        "code": "826",
        "lat": 37.437428,
        "lon": 127.140722
      },
      {
        "nameKo": "모란",
        "nameEn": "Moran",
        "code": "827",
        "lat": 37.433824,
        "lon": 127.129837
      }
    ],
    "segments": [
      {
        "from": "암사역사공원",
        "to": "암사",
        "runSec": 90,
        "distanceKm": 1.1
      },
      {
        "from": "암사",
        "to": "천호",
        "runSec": 90,
        "distanceKm": 1.3
      },
      {
        "from": "천호",
        "to": "강동구청",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "강동구청",
        "to": "몽촌토성",
        "runSec": 120,
        "distanceKm": 1.6
      },
      {
        "from": "몽촌토성",
        "to": "잠실",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "잠실",
        "to": "석촌",
        "runSec": 110,
        "distanceKm": 1.2
      },
      {
        "from": "석촌",
        "to": "송파",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "송파",
        "to": "가락시장",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "가락시장",
        "to": "문정",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "문정",
        "to": "장지",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "장지",
        "to": "복정",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "복정",
        "to": "남위례",
        "runSec": 110,
        "distanceKm": 1.5
      },
      {
        "from": "남위례",
        "to": "산성",
        "runSec": 100,
        "distanceKm": 1.2
      },
      {
        "from": "산성",
        "to": "남한산성입구",
        "runSec": 130,
        "distanceKm": 1.3
      },
      {
        "from": "남한산성입구",
        "to": "단대오거리",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "단대오거리",
        "to": "신흥",
        "runSec": 70,
        "distanceKm": 0.8
      },
      {
        "from": "신흥",
        "to": "수진",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "수진",
        "to": "모란",
        "runSec": 90,
        "distanceKm": 1
      }
    ],
    "loop": false
  },
  "5M": {
    "stations": [
      {
        "nameKo": "강동",
        "nameEn": "Gangdong",
        "code": "548",
        "lat": 37.535804,
        "lon": 127.132481
      },
      {
        "nameKo": "둔촌동",
        "nameEn": "Dunchon-dong",
        "code": "P549",
        "lat": 37.527788,
        "lon": 127.136248
      },
      {
        "nameKo": "올림픽공원",
        "nameEn": "Olympic Park",
        "code": "P550",
        "lat": 37.516201,
        "lon": 127.130923
      },
      {
        "nameKo": "방이",
        "nameEn": "Bangi",
        "code": "P551",
        "lat": 37.508857,
        "lon": 127.126133
      },
      {
        "nameKo": "오금",
        "nameEn": "Ogeum",
        "code": "P552",
        "lat": 37.502057,
        "lon": 127.127938
      },
      {
        "nameKo": "개롱",
        "nameEn": "Gaerong",
        "code": "P553",
        "lat": 37.498079,
        "lon": 127.13482
      },
      {
        "nameKo": "거여",
        "nameEn": "Geoyeo",
        "code": "P554",
        "lat": 37.493105,
        "lon": 127.14415
      },
      {
        "nameKo": "마천",
        "nameEn": "Macheon",
        "code": "P555",
        "lat": 37.49499,
        "lon": 127.152781
      }
    ],
    "segments": [
      {
        "from": "강동",
        "to": "둔촌동",
        "runSec": 110,
        "distanceKm": 1.2
      },
      {
        "from": "둔촌동",
        "to": "올림픽공원",
        "runSec": 100,
        "distanceKm": 1.4
      },
      {
        "from": "올림픽공원",
        "to": "방이",
        "runSec": 80,
        "distanceKm": 0.8
      },
      {
        "from": "방이",
        "to": "오금",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "오금",
        "to": "개롱",
        "runSec": 70,
        "distanceKm": 0.9
      },
      {
        "from": "개롱",
        "to": "거여",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "거여",
        "to": "마천",
        "runSec": 90,
        "distanceKm": 0.9
      }
    ],
    "loop": false
  },
  "6L": {
    "stations": [
      {
        "nameKo": "응암",
        "nameEn": "Eungam",
        "code": "610",
        "lat": 37.598605,
        "lon": 126.915577
      },
      {
        "nameKo": "역촌",
        "nameEn": "Yeokchon",
        "code": "611",
        "lat": 37.606021,
        "lon": 126.922744
      },
      {
        "nameKo": "불광",
        "nameEn": "Bulgwang",
        "code": "612",
        "lat": 37.610873,
        "lon": 126.92939
      },
      {
        "nameKo": "독바위",
        "nameEn": "Dokbawi",
        "code": "613",
        "lat": 37.618456,
        "lon": 126.933031
      },
      {
        "nameKo": "연신내",
        "nameEn": "Yeonsinnae",
        "code": "614",
        "lat": 37.618636,
        "lon": 126.920625
      },
      {
        "nameKo": "구산",
        "nameEn": "Gusan",
        "code": "615",
        "lat": 37.611377,
        "lon": 126.91727
      }
    ],
    "segments": [
      {
        "from": "응암",
        "to": "역촌",
        "runSec": 100,
        "distanceKm": 1.1
      },
      {
        "from": "역촌",
        "to": "불광",
        "runSec": 80,
        "distanceKm": 0.8
      },
      {
        "from": "불광",
        "to": "독바위",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "독바위",
        "to": "연신내",
        "runSec": 130,
        "distanceKm": 1.4
      },
      {
        "from": "연신내",
        "to": "구산",
        "runSec": 80,
        "distanceKm": 0.9
      },
      {
        "from": "구산",
        "to": "응암",
        "runSec": 120,
        "distanceKm": 1.5
      }
    ],
    "loop": true
  }
};
