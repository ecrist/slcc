import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { queryOne, execute } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successMsg = { message: "If an account exists with that email, a reset link has been sent." };

  const user = await queryOne<{ id: number; first_name: string; email: string }>(
    "SELECT id, first_name, email FROM users WHERE LOWER(email) = LOWER($1)",
    [email.trim()]
  );

  if (!user) {
    return NextResponse.json(successMsg);
  }

  // Invalidate any existing unused tokens for this user
  await execute(
    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
    [user.id]
  );

  // Generate a secure token, expires in 1 hour
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await execute(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [user.id, token, expiresAt.toISOString()]
  );

  const baseUrl = process.env.NEXTAUTH_URL || "https://book.swanlakecc.com";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  sendPasswordReset({
    to: user.email,
    first_name: user.first_name || "there",
    resetUrl,
  }).catch(() => {}); // fire-and-forget

  return NextResponse.json(successMsg);
}
