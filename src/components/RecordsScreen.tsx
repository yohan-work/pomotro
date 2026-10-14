"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getStation } from "@/data/line2";
import { kstDay, lastWeek, totals, visited, type DayBar } from "@/lib/stats";
import { useAppStore, type RideRecord } from "@/store/useAppStore";
import { IconArrow, IconClose, IconDownload } from "./Icons";
import LineMap from "./LineMap";
import styles from "./RecordsScreen.module.css";
import { TICKET_H, TICKET_W, drawTicket, ticketBlob } from "./ticket";

function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60 ? `${m % 60}분` : ""}`.trim();
}

/** 최근 7일 집중 시간 — 단일 시리즈 막대 (범례 없음, 막대별 툴팁, 표 대체 제공) */
function WeekChart({ data }: { data: DayBar[] }) {
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
      <figcaption className={styles.chartTitle}>최근 7일 집중 시간</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="최근 7일 일별 집중 시간 막대 그래프">
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
                  {d.minutes}분
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
          <b>{data[hover].label}</b> {data[hover].minutes}분 · {data[hover].rides}회
        </div>
      )}
      <table className={styles.srOnly}>
        <caption>최근 7일 집중 시간</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.label}</th>
              <td>
                {d.minutes}분, {d.rides}회
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function TicketDialog({ rec, onClose }: { rec: RideRecord; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const records = useAppStore((s) => s.records);
  const daySec = useMemo(
    () => records.filter((r) => r.mode === "focus" && kstDay(r.completedAt) === kstDay(rec.completedAt)).reduce((a, r) => a + r.focusSec, 0),
    [records, rec],
  );
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => drawTicket(cv.getContext("2d")!, rec, daySec);
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [rec, daySec]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const save = async () => {
    const blob = await ticketBlob(rec, daySec);
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
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="승차권" onClick={(e) => e.stopPropagation()}>
        <canvas ref={ref} width={TICKET_W} height={TICKET_H} className={styles.ticket} />
        <div className={styles.dialogActions}>
          <button className={styles.ghost} onClick={save}>
            <IconDownload width={16} height={16} /> 이미지로 저장
          </button>
          <button className={styles.primary} onClick={onClose} autoFocus>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordsScreen() {
  const records = useAppStore((s) => s.records);
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState<RideRecord | null>(null);
  const t = useMemo(() => totals(records), [records]);
  const v = useMemo(() => visited(records), [records]);
  const week = useMemo(() => lastWeek(records), [records]);
  const list = useMemo(() => records.filter((r) => r.mode === "focus").slice().reverse().slice(0, 30), [records]);

  const stats: Array<[string, string]> = [
    ["총 집중", fmtDuration(t.focusSec)],
    ["달린 거리", `${t.km.toFixed(1)}km`],
    ["완주", `${t.rides}회`],
    ["방문한 역", `${t.stations} / ${t.stationsTotal}`],
    ["연속", `${t.streak}일`],
  ];

  return (
    <main className={styles.records}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <button className={styles.back} onClick={() => setView("home")} aria-label="출발 화면으로">
            <IconClose width={18} height={18} />
          </button>
          <div>
            <h1 className={styles.title}>나의 서울 노선도</h1>
            <p className={styles.sub}>집중하며 달린 구간이 노선도에 쌓여요.</p>
          </div>
        </header>

        <section className={styles.mapCard}>
          <LineMap visited={v.segments} visitedStations={v.stations} label="달린 구간이 표시된 2호선 노선도" />
          <div className={styles.legend}>
            <span>
              <i className={styles.legendRun} /> 달린 구간
            </span>
            <span>
              <i className={styles.legendDot} /> 방문한 역
            </span>
          </div>
        </section>

        <section className={styles.stats} aria-label="누적 기록">
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

        <section className={styles.panel}>
          <h2 className={styles.h2}>탑승 기록</h2>
          {list.length === 0 ? (
            <div className={styles.empty}>
              <p>아직 기록이 없어요. 첫 집중 여행을 떠나볼까요?</p>
              <button className={styles.primary} onClick={() => setView("home")}>
                출발하러 가기 <IconArrow width={16} height={16} />
              </button>
            </div>
          ) : (
            <ul className={styles.list}>
              {list.map((r) => (
                <li key={r.id}>
                  <button className={styles.row} onClick={() => setOpen(r)}>
                    <span className={styles.rowDate}>
                      {new Date(r.completedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" })}
                    </span>
                    <span className={styles.rowRoute}>
                      {getStation(r.fromId).nameKo} → {getStation(r.toId).nameKo}
                      {r.partial && <em>중간 하차</em>}
                      {r.task && <small>{r.task}</small>}
                    </span>
                    <span className={styles.rowMeta}>
                      {fmtDuration(r.focusSec)} · {(r.distanceKm ?? 0).toFixed(1)}km
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {open && <TicketDialog rec={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
