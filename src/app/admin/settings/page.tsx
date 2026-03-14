"use client";

import { useState, useEffect } from "react";

interface AdminUser {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string;
  is_initial: boolean;
}

interface ConfigEntry {
  key: string;
  value: string;
  label: string;
  description: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchConfig();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function fetchConfig() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data: ConfigEntry[] = await res.json();
      setConfig(data);
      setConfigDraft(Object.fromEntries(data.map((e) => [e.key, e.value])));
    }
  }

  function flash(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    setAddingUser(false);
    if (res.ok) {
      setNewEmail("");
      fetchUsers();
      flash("success", `${newEmail} added as admin.`);
    } else {
      const err = await res.json();
      flash("error", err.error || "Failed to add user");
    }
  }

  async function handleRemoveUser(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchUsers();
      flash("success", `${email} removed.`);
    } else {
      const err = await res.json();
      flash("error", err.error || "Failed to remove user");
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configDraft),
    });
    setSaving(false);
    if (res.ok) {
      fetchConfig();
      flash("success", "Settings saved.");
    } else {
      flash("error", "Failed to save settings.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-gray-600">Manage admin access and site configuration.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Admin Users */}
      <section className="card">
        <h2 className="text-xl font-bold text-swan-green mb-1">Admin Users</h2>
        <p className="text-sm text-gray-500 mb-6">
          These accounts can access the admin dashboard. The initial admin configured
          via <code className="bg-gray-100 px-1 rounded">INITIAL_ADMIN_EMAIL</code> always
          retains access regardless of this list.
        </p>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Added by</th>
              <th className="pb-2 font-medium">Date added</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="py-2.5 font-medium">
                  {u.email}
                  {u.is_initial && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      initial admin
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-gray-500">{u.added_by || "—"}</td>
                <td className="py-2.5 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => handleRemoveUser(u.email)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400 text-sm">
                  No admin users in database — access controlled by INITIAL_ADMIN_EMAIL only.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <form onSubmit={handleAddUser} className="flex gap-3">
          <input
            type="email"
            required
            placeholder="email@example.com"
            className="input-field flex-1"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" disabled={addingUser} className="btn-primary whitespace-nowrap">
            {addingUser ? "Adding…" : "Add Admin"}
          </button>
        </form>
      </section>

      {/* Site Configuration */}
      <section className="card">
        <h2 className="text-xl font-bold text-swan-green mb-1">Site Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">
          Changes take effect immediately — no rebuild required.
        </p>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          {config.map((entry) => (
            <div key={entry.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {entry.label || entry.key}
                {entry.description && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{entry.description}</span>
                )}
              </label>
              {entry.key === "course_open" ? (
                <select
                  className="input-field max-w-xs"
                  value={configDraft[entry.key] ?? entry.value}
                  onChange={(e) => setConfigDraft({ ...configDraft, [entry.key]: e.target.value })}
                >
                  <option value="true">Open — bookings accepted</option>
                  <option value="false">Closed — bookings paused</option>
                </select>
              ) : (
                <input
                  type="text"
                  className="input-field max-w-sm"
                  value={configDraft[entry.key] ?? entry.value}
                  onChange={(e) => setConfigDraft({ ...configDraft, [entry.key]: e.target.value })}
                />
              )}
            </div>
          ))}

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
