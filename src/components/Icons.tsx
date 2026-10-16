import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconVolume = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);
export const IconMute = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="m16 9.5 5 5m0-5-5 5" />
  </svg>
);
export const IconExpand = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
);
export const IconExit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l-4 4 4 4M5 12h10" />
  </svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconTrain = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="14" rx="3.5" />
    <path d="M5 10h14M8.5 14h.01M15.5 14h.01M8 21l1.5-3M16 21l-1.5-3" />
  </svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

/** 서비스 마스코트 "또롱" — 지하철 모자를 쓴 찹쌀떡 */
export function Mascot({ size = 64, mood = "smile" }: { size?: number; mood?: "smile" | "sleepy" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="59" rx="17" ry="3" fill="rgba(0,0,0,0.12)" />
      <path
        d="M10 40c0-14 9.5-24 22-24s22 10 22 24c0 10-9 17-22 17S10 50 10 40Z"
        fill="#FFFDF8"
        stroke="#3A3A3A"
        strokeWidth="2.2"
      />
      <path d="M17 21c3-6 8-9 15-9s12 3 15 9c-8-2.5-22-2.5-30 0Z" fill="#2E946B" stroke="#3A3A3A" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="27" y="14" width="10" height="5" rx="2" fill="#F4B36B" stroke="#3A3A3A" strokeWidth="1.6" />
      {mood === "smile" ? (
        <>
          <circle cx="24.5" cy="37" r="2.2" fill="#3A3A3A" />
          <circle cx="39.5" cy="37" r="2.2" fill="#3A3A3A" />
        </>
      ) : (
        <>
          <path d="M22 37.5h5M37 37.5h5" stroke="#3A3A3A" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      <path d="M29 42.5c1.6 1.6 4.4 1.6 6 0" stroke="#3A3A3A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="19.5" cy="42" rx="3" ry="1.8" fill="#F5A9A0" opacity="0.7" />
      <ellipse cx="44.5" cy="42" rx="3" ry="1.8" fill="#F5A9A0" opacity="0.7" />
    </svg>
  );
}

/** 미니 창 (화면 속 작은 창) */
export const IconPip = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

/** 같이 타기 (링크 공유) */
export const IconShare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="M8.2 10.9l7.6-4.2M8.2 13.1l7.6 4.2" />
  </svg>
);
