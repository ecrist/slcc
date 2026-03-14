import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TEE_TIME_SLOTS } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  const db = getDb();
  const teeTimes = db
    .prepare("SELECT * FROM tee_times WHERE date = ? AND status != 'cancelled' ORDER BY time")
    .all(date);

  return NextResponse.json(teeTimes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, time, players, player_name, player_email, player_phone, holes, cart, notes } = body;

  if (!date || !time || !player_name || !player_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const playerCount = Math.max(1, Math.min(12, parseInt(players) || 1));
  const slotsNeeded = Math.min(3, Math.ceil(playerCount / 4));

  const startIdx = TEE_TIME_SLOTS.indexOf(time);
  if (startIdx === -1) {
    return NextResponse.json({ error: "Invalid time slot" }, { status: 400 });
  }
  if (startIdx + slotsNeeded > TEE_TIME_SLOTS.length) {
    return NextResponse.json(
      { error: "Not enough time slots remaining today for a party of this size. Please choose an earlier start time." },
      { status: 400 }
    );
  }

  const timesToBook = TEE_TIME_SLOTS.slice(startIdx, startIdx + slotsNeeded);
  const db = getDb();
  const groupId = uuidv4();

  const checkAndInsert = db.transaction(() => {
    // Check every slot we need — inside BEGIN IMMEDIATE so no other writer can
    // sneak in between our checks and our inserts.
    for (const slotTime of timesToBook) {
      const existing = db
        .prepare("SELECT id FROM tee_times WHERE date = ? AND time = ? AND status != 'cancelled'")
        .get(date, slotTime);
      if (existing) {
        throw new Error("SLOT_TAKEN");
      }
    }

    const stmt = db.prepare(`
      INSERT INTO tee_times
        (date, time, players, player_name, player_email, player_phone,
         holes, cart, notes, group_booking_id, slot_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ids: number[] = [];
    for (let i = 0; i < timesToBook.length; i++) {
      const result = stmt.run(
        date, timesToBook[i], playerCount,
        player_name, player_email, player_phone || null,
        holes || 18, cart || 0, notes || null,
        groupId, i
      );
      ids.push(result.lastInsertRowid as number);
    }
    return ids;
  });

  try {
    // BEGIN IMMEDIATE acquires a write lock at the start, preventing concurrent
    // writers from passing the slot-available check simultaneously.
    const ids = checkAndInsert.immediate();
    return NextResponse.json(
      {
        id: ids[0],
        group_booking_id: groupId,
        slots: timesToBook,
        slots_reserved: slotsNeeded,
        message:
          slotsNeeded > 1
            ? `Booked ${slotsNeeded} consecutive slots for your party of ${playerCount}`
            : "Tee time booked successfully",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json(
        {
          error:
            slotsNeeded > 1
              ? "One or more slots needed for your party size are no longer available. Please choose a different start time."
              : "This time slot was just booked by someone else. Please choose another time.",
        },
        { status: 409 }
      );
    }
    // The unique index is a second backstop — SQLite will throw a UNIQUE constraint
    // violation if two transactions somehow both reach the INSERT simultaneously.
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "This time slot was just booked. Please choose another time." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID parameter required" }, { status: 400 });
  }

  const db = getDb();
  // Cancel the entire group if this slot is part of one
  const row = db.prepare("SELECT group_booking_id FROM tee_times WHERE id = ?").get(id) as
    | { group_booking_id: string | null }
    | undefined;

  if (row?.group_booking_id) {
    db.prepare("UPDATE tee_times SET status = 'cancelled' WHERE group_booking_id = ?").run(
      row.group_booking_id
    );
  } else {
    db.prepare("UPDATE tee_times SET status = 'cancelled' WHERE id = ?").run(id);
  }

  return NextResponse.json({ message: "Tee time cancelled" });
}
