import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { execute } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return { deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { deny: null };
}

// PATCH — update select fields on a membership record
export async function PATCH(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["nickname", "credit_limit"];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(", ");
  const values = updates.map(([, v]) => (v === "" ? null : v));

  await execute(
    `UPDATE memberships SET ${setClauses} WHERE id = $${values.length + 1}`,
    [...values, id]
  );

  return NextResponse.json({ ok: true });
}
