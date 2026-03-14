import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Process a Square Web Payments SDK token (Google Pay / Apple Pay / Card)
export async function POST(request: NextRequest) {
  if (
    !process.env.SQUARE_ACCESS_TOKEN ||
    process.env.SQUARE_ACCESS_TOKEN === "your_square_access_token"
  ) {
    return NextResponse.json(
      { error: "Square is not configured. Set SQUARE_ACCESS_TOKEN in .env.local" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const {
    token,
    membership_type,
    amount,
    first_name,
    last_name,
    email,
    phone,
    address,
    city,
    state,
    zip,
  } = body;

  if (!token || !membership_type || !amount || !first_name || !last_name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { getSquareClient, getSquareLocationId } = await import("@/lib/square/client");
    const client = getSquareClient();

    const idempotencyKey = uuidv4();
    const response = await client.paymentsApi.createPayment({
      sourceId: token,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: "USD",
      },
      locationId: getSquareLocationId(),
      note: `Swan Lake CC - ${membership_type} membership`,
    });

    if (!response.result.payment?.id) {
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }

    const paymentId = response.result.payment.id;

    // Create membership record
    const db = getDb();
    const memberNumber = `SL${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];

    const result = db
      .prepare(
        `INSERT INTO memberships
         (member_number, first_name, last_name, email, phone, address, city, state, zip,
          membership_type, start_date, end_date, amount_paid, payment_id, payment_provider, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        memberNumber,
        first_name,
        last_name,
        email,
        phone || null,
        address || null,
        city || null,
        state || "MN",
        zip || null,
        membership_type,
        today,
        "2026-10-31",
        amount,
        paymentId,
        "square_wallet",
        "paid",
        "active"
      );

    return NextResponse.json({
      member_number: memberNumber,
      membership_id: result.lastInsertRowid,
      payment_id: paymentId,
    });
  } catch (error) {
    console.error("Square wallet payment error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
