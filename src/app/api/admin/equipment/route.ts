import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { query, queryOne, execute } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const items = await query("SELECT * FROM equipment ORDER BY type, identifier");
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const body = await request.json();
  const { type, identifier } = body;
  if (!type || !identifier) {
    return NextResponse.json({ error: "type and identifier are required" }, { status: 400 });
  }
  const validTypes = ["cart", "buggy", "clubs"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "type must be cart, buggy, or clubs" }, { status: 400 });
  }

  const { id } = await execute(
    `INSERT INTO equipment
       (type, identifier, make, model, year, serial_number, color, seats, fuel_type, battery_year, hours_reading, last_service_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      type, identifier.trim(),
      body.make ?? null, body.model ?? null, body.year ?? null,
      body.serial_number ?? null, body.color ?? null,
      body.seats ?? null, body.fuel_type ?? null,
      body.battery_year ?? null, body.hours_reading ?? null,
      body.last_service_date ?? null,
    ]
  );

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();
  const { status, service_notes } = body;
  const validStatuses = ["available", "out_of_service", "maintenance"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await queryOne<{ id: number }>("SELECT id FROM equipment WHERE id = $1", [id]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute(
    `UPDATE equipment SET
       status            = COALESCE($1,  status),
       service_notes     = $2,
       make              = COALESCE($3,  make),
       model             = COALESCE($4,  model),
       year              = COALESCE($5,  year),
       serial_number     = COALESCE($6,  serial_number),
       color             = COALESCE($7,  color),
       seats             = COALESCE($8,  seats),
       fuel_type         = COALESCE($9,  fuel_type),
       battery_year      = COALESCE($10, battery_year),
       hours_reading     = COALESCE($11, hours_reading),
       last_service_date = COALESCE($12, last_service_date),
       updated_at        = NOW()
     WHERE id = $13`,
    [
      status ?? null, service_notes ?? null,
      body.make ?? null, body.model ?? null, body.year ?? null,
      body.serial_number ?? null, body.color ?? null,
      body.seats ?? null, body.fuel_type ?? null,
      body.battery_year ?? null, body.hours_reading ?? null,
      body.last_service_date ?? null,
      id,
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await execute("DELETE FROM equipment WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
