import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const newUser = await queryOne<{ id: number }>(
    "INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id",
    [normalizedEmail, name.trim(), hash]
  );

  // Auto-link any existing memberships with this email
  if (newUser) {
    await execute(
      "UPDATE memberships SET user_id = $1 WHERE LOWER(email) = $2 AND user_id IS NULL",
      [newUser.id, normalizedEmail]
    );
  }

  return NextResponse.json({ ok: true });
}
