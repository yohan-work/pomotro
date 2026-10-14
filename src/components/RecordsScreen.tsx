"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getStation } from "@/data/lines";
import { makeBackup, parseBackup } from "@/lib/backup";
import { kstDay, lastWeek, totals, visited, type DayBar } from "@/lib/stats";
import { tr, useT, type Lang } from "@/i18n";
import { useAppStore, type RideRecord } from "@/store/useAppStore";
import { IconArrow, IconClose, IconDownload } from "./Icons";
import LineMap from "./LineMap";
import { EncounterIcon } from "./Passengers";
import { EVENT_KINDS, RARE_KINDS } from "@/sim/rideEvents";
import styles from "./RecordsScreen.module.css";
import { TICKET_H, TICKET_W, drawTicket, ticketBlob } from "./ticket";

function fmtDuration(sec: number, lang: Lang) {
  const m = Math.round(sec / 60);
  if (m < 60) return tr(lang, "common.min", { n: m });
  return m % 60 ? tr(lang, "rec.hours", { h: Math.floor(m / 60), m: m % 60 }) : tr(lang, "rec.hoursOnly", { h: Math.floor(m / 60) });
}

/** 만난 승객·풍경 도감 — 못 만난 것은 흐리게, 희귀한 것은 이름도 숨긴다 */
function EncounterDex({ records }: { records: RideRecord[] }) {
  const { t } = useT();
  const seen = useMemo(() => new Set(records.flatMap((r) => r.encounters ?? [])), [records]);
  return (
    <section className={styles.panel} aria-label={t("records.dex")}>
      <h2 className={styles.h2}>
        {t("records.dex")} <span className={styles.dexCount}>{seen.size} / {EVENT_KINDS.length}</span>
      </h2>
      <p className={styles.dexHint}>{t("records.dexHint")}</p>
      <ul className={styles.dex}>
        {EVENT_KINDS.map((k) => {
          const got = seen.has(k);
          const hidden = !got && RARE_KINDS.includes(k);
          return (
            <li key={k} className={got ? "" : styles.dexLocked} title={got ? t(`event.desc.${k}`) : t("records.dexLocked")}>
              {hidden ? <span className={styles.dexQ}>?</span> : <EncounterIcon kind={k} size={40} locked={!got} />}
              <span>{hidden ? "???" : t(`event.name.${k}`)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 최근 7일 집중 시간 — 단일 시리즈 막대 (범례 없음, 막대별 툴팁, 표 대체 제공) */
function WeekChart({ data }: { data: DayBar[] }) {
  const { t, name, lang } = useT();
  void name;
  void lang;
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLElement>(null);
  const [W, setW] = useState(320);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 150;
  const top = 18;
  const base = H - 22;
  const max = Math.max(25, ...data.map((d) => d.minutes));
  const col = W / data.length;
  const bw = Math.min(28, col * 0.42);
  return (
    <figure className={styles.chart} ref={wrap}>
      <figcaption className={styles.chartTitle}>{t("rec.week")}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t("rec.weekAria")}>
        <line x1={0} x2={W} y1={base + 0.5} y2={base + 0.5} className={styles.axis} />
        {data.map((d, i) => {
          const h = d.minutes > 0 ? Math.max(4, ((base - top) * d.minutes) / max) : 0;
          const x = col * i + col / 2 - bw / 2;
          const showValue = d.minutes > 0 && (d.isToday || d.minutes === Math.max(...data.map((v) => v.minutes)));
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={col * i} y={0} width={col} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${base} V${base - h + 4} Q${x},${base - h} ${x + 4},${base - h} H${x + bw - 4} Q${x + bw},${base - h} ${x + bw},${base - h + 4} V${base} Z`}
                  className={d.isToday ? styles.barToday : styles.bar}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {showValue && hover === null && (
                <text x={x + bw / 2} y={base - h - 5} className={styles.value}>
                  {t("common.min", { n: d.minutes })}
                </text>
              )}
              <text x={col * i + col / 2} y={H - 6} className={d.isToday ? styles.dayToday : styles.day}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className={styles.tooltip} style={{ left: `${((hover + 0.5) / data.length) * 100}%` }} role="status">
          <b>{data[hover].label}</b> {t("rec.weekTip", { min: data[hover].minutes, n: data[hover].rides })}
        </div>
      )}
      <table className={styles.srOnly}>
        <caption>{t("rec.week")}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.label}</th>
              <td>
                {t("rec.weekTip", { min: d.minutes, n: d.rides })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function TicketDialog({ rec, onClose }: { rec: RideRecord; onClose: () => void }) {
  const { t, name, lang } = useT();
  void name;
  void lang;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const records = useAppStore((s) => s.records);
  const daySec = useMemo(
    () => records.filter((r) => r.mode === "focus" && kstDay(r.completedAt) === kstDay(rec.completedAt)).reduce((a, r) => a + r.focusSec, 0),
    [records, rec],
  );
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => drawTicket(cv.getContext("2d")!, rec, daySec, lang);
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [rec, daySec, lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const save = async () => {
    const blob = await ticketBlob(rec, daySec, lang);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metro-ticket-${rec.fromId}-${rec.toId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={styles.dialogBack} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t("rec.ticket")} onClick={(e) => e.stopPropagation()}>
        <canvas ref={ref} width={TICKET_W} height={TICKET_H} className={styles.ticket} />
        <div className={styles.dialogActions}>
          <button className={styles.ghost} onClick={save}>
            <IconDownload width={16} height={16} /> {t("common.saveImage")}
          </button>
          <button className={styles.primary} onClick={onClose} autoFocus>
            {t("common.close")}
          </button>
        </div>
        <button
          className={styles.dangerLink}
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            useAppStore.getState().deleteRecord(rec.id);
            onClose();
          }}
        >
          {confirmDelete ? t("rec.deleteOneConfirm") : t("rec.deleteOne")}
        </button>
      </div>
    </div>
  );
}

/** 기록 백업·복원·초기화 — 기록은 이 브라우저에만 저장된다 */
function DataPanel() {
  const { t, name, lang } = useT();
  void name;
  void lang;
  const records = useAppStore((s) => s.records);
  const [msg, setMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const blob = new Blob([makeBackup(records)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = `metro-records-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(t("rec.exported", { n: records.length }));
  };

  const importFile = async (file: File) => {
    try {
      const { records: incoming, invalid } = parseBackup(await file.text());
      const added = useAppStore.getState().importRecords(incoming);
      setMsg(
        t("rec.imported", { n: added }) +
          (incoming.length - added > 0 ? t("rec.importSkipped", { n: incoming.length - added }) : "") +
          (invalid ? t("rec.importInvalid", { n: invalid }) : ""),
      );
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMsg(code === "not-json" ? t("rec.importNotJson") : code === "not-metro" ? t("rec.importNotMetro") : t("rec.importFailed"));
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>{t("rec.manage")}</h2>
      <p className={styles.note}>{t("rec.manageNote")}</p>
      <div className={styles.dataRow}>
        <button className={styles.ghost} onClick={exportFile} disabled={records.length === 0}>
          {t("rec.export")}
        </button>
        <button className={styles.ghost} onClick={() => fileRef.current?.click()}>
          {t("rec.import")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <button
          className={styles.dangerLink}
          disabled={records.length === 0}
          onClick={() => {
            if (!confirmClear) return setConfirmClear(true);
            useAppStore.getState().clearRecords();
            setConfirmClear(false);
            setMsg(t("rec.cleared"));
          }}
        >
          {confirmClear ? t("rec.clearConfirm") : t("rec.clearAll")}
        </button>
      </div>
      {msg && (
        <p className={styles.note} role="status">
          {msg}
        </p>
      )}
    </section>
  );
}

export default function RecordsScreen() {
  const { t, name, lang } = useT();
  void name;
  void lang;
  const records = useAppStore((s) => s.records);
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState<RideRecord | null>(null);
  const tot = useMemo(() => totals(records), [records]);
  const v = useMemo(() => visited(records), [records]);
  const week = useMemo(() => lastWeek(records, Date.now(), tr(lang, "rec.days").split(","), tr(lang, "rec.today")), [records, lang]);
  const list = useMemo(() => records.filter((r) => r.mode === "focus").slice().reverse().slice(0, 30), [records]);

  const stats: Array<[string, string]> = [
    [t("rec.totalFocus"), fmtDuration(tot.focusSec, lang)],
    [t("rec.distance"), `${tot.km.toFixed(1)}km`],
    [t("rec.rides"), t("rec.ridesVal", { n: tot.rides })],
    [t("rec.stations"), `${tot.stations} / ${tot.stationsTotal}`],
    [t("rec.streak"), t("rec.streakVal", { n: tot.streak })],
  ];

  return (
    <main className={styles.records}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <button className={styles.back} onClick={() => setView("home")} aria-label={t("rec.back")}>
            <IconClose width={18} height={18} />
          </button>
          <div>
            <h1 className={styles.title}>{t("rec.title")}</h1>
            <p className={styles.sub}>{t("rec.sub")}</p>
          </div>
        </header>

        <section className={styles.mapCard}>
          <LineMap visited={v.segments} visitedStations={v.stations} label={t("rec.mapLabel")} />
          <div className={styles.legend}>
            <span>
              <i className={styles.legendRun} /> {t("rec.legendRun")}
            </span>
            <span>
              <i className={styles.legendDot} /> {t("rec.legendVisited")}
            </span>
          </div>
        </section>

        <section className={styles.stats} aria-label={t("rec.statsLabel")}>
          {stats.map(([k, val]) => (
            <div key={k} className={styles.stat}>
              <span>{k}</span>
              <b>{val}</b>
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <WeekChart data={week} />
        </section>

        <EncounterDex records={records} />

        <section className={styles.panel}>
          <h2 className={styles.h2}>{t("rec.list")}</h2>
          {list.length === 0 ? (
            <div className={styles.empty}>
              <p>{t("rec.empty")}</p>
              <button className={styles.primary} onClick={() => setView("home")}>
                {t("rec.goDepart")} <IconArrow width={16} height={16} />
              </button>
            </div>
          ) : (
            <ul className={styles.list}>
              {list.map((r) => (
                <li key={r.id}>
                  <button className={styles.row} onClick={() => setOpen(r)}>
                    <span className={styles.rowDate}>
                      {new Date(r.completedAt).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" })}
                    </span>
                    <span className={styles.rowRoute}>
                      {name(getStation(r.fromId))} → {name(getStation(r.toId))}
                      {r.partial && <em>{t("rec.partial")}</em>}
                      {r.task && (
                        <small>
                          {r.taskDone ? "✓ " : ""}
                          {r.task}
                        </small>
                      )}
                    </span>
                    <span className={styles.rowMeta}>
                      {fmtDuration(r.focusSec, lang)} · {(r.distanceKm ?? 0).toFixed(1)}km
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <DataPanel />
      </div>
      {open && <TicketDialog rec={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
