"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS,
  type Tournament, type TournamentEntry, type TournamentTeam,
} from "@/lib/types";
import { TEE_TIME_SLOTS } from "@/lib/types";

interface TeamWithMembers extends TournamentTeam {
  members: { id: number; player_name: string; handicap: number | null }[];
}

interface Detail {
  tournament: Tournament;
  entries: TournamentEntry[];
  teams: TeamWithMembers[];
}

export default function AdminTournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  // Tee time assignment UI
  const [teeStartTime, setTeeStartTime] = useState("07:00");
  const [teeInterval, setTeeInterval] = useState("12");
  const [teeHole, setTeeHole] = useState("1");

  // Score editing
  const [scoreEdits, setScoreEdits] = useState<Record<number, { gross: string; net: string }>>({});

  // Add entry manually
  const [addForm, setAddForm] = useState({ player_name: "", player_email: "", handicap: "" });
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  async function runDraw() {
    if (!confirm(`Run the draw for this tournament? Existing teams will be replaced.`)) return;
    setWorking(true);
    const res = await fetch(`/api/admin/tournaments/${id}/draw`, { method: "POST" });
    setWorking(false);
    if (res.ok) {
      const d = await res.json();
      fetchData();
      flash("success", `Draw complete — ${d.teams_created} teams created.`);
    } else {
      const e = await res.json();
      flash("error", e.error ?? "Draw failed.");
    }
  }

  // ── Tee time assignment ───────────────────────────────────────────────────
  async function assignTeeTimes() {
    setWorking(true);
    const res = await fetch(`/api/admin/tournaments/${id}/tee-times`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_time: teeStartTime, interval_minutes: parseInt(teeInterval), start_hole: parseInt(teeHole) }),
    });
    setWorking(false);
    if (res.ok) { fetchData(); flash("success", "Tee times assigned."); }
    else { const e = await res.json(); flash("error", e.error ?? "Failed."); }
  }

  // ── Score saving ──────────────────────────────────────────────────────────
  async function saveScores() {
    const scores = Object.entries(scoreEdits)
      .filter(([, v]) => v.gross !== "" || v.net !== "")
      .map(([teamId, v]) => ({
        team_id: parseInt(teamId),
        gross_score: v.gross !== "" ? parseInt(v.gross) : null,
        net_score: v.net !== "" ? parseFloat(v.net) : null,
      }));
    if (scores.length === 0) return;

    setWorking(true);
    const res = await fetch(`/api/admin/tournaments/${id}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    });
    setWorking(false);
    if (res.ok) { setScoreEdits({}); fetchData(); flash("success", "Scores saved."); }
    else flash("error", "Failed to save scores.");
  }

  // ── Status change ─────────────────────────────────────────────────────────
  async function setStatus(status: string) {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { fetchData(); flash("success", "Status updated."); }
    else flash("error", "Failed to update status.");
  }

  // ── Add entry ─────────────────────────────────────────────────────────────
  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.player_name.trim()) return;
    setAdding(true);
    // Temporarily override status check by using a direct DB insert via the enter API
    // The enter route checks status === registration_open, so we patch temporarily or just POST to API
    const savedStatus = data?.tournament.status;
    if (savedStatus !== "registration_open") {
      await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "registration_open" }),
      });
    }
    const res = await fetch(`/api/tournaments/${id}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: addForm.player_name,
        player_email: addForm.player_email || undefined,
        handicap: addForm.handicap ? parseFloat(addForm.handicap) : undefined,
      }),
    });
    if (savedStatus && savedStatus !== "registration_open") {
      await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: savedStatus }),
      });
    }
    setAdding(false);
    if (res.ok) { setAddForm({ player_name: "", player_email: "", handicap: "" }); fetchData(); flash("success", "Entry added."); }
    else { const er = await res.json(); flash("error", er.error ?? "Failed to add entry."); }
  }

  async function removeEntry(entryId: number, name: string) {
    if (!confirm(`Remove ${name} from this tournament?`)) return;
    const res = await fetch(`/api/tournaments/${id}/enter?entry_id=${entryId}`, { method: "DELETE" });
    if (res.ok) { fetchData(); flash("success", `${name} removed.`); }
    else flash("error", "Failed to remove entry.");
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-red-500">Not found.</div>;

  const { tournament: t, entries, teams } = data;
  const isLotd = t.format === "luck_of_the_draw" || t.format === "scramble" || t.format === "best_ball";
  const hasTeams = teams.length > 0;
  const canDraw = entries.length > 0 && ["registration_open", "registration_closed"].includes(t.status);
  const statusLabel = TOURNAMENT_STATUS_LABELS[t.status] ?? t.status;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <a href="/admin/tournaments" className="text-xs text-gray-400 hover:text-gray-600">← All Tournaments</a>
          <h1 className="text-2xl font-bold text-swan-dark mt-1">{t.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t.tournament_date} &bull; {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format} &bull; {t.holes} holes
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {statusLabel}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/tournaments/${t.id}`} target="_blank" rel="noreferrer"
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
            Public View ↗
          </a>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Status controls */}
      <div className="card">
        <h2 className="font-bold text-swan-green mb-3">Status</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { s: "registration_open",   label: "Open Registration" },
            { s: "registration_closed", label: "Close Registration" },
            { s: "scoring",             label: "Mark In Progress" },
            { s: "completed",           label: "Post Results" },
            { s: "cancelled",           label: "Cancel" },
          ].filter(({ s }) => s !== t.status).map(({ s, label }) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                s === "cancelled" ? "border-red-300 text-red-600 hover:bg-red-50" :
                s === "completed" ? "border-swan-green text-swan-green hover:bg-green-50" :
                "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="card">
        <h2 className="font-bold text-swan-green mb-3">Entries ({entries.length}{t.max_entries ? ` / ${t.max_entries}` : ""})</h2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Player</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 text-center font-medium">HCP</th>
                {hasTeams && <th className="pb-2 text-center font-medium">Team</th>}
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => {
                const team = teams.find((t) => t.id === e.team_id);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="py-2 font-medium">{e.player_name}</td>
                    <td className="py-2 text-gray-500 text-xs">{e.player_email ?? "—"}</td>
                    <td className="py-2 text-center">{e.handicap ?? "—"}</td>
                    {hasTeams && <td className="py-2 text-center text-xs">{team?.team_name ?? "—"}</td>}
                    <td className="py-2 text-right">
                      <button onClick={() => removeEntry(e.id, e.player_name)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add entry manually */}
        <form onSubmit={handleAddEntry} className="flex flex-wrap gap-3 items-end border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Player Name *</label>
            <input type="text" required className="input-field py-1.5 text-sm w-44"
              value={addForm.player_name} onChange={(e) => setAddForm({ ...addForm, player_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" className="input-field py-1.5 text-sm w-44"
              value={addForm.player_email} onChange={(e) => setAddForm({ ...addForm, player_email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">HCP</label>
            <input type="number" step="0.1" className="input-field py-1.5 text-sm w-20"
              value={addForm.handicap} onChange={(e) => setAddForm({ ...addForm, handicap: e.target.value })} />
          </div>
          <button type="submit" disabled={adding} className="btn-primary py-1.5 text-sm whitespace-nowrap">
            {adding ? "Adding…" : "+ Add Entry"}
          </button>
        </form>
      </div>

      {/* Draw */}
      {isLotd && (
        <div className="card">
          <h2 className="font-bold text-swan-green mb-2">Blind Draw</h2>
          <p className="text-sm text-gray-600 mb-4">
            Randomly assigns all registered players to teams of {t.team_size}.
            Running the draw again will re-shuffle all teams.
          </p>
          <button onClick={runDraw} disabled={!canDraw || working}
            className={`btn-primary ${!canDraw ? "opacity-50 cursor-not-allowed" : ""}`}>
            {working ? "Running Draw…" : hasTeams ? "Re-Run Draw" : "Run Draw"}
          </button>
          {!canDraw && entries.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">Add entries before running the draw.</p>
          )}
        </div>
      )}

      {/* Teams */}
      {hasTeams && (
        <div className="card">
          <h2 className="font-bold text-swan-green mb-4">Teams ({teams.length})</h2>

          {/* Tee time assignment */}
          <div className="flex flex-wrap gap-3 items-end mb-5 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
              <select className="input-field py-1.5 text-sm"
                value={teeStartTime} onChange={(e) => setTeeStartTime(e.target.value)}>
                {TEE_TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Interval (min)</label>
              <select className="input-field py-1.5 text-sm"
                value={teeInterval} onChange={(e) => setTeeInterval(e.target.value)}>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Hole</label>
              <select className="input-field py-1.5 text-sm"
                value={teeHole} onChange={(e) => setTeeHole(e.target.value)}>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <button onClick={assignTeeTimes} disabled={working}
              className="btn-primary py-1.5 text-sm whitespace-nowrap">
              Assign Tee Times
            </button>
          </div>

          {/* Score entry */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Players</th>
                <th className="pb-2 text-center font-medium w-20">Tee</th>
                <th className="pb-2 text-center font-medium w-24">Gross</th>
                <th className="pb-2 text-center font-medium w-24">Net</th>
                <th className="pb-2 text-center font-medium w-14">Place</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...teams].sort((a, b) => (a.place ?? 999) - (b.place ?? 999) || a.id - b.id).map((team) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="py-2 font-bold text-gray-400 text-center w-8">{team.place ?? "—"}</td>
                  <td className="py-2 font-medium">{team.team_name}</td>
                  <td className="py-2 text-xs text-gray-500">
                    {team.members.map((m) => m.player_name).join(", ")}
                  </td>
                  <td className="py-2 text-center font-mono text-xs">{team.tee_time ?? "—"}</td>
                  <td className="py-2 text-center">
                    <input
                      type="number"
                      className="input-field py-1 text-center text-sm w-20"
                      placeholder={team.gross_score?.toString() ?? "—"}
                      value={scoreEdits[team.id]?.gross ?? ""}
                      onChange={(e) => setScoreEdits((prev) => ({
                        ...prev,
                        [team.id]: { gross: e.target.value, net: prev[team.id]?.net ?? "" },
                      }))}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      type="number"
                      step="0.1"
                      className="input-field py-1 text-center text-sm w-20"
                      placeholder={team.net_score?.toString() ?? "—"}
                      value={scoreEdits[team.id]?.net ?? ""}
                      onChange={(e) => setScoreEdits((prev) => ({
                        ...prev,
                        [team.id]: { gross: prev[team.id]?.gross ?? "", net: e.target.value },
                      }))}
                    />
                  </td>
                  <td className="py-2 text-center font-bold text-swan-green">
                    {team.place ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {Object.keys(scoreEdits).length > 0 && (
            <button onClick={saveScores} disabled={working} className="btn-primary">
              {working ? "Saving…" : "Save Scores"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
