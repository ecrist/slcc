import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { execute } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (!["open", "paid", "voided"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await execute(
    `UPDATE member_charges SET status=$1, paid_at=CASE WHEN $1='paid' THEN NOW() ELSE NULL END WHERE id=$2`,
    [status, id]
  );

  return NextResponse.json({ ok: true });
}
