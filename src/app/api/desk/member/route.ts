import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const like = `%${q}%`;
  const results = db
    .prepare(
      `SELECT id, first_name, last_name, email, membership_type, status, nfc_token
       FROM memberships
       WHERE status = 'active'
         AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
              OR (first_name || ' ' || last_name) LIKE ?)
       ORDER BY last_name, first_name
       LIMIT 10`
    )
    .all(like, like, like, like);

  return NextResponse.json(results);
}
