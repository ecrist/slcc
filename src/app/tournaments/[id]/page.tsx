"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS,
  type Tournament, type TournamentEntry, type TournamentTeam,
} from "@/lib/types";

interface TeamWithMembers extends TournamentTeam {
  members: { id: number; player_name: string; handicap: number | null }[];
}

interface TournamentDetail {
  tournament: Tournament;
  entries: TournamentEntry[];
  teams: TeamWithMembers[];
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "entries" | "leaderboard">("info");

  // Registration form
  const [regForm, setRegForm] = useState({ player_name: "", player_email: "", player_phone: "", handicap: "" });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regResult, setRegResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegSubmitting(true);
    setRegResult(null);
    try {
      const res = await fetch(`/api/tournaments/${id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: regForm.player_name,
          player_email: regForm.player_email || undefined,
          player_phone: regForm.player_phone || undefined,
          handicap: regForm.handicap ? parseFloat(regForm.handicap) : undefined,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setRegResult({ type: "success", message: "You're registered! Check your email for confirmation." });
        setRegForm({ player_name: "", player_email: "", player_phone: "", handicap: "" });
        // Refresh data
        fetch(`/api/tournaments/${id}`).then((r) => r.json()).then(setData);
      } else {
        setRegResult({ type: "error", message: body.error ?? "Registration failed." });
      }
    } catch {
      setRegResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setRegSubmitting(false);
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!data) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-500">Tournament not found.</div>;

  const { tournament: t, entries, teams } = data;
  const dateLabel = new Date(t.tournament_date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const isOpen = t.status === "registration_open";
  const isFull = t.max_entries != null && entries.length >= t.max_entries;
  const hasResults = t.status === "completed" || (t.status === "scoring" && teams.some((tm) => tm.gross_score != null));
  const hasTeams = teams.length > 0;
  const isLotd = t.format === "luck_of_the_draw";
  const statusLabel = TOURNAMENT_STATUS_LABELS[t.status] ?? t.status;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-2">
        <a href="/tournaments" className="text-sm text-swan-green hover:underline">← All Tournaments</a>
      </div>
      <h1 className="section-title">{t.title}</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          t.status === "registration_open" ? "bg-green-100 text-green-800" :
          t.status === "completed" ? "bg-gray-100 text-gray-600" :
          "bg-blue-100 text-blue-800"
        }`}>{statusLabel}</span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-swan-green/10 text-swan-green">
          {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(["info", hasTeams ? "leaderboard" : null, "entries"] as const).filter(Boolean).map((tabKey) => (
          <button
            key={tabKey!}
            onClick={() => setTab(tabKey!)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === tabKey ? "border-swan-green text-swan-green" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tabKey === "leaderboard" ? (hasResults ? "Results" : "Draw / Teams") : tabKey}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === "info" && (
        <div className="space-y-6">
          <div className="card">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Date</dt><dd className="font-semibold">{dateLabel}</dd></div>
              <div><dt className="text-gray-500">Format</dt><dd className="font-semibold">{TOURNAMENT_FORMAT_LABELS[t.format]}</dd></div>
              <div><dt className="text-gray-500">Holes</dt><dd className="font-semibold">{t.holes}</dd></div>
              {isLotd && <div><dt className="text-gray-500">Team Size</dt><dd className="font-semibold">{t.team_size} players</dd></div>}
              <div>
                <dt className="text-gray-500">Entry Fee</dt>
                <dd className="font-semibold">{t.entry_fee > 0 ? `$${t.entry_fee}` : "Free"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Entries</dt>
                <dd className="font-semibold">{entries.length}{t.max_entries ? ` / ${t.max_entries}` : ""}</dd>
              </div>
              {t.registration_deadline && (
                <div><dt className="text-gray-500">Register by</dt><dd className="font-semibold">{t.registration_deadline}</dd></div>
              )}
            </dl>
            {t.description && <p className="mt-4 text-gray-600 text-sm border-t border-gray-100 pt-4">{t.description}</p>}
            {t.results_notes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 border-t border-gray-100 pt-4">
                <strong>Results note:</strong> {t.results_notes}
              </div>
            )}
          </div>

          {/* Registration form */}
          {isOpen && !isFull && (
            <div className="card">
              <h2 className="text-lg font-bold text-swan-green mb-4">Register</h2>
              {regResult && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${regResult.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {regResult.message}
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" required className="input-field" value={regForm.player_name}
                      onChange={(e) => setRegForm({ ...regForm, player_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Handicap</label>
                    <input type="number" step="0.1" min="-10" max="54" className="input-field" placeholder="e.g. 14.2"
                      value={regForm.handicap} onChange={(e) => setRegForm({ ...regForm, handicap: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="input-field" value={regForm.player_email}
                      onChange={(e) => setRegForm({ ...regForm, player_email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" className="input-field" value={regForm.player_phone}
                      onChange={(e) => setRegForm({ ...regForm, player_phone: e.target.value })} />
                  </div>
                </div>
                {isLotd && (
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    This is a <strong>Luck of the Draw</strong> scramble — you&apos;ll be randomly assigned to a team.
                    Teams are drawn after registration closes.
                  </p>
                )}
                <button type="submit" disabled={regSubmitting} className="btn-primary w-full">
                  {regSubmitting ? "Registering…" : t.entry_fee > 0 ? `Register — $${t.entry_fee}` : "Register Free"}
                </button>
              </form>
            </div>
          )}

          {isOpen && isFull && (
            <div className="card text-center py-8">
              <p className="text-gray-600 font-medium">This tournament is full.</p>
              <p className="text-sm text-gray-500 mt-1">Call (218) 885-3543 to be added to the waitlist.</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard / Teams tab */}
      {tab === "leaderboard" && (
        <div>
          {hasResults ? (
            <>
              <h2 className="text-lg font-bold text-swan-dark mb-4">
                {t.status === "completed" ? "Final Results" : "Leaderboard"}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-xl shadow text-sm">
                  <thead className="bg-swan-green text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-10">Place</th>
                      <th className="px-4 py-3 text-left font-medium">Team / Player</th>
                      {teams[0]?.tee_time && <th className="px-4 py-3 text-center font-medium">Tee Time</th>}
                      <th className="px-4 py-3 text-center font-medium">Gross</th>
                      <th className="px-4 py-3 text-center font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...teams].sort((a, b) => (a.place ?? 999) - (b.place ?? 999)).map((team) => (
                      <tr key={team.id} className={team.place === 1 ? "bg-amber-50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3 font-bold text-center">
                          {team.place ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{team.team_name}</p>
                          <p className="text-xs text-gray-500">{team.members.map((m) => m.player_name).join(", ")}</p>
                        </td>
                        {teams[0]?.tee_time && (
                          <td className="px-4 py-3 text-center font-mono text-xs">{team.tee_time ?? "—"}</td>
                        )}
                        <td className="px-4 py-3 text-center font-bold">{team.gross_score ?? "—"}</td>
                        <td className="px-4 py-3 text-center font-bold text-swan-green">
                          {team.net_score != null ? team.net_score : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-swan-dark mb-4">Teams</h2>
              <div className="grid gap-3">
                {teams.map((team) => (
                  <div key={team.id} className="card py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-swan-dark">{team.team_name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {team.members.map((m) => (
                            <span key={m.id}>
                              {m.player_name}
                              {m.handicap != null ? ` (${m.handicap})` : ""}
                            </span>
                          )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, " · ", el], [])}
                        </p>
                      </div>
                      {team.tee_time && (
                        <span className="font-mono text-sm font-bold text-swan-green shrink-0">{team.tee_time}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Entries tab */}
      {tab === "entries" && (
        <div>
          <h2 className="text-lg font-bold text-swan-dark mb-4">{entries.length} Registered</h2>
          {entries.length === 0 ? (
            <p className="text-gray-500">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Player</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600">HCP</th>
                    {hasTeams && <th className="px-4 py-2 text-center font-medium text-gray-600">Team</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => {
                    const team = teams.find((t) => t.id === e.team_id);
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{e.player_name}</td>
                        <td className="px-4 py-2 text-center text-gray-500">
                          {e.handicap != null ? e.handicap : "—"}
                        </td>
                        {hasTeams && (
                          <td className="px-4 py-2 text-center text-gray-500">
                            {team ? team.team_name : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
