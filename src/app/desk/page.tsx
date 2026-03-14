"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface TeeTimeGroup {
  id: number;
  group_booking_id: string | null;
  time: string;
  player_name: string;
  player_email: string;
  player_phone: string | null;
  players: number;
  holes: number;
  carts_requested: number;
  buggies_requested: number;
  clubs_requested: number;
  personal_cart_drop: number;
  notes: string | null;
  checked_in: number;
  checked_in_at: string | null;
  slot_count: number;
}

interface CheckIn {
  id: number;
  type: string;
  name: string;
  email: string | null;
  players: number;
  holes: number;
  checked_in_at: string;
}

interface Stats {
  totalReservations: number;
  checkedIn: number;
  walkIns: number;
  memberCheckIns: number;
}

interface MemberResult {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  status: string;
  nfc_token: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(time: string) {
  const [h, m] = time.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function fmtCheckinTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function DeskPage() {
  const [now, setNow] = useState(new Date());
  const [groups, setGroups] = useState<TeeTimeGroup[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [stats, setStats] = useState<Stats>({ totalReservations: 0, checkedIn: 0, walkIns: 0, memberCheckIns: 0 });
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"nfc" | "search" | "walkin">("nfc");
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // NFC state
  const [nfcMode, setNfcMode] = useState(false);
  const [nfcResult, setNfcResult] = useState<{ member?: MemberResult; error?: string } | null>(null);
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const nfcBuffer = useRef("");
  const nfcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nfcAbort = useRef<AbortController | null>(null);

  // Member search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Walk-in form state
  const [walkIn, setWalkIn] = useState({
    name: "", email: "", players: "2", holes: "18",
    carts: "0", buggies: "0", clubs: "0", personal_cart_drop: false, notes: "",
  });
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh data
  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/desk/today");
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.teeTimeGroups ?? []);
      setRecentCheckIns(data.recentCheckIns ?? []);
      setStats(data.stats ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
    const interval = setInterval(fetchToday, 30_000);
    return () => clearInterval(interval);
  }, [fetchToday]);

  // Flash toast
  function flash(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Tee time check-in toggle ──────────────────────────────────────────────
  async function toggleCheckin(group: TeeTimeGroup) {
    const res = await fetch(`/api/desk/tee-times/${group.id}`, { method: "PUT" });
    if (res.ok) {
      const { checked_in } = await res.json();
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, checked_in } : g));
      flash(`${group.player_name} ${checked_in ? "checked in" : "check-in undone"}`);
      if (checked_in) {
        // Also log a checkin record linked to this reservation
        await fetch("/api/desk/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tee_time",
            name: group.player_name,
            email: group.player_email,
            players: group.players,
            holes: group.holes,
            tee_time_id: group.id,
          }),
        });
        fetchToday();
      }
    }
  }

  // ── NFC ───────────────────────────────────────────────────────────────────
  async function lookupNfcToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/desk/nfc/${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (res.ok) {
      setNfcResult({ member: data });
    } else {
      setNfcResult({ error: data.error ?? "Unknown token" });
    }
  }

  // HID keyboard emulation capture
  function handleNfcKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (nfcTimer.current) clearTimeout(nfcTimer.current);
      const token = nfcBuffer.current;
      nfcBuffer.current = "";
      lookupNfcToken(token);
      return;
    }
    if (e.key.length === 1) {
      nfcBuffer.current += e.key;
      if (nfcTimer.current) clearTimeout(nfcTimer.current);
      nfcTimer.current = setTimeout(() => {
        const token = nfcBuffer.current;
        nfcBuffer.current = "";
        if (token) lookupNfcToken(token);
      }, 300);
    }
    // Prevent the character from appearing in the visible input value
    e.preventDefault();
  }

  async function startWebNfc() {
    if (!("NDEFReader" in window)) {
      flash("Web NFC is not supported in this browser. Use a physical NFC reader instead.", false);
      return;
    }
    nfcAbort.current = new AbortController();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: nfcAbort.current.signal });
      ndef.onreading = (event: { message: { records: { recordType: string; data: ArrayBuffer; encoding?: string }[] } }) => {
        const decoder = new TextDecoder();
        for (const record of event.message.records) {
          if (record.recordType === "text") {
            lookupNfcToken(decoder.decode(record.data));
            break;
          }
        }
      };
      flash("Web NFC scanning active — tap a member card", true);
    } catch {
      flash("Could not start Web NFC scan.", false);
    }
  }

  function stopWebNfc() {
    nfcAbort.current?.abort();
    nfcAbort.current = null;
  }

  function enterNfcMode() {
    setNfcMode(true);
    setNfcResult(null);
    nfcBuffer.current = "";
    setTimeout(() => nfcInputRef.current?.focus(), 50);
  }

  function exitNfcMode() {
    setNfcMode(false);
    setNfcResult(null);
    stopWebNfc();
  }

  async function checkInNfcMember() {
    if (!nfcResult?.member) return;
    const m = nfcResult.member;
    const res = await fetch("/api/desk/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "nfc",
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        players: 1,
        holes: 18,
        membership_id: m.id,
      }),
    });
    if (res.ok) {
      flash(`${m.first_name} ${m.last_name} checked in via NFC`);
      setNfcResult(null);
      fetchToday();
    }
  }

  // ── Member search ─────────────────────────────────────────────────────────
  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/desk/member?q=${encodeURIComponent(q)}`);
      setSearchResults(res.ok ? await res.json() : []);
      setSearchLoading(false);
    }, 200);
  }

  async function checkInMember(m: MemberResult) {
    const res = await fetch("/api/desk/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "member",
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        players: 1,
        holes: 18,
        membership_id: m.id,
      }),
    });
    if (res.ok) {
      flash(`${m.first_name} ${m.last_name} checked in`);
      setSearchQuery("");
      setSearchResults([]);
      fetchToday();
    }
  }

  // ── Walk-in ───────────────────────────────────────────────────────────────
  async function handleWalkIn(e: React.FormEvent) {
    e.preventDefault();
    setWalkInSubmitting(true);
    const res = await fetch("/api/desk/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "walk_in",
        name: walkIn.name,
        email: walkIn.email || null,
        players: parseInt(walkIn.players),
        holes: parseInt(walkIn.holes),
        carts_requested: parseInt(walkIn.carts),
        buggies_requested: parseInt(walkIn.buggies),
        clubs_requested: parseInt(walkIn.clubs),
        personal_cart_drop: walkIn.personal_cart_drop ? 1 : 0,
        notes: walkIn.notes || null,
      }),
    });
    setWalkInSubmitting(false);
    if (res.ok) {
      flash(`${walkIn.name} checked in as walk-in`);
      setWalkIn({ name: "", email: "", players: "2", holes: "18", carts: "0", buggies: "0", clubs: "0", personal_cart_drop: false, notes: "" });
      fetchToday();
    } else {
      flash("Check-in failed", false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

  const PANEL_TABS = [
    { id: "nfc" as const, label: "NFC" },
    { id: "search" as const, label: "Member Search" },
    { id: "walkin" as const, label: "Walk-In" },
  ];

  function EquipmentTags({ g }: { g: TeeTimeGroup }) {
    const tags = [];
    if (g.carts_requested) tags.push(`${g.carts_requested} cart${g.carts_requested > 1 ? "s" : ""}`);
    if (g.buggies_requested) tags.push(`${g.buggies_requested} buggy${g.buggies_requested > 1 ? "s" : ""}`);
    if (g.clubs_requested) tags.push(`${g.clubs_requested} clubs`);
    if (g.personal_cart_drop) tags.push("personal cart");
    if (!tags.length) return null;
    return (
      <span className="text-slate-400 text-xs">· {tags.join(", ")}</span>
    );
  }

  return (
    <div className="flex flex-col h-full text-white select-none">
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-heading font-bold text-lg text-white">Swan Lake CC — Desk</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-white">{stats.totalReservations}</p>
              <p className="text-xs text-slate-400">Reservations</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{stats.checkedIn}</p>
              <p className="text-xs text-slate-400">Checked In</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-400">{stats.walkIns}</p>
              <p className="text-xs text-slate-400">Walk-Ins</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">{stats.memberCheckIns}</p>
              <p className="text-xs text-slate-400">Members</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">{todayStr}</p>
            <p className="text-lg font-bold font-mono tabular-nums">{timeStr}</p>
          </div>
          <a href="/" className="text-slate-400 hover:text-white text-xs border border-slate-600 rounded px-2 py-1">
            ← Exit
          </a>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: tee time schedule */}
        <div className="w-[42%] border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Today&apos;s Tee Times
            </h2>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {loading ? (
              <p className="text-slate-500 text-center py-12">Loading…</p>
            ) : groups.length === 0 ? (
              <p className="text-slate-500 text-center py-12 text-sm">No reservations today</p>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleCheckin(g)}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-700/50 transition-colors active:scale-[0.99] ${
                    g.checked_in
                      ? "bg-green-900/30 hover:bg-green-900/50"
                      : "hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        g.checked_in ? "bg-green-500 text-white" : "bg-slate-700 text-slate-300"
                      }`}>
                        {g.checked_in ? "✓" : fmtTime(g.time).split(" ")[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">{g.player_name}</span>
                          {g.checked_in && (
                            <span className="text-xs text-green-400 shrink-0">
                              {g.checked_in_at ? fmtCheckinTime(g.checked_in_at) : "checked in"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>{fmtTime(g.time)}</span>
                          <span>·</span>
                          <span>{g.players}p</span>
                          <span>·</span>
                          <span>{g.holes}h</span>
                          {g.slot_count > 1 && <span>· {g.slot_count} slots</span>}
                          <EquipmentTags g={g} />
                        </div>
                      </div>
                    </div>
                    <div className={`shrink-0 text-xs px-2 py-1 rounded font-medium ${
                      g.checked_in ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-400"
                    }`}>
                      {g.checked_in ? "In" : "Tap to check in"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: check-in panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800 shrink-0">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setPanel(tab.id); if (tab.id !== "nfc") exitNfcMode(); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  panel === tab.id
                    ? "text-white border-b-2 border-green-400 bg-slate-700/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── NFC Panel ────────────────────────────────────────────── */}
            {panel === "nfc" && (
              <div className="p-5 h-full flex flex-col">
                {/* Hidden input always captures HID reader keystrokes when nfcMode is active */}
                <input
                  ref={nfcInputRef}
                  className="opacity-0 w-0 h-0 absolute"
                  onKeyDown={handleNfcKeyDown}
                  onBlur={() => { if (nfcMode) setTimeout(() => nfcInputRef.current?.focus(), 50); }}
                  readOnly
                  tabIndex={-1}
                  aria-hidden
                />

                {!nfcMode && !nfcResult && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="text-slate-500 text-center">
                      <svg className="h-20 w-20 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-semibold text-slate-300 mb-1">NFC Member Check-In</p>
                      <p className="text-sm text-slate-500">Tap the button below, then present a member card</p>
                    </div>
                    <button
                      onClick={enterNfcMode}
                      className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xl px-10 py-5 rounded-2xl shadow-lg transition-colors"
                    >
                      Start NFC Scan
                    </button>
                    <button
                      onClick={startWebNfc}
                      className="text-slate-400 hover:text-white text-sm border border-slate-600 rounded-lg px-4 py-2"
                    >
                      Start Web NFC (Chrome / Android)
                    </button>
                  </div>
                )}

                {nfcMode && !nfcResult && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="w-40 h-40 rounded-full border-4 border-green-500 border-dashed flex items-center justify-center animate-pulse">
                      <svg className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white mb-1">Waiting for card…</p>
                      <p className="text-slate-400 text-sm">Present NFC card or badge to the reader</p>
                    </div>
                    <button onClick={exitNfcMode} className="text-slate-400 hover:text-white text-sm border border-slate-600 rounded-lg px-4 py-2">
                      Cancel
                    </button>
                  </div>
                )}

                {nfcResult?.error && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-red-900/40 flex items-center justify-center">
                      <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white mb-1">Not recognised</p>
                      <p className="text-red-400 text-sm">{nfcResult.error}</p>
                    </div>
                    <button onClick={() => { setNfcResult(null); enterNfcMode(); }}
                      className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-6 py-3 font-semibold">
                      Try Again
                    </button>
                    <button onClick={exitNfcMode} className="text-slate-400 hover:text-white text-sm">Cancel</button>
                  </div>
                )}

                {nfcResult?.member && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-green-900/50 flex items-center justify-center">
                      <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white mb-1">
                        {nfcResult.member.first_name} {nfcResult.member.last_name}
                      </p>
                      <p className="text-slate-400 text-sm">{nfcResult.member.email}</p>
                      <p className="text-green-400 text-sm mt-1">
                        {MEMBERSHIP_TYPES[nfcResult.member.membership_type as MembershipType]?.name ?? nfcResult.member.membership_type} · Active
                      </p>
                    </div>
                    <button
                      onClick={checkInNfcMember}
                      className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xl px-10 py-5 rounded-2xl shadow-lg transition-colors"
                    >
                      Confirm Check-In
                    </button>
                    <button onClick={() => { setNfcResult(null); enterNfcMode(); }}
                      className="text-slate-400 hover:text-white text-sm">
                      Scan Another
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Member Search Panel ───────────────────────────────── */}
            {panel === "search" && (
              <div className="p-5">
                <div className="relative mb-4">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    autoComplete="off"
                    placeholder="Search member name or email…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-12 pr-4 py-4 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                  {searchLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => checkInMember(m)}
                        className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-xl px-4 py-4 transition-colors text-left"
                      >
                        <div>
                          <p className="font-bold text-white text-lg">
                            {m.first_name} {m.last_name}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {m.email} · {MEMBERSHIP_TYPES[m.membership_type as MembershipType]?.name ?? m.membership_type}
                          </p>
                        </div>
                        <div className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 ml-3">
                          Check In
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No active members found for &ldquo;{searchQuery}&rdquo;</p>
                )}

                {searchQuery.length === 0 && (
                  <p className="text-slate-600 text-center py-12 text-sm">Type at least 2 characters to search</p>
                )}
              </div>
            )}

            {/* ── Walk-In Panel ─────────────────────────────────────── */}
            {panel === "walkin" && (
              <form onSubmit={handleWalkIn} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Guest name"
                      value={walkIn.name}
                      onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="optional"
                      value={walkIn.email}
                      onChange={(e) => setWalkIn({ ...walkIn, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Players</label>
                    <select value={walkIn.players} onChange={(e) => setWalkIn({ ...walkIn, players: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500">
                      {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Holes</label>
                    <select value={walkIn.holes} onChange={(e) => setWalkIn({ ...walkIn, holes: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500">
                      <option value="9">9</option>
                      <option value="18">18</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Carts</label>
                    <select value={walkIn.carts} onChange={(e) => setWalkIn({ ...walkIn, carts: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500">
                      {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Buggies</label>
                    <select value={walkIn.buggies} onChange={(e) => setWalkIn({ ...walkIn, buggies: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500">
                      {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Club Sets</label>
                    <select value={walkIn.clubs} onChange={(e) => setWalkIn({ ...walkIn, clubs: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500">
                      {[0,1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input type="checkbox" id="pcd" checked={walkIn.personal_cart_drop}
                      onChange={(e) => setWalkIn({ ...walkIn, personal_cart_drop: e.target.checked })}
                      className="w-5 h-5 rounded text-green-500" />
                    <label htmlFor="pcd" className="text-sm text-slate-300">Personal cart drop</label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                    <input type="text" placeholder="optional" value={walkIn.notes}
                      onChange={(e) => setWalkIn({ ...walkIn, notes: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500" />
                  </div>
                </div>
                <button type="submit" disabled={walkInSubmitting}
                  className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 text-white font-bold text-xl py-5 rounded-2xl transition-colors mt-2">
                  {walkInSubmitting ? "Checking In…" : "Log Walk-In Check-In"}
                </button>
              </form>
            )}
          </div>

          {/* Recent check-ins */}
          <div className="border-t border-slate-700 bg-slate-800/50 shrink-0" style={{ maxHeight: "220px" }}>
            <div className="px-4 py-2 border-b border-slate-700">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Check-Ins Today</h3>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "176px" }}>
              {recentCheckIns.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-4">No check-ins yet today</p>
              ) : (
                recentCheckIns.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-700/40">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      c.type === "nfc" ? "bg-purple-400" :
                      c.type === "member" ? "bg-blue-400" :
                      c.type === "tee_time" ? "bg-green-400" : "bg-slate-400"
                    }`} />
                    <span className="font-medium text-white text-sm truncate flex-1">{c.name}</span>
                    <span className="text-slate-500 text-xs">{c.players}p · {c.holes}h</span>
                    <span className="text-slate-500 text-xs shrink-0">{fmtCheckinTime(c.checked_in_at)}</span>
                    <span className="text-xs text-slate-600 capitalize shrink-0 w-14 text-right">{c.type.replace("_", "-")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full font-semibold text-white shadow-xl transition-all ${
          toast.ok ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.ok ? "✓ " : "✗ "}{toast.text}
        </div>
      )}
    </div>
  );
}
