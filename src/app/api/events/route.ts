import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const events = db
    .prepare("SELECT * FROM events WHERE is_public = 1 AND event_date >= date('now') ORDER BY event_date ASC")
    .all();
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, event_date, start_time, end_time, location, event_type, max_participants, cost } = body;

  if (!title || !event_date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO events (title, description, event_date, start_time, end_time, location, event_type, max_participants, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    title, description || null, event_date,
    start_time || null, end_time || null,
    location || "Swan Lake Country Club",
    event_type || "general",
    max_participants || null, cost || null
  );

  return NextResponse.json({ id: result.lastInsertRowid, message: "Event created" }, { status: 201 });
}
