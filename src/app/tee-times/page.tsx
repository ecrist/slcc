"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TEE_TIME_SLOTS } from "@/lib/types";

interface BookedSlot {
  time: string;
  players: number;
  player_name: string;
  group_booking_id: string | null;
  slot_index: number;
}

interface Equipment {
  cartTotal: number;
  cartsBooked: number;
  cartsAvailable: number;
  buggyTotal: number;
  buggiesBooked: number;
  buggiesAvailable: number;
  clubsTotal: number;
  clubsBooked: number;
  clubsAvailable: number;
  cartFeePerNine: number;
  buggyFee: number;
  clubsFee: number;
  personalCartDropFee: number;
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [players, setPlayers] = useState(2);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [form, setForm] = useState({
    player_name: "",
    player_email: "",
    player_phone: "",
    holes: "18",
    carts: 0,
    buggies: 0,
    clubs: 0,
    personal_cart_drop: false,
    notes: "",
  });
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const slotsNeeded = slotsNeededForPlayers(players);
  const bookedTimes = new Set(bookedSlots.map((s) => s.time));

  // When inventory is tracked (total > 0), cap by available units; otherwise cap by party size only
  const maxCarts = equipment
    ? (equipment.cartTotal > 0 ? Math.min(equipment.cartsAvailable, Math.ceil(players / 2)) : Math.ceil(players / 2))
    : Math.ceil(players / 2);
  const maxBuggies = equipment
    ? (equipment.buggyTotal > 0 ? Math.min(equipment.buggiesAvailable, players) : players)
    : players;
  const maxClubs = equipment
    ? (equipment.clubsTotal > 0 ? Math.min(equipment.clubsAvailable, players) : players)
    : players;

