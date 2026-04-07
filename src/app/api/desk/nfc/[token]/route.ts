import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { queryOne } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;

  const member = await queryOne<{
    id: number; first_name: string; last_name: string;
    email: string; membership_type: string; status: string;
  }>(
    "SELECT id, first_name, last_name, email, membership_type, status FROM memberships WHERE nfc_token = $1",
    [token]
  );

  if (!member) {
    return NextResponse.json({ error: "NFC token not recognised" }, { status: 404 });
  }
  if (member.status !== "active") {
    return NextResponse.json({ error: "Membership is not active", member }, { status: 403 });
  }

  return NextResponse.json(member);
}
