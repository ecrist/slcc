import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, withTransaction } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await queryOne<{ id: number; format: string }>(
    "SELECT id, format FROM tournaments WHERE id = $1",
    [id]
  );
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { scores, status } = (await request.json()) as {
    scores?: {
      team_id: number;
      gross_score?: number | null;
      net_score?: number | null;
      tee_time?: string;
      tee_hole?: number;
      flight?: string;
    }[];
    status?: string;
  };

  await withTransaction(async (q) => {
    if (scores?.length) {
      for (const s of scores) {
        await q(
          `UPDATE tournament_teams SET
             gross_score = COALESCE($1, gross_score),
             net_score   = COALESCE($2, net_score),
             tee_time    = COALESCE($3, tee_time),
             tee_hole    = COALESCE($4, tee_hole),
             flight      = COALESCE($5, flight)
           WHERE id = $6 AND tournament_id = $7`,
          [
            s.gross_score ?? null, s.net_score ?? null,
            s.tee_time ?? null, s.tee_hole ?? null,
            s.flight ?? null,
            s.team_id, id,
          ]
        );
      }

      // Re-rank: lower net/gross score wins; null scores unranked
      const ranked = await query<{ id: number }>(
        `SELECT id FROM tournament_teams
         WHERE tournament_id = $1 AND gross_score IS NOT NULL
         ORDER BY net_score ASC NULLS LAST, gross_score ASC NULLS LAST`,
        [id]
      );
      for (let idx = 0; idx < ranked.length; idx++) {
        await q(
          "UPDATE tournament_teams SET place = $1 WHERE id = $2",
          [idx + 1, ranked[idx].id]
        );
      }
    }

    if (status) {
      const valid = ["scoring", "completed", "draw_complete", "registration_open", "registration_closed", "cancelled"];
      if (valid.includes(status)) {
        await q("UPDATE tournaments SET status = $1 WHERE id = $2", [status, id]);
      }
    }
  });

  return NextResponse.json({ ok: true });
}
