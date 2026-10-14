"use client";

/**
 * 객실 깜짝 승객 — 맞은편 좌석에 앉았다 내리거나(단소·강아지·조는 직장인·등산객), 칸을 가로질러 간다(잡상인).
 * 자체 SVG (마스코트 또롱과 같은 선 굵기·색). 장식이라 스크린리더에는 별도 안내 문구로 알린다.
 */
import { type CSSProperties, type ReactNode } from "react";
import { type RideEvent, type RideEventKind } from "@/sim/rideEvents";
import styles from "./Passengers.module.css";

const INK = "#3A3A3A";
const SKIN = "#F3D3B5";
const sw = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** 앉은 사람 공통 몸 (정면, 무릎이 이쪽으로) */
function Seated({ top, pants, shoes = "#4A4440", children, head }: { top: string; pants: string; shoes?: string; children?: ReactNode; head: ReactNode }) {
  return (
    <>
      {/* 다리 */}
      <rect x="38" y="142" width="18" height="56" rx="7" fill={pants} {...sw} />
      <rect x="64" y="142" width="18" height="56" rx="7" fill={pants} {...sw} />
      <ellipse cx="46" cy="202" rx="13" ry="6" fill={shoes} {...sw} />
      <ellipse cx="74" cy="202" rx="13" ry="6" fill={shoes} {...sw} />
      {/* 허벅지 */}
      <rect x="32" y="124" width="56" height="26" rx="10" fill={pants} {...sw} />
      {/* 몸통 */}
      <path d="M30 128 L32 82 Q34 64 60 64 Q86 64 88 82 L90 128 Z" fill={top} {...sw} />
      {children}
      <g className={styles.head}>{head}</g>
    </>
  );
}

const Face = ({ cx = 60, cy = 42, sleepy = false, glasses = false }: { cx?: number; cy?: number; sleepy?: boolean; glasses?: boolean }) => (
  <>
    <circle cx={cx} cy={cy} r="19" fill={SKIN} {...sw} />
    {sleepy ? (
      <path d={`M${cx - 10} ${cy + 2}h6M${cx + 4} ${cy + 2}h6`} {...sw} fill="none" />
    ) : (
      <>
        <circle cx={cx - 7} cy={cy + 1} r="2" fill={INK} />
        <circle cx={cx + 7} cy={cy + 1} r="2" fill={INK} />
      </>
    )}
    {glasses && (
      <g fill="none" {...sw} strokeWidth={1.6}>
        <circle cx={cx - 7} cy={cy + 1} r="5.5" />
        <circle cx={cx + 7} cy={cy + 1} r="5.5" />
        <path d={`M${cx - 1.5} ${cy + 1}h3`} />
      </g>
    )}
    <ellipse cx={cx - 11} cy={cy + 7} rx="3" ry="1.8" fill="#F5A9A0" opacity="0.7" />
    <ellipse cx={cx + 11} cy={cy + 7} rx="3" ry="1.8" fill="#F5A9A0" opacity="0.7" />
  </>
);

