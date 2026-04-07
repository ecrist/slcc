import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";

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

  const event = await queryOne<{ max_participants: number | null; current_participants: number }>(
    "SELECT max_participants, current_participants FROM events WHERE id = $1",
    [id]
  );

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const size = party_size || 1;

  if (event.max_participants && event.current_participants + size > event.max_participants) {
    return NextResponse.json({ error: "Not enough spots available" }, { status: 409 });
  }

  await execute(
    "INSERT INTO event_registrations (event_id, name, email, phone, party_size) VALUES ($1,$2,$3,$4,$5)",
    [id, name, email, phone || null, size]
  );

  await execute(
    "UPDATE events SET current_participants = current_participants + $1 WHERE id = $2",
    [size, id]
  );

  return NextResponse.json({ message: "Registration confirmed" }, { status: 201 });
}
