import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { queryOne, execute } from "@/lib/db";

// Toggle checked-in status for a tee time group
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const row = await queryOne<{ group_booking_id: string | null; checked_in: number }>(
    "SELECT group_booking_id, checked_in FROM tee_times WHERE id = $1",
    [id]
  );

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus  = row.checked_in ? 0 : 1;
  const checkedInAt = newStatus ? "NOW()" : "NULL";

  if (row.group_booking_id) {
    await execute(
      `UPDATE tee_times SET checked_in = $1, checked_in_at = ${checkedInAt} WHERE group_booking_id = $2`,
      [newStatus, row.group_booking_id]
    );
  } else {
    await execute(
      `UPDATE tee_times SET checked_in = $1, checked_in_at = ${checkedInAt} WHERE id = $2`,
      [newStatus, id]
    );
  }

  return NextResponse.json({ checked_in: newStatus });
}
