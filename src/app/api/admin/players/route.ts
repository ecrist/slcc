import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query, execute } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

// GET — all users with their most-recent membership (if any)
export async function GET(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where = q.length >= 2
    ? `WHERE u.name ILIKE $1 OR u.email ILIKE $1`
    : "";
  const params = q.length >= 2 ? [`%${q}%`] : [];

  // DISTINCT ON gives us one row per user — the most recent membership
  const rows = await query(
    `SELECT DISTINCT ON (u.id)
       u.id, u.email, u.name, u.phone, u.created_at,
       m.id            AS membership_id,
       m.member_number,
       m.membership_type,
       m.status        AS membership_status,
       m.payment_status,
       m.start_date,
       m.end_date
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     ${where}
     ORDER BY u.id, m.created_at DESC NULLS LAST`,
    params
  );

  return NextResponse.json(rows);
}

// PATCH — reset a user's password
export async function PATCH(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { user_id, new_password } = await request.json();

  if (!user_id || typeof new_password !== "string" || new_password.length < 6) {
    return NextResponse.json(
      { error: "user_id and new_password (min 6 chars) required" },
      { status: 400 }
    );
  }

  const password_hash = await bcrypt.hash(new_password, 12);
  await execute("UPDATE users SET password_hash = $1 WHERE id = $2", [
    password_hash,
    user_id,
  ]);

  return NextResponse.json({ ok: true });
}
