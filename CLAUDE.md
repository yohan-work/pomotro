# METRO — 서울을 달리는 뽀모도로

집중하는 동안 서울 지하철 창가에 앉아 한 구간을 달리는 웹 뽀모도로. 기획 원문: `plan/phase-01-261014.md`, 무드 레퍼런스: `references/metro-concept.png`.

@AGENTS.md

## 실행

```bash
npm run dev                 # http://localhost:3000
npm run typecheck           # tsc --noEmit
npm run test:sim            # 시뮬레이션 엔진 불변식 (브라우저 불필요)
npm run build               # 프로덕션 빌드 (정적)
npm run verify:browser -- http://localhost:3000 [--full] [--tod]   # 실제 Chrome 스냅샷/FPS/110초 완주
npm run verify:behavior -- http://localhost:3000                   # 일시정지·새로고침·중복기록·오디오
```

검증 스크립트는 로컬 Google Chrome(`channel: "chrome"`)을 headless 로 띄운다. 결과 이미지는 `.verify/`(gitignore).

개발용 URL 파라미터: `?autostart=demo` `?autostart=route&route=gangbyeon,jamsillaru&total=150` `?seek=40` `?tod=day|sunset|night` `?debug=1`

## 구조

```
src/data/line2.ts      실제 노선 데이터 (역·순서·지상/지하·추정 운행시간). 사실만, 출처·검증상태 명시
src/data/scenery.ts    연출 데이터 (구간별 풍경 순서·길이, 시뮬레이션 미터). 가상값
src/sim/               시간 → 상태 순수 함수 엔진 (journey, profile, clock)
src/render/            Canvas 2D 창밖 패럴랙스 (scene = 레이어, sprites = 캐시 오브젝트, palette = 시간대)
src/audio/             WebAudio 합성 사운드 (외부 음원 없음)
src/store/             Zustand + localStorage (세션·기록·설정)
src/components/        DOM UI (객실 실내, HUD, 출발/완료 화면)
scripts/               검증 스크립트
docs/                  plan / architecture / design-system / phase-01
```

## 반드시 지킬 규칙

- **실제 데이터와 연출 데이터를 섞지 않는다.** 실제 세계 사실은 `line2.ts` 에만, 화면용 길이·배치는 `scenery.ts` 에만. 추정값은 화면에 "예상/추정"으로 표시한다. 존재하지 않는 데이터를 만들어내지 않는다.
- **시뮬레이션 상태는 경과시간의 순수 함수.** `sampleJourney(journey, t)` 외에 프레임 누적 상태로 위치/타이머를 만들지 않는다. 타이머 기준은 벽시계(`epochNow`).
- 집중시간 ≠ 실제 운행시간일 때는 재생 속도를 바꾸지 않고 연출 구간(stretch 가중치)을 늘리거나 줄인다. 실제 운행시간을 바꾼 것처럼 표시하지 않는다.
- 렌더 루프에서 React state 를 매 프레임 갱신하지 않는다 (HUD 는 ≤4Hz, 손잡이 등은 ref 로 직접 style 갱신).
- 창밖 오브젝트는 트랙 좌표 셀 + `hash2` 시드로 결정론적으로 생성한다. `Math.random()` 금지(오디오 노이즈 버퍼 제외).
- 비싼 드로잉(건물·나무·사람·역명판)은 `SpriteCache` 로 캐시한다. 캐시 키에 팔레트와 크기를 포함한다.
- 이모지로 그래픽을 대체하지 않는다. 마스코트(또롱)·아이콘은 자체 SVG.
- 실제 기관 로고/브랜드(서울교통공사 등)를 흉내 내지 않는다. 서비스명은 METRO.
- 모션 감소(`prefers-reduced-motion` + 설정) 시 흔들림·손잡이 진자·주변 애니메이션을 끈다. 번쩍임 금지.
- 작동하지 않는 버튼을 실제 기능처럼 두지 않는다.

## 스타일

- TypeScript strict, 함수형 React, CSS Modules. 주석·UI 문구는 한국어.
- 디자인 토큰은 `src/app/globals.css` `:root`. 상세는 `docs/design-system.md`.
- 변경 후 `npm run typecheck && npm run test:sim` 은 항상, 시각 변경은 `verify:browser` 스냅샷으로 확인.
