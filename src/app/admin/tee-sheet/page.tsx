"use client";

import { useState, useEffect, useCallback } from "react";
import { TEE_TIME_SLOTS } from "@/lib/types";

interface BookedSlot {
  id: number;
  time: string;
  players: number;
  player_name: string;
  player_email: string;
  player_phone: string | null;
  holes: number;
  carts_requested: number;
  buggies_requested: number;
  clubs_requested: number;
  personal_cart_drop: number;
  status: string;
  notes: string | null;
  group_booking_id: string | null;
  slot_index: number;
  checked_in: number;
}

const STATUS_COLORS: Record<string, string> = {
  open:       "bg-gray-50 border-gray-200 text-gray-400",
  confirmed:  "bg-emerald-50 border-emerald-300 text-emerald-900",
  checked_in: "bg-teal-100 border-teal-400 text-teal-900",
  cancelled:  "bg-red-50 border-red-200 text-red-400 line-through",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
}

export default function TeeSheetPage() {
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BookedSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tee-sheet?date=${date}`);
      if (res.ok) setSlots(await res.json());
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleCheckIn(slot: BookedSlot) {
    setSaving(true);
    const res = await fetch(`/api/desk/tee-times/${slot.id}`, { method: "PUT" });
    setSaving(false);
    if (res.ok) { fetchSlots(); setSelected(null); flash("success", `${slot.player_name} checked in.`); }
    else flash("error", "Check-in failed.");
  }

  async function handleCancel(slot: BookedSlot) {
    if (!confirm(`Cancel tee time for ${slot.player_name}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/tee-times?id=${slot.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { fetchSlots(); setSelected(null); flash("success", "Booking cancelled."); }
    else flash("error", "Cancellation failed.");
  }

  // Build a map from time → slot record (only lead slots for display of details)
  const slotMap = new Map<string, BookedSlot>();
  const groupMap = new Map<string, BookedSlot[]>(); // group_booking_id → all slots
  for (const s of slots) {
    slotMap.set(s.time, s);
    if (s.group_booking_id) {
      const arr = groupMap.get(s.group_booking_id) ?? [];
      arr.push(s);
      groupMap.set(s.group_booking_id, arr);
    }
  }

  // Determine which times are part of a multi-slot group (non-lead)
  const groupFollowers = new Set<string>();
  for (const [, group] of groupMap) {
    const lead = group.find((s) => s.slot_index === 0);
    if (!lead) continue;
    group.filter((s) => s.slot_index > 0).forEach((s) => groupFollowers.add(s.time));
  }

  const bookingCount = slots.filter((s) => s.slot_index === 0 && s.status !== "cancelled").length;
  const checkedInCount = slots.filter((s) => s.slot_index === 0 && s.checked_in).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="section-title mb-0">Tee Sheet</h1>
          <p className="text-gray-500 text-sm mt-1">
            {bookingCount} booking{bookingCount !== 1 ? "s" : ""} &bull; {checkedInCount} checked in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDays(date, -1))} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">‹ Prev</button>
          <input
            type="date"
            className="input-field w-44 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={() => setDate(addDays(date, 1))} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Next ›</button>
          <button onClick={() => setDate(today())} className="px-3 py-2 text-sm text-swan-green border border-swan-green rounded-lg hover:bg-emerald-50">Today</button>
        </div>
      </div>

      <p className="text-lg font-semibold text-swan-dark mb-4">{fmtDate(date)}</p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { color: "bg-gray-50 border-gray-200", label: "Open" },
          { color: "bg-emerald-50 border-emerald-300", label: "Booked" },
          { color: "bg-teal-100 border-teal-400", label: "Checked In" },
          { color: "bg-purple-50 border-purple-300", label: "Multi-slot" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-4 h-4 rounded border ${color} inline-block`} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-1">
          {TEE_TIME_SLOTS.map((time) => {
            const booking = slotMap.get(time);
            const isFollower = groupFollowers.has(time);
            const isLead = booking && booking.slot_index === 0;
            const isMulti = booking?.group_booking_id && groupMap.get(booking.group_booking_id)!.length > 1;

            let colorClass = STATUS_COLORS.open;
            if (booking) {
              if (booking.status === "cancelled") colorClass = STATUS_COLORS.cancelled;
              else if (booking.checked_in) colorClass = STATUS_COLORS.checked_in;
              else if (isMulti) colorClass = "bg-purple-50 border-purple-300 text-purple-900";
              else colorClass = STATUS_COLORS.confirmed;
            }

            return (
              <button
                key={time}
                onClick={() => booking && !isFollower && setSelected(booking)}
                className={`grid grid-cols-[4rem_1fr_auto] items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${colorClass} ${booking && !isFollower ? "hover:shadow-sm cursor-pointer" : "cursor-default"} ${isFollower ? "opacity-40" : ""}`}
              >
                <span className="font-mono text-sm font-semibold tabular-nums">{time}</span>
                {booking && !isFollower ? (
                  <span className="min-w-0">
                    <span className="font-medium truncate block">{booking.player_name}</span>
                    <span className="text-xs opacity-70">
                      {booking.players}p · {booking.holes}h
                      {booking.carts_requested > 0 && ` · ${booking.carts_requested} cart`}
                      {booking.buggies_requested > 0 && ` · ${booking.buggies_requested} buggy`}
                      {booking.clubs_requested > 0 && ` · ${booking.clubs_requested} clubs`}
                      {booking.personal_cart_drop ? " · own cart" : ""}
                      {isMulti && ` · ${groupMap.get(booking.group_booking_id!)!.length}-slot group`}
                    </span>
                  </span>
                ) : isFollower ? (
                  <span className="text-xs italic opacity-50">— continuation of above group —</span>
                ) : (
                  <span className="text-xs opacity-40">Open</span>
                )}
                {booking && !isFollower && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    booking.checked_in ? "bg-teal-200 text-teal-800" :
                    booking.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "bg-emerald-200 text-emerald-800"
                  }`}>
                    {booking.checked_in ? "In" : booking.status === "cancelled" ? "Cancelled" : "Booked"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Booking detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">{selected.time} — {fmtDate(date)}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <dl className="space-y-1.5 text-sm mb-5">
              {(
                [
                  ["Name", selected.player_name],
                  ["Email", selected.player_email],
                  ["Phone", selected.player_phone ?? "—"],
                  ["Players", String(selected.players)],
                  ["Holes", String(selected.holes)],
                  ...(selected.carts_requested > 0 ? [["Carts", String(selected.carts_requested)]] : []),
                  ...(selected.buggies_requested > 0 ? [["Buggies", String(selected.buggies_requested)]] : []),
                  ...(selected.clubs_requested > 0 ? [["Clubs", String(selected.clubs_requested)]] : []),
                  ...(selected.personal_cart_drop ? [["Personal cart drop", "Yes"]] : []),
                  ...(selected.notes ? [["Notes", selected.notes]] : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex gap-2 flex-wrap">
              {!selected.checked_in && selected.status !== "cancelled" && (
                <button
                  onClick={() => handleCheckIn(selected)}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? "…" : "Check In"}
                </button>
              )}
              {selected.status !== "cancelled" && (
                <button
                  onClick={() => handleCancel(selected)}
                  disabled={saving}
                  className="flex-1 py-2 px-4 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
