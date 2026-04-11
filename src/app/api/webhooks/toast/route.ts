import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { findMembershipByName, verifySignature } from "@/lib/toast";

// ── Toast webhook types ───────────────────────────────────────────────────────

interface ToastSelection {
  name: string;
  quantity: number;
  price: number; // cents
  modifiers?: { name: string; price: number }[];
}

interface ToastCheck {
  guid: string;
  displayNumber?: string;
  tabName?: string;
  totalAmount: number; // cents
  selections?: ToastSelection[];
}

interface ToastOrder {
  guid: string;
  restaurantGuid?: string;
  checks?: ToastCheck[];
}

interface ToastWebhookPayload {
  eventType: string;
  order?: ToastOrder;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Toast-Signature") ?? "";

  // Fetch config from DB
  const configRows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM site_config WHERE key IN ('toast_webhook_secret', 'toast_location_guid')`
  );
  const cfg = Object.fromEntries(configRows.map((r) => [r.key, r.value]));
  const secret = cfg["toast_webhook_secret"] ?? "";
  const locationGuid = cfg["toast_location_guid"] ?? "";

  // Reject if no secret configured
  if (!secret) {
    console.warn("[toast-webhook] No toast_webhook_secret configured — rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Verify signature
  if (!verifySignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ToastWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle CHECK_CLOSED events
  if (payload.eventType !== "CHECK_CLOSED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const order = payload.order;
  if (!order) return NextResponse.json({ ok: true, skipped: true });

  // Validate restaurant GUID if configured
  if (locationGuid && order.restaurantGuid && order.restaurantGuid !== locationGuid) {
    return NextResponse.json({ error: "Restaurant GUID mismatch" }, { status: 400 });
  }

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const check of order.checks ?? []) {
    const externalId = `toast-${check.guid}`;
    const tabName = check.tabName ?? `Check #${check.displayNumber ?? check.guid.slice(0, 8)}`;
    const amountDollars = check.totalAmount / 100;

    // Build description from selections
    const lines = (check.selections ?? [])
      .map((s) => `${s.quantity}x ${s.name}`)
      .join(", ");
    const description = lines ? `Toast tab: ${lines}` : `Toast tab — Check #${check.displayNumber ?? check.guid.slice(0, 8)}`;

    // Match member
    const member = await findMembershipByName(tabName);
    const membershipId = member?.id ?? null;
    const memberName = member?.member_name ?? tabName;

    try {
      await execute(
        `INSERT INTO member_charges
           (membership_id, member_name, charge_type, description, amount, source, external_id, created_by)
         VALUES ($1, $2, 'bar_tab', $3, $4, 'toast', $5, 'toast-webhook')`,
        [membershipId, memberName, description, amountDollars, externalId]
      );
      inserted.push(check.guid);
    } catch (err: unknown) {
      // UNIQUE violation on external_id = duplicate delivery, safe to ignore
      if ((err as { code?: string }).code === "23505") {
        skipped.push(check.guid);
      } else {
        throw err;
      }
    }
  }

  return NextResponse.json({ ok: true, inserted: inserted.length, skipped: skipped.length });
}
