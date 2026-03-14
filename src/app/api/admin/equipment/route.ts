import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDb } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const db = getDb();
  const items = db
    .prepare("SELECT * FROM equipment ORDER BY type, identifier")
    .all();

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

  const db = getDb();
  const result = db
    .prepare(`INSERT INTO equipment
      (type, identifier, make, model, year, serial_number, color, seats, fuel_type, battery_year, hours_reading, last_service_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      type, identifier.trim(),
      body.make ?? null, body.model ?? null, body.year ?? null,
      body.serial_number ?? null, body.color ?? null,
      body.seats ?? null, body.fuel_type ?? null,
      body.battery_year ?? null, body.hours_reading ?? null,
      body.last_service_date ?? null,
    );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
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

  const db = getDb();
  const existing = db.prepare("SELECT id FROM equipment WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare(`
    UPDATE equipment SET
      status = COALESCE(?, status),
      service_notes = ?,
      make = COALESCE(?, make),
      model = COALESCE(?, model),
      year = COALESCE(?, year),
      serial_number = COALESCE(?, serial_number),
      color = COALESCE(?, color),
      seats = COALESCE(?, seats),
      fuel_type = COALESCE(?, fuel_type),
      battery_year = COALESCE(?, battery_year),
      hours_reading = COALESCE(?, hours_reading),
      last_service_date = COALESCE(?, last_service_date),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    status ?? null, service_notes ?? null,
    body.make ?? null, body.model ?? null, body.year ?? null,
    body.serial_number ?? null, body.color ?? null,
    body.seats ?? null, body.fuel_type ?? null,
    body.battery_year ?? null, body.hours_reading ?? null,
    body.last_service_date ?? null,
    id,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM equipment WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
