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

// ── Config section definitions ───────────────────────────────────────────────

type FieldType = "text" | "secret" | "select" | "textarea";

interface FieldDef {
  key: string;
  type?: FieldType;
  options?: string[];
  width?: "full" | "half";
}

interface SectionDef {
  id: string;
  title: string;
  description?: string;
  note?: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "course",
    title: "Course Operation",
    fields: [
      { key: "course_open", type: "select", options: ["true", "false"] },
      { key: "booking_days_ahead", width: "half" },
      { key: "green_fee_9_holes", width: "half" },
      { key: "green_fee_18_holes", width: "half" },
      { key: "cart_fee_per_9", width: "half" },
      { key: "buggy_fee", width: "half" },
      { key: "clubs_fee", width: "half" },
      { key: "personal_cart_drop_fee", width: "half" },
      { key: "contact_phone", width: "half" },
      { key: "contact_email", width: "half" },
      { key: "season_start", width: "half" },
      { key: "season_end", width: "half" },
      { key: "tee_time_open", width: "half" },
      { key: "tee_time_close", width: "half" },
      { key: "clubhouse_open", width: "half" },
      { key: "clubhouse_close", width: "half" },
      { key: "sunset_cutoff_enabled", type: "select", options: ["true", "false"], width: "half" },
      { key: "sunset_cutoff_hours", width: "half" },
      { key: "course_latitude", width: "half" },
      { key: "course_longitude", width: "half" },
    ],
  },
  {
    id: "email",
    title: "Email (SMTP)",
    description: "Transactional email for booking confirmations, membership receipts, and tournament registrations.",
    fields: [
      { key: "smtp_host" },
      { key: "smtp_port", width: "half" },
      { key: "smtp_secure", width: "half" },
      { key: "smtp_user" },
      { key: "smtp_pass", type: "secret" },
      { key: "smtp_from" },
    ],
  },
  {
    id: "square",
    title: "Square Payments",
    description: "Used for credit/debit card processing, Google Pay, Apple Pay, and card-on-file auto-renewal.",
    fields: [
      { key: "square_access_token", type: "secret" },
      { key: "square_application_id" },
      { key: "square_location_id" },
      { key: "square_environment", type: "select", options: ["sandbox", "production"] },
    ],
  },
  {
    id: "quickbooks",
    title: "QuickBooks Payments",
    description: "Used for invoice / ACH payment flow.",
    fields: [
      { key: "quickbooks_client_id" },
      { key: "quickbooks_client_secret", type: "secret" },
      { key: "quickbooks_redirect_uri" },
      { key: "quickbooks_environment", type: "select", options: ["sandbox", "production"] },
    ],
  },
  {
    id: "google",
    title: "Google Sign In",
    note: "OAuth credential changes require a server restart to take effect.",
    fields: [
      { key: "google_client_id" },
      { key: "google_client_secret", type: "secret" },
    ],
  },
  {
    id: "apple",
    title: "Apple Sign In",
    note: "OAuth credential changes require a server restart to take effect.",
    fields: [
      { key: "apple_id" },
      { key: "apple_secret", type: "secret" },
    ],
  },
  {
    id: "toast",
    title: "Toast POS",
    description: "Receive closed-check webhooks from Toast to automatically create member bar tab charges.",
    note: "Configure the webhook endpoint in your Toast Partner Portal: POST /api/webhooks/toast",
    fields: [
      { key: "toast_webhook_secret", type: "secret" },
      { key: "toast_location_guid" },
    ],
  },
  {
    id: "security",
    title: "Security",
    fields: [
      { key: "cron_secret", type: "secret" },
    ],
  },
];

