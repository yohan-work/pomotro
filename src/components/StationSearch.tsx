"use client";

import { useId, useMemo, useState } from "react";
import { LINE_BY_ID, type Station } from "@/data/lines";
import { useT } from "@/i18n";
import { searchStations } from "@/lib/stationSearch";
import { LineBadge } from "./LineBadge";
import styles from "./StationSearch.module.css";

/**
 * 역 이름으로 고르기 — 국문·초성·영문. 결과마다 그 역이 있는 노선 배지가 붙고, 배지를 누르면 그 노선의 역을 고른다.
 * 키보드: ↑↓ 로 노선별 선택지를 옮기고 Enter 로 고른다 (combobox + listbox).
 */
export function StationSearch({ onPick }: { onPick: (st: Station) => void }) {
  const { t, lang, lineName } = useT();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const id = useId();
  const hits = useMemo(() => searchStations(q), [q]);
  const options = hits.flatMap((h) => h.stations);
  const pick = (st: Station) => {
    onPick(st);
    setQ("");
    setActive(0);
  };
  const optId = (st: Station) => `${id}-${st.id}`;
  const open = q.trim().length > 0;

  return (
    <div className={styles.search}>
      <input
        className={styles.input}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && options[active] ? optId(options[active]) : undefined}
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(options.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") setQ("");
        }}
      />
      {open && (
        <ul className={styles.list} id={`${id}-list`} role="listbox" aria-label={t("search.results")}>
          {hits.length === 0 && <li className={styles.empty}>{t("search.none")}</li>}
          {hits.map((h) => (
            <li key={h.nameKo} className={styles.row} role="presentation">
              <span className={styles.name}>
                {lang === "en" ? h.nameEn : h.nameKo}
                <small>{lang === "en" ? h.nameKo : h.nameEn}</small>
              </span>
              <span className={styles.lines} role="presentation">
                {h.stations.map((st) => {
                  const line = LINE_BY_ID[st.line];
                  const on = options[active]?.id === st.id;
                  return (
                    <button
                      key={st.id}
                      id={optId(st)}
                      role="option"
                      aria-selected={on}
                      aria-label={t("map.station", { line: lineName(line), station: lang === "en" ? st.nameEn : st.nameKo })}
                      className={on ? styles.optOn : styles.opt}
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(st)}
                    >
                      <LineBadge line={line} />
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
