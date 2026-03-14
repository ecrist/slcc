import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendTournamentRegistration } from "@/lib/email";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/types";
import type { TournamentFormat } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const tournament = db
    .prepare("SELECT * FROM tournaments WHERE id = ? AND is_public = 1")
    .get(id) as {
      id: number; title: string; tournament_date: string; format: TournamentFormat;
      entry_fee: number; max_entries: number | null; status: string;
    } | undefined;

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.status !== "registration_open") {
    return NextResponse.json({ error: "Registration is not open for this tournament" }, { status: 400 });
  }

  if (tournament.max_entries) {
    const count = (db
      .prepare("SELECT COUNT(*) as n FROM tournament_entries WHERE tournament_id = ?")
      .get(id) as { n: number }).n;
    if (count >= tournament.max_entries) {
      return NextResponse.json({ error: "This tournament is full" }, { status: 400 });
    }
  }

  const body = await request.json();
  const { player_name, player_email, player_phone, handicap, notes } = body;

  if (!player_name) {
    return NextResponse.json({ error: "player_name is required" }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO tournament_entries
        (tournament_id, player_name, player_email, player_phone, handicap, notes, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id, player_name, player_email ?? null, player_phone ?? null,
      handicap ?? null, notes ?? null,
      tournament.entry_fee > 0 ? "pending" : "free",
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

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

// DELETE — withdraw entry
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const entryId = request.nextUrl.searchParams.get("entry_id");
  if (!entryId) return NextResponse.json({ error: "entry_id required" }, { status: 400 });

  const db = getDb();
  const entry = db
    .prepare("SELECT id FROM tournament_entries WHERE id = ? AND tournament_id = ?")
    .get(entryId, id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM tournament_entries WHERE id = ?").run(entryId);
  return NextResponse.json({ ok: true });
}
