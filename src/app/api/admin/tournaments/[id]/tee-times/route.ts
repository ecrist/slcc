import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, withTransaction } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { TEE_TIME_SLOTS } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// POST — auto-assign tee times to tournament teams
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await queryOne<{ id: number; tournament_date: string }>(
    "SELECT * FROM tournaments WHERE id = $1",
    [id]
  );
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teams = await query<{ id: number }>(
    "SELECT id FROM tournament_teams WHERE tournament_id = $1 ORDER BY id ASC",
    [id]
  );
  if (teams.length === 0) return NextResponse.json({ error: "No teams to assign" }, { status: 400 });

  const { start_time, interval_minutes = 12, start_hole = 1 } = await request.json();
  if (!start_time) return NextResponse.json({ error: "start_time required" }, { status: 400 });

  const startIdx = TEE_TIME_SLOTS.indexOf(start_time);
  if (startIdx === -1) return NextResponse.json({ error: "Invalid start_time" }, { status: 400 });

  const stepsPerInterval = Math.round(interval_minutes / 12);

  await withTransaction(async (q) => {
    for (let i = 0; i < teams.length; i++) {
      const slotIdx = startIdx + i * stepsPerInterval;
      const teeTime = TEE_TIME_SLOTS[Math.min(slotIdx, TEE_TIME_SLOTS.length - 1)];
      await q(
        "UPDATE tournament_teams SET tee_time = $1, tee_hole = $2 WHERE id = $3",
        [teeTime, start_hole, teams[i].id]
      );
    }
  });

  return NextResponse.json({ ok: true, teams_assigned: teams.length });
}
