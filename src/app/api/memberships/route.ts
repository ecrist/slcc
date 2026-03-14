import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const db = getDb();
  const memberships = db.prepare("SELECT * FROM memberships ORDER BY created_at DESC").all();
  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    first_name, last_name, email, phone, address, city, state, zip,
    membership_type, payment_provider,
  } = body;

  if (!first_name || !last_name || !email || !membership_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!(membership_type in MEMBERSHIP_TYPES)) {
    return NextResponse.json({ error: "Invalid membership type" }, { status: 400 });
  }

  const tier = MEMBERSHIP_TYPES[membership_type as MembershipType];
  const memberNumber = `SLCC-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`;

  const db = getDb();

  const result = db.prepare(
    `INSERT INTO memberships (member_number, first_name, last_name, email, phone, address, city, state, zip,
      membership_type, start_date, end_date, amount_paid, payment_provider, payment_status, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    memberNumber, first_name, last_name, email, phone || null,
    address || null, city || null, state || "MN", zip || null,
    membership_type, "2026-05-01", "2026-10-31",
    tier.price, payment_provider || "square", "pending", "pending"
  );

  // In production, you would create a Square checkout or QuickBooks invoice here.
  // For now, return the membership details with a placeholder payment flow.
  if (payment_provider === "square") {
    // Square Checkout API would be called here to create a payment link
    // const { result: checkoutResult } = await squareClient.checkoutApi.createPaymentLink({...});
    return NextResponse.json({
      id: result.lastInsertRowid,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "square",
      message: "Membership created. Square payment integration ready - configure SQUARE_ACCESS_TOKEN in .env.local to enable online payments.",
    }, { status: 201 });
  } else {
    // QuickBooks Payments API would create an invoice here
    return NextResponse.json({
      id: result.lastInsertRowid,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "quickbooks",
      message: "Membership created. QuickBooks payment integration ready - configure QUICKBOOKS_CLIENT_ID in .env.local to enable online payments.",
    }, { status: 201 });
  }
}
