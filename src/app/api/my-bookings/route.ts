import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, queryOne, execute } from "@/lib/db";

/**
 * Returns upcoming + recent past bookings for the signed-in user,
 * keyed by player_email = session.user.email.
 *
 * Bookings are deduplicated by group_booking_id so a 12-player party that
 * spans 3 slots shows up as a single row.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Fetch all the user's non-cancelled tee times in a wide window. We split
  // upcoming vs past on the server to keep the client simple.
  const today = new Date().toISOString().slice(0, 10);

  // Pull the lead row of each group (slot_index = 0) to get the canonical
  // "start time" + party-level info, but also count slots so we can show
  // the time range for big parties.
  const rows = await query<{
    id: number;
    date: string;
    time: string;
    end_time: string | null;
    players: number;
    holes: number;
    player_name: string;
    player_email: string;
    player_phone: string | null;
    notes: string | null;
    group_booking_id: string | null;
    carts_requested: number;
    buggies_requested: number;
    clubs_requested: number;
    personal_cart_drop: number;
    status: string;
  }>(
    `WITH grouped AS (
       SELECT
         MIN(id)                                AS id,
         date,
         MIN(time)                              AS time,
         MAX(time)                              AS end_time,
         MAX(players)                           AS players,
         MAX(holes)                             AS holes,
         MAX(player_name)                       AS player_name,
         MAX(player_email)                      AS player_email,
         MAX(player_phone)                      AS player_phone,
         MAX(notes)                             AS notes,
         group_booking_id,
         MAX(carts_requested)                   AS carts_requested,
         MAX(buggies_requested)                 AS buggies_requested,
         MAX(clubs_requested)                   AS clubs_requested,
         MAX(personal_cart_drop)                AS personal_cart_drop,
         MAX(status)                            AS status
       FROM tee_times
       WHERE LOWER(player_email) = LOWER($1)
         AND status != 'cancelled'
       GROUP BY date, group_booking_id
     )
     SELECT * FROM grouped
     ORDER BY date DESC, time ASC`,
    [email],
  );

  const upcoming = rows.filter((r) => r.date >= today);
  const past = rows.filter((r) => r.date < today).slice(0, 10); // last 10 only

  return NextResponse.json({ upcoming, past });
}

/**
 * Cancel a booking by id. Only the original booker (matching email) can
 * cancel. Cancels the entire group when the booking is part of a multi-slot
 * party.
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Booking id required" }, { status: 400 });
  }

  // Verify ownership before doing anything destructive
  const row = await queryOne<{ player_email: string; group_booking_id: string | null; date: string }>(
    "SELECT player_email, group_booking_id, date FROM tee_times WHERE id = $1",
    [id],
  );
  if (!row) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (row.player_email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  // Don't let users "cancel" past bookings — that's purely a record at this point
  const today = new Date().toISOString().slice(0, 10);
  if (row.date < today) {
    return NextResponse.json({ error: "Past bookings can't be cancelled" }, { status: 400 });
  }

  if (row.group_booking_id) {
    await execute(
      "UPDATE tee_times SET status = 'cancelled' WHERE group_booking_id = $1",
      [row.group_booking_id],
    );
  } else {
    await execute("UPDATE tee_times SET status = 'cancelled' WHERE id = $1", [id]);
  }
  return NextResponse.json({ message: "Booking cancelled" });
}
