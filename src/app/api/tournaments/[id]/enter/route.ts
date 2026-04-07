import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { sendTournamentRegistration } from "@/lib/email";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/types";
import type { TournamentFormat } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const tournament = await queryOne<{
    id: number; title: string; tournament_date: string; format: TournamentFormat;
    entry_fee: number; max_entries: number | null; status: string;
  }>(
    "SELECT * FROM tournaments WHERE id = $1 AND is_public = 1",
    [id]
  );

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.status !== "registration_open") {
    return NextResponse.json({ error: "Registration is not open for this tournament" }, { status: 400 });
  }

  if (tournament.max_entries) {
    const countRow = await queryOne<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM tournament_entries WHERE tournament_id = $1",
      [id]
    );
    if ((countRow?.n ?? 0) >= tournament.max_entries) {
      return NextResponse.json({ error: "This tournament is full" }, { status: 400 });
    }
  }

  const body = await request.json();
  const { player_name, player_email, player_phone, handicap, notes } = body;

  if (!player_name) {
    return NextResponse.json({ error: "player_name is required" }, { status: 400 });
  }

  const { id: entryId } = await execute(
    `INSERT INTO tournament_entries
       (tournament_id, player_name, player_email, player_phone, handicap, notes, payment_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      id, player_name, player_email ?? null, player_phone ?? null,
      handicap ?? null, notes ?? null,
      tournament.entry_fee > 0 ? "pending" : "free",
    ]
  );

  if (player_email) {
    await sendTournamentRegistration({
      to: player_email,
      player_name,
      tournament_title: tournament.title,
      tournament_date: tournament.tournament_date,
      format: TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format,
      entry_fee: tournament.entry_fee,
    });
  }

  return NextResponse.json({ id: entryId }, { status: 201 });
}

// DELETE — withdraw entry
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const entryId = request.nextUrl.searchParams.get("entry_id");
  if (!entryId) return NextResponse.json({ error: "entry_id required" }, { status: 400 });

  const entry = await queryOne<{ id: number }>(
    "SELECT id FROM tournament_entries WHERE id = $1 AND tournament_id = $2",
    [entryId, id]
  );
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM tournament_entries WHERE id = $1", [entryId]);
  return NextResponse.json({ ok: true });
}
