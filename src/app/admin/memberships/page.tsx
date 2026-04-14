"use client";

import { useState, useEffect } from "react";
import type { Membership } from "@/lib/types";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";

interface MembershipWithNfc extends Membership {
  nfc_token: string | null;
  credit_limit: number | null;
}

interface InlineEdit {
  id: number;
  field: "nickname" | "credit_limit";
  value: string;
}

const YEAR = new Date().getFullYear();
const EMPTY_NEW = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "MN",
  zip: "",
  membership_type: "single" as MembershipType,
  start_date: `${YEAR}-05-01`,
  end_date: `${YEAR}-10-31`,
  payment_status: "paid",
};

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState<MembershipWithNfc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [nfcModal, setNfcModal] = useState<MembershipWithNfc | null>(null);
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcMsg, setNfcMsg] = useState("");
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ ...EMPTY_NEW });
  const [creating, setCreating] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { fetchMemberships(); }, []);

  async function fetchMemberships() {
    try {
      const res = await fetch("/api/memberships");
      setMemberships(await res.json());
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === "all" ? memberships : memberships.filter((m) => m.status === filter);

  const totalRevenue = memberships
    .filter((m) => m.payment_status === "paid")
    .reduce((sum, m) => sum + (m.amount_paid || 0), 0);

  async function generateNfcToken(m: MembershipWithNfc) {
    const res = await fetch(`/api/admin/memberships/nfc?id=${m.id}`, { method: "POST" });
    if (res.ok) {
      const { nfc_token } = await res.json();
      const updated = { ...m, nfc_token };
      setNfcModal(updated);
      setMemberships((prev) => prev.map((x) => x.id === m.id ? updated : x));
    }
  }

  async function writeWebNfc(token: string) {
    if (!("NDEFReader" in window)) {
      setNfcMsg("Web NFC is not available in this browser. Copy the token and use a dedicated NFC writer.");
      return;
    }
    setNfcWriting(true);
    setNfcMsg("Tap a blank NFC tag to write…");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: "text", data: token }] });
      setNfcMsg("✓ Tag written successfully!");
    } catch {
      setNfcMsg("Write failed or cancelled. Try again.");
    } finally {
      setNfcWriting(false);
    }
  }

  async function saveInlineEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    setEditing(null);
    await fetch("/api/admin/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value || null }),
    });
    setMemberships((prev) =>
      prev.map((m) => m.id === id ? { ...m, [field]: value || null } : m)
    );
  }

  function startEdit(m: MembershipWithNfc, field: "nickname" | "credit_limit") {
    const current = field === "credit_limit"
      ? (m.credit_limit != null ? String(m.credit_limit) : "")
      : (m.nickname ?? "");
    setEditing({ id: m.id, field, value: current });
  }

  function flash(type: "success" | "error", text: string) {
    setFlashMsg({ type, text });
    setTimeout(() => setFlashMsg(null), 4000);
  }

  async function createMembership() {
    if (!newForm.first_name || !newForm.last_name || !newForm.email) return;
    setCreating(true);
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, payment_provider: "manual", admin_created: true }),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      setShowNew(false);
      setNewForm({ ...EMPTY_NEW });
      flash("success", `Membership ${data.member_number} created.${data.account_created ? " Account invite sent." : ""}`);
      fetchMemberships();
    } else {
      const err = await res.json().catch(() => ({}));
      flash("error", err.error ?? "Failed to create membership.");
    }
  }

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Manage Memberships</h1>
        <button onClick={() => { setShowNew(true); setNewForm({ ...EMPTY_NEW }); }} className="btn-primary text-sm py-2 px-4">
          + New Membership
        </button>
      </div>

      {flashMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${flashMsg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {flashMsg.text}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-swan-green">{memberships.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {memberships.filter((m) => m.status === "active").length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {memberships.filter((m) => m.payment_status === "pending").length}
          </div>
          <div className="text-sm text-gray-500">Pending Payment</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-swan-green">${totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Revenue</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "active", "pending", "expired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              filter === f ? "bg-swan-green text-white" : "bg-white border border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No memberships found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Member #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nickname</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Credit Limit</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Payment</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">NFC Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{m.member_number}</td>
                  <td className="px-4 py-3 font-medium">{m.first_name} {m.last_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {editing?.id === m.id && editing.field === "nickname" ? (
                      <input
                        autoFocus
                        className="border border-swan-green rounded px-2 py-0.5 text-sm w-28 focus:outline-none"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onBlur={saveInlineEdit}
                        onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setEditing(null); }}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(m, "nickname")}
                        className="text-left text-gray-500 hover:text-swan-green"
                        title="Click to set nickname"
                      >
                        {m.nickname ?? <span className="text-gray-300 text-xs italic">add nickname</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {editing?.id === m.id && editing.field === "credit_limit" ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="50"
                        className="border border-swan-green rounded px-2 py-0.5 text-sm w-24 focus:outline-none"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onBlur={saveInlineEdit}
                        onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setEditing(null); }}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(m, "credit_limit")}
                        className="text-gray-500 hover:text-swan-green"
                        title="Click to set credit limit"
                      >
                        {m.credit_limit != null ? `$${m.credit_limit}` : <span className="text-gray-300 text-xs italic">none</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {MEMBERSHIP_TYPES[m.membership_type as MembershipType]?.name || m.membership_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                  <td className="px-4 py-3 text-center">
                    ${MEMBERSHIP_TYPES[m.membership_type as MembershipType]?.price || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.payment_status === "paid" ? "bg-green-100 text-green-800" :
                      m.payment_status === "processing" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {m.payment_status}
                    </span>
                    {m.payment_provider && (
                      <div className="text-xs text-gray-400 mt-1">{m.payment_provider}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.status === "active" ? "bg-green-100 text-green-800" :
                      m.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.nfc_token ? (
                      <button
                        onClick={() => { setNfcModal(m); setNfcMsg(""); }}
                        className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded font-medium"
                      >
                        View Card
                      </button>
                    ) : (
                      <button
                        onClick={() => generateNfcToken(m)}
                        className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded font-medium"
                      >
                        Issue Card
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NFC Token Modal */}
      {nfcModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-swan-green">NFC Card — {nfcModal.first_name} {nfcModal.last_name}</h2>
              <button onClick={() => { setNfcModal(null); setNfcMsg(""); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Program a blank NFC tag with this token, or with the URL below. Members tap the
              card to the desk reader to check in instantly.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Token (plain text payload)</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 truncate">
                    {nfcModal.nfc_token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(nfcModal.nfc_token!)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded font-medium shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">iOS URL (tap-to-open for iPhone/iPad)</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 truncate">
                    {siteUrl}/desk/nfc/{nfcModal.nfc_token}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${siteUrl}/desk/nfc/${nfcModal.nfc_token}`)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded font-medium shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {nfcMsg && (
              <p className={`mt-3 text-sm text-center ${nfcMsg.startsWith("✓") ? "text-green-700" : "text-gray-600"}`}>
                {nfcMsg}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => writeWebNfc(nfcModal.nfc_token!)}
                disabled={nfcWriting}
                className="btn-primary w-full"
              >
                {nfcWriting ? "Writing…" : "Write Tag via Web NFC (Chrome / Android)"}
              </button>
              <button
                onClick={() => generateNfcToken(nfcModal)}
                className="w-full py-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Regenerate Token (invalidates existing cards)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Membership Modal ──────────────────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">New Membership</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              If the email matches an existing account, it will be linked automatically. Otherwise a new account is created and an invite email is sent.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input className="input-field w-full" value={newForm.first_name}
                    onChange={(e) => setNewForm({ ...newForm, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input className="input-field w-full" value={newForm.last_name}
                    onChange={(e) => setNewForm({ ...newForm, last_name: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" className="input-field w-full" value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input className="input-field w-full" placeholder="(218) 555-0100" value={newForm.phone}
                  onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input className="input-field w-full" placeholder="123 Main St" value={newForm.address}
                  onChange={(e) => setNewForm({ ...newForm, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input className="input-field w-full" value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input className="input-field w-full" value={newForm.state}
                    onChange={(e) => setNewForm({ ...newForm, state: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
                  <input className="input-field w-full" value={newForm.zip}
                    onChange={(e) => setNewForm({ ...newForm, zip: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Membership Type</label>
                <select className="input-field w-full" value={newForm.membership_type}
                  onChange={(e) => setNewForm({ ...newForm, membership_type: e.target.value as MembershipType })}>
                  {Object.entries(MEMBERSHIP_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.name} — ${val.price}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input type="date" className="input-field w-full" value={newForm.start_date}
                    onChange={(e) => setNewForm({ ...newForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input type="date" className="input-field w-full" value={newForm.end_date}
                    onChange={(e) => setNewForm({ ...newForm, end_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                <select className="input-field w-full" value={newForm.payment_status}
                  onChange={(e) => setNewForm({ ...newForm, payment_status: e.target.value })}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNew(false)} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 text-sm">
                Cancel
              </button>
              <button
                onClick={createMembership}
                disabled={creating || !newForm.first_name || !newForm.last_name || !newForm.email}
                className="btn-primary flex-1"
              >
                {creating ? "Creating…" : "Create Membership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
