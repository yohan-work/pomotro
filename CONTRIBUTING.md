# 기여 가이드

METRO에 관심을 가져주셔서 고맙습니다. 버그 제보, 데이터 정정, 풍경·사운드 개선, 문서 보완 모두 환영합니다.

## 시작하기

```bash
git clone https://github.com/yohan-work/pomotro.git
cd pomotro
npm install
npm run dev        # http://localhost:3000
```

Node.js 24 이상(`.nvmrc`)을 사용합니다. 브라우저 검증 스크립트는 로컬 Google Chrome을 headless로 실행합니다.

## 작업 흐름

1. 큰 변경은 먼저 [이슈](https://github.com/yohan-work/pomotro/issues)로 방향을 맞춰주세요.
2. `main`에서 브랜치를 만듭니다: `feat/...`, `fix/...`, `docs/...`
3. 기능 단위로 커밋합니다. 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식에 한국어 요약을 씁니다.
   ```
   feat(render): 잠실철교 장면 추가
   fix(sim): 일시정지 후 재개 시 이벤트 중복 재생
   ```
   스코프: `data` `sim` `render` `audio` `store` `ui` `recommend` `docs` `ci`
4. PR을 열고 템플릿의 체크리스트를 채워주세요.

## 제출 전 확인

```bash
npm run typecheck
npm test
npm run test:sim
npm run build
```

화면이나 동작을 바꿨다면 개발 서버를 띄운 상태에서:

```bash
npm run verify:browser -- http://localhost:3000          # 장면 스냅샷 → .verify/
npm run verify:behavior -- http://localhost:3000
```

**시각적 변경은 PR에 전/후 스크린샷을 첨부해주세요.** PR 을 열면 CI 가 main 과 PR 의 장면 14개를 같은 머신에서 픽셀 비교해 요약표와 기준 | 변경 | 차이 이미지(아티팩트 `visual-diff`)를 남깁니다. `?autostart=demo&seek=45&tod=sunset` 처럼 URL 파라미터로 같은 장면을 재현할 수 있습니다.

## 지켜야 할 원칙

- **실제 데이터와 연출 데이터를 섞지 않습니다.** 실제 세계의 사실은 `src/data/line2.ts`, 화면용 길이·배치는 `src/data/scenery.ts`.
- **공식 데이터는 손으로 고치지 않습니다.** `src/data/line2.official.ts`는 `npm run data:import`로만 생성합니다. 출처가 없는 값을 실제 데이터처럼 넣지 마세요.
- **시뮬레이션 상태는 경과시간의 순수 함수**여야 합니다. 프레임마다 값을 누적하는 방식은 받지 않습니다.
- 창밖 오브젝트는 결정론적으로 생성합니다 (`Math.random()` 금지, `hash2`/`rng` 사용).
- 렌더 루프 안에서 React state를 매 프레임 갱신하지 않습니다.
- 이모지로 그래픽을 대체하지 않고, 실제 기관의 로고·브랜드를 흉내 내지 않습니다.
- 모션 줄이기 설정을 존중하고, 번쩍이는 효과를 넣지 않습니다.
- 외부 음원·이미지는 라이선스가 명확할 때만 추가합니다.

더 자세한 규칙은 [CLAUDE.md](CLAUDE.md)와 [docs/](docs/)에 있습니다.

## 데이터 정정

역 정보·구조·운행시간이 실제와 다르면 [데이터 정정 이슈](https://github.com/yohan-work/pomotro/issues/new?template=data_correction.yml)에 근거 자료(공식 링크 등)와 함께 알려주세요.

## 행동 강령

이 프로젝트는 [행동 강령](CODE_OF_CONDUCT.md)을 따릅니다. 참여함으로써 이를 지키는 데 동의하게 됩니다.
