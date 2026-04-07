"use client";

import { useState, useEffect } from "react";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";

interface Membership {
  id: number;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  amount_paid: number | null;
  payment_status: string;
  status: string;
  end_date: string;
  created_at: string;
}

interface RenewalMembership extends Membership {
  auto_renew: number;
  square_card_id: string | null;
}

export default function BillingPage() {
  const [tab, setTab] = useState<"pending" | "renewals">("pending");
  const [pending, setPending] = useState<Membership[]>([]);
  const [renewals, setRenewals] = useState<RenewalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [renewProcessing, setRenewProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [memRes, renewRes] = await Promise.all([
        fetch("/api/memberships"),
        fetch("/api/admin/billing/renew"),
      ]);
      if (memRes.ok) {
        const all: Membership[] = await memRes.json();
        setPending(all.filter((m) => m.payment_status === "pending"));
      }
      if (renewRes.ok) setRenewals(await renewRes.json());
    } finally {
      setLoading(false);
    }
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function markPaid(m: Membership) {
    setProcessing(m.id);
    const res = await fetch("/api/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, payment_status: "paid", status: "active" }),
    });
    setProcessing(null);
    if (res.ok) { flash("success", `${m.first_name} ${m.last_name} marked as paid.`); fetchAll(); }
    else flash("error", "Failed to update.");
  }

  function toggleAll() {
    if (selected.size === renewals.length) setSelected(new Set());
    else setSelected(new Set(renewals.map((m) => m.id)));
  }

  async function processRenewals(sendReminders: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Process ${ids.length} membership(s)?`)) return;
    setRenewProcessing(true);
    const res = await fetch("/api/admin/billing/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, send_reminders: sendReminders }),
    });
    setRenewProcessing(false);
    if (res.ok) {
      const data = await res.json();
      const charged = data.results.filter((r: { status: string }) => r.status === "charged").length;
      const reminded = data.results.filter((r: { status: string }) => r.status === "reminded").length;
      const skipped = data.results.filter((r: { status: string }) => r.status === "skipped").length;
      flash("success", `Done: ${charged} charged, ${reminded} reminded, ${skipped} skipped.`);
      setSelected(new Set());
      fetchAll();
    } else {
      flash("error", "Processing failed.");
    }
  }

  const autoRenewCount = renewals.filter((m) => m.auto_renew && m.square_card_id).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Billing</h1>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "pending" ? "bg-white shadow text-swan-green" : "text-gray-600 hover:text-gray-900"}`}
        >
          Pending Payments {pending.length > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>}
        </button>
        <button
          onClick={() => setTab("renewals")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "renewals" ? "bg-white shadow text-swan-green" : "text-gray-600 hover:text-gray-900"}`}
        >
          Renewals Due {renewals.length > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{renewals.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : tab === "pending" ? (
        <>
          {pending.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No pending payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow text-sm">
                <thead className="bg-swan-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Membership</th>
                    <th className="px-4 py-3 text-center font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Signed Up</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map((m) => {
                    const tier = MEMBERSHIP_TYPES[m.membership_type as MembershipType];
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.member_number}</p>
                        </td>
                        <td className="px-4 py-3">{tier?.name ?? m.membership_type}</td>
                        <td className="px-4 py-3 text-center font-medium">${tier?.price.toLocaleString() ?? "—"}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => markPaid(m)}
                            disabled={processing === m.id}
                            className="px-3 py-1.5 bg-swan-green text-white rounded-lg text-xs font-medium hover:bg-swan-green-dark disabled:opacity-50"
                          >
                            {processing === m.id ? "…" : "Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-amber-600">{renewals.length}</div>
              <div className="text-sm text-gray-500">Due / Expiring Soon</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-swan-green">{autoRenewCount}</div>
              <div className="text-sm text-gray-500">Auto-Renewal Ready</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-gray-500">{renewals.length - autoRenewCount}</div>
              <div className="text-sm text-gray-500">Need Manual Renewal</div>
            </div>
          </div>

          {renewals.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No memberships expiring within 30 days.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 mb-4 flex-wrap items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.size === renewals.length} onChange={toggleAll} />
                  Select all ({renewals.length})
                </label>
                {selected.size > 0 && (
                  <>
                    <button onClick={() => processRenewals(false)} disabled={renewProcessing} className="btn-primary text-sm py-1.5 px-4">
                      {renewProcessing ? "Processing…" : `Charge Selected (${selected.size})`}
                    </button>
                    <button onClick={() => processRenewals(true)} disabled={renewProcessing} className="text-sm py-1.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                      Send Renewal Reminders
                    </button>
                  </>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-xl shadow text-sm">
                  <thead className="bg-swan-green text-white">
                    <tr>
                      <th className="px-4 py-3 w-10" />
                      <th className="px-4 py-3 text-left font-medium">Member</th>
                      <th className="px-4 py-3 text-left font-medium">Membership</th>
                      <th className="px-4 py-3 text-left font-medium">Expires</th>
                      <th className="px-4 py-3 text-center font-medium">Amount</th>
                      <th className="px-4 py-3 text-center font-medium">Auto-Renew</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {renewals.map((m) => {
                      const tier = MEMBERSHIP_TYPES[m.membership_type as MembershipType];
                      const isAutoReady = m.auto_renew === 1 && !!m.square_card_id;
                      const isExpired = m.end_date < new Date().toISOString().split("T")[0];
                      return (
                        <tr key={m.id} className={`hover:bg-gray-50 ${selected.has(m.id) ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={selected.has(m.id)} onChange={(e) => {
                              const next = new Set(selected);
                              e.target.checked ? next.add(m.id) : next.delete(m.id);
                              setSelected(next);
                            }} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{m.first_name} {m.last_name}</p>
                            <p className="text-xs text-gray-400">{m.email}</p>
                            <p className="text-xs text-gray-400 font-mono">{m.member_number}</p>
                          </td>
                          <td className="px-4 py-3">{tier?.name ?? m.membership_type}</td>
                          <td className="px-4 py-3">
                            <span className={isExpired ? "text-red-600 font-medium" : "text-amber-600"}>{m.end_date}</span>
                            {isExpired && <span className="ml-1 text-xs text-red-500">(expired)</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-medium">${tier?.price.toLocaleString() ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {isAutoReady ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Card on file</span>
                            ) : m.auto_renew ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No card</span>
                            ) : (
                              <span className="text-gray-300 text-xs">Off</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                "Charge Selected" will auto-charge members with a card on file. Members without a saved card will be skipped (or reminded if using "Send Renewal Reminders").
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
