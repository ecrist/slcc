import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Tee time groups for today — fetch lead slots only
  const groups = db
    .prepare(
      `SELECT
        t.id, t.group_booking_id, t.time, t.player_name, t.player_email,
        t.player_phone, t.players, t.holes,
        t.carts_requested, t.buggies_requested, t.clubs_requested, t.personal_cart_drop,
        t.notes, t.status, t.checked_in, t.checked_in_at,
        (SELECT COUNT(*) FROM tee_times s
         WHERE s.group_booking_id = t.group_booking_id AND s.group_booking_id IS NOT NULL
           AND s.status != 'cancelled') AS slot_count
       FROM tee_times t
       WHERE t.date = ? AND t.slot_index = 0 AND t.status != 'cancelled'
       ORDER BY t.time`
    )
    .all(today);

  // Recent check-ins today (all types)
  const recentCheckIns = db
    .prepare(
      `SELECT * FROM checkins
       WHERE date(checked_in_at) = ?
       ORDER BY checked_in_at DESC
       LIMIT 30`
    )
    .all(today);

  // Stats
  const totalReservations = (groups as { id: number }[]).length;
  const checkedInCount = (groups as { checked_in: number }[]).filter((g) => g.checked_in).length;
  const walkInCount = (recentCheckIns as { type: string }[]).filter((c) => c.type === "walk_in").length;
  const memberCheckInCount = (recentCheckIns as { type: string }[]).filter((c) => c.type !== "walk_in").length;

  return NextResponse.json({
    teeTimeGroups: groups,
    recentCheckIns,
    stats: {
      totalReservations,
      checkedIn: checkedInCount,
      walkIns: walkInCount,
      memberCheckIns: memberCheckInCount,
    },
  });
}
