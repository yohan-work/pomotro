<div align="center">

<img src="src/app/icon.svg" width="72" height="72" alt="METRO" />

# METRO

**서울을 달리는 뽀모도로**

집중하는 동안, 서울 지하철 창가에 앉아 한 구간을 함께 달려요.

[![CI](https://github.com/yohan-work/pomotro/actions/workflows/ci.yml/badge.svg)](https://github.com/yohan-work/pomotro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2E946B.svg)](LICENSE)
[![Data: KOGL Type 1](https://img.shields.io/badge/data-공공누리%201유형-F4B36B.svg)](#데이터와-출처)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)](public/sw.js)
[![Demo](https://img.shields.io/badge/demo-pomotro.vercel.app-000?logo=vercel)](https://pomotro.vercel.app)

**[▶ 지금 타보기 — pomotro.vercel.app](https://pomotro.vercel.app)**

한국어 · [English](README.en.md)

[기능](#기능) · [빠른 시작](#빠른-시작) · [동작 방식](#동작-방식) · [데이터](#데이터와-출처) · [아키텍처](docs/architecture.md) · [기여하기](CONTRIBUTING.md)

<img src="docs/images/demo-hero.gif" width="760" alt="노을 진 한강 위 당산철교를 달리는 지하철 창밖 풍경" />

</div>

---

## 소개

METRO는 집중 시간을 **작은 서울 여행**으로 바꾸는 웹 뽀모도로 타이머입니다.

25분을 고르면 25분 동안 달릴 수 있는 실제 지하철 구간을 추천합니다. 출발하면 객실 창가 시점에서 문이 닫히고, 열차가 부드럽게 가속해 한강 철교를 건너고, 터널을 지나 다음 역에 감속하며 들어섭니다. 목적지에 도착하면 집중이 끝나고 승차권을 받습니다.

- **실제 데이터** — 서울 지하철 9개 호선 278개 역의 순서·운행시간·거리·좌표·환승 거리는 서울교통공사·서울시·국가철도공단 공공데이터를 그대로 씁니다.
- **브라우저만으로** — Canvas 2D 패럴랙스와 WebAudio 합성음. 외부 이미지·음원 없이 동작하고, 서버는 익명 "지금 타는 사람" 집계에만 씁니다 (없어도 나머지는 그대로).
- **시간의 순수 함수** — 열차 위치는 경과시간만으로 결정됩니다. 탭을 옮기거나 새로고침해도 같은 시각이면 같은 장면입니다.

> 집중하는 모든 순간이, 좋은 곳으로 데려다줄 거예요.

## 기능

### 실제 노선 위를 달린다

- **9개 호선, 11개 노선** — 1·2·3·4·5·6·7·8호선(서울교통공사 구간)과 경의중앙선. 5호선 마천지선, 6호선 응암순환 포함
- **환승** — 다른 노선의 역을 고르면 공식 환승 거리·시간으로 갈아타는 경로를 찾습니다. 환승역에서 내려 걷는 동안 안내 카드가 뜨고, 새 노선 승강장에서 다음 열차를 탑니다
- **시간에 맞춘 추천** — 15·25·40·60분 또는 직접 입력. 한강 다리·고가 구간을 우대하고 실제 예상 시간과의 차이를 보여줍니다
- **역 검색** — 국문·초성(ㅎㄷㅇㄱ)·영문으로 찾고, 노선 배지를 눌러 고릅니다
- **장거리 여행** — 2호선 한 바퀴, 한강 다리 순례, 경의중앙선 완주 같은 긴 코스를 집중할 때마다 조금씩 이어 달립니다

### 창밖이 서울이다

- **한강 다리 다섯** — 당산철교(양화대교·선유도·노을), 잠실철교(롯데월드타워), 동호대교·동작대교(도로 한가운데, 옆 차로의 차들), 청담대교(아래층, 머리 위 도로 상판)
- **실제 방향** — 승객은 진행 방향 왼쪽 창을 봅니다. 같은 다리도 남행·북행에 따라 보이는 풍경이 다릅니다
- **동네마다 다른 창밖** — 성수 붉은 벽돌, 구로디지털단지 유리 오피스, 경의중앙선 팔당호·북한강과 교외 비닐하우스
- **지하도 지루하지 않게** — 박스형·원형·기둥형 터널, 반대편 열차 교행, 환승역 "갈아타는 곳" 안내판, 유리에 비친 승객
- **진짜 하늘과 계절** — 실제 서울 일출·일몰 시각의 노을, 실시간 서울 날씨(비·눈·안개), 개나리 → 벚꽃 → 신록, 12월 객실 장식

### 함께 달리기

- **같이 타기 링크** — 링크를 보내면 받은 사람이 같은 노선을 같은 출발 시각 기준으로 탑니다. 시뮬레이션이 시간의 순수 함수라 모두 같은 창밖을 봅니다. "함께 타는 중 · 3명"
- **지금 타는 사람** — "지금 2호선에서 12명 집중 중". 익명 신호(탭마다 임의 id·노선·방)만 1분마다 보내고 150초 뒤 자동으로 지워집니다. 이름·기기 정보는 저장하지 않고, 설정에서 끌 수 있습니다

### 매일 쓰는 집중 도구

- **뽀모도로 사이클** — 도착한 역 승강장에 정차한 채 휴식(기본 5분, 4회마다 15분), 같은 역에서 이어 타기
- **정확한 타이머** — 벽시계 기준. 일시정지·탭 전환·새로고침에도 어긋나지 않고, 다른 창에서 작업 중이면 알림
- **미니 창** — 다른 앱 위에 작은 창으로 창밖·남은 시간·다음 역 (Document Picture-in-Picture)
- **집중 모드** — 5초간 입력이 없으면 버튼이 사라지고 창밖과 시간만 남음 (`H`)
- **설치형 웹앱** — 홈 화면에 추가, 오프라인 동작 (PWA)

### 기록과 재미

- **승차권 · 하이라이트 영상** — 도착하면 승차권을 받고, 한강 다리와 볼거리를 이은 15초 영상을 만들어 공유
- **나의 서울 노선도** — 달린 구간과 방문한 역이 공식 좌표 노선도에 쌓입니다. 호선별 진행도, 누적 시간·거리·연속 일수
- **하루 목표 · 주간 회고** — "오늘 4번 타기" 목표 고리, 이번 주 완주·집중·새로 가 본 역을 한 장의 회고 카드로
- **배지 12종** — 첫 환승, 다섯 다리, 2호선 한 바퀴, 장거리 완주, 하루 목표…
- **깜짝 이벤트** — 가끔 단소를 든 승객이 맞은편에 앉거나, 창밖으로 한강 오리배와 열기구가 지나갑니다. 아주 드물게 한강 괴물(?)도. 만난 것은 도감에

### 모두를 위해

- **한국어 · English** — 영어 화면은 공식 영문 역명과 영어 안내방송
- **접근성** — 모션 줄이기(흔들림·애니메이션 끔), 번쩍임 없음, 키보드 조작, 스크린리더 안내
- **안내방송 · 합성 사운드** — "이번 역은 합정, 합정역입니다", 주행음·레일 이음매·터널 울림·차임 (채널별 볼륨)

## 스크린샷

| 노을 · 당산철교 | 동작대교 · 남산 | 청담대교 아래층 · 밤 |
|:---:|:---:|:---:|
| <img src="docs/images/ride-sunset-river.jpg" alt="노을 진 한강 위 당산철교" /> | <img src="docs/images/ride-dongjak.jpg" alt="4호선 동작대교에서 본 남산과 반포대교" /> | <img src="docs/images/ride-cheongdam-night.jpg" alt="청담대교 아래층에서 본 밤의 영동대교" /> |
| **환승 — 사당에서 2호선으로** | **깜짝 승객 — 단소** | **지하 · 유리에 비친 승객** |
| <img src="docs/images/ride-transfer.jpg" alt="환승 안내 카드" /> | <img src="docs/images/ride-danso.jpg" alt="맞은편에 앉은 단소 든 승객" /> | <img src="docs/images/ride-reflection.jpg" alt="원형 터널과 유리에 비친 승객" /> |
| **출발 화면** | **역 검색 · 환승 경로** | **크리스마스 이브** |
| <img src="docs/images/setup.jpg" alt="출발 화면" /> | <img src="docs/images/setup-transfer.jpg" alt="역 검색으로 고른 환승 경로" /> | <img src="docs/images/ride-christmas.jpg" alt="가랜드가 걸린 크리스마스 객실" /> |
| **승차권 · 새 배지** | **나의 서울 노선도** | **배지** |
| <img src="docs/images/ticket.jpg" alt="환승 여행 승차권과 새 배지" /> | <img src="docs/images/records.jpg" alt="공식 좌표로 그린 나의 서울 노선도" /> | <img src="docs/images/badges.jpg" alt="배지 목록" /> |

## 빠른 시작

설치 없이 **[pomotro.vercel.app](https://pomotro.vercel.app)** 에서 바로 써볼 수 있습니다.

로컬에서 실행하려면 Node.js 24 이상이 필요합니다.

```bash
git clone https://github.com/yohan-work/pomotro.git
cd pomotro
npm install
npm run dev
```

<http://localhost:3000> 에서 **1분 50초 체험 운행 · 당산 → 합정** 을 눌러 보세요. 소리는 출발 버튼을 누른 뒤부터 재생됩니다.

| 키 | 동작 |
|---|---|
| `Space` | 일시정지 / 다시 출발 |
| `H` | 집중 모드 (버튼 숨기기) |
| `Esc` | 열린 패널 닫기 |

## 동작 방식

```
epochNow() ─▶ 경과시간 t ─▶ sampleJourney(journey, t) ─▶ 위치 · 속도 · 가속도 · 단계(정차/환승/주행)
                                  │
              ┌───────────────────┼────────────────────┬─────────────────────┐
              ▼                   ▼                    ▼                     ▼
       Canvas 2D 렌더러      WebAudio 엔진        DOM 객실 · HUD          미니 창 · 하이라이트 영상
       (12개 시차 레이어)     (속도 반응 사운드)     (React, ≤4Hz 갱신)       (같은 함수를 다시 그림)
```

- **상태는 시간의 순수 함수**입니다. 프레임마다 값을 누적하지 않으므로 탭이 숨겨지거나 새로고침해도 같은 시각이면 같은 장면이고, 미니 창과 하이라이트 영상은 같은 함수를 다른 캔버스에 다시 그립니다.
- **집중시간과 실제 운행시간이 다르면** 재생 속도를 바꾸지 않고 터널·시가지 같은 연출 구간 길이를 늘리거나 줄입니다. 열차는 늘 현실적인 속도로 달립니다.
- **창밖 풍경**은 트랙 좌표 셀마다 결정론적으로 생성됩니다. 같은 위치에는 항상 같은 건물이 있고, 비싼 그림은 오프스크린 스프라이트로 캐시합니다.
- **깜짝 이벤트**도 세션 id 를 시드로 정해집니다. 새로고침해도 같은 역에서 같은 승객이 탑니다.

자세한 내용은 [docs/architecture.md](docs/architecture.md), 디자인 원칙은 [docs/design-system.md](docs/design-system.md)를 보세요.

## 데이터와 출처

| 데이터 | 출처 | 상태 |
|---|---|---|
| 1~8호선 역 순서·역명·역간 표준 운행시간·거리 | [서울교통공사 「역간거리 및 소요시간」](https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do) (2024-09-02 갱신) | ✅ 공식 |
| 역 좌표 (노선도·진행 방향) | [서울시 「역사마스터 정보」](https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do) | ✅ 공식 |
| 역번호·영문 역명 | 서울시 「지하철 노선별 역 정보」 (서울 열린데이터광장 API) | ✅ 공식 |
| 환승 거리·소요시간 | [서울교통공사 「환승역거리 소요시간 정보」](https://www.data.go.kr/data/15044419/fileData.do) (2025-12-31, 보행 1.2m/s) | ✅ 공식 |
| 경의중앙선 역간 거리·역 위치·영문 역명 | 국가철도공단 [역간거리](https://www.data.go.kr/data/15041327/fileData.do)·[역위치](https://www.data.go.kr/data/15041487/fileData.do)·[RAFIS 역 정보](https://www.data.go.kr/data/15132601/fileData.do) | ✅ 공식 |
| 경의중앙선 운행시간 | 공개 데이터 없음 → 거리 기반 추정 | 화면에 "추정" |
| 역 정차시간·환승 대기 | 추정 | 화면에 "예상" |
| 지상/지하 구조·랜드마크 | 공개 정보 | ⚠️ 공식 대조 전 |
| 창밖 구간 길이·풍경 배치·터널 모양·혼잡도·이벤트 | 연출 (`src/data/scenery.ts` 등) | 실제 측량값 아님 |

- 공식 데이터는 `npm run data:import` 로 내려받아 `data/official/` 에 원본 CSV로 저장하고, `src/data/*.official.ts` 를 자동 생성합니다. 손으로 고치지 않습니다.
- 실제 데이터와 연출 데이터는 파일 단위로 분리되어 있습니다. 출처 표시는 [NOTICE.md](NOTICE.md)를 보세요.
- 데이터 오류를 발견하면 [데이터 정정 이슈](https://github.com/yohan-work/pomotro/issues/new?template=data_correction.yml)로 알려주세요.

## 프로젝트 구조

```
src/
├─ app/            Next.js App Router 진입점, 전역 스타일·디자인 토큰
├─ components/     객실 화면, 출발 화면, 노선도, 승차권, 미니 창, 하이라이트 영상
├─ sim/            시간 기반 여정 엔진 (가감속, 환승, 세션 시계, 깜짝 이벤트)
├─ render/         창밖 Canvas 2D 렌더러 (scene/ 레이어, 스프라이트, 팔레트, 날씨·계절)
├─ audio/          WebAudio 합성 사운드, 안내방송
├─ data/           노선 정의 · 공식 데이터(자동 생성) · 연출 데이터 · 역 좌표
├─ lib/            추천, 경로·역 검색, 배지, 장거리 여행, 일출·일몰, 서울 달력, 백업
├─ i18n/           한국어·영어 문구
└─ store/          Zustand 상태 (세션·기록·설정, localStorage)
data/official/     공식 원본 CSV
scripts/           데이터 가져오기 · 엔진 검사 · 브라우저 검증 · 시각 비교
docs/              아키텍처 · 디자인 시스템 · 계획과 단계별 기록
```

## 개발

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 (정적) / 실행 |
| `npm run typecheck` | TypeScript 검사 |
| `npm test` | 단위 테스트 (vitest) |
| `npm run test:sim` | 시뮬레이션 엔진 불변식 + 공식 데이터 정합성 |
| `npm run verify:behavior -- <url>` | 실제 Chrome에서 일시정지·새로고침·환승·미니 창·영상 등 기능 검사 |
| `npm run verify:browser -- <url> [--full]` | 장면 스냅샷·FPS·110초 완주 |
| `npm run visual:diff -- <기준> <변경>` | 장면 32개 정지 화면 픽셀 비교 (PR마다 CI가 main 대 PR 실행) |
| (선택) `KV_REST_API_URL`·`KV_REST_API_TOKEN` | "지금 타는 사람" 집계용 Upstash Redis. 없으면 그 표시만 숨기고 나머지는 그대로 |
| `npm run data:import` | 공식 데이터 다시 받기 (역 좌표·영문명은 `.env.local` 의 `SEOUL_OPENAPI_KEY` 필요, 없으면 저장된 CSV로 재생성) |

<details>
<summary><b>개발·검증용 URL 파라미터</b></summary>

| 파라미터 | 예시 | 설명 |
|---|---|---|
| `autostart` | `?autostart=demo` | 체험 운행 바로 시작 |
| `route`, `total` | `?autostart=route&route=l4-ichon,dangsan&total=2700` | 임의 구간 바로 시작 (다른 노선이면 환승 경로) |
| `seek` / `still` | `&seek=45` / `&still=45` | 시작 시점 앞당기기 / 시간 고정 (시각 비교) |
| `tod` | `&tod=sunset` | 시간대 고정 (`day` `sunset` `night`) |
| `weather` / `season` | `&weather=rain&season=winter` | 날씨·계절 고정 |
| `date` | `&date=2026-12-24` | 달력 날짜 (봄 단계·장식·인사) |
| `crowd` | `&crowd=1` | 혼잡도 고정 (0~1) |
| `event` | `&event=danso` | 깜짝 이벤트 강제 |
| `debug` | `&debug=1` | FPS·속도·상태 표시 |

</details>

CI는 PR마다 타입 검사·단위 테스트·시뮬레이션 검사·빌드, 실제 Chrome 기능 검사, main 대 PR 장면 픽셀 비교를 실행합니다. main에 머지되면 Vercel로 자동 배포됩니다.

## 로드맵

- [x] 핵심 시뮬레이션 — 출발·가속·한강 횡단·감속·정차
- [x] 서울교통공사 공식 데이터, 뽀모도로 사이클, PWA, 나의 서울 노선도
- [x] 2·3호선, 경의중앙선, 1·4·5·6·7·8호선 — 공식 좌표 노선도
- [x] 환승 (공식 환승 거리·시간), 역 검색
- [x] 깜짝 이벤트·도감, 배지, 장거리 여행
- [x] 미니 창, 하이라이트 영상
- [x] 지하 구간 다양화, 진짜 하늘과 서울 달력
- [x] 하루 목표와 주간 회고
- [x] 함께 타기 링크 · 지금 타는 사람 (익명)
- [ ] 다른 도시 (부산)

변경 내역은 [CHANGELOG.md](CHANGELOG.md), 자세한 계획은 [docs/plan.md](docs/plan.md)에 있습니다.

## 기여하기

버그 제보, 데이터 정정, 풍경·사운드 아이디어 모두 환영합니다. 시작하기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)와 [행동 강령](CODE_OF_CONDUCT.md)을 읽어주세요. 보안 문제는 [SECURITY.md](SECURITY.md)를 따라 비공개로 알려주세요.

## 라이선스

- 소스 코드: [MIT](LICENSE)
- 노선·역·환승 데이터: 각 기관의 공공데이터 (공공누리 제1유형 등) — [NOTICE.md](NOTICE.md)
- 글꼴: [Pretendard](https://github.com/orioncactus/pretendard) (SIL Open Font License 1.1)
- 날씨: [Open-Meteo](https://open-meteo.com) (CC BY 4.0)

METRO는 서울교통공사·서울특별시·국가철도공단과 관련이 없는 개인 프로젝트입니다. 화면 속 역명판과 안내 표시는 이해를 돕기 위한 자체 디자인입니다.
