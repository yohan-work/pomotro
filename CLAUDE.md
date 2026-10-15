# METRO — 서울을 달리는 뽀모도로

집중하는 동안 서울 지하철 창가에 앉아 한 구간을 달리는 웹 뽀모도로. 기획 원문: `plan/phase-01-261014.md`, 무드 레퍼런스: `references/metro-concept.png`.

@AGENTS.md

## 배포

- 프로덕션: https://pomotro.vercel.app — Vercel 프로젝트 `yohan-works-projects/pomotro`, GitHub 연결로 **main 푸시 = 프로덕션 배포**, PR = 미리보기 배포
- 배포 후 확인: `npm run verify:behavior -- https://pomotro.vercel.app --pwa`

## 실행

```bash
npm run dev                 # http://localhost:3000
npm run typecheck           # tsc --noEmit
npm test                    # 단위 테스트 (vitest: 통계·추천·세션/뽀모도로 로직)
npm run test:sim            # 시뮬레이션 엔진 불변식 + 공식 데이터 정합성 (브라우저 불필요)
npm run data:import         # 공식 데이터 다운로드 → src/data/*.official.ts 재생성 (역 좌표·영문명은 .env.local 의 SEOUL_OPENAPI_KEY 필요, 없으면 저장된 CSV 로 재생성)
npm run build               # 프로덕션 빌드 (정적)
npm run verify:browser -- http://localhost:3000 [--full] [--tod]   # 실제 Chrome 스냅샷/FPS/110초 완주
npm run visual:diff -- <기준 url> <변경 url>                       # 장면 32개 정지 화면 픽셀 비교 (PR CI 에서 main 대 PR 자동 실행)
npm run verify:behavior -- http://localhost:3000 [--pwa]           # 일시정지·새로고침·중복기록·오디오·휴식·노선도 (--pwa: 프로덕션 서버에서 SW 확인)
```

검증 스크립트는 로컬 Google Chrome(`channel: "chrome"`)을 headless 로 띄운다. 결과 이미지는 `.verify/`(gitignore).

개발용 URL 파라미터: `?autostart=demo` `?autostart=route&route=gangbyeon,jamsillaru&total=150[&mode=focus]` `?seek=40` `?tod=day|sunset|night` `?weather=clear|cloudy|rain|snow|fog` `?season=spring|summer|autumn|winter` `?debug=1` `?still=45`(시간 고정) `?crowd=0..1`(혼잡도 고정) `?date=2026-12-24`(달력 기준 날짜 — 봄 단계·장식·인사) `?event=danso|vendor|puppy|sleeper|hiker|balloon|duckboat|cat|monster|ttorong`(깜짝 이벤트 강제 — URL 자동 시작 세션은 기본적으로 깜짝 이벤트 없음)

## 구조

```
src/data/lines.ts      노선 레지스트리 — getStation/getSegment/stationsBetween/findRoute(환승 경로)/transferBetween 등 조회는 여기로
src/data/line2.ts, line3.ts, lineGJ.ts, metroLines.ts(1·4·5·6·7·8호선)  노선별 실제 데이터 (사실만, 출처·검증상태 명시), network.ts = 공용 타입·빌더, geo.ts = 공식 역 좌표
src/data/line*.official.ts  자동 생성 — 공식 운행시간·거리 (직접 수정 금지)
data/official/         공식 원본 CSV (공공누리 1유형, 출처표시)
src/data/scenery.ts    연출 데이터 (구간별 풍경 순서·길이, 시뮬레이션 미터). 가상값
src/sim/               시간 → 상태 순수 함수 엔진 (journey, profile, clock, rideEvents = 깜짝 이벤트 일정)
src/render/            Canvas 2D 창밖 패럴랙스 (sprites = 캐시 오브젝트, palette = 시간대, conditions = 날씨·계절)
src/render/scene/      레이어 모듈: core(좌표·공용) sky far water city station track passing effects surprise(창밖 깜짝 이벤트), index = 합성
src/audio/             WebAudio 합성 사운드 (외부 음원 없음)
src/store/             Zustand + localStorage (세션·기록·설정)
src/components/        DOM UI (객실 실내, HUD, 출발/완료 화면)
scripts/               검증 스크립트
docs/                  plan / architecture / design-system / phase-01
```

