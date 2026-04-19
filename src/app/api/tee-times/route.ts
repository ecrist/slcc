import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction } from "@/lib/db";
import { getConfigValue, setConfigValue } from "@/lib/admin";
import { TEE_TIME_SLOTS } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { sendTeeTimeConfirmation } from "@/lib/email";
import { sunsetTime, subtractHours } from "@/lib/sunset";
import { auth } from "@/auth";

/** Check auto-open/close dates and flip course_open if needed */
async function checkAutoSeasonToggle() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const courseOpen = await getConfigValue("course_open");
  const autoOpen = await getConfigValue("course_auto_open_date");
  const autoClose = await getConfigValue("course_auto_close_date");

  if (courseOpen === "true" && autoClose && today >= autoClose) {
    await setConfigValue("course_open", "false");
    await setConfigValue("course_auto_close_date", ""); // Clear so it doesn't re-trigger
  } else if (courseOpen !== "true" && autoOpen && today >= autoOpen) {
    await setConfigValue("course_open", "true");
    await setConfigValue("course_auto_open_date", ""); // Clear so it doesn't re-trigger
  }
}

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

async function getRates() {
  const [
    cmh9, cmf9, cmh18, cmf18,
    cnh9, cnf9, cnh18, cnf18,
    pullCart, club9, club18, personalDrop,
    gf9, gf18,
  ] = await Promise.all([
    getConfigValue("cart_member_half_9"),
    getConfigValue("cart_member_full_9"),
    getConfigValue("cart_member_half_18"),
    getConfigValue("cart_member_full_18"),
    getConfigValue("cart_nonmember_half_9"),
    getConfigValue("cart_nonmember_full_9"),
    getConfigValue("cart_nonmember_half_18"),
    getConfigValue("cart_nonmember_full_18"),
    getConfigValue("pull_cart_fee"),
    getConfigValue("club_rental_9"),
    getConfigValue("club_rental_18"),
    getConfigValue("personal_cart_drop_fee"),
    getConfigValue("green_fee_9_holes"),
    getConfigValue("green_fee_18_holes"),
  ]);
  return {
    cartMemberHalf9:      parseFloat(cmh9  ?? "10"),
    cartMemberFull9:      parseFloat(cmf9  ?? "17.50"),
    cartMemberHalf18:     parseFloat(cmh18 ?? "15"),
    cartMemberFull18:     parseFloat(cmf18 ?? "25"),
    cartNonmemberHalf9:   parseFloat(cnh9  ?? "17.50"),
    cartNonmemberFull9:   parseFloat(cnf9  ?? "30"),
    cartNonmemberHalf18:  parseFloat(cnh18 ?? "25"),
    cartNonmemberFull18:  parseFloat(cnf18 ?? "40"),
    pullCartFee:          parseFloat(pullCart ?? "3"),
    clubRental9:          parseFloat(club9 ?? "15"),
    clubRental18:         parseFloat(club18 ?? "20"),
    personalCartDropFee:  parseFloat(personalDrop ?? "15"),
    greenFee9:            parseFloat(gf9 ?? "20"),
    greenFee18:           parseFloat(gf18 ?? "35"),
  };
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  // Auto-toggle course open/close based on scheduled dates
  await checkAutoSeasonToggle();
  const courseOpen = (await getConfigValue("course_open")) === "true";

  const [
    teeTimeOpen, teeTimeClose,
    clubhouseOpen, clubhouseClose,
    sunsetCutoffHours,
    latStr, lngStr,
    bookingDaysAhead,
    autoCloseDate,
    requireLoginForBookingRaw,
  ] = await Promise.all([
    getConfigValue("tee_time_open"),
    getConfigValue("tee_time_close"),
    getConfigValue("clubhouse_open"),
    getConfigValue("clubhouse_close"),
    getConfigValue("sunset_cutoff_hours"),
    getConfigValue("course_latitude"),
    getConfigValue("course_longitude"),
    getConfigValue("booking_days_ahead"),
    getConfigValue("course_auto_close_date"),
    getConfigValue("require_login_for_booking"),
  ]);
  const requireLoginForBooking = requireLoginForBookingRaw === "true";

  // Compute effective last tee time
  // When tee_time_close is blank, automatically use sunset-based cutoff
  let effectiveTeeTimeClose = teeTimeClose;
  let sunsetStr: string | null = null;
  const useSunset = !teeTimeClose; // blank = sunset-based
  {
    const lat = parseFloat(latStr ?? "47.72");
    const lng = parseFloat(lngStr ?? "-93.01");
    const cutoff = parseFloat(sunsetCutoffHours ?? "2");
    // Pengilly MN is UTC-6 (CST) / UTC-5 (CDT); approximate with -5 (CDT, May–Oct season)
    const utcOffset = -5;
    sunsetStr = sunsetTime(date, lat, lng, utcOffset);
    if (sunsetStr) {
      const cutoffTime = subtractHours(sunsetStr, cutoff);
      if (useSunset) {
        // No configured close time — use sunset cutoff
        effectiveTeeTimeClose = cutoffTime;
      } else if (cutoffTime < effectiveTeeTimeClose!) {
        // Configured close time exists but sunset cutoff is earlier
        effectiveTeeTimeClose = cutoffTime;
      }
    }
  }

  // Private events block tee time bookings during their window
  const privateEvents = await query<{ start_time: string | null; end_time: string | null; title: string }>(
    "SELECT start_time, end_time, title FROM events WHERE event_date = $1 AND is_public = 0",
    [date]
  );

  const bookedSlots = await query(
    "SELECT time, players, player_name, group_booking_id, slot_index FROM tee_times WHERE date = $1 AND status != 'cancelled' ORDER BY time",
    [date]
  );
  const equipment = await getEquipmentAvailability(date);
  const rates = await getRates();

  // Detect membership status for logged-in user
  let userIsMember = false;
  try {
    const session = await auth();
    if (session?.user?.email) {
      const membership = await queryOne<{ id: number }>(
        "SELECT id FROM memberships WHERE LOWER(email) = LOWER($1) AND status = 'active' LIMIT 1",
        [session.user.email]
      );
      userIsMember = !!membership;
    }
  } catch {
    // Auth not available or error — leave as false
  }

  return NextResponse.json({
    bookedSlots,
    equipment,
    rates,
    courseOpen,
    teeTimeOpen,
    teeTimeClose: effectiveTeeTimeClose,
    teeTimeCloseRaw: teeTimeClose,
    clubhouseOpen,
    clubhouseClose,
    sunsetTime: sunsetStr,
    privateEvents,
    bookingDaysAhead: parseInt(bookingDaysAhead ?? "8") || 8,
    autoCloseDate: autoCloseDate ?? null,
    userIsMember,
    requireLoginForBooking,
  });
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

  // Enforce sign-in requirement if admin has enabled it
  const requireLoginForBooking = (await getConfigValue("require_login_for_booking")) === "true";
  if (requireLoginForBooking) {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in to book a tee time." },
        { status: 401 }
      );
    }
  }

  // Check course_open and apply auto-open/close date logic
  const courseOpen = await getConfigValue("course_open");
  if (courseOpen !== "true") {
    return NextResponse.json({ error: "Online tee time bookings are currently closed." }, { status: 400 });
  }

  const [
    teeTimeClose, sunsetCutoffHours, latStr, lngStr,
  ] = await Promise.all([
    getConfigValue("tee_time_close"),
    getConfigValue("sunset_cutoff_hours"),
    getConfigValue("course_latitude"),
    getConfigValue("course_longitude"),
  ]);

  // Enforce sunset cutoff — when tee_time_close is blank, sunset is the cutoff
  let effectiveTeeTimeClose = teeTimeClose;
  {
    const lat = parseFloat(latStr ?? "47.72");
    const lng = parseFloat(lngStr ?? "-93.01");
    const cutoff = parseFloat(sunsetCutoffHours ?? "2");
    const sunset = sunsetTime(date, lat, lng, -5);
    if (sunset) {
      const cutoffTime = subtractHours(sunset, cutoff);
      if (!effectiveTeeTimeClose || cutoffTime < effectiveTeeTimeClose) {
        effectiveTeeTimeClose = cutoffTime;
      }
    }
  }
  if (effectiveTeeTimeClose && time > effectiveTeeTimeClose) {
    return NextResponse.json({ error: `Bookings are not available after ${effectiveTeeTimeClose} on this date.` }, { status: 400 });
  }

  // Block bookings that fall within a private event window
  const privateEvents = await query<{ start_time: string | null; end_time: string | null; title: string }>(
    "SELECT start_time, end_time, title FROM events WHERE event_date = $1 AND is_public = 0",
    [date]
  );
  for (const evt of privateEvents) {
    const start = evt.start_time;
    const end = evt.end_time;
    const blocked =
      !start && !end ? true                          // whole day
      : !start ? time <= end!                        // up to end
      : !end   ? time >= start                       // from start onward
      : time >= start && time <= end;                // within window
    if (blocked) {
      return NextResponse.json(
        { error: `This time is unavailable due to a private event${evt.title ? ` (${evt.title})` : ""}.` },
        { status: 409 }
      );
    }
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
