# NOTICE — 데이터 출처 / Data attribution

METRO의 소스 코드는 [MIT 라이선스](LICENSE)입니다. 아래 데이터는 각 기관이 공개한 공공데이터이며 MIT 라이선스의 대상이 아닙니다. 원본은 `data/official/`에 그대로 두고, `npm run data:import`로 `src/data/*.official.ts`를 생성합니다.

The source code is MIT-licensed. The data below is open data published by the respective agencies and is **not** covered by the MIT License.

| 데이터 | 제공 | 라이선스 | 파일 |
|---|---|---|---|
| 역간거리 및 소요시간 (1~8호선) | 서울교통공사 — [서울 열린데이터광장 OA-12034](https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do) | 공공누리 제1유형 (출처표시) | `seoul-metro-station-distance-240810.csv` |
| 서울시 역사마스터 정보 (역 좌표) | 서울특별시 — [OA-21232](https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do) | 공공누리 제1유형 (출처표시) | `seoul-station-master.csv` |
| 서울시 지하철 노선별 역 정보 (역번호·영문 역명) | 서울특별시 — 서울 열린데이터광장 Open API | 공공누리 제1유형 (출처표시) | `seoul-station-names.csv` |
| 환승역거리 소요시간 정보 | 서울교통공사 — [공공데이터포털 15044419](https://www.data.go.kr/data/15044419/fileData.do) | 이용허락범위 제한 없음 | `seoul-metro-transfer.csv` |
| 경의중앙선 역간거리 | 국가철도공단 — [15041327](https://www.data.go.kr/data/15041327/fileData.do) | 이용허락범위 제한 없음 | `krna-gyeongui-jungang-distance.csv` |
| 경의중앙선 역위치 | 국가철도공단 — [15041487](https://www.data.go.kr/data/15041487/fileData.do) | 이용허락범위 제한 없음 | `krna-gyeongui-jungang-position.csv` |
| RAFIS 역 정보 (영문 역명) | 국가철도공단 — [15132601](https://www.data.go.kr/data/15132601/fileData.do) | 이용허락범위 제한 없음 | `krna-rafis-stations.csv` |
| 실시간 날씨 (앱 실행 중 조회) | [Open-Meteo](https://open-meteo.com) | CC BY 4.0 | — |

## 지금 타는 사람 (익명 집계) / Anonymous presence

"지금 타는 사람"과 "같이 타기" 인원은 [Upstash Redis](https://upstash.com)(Vercel Marketplace, 무료 플랜)에 잠깐 저장됩니다. 저장하는 것은 탭마다 임의로 만든 id, 지금 탄 노선, 같이 타기 방 이름뿐이며 150초 뒤 자동으로 지워집니다. 이름·이메일·기기 정보·위치·할 일은 보내지 않습니다. 설정 → "지금 타는 사람 보기"를 끄면 아무것도 보내지 않습니다.

Only a random per-tab id, the current line and the ride-together room are stored, for 150 seconds. Turn it off in Settings to send nothing.

출처표시: 이 저작물은 서울교통공사와 서울특별시가 공공누리 제1유형으로 개방한 「서울교통공사_역간거리 및 소요시간」, 「서울시 역사마스터 정보」, 「서울시 지하철 노선별 역 정보」를 이용하였습니다.

글꼴 [Pretendard](https://github.com/orioncactus/pretendard)는 SIL Open Font License 1.1이며 CDN에서 불러옵니다.

METRO는 위 기관들과 관련이 없는 개인 프로젝트입니다. 화면 속 역명판과 안내 표시는 자체 디자인이며 기관의 로고·디자인을 사용하지 않습니다.
