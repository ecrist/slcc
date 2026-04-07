import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query, queryOne, execute } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  const rows = await query(
    "SELECT * FROM tee_times WHERE date = $1 AND status != 'cancelled' ORDER BY time, slot_index",
    [date]
  );

  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { player_name, player_email, player_phone, players, holes, notes } = await request.json();
  if (!player_name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const playerCount = Math.max(1, parseInt(players) || 1);

  await execute(
    `UPDATE tee_times SET player_name=$1, player_email=$2, player_phone=$3, players=$4, holes=$5, notes=$6
     WHERE id=$7`,
    [player_name, player_email || null, player_phone || null, playerCount, parseInt(holes) || 18, notes || null, id]
  );

  const row = await queryOne<{ group_booking_id: string | null }>(
    "SELECT group_booking_id FROM tee_times WHERE id=$1", [id]
  );
  if (row?.group_booking_id) {
    await execute(
      "UPDATE tee_times SET players=$1 WHERE group_booking_id=$2 AND slot_index != 0",
      [playerCount, row.group_booking_id]
    );
  }

  return NextResponse.json({ ok: true });
}