## 반드시 지킬 규칙

- 공식 데이터 값은 `*.official.ts`(자동 생성)로만 들어온다. 손으로 고치지 말고 `data:import` 로 갱신한다.
- **실제 데이터와 연출 데이터를 섞지 않는다.** 실제 세계 사실은 노선 파일(`line*.ts`·`metroLines.ts`)에만, 화면용 길이·배치는 `scenery.ts` 에만. 추정값은 화면에 "예상/추정"으로 표시한다. 존재하지 않는 데이터를 만들어내지 않는다.
- **시뮬레이션 상태는 경과시간의 순수 함수.** `sampleJourney(journey, t)` 외에 프레임 누적 상태로 위치/타이머를 만들지 않는다. 타이머 기준은 벽시계(`epochNow`).
- 집중시간 ≠ 실제 운행시간일 때는 재생 속도를 바꾸지 않고 연출 구간(stretch 가중치)을 늘리거나 줄인다. 실제 운행시간을 바꾼 것처럼 표시하지 않는다.
- 렌더 루프에서 React state 를 매 프레임 갱신하지 않는다 (HUD 는 ≤4Hz, 손잡이 등은 ref 로 직접 style 갱신).
- 창밖 오브젝트는 트랙 좌표 셀 + `hash2` 시드로 결정론적으로 생성한다. `Math.random()` 금지(오디오 노이즈 버퍼 제외).
- 깜짝 이벤트는 `planRideEvents(journey, seedOf(session.id))` 로만 정한다 — 같은 세션은 새로고침해도 같은 이벤트. 놀래키지 않는다(갑툭튀·번쩍임 없음), 휴식 중엔 없음, 설정에서 끌 수 있다.
- 비싼 드로잉(건물·나무·사람·역명판)은 `SpriteCache` 로 캐시한다. 캐시 키에 팔레트와 크기를 포함한다.
- 이모지로 그래픽을 대체하지 않는다. 마스코트(또롱)·아이콘은 자체 SVG.
- 실제 기관 로고/브랜드(서울교통공사 등)를 흉내 내지 않는다. 서비스명은 METRO.
- 모션 감소(`prefers-reduced-motion` + 설정) 시 흔들림·손잡이 진자·주변 애니메이션을 끈다. 번쩍임 금지.
- 작동하지 않는 버튼을 실제 기능처럼 두지 않는다.
- 숨겨진 탭에서 돌아야 하는 판정은 `createTicker`(Worker) 로. 알림 권한은 사용자 클릭 안에서만 요청한다.
- 서비스 워커는 프로덕션에서만 등록된다. `public/sw.js` 캐시 정책을 바꾸면 `VERSION` 을 올린다.

## 다국어

- 화면 문구는 `src/i18n/strings.ts` 의 키로만 쓴다 (`useT()` 의 `t`, 렌더 루프 등 훅 밖에서는 `tr(lang, key)`). 새 문구는 ko·en 둘 다 추가
- 역 이름은 `name(st)` (영어 화면은 공식 영문 표기). 창밖 역명판은 실제처럼 한글·영문 병기 그대로
- 브라우저 검증 스크립트는 `locale: "ko-KR"` 로 실행한다

## 스타일

- TypeScript strict, 함수형 React, CSS Modules. 주석·UI 문구는 한국어.
- 디자인 토큰은 `src/app/globals.css` `:root`. 상세는 `docs/design-system.md`.
- 변경 후 `npm run typecheck && npm run test:sim` 은 항상, 시각 변경은 `verify:browser` 스냅샷으로 확인.
