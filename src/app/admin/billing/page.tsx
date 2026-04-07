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

interface Charge {
  id: number;
  membership_id: number | null;
  member_name: string;
  member_email: string | null;
  charge_type: string;
  description: string;
  amount: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  paid_at: string | null;
  created_at: string;
}

const CHARGE_TYPES: Record<string, string> = {
  bar_tab:      "Bar Tab",
  cart_storage: "Cart Storage",
  cart_drop:    "Cart Drop Fee",
  invoice:      "Invoice",
  other:        "Other",
};

const EMPTY_CHARGE = {
  membership_id: "",
  member_name: "",
  member_email: "",
  charge_type: "bar_tab",
  description: "",
  amount: "",
  notes: "",
};

export default function BillingPage() {
  const [tab, setTab] = useState<"charges" | "pending" | "renewals">("charges");
  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargeFilter, setChargeFilter] = useState<"open" | "all">("open");
  const [pending, setPending] = useState<Membership[]>([]);
  const [renewals, setRenewals] = useState<RenewalMembership[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeForm, setChargeForm] = useState({ ...EMPTY_CHARGE });
  const [chargeProcessing, setChargeProcessing] = useState<number | null>(null);
  const [savingCharge, setSavingCharge] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [renewProcessing, setRenewProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchCharges(); }, [chargeFilter]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [memRes, renewRes, chargeRes] = await Promise.all([
        fetch("/api/memberships"),
        fetch("/api/admin/billing/renew"),
        fetch(`/api/admin/charges?status=${chargeFilter}`),
      ]);
      if (memRes.ok) {
        const all: Membership[] = await memRes.json();
        setMembers(all);
        setPending(all.filter((m) => m.payment_status === "pending"));
      }
      if (renewRes.ok) setRenewals(await renewRes.json());
      if (chargeRes.ok) setCharges(await chargeRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function fetchCharges() {
    const res = await fetch(`/api/admin/charges?status=${chargeFilter}`);
    if (res.ok) setCharges(await res.json());
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function updateChargeStatus(id: number, status: "paid" | "voided") {
    setChargeProcessing(id);
    const res = await fetch(`/api/admin/charges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setChargeProcessing(null);
    if (res.ok) { fetchCharges(); flash("success", status === "paid" ? "Marked as paid." : "Charge voided."); }
    else flash("error", "Failed to update.");
  }

  async function addCharge() {
    if (!chargeForm.member_name || !chargeForm.description || !chargeForm.amount) return;
    setSavingCharge(true);
    const res = await fetch("/api/admin/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...chargeForm,
        membership_id: chargeForm.membership_id || null,
        amount: parseFloat(chargeForm.amount),
      }),
    });
    setSavingCharge(false);
    if (res.ok) {
      setShowAddCharge(false);
      setChargeForm({ ...EMPTY_CHARGE });
      fetchCharges();
      flash("success", "Charge added.");
    } else {
      flash("error", "Failed to add charge.");
    }
  }

  function selectMember(id: string) {
    const m = members.find((x) => String(x.id) === id);
    setChargeForm({
      ...chargeForm,
      membership_id: id,
      member_name: m ? `${m.first_name} ${m.last_name}` : chargeForm.member_name,
      member_email: m?.email ?? chargeForm.member_email,
    });
  }

  async function markMemberPaid(m: Membership) {
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
  const openChargesTotal = charges.filter((c) => c.status === "open").reduce((s, c) => s + c.amount, 0);

  const TABS: { key: "charges" | "pending" | "renewals"; label: string; badge?: number }[] = [
    { key: "charges", label: "Charges & Tabs", badge: charges.filter((c) => c.status === "open").length },
    { key: "pending", label: "Pending Payments", badge: pending.length },
    { key: "renewals", label: "Renewals Due", badge: renewals.length },
  ];

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
        {TABS.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-white shadow text-swan-green" : "text-gray-600 hover:text-gray-900"}`}
          >
            {label}
            {!!badge && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : tab === "charges" ? (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["open", "all"] as const).map((f) => (
                <button key={f} onClick={() => setChargeFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${chargeFilter === f ? "bg-white shadow text-swan-green" : "text-gray-600"}`}>
                  {f === "open" ? `Open (${charges.filter(c=>c.status==="open").length})` : "All"}
                </button>
              ))}
            </div>
            {chargeFilter === "open" && charges.filter(c=>c.status==="open").length > 0 && (
              <span className="text-sm font-medium text-gray-700">
                Total outstanding: <span className="text-swan-green font-bold">${openChargesTotal.toFixed(2)}</span>
              </span>
            )}
            <button onClick={() => setShowAddCharge(true)} className="btn-primary text-sm py-2 px-4">
              + Add Charge
            </button>
          </div>

          {charges.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">{chargeFilter === "open" ? "No open charges." : "No charges found."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow text-sm">
                <thead className="bg-swan-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-center font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Date</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {charges.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.member_name}</p>
                        {c.member_email && <p className="text-xs text-gray-400">{c.member_email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{CHARGE_TYPES[c.charge_type] ?? c.charge_type}</td>
                      <td className="px-4 py-3">
                        <p>{c.description}</p>
                        {c.notes && <p className="text-xs text-gray-400">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">${c.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "open" ? "bg-amber-100 text-amber-800" :
                          c.status === "paid" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.status === "open" && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => updateChargeStatus(c.id, "paid")}
                              disabled={chargeProcessing === c.id}
                              className="px-2 py-1 bg-swan-green text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {chargeProcessing === c.id ? "…" : "Paid"}
                            </button>
                            <button
                              onClick={() => { if (confirm("Void this charge?")) updateChargeStatus(c.id, "voided"); }}
                              disabled={chargeProcessing === c.id}
                              className="px-2 py-1 border border-gray-300 text-gray-500 rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              Void
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add charge modal */}
          {showAddCharge && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddCharge(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-swan-green">Add Charge</h2>
                  <button onClick={() => setShowAddCharge(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Member (optional)</label>
                    <select
                      className="input-field w-full"
                      value={chargeForm.membership_id}
                      onChange={(e) => selectMember(e.target.value)}
                    >
                      <option value="">— Enter name manually —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.last_name} ({m.member_number})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input className="input-field w-full" value={chargeForm.member_name}
                      onChange={(e) => setChargeForm({ ...chargeForm, member_name: e.target.value })}
                      placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" className="input-field w-full" value={chargeForm.member_email}
                      onChange={(e) => setChargeForm({ ...chargeForm, member_email: e.target.value })}
                      placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Charge Type *</label>
                    <select className="input-field w-full" value={chargeForm.charge_type}
                      onChange={(e) => setChargeForm({ ...chargeForm, charge_type: e.target.value })}>
                      {Object.entries(CHARGE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                    <input className="input-field w-full" value={chargeForm.description}
                      onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                      placeholder="e.g. Bar tab 4/6, Cart storage 2026 season" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($) *</label>
                    <input type="number" min="0" step="0.01" className="input-field w-full" value={chargeForm.amount}
                      onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input className="input-field w-full" value={chargeForm.notes}
                      onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                      placeholder="Optional notes" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowAddCharge(false)}
                    className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                    Cancel
                  </button>
                  <button
                    onClick={addCharge}
                    disabled={savingCharge || !chargeForm.member_name || !chargeForm.description || !chargeForm.amount}
                    className="btn-primary flex-1"
                  >
                    {savingCharge ? "Saving…" : "Add Charge"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
                            onClick={() => markMemberPaid(m)}
                            disabled={processing === m.id}
                            className="px-3 py-1.5 bg-swan-green text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
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
                "Charge Selected" will auto-charge members with a card on file. Members without a saved card will be skipped.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
