import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Tee time groups for today — lead slots only
  const groups = await query(
    `SELECT
       t.id, t.group_booking_id, t.time, t.player_name, t.player_email,
       t.player_phone, t.players, t.holes,
       t.carts_requested, t.buggies_requested, t.clubs_requested, t.personal_cart_drop,
       t.notes, t.status, t.checked_in, t.checked_in_at,
       (SELECT COUNT(*)::int FROM tee_times s
        WHERE s.group_booking_id = t.group_booking_id AND s.group_booking_id IS NOT NULL
          AND s.status != 'cancelled') AS slot_count
     FROM tee_times t
     WHERE t.date = $1 AND t.slot_index = 0 AND t.status != 'cancelled'
     ORDER BY t.time`,
    [today]
  );

  // Recent check-ins today
  const recentCheckIns = await query(
    `SELECT * FROM checkins
     WHERE checked_in_at::date = $1::date
     ORDER BY checked_in_at DESC
     LIMIT 30`,
    [today]
  );

  const totalReservations  = groups.length;
  const checkedInCount     = groups.filter((g) => (g as { checked_in: number }).checked_in).length;
  const walkInCount        = recentCheckIns.filter((c) => (c as { type: string }).type === "walk_in").length;
  const memberCheckInCount = recentCheckIns.filter((c) => (c as { type: string }).type !== "walk_in").length;

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
