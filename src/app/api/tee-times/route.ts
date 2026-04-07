import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { getConfigValue } from "@/lib/admin";
import { TEE_TIME_SLOTS } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { sendTeeTimeConfirmation } from "@/lib/email";

async function getEquipmentAvailability(date: string) {
  const cartFeePerNine    = parseFloat((await getConfigValue("cart_fee_per_9"))         ?? "10");
  const buggyFee          = parseFloat((await getConfigValue("buggy_fee"))              ?? "5");
  const clubsFee          = parseFloat((await getConfigValue("clubs_fee"))              ?? "15");
  const personalCartDropFee = parseFloat((await getConfigValue("personal_cart_drop_fee")) ?? "15");

  const totals = await query<{ type: string; n: number }>(
    "SELECT type, COUNT(*)::int AS n FROM equipment WHERE status = 'available' GROUP BY type"
  );
  const byType: Record<string, number> = {};
  for (const row of totals) byType[row.type] = row.n;

  const booked = await queryOne<{ carts: number; buggies: number; clubs: number }>(
    `SELECT
       COALESCE(SUM(carts_requested), 0)::int  AS carts,
       COALESCE(SUM(buggies_requested), 0)::int AS buggies,
       COALESCE(SUM(clubs_requested), 0)::int   AS clubs
     FROM tee_times
     WHERE date = $1 AND status != 'cancelled' AND slot_index = 0`,
    [date]
  );

  const cartTotal  = byType["cart"]  ?? 0;
  const buggyTotal = byType["buggy"] ?? 0;
  const clubsTotal = byType["clubs"] ?? 0;

  return {
    cartTotal,
    cartsBooked:    booked?.carts   ?? 0,
    cartsAvailable: Math.max(0, cartTotal  - (booked?.carts   ?? 0)),
    buggyTotal,
    buggiesBooked:    booked?.buggies ?? 0,
    buggiesAvailable: Math.max(0, buggyTotal - (booked?.buggies ?? 0)),
    clubsTotal,
    clubsBooked:    booked?.clubs   ?? 0,
    clubsAvailable: Math.max(0, clubsTotal - (booked?.clubs   ?? 0)),
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

  const bookedSlots = await query(
    "SELECT time, players, player_name, group_booking_id, slot_index FROM tee_times WHERE date = $1 AND status != 'cancelled' ORDER BY time",
    [date]
  );
  const equipment = await getEquipmentAvailability(date);

  return NextResponse.json({ bookedSlots, equipment });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    date, time, players, player_name, player_email, player_phone,
    holes, notes, carts_requested, buggies_requested, clubs_requested, personal_cart_drop,
  } = body;

  if (!date || !time || !player_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const playerCount  = Math.max(1, Math.min(12, parseInt(players) || 1));
  const slotsNeeded  = Math.min(3, Math.ceil(playerCount / 4));
  const startIdx     = TEE_TIME_SLOTS.indexOf(time);
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
  const groupId     = uuidv4();

  const avail         = await getEquipmentAvailability(date);
  const cartsWanted   = Math.max(0, parseInt(carts_requested)   || 0);
  const buggiesWanted = Math.max(0, parseInt(buggies_requested) || 0);
  const clubsWanted   = Math.max(0, parseInt(clubs_requested)   || 0);
  const personalCartDrop = personal_cart_drop ? 1 : 0;

  if (cartsWanted   > avail.cartsAvailable)   return NextResponse.json({ error: `Only ${avail.cartsAvailable} golf cart(s) available on this date.` },          { status: 409 });
  if (buggiesWanted > avail.buggiesAvailable) return NextResponse.json({ error: `Only ${avail.buggiesAvailable} walking buggy/buggies available on this date.` }, { status: 409 });
  if (clubsWanted   > avail.clubsAvailable)   return NextResponse.json({ error: `Only ${avail.clubsAvailable} club set(s) available on this date.` },            { status: 409 });

  try {
    const ids = await withTransaction(async (q) => {
      // Verify all needed slots are still open
      for (const slotTime of timesToBook) {
        const existing = await q(
          "SELECT id FROM tee_times WHERE date = $1 AND time = $2 AND status != 'cancelled'",
          [date, slotTime]
        );
        if (existing.rows[0]) throw new Error("SLOT_TAKEN");
      }

      const insertedIds: number[] = [];
      for (let i = 0; i < timesToBook.length; i++) {
        const isLead = i === 0;
        const res = await q(
          `INSERT INTO tee_times
             (date, time, players, player_name, player_email, player_phone,
              holes, cart, notes, group_booking_id, slot_index,
              carts_requested, buggies_requested, clubs_requested, personal_cart_drop)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING id`,
          [
            date, timesToBook[i], playerCount,
            player_name, player_email, player_phone || null,
            holes || 18,
            cartsWanted > 0 ? 1 : 0,
            notes || null,
            groupId, i,
            isLead ? cartsWanted   : 0,
            isLead ? buggiesWanted : 0,
            isLead ? clubsWanted   : 0,
            isLead ? personalCartDrop : 0,
          ]
        );
        insertedIds.push(res.rows[0].id as number);
      }
      return insertedIds;
    });

    if (player_email) {
      sendTeeTimeConfirmation({
        to: player_email, player_name, date, time,
        players: playerCount, holes: holes || 18,
        slots: timesToBook,
        carts: cartsWanted, buggies: buggiesWanted, clubs: clubsWanted,
        personal_cart_drop: personalCartDrop === 1,
        group_booking_id: groupId,
      }).catch(() => {});
    }

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
    if (err instanceof Error && err.message.includes("unique")) {
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

  const row = await queryOne<{ group_booking_id: string | null }>(
    "SELECT group_booking_id FROM tee_times WHERE id = $1",
    [id]
  );

  if (row?.group_booking_id) {
    await execute(
      "UPDATE tee_times SET status = 'cancelled' WHERE group_booking_id = $1",
      [row.group_booking_id]
    );
  } else {
    await execute("UPDATE tee_times SET status = 'cancelled' WHERE id = $1", [id]);
  }

  return NextResponse.json({ message: "Tee time cancelled" });
}
