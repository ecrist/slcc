import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, execute } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id] — tournament detail with entries and teams
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const tournament = await queryOne("SELECT * FROM tournaments WHERE id = $1", [id]);
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await query(
    "SELECT * FROM tournament_entries WHERE tournament_id = $1 ORDER BY created_at ASC",
    [id]
  );

  const teams = await query<Record<string, unknown> & { members: Array<Record<string, unknown>> | null }>(
    `SELECT t.*,
       COALESCE(json_agg(json_build_object(
         'id', e.id, 'player_name', e.player_name, 'handicap', e.handicap, 'flight', e.flight
       )) FILTER (WHERE e.id IS NOT NULL), '[]') AS members
     FROM tournament_teams t
     LEFT JOIN tournament_entries e ON e.team_id = t.id
     WHERE t.tournament_id = $1
     GROUP BY t.id
     ORDER BY t.place ASC NULLS LAST, t.net_score ASC NULLS LAST, t.gross_score ASC NULLS LAST`,
    [id]
  );

  const teamsWithMembers = teams.map((t) => ({
    ...t,
    members: (t.members ?? []).filter((m) => m.id !== null),
  }));

  return NextResponse.json({ tournament, entries, teams: teamsWithMembers });
}

// PUT /api/tournaments/[id] — admin update
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await queryOne<{ id: number }>("SELECT id FROM tournaments WHERE id = $1", [id]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = [
    "title", "description", "tournament_date", "registration_deadline",
    "format", "team_size", "max_entries", "entry_fee", "holes",
    "status", "results_notes", "is_public",
  ];
  const updates = fields.filter((f) => f in body);
  if (updates.length === 0) return NextResponse.json({ ok: true });

  const setClauses = updates.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = [...updates.map((f) => body[f] ?? null), id];
  await execute(
    `UPDATE tournaments SET ${setClauses} WHERE id = $${updates.length + 1}`,
    values
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/tournaments/[id] — admin delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await execute("DELETE FROM tournaments WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
