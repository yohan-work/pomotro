/**
 * 서울 지하철 3호선 (서울교통공사 운영 구간 지축 ↔ 오금) — 노선 데이터 (실제 데이터 영역)
 *
 * - ✅ 역 순서·국문 역명·역간 표준 운행시간·거리: 서울교통공사 공식 데이터 (line3.official.ts)
 * - ⚠️ 역번호·영문 역명·지상/지하 구조·진행 방위·랜드마크: 공개 정보 기반, 공식 대조 전
 * - 지상 구간: 지축(고가), 옥수(고가) → 동호대교로 한강 횡단 → 압구정(지하)
 * - 코레일 구간(대화~삼송)은 데이터셋에 없어 제외
 */
import { LINE3_OFFICIAL_SEGMENTS } from "./line3.official";
import { buildLine, type RawStation } from "./network";

/** 지축 → 오금 순서. [id, 역번호, 국문, 영문, 구조, 다음 역까지 방위, 랜드마크] */
const RAW: RawStation[] = [
  ["l3-jichuk", "319", "지축", "Jichuk", "elevated", "S", []],
  ["l3-gupabal", "320", "구파발", "Gupabal", "underground", "S", []],
  ["l3-yeonsinnae", "321", "연신내", "Yeonsinnae", "underground", "S", []],
  ["l3-bulgwang", "322", "불광", "Bulgwang", "underground", "S", []],
  ["l3-nokbeon", "323", "녹번", "Nokbeon", "underground", "SE", []],
  ["l3-hongje", "324", "홍제", "Hongje", "underground", "SE", []],
  ["l3-muakjae", "325", "무악재", "Muakjae", "underground", "S", []],
  ["l3-dongnimmun", "326", "독립문", "Dongnimmun", "underground", "E", []],
  ["l3-gyeongbokgung", "327", "경복궁", "Gyeongbokgung", "underground", "E", []],
  ["l3-anguk", "328", "안국", "Anguk", "underground", "S", []],
  ["l3-jongno-3ga", "329", "종로3가", "Jongno 3(sam)-ga", "underground", "S", []],
  ["l3-euljiro-3ga", "330", "을지로3가", "Euljiro 3(sam)-ga", "underground", "S", []],
  ["l3-chungmuro", "331", "충무로", "Chungmuro", "underground", "SE", []],
  ["l3-dongguk-univ", "332", "동대입구", "Dongguk Univ.", "underground", "SE", []],
  ["l3-yaksu", "333", "약수", "Yaksu", "underground", "SE", []],
  ["l3-geumho", "334", "금호", "Geumho", "underground", "SE", []],
  ["l3-oksu", "335", "옥수", "Oksu", "elevated", "S", ["동호대교", "한강", "성수대교", "응봉산", "한남대교", "남산"]],
  ["l3-apgujeong", "336", "압구정", "Apgujeong", "underground", "SW", []],
  ["l3-sinsa", "337", "신사", "Sinsa", "underground", "SW", []],
  ["l3-jamwon", "338", "잠원", "Jamwon", "underground", "SW", []],
  ["l3-express-bus-terminal", "339", "고속터미널", "Express Bus Terminal", "underground", "SE", []],
  ["l3-seoul-natl-univ-of-education", "340", "교대", "Seoul Nat'l Univ. of Education", "underground", "S", []],
  ["l3-nambu-bus-terminal", "341", "남부터미널", "Nambu Bus Terminal", "underground", "S", []],
  ["l3-yangjae", "342", "양재", "Yangjae", "underground", "E", []],
  ["l3-maebong", "343", "매봉", "Maebong", "underground", "E", []],
  ["l3-dogok", "344", "도곡", "Dogok", "underground", "E", []],
  ["l3-daechi", "345", "대치", "Daechi", "underground", "E", []],
  ["l3-hangnyeoul", "346", "학여울", "Hangnyeoul", "underground", "E", []],
  ["l3-daecheong", "347", "대청", "Daecheong", "underground", "E", []],
  ["l3-irwon", "348", "일원", "Irwon", "underground", "SE", []],
  ["l3-suseo", "349", "수서", "Suseo", "underground", "NE", []],
  ["l3-garak-market", "350", "가락시장", "Garak Market", "underground", "E", []],
  ["l3-national-police-hospital", "351", "경찰병원", "National Police Hospital", "underground", "E", []],
  ["l3-ogeum", "352", "오금", "Ogeum", "underground", "E", []],
];

export const LINE3 = buildLine({ id: "3", nameKo: "3호선", color: "#EF7C1C", loop: false }, RAW, LINE3_OFFICIAL_SEGMENTS);
