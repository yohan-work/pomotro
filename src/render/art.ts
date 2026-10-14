/**
 * 생성 이미지 에셋 (로컬 FLUX.1-schnell, Apache 2.0 — docs/credits.md)
 *
 * 실내 이미지는 창 부분이 투명하게 오려져 있고, bbox 는 그 창의 위치(이미지 기준 0..1)다.
 * 화면에서는 이미지를 cover 로 깔고, 같은 위치에 창밖 캔버스를 맞춘다.
 */
export interface InteriorArt {
  src: string;
  /** [x0, y0, x1, y1] 이미지 크기 대비 비율 */
  bbox: [number, number, number, number];
  size: [number, number];
}

/** 아직 에셋이 없으면 null → 기존 CSS 실내 */
export const INTERIOR_ART: InteriorArt | null = {
  src: "/art/interior.webp",
  bbox: [0.2702, 0.2109, 0.7539, 0.6738],
  size: [1536, 1024],
};

/** cover 로 깔린 이미지 위 창 영역의 화면 좌표 (px) */
export function windowRect(art: InteriorArt, vw: number, vh: number) {
  const [iw, ih] = art.size;
  const scale = Math.max(vw / iw, vh / ih);
  const ox = (vw - iw * scale) / 2;
  const oy = (vh - ih * scale) / 2;
  const [x0, y0, x1, y1] = art.bbox;
  // 경계 틈이 보이지 않도록 1% 여유
  const padX = (x1 - x0) * iw * scale * 0.01;
  const padY = (y1 - y0) * ih * scale * 0.01;
  return {
    left: ox + x0 * iw * scale - padX,
    top: oy + y0 * ih * scale - padY,
    width: (x1 - x0) * iw * scale + padX * 2,
    height: (y1 - y0) * ih * scale + padY * 2,
  };
}

/**
 * 원경 판(하늘 + 먼 스카이라인). horizonRow = 이미지 속 수면 경계 행, sunU = 해의 가로 위치.
 * 서향 창(노을)에서만 쓴다 — 지리 검수: 당산철교에서 서쪽(하류) 방향, 초고층 없음.
 */
export interface FarArt {
  src: string;
  size: [number, number];
  horizonRow: number;
  sunU: number;
}

export const FAR_ART: Partial<Record<"day" | "sunset" | "night", FarArt>> = {
  sunset: { src: "/art/far-sunset-west.webp", size: [1920, 412], horizonRow: 408, sunU: 0.3635 },
};
