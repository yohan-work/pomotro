"use client";

import styles from "./Garland.module.css";

/**
 * 12월 객실 장식 — 손잡이 봉을 따라 늘어진 가랜드와 작은 전구.
 * 전구는 아주 천천히 밝아졌다 어두워진다 (번쩍임 없음, 모션 감소 시 고정).
 */
export function Garland() {
  const N = 14;
  const colors = ["#F2C14E", "#E8644E", "#7FC8A9", "#F4F1EA"];
  return (
    <svg className={styles.garland} viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
      <path d="M0 6 Q36 30 72 6 T143 6 T214 6 T286 6 T357 6 T428 6 T500 6 T571 6 T643 6 T714 6 T786 6 T857 6 T928 6 T1000 6" fill="none" stroke="#2F6B4F" strokeWidth="9" strokeLinecap="round" />
      <path d="M0 6 Q36 30 72 6 T143 6 T214 6 T286 6 T357 6 T428 6 T500 6 T571 6 T643 6 T714 6 T786 6 T857 6 T928 6 T1000 6" fill="none" stroke="#4A8F6B" strokeWidth="3" strokeDasharray="2 6" />
      {Array.from({ length: N }, (_, k) => {
        const x = 36 + k * 71.4;
        return <circle key={k} cx={x} cy={17} r="5.4" fill={colors[k % colors.length]} className={styles.bulb} style={{ animationDelay: `${(k % 5) * 0.8}s` }} />;
      })}
    </svg>
  );
}
