# 외부 에셋 출처

## 하늘 사진 (`public/sky/*.webp`)

[Poly Haven](https://polyhaven.com) 의 HDRI 를 수평선~40° 띠로 잘라 WebP 로 변환했다. 라이선스: **CC0** (출처 표시 의무 없음, 감사의 뜻으로 기록).

| 파일 | 원본 | 가공 |
|---|---|---|
| `day.webp` | [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | 크롭·축소 |
| `sunset.webp` | [Qwantani Sunset (Pure Sky)](https://polyhaven.com/a/qwantani_sunset_puresky) | 크롭·축소 |
| `night.webp` | [Kloppenheim 07 (Pure Sky)](https://polyhaven.com/a/kloppenheim_07_puresky) | 크롭·축소, 어둡고 푸르게 보정 |

## 노선 데이터

서울교통공사 「역간거리 및 소요시간」 — 공공누리 제1유형 (README 참고).

## 글꼴

Pretendard — SIL Open Font License 1.1.

## 생성 이미지 (`public/art/*.webp`) — 실험

로컬에서 [FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) (Apache 2.0, 4bit 양자화본 `dhairyashil/FLUX.1-schnell-mflux-4bit`)을 [mflux](https://github.com/filipstrand/mflux) 로 실행해 생성했다. 생성물 사용에 제한 없음.

| 파일 | 내용 | 가공 |
|---|---|---|
| `interior.webp` | 지하철 객실 실내 (창은 크로마키로 투명) | 초록 창 크로마키·번짐 제거 |
| `far-sunset-west.webp` | 노을 진 강 너머 도시 원경 (서향) | 수면 위까지 크롭 |

생성 도구·스크립트는 저장소 밖(`~/.local/share/pomotro-artgen`)에 있다. 원경은 실제 지형을 재현하지 않은 분위기용 이미지다.
