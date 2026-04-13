import { auth } from "@/auth";
import { query, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await queryOne<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    created_at: string;
  }>("SELECT id, name, email, phone, created_at FROM users WHERE id = $1", [
    session.user.id,
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Look up linked membership
  const membership = await queryOne<{
    member_number: string;
    membership_type: string;
    status: string;
    start_date: string;
    end_date: string;
    payment_status: string;
  }>(
    `SELECT member_number, membership_type, status, start_date, end_date, payment_status
     FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [session.user.id]
  );

  return NextResponse.json({ ...user, membership: membership || null });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, currentPassword, newPassword } = body;

  // Build update fields
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (name && typeof name === "string" && name.trim()) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name.trim());
  }

  if (email && typeof email === "string" && email.trim()) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [normalizedEmail, session.user.id]
    );
    if (existing) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 }
      );
    }
    updates.push(`email = $${paramIndex++}`);
    values.push(normalizedEmail);
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(phone?.trim() || null);
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to set a new password" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await queryOne<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [session.user.id]
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }

    const hash = await bcrypt.hash(newPassword, 12);
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(hash);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(session.user.id));
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, email, phone, created_at`;

  const updated = await queryOne<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    created_at: string;
  }>(sql, values);

  return NextResponse.json(updated);
}
