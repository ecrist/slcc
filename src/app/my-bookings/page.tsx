"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { downloadTeeTimeIcs } from "@/lib/calendar";

interface Booking {
  id: number;
  date: string;
  time: string;
  end_time: string | null;
  players: number;
  holes: number;
  player_name: string;
  player_email: string;
  group_booking_id: string | null;
  carts_requested: number;
  buggies_requested: number;
  clubs_requested: number;
  personal_cart_drop: number;
  status: string;
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/** Add 7 days to a YYYY-MM-DD string and return YYYY-MM-DD. */
function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MyBookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bounce unauthenticated visitors to /login
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/my-bookings")}`);
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (!session) return;
    fetchBookings();
  }, [session]);

  async function fetchBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/my-bookings");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load bookings");
      }
      const data = await res.json();
      setUpcoming(data.upcoming ?? []);
      setPast(data.past ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(b: Booking) {
    setCancelling(b.id);
    try {
      const res = await fetch(`/api/my-bookings?id=${b.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to cancel");
      }
      setConfirmCancel(null);
      await fetchBookings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  }

  if (sessionStatus === "loading" || !session) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title animate-fade-in-up stagger-1">My Bookings</h1>
      <p className="text-gray-600 mb-6 animate-fade-in-up stagger-1">
        Your upcoming tee times. Cancel, add to your calendar, or rebook the same time next week.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <section className="mb-10 animate-fade-in-up stagger-2">
            <h2 className="text-lg font-semibold text-swan-green mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <svg className="h-10 w-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-gray-700 font-medium mb-1">No upcoming tee times</p>
                <p className="text-sm text-gray-500 mb-4">Reserve a time to get out on the course.</p>
                <Link href="/tee-times" className="btn-primary inline-block text-sm py-2 px-5">
                  Book a tee time
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isPast={false}
                    cancelling={cancelling === b.id}
                    onCancel={() => setConfirmCancel(b)}
                    onAddCalendar={() => downloadTeeTimeIcs({
                      date: b.date,
                      time: b.time,
                      holes: b.holes,
                      players: b.players,
                      name: b.player_name,
                      uid: b.group_booking_id || `tt-${b.id}`,
                    })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section className="animate-fade-in-up stagger-3">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent</h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isPast={true}
                    cancelling={false}
                    onAddCalendar={() => downloadTeeTimeIcs({
                      date: b.date,
                      time: b.time,
                      holes: b.holes,
                      players: b.players,
                      name: b.player_name,
                      uid: b.group_booking_id || `tt-${b.id}`,
                    })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={() => setConfirmCancel(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-modal-in">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel this tee time?</h3>
            <p className="text-sm text-gray-600 mb-1">
              {formatDate(confirmCancel.date)} at {formatTime(confirmCancel.time)}
            </p>
            <p className="text-sm text-gray-600 mb-5">
              {confirmCancel.players} player{confirmCancel.players > 1 ? "s" : ""} · {confirmCancel.holes} holes
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={cancelling !== null}
              >
                Keep
              </button>
              <button
                onClick={() => handleCancel(confirmCancel)}
                disabled={cancelling !== null}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancelling !== null ? "Cancelling…" : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  isPast,
  cancelling,
  onCancel,
  onAddCalendar,
}: {
  booking: Booking;
  isPast: boolean;
  cancelling: boolean;
  onCancel?: () => void;
  onAddCalendar: () => void;
}) {
  const timeLabel =
    booking.end_time && booking.end_time !== booking.time
      ? `${formatTime(booking.time)}–${formatTime(booking.end_time)}`
      : formatTime(booking.time);

  // Rebook target: same time next week. Tee-times page already handles
  // ?date= / ?slot= URL params and will open the booking modal on it.
  const rebookHref = `/tee-times?date=${addDays(booking.date, 7)}&slot=${booking.time}`;

  return (
    <div className={`rounded-xl border bg-white shadow-sm p-4 ${isPast ? "border-gray-200 opacity-90" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-semibold text-swan-green uppercase tracking-wide">
              {formatDate(booking.date)}
            </p>
            {isPast && (
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Past</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">{timeLabel}</p>
          <p className="text-sm text-gray-600 mt-1">
            {booking.players} player{booking.players > 1 ? "s" : ""} · {booking.holes} holes
          </p>
          {(booking.carts_requested > 0 || booking.buggies_requested > 0 || booking.clubs_requested > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {booking.carts_requested > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  {booking.carts_requested} cart{booking.carts_requested > 1 ? "s" : ""}
                </span>
              )}
              {booking.buggies_requested > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {booking.buggies_requested} pull cart{booking.buggies_requested > 1 ? "s" : ""}
                </span>
              )}
              {booking.clubs_requested > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {booking.clubs_requested} club rental{booking.clubs_requested > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onAddCalendar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:border-swan-green hover:text-swan-green transition-colors"
          title="Download .ics file"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M3 18.75v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Add to Calendar
        </button>

        <Link
          href={rebookHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-swan-gold/15 text-swan-dark border border-swan-gold/40 hover:bg-swan-gold/25 transition-colors"
          title={`Book the same time on ${formatDate(addDays(booking.date, 7))}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Rebook next week
        </Link>

        {!isPast && onCancel && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60 ml-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
