"use client";

import { useState, useEffect } from "react";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberSpendRow {
  id: number;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  status: string;
  credit_limit: number | null;
  personal_spend: number;
  balance_due: number;
  corporate_spend: number;
  charge_count: number;
}

interface ContactSpendRow {
  id: number;
  first_name: string;
  last_name: string;
  zip: string | null;
  email: string | null;
  total_spend: number;
  balance_due: number;
  charge_count: number;
  visit_count: number;
  membership_id: number | null;
}

interface CorporateEventRow {
  id: number;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  charge_count: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  member_count: number;
}

interface CreditRow {
  id: number;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  credit_limit: number;
  balance_used: number;
}

type ReportType = "member_spend" | "contact_spend" | "corporate_events" | "credit_utilization";

const TABS: { key: ReportType; label: string }[] = [
  { key: "member_spend",       label: "Member Spend" },
  { key: "contact_spend",      label: "Walk-in / Contact Spend" },
  { key: "corporate_events",   label: "Corporate Events" },
  { key: "credit_utilization", label: "Credit Accounts" },
];

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportType>("member_spend");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const [memberRows, setMemberRows] = useState<MemberSpendRow[]>([]);
  const [contactRows, setContactRows] = useState<ContactSpendRow[]>([]);
  const [eventRows, setEventRows] = useState<CorporateEventRow[]>([]);
  const [creditRows, setCreditRows] = useState<CreditRow[]>([]);

  useEffect(() => { fetchReport(); }, [tab, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReport() {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const res = await fetch(`/api/admin/reports?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (tab === "member_spend") setMemberRows(data);
      else if (tab === "contact_spend") setContactRows(data);
      else if (tab === "corporate_events") setEventRows(data);
      else setCreditRows(data);
    }
    setLoading(false);
  }

  const DateFilters = () => (
    <div className="flex gap-3 items-center">
      <div>
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input type="date" className="input-field py-1.5 text-sm" value={start}
          onChange={(e) => setStart(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input type="date" className="input-field py-1.5 text-sm" value={end}
          onChange={(e) => setEnd(e.target.value)} />
      </div>
      {(start || end) && (
        <button onClick={() => { setStart(""); setEnd(""); }} className="text-xs text-gray-400 hover:text-gray-600 mt-4">
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title mb-6">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === key ? "bg-white shadow text-swan-green" : "text-gray-600 hover:text-gray-900"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Date filters (not for credit utilization) */}
      {tab !== "credit_utilization" && (
        <div className="mb-6">
          <DateFilters />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : tab === "member_spend" ? (
        <MemberSpendTable rows={memberRows} />
      ) : tab === "contact_spend" ? (
        <ContactSpendTable rows={contactRows} />
      ) : tab === "corporate_events" ? (
        <CorporateEventsTable rows={eventRows} />
      ) : (
        <CreditTable rows={creditRows} />
      )}
    </div>
  );
}

// ── Sub-tables ────────────────────────────────────────────────────────────────

function MemberSpendTable({ rows }: { rows: MemberSpendRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.personal_spend), 0);
  const balanceDue = rows.reduce((s, r) => s + Number(r.balance_due), 0);

  if (rows.length === 0) return <EmptyState text="No member charge data for this period." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Members" value={rows.length.toString()} />
        <StatCard label="Personal Spend" value={fmt(total)} />
        <StatCard label="Outstanding Balance" value={fmt(balanceDue)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow text-sm">
          <thead className="bg-swan-green text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Member</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-center font-medium">Charges</th>
              <th className="px-4 py-3 text-right font-medium">Personal Spend</th>
              <th className="px-4 py-3 text-right font-medium">Corp. Event</th>
              <th className="px-4 py-3 text-right font-medium">Balance Due</th>
              <th className="px-4 py-3 text-center font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const tier = MEMBERSHIP_TYPES[r.membership_type as MembershipType];
              const creditPct = r.credit_limit && r.credit_limit > 0
                ? Math.min(100, (Number(r.balance_due) / r.credit_limit) * 100) : null;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-gray-400">{r.member_number} · {r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tier?.name ?? r.membership_type}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{r.charge_count}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(r.personal_spend)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {Number(r.corporate_spend) > 0 ? fmt(r.corporate_spend) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(r.balance_due) > 0 ? "text-amber-700" : "text-gray-400"}`}>
                    {Number(r.balance_due) > 0 ? fmt(r.balance_due) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.credit_limit != null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${creditPct! >= 90 ? "bg-red-500" : creditPct! >= 70 ? "bg-amber-400" : "bg-green-400"}`}
                            style={{ width: `${creditPct ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {fmt(r.balance_due)} / {fmt(r.credit_limit)}
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContactSpendTable({ rows }: { rows: ContactSpendRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.total_spend), 0);
  if (rows.length === 0) return <EmptyState text="No contact records yet. Walk-in contacts are created at the desk." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Contacts" value={rows.length.toString()} />
        <StatCard label="Total Spend" value={fmt(total)} />
        <StatCard label="Total Visits" value={rows.reduce((s, r) => s + Number(r.visit_count), 0).toString()} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl shadow text-sm">
          <thead className="bg-swan-green text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Zip</th>
              <th className="px-4 py-3 text-center font-medium">Visits</th>
              <th className="px-4 py-3 text-center font-medium">Charges</th>
              <th className="px-4 py-3 text-right font-medium">Total Spend</th>
              <th className="px-4 py-3 text-right font-medium">Balance Due</th>
              <th className="px-4 py-3 text-center font-medium">Member?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.first_name} {r.last_name}</p>
                  {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500">{r.zip ?? "—"}</td>
                <td className="px-4 py-3 text-center text-gray-500">{r.visit_count}</td>
                <td className="px-4 py-3 text-center text-gray-500">{r.charge_count}</td>
                <td className="px-4 py-3 text-right font-medium">{Number(r.total_spend) > 0 ? fmt(r.total_spend) : "—"}</td>
                <td className={`px-4 py-3 text-right ${Number(r.balance_due) > 0 ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                  {Number(r.balance_due) > 0 ? fmt(r.balance_due) : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.membership_id ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Yes</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CorporateEventsTable({ rows }: { rows: CorporateEventRow[] }) {
  if (rows.length === 0) return <EmptyState text="No corporate events yet. Mark an event as Corporate in Admin → Events." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-xl shadow text-sm">
        <thead className="bg-swan-green text-white">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Event</th>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-center font-medium">Members</th>
            <th className="px-4 py-3 text-center font-medium">Charges</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Paid</th>
            <th className="px-4 py-3 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {fmtDate(r.event_date)}
                {r.start_time && <div className="text-xs text-gray-400">{r.start_time}{r.end_time ? ` – ${r.end_time}` : ""}</div>}
              </td>
              <td className="px-4 py-3 text-center text-gray-500">{r.member_count}</td>
              <td className="px-4 py-3 text-center text-gray-500">{r.charge_count}</td>
              <td className="px-4 py-3 text-right font-medium">{fmt(r.total_amount)}</td>
              <td className="px-4 py-3 text-right text-green-700">{fmt(r.paid_amount)}</td>
              <td className={`px-4 py-3 text-right font-medium ${Number(r.outstanding_amount) > 0 ? "text-amber-700" : "text-gray-400"}`}>
                {Number(r.outstanding_amount) > 0 ? fmt(r.outstanding_amount) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreditTable({ rows }: { rows: CreditRow[] }) {
  if (rows.length === 0) return <EmptyState text="No credit accounts configured. Set a Credit Limit on a member from Admin → Billing or Admin → Memberships." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-xl shadow text-sm">
        <thead className="bg-swan-green text-white">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Member</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Credit Limit</th>
            <th className="px-4 py-3 text-right font-medium">Balance Used</th>
            <th className="px-4 py-3 text-right font-medium">Available</th>
            <th className="px-4 py-3 text-center font-medium">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const used = Number(r.balance_used);
            const limit = Number(r.credit_limit);
            const available = limit - used;
            const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
            return (
              <tr key={r.id} className={`hover:bg-gray-50 ${pct >= 90 ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-gray-400">{r.member_number} · {r.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {MEMBERSHIP_TYPES[r.membership_type as MembershipType]?.name ?? r.membership_type}
                </td>
                <td className="px-4 py-3 text-right">{fmt(limit)}</td>
                <td className={`px-4 py-3 text-right font-medium ${used > 0 ? "text-amber-700" : "text-gray-400"}`}>
                  {used > 0 ? fmt(used) : "—"}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${available < 0 ? "text-red-600" : "text-green-700"}`}>
                  {fmt(available)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl font-bold text-swan-green">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card text-center py-12">
      <p className="text-gray-500">{text}</p>
    </div>
  );
}
