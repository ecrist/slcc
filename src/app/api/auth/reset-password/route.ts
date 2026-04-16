import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Find valid, unused, non-expired token
  const resetToken = await queryOne<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );

  if (!resetToken) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Hash the new password and update the user
  const passwordHash = await bcrypt.hash(password, 12);
  await execute("UPDATE users SET password_hash = $1 WHERE id = $2", [
    passwordHash,
    resetToken.user_id,
  ]);

  // Mark the token as used
  await execute("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [
    resetToken.id,
  ]);

  return NextResponse.json({ message: "Password has been reset. You can now sign in." });
}
