import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const like = `%${q}%`;
  const results = await query(
    `SELECT id, first_name, last_name, email, membership_type, status, nfc_token
     FROM memberships
     WHERE status = 'active'
       AND (first_name ILIKE $1 OR last_name ILIKE $2 OR email ILIKE $3
            OR (first_name || ' ' || last_name) ILIKE $4)
     ORDER BY last_name, first_name
     LIMIT 10`,
    [like, like, like, like]
  );

  return NextResponse.json(results);
}
