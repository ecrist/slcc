import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail, getAdminUsers, addAdminUser, removeAdminUser } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }), email: null };
  }
  return { deny: null, email: session.user.email };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const users = getAdminUsers();
  const initial = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      is_initial: u.email.toLowerCase() === initial,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { deny, email: actorEmail } = await requireAdmin();
  if (deny) return deny;

  const { email } = await request.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  addAdminUser(email, actorEmail!);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { deny, email: actorEmail } = await requireAdmin();
  if (deny) return deny;

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
  }

  // Prevent removing the initial admin entirely — they always retain access
  // via INITIAL_ADMIN_EMAIL, but we still allow removing them from the visible
  // list since their access comes from the env var, not this table.
  // Prevent self-removal to avoid accidental lockout.
  if (email.toLowerCase() === actorEmail?.toLowerCase()) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }

  removeAdminUser(email);
  return NextResponse.json({ ok: true });
}
