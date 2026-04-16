import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, queryOne } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const [
    todayBookings,
    todayCheckins,
    activeMembers,
    pendingPayments,
    upcomingEvents,
    recentBookings,
    recentCharges,
    openCharges,
    totalRevenue,
  ] = await Promise.all([
    // Today's bookings
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM tee_times WHERE date = $1 AND status != 'cancelled'",
      [today]
    ),
    // Today's check-ins
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM tee_times WHERE date = $1 AND checked_in = 1",
      [today]
    ),
    // Active members
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM memberships WHERE status = 'active'"
    ),
    // Pending payments
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM memberships WHERE payment_status = 'pending'"
    ),
    // Upcoming events (next 30 days)
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM events WHERE event_date >= $1 AND event_date <= $2",
      [today, new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]]
    ),
    // Recent bookings (last 5)
    query<{ id: number; player_name: string; date: string; time: string; players: number; status: string }>(
      "SELECT id, player_name, date, time, players, status FROM tee_times WHERE status != 'cancelled' ORDER BY created_at DESC LIMIT 5"
    ),
    // Recent charges (last 5)
    query<{ id: number; member_name: string; charge_type: string; amount: number; status: string; created_at: string }>(
      "SELECT id, member_name, charge_type, amount, status, created_at FROM member_charges ORDER BY created_at DESC LIMIT 5"
    ),
    // Open charges total
    queryOne<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0)::text AS total FROM member_charges WHERE status = 'open'"
    ),
    // Total membership revenue this season
    queryOne<{ total: string }>(
      "SELECT COALESCE(SUM(amount_paid), 0)::text AS total FROM memberships WHERE payment_status = 'paid' AND status = 'active'"
    ),
  ]);

  return NextResponse.json({
    todayBookings: parseInt(todayBookings?.count || "0"),
    todayCheckins: parseInt(todayCheckins?.count || "0"),
    activeMembers: parseInt(activeMembers?.count || "0"),
    pendingPayments: parseInt(pendingPayments?.count || "0"),
    upcomingEvents: parseInt(upcomingEvents?.count || "0"),
    openChargesTotal: parseFloat(openCharges?.total || "0"),
    membershipRevenue: parseFloat(totalRevenue?.total || "0"),
    recentBookings: recentBookings || [],
    recentCharges: recentCharges || [],
  });
}