const SENSITIVE_KEYS = new Set([
  "smtp_pass", "square_access_token", "quickbooks_client_secret",
  "google_client_secret", "apple_secret", "cron_secret", "toast_webhook_secret",
]);

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [newEmail, setNewEmail] = useState("");
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [addingUser, setAddingUser] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setDraft(Object.fromEntries(data.map((e) => [e.key, e.value])));
    }
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
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
    if (res.ok) { setNewEmail(""); fetchUsers(); flash("success", `${newEmail} added as admin.`); }
    else { const err = await res.json(); flash("error", err.error || "Failed to add user"); }
  }

  async function handleRemoveUser(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    if (res.ok) { fetchUsers(); flash("success", `${email} removed.`); }
    else { const err = await res.json(); flash("error", err.error || "Failed to remove user"); }
  }

  async function handleSaveSection(sectionId: string, keys: string[]) {
    setSavingSections((prev) => new Set(prev).add(sectionId));
    const payload: Record<string, string> = {};
    for (const key of keys) payload[key] = draft[key] ?? "";

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingSections((prev) => { const next = new Set(prev); next.delete(sectionId); return next; });
    if (res.ok) { fetchConfig(); flash("success", "Settings saved."); }
    else flash("error", "Failed to save settings.");
  }

  const configByKey = Object.fromEntries(config.map((e) => [e.key, e]));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-gray-600">All configuration is stored in the database and takes effect immediately.</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Default credentials notice */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-900">
        <strong>Default admin account:</strong> <code className="bg-amber-100 px-1 rounded">admin@swanlakecc.com</code> / <code className="bg-amber-100 px-1 rounded">admin</code> &mdash;
        Change this password immediately. Add your own email as an admin below, then remove the default account.
      </div>

      {/* Admin Users */}
      <section className="card">
        <h2 className="text-xl font-bold text-swan-green mb-1">Admin Users</h2>
        <p className="text-sm text-gray-500 mb-5">
          These accounts can access the admin dashboard. At least one admin must remain at all times.
        </p>

        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Added by</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="py-2.5 font-medium">
                  {u.email}
                  {u.is_initial && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">default</span>
                  )}
                </td>
                <td className="py-2.5 text-gray-500">{u.added_by || "—"}</td>
                <td className="py-2.5 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-2.5 text-right">
                  <button onClick={() => handleRemoveUser(u.email)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-sm">No admin users.</td></tr>
            )}
          </tbody>
        </table>

        <form onSubmit={handleAddUser} className="flex gap-3">
          <input
            type="email" required placeholder="email@example.com"
            className="input-field flex-1"
            value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" disabled={addingUser} className="btn-primary whitespace-nowrap">
            {addingUser ? "Adding…" : "Add Admin"}
          </button>
        </form>
      </section>

      {/* Config sections */}
      {SECTIONS.map((section) => {
        const keys = section.fields.map((f) => f.key);
        const isSaving = savingSections.has(section.id);

        return (
          <section key={section.id} className="card space-y-4">
            <div>
              <h2 className="text-xl font-bold text-swan-green">{section.title}</h2>
              {section.description && <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>}
              {section.note && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mt-2">
                  ⚠️ {section.note}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((field) => {
                const meta = configByKey[field.key];
                const isSecret = field.type === "secret" || SENSITIVE_KEYS.has(field.key);
                const isRevealed = revealed.has(field.key);
                const colSpan = field.width === "half" ? "" : "col-span-2";
                const value = draft[field.key] ?? "";

                return (
                  <div key={field.key} className={colSpan}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {meta?.label || field.key}
                      {meta?.description && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">{meta.description}</span>
                      )}
                    </label>

                    {field.type === "select" ? (
                      <select
                        className="input-field"
                        value={value}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                      >
                        {field.key === "course_open" ? (
                          <>
                            <option value="true">Open — bookings accepted</option>
                            <option value="false">Closed — bookings paused</option>
                          </>
                        ) : (
                          (field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)
                        )}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        className="input-field font-mono text-xs"
                        rows={5}
                        value={value}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                      />
                    ) : isSecret ? (
                      <div className="flex gap-2">
                        <input
                          type={isRevealed ? "text" : "password"}
                          className="input-field flex-1 font-mono text-xs"
                          value={value}
                          placeholder={value ? "••••••••" : "(not set)"}
                          onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => toggleReveal(field.key)}
                          className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 shrink-0"
                          title={isRevealed ? "Hide" : "Show"}
                        >
                          {isRevealed ? "Hide" : "Show"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="input-field"
                        value={value}
                        placeholder={meta?.description || ""}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveSection(section.id, keys)}
                className="btn-primary text-sm py-2 px-5"
              >
                {isSaving ? "Saving…" : `Save ${section.title}`}
              </button>
            </div>
          </section>
        );
      })}

      {/* AUTH_SECRET note */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
        <strong>Note:</strong> One environment variable must always remain in <code className="bg-gray-100 px-1 rounded">.env.local</code>:{" "}
        <code className="bg-gray-100 px-1 rounded">AUTH_SECRET</code> — used by NextAuth to sign session tokens.
        Generate with: <code className="bg-gray-100 px-1 rounded text-xs">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;</code>
      </div>
    </div>
  );
}
