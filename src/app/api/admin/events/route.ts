import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, execute } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return null;
  }
  return session;
}

// GET — all events (public + private) for admin
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await query(
    "SELECT * FROM events ORDER BY event_date ASC, start_time ASC"
  );
  return NextResponse.json(events);
}

// POST — create event (admin)
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    title, description, event_date, start_time, end_time,
    location, event_type, max_participants, cost, is_public,
  } = body;

  if (!title || !event_date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }

  const result = await execute(
    `INSERT INTO events
       (title, description, event_date, start_time, end_time, location,
        event_type, max_participants, cost, is_public)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      title, description || null, event_date,
      start_time || null, end_time || null,
      location || "Swan Lake Country Club",
      event_type || "general",
      max_participants || null,
      cost || null,
      is_public === false || is_public === 0 ? 0 : 1,
    ]
  );

  return NextResponse.json({ id: result.id, message: "Event created" }, { status: 201 });
}

// PATCH — update event fields (admin)
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const allowed = ["title", "description", "event_date", "start_time", "end_time",
                   "location", "event_type", "max_participants", "cost", "is_public"];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(", ");
  const values = updates.map(([, v]) => v);
  await execute(
    `UPDATE events SET ${setClauses} WHERE id = $${values.length + 1}`,
    [...values, id]
  );

  return NextResponse.json({ message: "Event updated" });
}

// DELETE — remove event (admin)
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await execute("DELETE FROM events WHERE id = $1", [id]);
  return NextResponse.json({ message: "Event deleted" });
}
