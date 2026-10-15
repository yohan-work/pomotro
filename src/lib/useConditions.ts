"use client";

import { useEffect, useState } from "react";
import { fetchSeoulWeather, seasonKST, type LiveWeather, type Season, type Weather } from "@/render/conditions";
import { useAppStore } from "@/store/useAppStore";
import { calendarNow, springPhase, type SpringPhase } from "@/lib/calendar";

const WEATHERS: Weather[] = ["clear", "cloudy", "rain", "snow", "fog"];
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

/**
 * 창밖에 쓸 계절·날씨. 설정이 "자동"이면 한국 시간 계절과 서울 실시간 날씨(30분 캐시).
 * 개발·검증용 URL: ?weather=rain&season=winter
 */
export function useConditions(): { season: Season; weather: Weather; live: LiveWeather | null; springPhase: SpringPhase } {
  const weatherPref = useAppStore((s) => s.weatherPref);
  const seasonPref = useAppStore((s) => s.seasonPref);
  const [live, setLive] = useState<LiveWeather | null>(null);
  const [override, setOverride] = useState<{ weather?: Weather; season?: Season }>({});

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const w = p.get("weather") as Weather | null;
    const s = p.get("season") as Season | null;
    setOverride({ weather: w && WEATHERS.includes(w) ? w : undefined, season: s && SEASONS.includes(s) ? s : undefined });
  }, []);

  useEffect(() => {
    if (weatherPref !== "auto") return;
    let alive = true;
    const load = () => fetchSeoulWeather().then((w) => alive && w && setLive(w));
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [weatherPref]);

  const weather = override.weather ?? (weatherPref === "auto" ? (live?.weather ?? "clear") : weatherPref);
  const auto = !override.season && seasonPref === "auto";
  const season = override.season ?? (seasonPref === "auto" ? seasonKST(calendarNow()) : seasonPref);
  // 자동이면 날짜에 따라 개나리 → 벚꽃 → 신록, 봄을 직접 고르면 벚꽃 절정
  return { season, weather, live: weatherPref === "auto" ? live : null, springPhase: auto ? springPhase(calendarNow()) : "bloom" };
}
