import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, email, phone, party_size } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const db = getDb();

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as {
    max_participants: number | null;
    current_participants: number;
  } | undefined;

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const size = party_size || 1;

  if (event.max_participants && event.current_participants + size > event.max_participants) {
    return NextResponse.json({ error: "Not enough spots available" }, { status: 409 });
  }

  db.prepare(
    "INSERT INTO event_registrations (event_id, name, email, phone, party_size) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, email, phone || null, size);

  db.prepare(
    "UPDATE events SET current_participants = current_participants + ? WHERE id = ?"
  ).run(size, id);

  return NextResponse.json({ message: "Registration confirmed" }, { status: 201 });
}
