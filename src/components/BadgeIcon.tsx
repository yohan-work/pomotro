"use client";

import type { BadgeId } from "@/lib/badges";

const INK = "#3A3A3A";
const sw = { stroke: INK, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

/** 배지 — 자체 SVG 메달 (얻지 못한 배지는 흐린 회색) */
export function BadgeIcon({ id, earned, size = 48 }: { id: BadgeId; earned: boolean; size?: number }) {
  const ring = earned ? "#E9A75B" : "var(--c-line, #ddd)";
  const face = earned ? "#FFF6E4" : "var(--c-surface-2, #f3f1ec)";
  const glyph = (() => {
    switch (id) {
      case "first-ride": // 승차권
        return (
          <>
            <path d="M14 18h20a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4v-3a2 2 0 0 1 2-2Z" {...sw} />
            <path d="M28 19v12" {...sw} strokeDasharray="2 2" />
          </>
        );
      case "han-river": // 물결
        return <path d="M11 22q3.5-3 7 0t7 0 7 0 7 0M11 29q3.5-3 7 0t7 0 7 0 7 0" {...sw} />;
      case "five-bridges": // 트러스 다리
        return <path d="M10 30h28M12 30l4-8 4 8 4-8 4 8 4-8 4 8M14 22h20" {...sw} />;
      case "loop2": // 순환
        return (
          <>
            <rect x="12" y="15" width="24" height="18" rx="9" {...sw} />
            <path d="M33 13l3 2-3 3" {...sw} />
          </>
        );
      case "first-transfer": // 갈아타기 화살표
        return <path d="M12 19h18l-4-4M36 29H18l4 4" {...sw} />;
      case "line-complete": // 깃발
        return <path d="M16 35V13M16 14h16l-4 5 4 5H16" {...sw} />;
      case "focus-10h": // 시계
        return (
          <>
            <circle cx="24" cy="24" r="11" {...sw} />
            <path d="M24 17v7l5 3" {...sw} />
          </>
        );
      case "km-100": // 선로
        return <path d="M18 12l-4 24M30 12l4 24M15 18h18M14 24h20M13 30h22" {...sw} />;
      case "streak-7": // 달력
        return (
          <>
            <rect x="13" y="15" width="22" height="20" rx="3" {...sw} />
            <path d="M13 21h22M18 12v5M30 12v5M19 28l3 3 6-6" {...sw} />
          </>
        );
      case "dex-half": // 또롱 얼굴
        return (
          <>
            <path d="M12 28c0-7 5-12 12-12s12 5 12 12c0 5-5 8-12 8s-12-3-12-8Z" {...sw} />
            <circle cx="20" cy="27" r="1.4" fill={INK} />
            <circle cx="28" cy="27" r="1.4" fill={INK} />
          </>
        );
    }
  })();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={earned ? undefined : { opacity: 0.45 }}>
      <circle cx="24" cy="24" r="22" fill={face} stroke={ring} strokeWidth="3" />
      {glyph}
    </svg>
  );
}
