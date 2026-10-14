/**
 * 다국어 — 한국어/영어. 설정이 "자동"이면 브라우저 언어(한국어면 ko, 그 외 en).
 * 훅 밖(렌더 루프·알림)에서는 tr(lang, key, vars) 를 쓴다.
 */
"use client";

import { useEffect, useState } from "react";
import type { Station } from "@/data/lines";
import { useAppStore } from "@/store/useAppStore";
import { en, ko, type StringKey } from "./strings";

export type Lang = "ko" | "en";
export type { StringKey };

const DICT: Record<Lang, Record<StringKey, string>> = { ko, en };

export function tr(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? ko[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function browserLang(): Lang {
  if (typeof navigator === "undefined") return "ko";
  return (navigator.languages?.[0] ?? navigator.language ?? "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
}

/** 역 이름 (영어 화면에서는 공식 영문 표기) */
export function stationName(st: Station, lang: Lang): string {
  return lang === "en" ? st.nameEn : st.nameKo;
}

export function useLang(): Lang {
  const pref = useAppStore((s) => s.langPref);
  const [auto, setAuto] = useState<Lang>("ko");
  useEffect(() => setAuto(browserLang()), []);
  return pref === "auto" ? auto : pref;
}

export function useT() {
  const lang = useLang();
  return {
    lang,
    t: (key: StringKey, vars?: Record<string, string | number>) => tr(lang, key, vars),
    name: (st: Station) => stationName(st, lang),
  };
}
