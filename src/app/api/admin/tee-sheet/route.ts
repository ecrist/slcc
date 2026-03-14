import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const db = getDb();
  const slots = db
    .prepare(
      `SELECT id, time, players, player_name, player_email, player_phone,
              holes, carts_requested, buggies_requested, clubs_requested,
              personal_cart_drop, status, notes, group_booking_id, slot_index,
              checked_in, checked_in_at
       FROM tee_times
       WHERE date = ?
       ORDER BY time ASC`
    )
    .all(date);

  return NextResponse.json(slots);
}
