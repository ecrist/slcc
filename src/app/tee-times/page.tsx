"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TEE_TIME_SLOTS } from "@/lib/types";
import { SkeletonSlotGrid } from "@/components/Skeleton";

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

interface Rates {
  cartMemberHalf9: number;
  cartMemberFull9: number;
  cartMemberHalf18: number;
  cartMemberFull18: number;
  cartNonmemberHalf9: number;
  cartNonmemberFull9: number;
  cartNonmemberHalf18: number;
  cartNonmemberFull18: number;
  pullCartFee: number;
  clubRental9: number;
  clubRental18: number;
  personalCartDropFee: number;
  greenFee9: number;
  greenFee18: number;
}

interface PlayerEntry {
  name: string;
  isMember: boolean;
  ridingCart: boolean;
  pullCart: boolean;
  clubRental: boolean;
  personalCartDrop: boolean;
}

function slotsNeededForPlayers(players: number): number {
  return Math.min(3, Math.ceil(Math.max(1, players) / 4));
}

function getSlotGroup(startTime: string, count: number): string[] {
  const idx = TEE_TIME_SLOTS.indexOf(startTime);
  if (idx === -1) return [];
  return TEE_TIME_SLOTS.slice(idx, idx + count);
}

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TeeTimesPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => localDateStr());
  const [players, setPlayers] = useState(2);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingHoles, setBookingHoles] = useState("18");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [playerEntries, setPlayerEntries] = useState<PlayerEntry[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);
  const [teeTimeOpen, setTeeTimeOpen] = useState<string | null>(null);
  const [teeTimeClose, setTeeTimeClose] = useState<string | null>(null);
  const [clubhouseOpen, setClubhouseOpen] = useState<string | null>(null);
  const [clubhouseClose, setClubhouseClose] = useState<string | null>(null);
  const [sunsetTimeVal, setSunsetTimeVal] = useState<string | null>(null);
  const [privateEvents, setPrivateEvents] = useState<{ start_time: string | null; end_time: string | null; title: string }[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [courseOpenState, setCourseOpenState] = useState(true);
  const [bookingDaysAhead, setBookingDaysAhead] = useState(8);
  const [autoCloseDate, setAutoCloseDate] = useState<string | null>(null);
  const [userIsMember, setUserIsMember] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    time: string; date: string; players: number; holes: string; name: string; email: string; groupId: string;
  } | null>(null);

  const slotsNeeded = slotsNeededForPlayers(players);
  const bookedTimes = new Set(bookedSlots.map((s) => s.time));

  // Lock body scroll when booking modal is open
  useEffect(() => {
    if (bookingSlot) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [bookingSlot]);

  // Resize player entries when party size or slot changes
  useEffect(() => {
    setPlayerEntries((prev) => {
      const arr = [...prev];
      while (arr.length < players) arr.push({ name: "", isMember: false, ridingCart: false, pullCart: false, clubRental: false, personalCartDrop: false });
      const sliced = arr.slice(0, players);
      // Auto-set player #1's member status if logged-in user is a member
      if (sliced.length > 0 && userIsMember) {
        sliced[0] = { ...sliced[0], isMember: true };
      }
      return sliced;
    });
  }, [players, bookingSlot, userIsMember]);

  useEffect(() => {
    if (bookingSlot) {
      const group = getSlotGroup(bookingSlot, slotsNeeded);
      const valid = group.length === slotsNeeded && group.every((t) => !bookedTimes.has(t));
      if (!valid) setBookingSlot(null);
    }
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
      setCourseOpenState(data.courseOpen !== false);
      setTeeTimeOpen(data.teeTimeOpen ?? null);
      setTeeTimeClose(data.teeTimeClose ?? null);
      setClubhouseOpen(data.clubhouseOpen ?? null);
      setClubhouseClose(data.clubhouseClose ?? null);
      setSunsetTimeVal(data.sunsetTime ?? null);
      setPrivateEvents(data.privateEvents ?? []);
      if (data.bookingDaysAhead) setBookingDaysAhead(data.bookingDaysAhead);
      setAutoCloseDate(data.autoCloseDate ?? null);
      if (data.rates) setRates(data.rates);
      setUserIsMember(data.userIsMember === true);
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

    const ridersCount = playerEntries.filter((p) => p.ridingCart).length;
    const cartsNeeded = Math.ceil(ridersCount / 2);
    const pullCartsNeeded = playerEntries.filter((p) => p.pullCart).length;
    const clubsNeeded = playerEntries.filter((p) => p.clubRental).length;
    const hasPersonalDrop = playerEntries.some((p) => p.personalCartDrop);
    const leadName = playerEntries[0]?.name || session?.user?.name || "";
    const allNames = playerEntries.map((p) => p.name).filter(Boolean).join(", ");

    try {
      const res = await fetch("/api/tee-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: bookingSlot,
          players,
          player_name: allNames || leadName,
          player_email: bookingEmail || session?.user?.email || "",
          player_phone: bookingPhone,
          holes: parseInt(bookingHoles),
          carts_requested: cartsNeeded,
          buggies_requested: pullCartsNeeded,
          clubs_requested: clubsNeeded,
          personal_cart_drop: hasPersonalDrop,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBookingConfirmation({
          time: bookingSlot,
          date: selectedDate,
          players,
          holes: bookingHoles,
          name: allNames || leadName,
          email: bookingEmail || session?.user?.email || "",
          groupId: data.group_booking_id || "",
        });
        setSubmitStatus(null);
        setBookingSlot(null);
        setBookingEmail("");
        setBookingPhone("");
        setBookingHoles("18");
        setPlayerEntries([]);
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

  function fmt12h(time: string): string {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  function privateEventBlockingSlot(time: string): string | null {
    for (const evt of privateEvents) {
      const { start_time: start, end_time: end } = evt;
      const blocked =
        !start && !end ? true
        : !start ? time <= end!
        : !end   ? time >= start
        : time >= start && time <= end;
      if (blocked) return evt.title || "Private Event";
    }
    return null;
  }

  const today = localDateStr();
  const isToday = selectedDate === today;
  const isBeyondClose = autoCloseDate ? selectedDate >= autoCloseDate : false;

  // Filter slots to the configured tee time window, and exclude past slots for today
  const nowTime = (() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  })();

  const visibleSlots = TEE_TIME_SLOTS.filter((t) => {
    if (teeTimeOpen && t < teeTimeOpen) return false;
    if (teeTimeClose && t > teeTimeClose) return false;
    if (isToday && t <= nowTime) return false;
    return true;
  });

  const dateOptions = Array.from({ length: bookingDaysAhead }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return localDateStr(d);
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

  function calculatePricing() {
    if (!rates) return null;
    const is9 = bookingHoles === "9";
    const lines: { label: string; amount: number }[] = [];

    // Green fees — members included, non-members pay
    const greenFeeRate = is9 ? rates.greenFee9 : rates.greenFee18;
    const nonMembers = playerEntries.filter((p) => !p.isMember);
    const members = playerEntries.filter((p) => p.isMember);
    if (nonMembers.length > 0) {
      lines.push({ label: `Green fee (${is9 ? "9" : "18"} holes) × ${nonMembers.length}`, amount: nonMembers.length * greenFeeRate });
    }
    if (members.length > 0) {
      lines.push({ label: `Green fee (${is9 ? "9" : "18"} holes) × ${members.length} member${members.length > 1 ? "s" : ""}`, amount: 0 });
    }

    // Cart pricing — pair riders, use half/full cart rates by member status
    const riders = playerEntries.filter((p) => p.ridingCart);
    const cartPairs: PlayerEntry[][] = [];
    for (let i = 0; i < riders.length; i += 2) {
      cartPairs.push(i + 1 < riders.length ? [riders[i], riders[i + 1]] : [riders[i]]);
    }
    for (const pair of cartPairs) {
      if (pair.length === 2) {
        // Shared cart — each rider pays half cart rate
        for (const p of pair) {
          const rate = p.isMember
            ? (is9 ? rates.cartMemberHalf9 : rates.cartMemberHalf18)
            : (is9 ? rates.cartNonmemberHalf9 : rates.cartNonmemberHalf18);
          lines.push({ label: `Half cart – ${p.isMember ? "member" : "non-member"} (${p.name || "player"})`, amount: rate });
        }
      } else {
        const p = pair[0];
        const rate = p.isMember
          ? (is9 ? rates.cartMemberFull9 : rates.cartMemberFull18)
          : (is9 ? rates.cartNonmemberFull9 : rates.cartNonmemberFull18);
        lines.push({ label: `Full cart – ${p.isMember ? "member" : "non-member"} (${p.name || "player"})`, amount: rate });
      }
    }

    // Pull carts
    const pullCount = playerEntries.filter((p) => p.pullCart).length;
    if (pullCount > 0) {
      lines.push({ label: `Pull cart rental × ${pullCount}`, amount: pullCount * rates.pullCartFee });
    }

    // Club rentals
    const clubCount = playerEntries.filter((p) => p.clubRental).length;
    if (clubCount > 0) {
      const clubRate = is9 ? rates.clubRental9 : rates.clubRental18;
      lines.push({ label: `Club rental (${is9 ? "9" : "18"} holes) × ${clubCount}`, amount: clubCount * clubRate });
    }

    // Personal cart drop
    const dropCount = playerEntries.filter((p) => p.personalCartDrop).length;
    if (dropCount > 0) {
      lines.push({ label: `Personal cart drop × ${dropCount}`, amount: dropCount * rates.personalCartDropFee });
    }

    const total = lines.reduce((s, l) => s + l.amount, 0);
    return { lines, total };
  }

  const pricing = calculatePricing();

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
      <h1 className="section-title animate-fade-in-up stagger-1">Book a Tee Time</h1>
      <p className="text-gray-600 mb-6 animate-fade-in-up stagger-1">Select your party size and date, then pick an available time.</p>

      {!courseOpenState && !loading && (
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-300 text-center">
          <svg className="h-10 w-10 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-lg font-bold text-amber-900 mb-1">Online Booking is Currently Closed</h2>
          <p className="text-amber-800 text-sm">Tee time reservations are not being accepted online right now. Please check back when the season opens or call the clubhouse for more information.</p>
        </div>
      )}

      {courseOpenState && (<>
      {/* Party Size + Date */}
      <div className="flex flex-wrap items-end gap-4 mb-4 animate-fade-in-up stagger-2">
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

      {/* Hours & equipment availability */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(clubhouseOpen || clubhouseClose) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200">
            Clubhouse Hours: {clubhouseOpen ? fmt12h(clubhouseOpen) : "—"} – {clubhouseClose ? fmt12h(clubhouseClose) : "—"}
          </div>
        )}
        {(teeTimeOpen || teeTimeClose) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-green-50 text-green-800 border-green-200">
            Tee times: {teeTimeOpen ? fmt12h(teeTimeOpen) : "—"} – {teeTimeClose ? fmt12h(teeTimeClose) : "—"}
            {sunsetTimeVal && (
              <span className="text-green-600">(sunset {fmt12h(sunsetTimeVal)})</span>
            )}
          </div>
        )}
        {equipment && (
          <>
            <AvailBadge available={equipment.cartsAvailable} total={equipment.cartTotal} label="Golf carts" />
            <AvailBadge available={equipment.buggiesAvailable} total={equipment.buggyTotal} label="Walking buggies" />
            <AvailBadge available={equipment.clubsAvailable} total={equipment.clubsTotal} label="Club rentals" />
          </>
        )}
      </div>

      <div className="animate-fade-in-up stagger-3">
        {/* Time Slots */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold">Available Times — {formatDateDisplay(selectedDate)}</h2>
            {slotsNeeded > 1 && (
              <span className="text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full">
                Party of {players} reserves {slotsNeeded} consecutive slots
              </span>
            )}
          </div>

          {loading ? (
            <SkeletonSlotGrid />
          ) : isBeyondClose || visibleSlots.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="h-10 w-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-gray-700 mb-1">No tee times available</p>
              <p className="text-sm">
                {isToday
                  ? "All tee times have passed for today. Select another date above."
                  : isBeyondClose
                  ? "Online bookings are not available for this date."
                  : "No time slots are available for this date."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visibleSlots.map((time) => {
                const isBooked = bookedTimes.has(time);
                const privateBlock = privateEventBlockingSlot(time);
                const group = getSlotGroup(time, slotsNeeded);
                const isUnavailable =
                  isBooked ||
                  !!privateBlock ||
                  group.length < slotsNeeded ||
                  group.some((t) => bookedTimes.has(t) || !!privateEventBlockingSlot(t));
                const isSelectedStart = bookingSlot === time;
                const isInSelectedGroup = !isSelectedStart && selectedGroup.includes(time);

                let className = "p-3 rounded-lg text-center font-medium transition-all text-sm ";
                if (privateBlock) {
                  className += "bg-purple-50 text-purple-400 cursor-not-allowed";
                } else if (isUnavailable) {
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
                    title={privateBlock ? `Unavailable: ${privateBlock}` : undefined}
                  >
                    {formatTime(time)}
                    {privateBlock && <span className="block text-xs mt-0.5">Private Event</span>}
                    {!privateBlock && isBooked && <span className="block text-xs mt-0.5">Booked</span>}
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
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-purple-50 border border-purple-200 inline-block" />
              Private event
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

      </div>

      {/* Booking Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={() => setBookingSlot(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-modal-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-swan-green">
                    {slotsNeeded > 1
                      ? `${formatTime(selectedGroup[0])} – ${formatTime(selectedGroup[selectedGroup.length - 1])}`
                      : `Book ${formatTime(bookingSlot)}`}
                  </h2>
                  <p className="text-gray-500 text-sm">{formatDateDisplay(selectedDate)} · {players} player{players > 1 ? "s" : ""}</p>
                  {slotsNeeded > 1 && (
                    <p className="text-amber-700 text-xs mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                      {slotsNeeded} consecutive slots reserved
                    </p>
                  )}
                </div>
                <button onClick={() => setBookingSlot(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!session && (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
                  <a href="/login" className="text-swan-green font-medium hover:underline">Sign in</a>
                  {" "}to pre-fill your details, or continue as a guest below.
                </p>
              )}

              <form onSubmit={handleBook} className="space-y-4">
                {/* Holes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holes</label>
                  <select className="input-field w-40" value={bookingHoles}
                    onChange={(e) => setBookingHoles(e.target.value)}>
                    <option value="9">9 Holes</option>
                    <option value="18">18 Holes</option>
                  </select>
                </div>

                {/* Per-player entries */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  {playerEntries.map((p, i) => {
                    const isFirst = i === 0;
                    const memberLocked = isFirst && userIsMember;
                    const updatePlayer = (patch: Partial<PlayerEntry>) => {
                      // Don't allow unlocking member status for logged-in member on player #1
                      if (memberLocked && "isMember" in patch) return;
                      setPlayerEntries((prev) => prev.map((pe, idx) => idx === i ? { ...pe, ...patch } : pe));
                    };
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder={isFirst ? (session?.user?.name ?? "Your name") : "Player name"}
                            className="input-field flex-1 text-sm"
                            value={p.name !== "" ? p.name : (isFirst ? (session?.user?.name ?? "") : "")}
                            onChange={(e) => updatePlayer({ name: e.target.value })}
                          />
                          <label className={`flex items-center gap-1.5 shrink-0 ${memberLocked ? "opacity-60" : "cursor-pointer"}`}>
                            <input
                              type="checkbox"
                              checked={p.isMember}
                              disabled={memberLocked}
                              onChange={(e) => updatePlayer({ isMember: e.target.checked })}
                              className="w-3.5 h-3.5 text-swan-green rounded"
                            />
                            <span className="text-xs text-gray-600">Member</span>
                          </label>
                        </div>
                        {/* Email & phone for player #1 only */}
                        {isFirst && (
                          <div className="ml-8 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Email *</label>
                              <input
                                type="email"
                                required
                                className="input-field text-sm"
                                value={bookingEmail !== "" ? bookingEmail : (session?.user?.email ?? "")}
                                onChange={(e) => setBookingEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Phone</label>
                              <input type="tel" className="input-field text-sm" value={bookingPhone}
                                onChange={(e) => setBookingPhone(e.target.value)} />
                            </div>
                          </div>
                        )}
                        <div className="ml-8 flex flex-wrap gap-x-4 gap-y-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={p.ridingCart}
                              onChange={(e) => updatePlayer({ ridingCart: e.target.checked })}
                              className="w-3.5 h-3.5 text-swan-green rounded" />
                            <span className="text-xs text-gray-600">Riding Cart</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={p.pullCart}
                              onChange={(e) => updatePlayer({ pullCart: e.target.checked })}
                              className="w-3.5 h-3.5 text-swan-green rounded" />
                            <span className="text-xs text-gray-600">Pull Cart</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={p.clubRental}
                              onChange={(e) => updatePlayer({ clubRental: e.target.checked })}
                              className="w-3.5 h-3.5 text-swan-green rounded" />
                            <span className="text-xs text-gray-600">Club Rental</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={p.personalCartDrop}
                              onChange={(e) => updatePlayer({ personalCartDrop: e.target.checked })}
                              className="w-3.5 h-3.5 text-swan-green rounded" />
                            <span className="text-xs text-gray-600">Personal Cart Drop</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing summary — always visible */}
                {pricing && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border-t border-gray-100">
                    {pricing.lines.map((line, i) => (
                      <div key={i} className="flex justify-between text-gray-600">
                        <span>{line.label}</span>
                        <span>{line.amount === 0 ? "Included" : `$${line.amount.toFixed(2)}`}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                      <span>Estimated total</span>
                      <span>${pricing.total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Fees collected at the clubhouse on arrival.</p>
                  </div>
                )}

                {submitStatus && (
                  <div className={`p-3 rounded-lg text-sm ${submitStatus.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"}`}>
                    {submitStatus.message}
                  </div>
                )}

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      </>)}

      {/* Booking Confirmation Modal */}
      {bookingConfirmation && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={() => setBookingConfirmation(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-modal-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-swan-green mb-1">Tee Time Confirmed!</h2>
              <p className="text-gray-500 text-sm mb-6">
                {bookingConfirmation.email && `A confirmation email has been sent to ${bookingConfirmation.email}.`}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold">{new Date(bookingConfirmation.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold">{formatTime(bookingConfirmation.time)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Players</span>
                  <span className="font-semibold">{bookingConfirmation.players}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Holes</span>
                  <span className="font-semibold">{bookingConfirmation.holes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-semibold">{bookingConfirmation.name}</span>
                </div>
              </div>
              <button
                onClick={() => setBookingConfirmation(null)}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
