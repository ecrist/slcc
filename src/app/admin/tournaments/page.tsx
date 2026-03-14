"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS,
  type Tournament, type TournamentFormat,
} from "@/lib/types";

interface TournamentRow extends Tournament { entry_count: number }

const FORMATS = Object.entries(TOURNAMENT_FORMAT_LABELS) as [TournamentFormat, string][];

const STATUS_COLORS: Record<string, string> = {
  registration_open:   "bg-green-100 text-green-800",
  registration_closed: "bg-yellow-100 text-yellow-800",
  draw_complete:       "bg-blue-100 text-blue-800",
  scoring:             "bg-purple-100 text-purple-800",
  completed:           "bg-gray-100 text-gray-700",
  cancelled:           "bg-red-100 text-red-700",
};

function blankForm() {
  return {
    title: "", description: "", tournament_date: "",
    registration_deadline: "", format: "luck_of_the_draw",
    team_size: "2", max_entries: "", entry_fee: "0",
    holes: "18", is_public: true,
  };
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { fetchTournaments(); }, []);

  async function fetchTournaments() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const all = await res.json();
        setTournaments(all);
      }
    } finally {
      setLoading(false);
    }
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        tournament_date: form.tournament_date,
        registration_deadline: form.registration_deadline || null,
        format: form.format,
        team_size: parseInt(form.team_size) || 2,
        max_entries: form.max_entries ? parseInt(form.max_entries) : null,
        entry_fee: parseFloat(form.entry_fee) || 0,
        holes: parseInt(form.holes) || 18,
        is_public: form.is_public,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm(blankForm());
      fetchTournaments();
      flash("success", "Tournament created.");
    } else {
      const err = await res.json();
      flash("error", err.error ?? "Failed to create tournament.");
    }
  }

  async function quickStatusChange(id: number, status: string) {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { fetchTournaments(); flash("success", "Status updated."); }
    else flash("error", "Failed to update status.");
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) { fetchTournaments(); flash("success", "Tournament deleted."); }
    else flash("error", "Delete failed.");
  }

  const showTeamSize = (f: string) => !["stroke_play", "stableford", "match_play"].includes(f);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title mb-0">Tournaments</h1>
          <p className="text-gray-500 text-sm mt-1">{tournaments.length} total</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setForm(blankForm()); }} className="btn-primary">
          {showForm ? "Cancel" : "+ New Tournament"}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card mb-8 space-y-4">
          <h2 className="text-lg font-bold text-swan-green">New Tournament</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required className="input-field" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Date *</label>
              <input type="date" required className="input-field" value={form.tournament_date}
                onChange={(e) => setForm({ ...form, tournament_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
              <input type="date" className="input-field" value={form.registration_deadline}
                onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format *</label>
              <select className="input-field" value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}>
                {FORMATS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            {showTeamSize(form.format) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                <select className="input-field" value={form.team_size}
                  onChange={(e) => setForm({ ...form, team_size: e.target.value })}>
                  <option value="2">2 players</option>
                  <option value="3">3 players</option>
                  <option value="4">4 players</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holes</label>
              <select className="input-field" value={form.holes}
                onChange={(e) => setForm({ ...form, holes: e.target.value })}>
                <option value="9">9</option>
                <option value="18">18</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee ($)</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.entry_fee}
                onChange={(e) => setForm({ ...form, entry_fee: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Entries</label>
              <input type="number" min="1" className="input-field" placeholder="Unlimited" value={form.max_entries}
                onChange={(e) => setForm({ ...form, max_entries: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_public" checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
              <label htmlFor="is_public" className="text-sm text-gray-700">Visible on public site</label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Creating…" : "Create Tournament"}
          </button>
        </form>
      )}

      {/* Tournament list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No tournaments yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <span className="text-xs text-gray-400">{TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}</span>
                    <span className="text-xs text-gray-400">{t.tournament_date}</span>
                  </div>
                  <h3 className="font-bold text-swan-dark">{t.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t.entry_count} entries{t.max_entries ? ` / ${t.max_entries}` : ""} &bull; {t.holes} holes &bull; ${t.entry_fee} entry
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Link href={`/admin/tournaments/${t.id}`} className="text-sm bg-swan-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700">
                    Manage
                  </Link>
                  <a href={`/tournaments/${t.id}`} target="_blank" rel="noreferrer"
                    className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
                    View
                  </a>
                  {t.status === "registration_open" && (
                    <button onClick={() => quickStatusChange(t.id, "registration_closed")}
                      className="text-sm border border-yellow-300 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-50">
                      Close Reg
                    </button>
                  )}
                  {t.status === "registration_closed" && (
                    <button onClick={() => quickStatusChange(t.id, "registration_open")}
                      className="text-sm border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50">
                      Open Reg
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.id, t.title)}
                    className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
