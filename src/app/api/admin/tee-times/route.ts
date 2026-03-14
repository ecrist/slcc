import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM tee_times WHERE date = ? AND status != 'cancelled' ORDER BY time, slot_index")
    .all(date);

  return NextResponse.json(rows);
}
