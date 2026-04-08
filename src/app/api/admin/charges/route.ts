import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query, execute } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }), email: "" };
  }
  return { deny: null, email: session.user.email };
}

export async function GET(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const status = request.nextUrl.searchParams.get("status") ?? "open";
  const rows = status === "all"
    ? await query("SELECT * FROM member_charges ORDER BY created_at DESC")
    : await query("SELECT * FROM member_charges WHERE status=$1 ORDER BY created_at DESC", [status]);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { deny, email } = await requireAdmin();
  if (deny) return deny;

  const {
    membership_id, contact_id, event_id,
    member_name, member_email, charge_type, description, amount, notes,
  } = await request.json();

  if (!member_name || !description || !amount) {
    return NextResponse.json({ error: "Name, description, and amount are required" }, { status: 400 });
  }

  const { id } = await execute(
    `INSERT INTO member_charges
       (membership_id, contact_id, event_id,
        member_name, member_email, charge_type, description, amount, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      membership_id || null,
      contact_id || null,
      event_id || null,
      member_name,
      member_email || null,
      charge_type || "other",
      description,
      parseFloat(amount),
      notes || null,
      email,
    ]
  );

  return NextResponse.json({ id }, { status: 201 });
}