/** 단소 든 승객 — 검은 두루마기에 동그란 안경. 가끔 한 소절 분다 */
function Danso({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 120 210" className={styles.fig}>
      <Seated
        top="#2D2F36"
        pants="#2D2F36"
        shoes="#1F1F22"
        head={
          <>
            <Face glasses />
            <path d="M41 36 Q44 18 60 18 Q76 18 79 36 Q70 28 60 28 Q50 28 41 36Z" fill="#26262A" {...sw} />
            <path d={playing ? "M57 53 q3 2 6 0" : "M56 52 h8"} {...sw} fill="none" />
          </>
        }
      >
        {/* 동정(흰 깃) */}
        <path d="M50 66 L60 84 L70 66" fill="none" stroke="#F4F0E6" strokeWidth="4" />
        {playing ? (
          // 입에 대고 세로로
          <g>
            <rect x="57" y="52" width="6" height="58" rx="3" fill="#C9A86A" {...sw} strokeWidth={1.6} />
            <circle cx="60" cy="72" r="1.3" fill={INK} />
            <circle cx="60" cy="80" r="1.3" fill={INK} />
            <circle cx="60" cy="88" r="1.3" fill={INK} />
            <ellipse cx="60" cy="96" rx="8" ry="5" fill={SKIN} {...sw} strokeWidth={1.6} />
            <ellipse cx="60" cy="78" rx="8" ry="5" fill={SKIN} {...sw} strokeWidth={1.6} />
          </g>
        ) : (
          // 무릎 위에 가로로
          <g>
            <rect x="26" y="120" width="70" height="6" rx="3" fill="#C9A86A" {...sw} strokeWidth={1.6} transform="rotate(-8 60 123)" />
            <ellipse cx="44" cy="124" rx="8" ry="5" fill={SKIN} {...sw} strokeWidth={1.6} />
            <ellipse cx="76" cy="120" rx="8" ry="5" fill={SKIN} {...sw} strokeWidth={1.6} />
          </g>
        )}
      </Seated>
      {playing && (
        <g className={styles.notes} fill={INK}>
          <path d="M84 30 v-14 l10 -3 v14" fill="none" {...sw} strokeWidth={1.8} />
          <ellipse cx="82" cy="31" rx="3.4" ry="2.6" />
          <ellipse cx="92" cy="28" rx="3.4" ry="2.6" />
          <path d="M100 48 v-12" fill="none" {...sw} strokeWidth={1.8} />
          <ellipse cx="98" cy="49" rx="3.4" ry="2.6" />
        </g>
      )}
    </svg>
  );
}

/** 강아지를 가방에 넣고 탄 승객 */
function Puppy() {
  return (
    <svg viewBox="0 0 120 210" className={styles.fig}>
      <Seated
        top="#E7C9A0"
        pants="#5F6B7A"
        head={
          <>
            <Face />
            <path d="M40 44 Q38 18 60 18 Q82 18 80 44 Q78 30 66 26 Q54 32 42 30Z" fill="#6B4A36" {...sw} />
            <path d="M56 51 q4 3 8 0" {...sw} fill="none" />
          </>
        }
      >
        {/* 이동 가방 */}
        <rect x="28" y="96" width="64" height="40" rx="10" fill="#9CC5B4" {...sw} />
        <rect x="38" y="102" width="44" height="26" rx="6" fill="#DDEFE7" {...sw} strokeWidth={1.4} />
        <g className={styles.puppy}>
          <ellipse cx="60" cy="116" rx="12" ry="10" fill="#FFFDF8" {...sw} strokeWidth={1.6} />
          <ellipse cx="48" cy="114" rx="4" ry="7" fill="#F2E6D6" {...sw} strokeWidth={1.4} className={styles.earL} />
          <ellipse cx="72" cy="114" rx="4" ry="7" fill="#F2E6D6" {...sw} strokeWidth={1.4} className={styles.earR} />
          <circle cx="56" cy="114" r="1.6" fill={INK} />
          <circle cx="64" cy="114" r="1.6" fill={INK} />
          <ellipse cx="60" cy="119" rx="2" ry="1.4" fill={INK} />
        </g>
        <path d="M40 96 Q60 78 80 96" fill="none" {...sw} />
      </Seated>
    </svg>
  );
}

/** 꾸벅꾸벅 조는 직장인 */
function Sleeper() {
  return (
    <svg viewBox="0 0 120 210" className={styles.fig}>
      <Seated
        top="#3E4A5E"
        pants="#3E4A5E"
        shoes="#2A2420"
        head={
          <>
            <Face sleepy />
            <path d="M41 38 Q42 20 60 20 Q78 20 79 38 Q72 26 58 28 Q48 30 41 38Z" fill="#2B2724" {...sw} />
            <path d="M57 52 q3 1 6 0" {...sw} fill="none" />
          </>
        }
      >
        <path d="M52 66 L60 78 L68 66" fill="#F4F0E6" {...sw} strokeWidth={1.6} />
        <path d="M58 76 L60 100 L62 76 Z" fill="#C9564A" {...sw} strokeWidth={1.4} />
        {/* 서류 가방 */}
        <rect x="34" y="108" width="52" height="22" rx="4" fill="#7A5638" {...sw} />
      </Seated>
      <g className={styles.zzz} fill={INK} fontFamily="inherit" fontWeight="700">
        <text x="84" y="26" fontSize="14">z</text>
        <text x="94" y="16" fontSize="10">z</text>
      </g>
    </svg>
  );
}

