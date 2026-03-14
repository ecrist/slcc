import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

// POST — run the blind draw for a luck_of_the_draw tournament
// Also works as a simple random team assignment for scramble/best_ball when
// players registered individually (same algorithm, different label).
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as {
    id: number; format: string; team_size: number; status: string;
  } | undefined;
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const drawableFormats = ["luck_of_the_draw", "stroke_play", "stableford", "scramble", "best_ball"];
  if (!drawableFormats.includes(tournament.format)) {
    return NextResponse.json({ error: "Draw is not applicable for this format" }, { status: 400 });
  }

  // Pull entries in random order (SQLite RANDOM() gives true randomness per draw)
  const entries = db
    .prepare("SELECT id, handicap FROM tournament_entries WHERE tournament_id = ? ORDER BY RANDOM()")
    .all(id) as { id: number; handicap: number | null }[];

  if (entries.length < 1) {
    return NextResponse.json({ error: "No entries to draw" }, { status: 400 });
  }

  const teamSize = tournament.team_size ?? 2;

  // Clear any previous draw
  db.prepare("UPDATE tournament_entries SET team_id = NULL, flight = NULL WHERE tournament_id = ?").run(id);
  db.prepare("DELETE FROM tournament_teams WHERE tournament_id = ?").run(id);

  // For stroke_play / stableford: one "team" per player (individual format)
  const isIndividual = ["stroke_play", "stableford"].includes(tournament.format);

  const insertTeam = db.prepare(
    "INSERT INTO tournament_teams (tournament_id, team_name) VALUES (?, ?)"
  );
  const assignEntry = db.prepare(
    "UPDATE tournament_entries SET team_id = ?, flight = ? WHERE id = ?"
  );

  db.transaction(() => {
    if (isIndividual) {
      entries.forEach((entry, i) => {
        const teamResult = insertTeam.run(id, `Player ${i + 1}`);
        assignEntry.run(teamResult.lastInsertRowid, null, entry.id);
      });
    } else {
      // Group into teams of teamSize; last team may be smaller
      const chunks: (typeof entries)[] = [];
      for (let i = 0; i < entries.length; i += teamSize) {
        chunks.push(entries.slice(i, i + teamSize));
      }

      // If the last chunk is less than half team size AND there are other chunks,
      // distribute remaining players across the last full teams
      if (chunks.length > 1 && chunks[chunks.length - 1].length < Math.ceil(teamSize / 2)) {
        const leftovers = chunks.pop()!;
        leftovers.forEach((entry, i) => {
          chunks[i % chunks.length].push(entry);
        });
      }

      chunks.forEach((chunk, i) => {
        const teamResult = insertTeam.run(id, `Team ${i + 1}`);
        chunk.forEach((entry) => assignEntry.run(teamResult.lastInsertRowid, null, entry.id));
      });
    }
  })();

  db.prepare("UPDATE tournaments SET status = 'draw_complete' WHERE id = ?").run(id);

  const teamCount = (db
    .prepare("SELECT COUNT(*) as n FROM tournament_teams WHERE tournament_id = ?")
    .get(id) as { n: number }).n;

  return NextResponse.json({ ok: true, teams_created: teamCount });
}
