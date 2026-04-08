import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

export async function GET(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const type = request.nextUrl.searchParams.get("type") ?? "member_spend";
  const start = request.nextUrl.searchParams.get("start") ?? null; // YYYY-MM-DD
  const end = request.nextUrl.searchParams.get("end") ?? null;

  // Build date filter fragments
  const startTs = start ? `${start}T00:00:00Z` : null;
  const endTs = end ? `${end}T23:59:59Z` : null;

  if (type === "member_spend") {
    // Charges per member, excluding corporate-event charges from personal totals
    const rows = await query(
      `SELECT
         m.id, m.member_number, m.first_name, m.last_name, m.email,
         m.membership_type, m.status, m.credit_limit,
         COALESCE(SUM(mc.amount) FILTER (
           WHERE mc.status != 'voided'
             AND (mc.event_id IS NULL OR e.is_corporate_event = 0)
         ), 0) AS personal_spend,
         COALESCE(SUM(mc.amount) FILTER (
           WHERE mc.status = 'open'
             AND (mc.event_id IS NULL OR e.is_corporate_event = 0)
         ), 0) AS balance_due,
         COALESCE(SUM(mc.amount) FILTER (
           WHERE mc.status != 'voided'
             AND mc.event_id IS NOT NULL AND e.is_corporate_event = 1
         ), 0) AS corporate_spend,
         COUNT(mc.id) FILTER (WHERE mc.status != 'voided') AS charge_count
       FROM memberships m
       LEFT JOIN member_charges mc
         ON mc.membership_id = m.id
         AND ($1::text IS NULL OR mc.created_at >= $1::timestamptz)
         AND ($2::text IS NULL OR mc.created_at <= $2::timestamptz)
       LEFT JOIN events e ON e.id = mc.event_id
       GROUP BY m.id, m.member_number, m.first_name, m.last_name,
                m.email, m.membership_type, m.status, m.credit_limit
       ORDER BY personal_spend DESC`,
      [startTs, endTs]
    );
    return NextResponse.json(rows);
  }

  if (type === "contact_spend") {
    const rows = await query(
      `SELECT
         c.id, c.first_name, c.last_name, c.zip, c.email, c.phone,
         c.membership_id,
         COALESCE(SUM(mc.amount) FILTER (WHERE mc.status != 'voided'), 0) AS total_spend,
         COALESCE(SUM(mc.amount) FILTER (WHERE mc.status = 'open'), 0) AS balance_due,
         COUNT(DISTINCT mc.id) FILTER (WHERE mc.status != 'voided') AS charge_count,
         COUNT(DISTINCT ci.id) AS visit_count
       FROM contacts c
       LEFT JOIN member_charges mc
         ON mc.contact_id = c.id
         AND ($1::text IS NULL OR mc.created_at >= $1::timestamptz)
         AND ($2::text IS NULL OR mc.created_at <= $2::timestamptz)
       LEFT JOIN checkins ci ON ci.contact_id = c.id
       GROUP BY c.id, c.first_name, c.last_name, c.zip, c.email, c.phone, c.membership_id
       ORDER BY total_spend DESC`,
      [startTs, endTs]
    );
    return NextResponse.json(rows);
  }

  if (type === "corporate_events") {
    const rows = await query(
      `SELECT
         e.id, e.title, e.event_date, e.start_time, e.end_time,
         COUNT(mc.id) FILTER (WHERE mc.status != 'voided') AS charge_count,
         COALESCE(SUM(mc.amount) FILTER (WHERE mc.status != 'voided'), 0) AS total_amount,
         COALESCE(SUM(mc.amount) FILTER (WHERE mc.status = 'paid'), 0) AS paid_amount,
         COALESCE(SUM(mc.amount) FILTER (WHERE mc.status = 'open'), 0) AS outstanding_amount,
         COUNT(DISTINCT mc.membership_id) AS member_count
       FROM events e
       LEFT JOIN member_charges mc ON mc.event_id = e.id
       WHERE e.is_corporate_event = 1
       GROUP BY e.id, e.title, e.event_date, e.start_time, e.end_time
       ORDER BY e.event_date DESC`
    );
    return NextResponse.json(rows);
  }

  if (type === "credit_utilization") {
    const rows = await query(
      `SELECT
         m.id, m.member_number, m.first_name, m.last_name, m.email,
         m.membership_type, m.status, m.credit_limit,
         COALESCE(SUM(mc.amount) FILTER (
           WHERE mc.status = 'open'
             AND (mc.event_id IS NULL OR e.is_corporate_event = 0)
         ), 0) AS balance_used
       FROM memberships m
       LEFT JOIN member_charges mc ON mc.membership_id = m.id
       LEFT JOIN events e ON e.id = mc.event_id
       WHERE m.credit_limit IS NOT NULL
       GROUP BY m.id, m.member_number, m.first_name, m.last_name,
                m.email, m.membership_type, m.status, m.credit_limit
       ORDER BY (
         COALESCE(SUM(mc.amount) FILTER (
           WHERE mc.status = 'open' AND (mc.event_id IS NULL OR e.is_corporate_event = 0)
         ), 0) / NULLIF(m.credit_limit, 0)
       ) DESC NULLS LAST`
    );
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
