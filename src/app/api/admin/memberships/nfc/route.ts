import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { queryOne, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST /api/admin/memberships/nfc?id=<membership_id>
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const member = await queryOne<{ id: number }>(
    "SELECT id FROM memberships WHERE id = $1",
    [id]
  );
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = uuidv4();
  await execute("UPDATE memberships SET nfc_token = $1 WHERE id = $2", [token, id]);

  return NextResponse.json({ nfc_token: token });
}
