import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail, getAllConfig, setConfigValue } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;

  return NextResponse.json(await getAllConfig());
}

export async function PUT(request: NextRequest) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const updates: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "string") {
      await setConfigValue(key, value);
    }
  }

  return NextResponse.json({ ok: true });
}
