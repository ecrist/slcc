import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { queryOne, execute } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
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
    contact_id,
    tee_time_id,
    notes,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { id } = await execute(
    `INSERT INTO checkins
       (type, name, email, players, holes, carts_requested, buggies_requested,
        clubs_requested, personal_cart_drop, membership_id, contact_id, tee_time_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      type, name, email ?? null, players, holes,
      carts_requested, buggies_requested, clubs_requested, personal_cart_drop,
      membership_id ?? null, contact_id ?? null, tee_time_id ?? null, notes ?? null,
    ]
  );

  // If linked to a tee time, mark the group as checked in
  if (tee_time_id) {
    const row = await queryOne<{ group_booking_id: string | null }>(
      "SELECT group_booking_id FROM tee_times WHERE id = $1",
      [tee_time_id]
    );
    if (row?.group_booking_id) {
      await execute(
        "UPDATE tee_times SET checked_in = 1, checked_in_at = NOW() WHERE group_booking_id = $1",
        [row.group_booking_id]
      );
    } else {
      await execute(
        "UPDATE tee_times SET checked_in = 1, checked_in_at = NOW() WHERE id = $1",
        [tee_time_id]
      );
    }
  }

  return NextResponse.json({ id }, { status: 201 });
}