/** 형광 등산복 승객 — 배낭과 스틱 */
function Hiker() {
  return (
    <svg viewBox="0 0 130 210" className={styles.fig}>
      {/* 스틱 */}
      <path d="M100 60 L110 204" stroke="#6D7378" strokeWidth="3" />
      <path d="M106 60 L116 204" stroke="#6D7378" strokeWidth="3" />
      {/* 옆에 둔 배낭 */}
      <rect x="92" y="112" width="34" height="60" rx="12" fill="#3F7FB5" {...sw} />
      <rect x="98" y="134" width="22" height="16" rx="5" fill="#2F6A99" {...sw} strokeWidth={1.4} />
      <circle cx="109" cy="112" r="3.5" fill="#E8B84A" {...sw} strokeWidth={1.2} />
      <Seated
        top="#E9573F"
        pants="#4C4A48"
        shoes="#7A5A3A"
        head={
          <>
            <Face />
            {/* 챙 모자 */}
            <path d="M40 34 Q42 16 60 16 Q78 16 80 34Z" fill="#F2C744" {...sw} />
            <path d="M36 34 H84" {...sw} strokeWidth={3} />
            <path d="M55 51 q5 4 10 0" {...sw} fill="none" />
          </>
        }
      >
        <path d="M60 66 V128" stroke="#F2C744" strokeWidth="3" />
        <path d="M32 92 H88" stroke="#C8432F" strokeWidth="3" />
      </Seated>
    </svg>
  );
}

/** 잡상인 — 상자를 들고 칸을 가로질러 간다 */
function Vendor({ facing }: { facing: 1 | -1 }) {
  return (
    <svg viewBox="0 0 120 260" className={styles.fig} style={{ transform: facing < 0 ? "scaleX(-1)" : undefined }}>
      <g className={styles.walk}>
        <rect x="42" y="176" width="16" height="74" rx="7" fill="#5A5048" {...sw} className={styles.legA} />
        <rect x="62" y="176" width="16" height="74" rx="7" fill="#5A5048" {...sw} className={styles.legB} />
      </g>
      <path d="M34 182 L36 100 Q38 84 60 84 Q82 84 84 100 L86 182 Z" fill="#8C9A6E" {...sw} />
      {/* 앞치마 */}
      <path d="M44 110 H76 V176 H44 Z" fill="#E9E2CF" {...sw} strokeWidth={1.6} />
      {/* 상자 */}
      <rect x="62" y="120" width="44" height="34" rx="4" fill="#D9A866" {...sw} />
      <path d="M62 132 H106" {...sw} strokeWidth={1.4} />
      <rect x="70" y="112" width="8" height="10" rx="2" fill="#5B7FC7" {...sw} strokeWidth={1.2} />
      <rect x="82" y="110" width="8" height="12" rx="2" fill="#E8644E" {...sw} strokeWidth={1.2} />
      <rect x="94" y="113" width="8" height="9" rx="2" fill="#3E9B7B" {...sw} strokeWidth={1.2} />
      <Face cy={60} />
      <path d="M40 54 Q40 36 60 36 Q80 36 80 54 Z" fill="#2E5C8A" {...sw} />
      <path d="M78 52 H94" {...sw} strokeWidth={4} stroke="#2E5C8A" />
      <path d="M53 68 q7 6 14 0" {...sw} fill="#B5524A" />
    </svg>
  );
}

const SPEECH: Partial<Record<RideEventKind, true>> = { vendor: true };

