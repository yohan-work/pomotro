"use client";

import { useEffect, useRef, useState } from "react";
import { HEARTBEAT_MS, type PresenceCounts } from "./presenceKey";

/** 이 탭의 익명 id — 탭을 닫으면 사라진다 (새로고침해도 같은 사람으로 세되, 기기·사람은 추적할 수 없게) */
function anonId(): string {
  try {
    const kept = sessionStorage.getItem("metro-anon");
    if (kept && /^[a-f0-9]{16}$/.test(kept)) return kept;
  } catch {
    /* 저장소를 못 쓰면 매번 새로 */
  }
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  const id = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem("metro-anon", id);
  } catch {
    /* 무시 */
  }
  return id;
}

/**
 * 지금 타는 사람 수. send 면 1분마다 익명 신호(노선·방)를 보낸다. 실패하면 조용히 null.
 * enabled=false 면 아무것도 보내거나 받지 않는다 (설정에서 끔).
 */
export function usePresence({ enabled, send, line, room }: { enabled: boolean; send: boolean; line?: string; room?: string }): PresenceCounts | null {
  const [counts, setCounts] = useState<PresenceCounts | null>(null);
  const id = useRef<string>("");
  if (!id.current && typeof window !== "undefined") id.current = anonId();
  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      try {
        // 검증 스크립트 세션은 실제 집계에 섞이지 않게 보내지 않는다
        let verifying = false;
        try {
          verifying = localStorage.getItem("metro-verify") === "1";
        } catch {
          /* 무시 */
        }
        if (send && line && !verifying) {
          await fetch("/api/presence", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: id.current, line, ...(room ? { room } : {}) }),
            keepalive: true,
          });
        }
        const res = await fetch(`/api/presence${room ? `?room=${room}` : ""}`);
        const data = (await res.json()) as PresenceCounts;
        if (alive) setCounts(data.available ? data : null);
      } catch {
        if (alive) setCounts(null);
      }
    };
    tick();
    const t = setInterval(tick, HEARTBEAT_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, send, line, room]);
  return counts;
}
