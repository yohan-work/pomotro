"use client";

import type { LineDef } from "@/data/lines";
import { useT } from "@/i18n";
import styles from "./LineBadge.module.css";

/** 노선 배지 — 색 원에 번호(경의중앙선은 "경의"), 지선·순환은 옆에 짧은 표기 */
export function LineBadge({ line, showVariant = true }: { line: LineDef; showVariant?: boolean }) {
  const { lang } = useT();
  const text = line.badge[lang];
  return (
    <span className={styles.badge}>
      <span className={text.length > 1 ? styles.pill : styles.dot} style={{ background: line.color }} aria-hidden>
        {text}
      </span>
      {showVariant && line.variant && <span className={styles.variant}>{line.variant[lang]}</span>}
    </span>
  );
}