/**
 * 지금 객실에 있는 깜짝 승객.
 * - 앉는 승객은 e.t0~e.t1 동안 자리에 있고, 들어오고 나갈 때 살짝 미끄러지며 나타난다/사라진다
 * - 잡상인은 경과 비율(walk 0..1)로 칸을 가로지른다 (HUD 갱신 주기 4Hz + CSS 보간)
 */
export function CabinPassenger({
  event,
  t,
  playing,
  reducedMotion,
  speech,
}: {
  event: RideEvent;
  t: number;
  playing: boolean;
  reducedMotion: boolean;
  speech?: string;
}) {
  const leaving = t > event.t1 - 1.6;
  const side = event.r < 0.5 ? "left" : "right";
  if (event.kind === "vendor") {
    const p = Math.min(1, Math.max(0, (t - event.t0) / (event.t1 - event.t0)));
    const ltr = event.r < 0.5;
    const pos = reducedMotion ? 50 : ltr ? -12 + p * 124 : 112 - p * 124;
    const fade = reducedMotion ? (p < 0.08 || p > 0.92 ? 0 : 1) : 1;
    return (
      <div className={`${styles.passenger} ${styles.walker} ${reducedMotion ? styles.still : ""}`} style={{ left: `${pos}%`, opacity: fade } as CSSProperties} data-testid="cabin-passenger" data-kind="vendor" aria-hidden>
        {SPEECH.vendor && speech && <span className={styles.bubble}>{speech}</span>}
        <Vendor facing={ltr ? 1 : -1} />
      </div>
    );
  }
  return (
    <div
      className={`${styles.passenger} ${styles.seated} ${styles[side]} ${leaving ? styles.leaving : ""} ${reducedMotion ? styles.still : ""}`}
      data-testid="cabin-passenger"
      data-kind={event.kind}
      aria-hidden
    >
      {event.kind === "danso" && <Danso playing={playing} />}
      {event.kind === "puppy" && <Puppy />}
      {event.kind === "sleeper" && <Sleeper />}
      {event.kind === "hiker" && <Hiker />}
    </div>
  );
}

