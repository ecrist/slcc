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

// Module-scoped cache so React StrictMode's double-invoked effects don't
// consume the sessionStorage value on the first run and then overwrite
// state with "today" on the second run.
type PendingBooking = { date?: string; slot?: string };
let pendingBookingCache: PendingBooking | null | undefined = undefined;

function readPendingBookingOnce(): PendingBooking | null {
  if (pendingBookingCache !== undefined) return pendingBookingCache;
  if (typeof window === "undefined") {
    pendingBookingCache = null;
    return null;
  }
  try {
    const raw = sessionStorage.getItem("pendingBooking");
    if (raw) {
      const parsed = JSON.parse(raw) as PendingBooking;
      sessionStorage.removeItem("pendingBooking");
      pendingBookingCache = parsed;
      return parsed;
    }
  } catch { /* ignore */ }
  pendingBookingCache = null;
  return null;
}

export default function TeeTimesPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState("");
  const [players, setPlayers] = useState(2);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [requireLoginForBooking, setRequireLoginForBooking] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  // Only surface missing-name warnings after the user tries to submit.
  const [showNameErrors, setShowNameErrors] = useState(false);
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
      // Reset missing-name warnings when the modal closes
      setShowNameErrors(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [bookingSlot]);

  // Once the user fills in the missing names, dismiss the warning state.
  useEffect(() => {
    if (showNameErrors && playerEntries.every((p) => p.name.trim())) {
      setShowNameErrors(false);
    }
  }, [showNameErrors, playerEntries]);

  // Resize player entries when party size or slot changes
  useEffect(() => {
    setPlayerEntries((prev) => {
      const arr = [...prev];
      while (arr.length < players) arr.push({ name: "", isMember: false, ridingCart: false, pullCart: false, clubRental: false, personalCartDrop: false });
      const sliced = arr.slice(0, players);
      // If the signed-in user is a verified member, force player #1 to Member
      // so they can't accidentally/fraudulently book as Guest. If they're not a
      // verified member, leave the toggle free — they may still self-identify.
      if (sliced.length > 0 && userIsMember) {
        sliced[0] = { ...sliced[0], isMember: true };
      }
      // Pre-fill player #1's name from the session so the missing-name
      // validator matches what the user actually sees in the input.
      const sessionName = session?.user?.name?.trim();
      if (sliced.length > 0 && !sliced[0].name.trim() && sessionName) {
        sliced[0] = { ...sliced[0], name: sessionName };
      }
      return sliced;
    });
  }, [players, bookingSlot, userIsMember, session?.user?.name]);

  // Note: we intentionally do NOT auto-close the modal when party size grows
  // past the current slot group — instead the modal shows a warning so the
  // user can either reduce the party or close and pick another time.

  // Set initial date on mount (client-only to avoid hydration mismatch).
  // If the user was bounced to /login by the sign-in gate, we stashed
  // { date, slot } in sessionStorage — restore it here so we re-open the
  // booking modal on the exact tee time they originally clicked. We also
  // accept ?date= / ?slot= query params as a fallback (shareable links).
  useEffect(() => {
    let initialDate = localDateStr();
    let initialSlot: string | null = null;

    // 1) sessionStorage (set by the slot-click handler before /login redirect).
    //    Cached at module scope so StrictMode's double-invoked effect doesn't
    //    eat the value on the first run and lose it on the second.
    const pending = readPendingBookingOnce();
    if (pending) {
      if (pending.date && /^\d{4}-\d{2}-\d{2}$/.test(pending.date)) initialDate = pending.date;
      if (pending.slot && /^\d{2}:\d{2}$/.test(pending.slot)) initialSlot = pending.slot;
    }

    // 2) URL param fallback (shareable links)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("date");
      const s = params.get("slot");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) initialDate = d;
      if (s && /^\d{2}:\d{2}$/.test(s)) initialSlot = s;
      if (d || s) {
        const url = new URL(window.location.href);
        url.searchParams.delete("date");
        url.searchParams.delete("slot");
        window.history.replaceState({}, "", url.toString());
      }
    }

    setSelectedDate(initialDate);
    if (initialSlot) setPendingSlot(initialSlot);
  }, []);

  useEffect(() => {
    if (!selectedDate) return; // skip until client-side date is set
    fetchData();
    setBookingSlot(null);
  }, [selectedDate]);

  // After data loads, if we have a pending slot (e.g. user just returned from
  // /login), open the booking modal on it — but only if the slot is still
  // available and the login gate is satisfied.
  useEffect(() => {
    if (loading) return;
    if (!pendingSlot) return;
    if (requireLoginForBooking && !session) return; // still gated
    const privateBlock = privateEvents.some((evt) => {
      const start = evt.start_time, end = evt.end_time;
      if (!start && !end) return true;
      if (!start) return pendingSlot <= end!;
      if (!end) return pendingSlot >= start;
      return pendingSlot >= start && pendingSlot <= end;
    });
    const isBooked = bookedSlots.some((s) => s.time === pendingSlot);
    if (!isBooked && !privateBlock) {
      setBookingSlot(pendingSlot);
    }
    setPendingSlot(null);
  }, [loading, pendingSlot, session, requireLoginForBooking, bookedSlots, privateEvents]);

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
      setRequireLoginForBooking(data.requireLoginForBooking === true);
    } catch {
      console.error("Failed to fetch tee times");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingSlot) return;
    // Require a name for every player
    if (playerEntries.some((p) => !p.name.trim())) {
      setShowNameErrors(true);
      return;
    }
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

  const today = selectedDate ? localDateStr() : "";
  const isToday = selectedDate !== "" && selectedDate === today;
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

  const dateOptions = selectedDate ? Array.from({ length: bookingDaysAhead }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return localDateStr(d);
  }) : [];

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

  // Validate whether an arbitrary party size would fit when starting from
  // the given slot — used both for the current selection and for predicting
  // whether the +/- stepper is allowed to add another player.
  function validateGroup(
    startTime: string,
    partySize: number,
  ): { valid: boolean; reason?: string; conflictTime?: string } {
    const count = slotsNeededForPlayers(partySize);
    const group = getSlotGroup(startTime, count);
    if (group.length < count) {
      return { valid: false, reason: "Not enough remaining tee slots later in the day." };
    }
    for (const t of group) {
      if (t === startTime) continue; // the selected start is always OK
      if (bookedTimes.has(t)) {
        return { valid: false, reason: `The next slot at ${formatTime(t)} is already booked.`, conflictTime: t };
      }
      const pb = privateEventBlockingSlot(t);
      if (pb) {
        return { valid: false, reason: `The next slot at ${formatTime(t)} is blocked by ${pb}.`, conflictTime: t };
      }
      if (teeTimeClose && t > teeTimeClose) {
        return { valid: false, reason: `The next slot at ${formatTime(t)} is past the tee time window.`, conflictTime: t };
      }
    }
    return { valid: true };
  }

  const groupValidity = bookingSlot ? validateGroup(bookingSlot, players) : null;
  const canAddPlayer = !!bookingSlot && players < 12 && validateGroup(bookingSlot, players + 1).valid;
  const addPlayerBlockedReason = !!bookingSlot && players < 12 && !canAddPlayer
    ? validateGroup(bookingSlot, players + 1).reason
    : undefined;

  // Which 1-based player positions are missing a name (used for banner + submit guard)
  const missingNamePositions = playerEntries
    .map((p, i) => (p.name.trim() ? null : i + 1))
    .filter((n): n is number => n !== null);
  const hasMissingNames = missingNamePositions.length > 0;

  // Walk visibleSlots from the current booking slot in the given direction
  // and return the first slot that fits the current party size and isn't
  // itself booked / privately blocked.
  function findNearestValidSlot(direction: 1 | -1): string | null {
    if (!bookingSlot) return null;
    const currentIdx = visibleSlots.indexOf(bookingSlot);
    if (currentIdx === -1) return null;
    for (let i = currentIdx + direction; i >= 0 && i < visibleSlots.length; i += direction) {
      const candidate = visibleSlots[i];
      if (bookedTimes.has(candidate)) continue;
      if (privateEventBlockingSlot(candidate)) continue;
      if (validateGroup(candidate, players).valid) return candidate;
    }
    return null;
  }
  const prevAvailableSlot = findNearestValidSlot(-1);
  const nextAvailableSlot = findNearestValidSlot(1);

  function calculatePricing() {
    if (!rates) return null;
    const is9 = bookingHoles === "9";
    const greenFeeRate = is9 ? rates.greenFee9 : rates.greenFee18;

    type PlayerLine = { label: string; amount: number; included?: boolean };
    type PlayerBill = { name: string; isMember: boolean; lines: PlayerLine[]; subtotal: number };

    // Pair riders by their index so cart costs can be attributed per-player.
    // Solo rider in a pair -> "half cart" (single rider) rate.
    // Two riders sharing -> each pays their own full-cart rate / 2.
    const riderIndices = playerEntries
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.ridingCart)
      .map(({ idx }) => idx);

    const cartByPlayer = new Map<number, PlayerLine>();
    for (let k = 0; k < riderIndices.length; k += 2) {
      const aIdx = riderIndices[k];
      const bIdx = riderIndices[k + 1];
      if (bIdx !== undefined) {
        for (const idx of [aIdx, bIdx]) {
          const p = playerEntries[idx];
          const fullRate = p.isMember
            ? (is9 ? rates.cartMemberFull9 : rates.cartMemberFull18)
            : (is9 ? rates.cartNonmemberFull9 : rates.cartNonmemberFull18);
          cartByPlayer.set(idx, { label: `Shared cart (${is9 ? "9" : "18"} holes)`, amount: fullRate / 2 });
        }
      } else {
        const p = playerEntries[aIdx];
        const rate = p.isMember
          ? (is9 ? rates.cartMemberHalf9 : rates.cartMemberHalf18)
          : (is9 ? rates.cartNonmemberHalf9 : rates.cartNonmemberHalf18);
        cartByPlayer.set(aIdx, { label: `Solo cart (${is9 ? "9" : "18"} holes)`, amount: rate });
      }
    }

    const playersBill: PlayerBill[] = playerEntries.map((p, idx) => {
      const lines: PlayerLine[] = [];
      // Green fee
      lines.push(
        p.isMember
          ? { label: `Green fee (${is9 ? "9" : "18"} holes)`, amount: 0, included: true }
          : { label: `Green fee (${is9 ? "9" : "18"} holes)`, amount: greenFeeRate },
      );
      if (cartByPlayer.has(idx)) lines.push(cartByPlayer.get(idx)!);
      if (p.pullCart) lines.push({ label: "Pull cart rental", amount: rates.pullCartFee });
      if (p.clubRental) {
        lines.push({
          label: `Club rental (${is9 ? "9" : "18"} holes)`,
          amount: is9 ? rates.clubRental9 : rates.clubRental18,
        });
      }
      if (p.personalCartDrop) lines.push({ label: "Personal cart drop", amount: rates.personalCartDropFee });

      const subtotal = lines.reduce((s, l) => s + l.amount, 0);
      return {
        name: p.name.trim() || `Player ${idx + 1}`,
        isMember: p.isMember,
        lines,
        subtotal,
      };
    });

    const total = playersBill.reduce((s, p) => s + p.subtotal, 0);
    return { players: playersBill, total };
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
                    onClick={() => {
                      if (requireLoginForBooking && !session) {
                        // Stash target date+slot in sessionStorage so it
                        // survives the OAuth round-trip (URL callback params
                        // can get mangled through the provider redirect).
                        try {
                          sessionStorage.setItem(
                            "pendingBooking",
                            JSON.stringify({ date: selectedDate, slot: time }),
                          );
                        } catch { /* ignore storage errors */ }
                        const next = encodeURIComponent("/tee-times");
                        window.location.href = `/login?callbackUrl=${next}`;
                        return;
                      }
                      setBookingSlot(isSelectedStart ? null : time);
                    }}
                    className={className}
                    title={
                      privateBlock
                        ? `Unavailable: ${privateBlock}`
                        : requireLoginForBooking && !session
                        ? "Sign in required to book"
                        : undefined
                    }
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
          <div className="absolute inset-0 bg-black/50 animate-overlay-in" onClick={() => setBookingSlot(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 h-[88vh] max-h-[760px] overflow-hidden flex flex-col animate-modal-in">
            {/* Hero header — condensed */}
            <div className="bg-swan-green text-white px-5 pt-3 pb-4 relative">
              <button
                onClick={() => setBookingSlot(null)}
                className="absolute top-3 right-3 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Date line (above time) */}
              <p className="inline-flex items-center gap-1.5 text-swan-gold text-[11px] font-semibold uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateDisplay(selectedDate)}
              </p>
              {/* Time + players + holes — centered with even gaps */}
              <div className="flex items-center justify-center gap-5 mt-2">
                {/* Time with prev/next arrows */}
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => prevAvailableSlot && setBookingSlot(prevAvailableSlot)}
                    disabled={!prevAvailableSlot}
                    aria-label="Previous available tee time"
                    title={
                      prevAvailableSlot
                        ? `Previous available for ${players} player${players > 1 ? "s" : ""}: ${formatTime(prevAvailableSlot)}`
                        : `No earlier time fits ${players} player${players > 1 ? "s" : ""}`
                    }
                    className="w-7 h-7 shrink-0 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-25 disabled:hover:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-bold leading-none tabular-nums">
                    {slotsNeeded > 1
                      ? `${formatTime(selectedGroup[0])}–${formatTime(selectedGroup[selectedGroup.length - 1])}`
                      : formatTime(bookingSlot)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => nextAvailableSlot && setBookingSlot(nextAvailableSlot)}
                    disabled={!nextAvailableSlot}
                    aria-label="Next available tee time"
                    title={
                      nextAvailableSlot
                        ? `Next available for ${players} player${players > 1 ? "s" : ""}: ${formatTime(nextAvailableSlot)}`
                        : `No later time fits ${players} player${players > 1 ? "s" : ""}`
                    }
                    className="w-7 h-7 shrink-0 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-25 disabled:hover:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                {/* Player stepper */}
                <div className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <div className="inline-flex items-center justify-between bg-white/10 rounded-full border border-white/20 p-0.5 h-7 w-[82px]">
                    <button
                      type="button"
                      onClick={() => setPlayers(Math.max(1, players - 1))}
                      disabled={players <= 1}
                      aria-label="Remove a player"
                      className="w-6 h-6 rounded-full hover:bg-white/25 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="tabular-nums text-sm font-semibold text-center flex-1">{players}</span>
                    <button
                      type="button"
                      onClick={() => { if (canAddPlayer) setPlayers(players + 1); }}
                      disabled={!canAddPlayer}
                      aria-label="Add a player"
                      title={
                        players >= 12
                          ? "Maximum 12 players"
                          : !canAddPlayer
                          ? `Can't add another player — ${addPlayerBlockedReason ?? "next tee slot isn't available."} Pick a different start time to fit a larger party.`
                          : "Add a player"
                      }
                      className="w-6 h-6 rounded-full hover:bg-white/25 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Holes toggle */}
                <div className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V3m0 0h11l-3 3 3 3H5M3 21h8" />
                  </svg>
                  <div
                    role="radiogroup"
                    aria-label="Round length"
                    className="inline-flex items-center bg-white/10 rounded-full border border-white/20 p-0.5 h-7 w-[82px]"
                  >
                    {["9", "18"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        role="radio"
                        aria-checked={bookingHoles === h}
                        onClick={() => setBookingHoles(h)}
                        className={`flex-1 h-6 rounded-full text-xs font-semibold transition-colors flex items-center justify-center ${
                          bookingHoles === h
                            ? "bg-white text-swan-green shadow-sm"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {slotsNeeded > 1 && groupValidity?.valid && (
                <p className="text-xs mt-2 bg-white/10 border border-white/20 rounded-md px-2 py-1 inline-block">
                  {slotsNeeded} consecutive slots reserved
                </p>
              )}
              {bookingSlot && !canAddPlayer && players < 12 && (
                <p className="text-[11px] mt-2 text-white/75 leading-snug">
                  Max {players} for this tee time — {addPlayerBlockedReason?.toLowerCase() ?? "next slot isn't available."} Pick a different start time for a larger party.
                </p>
              )}
            </div>

            {/* Fixed banners (above scroll area) */}
            {(groupValidity && !groupValidity.valid) || !session ? (
              <div className="px-6 pt-4 shrink-0 space-y-2">
                {groupValidity && !groupValidity.valid && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94L2.697 17.117A1.875 1.875 0 004.317 20h15.366a1.875 1.875 0 001.62-2.883L13.66 3.94a1.875 1.875 0 00-3.32 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold mb-0.5">Can't fit {players} player{players > 1 ? "s" : ""} in this tee time</p>
                      <p className="text-xs leading-relaxed">
                        A party of {players} needs {slotsNeeded} consecutive slots. {groupValidity.reason} Reduce your party size or close this and pick a different start time.
                      </p>
                    </div>
                  </div>
                )}
                {!session && (
                  <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <a href="/login" className="text-swan-green font-semibold hover:underline">Sign in</a>
                    {" "}to pre-fill your details, or continue as a guest below.
                  </p>
                )}
              </div>
            ) : null}

            {/* Thin divider between hero and scrolling players */}
            <div className="px-6 pt-3 pb-2 shrink-0 flex items-center justify-between border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                Players
              </p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                {playerEntries.length} total
              </p>
            </div>

            {/* Scrollable players area — ONLY this scrolls */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <form id="booking-form" noValidate onSubmit={handleBook}>
                <div>
                  <div className="space-y-2">
                    {playerEntries.map((p, i) => {
                      const isFirst = i === 0;
                      // Only lock player #1's toggle when we've positively verified
                      // them as a member (prevents unlocking the member rate).
                      // Logged-in non-members can still toggle (e.g. if their
                      // membership email differs from their login email).
                      const memberLocked = isFirst && userIsMember;
                      const updatePlayer = (patch: Partial<PlayerEntry>) => {
                        if (memberLocked && "isMember" in patch) return;
                        setPlayerEntries((prev) => prev.map((pe, idx) => idx === i ? { ...pe, ...patch } : pe));
                      };

                      const EquipChip = ({
                        label, full, active, onToggle,
                      }: { label: string; full: string; active: boolean; onToggle: () => void }) => (
                        <button
                          type="button"
                          onClick={onToggle}
                          aria-pressed={active}
                          aria-label={full}
                          title={full}
                          className={`px-2 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                            active
                              ? "bg-swan-green text-white border-swan-green shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-swan-green hover:text-swan-green"
                          }`}
                        >
                          {label}
                        </button>
                      );

                      return (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
                          <div className="px-3 py-2.5 space-y-2">
                            {/* Header row: avatar + name + member badge */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-swan-green/10 text-swan-green font-bold text-xs flex items-center justify-center shrink-0">
                                {i + 1}
                              </div>
                              <input
                                type="text"
                                required
                                aria-invalid={showNameErrors && !p.name.trim() ? true : undefined}
                                placeholder={isFirst ? (session?.user?.name ?? "Your name") : `Player ${i + 1} name`}
                                className={`input-field flex-1 text-sm ${
                                  showNameErrors && !p.name.trim() ? "border-amber-400 focus:border-amber-500 focus:ring-amber-200" : ""
                                }`}
                                value={p.name !== "" ? p.name : (isFirst ? (session?.user?.name ?? "") : "")}
                                onChange={(e) => updatePlayer({ name: e.target.value })}
                              />
                              <div
                                role="radiogroup"
                                aria-label="Member status"
                                title={
                                  memberLocked
                                    ? (p.isMember
                                        ? "Verified from your member account"
                                        : "Your account is not a current member")
                                    : undefined
                                }
                                className={`shrink-0 inline-flex rounded-full border p-0.5 text-xs font-semibold ${
                                  memberLocked ? "bg-gray-100 border-gray-200 opacity-90" : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={!p.isMember}
                                  disabled={memberLocked}
                                  onClick={() => updatePlayer({ isMember: false })}
                                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                                    !p.isMember
                                      ? "bg-swan-gold/25 text-swan-dark shadow-sm border border-swan-gold"
                                      : "text-gray-500 hover:text-gray-700"
                                  } ${memberLocked ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  Guest
                                </button>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={p.isMember}
                                  disabled={memberLocked}
                                  onClick={() => updatePlayer({ isMember: true })}
                                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                                    p.isMember
                                      ? "bg-swan-gold/25 text-swan-dark shadow-sm border border-swan-gold"
                                      : "text-gray-500 hover:text-gray-700"
                                  } ${memberLocked ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  Member
                                </button>
                              </div>
                            </div>

                            {/* Email & phone for player #1 only — compact single row */}
                            {isFirst && (
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="email"
                                  required
                                  placeholder="Email *"
                                  className="input-field text-sm"
                                  value={bookingEmail !== "" ? bookingEmail : (session?.user?.email ?? "")}
                                  onChange={(e) => setBookingEmail(e.target.value)}
                                />
                                <input
                                  type="tel"
                                  placeholder="Phone (optional)"
                                  className="input-field text-sm"
                                  value={bookingPhone}
                                  onChange={(e) => setBookingPhone(e.target.value)}
                                />
                              </div>
                            )}

                            {/* Equipment chips — 2×2 on mobile, 4 across on desktop.
                                Golf Cart / Pull Cart / Cart Drop are mutually exclusive
                                (a player uses only one transport option). Club Rental
                                is independent. */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              <EquipChip
                                label="Golf Cart"
                                full="Golf Cart (riding)"
                                active={p.ridingCart}
                                onToggle={() => updatePlayer(
                                  p.ridingCart
                                    ? { ridingCart: false }
                                    : { ridingCart: true, pullCart: false, personalCartDrop: false },
                                )}
                              />
                              <EquipChip
                                label="Pull Cart"
                                full="Pull Cart"
                                active={p.pullCart}
                                onToggle={() => updatePlayer(
                                  p.pullCart
                                    ? { pullCart: false }
                                    : { pullCart: true, ridingCart: false, personalCartDrop: false },
                                )}
                              />
                              <EquipChip
                                label="Cart Drop"
                                full="Personal Cart Drop"
                                active={p.personalCartDrop}
                                onToggle={() => updatePlayer(
                                  p.personalCartDrop
                                    ? { personalCartDrop: false }
                                    : { personalCartDrop: true, ridingCart: false, pullCart: false },
                                )}
                              />
                              <EquipChip
                                label="Club Rental"
                                full="Club Rental"
                                active={p.clubRental}
                                onToggle={() => updatePlayer({ clubRental: !p.clubRental })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            {/* Fixed footer with pricing + submit */}
            <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-3 space-y-2 shrink-0">
              {submitStatus && (
                <div className={`p-2.5 rounded-lg text-xs ${submitStatus.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"}`}>
                  {submitStatus.message}
                </div>
              )}
              {pricing && (
                <div className="text-sm space-y-2 h-24 overflow-y-auto pr-1">
                  {pricing.players.map((pl, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 truncate pr-2">
                          {pl.name}
                          {pl.isMember && (
                            <span className="ml-1.5 text-[10px] normal-case tracking-normal text-swan-green font-bold">MEMBER</span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-gray-900 font-semibold">${pl.subtotal.toFixed(2)}</span>
                      </div>
                      {pl.lines.map((l, j) => (
                        <div key={j} className="flex justify-between text-xs text-gray-500 pl-3">
                          <span className="truncate pr-2">{l.label}</span>
                          <span className="shrink-0 tabular-nums">
                            {l.included ? (
                              <span className="text-swan-green font-medium">Included</span>
                            ) : (
                              `$${l.amount.toFixed(2)}`
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {pricing && (
                <div className="flex justify-between items-baseline border-t border-gray-200 pt-2">
                  <span className="text-sm font-semibold text-gray-700">Estimated total</span>
                  <span className="text-xl font-bold text-swan-green tabular-nums">${pricing.total.toFixed(2)}</span>
                </div>
              )}
              {pricing && (
                <p className="text-[11px] text-gray-400 text-right">Fees collected at the clubhouse on arrival.</p>
              )}
              <button
                type="submit"
                form="booking-form"
                disabled={submitting || !groupValidity?.valid || (requireLoginForBooking && !session)}
                className={`w-full text-base py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-colors disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed ${
                  showNameErrors && hasMissingNames
                    ? "bg-swan-gold text-swan-dark hover:bg-swan-gold/90"
                    : "btn-primary"
                }`}
              >
                {submitting
                  ? "Booking…"
                  : requireLoginForBooking && !session
                  ? "Sign in required"
                  : !groupValidity?.valid
                  ? "Party doesn't fit this time"
                  : showNameErrors && hasMissingNames
                  ? missingNamePositions.length === 1
                    ? "Add player name to continue"
                    : "Add player names to continue"
                  : "Confirm Booking"}
              </button>
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
