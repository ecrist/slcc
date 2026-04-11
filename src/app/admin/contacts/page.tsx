"use client";

import { useState, useEffect, useRef } from "react";

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  zip: string | null;
  email: string | null;
  phone: string | null;
  membership_id: number | null;
  member_number: string | null;
  membership_status: string | null;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  zip: "",
  email: "",
  phone: "",
  nickname: "",
  notes: "",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchContacts(); }, []);

  async function fetchContacts(q?: string) {
    setLoading(true);
    const url = q && q.length >= 2 ? `/api/admin/contacts?q=${encodeURIComponent(q)}` : "/api/admin/contacts";
    const res = await fetch(url);
    if (res.ok) setContacts(await res.json());
    setLoading(false);
  }

  function handleSearch(q: string) {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchContacts(q), 250);
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function saveCreate() {
    if (!form.first_name || !form.last_name) return;
    setSaving(true);
    const res = await fetch("/api/admin/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      flash("success", "Contact created.");
      fetchContacts(searchQ);
    } else {
      flash("error", "Failed to create contact.");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/admin/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...form }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      flash("success", "Contact updated.");
      fetchContacts(searchQ);
    } else {
      flash("error", "Failed to update contact.");
    }
  }

  async function deleteContact(c: Contact) {
    if (!confirm(`Delete ${c.first_name} ${c.last_name}?`)) return;
    const res = await fetch(`/api/admin/contacts?id=${c.id}`, { method: "DELETE" });
    if (res.ok) {
      flash("success", "Contact deleted.");
      fetchContacts(searchQ);
    } else {
      flash("error", "Failed to delete.");
    }
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      zip: c.zip ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      nickname: (c as Contact & { nickname?: string }).nickname ?? "",
      notes: c.notes ?? "",
    });
  }

  function openCreate() {
    setShowCreate(true);
    setForm({ ...EMPTY_FORM });
  }

  const FormFields = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
          <input className="input-field w-full" value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
          <input className="input-field w-full" value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zip Code</label>
          <input className="input-field w-full" value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
            placeholder="55781" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input className="input-field w-full" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(218) 555-0100" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input type="email" className="input-field w-full" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Nickname
          <span className="ml-1 font-normal text-gray-400">— used for Toast tab name matching</span>
        </label>
        <input className="input-field w-full" value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          placeholder="e.g. Smitty" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
        <input className="input-field w-full" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional notes" />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Contacts</h1>
        <button onClick={openCreate} className="btn-primary">+ New Contact</button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="mb-4">
        <input
          className="input-field w-full max-w-sm"
          placeholder="Search by name…"
          value={searchQ}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No contacts found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow text-sm">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Zip</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-center font-medium">Member?</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.zip ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {!c.email && !c.phone && "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.member_number ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {c.member_number}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {c.notes ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="text-swan-green hover:text-emerald-700 text-xs font-medium mr-3">
                      Edit
                    </button>
                    <button onClick={() => deleteContact(c)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">New Contact</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <FormFields />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 text-sm">Cancel</button>
              <button onClick={saveCreate} disabled={saving || !form.first_name || !form.last_name} className="btn-primary flex-1">
                {saving ? "Saving…" : "Create Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-swan-green">Edit Contact</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <FormFields />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-600 text-sm">Cancel</button>
              <button onClick={saveEdit} disabled={saving || !form.first_name || !form.last_name} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
