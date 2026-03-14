import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getConfigValue } from "@/lib/admin";
import { TEE_TIME_SLOTS } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

function getEquipmentAvailability(db: ReturnType<typeof getDb>, date: string) {
  const cartFeePerNine = parseFloat(getConfigValue("cart_fee_per_9") ?? "10");
  const buggyFee = parseFloat(getConfigValue("buggy_fee") ?? "5");
  const clubsFee = parseFloat(getConfigValue("clubs_fee") ?? "15");
  const personalCartDropFee = parseFloat(getConfigValue("personal_cart_drop_fee") ?? "15");

  // Count available units per type from the equipment table
  const totals = db
    .prepare("SELECT type, COUNT(*) as n FROM equipment WHERE status = 'available' GROUP BY type")
    .all() as { type: string; n: number }[];
  const byType: Record<string, number> = {};
  for (const row of totals) byType[row.type] = row.n;

  // Count how many are already booked for this date (lead slot only)
  const booked = db
    .prepare(
      `SELECT
        COALESCE(SUM(carts_requested), 0)  AS carts,
        COALESCE(SUM(buggies_requested), 0) AS buggies,
        COALESCE(SUM(clubs_requested), 0)   AS clubs
       FROM tee_times
       WHERE date = ? AND status != 'cancelled' AND slot_index = 0`
    )
    .get(date) as { carts: number; buggies: number; clubs: number };

  const cartTotal = byType["cart"] ?? 0;
  const buggyTotal = byType["buggy"] ?? 0;
  const clubsTotal = byType["clubs"] ?? 0;

  return {
    cartTotal,
    cartsBooked: booked.carts,
    cartsAvailable: Math.max(0, cartTotal - booked.carts),
    buggyTotal,
    buggiesBooked: booked.buggies,
    buggiesAvailable: Math.max(0, buggyTotal - booked.buggies),
    clubsTotal,
    clubsBooked: booked.clubs,
    clubsAvailable: Math.max(0, clubsTotal - booked.clubs),
    cartFeePerNine,
    buggyFee,
    clubsFee,
    personalCartDropFee,
  };
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  const db = getDb();
  const bookedSlots = db
    .prepare(
      "SELECT time, players, player_name, group_booking_id, slot_index FROM tee_times WHERE date = ? AND status != 'cancelled' ORDER BY time"
    )
    .all(date);

  const equipment = getEquipmentAvailability(db, date);

  return NextResponse.json({ bookedSlots, equipment });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    date, time, players, player_name, player_email, player_phone,
    holes, notes, carts_requested, buggies_requested, clubs_requested, personal_cart_drop,
  } = body;

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
      { error: "Not enough time slots remaining for a party this size. Choose an earlier start time." },
      { status: 400 }
    );
  }

  const timesToBook = TEE_TIME_SLOTS.slice(startIdx, startIdx + slotsNeeded);
  const db = getDb();
  const groupId = uuidv4();

  // Validate equipment requests against available inventory
  const avail = getEquipmentAvailability(db, date);
  const cartsWanted = Math.max(0, parseInt(carts_requested) || 0);
  const buggiesWanted = Math.max(0, parseInt(buggies_requested) || 0);
  const clubsWanted = Math.max(0, parseInt(clubs_requested) || 0);
  const personalCartDrop = personal_cart_drop ? 1 : 0;

  if (cartsWanted > avail.cartsAvailable) {
    return NextResponse.json(
      { error: `Only ${avail.cartsAvailable} golf cart(s) available on this date.` },
      { status: 409 }
    );
  }
  if (buggiesWanted > avail.buggiesAvailable) {
    return NextResponse.json(
      { error: `Only ${avail.buggiesAvailable} walking buggy/buggies available on this date.` },
      { status: 409 }
    );
  }
  if (clubsWanted > avail.clubsAvailable) {
    return NextResponse.json(
      { error: `Only ${avail.clubsAvailable} club set(s) available on this date.` },
      { status: 409 }
    );
  }

  const checkAndInsert = db.transaction(() => {
    for (const slotTime of timesToBook) {
      const existing = db
        .prepare("SELECT id FROM tee_times WHERE date = ? AND time = ? AND status != 'cancelled'")
        .get(date, slotTime);
      if (existing) throw new Error("SLOT_TAKEN");
    }

    const stmt = db.prepare(`
      INSERT INTO tee_times
        (date, time, players, player_name, player_email, player_phone,
         holes, cart, notes, group_booking_id, slot_index,
         carts_requested, buggies_requested, clubs_requested, personal_cart_drop)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ids: number[] = [];
    for (let i = 0; i < timesToBook.length; i++) {
      const isLead = i === 0;
      const result = stmt.run(
        date, timesToBook[i], playerCount,
        player_name, player_email, player_phone || null,
        holes || 18,
        cartsWanted > 0 ? 1 : 0,
        notes || null,
        groupId, i,
        isLead ? cartsWanted : 0,
        isLead ? buggiesWanted : 0,
        isLead ? clubsWanted : 0,
        isLead ? personalCartDrop : 0
      );
      ids.push(result.lastInsertRowid as number);
    }
    return ids;
  });

  try {
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