/** 도감·완료 화면용 작은 아이콘 (객실 승객은 얼굴, 창밖 이벤트는 실루엣) */
export function EncounterIcon({ kind, size = 40, locked = false }: { kind: RideEventKind; size?: number; locked?: boolean }) {
  const fill = locked ? "var(--ink-faint, #bbb)" : undefined;
  const body = (() => {
    switch (kind) {
      case "danso":
        return (
          <>
            <circle cx="24" cy="22" r="11" fill={fill ?? SKIN} {...sw} />
            <path d="M13 20 Q15 9 24 9 Q33 9 35 20 Q30 15 24 15 Q18 15 13 20Z" fill={fill ?? "#26262A"} {...sw} />
            <rect x="34" y="14" width="4" height="28" rx="2" fill={fill ?? "#C9A86A"} {...sw} strokeWidth={1.4} transform="rotate(18 36 28)" />
          </>
        );
      case "puppy":
        return (
          <>
            <ellipse cx="24" cy="26" rx="13" ry="11" fill={fill ?? "#FFFDF8"} {...sw} />
            <ellipse cx="11" cy="24" rx="4" ry="8" fill={fill ?? "#F2E6D6"} {...sw} />
            <ellipse cx="37" cy="24" rx="4" ry="8" fill={fill ?? "#F2E6D6"} {...sw} />
            {!locked && <circle cx="20" cy="24" r="1.6" fill={INK} />}
            {!locked && <circle cx="28" cy="24" r="1.6" fill={INK} />}
          </>
        );
      case "sleeper":
        return (
          <>
            <circle cx="22" cy="26" r="11" fill={fill ?? SKIN} {...sw} />
            {!locked && <path d="M16 27h4M24 27h4" {...sw} fill="none" />}
            <text x="34" y="16" fontSize="11" fontWeight="700" fill={INK}>z</text>
          </>
        );
      case "hiker":
        return (
          <>
            <circle cx="24" cy="26" r="11" fill={fill ?? SKIN} {...sw} />
            <path d="M12 21 Q14 10 24 10 Q34 10 36 21Z" fill={fill ?? "#F2C744"} {...sw} />
            <path d="M9 21 H39" {...sw} strokeWidth={2.6} />
          </>
        );
      case "vendor":
        return (
          <>
            <rect x="10" y="20" width="28" height="20" rx="3" fill={fill ?? "#D9A866"} {...sw} />
            <rect x="14" y="13" width="6" height="8" rx="1.5" fill={fill ?? "#5B7FC7"} {...sw} strokeWidth={1.2} />
            <rect x="22" y="11" width="6" height="10" rx="1.5" fill={fill ?? "#E8644E"} {...sw} strokeWidth={1.2} />
            <rect x="30" y="14" width="5" height="7" rx="1.5" fill={fill ?? "#3E9B7B"} {...sw} strokeWidth={1.2} />
          </>
        );
      case "balloon":
        return (
          <>
            <path d="M18 34 C8 26 9 8 24 8 C39 8 40 26 30 34 Z" fill={fill ?? "#E8644E"} {...sw} />
            <path d="M24 8 C20 16 20 28 22 34 M24 8 C28 16 28 28 26 34" fill="none" stroke={locked ? INK : "#F4C24F"} strokeWidth="2" />
            <rect x="20" y="37" width="8" height="6" rx="1.5" fill={fill ?? "#9A6B43"} {...sw} strokeWidth={1.4} />
          </>
        );
      case "duckboat":
        return (
          <>
            <path d="M8 34 H34 Q38 34 36 28 H10 Z" fill={fill ?? "#FFFDF6"} {...sw} />
            <path d="M30 28 Q38 20 34 12" fill="none" {...sw} strokeWidth={4} />
            <circle cx="34" cy="12" r="3.5" fill={fill ?? "#FFFDF6"} {...sw} />
            <path d="M37 11 L42 13 L37 14" fill={fill ?? "#F2B33D"} {...sw} strokeWidth={1.2} />
            <rect x="11" y="20" width="16" height="3" rx="1.5" fill={fill ?? "#6CB7D9"} {...sw} strokeWidth={1.2} />
          </>
        );
      case "cat":
        return (
          <>
            <ellipse cx="24" cy="34" rx="11" ry="9" fill={fill ?? "#E9A75B"} {...sw} />
            <circle cx="22" cy="18" r="8" fill={fill ?? "#E9A75B"} {...sw} />
            <path d="M15 14 L15 6 L20 11 M29 14 L29 6 L24 11" fill={fill ?? "#E9A75B"} {...sw} />
            {!locked && <circle cx="19" cy="18" r="1.3" fill={INK} />}
            {!locked && <circle cx="25" cy="18" r="1.3" fill={INK} />}
          </>
        );
      case "monster":
        return (
          <>
            <path d="M6 34 Q12 22 18 34 Q24 18 30 34 Q35 24 40 34" fill={fill ?? "#3E5A50"} {...sw} />
            <path d="M4 38 H44" stroke={locked ? INK : "#6CB7D9"} strokeWidth="2.4" strokeLinecap="round" />
          </>
        );
      case "ttorong":
        return (
          <>
            <path d="M8 28c0-9 7-15 16-15s16 6 16 15c0 7-7 11-16 11S8 35 8 28Z" fill={fill ?? "#FFFDF8"} {...sw} />
            <path d="M13 16c2-4 6-6 11-6s9 2 11 6c-6-2-16-2-22 0Z" fill={fill ?? "#2E946B"} {...sw} />
            {!locked && <circle cx="19" cy="26" r="1.6" fill={INK} />}
            {!locked && <circle cx="29" cy="26" r="1.6" fill={INK} />}
          </>
        );
    }
  })();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={locked ? { opacity: 0.35 } : undefined}>
      {body}
    </svg>
  );
}
