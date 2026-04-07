import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, withTransaction } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await queryOne<{ id: number; format: string; team_size: number; status: string }>(
    "SELECT * FROM tournaments WHERE id = $1",
    [id]
  );
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const drawableFormats = ["luck_of_the_draw", "stroke_play", "stableford", "scramble", "best_ball"];
  if (!drawableFormats.includes(tournament.format)) {
    return NextResponse.json({ error: "Draw is not applicable for this format" }, { status: 400 });
  }

  // Pull entries in random order
  const entries = await query<{ id: number; handicap: number | null }>(
    "SELECT id, handicap FROM tournament_entries WHERE tournament_id = $1 ORDER BY RANDOM()",
    [id]
  );

  if (entries.length < 1) {
    return NextResponse.json({ error: "No entries to draw" }, { status: 400 });
  }

  const teamSize   = tournament.team_size ?? 2;
  const isIndividual = ["stroke_play", "stableford"].includes(tournament.format);

  await withTransaction(async (q) => {
    // Clear previous draw
    await q("UPDATE tournament_entries SET team_id = NULL, flight = NULL WHERE tournament_id = $1", [id]);
    await q("DELETE FROM tournament_teams WHERE tournament_id = $1", [id]);

    if (isIndividual) {
      for (let i = 0; i < entries.length; i++) {
        const teamRes = await q(
          "INSERT INTO tournament_teams (tournament_id, team_name) VALUES ($1,$2) RETURNING id",
          [id, `Player ${i + 1}`]
        );
        await q(
          "UPDATE tournament_entries SET team_id = $1, flight = NULL WHERE id = $2",
          [teamRes.rows[0].id, entries[i].id]
        );
      }
    } else {
      // Group into teams of teamSize
      const chunks: (typeof entries)[] = [];
      for (let i = 0; i < entries.length; i += teamSize) {
        chunks.push(entries.slice(i, i + teamSize));
      }
      // Redistribute small remainder across existing teams
      if (chunks.length > 1 && chunks[chunks.length - 1].length < Math.ceil(teamSize / 2)) {
        const leftovers = chunks.pop()!;
        leftovers.forEach((entry, i) => chunks[i % chunks.length].push(entry));
      }

      for (let i = 0; i < chunks.length; i++) {
        const teamRes = await q(
          "INSERT INTO tournament_teams (tournament_id, team_name) VALUES ($1,$2) RETURNING id",
          [id, `Team ${i + 1}`]
        );
        for (const entry of chunks[i]) {
          await q(
            "UPDATE tournament_entries SET team_id = $1, flight = NULL WHERE id = $2",
            [teamRes.rows[0].id, entry.id]
          );
        }
      }
    }

    await q("UPDATE tournaments SET status = 'draw_complete' WHERE id = $1", [id]);
  });

  const countRow = await queryOne<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM tournament_teams WHERE tournament_id = $1",
    [id]
  );

  return NextResponse.json({ ok: true, teams_created: countRow?.n ?? 0 });
}
