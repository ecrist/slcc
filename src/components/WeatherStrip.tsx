"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  Wind,
  type LucideIcon,
} from "lucide-react";

export interface HourlyForecast {
  time: string;          // HH:MM
  tempF: number;
  precipPct: number;
  windMph: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  tempMaxF: number;
  tempMinF: number;
  precipPctMax: number;
  windMaxMph: number;
  weatherCode: number;
  sunrise: string | null;
  sunset: string | null;
  hourly: HourlyForecast[];
}

interface IconChoice {
  Icon: LucideIcon;
  /** Tailwind text color class — applied directly to the Lucide icon */
  color: string;
  label: string;
}

/**
 * WMO weather code → Lucide icon + Tailwind color + label. Codes are reduced
 * to the categories that matter for golfers (sun/cloud/rain/snow/storm/fog).
 * Full WMO reference: https://open-meteo.com/en/docs#weathervariables
 */
export function weatherIcon(code: number): IconChoice {
  if (code === 0) return { Icon: Sun, color: "text-amber-400", label: "Clear" };
  if (code <= 2) return { Icon: CloudSun, color: "text-amber-400", label: "Mostly clear" };
  if (code === 3) return { Icon: Cloudy, color: "text-slate-400", label: "Cloudy" };
  if (code >= 45 && code <= 48) return { Icon: CloudFog, color: "text-slate-400", label: "Fog" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, color: "text-sky-500", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { Icon: CloudRain, color: "text-sky-600", label: "Rain" };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, color: "text-sky-300", label: "Snow" };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, color: "text-sky-600", label: "Showers" };
  if (code >= 85 && code <= 86) return { Icon: CloudSnow, color: "text-sky-300", label: "Snow showers" };
  if (code >= 95) return { Icon: CloudLightning, color: "text-amber-500", label: "Thunderstorm" };
  return { Icon: CloudSun, color: "text-amber-400", label: "Mixed" };
}

interface WeatherStripProps {
  forecast: DailyForecast | null;
  loading: boolean;
}

function formatHour(time: string): string {
  const [hStr] = time.split(":");
  const h = parseInt(hStr, 10);
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

/**
 * Hourly weather strip for the currently selected date. Shows a horizontal
 * row of hours covering daylight / playable hours so a golfer can see, at a
 * glance, when conditions are best to tee off.
 */
export default function WeatherStrip({ forecast, loading }: WeatherStripProps) {
  if (loading) {
    return <div className="h-24 rounded-lg bg-gray-100 animate-pulse mb-4" />;
  }
  if (!forecast) return null;

  // Restrict to playable hours: from one hour before sunrise (or 6am) through
  // sunset (or 9pm). Falls back gracefully if hourly data is missing.
  const startHour = (() => {
    if (forecast.sunrise) {
      const h = parseInt(forecast.sunrise.split(":")[0], 10);
      return Math.max(5, h - 1);
    }
    return 6;
  })();
  const endHour = (() => {
    if (forecast.sunset) {
      const h = parseInt(forecast.sunset.split(":")[0], 10);
      return Math.min(22, h + 1);
    }
    return 21;
  })();

  const hours = forecast.hourly.filter((p) => {
    const h = parseInt(p.time.split(":")[0], 10);
    return h >= startHour && h <= endHour;
  });

  const summary = weatherIcon(forecast.weatherCode);

  if (hours.length === 0) {
    // No hourly data — fall back to a one-line daily summary.
    return (
      <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-gray-200">
        <summary.Icon className={`w-7 h-7 shrink-0 ${summary.color}`} strokeWidth={1.75} aria-hidden />
        <div className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">{summary.label}</span>
          <span className="ml-2 tabular-nums">{forecast.tempMaxF}° / {forecast.tempMinF}°F</span>
          <span className="ml-2 text-gray-500">· {forecast.precipPctMax}% precip · {forecast.windMaxMph} mph wind</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg bg-white border border-gray-200 overflow-hidden">
      {/* Header: day summary */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
        <summary.Icon className={`w-7 h-7 shrink-0 ${summary.color}`} strokeWidth={1.75} aria-hidden />
        <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{summary.label}</span>
          <span className="text-sm text-gray-700 tabular-nums">
            {forecast.tempMaxF}° / {forecast.tempMinF}°F
          </span>
          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" strokeWidth={2} aria-hidden />
            {forecast.precipPctMax}%
          </span>
          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
            <Wind className="w-3 h-3" strokeWidth={2} aria-hidden />
            {forecast.windMaxMph} mph
          </span>
        </div>
      </div>

      {/* Hourly strip */}
      <div className="overflow-x-auto">
        <div className="flex divide-x divide-gray-100 min-w-max">
          {hours.map((h) => {
            const ic = weatherIcon(h.weatherCode);
            const wet = h.precipPct >= 50;
            const windy = h.windMph >= 18;
            return (
              <div
                key={h.time}
                className="px-3 py-2 flex flex-col items-center gap-0.5 min-w-[56px]"
                title={`${ic.label} · ${h.tempF}°F · ${h.precipPct}% precip · ${h.windMph} mph wind`}
              >
                <span className="text-[10px] font-medium text-gray-500 tabular-nums">{formatHour(h.time)}</span>
                <ic.Icon className={`w-5 h-5 ${ic.color}`} strokeWidth={1.75} aria-hidden />
                <span className="text-sm font-semibold text-gray-900 tabular-nums leading-none mt-0.5">{h.tempF}°</span>
                <span className={`text-[10px] tabular-nums leading-none inline-flex items-center gap-0.5 ${wet ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                  <Droplets className="w-2.5 h-2.5" strokeWidth={2} aria-hidden />
                  {h.precipPct}%
                </span>
                <span className={`text-[10px] tabular-nums leading-none inline-flex items-center gap-0.5 ${windy ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                  <Wind className="w-2.5 h-2.5" strokeWidth={2} aria-hidden />
                  {h.windMph}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook: fetches the weekly forecast once and exposes a per-date lookup.
 * The /api/weather route caches in-memory for 30 min, so this is cheap.
 */
export function useWeather(): {
  loading: boolean;
  byDate: Record<string, DailyForecast>;
} {
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((r) => r.ok ? r.json() : Promise.resolve({ forecast: [] }))
      .then((data) => {
        if (cancelled) return;
        setForecast(data.forecast ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setForecast([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byDate = useMemo(() => {
    const m: Record<string, DailyForecast> = {};
    for (const f of forecast) m[f.date] = f;
    return m;
  }, [forecast]);

  return { loading, byDate };
}
