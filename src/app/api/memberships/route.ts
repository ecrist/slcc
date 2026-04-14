import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import bcrypt from "bcryptjs";
import { sendAccountInvite } from "@/lib/email";

export async function GET() {
  const memberships = await query("SELECT * FROM memberships ORDER BY created_at DESC");
  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const {
    first_name, last_name, email, phone, address, city, state, zip,
    membership_type, payment_provider, admin_created,
  } = body;

  if (!first_name || !last_name || !email || !membership_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!(membership_type in MEMBERSHIP_TYPES)) {
    return NextResponse.json({ error: "Invalid membership type" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const tier = MEMBERSHIP_TYPES[membership_type as MembershipType];
  const memberNumber = `SLCC-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`;

  // Determine user_id — link to existing user or create one
  let userId: number | null = null;
  let accountCreated = false;

  // Check if a user with this email already exists
  const existingUser = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (existingUser) {
    userId = existingUser.id;
  } else if (admin_created && session?.user?.email && await isAdminEmail(session.user.email)) {
    // Admin is creating membership for someone without an account — create one
    const tempPassword = uuidv4().slice(0, 12);
    const hash = await bcrypt.hash(tempPassword, 12);
    const newUser = await queryOne<{ id: number }>(
      "INSERT INTO users (email, first_name, last_name, name, password_hash, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [normalizedEmail, first_name.trim(), last_name.trim(), `${first_name} ${last_name}`.trim(), hash, phone || null]
    );
    if (newUser) {
      userId = newUser.id;
      accountCreated = true;
      // Send invite email
      await sendAccountInvite({
        to: normalizedEmail,
        first_name,
        member_number: memberNumber,
      });
    }
  } else if (session?.user?.id) {
    // Logged-in user purchasing their own membership
    userId = Number(session.user.id);
  }

  const { id } = await execute(
    `INSERT INTO memberships
       (member_number, first_name, last_name, email, phone, address, city, state, zip,
        membership_type, start_date, end_date, amount_paid, payment_provider, payment_status, status, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      memberNumber, first_name, last_name, normalizedEmail, phone || null,
      address || null, city || null, state || "MN", zip || null,
      membership_type, "2026-05-01", "2026-10-31",
      tier.price, payment_provider || "square", "pending", "pending",
      userId,
    ]
  );

  if (payment_provider === "square") {
    return NextResponse.json({
      id,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "square",
      account_created: accountCreated,
      message: accountCreated
        ? "Membership created. An account invite has been sent to the member's email."
        : "Membership created. Square payment integration ready.",
    }, { status: 201 });
  } else {
    return NextResponse.json({
      id,
      member_number: memberNumber,
      amount: tier.price,
      payment_provider: "quickbooks",
      account_created: accountCreated,
      message: accountCreated
        ? "Membership created. An account invite has been sent to the member's email."
        : "Membership created. QuickBooks payment integration ready.",
    }, { status: 201 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, payment_status, status } = await request.json();
  await execute(
    "UPDATE memberships SET payment_status=$1, status=$2 WHERE id=$3",
    [payment_status ?? "paid", status ?? "active", id]
  );
  return NextResponse.json({ ok: true });
}
