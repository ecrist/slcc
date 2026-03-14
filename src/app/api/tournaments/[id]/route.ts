import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id] — tournament detail with entries and teams
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id);
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = db
    .prepare("SELECT * FROM tournament_entries WHERE tournament_id = ? ORDER BY created_at ASC")
    .all(id);

  const teams = db
    .prepare(
      `SELECT t.*, json_group_array(json_object(
          'id', e.id, 'player_name', e.player_name, 'handicap', e.handicap, 'flight', e.flight
        )) AS members
       FROM tournament_teams t
       LEFT JOIN tournament_entries e ON e.team_id = t.id
       WHERE t.tournament_id = ?
       GROUP BY t.id
       ORDER BY t.place ASC NULLS LAST, t.net_score ASC NULLS LAST, t.gross_score ASC NULLS LAST`
    )
    .all(id) as (Record<string, unknown> & { members: string })[];

  const teamsWithMembers = teams.map((t) => ({
    ...t,
    members: JSON.parse(t.members as string).filter((m: Record<string, unknown>) => m.id !== null),
  }));

  return NextResponse.json({ tournament, entries, teams: teamsWithMembers });
}

// PUT /api/tournaments/[id] — admin update
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT id FROM tournaments WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = [
    "title", "description", "tournament_date", "registration_deadline",
    "format", "team_size", "max_entries", "entry_fee", "holes",
    "status", "results_notes", "is_public",
  ];
  const updates = fields.filter((f) => f in body);
  if (updates.length === 0) return NextResponse.json({ ok: true });

  const setClauses = updates.map((f) => `${f} = ?`).join(", ");
  const values = updates.map((f) => body[f] ?? null);
  db.prepare(`UPDATE tournaments SET ${setClauses} WHERE id = ?`).run(...values, id);

  return NextResponse.json({ ok: true });
}

// DELETE /api/tournaments/[id] — admin delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM tournaments WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
