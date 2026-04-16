"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

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
      { key: "booking_days_ahead", width: "half" },
      { key: "green_fee_9_holes", width: "half" },
      { key: "green_fee_18_holes", width: "half" },
      { key: "green_fee_youth_16_18", width: "half" },
      { key: "green_fee_youth_13_15", width: "half" },
      { key: "contact_phone", width: "half" },
      { key: "contact_email", width: "half" },
      { key: "season_start", width: "half" },
      { key: "season_end", width: "half" },
      { key: "tee_time_open", width: "half" },
      { key: "tee_time_close", width: "half" },
      { key: "clubhouse_open", width: "half" },
      { key: "clubhouse_close", width: "half" },
      { key: "sunset_cutoff_hours", width: "half" },
      { key: "course_latitude", width: "half" },
      { key: "course_longitude", width: "half" },
    ],
  },
  {
    id: "rates",
    title: "Cart, Equipment & Range Rates",
    description: "Pricing shown on the Rates & Fees page. Changes appear immediately.",
    fields: [
      { key: "cart_member_half_9", width: "half" },
      { key: "cart_member_full_9", width: "half" },
      { key: "cart_member_half_18", width: "half" },
      { key: "cart_member_full_18", width: "half" },
      { key: "cart_nonmember_half_9", width: "half" },
      { key: "cart_nonmember_full_9", width: "half" },
      { key: "cart_nonmember_half_18", width: "half" },
      { key: "cart_nonmember_full_18", width: "half" },
      { key: "pull_cart_fee", width: "half" },
      { key: "club_rental_9", width: "half" },
      { key: "club_rental_18", width: "half" },
      { key: "personal_cart_drop_fee", width: "half" },
      { key: "cart_storage_trail", width: "half" },
      { key: "cart_storage_gas", width: "half" },
      { key: "cart_storage_electric", width: "half" },
      { key: "range_small_bag", width: "half" },
      { key: "range_large_bag", width: "half" },
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

// ── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, sublabel }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-swan-green" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {sublabel && <span className="block text-xs text-gray-500">{sublabel}</span>}
      </div>
    </button>
  );
}

