import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

// Toggle checked-in status for a tee time group
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const row = db.prepare("SELECT group_booking_id, checked_in FROM tee_times WHERE id = ?").get(id) as
    | { group_booking_id: string | null; checked_in: number } | undefined;

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus = row.checked_in ? 0 : 1;
  const checkedInAt = newStatus ? "datetime('now')" : "NULL";

  if (row.group_booking_id) {
    db.prepare(
      `UPDATE tee_times SET checked_in = ?, checked_in_at = ${checkedInAt === "NULL" ? "NULL" : "datetime('now')"}
       WHERE group_booking_id = ?`
    ).run(newStatus, row.group_booking_id);
  } else {
    db.prepare(
      `UPDATE tee_times SET checked_in = ?, checked_in_at = ${checkedInAt === "NULL" ? "NULL" : "datetime('now')"}
       WHERE id = ?`
    ).run(newStatus, id);
  }

  return NextResponse.json({ checked_in: newStatus });
}
