import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const memberships = await query("SELECT * FROM memberships ORDER BY created_at DESC");
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

  const { id } = await execute(
    `INSERT INTO memberships
       (member_number, first_name, last_name, email, phone, address, city, state, zip,
        membership_type, start_date, end_date, amount_paid, payment_provider, payment_status, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      memberNumber, first_name, last_name, email, phone || null,
      address || null, city || null, state || "MN", zip || null,
      membership_type, "2026-05-01", "2026-10-31",
      tier.price, payment_provider || "square", "pending", "pending",
    ]
  );

  if (payment_provider === "square") {
    return NextResponse.json({
      id,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "square",
      message: "Membership created. Square payment integration ready - configure SQUARE_ACCESS_TOKEN in .env.local to enable online payments.",
    }, { status: 201 });
  } else {
    return NextResponse.json({
      id,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "quickbooks",
      message: "Membership created. QuickBooks payment integration ready - configure QUICKBOOKS_CLIENT_ID in .env.local to enable online payments.",
    }, { status: 201 });
  }
}
