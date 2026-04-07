import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { sendMembershipReceipt } from "@/lib/email";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";
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
    token, membership_type, amount,
    first_name, last_name, email,
    phone, address, city, state, zip,
    save_card,
  } = body;

  if (!token || !membership_type || !amount || !first_name || !last_name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const tier = MEMBERSHIP_TYPES[membership_type as MembershipType];
  if (!tier) return NextResponse.json({ error: "Invalid membership type" }, { status: 400 });

  try {
    const { getSquareClient, getSquareLocationId } = await import("@/lib/square/client");
    const client     = await getSquareClient();
    const locationId = await getSquareLocationId();

    let squareCustomerId: string | null = null;
    let squareCardId: string | null     = null;
    let sourceId = token;

    if (save_card) {
      try {
        const custResult = await client.customersApi.createCustomer({
          idempotencyKey: uuidv4(),
          givenName: first_name,
          familyName: last_name,
          emailAddress: email,
          phoneNumber: phone || undefined,
        });
        squareCustomerId = custResult.result.customer?.id ?? null;

        if (squareCustomerId) {
          const cardResult = await client.cardsApi.createCard({
            idempotencyKey: uuidv4(),
            sourceId: token,
            card: { customerId: squareCustomerId },
          });
          squareCardId = cardResult.result.card?.id ?? null;
          if (squareCardId) sourceId = squareCardId;
        }
      } catch {
        squareCustomerId = null;
        squareCardId     = null;
        sourceId         = token;
      }
    }

    const response = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: uuidv4(),
      customerId: squareCustomerId ?? undefined,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: "USD",
      },
      locationId,
      note: `Swan Lake CC - ${membership_type} membership`,
    });

    if (!response.result.payment?.id) {
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }

    const paymentId    = response.result.payment.id;
    const memberNumber = `SLCC-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const today        = new Date().toISOString().split("T")[0];

    const { id } = await execute(
      `INSERT INTO memberships
         (member_number, first_name, last_name, email, phone, address, city, state, zip,
          membership_type, start_date, end_date, amount_paid, payment_id, payment_provider,
          payment_status, status, auto_renew, square_customer_id, square_card_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        memberNumber, first_name, last_name, email,
        phone || null, address || null, city || null, state || "MN", zip || null,
        membership_type, today, "2026-10-31",
        amount, paymentId, "square_wallet", "paid", "active",
        save_card && squareCardId ? 1 : 0,
        squareCustomerId, squareCardId,
      ]
    );

    sendMembershipReceipt({
      to: email,
      first_name,
      last_name,
      member_number: memberNumber,
      membership_type: tier.name,
      amount,
      payment_provider: save_card && squareCardId ? "Square (card saved for auto-renewal)" : "Square",
      season_end: "October 31, 2026",
    }).catch(() => {});

    return NextResponse.json({
      member_number: memberNumber,
      membership_id: id,
      payment_id: paymentId,
      auto_renew_enabled: !!(save_card && squareCardId),
    });
  } catch (error) {
    console.error("Square wallet payment error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
