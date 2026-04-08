import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query, execute } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

export async function GET(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length >= 2) {
    const rows = await query(
      `SELECT id, first_name, last_name, zip, email, phone, membership_id
       FROM contacts
       WHERE first_name ILIKE $1 OR last_name ILIKE $1
          OR (first_name || ' ' || last_name) ILIKE $1
       ORDER BY last_name, first_name
       LIMIT 20`,
      [`%${q}%`]
    );
    return NextResponse.json(rows);
  }

  const rows = await query(
    `SELECT c.*, m.member_number, m.status as membership_status
     FROM contacts c
     LEFT JOIN memberships m ON m.id = c.membership_id
     ORDER BY c.last_name, c.first_name`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { first_name, last_name, zip, email, phone, membership_id, notes } =
    await request.json();

  if (!first_name || !last_name) {
    return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
  }

  const row = await execute(
    `INSERT INTO contacts (first_name, last_name, zip, email, phone, membership_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [first_name, last_name, zip ?? null, email ?? null, phone ?? null, membership_id ?? null, notes ?? null]
  );

  return NextResponse.json({ id: row.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id, first_name, last_name, zip, email, phone, membership_id, notes } =
    await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await execute(
    `UPDATE contacts
     SET first_name=$1, last_name=$2, zip=$3, email=$4, phone=$5,
         membership_id=$6, notes=$7
     WHERE id=$8`,
    [first_name, last_name, zip ?? null, email ?? null, phone ?? null,
     membership_id ?? null, notes ?? null, id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await execute("DELETE FROM contacts WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
