/**
 * 백그라운드 동작 보조
 *
 * - 숨겨진 탭의 setInterval 은 Chrome 의 강한 타이머 스로틀링으로 최대 1분 단위까지 늦춰진다.
 *   전용 Web Worker 의 타이머는 그 대상이 아니므로, 완료 판정·이벤트는 Worker 틱으로 돌린다.
 * - 알림 권한은 사용자의 "출발하기" 클릭 안에서만 요청한다 (맥락 있는 권한 요청).
 */

export interface Ticker {
  stop: () => void;
}

export function createTicker(onTick: () => void, intervalMs: number): Ticker {
  if (typeof Worker !== "undefined" && typeof Blob !== "undefined") {
    try {
      const src = `setInterval(() => postMessage(0), ${intervalMs});`;
      const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      const w = new Worker(url);
      w.onmessage = onTick;
      return {
        stop: () => {
          w.terminate();
          URL.revokeObjectURL(url);
        },
      };
    } catch {
      /* CSP 등으로 Worker 생성 실패 시 아래로 */
    }
  }
  const id = setInterval(onTick, intervalMs);
  return { stop: () => clearInterval(id) };
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** 클릭 핸들러 안에서 호출. 이미 결정된 권한은 다시 묻지 않는다 */
export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** 탭이 보이지 않을 때만 알림. 서비스 워커가 있으면 그쪽으로 (모바일 호환) */
export async function notifyIfHidden(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted" || !document.hidden) return;
  const opts: NotificationOptions = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "metro-arrival" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* 알림 실패는 무시 — 사운드·탭 제목으로도 알 수 있다 */
  }
}

/** 알림 상태 — 출발 화면 안내용 */
export type NotifyStatus = "granted" | "default" | "denied" | "unsupported" | "needs-install";

export function notifyStatus(): NotifyStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!notificationsSupported()) {
    // iPhone/iPad Safari 는 홈 화면에 추가한 웹앱에서만 알림을 지원한다 (iOS 16.4+)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios ? "needs-install" : "unsupported";
  }
  return Notification.permission;
}
