"use client";

import { useState, useEffect, useCallback } from "react";
import { SkeletonSlotGrid } from "@/components/Skeleton";
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

type ModalMode = "view" | "edit" | "add";
interface ModalState { mode: ModalMode; time: string; booking?: BookedSlot }
interface BookingForm { player_name: string; player_email: string; player_phone: string; players: string; holes: string; notes: string }
const EMPTY_FORM: BookingForm = { player_name: "", player_email: "", player_phone: "", players: "2", holes: "18", notes: "" };

function today() { return new Date().toISOString().split("T")[0]; }
function addDays(d: string, n: number) { const dt = new Date(d + "T12:00:00"); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; }
function fmtDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }

export default function TeeSheetPage() {
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tee-sheet?date=${date}`);
      if (res.ok) setSlots(await res.json());
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  }

  function openAdd(time: string) { setForm(EMPTY_FORM); setModal({ mode: "add", time }); }

  function openEdit(booking: BookedSlot) {
    setForm({
      player_name: booking.player_name,
      player_email: booking.player_email ?? "",
      player_phone: booking.player_phone ?? "",
      players: String(booking.players),
      holes: String(booking.holes),
      notes: booking.notes ?? "",
    });
    setModal({ mode: "edit", time: booking.time, booking });
  }

  async function handleAdd() {
    if (!form.player_name) return;
    setSaving(true);
    const res = await fetch("/api/tee-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time: modal!.time, ...form }),
    });
    setSaving(false);
    if (res.ok) { setModal(null); fetchSlots(); flash("success", `Booked for ${form.player_name}.`); }
    else { const d = await res.json(); flash("error", d.error || "Booking failed."); }
  }

  async function handleEdit() {
    if (!modal?.booking) return;
    setSaving(true);
    const res = await fetch(`/api/admin/tee-times?id=${modal.booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setModal(null); fetchSlots(); flash("success", "Booking updated."); }
    else flash("error", "Update failed.");
  }

  async function handleCheckIn(booking: BookedSlot) {
    setSaving(true);
    const res = await fetch(`/api/desk/tee-times/${booking.id}`, { method: "PUT" });
    setSaving(false);
    if (res.ok) { fetchSlots(); setModal(null); flash("success", `${booking.player_name} checked in.`); }
    else flash("error", "Check-in failed.");
  }

  async function handleCancel(booking: BookedSlot) {
    if (!confirm(`Cancel tee time for ${booking.player_name}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/tee-times?id=${booking.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { fetchSlots(); setModal(null); flash("success", "Booking cancelled."); }
    else flash("error", "Cancellation failed.");
  }

  const slotMap = new Map<string, BookedSlot>();
  const groupMap = new Map<string, BookedSlot[]>();
  for (const s of slots) {
    slotMap.set(s.time, s);
    if (s.group_booking_id) {
      const arr = groupMap.get(s.group_booking_id) ?? [];
      arr.push(s);
      groupMap.set(s.group_booking_id, arr);
    }
  }
  const groupFollowers = new Set<string>();
  for (const [, group] of groupMap) {
    const lead = group.find((s) => s.slot_index === 0);
    if (!lead) continue;
    group.filter((s) => s.slot_index > 0).forEach((s) => groupFollowers.add(s.time));
  }

  const bookingCount = slots.filter((s) => s.slot_index === 0 && s.status !== "cancelled").length;
  const checkedInCount = slots.filter((s) => s.slot_index === 0 && s.checked_in).length;

  const BookingFormFields = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
        <input className="input-field w-full" value={form.player_name} onChange={(e) => setForm({ ...form, player_name: e.target.value })} placeholder="Full name" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input type="email" className="input-field w-full" value={form.player_email} onChange={(e) => setForm({ ...form, player_email: e.target.value })} placeholder="email@example.com" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
        <input type="tel" className="input-field w-full" value={form.player_phone} onChange={(e) => setForm({ ...form, player_phone: e.target.value })} placeholder="(218) 555-0100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Players</label>
          <select className="input-field w-full" value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })}>
            {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Holes</label>
          <select className="input-field w-full" value={form.holes} onChange={(e) => setForm({ ...form, holes: e.target.value })}>
            <option value="9">9</option>
            <option value="18">18</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
        <input className="input-field w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="section-title mb-0">Tee Sheet</h1>
          <p className="text-gray-500 text-sm mt-1">{bookingCount} booking{bookingCount !== 1 ? "s" : ""} &bull; {checkedInCount} checked in</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDays(date, -1))} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">‹ Prev</button>
          <input type="date" className="input-field w-44 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
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

      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { color: "bg-gray-50 border-gray-200", label: "Open — click to book" },
          { color: "bg-emerald-50 border-emerald-300", label: "Booked" },
          { color: "bg-teal-100 border-teal-400", label: "Checked In" },
          { color: "bg-purple-50 border-purple-300", label: "Multi-slot group" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-4 h-4 rounded border ${color} inline-block`} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <SkeletonSlotGrid />
      ) : (
        <div className="grid gap-1">
          {TEE_TIME_SLOTS.map((time) => {
            const booking = slotMap.get(time);
            const isFollower = groupFollowers.has(time);
            const isMulti = booking?.group_booking_id && groupMap.get(booking.group_booking_id)!.length > 1;

            let colorClass = STATUS_COLORS.open;
            if (booking) {
              if (booking.status === "cancelled") colorClass = STATUS_COLORS.cancelled;
              else if (booking.checked_in) colorClass = STATUS_COLORS.checked_in;
              else if (isMulti) colorClass = "bg-purple-50 border-purple-300 text-purple-900";
              else colorClass = STATUS_COLORS.confirmed;
            }

            const isClickable = !isFollower;

            return (
              <button
                key={time}
                onClick={() => {
                  if (isFollower) return;
                  if (booking && booking.slot_index === 0) setModal({ mode: "view", time, booking });
                  else if (!booking) openAdd(time);
                }}
                className={`grid grid-cols-[4rem_1fr_auto] items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${colorClass} ${isClickable ? "hover:shadow-sm cursor-pointer" : "cursor-default"} ${isFollower ? "opacity-40" : ""}`}
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
                  <span className="text-xs italic opacity-50">— continuation of above —</span>
                ) : (
                  <span className="text-xs opacity-40">Open — tap to book</span>
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

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">
                {modal.mode === "add" ? `Book ${modal.time} — ${fmtDate(date)}` :
                 modal.mode === "edit" ? `Edit Booking — ${modal.time}` :
                 `${modal.time} — ${fmtDate(date)}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {modal.mode === "view" && modal.booking && (() => {
              const b = modal.booking;
              return (
                <>
                  <dl className="space-y-1.5 text-sm mb-5">
                    {([
                      ["Name", b.player_name],
                      ["Email", b.player_email || "—"],
                      ["Phone", b.player_phone ?? "—"],
                      ["Players", String(b.players)],
                      ["Holes", String(b.holes)],
                      ...(b.carts_requested > 0 ? [["Carts", String(b.carts_requested)]] : []),
                      ...(b.buggies_requested > 0 ? [["Buggies", String(b.buggies_requested)]] : []),
                      ...(b.clubs_requested > 0 ? [["Clubs", String(b.clubs_requested)]] : []),
                      ...(b.personal_cart_drop ? [["Personal cart drop", "Yes"]] : []),
                      ...(b.notes ? [["Notes", b.notes]] : []),
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex gap-3">
                        <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex gap-2 flex-wrap">
                    {!b.checked_in && b.status !== "cancelled" && (
                      <button onClick={() => handleCheckIn(b)} disabled={saving} className="btn-primary flex-1">
                        {saving ? "…" : "Check In"}
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button onClick={() => openEdit(b)} className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">
                        Edit
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button onClick={() => handleCancel(b)} disabled={saving} className="flex-1 py-2 px-4 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium">
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

            {(modal.mode === "add" || modal.mode === "edit") && (
              <>
                <BookingFormFields />
                <div className="flex gap-2 mt-5">
                  {modal.mode === "edit" && (
                    <button
                      onClick={() => setModal({ mode: "view", time: modal.time, booking: modal.booking })}
                      className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={modal.mode === "add" ? handleAdd : handleEdit}
                    disabled={saving || !form.player_name}
                    className="btn-primary flex-1"
                  >
                    {saving ? "Saving…" : modal.mode === "add" ? "Book Tee Time" : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
