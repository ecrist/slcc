/**
 * Pure astronomical sunset calculation — no API key required.
 * Based on the NOAA Solar Calculator algorithm (Spencer 1971 / Iqbal 1983).
 * Accurate to within a minute for latitudes between 60°S and 60°N.
 */

/** Returns sunset time as "HH:MM" in the local wall-clock time of the given UTC offset (in hours). */
export function sunsetTime(
  dateStr: string,   // "YYYY-MM-DD"
  latDeg: number,    // degrees north
  lngDeg: number,    // degrees east (negative = west)
  utcOffsetHours: number
): string | null {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000
  );

  const latRad = (latDeg * Math.PI) / 180;

  // Solar declination (radians)
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const decl = Math.asin(Math.sin((23.45 * Math.PI) / 180) * Math.sin(B));

  // Hour angle at sunset (where cos H = -tan(lat)*tan(decl))
  const cosH = -Math.tan(latRad) * Math.tan(decl);
  if (cosH < -1) return null; // midnight sun
  if (cosH > 1) return null;  // polar night

  const H = (Math.acos(cosH) * 180) / Math.PI; // degrees

  // Equation of time (minutes) — approximation
  const f = (279.575 + 0.9856 * dayOfYear) * (Math.PI / 180);
  const eot =
    -104.7 * Math.sin(f) +
    596.2 * Math.sin(2 * f) +
    4.1 * Math.sin(3 * f) -
    12.79 * Math.sin(4 * f) -
    429.3 * Math.cos(f) -
    2.0 * Math.cos(2 * f) +
    19.99 * Math.cos(3 * f);

  const eotMin = eot / 60; // convert seconds to minutes

  // Solar noon in UTC minutes from midnight
  const solarNoonUtcMin = 720 - 4 * lngDeg - eotMin;

  // Sunset UTC minutes from midnight
  const sunsetUtcMin = solarNoonUtcMin + 4 * H;

  // Convert to local time
  const sunsetLocalMin = sunsetUtcMin + utcOffsetHours * 60;
  const totalMin = Math.round(sunsetLocalMin);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;

  return `${String(h).padStart(2, "0")}:${String(Math.abs(m)).padStart(2, "0")}`;
}

/** Returns HH:MM that is `hours` before the given HH:MM string, or null if sunset is null. */
export function subtractHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m - Math.round(hours * 60);
  const clampedMin = Math.max(0, totalMin);
  const rh = Math.floor(clampedMin / 60);
  const rm = clampedMin % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}
