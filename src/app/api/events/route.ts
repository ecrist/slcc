import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export async function GET() {
  const events = await query(
    "SELECT * FROM events WHERE is_public = 1 AND event_date >= CURRENT_DATE::text ORDER BY event_date ASC"
  );
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, event_date, start_time, end_time, location, event_type, max_participants, cost } = body;

  if (!title || !event_date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }

  const { id } = await execute(
    `INSERT INTO events (title, description, event_date, start_time, end_time, location, event_type, max_participants, cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      title, description || null, event_date,
      start_time || null, end_time || null,
      location || "Swan Lake Country Club",
      event_type || "general",
      max_participants || null, cost || null,
    ]
  );

  return NextResponse.json({ id, message: "Event created" }, { status: 201 });
}
