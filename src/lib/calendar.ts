/**
 * Build and download an .ics calendar file for a tee time booking.
 *
 * Why client-side: the .ics format is dead simple and we already have all
 * the info on the client at booking confirmation. Going server-side would
 * just add a network round-trip for no benefit.
 *
 * iOS / macOS Calendar, Google Calendar (via download), and Outlook all
 * accept this minimal RFC 5545 envelope. Some Android browsers handle
 * .ics downloads inconsistently — we use a Blob URL + anchor click which
 * is the most broadly supported approach.
 */

export interface TeeTimeIcsInput {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM 24-hour */
  time: string;
  /** Number of holes — used to estimate duration (9 ≈ 2h, 18 ≈ 4.5h) */
  holes: number;
  /** Player count for the description */
  players: number;
  /** Lead booker name (or all names) */
  name: string;
  /**
   * Stable identifier — we use the group_booking_id when available so
   * re-downloading the same booking updates instead of duplicating in the
   * user's calendar.
   */
  uid?: string;
}

/** RFC 5545 wants CRLF line endings and folded long lines, but most clients
 * tolerate plain LF for short fields. Keep it simple. */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a local date+time as a floating local-time DTSTART (no Z, no TZID).
 * Floating time is interpreted in the viewer's local zone, which is what we
 * want — a 9:00 tee time is 9:00 wherever the player happens to be. */
function fmtLocal(date: string, time: string, addMinutes = 0): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  // Build via Date only to handle minute-overflow, then read components back.
  const dt = new Date(y, mo - 1, d, h, m + addMinutes, 0);
  return (
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}` +
    `T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
  );
}

function escape(s: string): string {
  return s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function buildTeeTimeIcs(input: TeeTimeIcsInput): string {
  // Holes → minutes is rough but reasonable. 9 holes ≈ 2 hours, 18 ≈ 4.5 hours.
  const durationMin = input.holes >= 18 ? 270 : 120;
  const dtStart = fmtLocal(input.date, input.time, 0);
  const dtEnd = fmtLocal(input.date, input.time, durationMin);
  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const uid = input.uid
    ? `${input.uid}@swanlakecc.com`
    : `${input.date.replace(/-/g, "")}T${input.time.replace(/:/g, "")}-${Date.now()}@swanlakecc.com`;

  const summary = escape(`Tee Time at Swan Lake CC (${input.players} player${input.players > 1 ? "s" : ""})`);
  const description = escape(
    `Booked for ${input.name}\\n${input.players} player${input.players > 1 ? "s" : ""}, ${input.holes} holes\\n\\nSwan Lake Country Club, Pengilly, MN`,
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Swan Lake Country Club//Tee Time//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "LOCATION:Swan Lake Country Club, Pengilly, MN",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Tee time in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Trigger a download of the generated .ics. On iOS Safari this opens the
 * Add-to-Calendar sheet directly; on desktop browsers it saves the file.
 */
export function downloadTeeTimeIcs(input: TeeTimeIcsInput): void {
  const ics = buildTeeTimeIcs(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swan-lake-tee-time-${input.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so iOS has time to read the blob
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
