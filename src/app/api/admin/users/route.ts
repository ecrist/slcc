import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail, getAdminUsers, addAdminUser, removeAdminUser } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }), email: null };
  }
  return { deny: null, email: session.user.email };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const users = await getAdminUsers();
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

  await addAdminUser(email, actorEmail!);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { deny, email: actorEmail } = await requireAdmin();
  if (deny) return deny;

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
  }

  if (email.toLowerCase() === actorEmail?.toLowerCase()) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }

  await removeAdminUser(email);
  return NextResponse.json({ ok: true });
}
