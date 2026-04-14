"use client";

import { useState, useEffect, useRef } from "react";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";

interface Player {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
  membership_id: number | null;
  member_number: string | null;
  membership_type: string | null;
  membership_status: string | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
}

const EMPTY_MEMBERSHIP = {
  membership_type: "single" as MembershipType,
  phone: "",
  address: "",
  city: "",
  state: "MN",
  zip: "",
  payment_status: "paid",
  start_date: `${new Date().getFullYear()}-05-01`,
  end_date: `${new Date().getFullYear()}-10-31`,
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password reset modal
  const [resetUser, setResetUser] = useState<Player | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Add membership modal
  const [addMemberUser, setAddMemberUser] = useState<Player | null>(null);
  const [memberForm, setMemberForm] = useState({ ...EMPTY_MEMBERSHIP });
  const [addingMember, setAddingMember] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { fetchPlayers(); }, []);

  async function fetchPlayers(q?: string) {
    setLoading(true);
    const url = q && q.length >= 2
      ? `/api/admin/players?q=${encodeURIComponent(q)}`
      : "/api/admin/players";
    const res = await fetch(url);
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  }

  function handleSearch(q: string) {
    setSearchQ(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPlayers(q), 250);
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Password reset ────────────────────────────────────────────────────────
  function openReset(p: Player) {
    setResetUser(p);
    setNewPassword("");
  }

  async function submitReset() {
    if (!resetUser || newPassword.length < 6) return;
    setResetting(true);
    const res = await fetch("/api/admin/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: resetUser.id, new_password: newPassword }),
    });
    setResetting(false);
    if (res.ok) {
      setResetUser(null);
      flash("success", `Password reset for ${resetUser.name}.`);
    } else {
      flash("error", "Failed to reset password.");
    }
  }

  // ── Add membership ────────────────────────────────────────────────────────
  function openAddMembership(p: Player) {
    setAddMemberUser(p);
    setMemberForm({ ...EMPTY_MEMBERSHIP, phone: p.phone ?? "" });
  }

  async function submitAddMembership() {
    if (!addMemberUser) return;
    setAddingMember(true);

    const [firstName, ...rest] = addMemberUser.name.split(" ");
    const lastName = rest.join(" ") || firstName;

    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: addMemberUser.email,
        phone: memberForm.phone || null,
        address: memberForm.address || null,
        city: memberForm.city || null,
        state: memberForm.state,
        zip: memberForm.zip || null,
        membership_type: memberForm.membership_type,
        payment_provider: "manual",
        payment_status: memberForm.payment_status,
        admin_created: true,
      }),
    });

    setAddingMember(false);
    if (res.ok) {
      const data = await res.json();
      setAddMemberUser(null);
      flash("success", `Membership ${data.member_number} created.`);
      fetchPlayers(searchQ);
    } else {
      const err = await res.json().catch(() => ({}));
      flash("error", err.error ?? "Failed to create membership.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Players</h1>
        <span className="text-sm text-gray-500">{players.length} account{players.length !== 1 ? "s" : ""}</span>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="mb-5">
        <input
          className="input-field w-full max-w-sm"
          placeholder="Search by name or email…"
          value={searchQ}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : players.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No players found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow text-sm">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-center font-medium">Membership</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone ?? "—"}</td>

                  {/* Membership */}
                  <td className="px-4 py-3 text-center">
                    {p.member_number ? (
                      <div>
                        <div className="font-mono text-xs text-gray-700">{p.member_number}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {MEMBERSHIP_TYPES[p.membership_type as MembershipType]?.name ?? p.membership_type}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAddMembership(p)}
                        className="text-xs text-swan-green hover:text-emerald-700 font-medium underline underline-offset-2"
                      >
                        + Add Membership
                      </button>
                    )}
                  </td>

                  {/* Membership status */}
                  <td className="px-4 py-3 text-center">
                    {p.membership_status ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.membership_status === "active"  ? "bg-green-100 text-green-700" :
                        p.membership_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.membership_status}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">none</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openReset(p)}
                      className="text-xs text-gray-500 hover:text-swan-green font-medium"
                    >
                      Reset Password
                    </button>
                    {!p.member_number && (
                      <button
                        onClick={() => openAddMembership(p)}
                        className="ml-3 text-xs text-swan-green hover:text-emerald-700 font-medium"
                      >
                        Add Membership
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────────────── */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setResetUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">Reset Password</h2>
              <button onClick={() => setResetUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Set a new password for <strong>{resetUser.name}</strong> ({resetUser.email}).
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password (min 6 chars)</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="Temporary password…"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setResetUser(null)} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 text-sm">
                Cancel
              </button>
              <button
                onClick={submitReset}
                disabled={resetting || newPassword.length < 6}
                className="btn-primary flex-1"
              >
                {resetting ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Membership Modal ─────────────────────────────────────────── */}
      {addMemberUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAddMemberUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">Add Membership</h2>
              <button onClick={() => setAddMemberUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Creating membership for <strong>{addMemberUser.name}</strong> ({addMemberUser.email}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Membership Type</label>
                <select
                  className="input-field w-full"
                  value={memberForm.membership_type}
                  onChange={(e) => setMemberForm({ ...memberForm, membership_type: e.target.value as MembershipType })}
                >
                  {Object.entries(MEMBERSHIP_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.name} — ${val.price}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input type="date" className="input-field w-full" value={memberForm.start_date}
                    onChange={(e) => setMemberForm({ ...memberForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input type="date" className="input-field w-full" value={memberForm.end_date}
                    onChange={(e) => setMemberForm({ ...memberForm, end_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
                <select className="input-field w-full" value={memberForm.payment_status}
                  onChange={(e) => setMemberForm({ ...memberForm, payment_status: e.target.value })}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input className="input-field w-full" placeholder="(218) 555-0100" value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input className="input-field w-full" placeholder="123 Main St" value={memberForm.address}
                  onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input className="input-field w-full" value={memberForm.city}
                    onChange={(e) => setMemberForm({ ...memberForm, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input className="input-field w-full" value={memberForm.state}
                    onChange={(e) => setMemberForm({ ...memberForm, state: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
                  <input className="input-field w-full" value={memberForm.zip}
                    onChange={(e) => setMemberForm({ ...memberForm, zip: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setAddMemberUser(null)} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 text-sm">
                Cancel
              </button>
              <button onClick={submitAddMembership} disabled={addingMember} className="btn-primary flex-1">
                {addingMember ? "Creating…" : "Create Membership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