  useEffect(() => {
    if (bookingSlot) {
      const group = getSlotGroup(bookingSlot, slotsNeeded);
      const valid = group.length === slotsNeeded && group.every((t) => !bookedTimes.has(t));
      if (!valid) setBookingSlot(null);
    }
    setForm((f) => ({
      ...f,
      carts: Math.min(f.carts, Math.ceil(players / 2)),
      buggies: Math.min(f.buggies, players),
      clubs: Math.min(f.clubs, players),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsNeeded, players]);

  useEffect(() => {
    fetchData();
    setBookingSlot(null);
  }, [selectedDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tee-times?date=${selectedDate}`);
      const data = await res.json();
      setBookedSlots(data.bookedSlots ?? []);
      setEquipment(data.equipment ?? null);
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
          players,
          player_name: form.player_name || session?.user?.name || "",
          player_email: form.player_email || session?.user?.email || "",
          player_phone: form.player_phone,
          holes: parseInt(form.holes),
          notes: form.notes,
          carts_requested: form.carts,
          buggies_requested: form.buggies,
          clubs_requested: form.clubs,
          personal_cart_drop: form.personal_cart_drop,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitStatus({ type: "success", message: data.message });
        setBookingSlot(null);
        setForm({ player_name: "", player_email: "", player_phone: "", holes: "18", carts: 0, buggies: 0, clubs: 0, personal_cart_drop: false, notes: "" });
        fetchData();
      } else {
        const err = await res.json();
        setSubmitStatus({ type: "error", message: err.error || "Failed to book tee time" });
        fetchData();
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

  function estimatedCost() {
    if (!equipment) return null;
    const holes = parseInt(form.holes);
    const nines = holes / 9;
    const cartCost = form.carts * equipment.cartFeePerNine * nines;
    const buggyCost = form.buggies * equipment.buggyFee;
    const clubsCost = form.clubs * equipment.clubsFee;
    const personalDropCost = form.personal_cart_drop ? equipment.personalCartDropFee : 0;
    const total = cartCost + buggyCost + clubsCost + personalDropCost;
    if (total === 0) return null;
    return { cartCost, buggyCost, clubsCost, personalDropCost, total };
  }

  const cost = estimatedCost();

  function AvailBadge({ available, total, label }: { available: number; total: number; label: string }) {
    if (total === 0) return null;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${available > 0 ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
        {available > 0 ? `${label}: ${available} of ${total} available` : `${label}: none available`}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Book a Tee Time</h1>
      <p className="text-gray-600 mb-6">Select your party size and date, then pick an available time.</p>

      {submitStatus && (
        <div className={`mb-6 p-4 rounded-lg ${submitStatus.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {submitStatus.message}
        </div>
      )}

      {/* Party Size + Date */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
          <select
            className="input-field w-48"
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
              const slots = slotsNeededForPlayers(n);
              return (
                <option key={n} value={n}>
                  {n} player{n > 1 ? "s" : ""}
                  {slots > 1 ? ` (${slots} slots)` : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dateOptions.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
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
      </div>

      {/* Equipment availability */}
      {equipment && (
        <div className="flex flex-wrap gap-2 mb-6">
          <AvailBadge available={equipment.cartsAvailable} total={equipment.cartTotal} label="Golf carts" />
          <AvailBadge available={equipment.buggiesAvailable} total={equipment.buggyTotal} label="Walking buggies" />
          <AvailBadge available={equipment.clubsAvailable} total={equipment.clubsTotal} label="Club rentals" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time Slots */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold">Available Times — {formatDateDisplay(selectedDate)}</h2>
            {slotsNeeded > 1 && (
              <span className="text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full">
                Party of {players} reserves {slotsNeeded} consecutive slots
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
                const isUnavailable =
                  isBooked ||
                  group.length < slotsNeeded ||
                  group.some((t) => bookedTimes.has(t));
                const isSelectedStart = bookingSlot === time;
                const isInSelectedGroup = !isSelectedStart && selectedGroup.includes(time);

                let className = "p-3 rounded-lg text-center font-medium transition-all text-sm ";
                if (isUnavailable) {
                  className += "bg-gray-100 text-gray-400 cursor-not-allowed";
                  if (isBooked) className += " line-through";
                } else if (isSelectedStart) {
                  className += "bg-swan-gold text-swan-dark ring-2 ring-swan-gold";
                } else if (isInSelectedGroup) {
                  className += "bg-amber-50 border-2 border-amber-300 text-amber-800";
                } else {
                  className += "bg-white border border-gray-200 text-gray-700 hover:border-swan-green hover:text-swan-green";
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
                    {isInSelectedGroup && <span className="block text-xs mt-0.5">Also reserved</span>}
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

        {/* Right Panel */}
        <div>
          {!bookingSlot ? (
            <div className="card text-center text-gray-500 py-12">
              <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="mb-2">Select an available time slot to book</p>
              {slotsNeeded > 1 && (
                <p className="text-xs text-amber-700">
                  Your party of {players} will reserve {slotsNeeded} consecutive slots
                </p>
              )}
            </div>
          ) : (
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-1">
                {slotsNeeded > 1
                  ? `${formatTime(selectedGroup[0])} – ${formatTime(selectedGroup[selectedGroup.length - 1])}`
                  : `Book ${formatTime(bookingSlot)}`}
              </h2>
              <p className="text-gray-500 text-sm mb-1">{formatDateDisplay(selectedDate)}</p>
              {slotsNeeded > 1 && (
                <p className="text-amber-700 text-xs mb-3 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {slotsNeeded} consecutive slots reserved for your party of {players}
                </p>
              )}

              {/* Soft sign-in nudge for guests — not a gate */}
              {!session && (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                  <a href="/login" className="text-swan-green font-medium hover:underline">Sign in</a>
                  {" "}to pre-fill your details, or continue as a guest below.
                </p>
              )}

              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={form.player_name !== "" ? form.player_name : (session?.user?.name ?? "")}
                    onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={form.player_email !== "" ? form.player_email : (session?.user?.email ?? "")}
                    onChange={(e) => setForm({ ...form, player_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" className="input-field" value={form.player_phone}
                    onChange={(e) => setForm({ ...form, player_phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holes</label>
                  <select className="input-field" value={form.holes}
                    onChange={(e) => setForm({ ...form, holes: e.target.value })}>
                    <option value="9">9 Holes</option>
                    <option value="18">18 Holes</option>
                  </select>
                </div>

                {/* Equipment — always shown once fees are loaded */}
                {equipment && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Equipment (optional)</p>

                    {/* Golf carts */}
                    <div>
                      <label className="text-sm text-gray-700 block mb-1">
                        Golf cart rental
                        <span className="ml-1 text-gray-400 text-xs">
                          ${equipment.cartFeePerNine}/9 holes
                          {equipment.cartTotal > 0 && ` · ${equipment.cartsAvailable} of ${equipment.cartTotal} available`}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          className="input-field w-20"
                          value={form.carts}
                          disabled={equipment.cartTotal > 0 && equipment.cartsAvailable === 0}
                          onChange={(e) => setForm({ ...form, carts: parseInt(e.target.value) })}
                        >
                          {Array.from({ length: maxCarts + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-500">cart{form.carts !== 1 ? "s" : ""} (1 per 2 players)</span>
                      </div>
                      {equipment.cartTotal > 0 && equipment.cartsAvailable === 0 && (
                        <p className="text-xs text-red-600 mt-1">No carts available this day</p>
                      )}
                    </div>

                    {/* Walking buggies */}
                    <div>
                      <label className="text-sm text-gray-700 block mb-1">
                        Walking buggy (push/pull)
                        <span className="ml-1 text-gray-400 text-xs">
                          ${equipment.buggyFee}
                          {equipment.buggyTotal > 0 && ` · ${equipment.buggiesAvailable} of ${equipment.buggyTotal} available`}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          className="input-field w-20"
                          value={form.buggies}
                          disabled={equipment.buggyTotal > 0 && equipment.buggiesAvailable === 0}
                          onChange={(e) => setForm({ ...form, buggies: parseInt(e.target.value) })}
                        >
                          {Array.from({ length: maxBuggies + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-500">buggy/buggies</span>
                      </div>
                      {equipment.buggyTotal > 0 && equipment.buggiesAvailable === 0 && (
                        <p className="text-xs text-red-600 mt-1">No buggies available this day</p>
                      )}
                    </div>

                    {/* Club rentals */}
                    <div>
                      <label className="text-sm text-gray-700 block mb-1">
                        Club rental (full set)
                        <span className="ml-1 text-gray-400 text-xs">
                          ${equipment.clubsFee}/set
                          {equipment.clubsTotal > 0 && ` · ${equipment.clubsAvailable} of ${equipment.clubsTotal} available`}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          className="input-field w-20"
                          value={form.clubs}
                          disabled={equipment.clubsTotal > 0 && equipment.clubsAvailable === 0}
                          onChange={(e) => setForm({ ...form, clubs: parseInt(e.target.value) })}
                        >
                          {Array.from({ length: maxClubs + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-500">set{form.clubs !== 1 ? "s" : ""}</span>
                      </div>
                      {equipment.clubsTotal > 0 && equipment.clubsAvailable === 0 && (
                        <p className="text-xs text-red-600 mt-1">No club sets available this day</p>
                      )}
                    </div>

                    {/* Personal cart drop fee */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.personal_cart_drop}
                        onChange={(e) => setForm({ ...form, personal_cart_drop: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-swan-green rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Personal cart drop — ${equipment.personalCartDropFee} for the day
                        <span className="block text-xs text-gray-400">
                          Bring your own golf cart onto the course
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {/* Cost summary */}
                {cost && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {cost.cartCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{form.carts} cart{form.carts > 1 ? "s" : ""} × ${equipment?.cartFeePerNine}/9 holes × {form.holes === "9" ? 1 : 2} nines</span>
                        <span>${cost.cartCost.toFixed(2)}</span>
                      </div>
                    )}
                    {cost.buggyCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{form.buggies} buggy{form.buggies > 1 ? "s" : ""}</span>
                        <span>${cost.buggyCost.toFixed(2)}</span>
                      </div>
                    )}
                    {cost.clubsCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{form.clubs} club set{form.clubs > 1 ? "s" : ""}</span>
                        <span>${cost.clubsCost.toFixed(2)}</span>
                      </div>
                    )}
                    {cost.personalDropCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Personal cart drop</span>
                        <span>${cost.personalDropCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                      <span>Equipment total</span>
                      <span>${cost.total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Green fees paid at the course. Equipment fees collected on arrival.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea className="input-field" rows={2} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
