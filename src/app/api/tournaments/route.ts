import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

// GET /api/tournaments — public list
export async function GET() {
  const tournaments = await query(
    `SELECT t.*,
       (SELECT COUNT(*)::int FROM tournament_entries e WHERE e.tournament_id = t.id) AS entry_count
     FROM tournaments t
     WHERE t.is_public = 1
     ORDER BY t.tournament_date DESC`
  );
  return NextResponse.json(tournaments);
}

// POST /api/tournaments — admin create
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, description, tournament_date, registration_deadline,
    format, team_size, max_entries, entry_fee, holes, is_public,
  } = body;

  if (!title || !tournament_date || !format) {
    return NextResponse.json({ error: "title, tournament_date, and format are required" }, { status: 400 });
  }

  const validFormats = ["luck_of_the_draw", "stroke_play", "stableford", "scramble", "best_ball", "match_play"];
  if (!validFormats.includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const { id } = await execute(
    `INSERT INTO tournaments
       (title, description, tournament_date, registration_deadline, format, team_size,
        max_entries, entry_fee, holes, is_public)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      title, description ?? null, tournament_date,
      registration_deadline ?? null, format,
      team_size ?? 2, max_entries ?? null,
      entry_fee ?? 0, holes ?? 18,
      is_public !== false ? 1 : 0,
    ]
  );

  return NextResponse.json({ id }, { status: 201 });
}