// ── Chevron for collapsible sections ─────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [newEmail, setNewEmail] = useState("");
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [addingUser, setAddingUser] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    if (res.ok) { setNewEmail(""); fetchUsers(); toast(`${newEmail} added as admin.`, "success"); }
    else { const err = await res.json(); toast(err.error || "Failed to add user", "error"); }
  }

  async function handleRemoveUser(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    if (res.ok) { fetchUsers(); toast(`${email} removed.`, "success"); }
    else { const err = await res.json(); toast(err.error || "Failed to remove user", "error"); }
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
    if (res.ok) { fetchConfig(); toast("Settings saved.", "success"); }
    else toast("Failed to save settings.", "error");
  }

  // Save a set of arbitrary key/value pairs (used by custom widgets)
  async function saveKeys(keys: Record<string, string>, label: string) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
    });
    if (res.ok) { fetchConfig(); toast(`${label} saved.`, "success"); }
    else toast(`Failed to save ${label.toLowerCase()}.`, "error");
  }

  const configByKey = Object.fromEntries(config.map((e) => [e.key, e]));

  // ── Tee Time Settings custom widget values ─────────────────────────────────
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const courseOpen = draft["course_open"] === "true";
  const seasonAutoOpen = draft["course_auto_open_date"] ?? "";
  const seasonAutoClose = draft["course_auto_close_date"] ?? "";

  async function handleSeasonToggle(open: boolean) {
    setDraft((d) => ({ ...d, course_open: open ? "true" : "false" }));
    await saveKeys({ course_open: open ? "true" : "false" }, "Course status");
  }

  async function handleSeasonDateSave() {
    const payload: Record<string, string> = {
      course_auto_open_date: draft["course_auto_open_date"] ?? "",
      course_auto_close_date: draft["course_auto_close_date"] ?? "",
    };
    await saveKeys(payload, "Season schedule");
  }

  // ── Announcement custom widget values ──────────────────────────────────────
  const announcementOn = draft["announcement_enabled"] === "true";

  async function handleAnnouncementToggle(on: boolean) {
    setDraft((d) => ({ ...d, announcement_enabled: on ? "true" : "false" }));
    await saveKeys({ announcement_enabled: on ? "true" : "false" }, "Announcement");
    window.dispatchEvent(new Event("announcement-updated"));
  }

  async function handleAnnouncementSave() {
    await saveKeys({
      announcement_enabled: draft["announcement_enabled"] ?? "false",
      announcement_message: draft["announcement_message"] ?? "",
    }, "Announcement");
    window.dispatchEvent(new Event("announcement-updated"));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-gray-600">All configuration is stored in the database and takes effect immediately.</p>
      </div>

      {/* Default credentials notice */}
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-900">
        <strong>Default admin account:</strong> <code className="bg-amber-100 px-1 rounded">admin@swanlakecc.com</code> / <code className="bg-amber-100 px-1 rounded">admin</code> &mdash;
        Change this password immediately. Add your own email as an admin below, then remove the default account.
      </div>

      {/* Admin Users — collapsible */}
      <section className="card overflow-hidden !p-0">
        <button
          type="button"
          onClick={() => toggleSection("admin-users")}
          className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div>
            <h2 className="text-xl font-bold text-swan-green">Admin Users</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              These accounts can access the admin dashboard. At least one admin must remain at all times.
            </p>
          </div>
          <Chevron open={openSections.has("admin-users")} />
        </button>

        {openSections.has("admin-users") && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            <table className="w-full text-sm">
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
                    <td className="py-2.5 text-gray-500">{u.added_by || "\u2014"}</td>
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
                {addingUser ? "Adding\u2026" : "Add Admin"}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ── Tee Time Settings — collapsible custom widget ──────────────────── */}
      <section className="card overflow-hidden !p-0">
        <button
          type="button"
          onClick={() => toggleSection("tee-time-settings")}
          className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${courseOpen ? "bg-green-500" : "bg-gray-400"}`} />
            <div>
              <h2 className="text-xl font-bold text-swan-green">Tee Time Settings</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {courseOpen ? "Course is open — online bookings accepted" : "Course is closed — online bookings paused"}
              </p>
            </div>
          </div>
          <Chevron open={openSections.has("tee-time-settings")} />
        </button>

        {openSections.has("tee-time-settings") && (
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
            <Toggle
              checked={courseOpen}
              onChange={handleSeasonToggle}
              label={courseOpen ? "Course is Open" : "Course is Closed"}
              sublabel={courseOpen ? "Online tee time bookings are accepted" : "Online bookings are paused"}
            />

            <div className="grid grid-cols-2 gap-4">
              {!courseOpen && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Automatically open on
                    <span className="ml-1.5 text-xs font-normal text-gray-400">Leave blank for manual control</span>
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    min={tomorrow}
                    value={seasonAutoOpen}
                    onChange={(e) => setDraft({ ...draft, course_auto_open_date: e.target.value })}
                  />
                  {seasonAutoOpen && (
                    <p className="text-xs text-blue-600 mt-1.5">Tee times will not be available until on or after this date.</p>
                  )}
                </div>
              )}
              {courseOpen && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Automatically close on
                    <span className="ml-1.5 text-xs font-normal text-gray-400">Leave blank for manual control</span>
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    min={tomorrow}
                    value={seasonAutoClose}
                    onChange={(e) => setDraft({ ...draft, course_auto_close_date: e.target.value })}
                  />
                  {seasonAutoClose && (
                    <p className="text-xs text-amber-600 mt-1.5">Tee times will not be shown on or after this date.</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSeasonDateSave}
              className="btn-primary text-sm py-2 px-5"
            >
              Save Season Schedule
            </button>
          </div>
        )}
      </section>

      {/* ── Announcement Banner — collapsible custom widget ─────────────── */}
      <section className="card overflow-hidden !p-0">
        <button
          type="button"
          onClick={() => toggleSection("announcement")}
          className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${announcementOn ? "bg-green-500" : "bg-gray-400"}`} />
            <div>
              <h2 className="text-xl font-bold text-swan-green">Announcement Banner</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {announcementOn ? "Banner is visible site-wide" : "Banner is hidden"}
              </p>
            </div>
          </div>
          <Chevron open={openSections.has("announcement")} />
        </button>

        {openSections.has("announcement") && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            <Toggle
              checked={announcementOn}
              onChange={handleAnnouncementToggle}
              label={announcementOn ? "Banner is Visible" : "Banner is Hidden"}
              sublabel="Display a site-wide banner above the header — useful for course closures, weather alerts, or special events"
            />

            <div className={announcementOn ? "" : "opacity-50 pointer-events-none"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Announcement Message
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Course closed today due to weather"
                value={draft["announcement_message"] ?? ""}
                onChange={(e) => setDraft({ ...draft, announcement_message: e.target.value })}
              />
            </div>

            <button
              type="button"
              onClick={handleAnnouncementSave}
              className="btn-primary text-sm py-2 px-5"
            >
              Save Announcement
            </button>
          </div>
        )}
      </section>

      {/* ── Collapsible config sections ───────────────────────────────────── */}
      {SECTIONS.map((section) => {
        const keys = section.fields.map((f) => f.key);
        const isSaving = savingSections.has(section.id);
        const isOpen = openSections.has(section.id);

        return (
          <section key={section.id} className="card overflow-hidden !p-0">
            {/* Clickable header */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div>
                <h2 className="text-xl font-bold text-swan-green">{section.title}</h2>
                {section.description && <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>}
              </div>
              <Chevron open={isOpen} />
            </button>

            {/* Collapsible content */}
            {isOpen && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                {section.note && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                    {section.note}
                  </p>
                )}

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
                            {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
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
                              placeholder={value ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "(not set)"}
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
                    {isSaving ? "Saving\u2026" : `Save ${section.title}`}
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* AUTH_SECRET note */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
        <strong>Note:</strong> One environment variable must always remain in <code className="bg-gray-100 px-1 rounded">.env.local</code>:{" "}
        <code className="bg-gray-100 px-1 rounded">AUTH_SECRET</code> &mdash; used by NextAuth to sign session tokens.
        Generate with: <code className="bg-gray-100 px-1 rounded text-xs">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;</code>
      </div>
    </div>
  );
}
