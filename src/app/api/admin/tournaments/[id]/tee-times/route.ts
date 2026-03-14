import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { TEE_TIME_SLOTS } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// POST — auto-assign tee times to tournament teams
// Body: { start_time, interval_minutes, start_hole? }
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as
    { id: number; tournament_date: string } | undefined;
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teams = db
    .prepare("SELECT id FROM tournament_teams WHERE tournament_id = ? ORDER BY id ASC")
    .all(id) as { id: number }[];

  if (teams.length === 0) return NextResponse.json({ error: "No teams to assign" }, { status: 400 });

  const { start_time, interval_minutes = 12, start_hole = 1 } = await request.json();
  if (!start_time) return NextResponse.json({ error: "start_time required" }, { status: 400 });

  const startIdx = TEE_TIME_SLOTS.indexOf(start_time);
  if (startIdx === -1) return NextResponse.json({ error: "Invalid start_time" }, { status: 400 });

  // How many slot steps per interval
  const stepsPerInterval = Math.round(interval_minutes / 12);

  db.transaction(() => {
    teams.forEach((team, i) => {
      const slotIdx = startIdx + i * stepsPerInterval;
      const teeTime = TEE_TIME_SLOTS[Math.min(slotIdx, TEE_TIME_SLOTS.length - 1)];
      db.prepare("UPDATE tournament_teams SET tee_time = ?, tee_hole = ? WHERE id = ?")
        .run(teeTime, start_hole, team.id);
    });
  })();

  return NextResponse.json({ ok: true, teams_assigned: teams.length });
}
