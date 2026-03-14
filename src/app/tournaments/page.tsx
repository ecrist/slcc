import Link from "next/link";
import { getDb } from "@/lib/db";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS, type Tournament } from "@/lib/types";

export const revalidate = 60;

export default async function TournamentsPage() {
  const db = getDb();
  const tournaments = db
    .prepare(
      `SELECT t.*,
         (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id = t.id) AS entry_count
       FROM tournaments t
       WHERE t.is_public = 1
       ORDER BY t.tournament_date DESC`
    )
    .all() as (Tournament & { entry_count: number })[];

  const upcoming = tournaments.filter((t) => t.tournament_date >= new Date().toISOString().split("T")[0]);
  const past = tournaments.filter((t) => t.tournament_date < new Date().toISOString().split("T")[0]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Tournaments</h1>
      <p className="text-gray-600 mb-10 max-w-2xl">
        Swan Lake Country Club hosts weekly Luck of the Draw scrambles and a full schedule of
        seasonal tournaments. Register online or call the clubhouse at (218) 885-3543.
      </p>

      {upcoming.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-swan-dark mb-4">Upcoming</h2>
          <div className="space-y-4 mb-12">
            {upcoming.map((t) => <TournamentCard key={t.id} t={t} />)}
          </div>
        </>
      )}

      {upcoming.length === 0 && (
        <div className="card text-center py-12 mb-12">
          <p className="text-gray-500">No upcoming tournaments scheduled. Check back soon!</p>
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-swan-dark mb-4">Past Results</h2>
          <div className="space-y-4">
            {past.map((t) => <TournamentCard key={t.id} t={t} />)}
          </div>
        </>
      )}
    </div>
  );
}

function TournamentCard({ t }: { t: Tournament & { entry_count: number } }) {
  const dateLabel = new Date(t.tournament_date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const statusLabel = TOURNAMENT_STATUS_LABELS[t.status] ?? t.status;
  const statusColor =
    t.status === "registration_open" ? "bg-green-100 text-green-800" :
    t.status === "completed" ? "bg-gray-100 text-gray-600" :
    t.status === "cancelled" ? "bg-red-100 text-red-700" :
    "bg-blue-100 text-blue-800";

  const isFull = t.max_entries != null && t.entry_count >= t.max_entries;

  return (
    <Link href={`/tournaments/${t.id}`} className="card block hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-gray-400">
              {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
            </span>
          </div>
          <h3 className="text-lg font-bold text-swan-dark">{t.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel} &bull; {t.holes} holes</p>
          {t.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {t.entry_fee > 0 && (
            <p className="text-lg font-bold text-swan-green">${t.entry_fee}</p>
          )}
          <p className="text-sm text-gray-500">
            {t.entry_count} entered
            {t.max_entries ? ` / ${t.max_entries}` : ""}
          </p>
          {isFull && t.status === "registration_open" && (
            <p className="text-xs text-red-600 font-medium mt-1">Full</p>
          )}
        </div>
      </div>
    </Link>
  );
}
