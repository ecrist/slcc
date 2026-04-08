import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// No auth — desk endpoints are internal-network only (same as /api/desk/member)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const rows = await query(
    `SELECT id, first_name, last_name, zip, email
     FROM contacts
     WHERE first_name ILIKE $1 OR last_name ILIKE $1
        OR (first_name || ' ' || last_name) ILIKE $1
     ORDER BY last_name, first_name
     LIMIT 10`,
    [`%${q}%`]
  );
  return NextResponse.json(rows);
}
