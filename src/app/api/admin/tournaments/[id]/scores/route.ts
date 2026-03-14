import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

// PUT — update scores for one or more teams, then re-rank
// Body: { scores: [{ team_id, gross_score, net_score, tee_time?, tee_hole?, flight? }] }
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare("SELECT id, format FROM tournaments WHERE id = ?").get(id) as
    { id: number; format: string } | undefined;
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { scores, status } = await request.json() as {
    scores?: { team_id: number; gross_score?: number | null; net_score?: number | null; tee_time?: string; tee_hole?: number; flight?: string }[];
    status?: string;
  };

  db.transaction(() => {
    if (scores?.length) {
      const stmt = db.prepare(`
        UPDATE tournament_teams
        SET
          gross_score = COALESCE(?, gross_score),
          net_score = COALESCE(?, net_score),
          tee_time = COALESCE(?, tee_time),
          tee_hole = COALESCE(?, tee_hole),
          flight = COALESCE(?, flight)
        WHERE id = ? AND tournament_id = ?
      `);
      for (const s of scores) {
        stmt.run(
          s.gross_score ?? null, s.net_score ?? null,
          s.tee_time ?? null, s.tee_hole ?? null,
          s.flight ?? null,
          s.team_id, id,
        );
      }

      // Recalculate places (lower net/gross = better; null scores unranked)
      const sortCol = ["stroke_play", "stableford"].includes(tournament.format)
        ? "net_score ASC NULLS LAST, gross_score ASC NULLS LAST"
        : "net_score ASC NULLS LAST, gross_score ASC NULLS LAST";

      const ranked = db
        .prepare(
          `SELECT id FROM tournament_teams WHERE tournament_id = ? AND gross_score IS NOT NULL ORDER BY ${sortCol}`
        )
        .all(id) as { id: number }[];

      ranked.forEach(({ id: teamId }, idx) => {
        db.prepare("UPDATE tournament_teams SET place = ? WHERE id = ?").run(idx + 1, teamId);
      });
    }

    if (status) {
      const valid = ["scoring", "completed", "draw_complete", "registration_open", "registration_closed", "cancelled"];
      if (valid.includes(status)) {
        db.prepare("UPDATE tournaments SET status = ? WHERE id = ?").run(status, id);
      }
    }
  })();

  return NextResponse.json({ ok: true });
}
