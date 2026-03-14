"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { TEE_TIME_SLOTS } from "@/lib/types";

interface BookedSlot {
  time: string;
  players: number;
  player_name: string;
  group_booking_id: string | null;
  slot_index: number;
}

function slotsNeededForPlayers(players: number): number {
  return Math.min(3, Math.ceil(Math.max(1, players) / 4));
}

function getSlotGroup(startTime: string, count: number): string[] {
  const idx = TEE_TIME_SLOTS.indexOf(startTime);
  if (idx === -1) return [];
  return TEE_TIME_SLOTS.slice(idx, idx + count);
}

export default function TeeTimesPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [form, setForm] = useState({
    player_name: "",
    player_email: "",
    player_phone: "",
    players: "2",
    holes: "18",
    cart: false,
    notes: "",
  });
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const playerCount = parseInt(form.players) || 2;
  const slotsNeeded = slotsNeededForPlayers(playerCount);
  const bookedTimes = new Set(bookedSlots.map((s) => s.time));

  // If player count changes and the current selection no longer has enough
  // consecutive free slots, clear it so the user picks again.
  useEffect(() => {
    if (bookingSlot) {
      const group = getSlotGroup(bookingSlot, slotsNeeded);
      const valid = group.length === slotsNeeded && group.every((t) => !bookedTimes.has(t));
      if (!valid) setBookingSlot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsNeeded]);

  useEffect(() => {
    fetchBookedSlots();
  }, [selectedDate]);

  async function fetchBookedSlots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tee-times?date=${selectedDate}`);
      const data = await res.json();
      setBookedSlots(data);
    } catch {
      console.error("Failed to fetch tee times");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingSlot) return;
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const res = await fetch("/api/tee-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: bookingSlot,
          ...form,
          players: playerCount,
          holes: parseInt(form.holes),
          cart: form.cart ? 1 : 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitStatus({ type: "success", message: data.message });
        setBookingSlot(null);
        setForm({ player_name: "", player_email: "", player_phone: "", players: "2", holes: "18", cart: false, notes: "" });
        fetchBookedSlots();
      } else {
        const err = await res.json();
        setSubmitStatus({ type: "error", message: err.error || "Failed to book tee time" });
        // Refresh slots in case another user just booked
        fetchBookedSlots();
      }
    } catch {
      setSubmitStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  function formatDateDisplay(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const selectedGroup = bookingSlot ? getSlotGroup(bookingSlot, slotsNeeded) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Book a Tee Time</h1>
      <p className="text-gray-600 mb-8">Select a date and available time slot to reserve your tee time.</p>

      {submitStatus && (
        <div className={`mb-6 p-4 rounded-lg ${submitStatus.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {submitStatus.message}
        </div>
      )}

      {/* Date Selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {dateOptions.map((date) => (
          <button
            key={date}
            onClick={() => { setSelectedDate(date); setBookingSlot(null); }}
            className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDate === date
                ? "bg-swan-green text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:border-swan-green"
            }`}
          >
            {formatDateDisplay(date)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time Slots */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold">Available Times — {formatDateDisplay(selectedDate)}</h2>
            {slotsNeeded > 1 && (
              <span className="text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full">
                Party of {playerCount} reserves {slotsNeeded} consecutive slots
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading available times...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {TEE_TIME_SLOTS.map((time) => {
                const isBooked = bookedTimes.has(time);
                const group = getSlotGroup(time, slotsNeeded);
                // Slot is unavailable if it's booked, doesn't have enough slots left
                // in the day, or one of the required consecutive slots is already taken.
                const isUnavailable =
                  isBooked ||
                  group.length < slotsNeeded ||
                  group.some((t) => bookedTimes.has(t));

                const isSelectedStart = bookingSlot === time;
                const isInSelectedGroup = !isSelectedStart && selectedGroup.includes(time);

                let className =
                  "p-3 rounded-lg text-center font-medium transition-all text-sm ";

                if (isUnavailable) {
                  className += "bg-gray-100 text-gray-400 cursor-not-allowed";
                  if (isBooked) className += " line-through";
                } else if (isSelectedStart) {
                  className += "bg-swan-gold text-swan-dark ring-2 ring-swan-gold";
                } else if (isInSelectedGroup) {
                  className += "bg-amber-50 border-2 border-amber-300 text-amber-800";
                } else {
                  className +=
                    "bg-white border border-gray-200 text-gray-700 hover:border-swan-green hover:text-swan-green";
                }

                return (
                  <button
                    key={time}
                    disabled={isUnavailable}
                    onClick={() => setBookingSlot(isSelectedStart ? null : time)}
                    className={className}
                  >
                    {formatTime(time)}
                    {isBooked && <span className="block text-xs mt-0.5">Booked</span>}
                    {isInSelectedGroup && (
                      <span className="block text-xs mt-0.5">Also reserved</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-gray-200 bg-white inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-swan-gold inline-block" />
              Selected start
            </span>
            {slotsNeeded > 1 && (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-amber-300 bg-amber-50 inline-block" />
                Also reserved
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-gray-100 inline-block" />
              Unavailable
            </span>
          </div>
        </div>

        {/* Booking Form */}
        <div>
          {bookingSlot && !session ? (
            <div className="card sticky top-24 text-center">
              <svg className="h-12 w-12 mx-auto mb-3 text-swan-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-xl font-bold mb-2">Sign in to Book</h2>
              <p className="text-gray-500 text-sm mb-5">
                You&apos;ve selected <strong>{formatTime(bookingSlot)}</strong> on {formatDateDisplay(selectedDate)}.
                Sign in to confirm your booking.
              </p>
              <button onClick={() => signIn()} className="btn-primary w-full">
                Sign In to Continue
              </button>
            </div>
          ) : bookingSlot && session ? (
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-1">
                {slotsNeeded > 1
                  ? `${formatTime(selectedGroup[0])} – ${formatTime(selectedGroup[selectedGroup.length - 1])}`
                  : `Book ${formatTime(bookingSlot)}`}
              </h2>
              <p className="text-gray-500 text-sm mb-1">{formatDateDisplay(selectedDate)}</p>
              {slotsNeeded > 1 && (
                <p className="text-amber-700 text-xs mb-4 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {slotsNeeded} consecutive slots reserved for your party of {playerCount}
                </p>
              )}
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={form.player_name || session.user?.name || ""}
                    onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={form.player_email || session.user?.email || ""}
                    onChange={(e) => setForm({ ...form, player_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={form.player_phone}
                    onChange={(e) => setForm({ ...form, player_phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Players</label>
                    <select
                      className="input-field"
                      value={form.players}
                      onChange={(e) => setForm({ ...form, players: e.target.value })}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}{n === 5 ? " (2 slots)" : n === 9 ? " (3 slots)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holes</label>
                    <select
                      className="input-field"
                      value={form.holes}
                      onChange={(e) => setForm({ ...form, holes: e.target.value })}
                    >
                      <option value="9">9 Holes</option>
                      <option value="18">18 Holes</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.cart}
                    onChange={(e) => setForm({ ...form, cart: e.target.checked })}
                    className="w-4 h-4 text-swan-green rounded"
                  />
                  <span className="text-sm text-gray-700">Cart rental ($10/9 holes)</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </form>
            </div>
          ) : (
            <div className="card text-center text-gray-500 py-12">
              <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="mb-2">Select an available time slot to book</p>
              {slotsNeeded > 1 && (
                <p className="text-xs text-amber-700">
                  Your party of {playerCount} will reserve {slotsNeeded} consecutive slots
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
