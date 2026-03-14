import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST /api/admin/memberships/nfc?id=<membership_id>
// Generates (or regenerates) the NFC token for a member.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const member = db.prepare("SELECT id FROM memberships WHERE id = ?").get(id);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = uuidv4();
  db.prepare("UPDATE memberships SET nfc_token = ? WHERE id = ?").run(token, id);

  return NextResponse.json({ nfc_token: token });
}
