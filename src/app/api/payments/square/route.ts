import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Square payment creation endpoint
// In production, this uses the Square Payments API to create a checkout
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { membership_id, amount, description } = body;

  if (!process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN === "your_square_access_token") {
    return NextResponse.json({
      error: "Square is not configured. Set SQUARE_ACCESS_TOKEN in .env.local",
      setup_instructions: {
        step1: "Go to https://developer.squareup.com/apps and create an application",
        step2: "Copy your Access Token, Application ID, and Location ID",
        step3: "Add them to .env.local (see .env.local.example)",
      },
    }, { status: 503 });
  }

  try {
    // Dynamic import to avoid errors when Square isn't configured
    const { getSquareClient, getSquareLocationId } = await import("@/lib/square/client");
    const client = getSquareClient();

    const response = await client.checkoutApi.createPaymentLink({
      idempotencyKey: `membership-${membership_id}-${Date.now()}`,
      order: {
        locationId: getSquareLocationId(),
        lineItems: [
          {
            name: description || "Swan Lake CC Membership",
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(Math.round(amount * 100)),
              currency: "USD",
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/memberships?payment=success`,
      },
    });

    // Update membership with payment info
    if (response.result.paymentLink) {
      const db = getDb();
      db.prepare("UPDATE memberships SET payment_id = ?, payment_status = 'processing' WHERE id = ?")
        .run(response.result.paymentLink.id, membership_id);

      return NextResponse.json({
        payment_url: response.result.paymentLink.url,
        payment_id: response.result.paymentLink.id,
      });
    }

    return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
  } catch (error) {
    console.error("Square payment error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
