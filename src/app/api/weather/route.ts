import { NextResponse } from "next/server";
import { getConfigValue } from "@/lib/admin";

/**
 * Proxies Open-Meteo (free, no API key) so the client doesn't have to
 * know the course coordinates and we can cache the response in-memory.
 *
 * Returns a per-date forecast (daily summary + hourly breakdown) for the
 * next 10 days. The client picks the date currently selected on the
 * tee-times page and renders an hour-by-hour strip.
 */

export interface HourlyForecast {
  time: string;            // HH:MM (local, America/Chicago)
  tempF: number;
  precipPct: number;       // 0-100
  windMph: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;            // YYYY-MM-DD
  tempMaxF: number;
  tempMinF: number;
  precipPctMax: number;    // 0-100
  windMaxMph: number;
  weatherCode: number;     // WMO weather code
  sunrise: string | null;  // HH:MM local
  sunset: string | null;   // HH:MM local
  hourly: HourlyForecast[];
}

interface CacheEntry {
  forecast: DailyForecast[];
  fetchedAt: number;
}

// Module-scoped cache. Open-Meteo's free tier is generous but we want to be
// polite — and the client refetches on tab switch within the same day.
const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { key: string; entry: CacheEntry } | null = null;

interface OpenMeteoResponse {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
  hourly?: {
    time: string[];                       // ISO local "YYYY-MM-DDTHH:MM"
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
}

function timePart(iso: string | undefined | null): string | null {
  if (!iso) return null;
  // "2026-04-27T06:18" -> "06:18"
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : null;
}

export async function GET() {
  const [latStr, lngStr] = await Promise.all([
    getConfigValue("course_latitude"),
    getConfigValue("course_longitude"),
  ]);
  // Swan Lake CC, Pengilly, MN — used only when the admin hasn't set coords.
  const lat = parseFloat(latStr ?? "47.315");
  const lng = parseFloat(lngStr ?? "-93.192");
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

  // Serve from cache when fresh
  if (cache && cache.key === cacheKey && Date.now() - cache.entry.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ forecast: cache.entry.forecast, cached: true });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code,sunrise,sunset` +
    `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America%2FChicago&forecast_days=10`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = (await res.json()) as OpenMeteoResponse;
    const d = json.daily;
    const h = json.hourly;
    if (!d) throw new Error("No daily forecast");

    // Bucket hourly entries by date so each DailyForecast carries its own
    // hourly array for the strip.
    const hourlyByDate: Record<string, HourlyForecast[]> = {};
    if (h) {
      for (let i = 0; i < h.time.length; i++) {
        const iso = h.time[i];
        const date = iso.slice(0, 10);
        const time = iso.slice(11, 16);
        (hourlyByDate[date] ??= []).push({
          time,
          tempF: Math.round(h.temperature_2m[i] ?? 0),
          precipPct: Math.round(h.precipitation_probability[i] ?? 0),
          windMph: Math.round(h.wind_speed_10m[i] ?? 0),
          weatherCode: h.weather_code[i] ?? 0,
        });
      }
    }

    const forecast: DailyForecast[] = d.time.map((date: string, i: number) => ({
      date,
      tempMaxF: Math.round(d.temperature_2m_max[i] ?? 0),
      tempMinF: Math.round(d.temperature_2m_min[i] ?? 0),
      precipPctMax: Math.round(d.precipitation_probability_max[i] ?? 0),
      windMaxMph: Math.round(d.wind_speed_10m_max[i] ?? 0),
      weatherCode: d.weather_code[i] ?? 0,
      sunrise: timePart(d.sunrise?.[i]),
      sunset: timePart(d.sunset?.[i]),
      hourly: hourlyByDate[date] ?? [],
    }));

    cache = { key: cacheKey, entry: { forecast, fetchedAt: Date.now() } };
    return NextResponse.json({ forecast, cached: false });
  } catch {
    // Don't fail the page if weather is unavailable — return empty
    return NextResponse.json({ forecast: [], cached: false, error: "Weather unavailable" });
  }
}
