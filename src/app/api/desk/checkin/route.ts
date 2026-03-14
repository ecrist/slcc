import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    type = "walk_in",
    name,
    email,
    players = 1,
    holes = 18,
    carts_requested = 0,
    buggies_requested = 0,
    clubs_requested = 0,
    personal_cart_drop = 0,
    membership_id,
    tee_time_id,
    notes,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();

  const result = db
    .prepare(
      `INSERT INTO checkins
        (type, name, email, players, holes, carts_requested, buggies_requested,
         clubs_requested, personal_cart_drop, membership_id, tee_time_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      type, name, email ?? null, players, holes,
      carts_requested, buggies_requested, clubs_requested, personal_cart_drop,
      membership_id ?? null, tee_time_id ?? null, notes ?? null
    );

  // If linked to a tee time reservation, mark it as checked in
  if (tee_time_id) {
    const row = db.prepare("SELECT group_booking_id FROM tee_times WHERE id = ?").get(tee_time_id) as
      | { group_booking_id: string | null } | undefined;
    if (row?.group_booking_id) {
      db.prepare(
        "UPDATE tee_times SET checked_in = 1, checked_in_at = datetime('now') WHERE group_booking_id = ?"
      ).run(row.group_booking_id);
    } else {
      db.prepare(
        "UPDATE tee_times SET checked_in = 1, checked_in_at = datetime('now') WHERE id = ?"
      ).run(tee_time_id);
    }
  }

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
