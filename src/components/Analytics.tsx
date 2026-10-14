"use client";

import { useEffect } from "react";
import { GA_ID, analyticsEnabled } from "@/lib/analytics";

/** gtag.js 를 하이드레이션 이후에 붙인다. 수집 대상이 아니면 아무것도 하지 않는다 */
export default function Analytics() {
  useEffect(() => {
    if (!analyticsEnabled() || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js 는 arguments 객체 그대로를 기대한다
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
  }, []);
  return null;
}
