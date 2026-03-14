import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { sendMembershipReceipt, sendRenewalReminder } from "@/lib/email";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

type DbMembership = {
  id: number;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_type: string;
  end_date: string;
  auto_renew: number;
  square_customer_id: string | null;
  square_card_id: string | null;
  amount_paid: number | null;
};

// GET — preview which memberships are due for renewal (within 30 days or expired)
export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const due = db
    .prepare(
      `SELECT id, member_number, first_name, last_name, email, membership_type,
              end_date, auto_renew, square_customer_id, square_card_id, amount_paid
       FROM memberships
       WHERE status = 'active' AND end_date <= ?
       ORDER BY end_date ASC`
    )
    .all(cutoffStr) as DbMembership[];

  return NextResponse.json(due);
}

// POST — process renewals
// Body: { ids?: number[] } — if omitted, processes all auto_renew members due within 30 days
// Can also be called from a cron with ?secret=CRON_SECRET as query param (no session)
export async function POST(request: NextRequest) {
  // Allow cron access via secret
  const cronSecret = process.env.CRON_SECRET;
  const paramSecret = request.nextUrl.searchParams.get("secret");
  const isCron = cronSecret && paramSecret === cronSecret;

  if (!isCron) {
    const session = await auth();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({})) as { ids?: number[]; send_reminders?: boolean };
  const db = getDb();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  let memberships: DbMembership[];
  if (body.ids?.length) {
    const placeholders = body.ids.map(() => "?").join(",");
    memberships = db
      .prepare(`SELECT * FROM memberships WHERE id IN (${placeholders})`)
      .all(...body.ids) as DbMembership[];
  } else {
    memberships = db
      .prepare(
        `SELECT * FROM memberships
         WHERE status = 'active' AND auto_renew = 1 AND end_date <= ?`
      )
      .all(cutoffStr) as DbMembership[];
  }

  const results: { id: number; status: "charged" | "reminded" | "skipped"; error?: string }[] = [];

  for (const m of memberships) {
    const tier = MEMBERSHIP_TYPES[m.membership_type as MembershipType];
    if (!tier) {
      results.push({ id: m.id, status: "skipped", error: "Unknown membership type" });
      continue;
    }

    // If we have a stored Square card, charge it
    if (m.auto_renew && m.square_customer_id && m.square_card_id) {
      try {
        const { getSquareClient, getSquareLocationId } = await import("@/lib/square/client");
        const client = getSquareClient();

        const paymentResult = await client.paymentsApi.createPayment({
          sourceId: m.square_card_id,
          customerId: m.square_customer_id,
          idempotencyKey: uuidv4(),
          amountMoney: { amount: BigInt(Math.round(tier.price * 100)), currency: "USD" },
          locationId: getSquareLocationId(),
          note: `Swan Lake CC — ${tier.name} membership renewal`,
        });

        if (paymentResult.result.payment?.id) {
          const newMemberNumber = `SLCC-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`;
          const nextSeasonEnd = "2027-10-31";

          db.prepare(
            `INSERT INTO memberships
               (member_number, first_name, last_name, email, phone, membership_type,
                start_date, end_date, amount_paid, payment_id, payment_provider,
                payment_status, status, auto_renew, square_customer_id, square_card_id)
             SELECT ?, first_name, last_name, email, phone, membership_type,
                date('now'), ?, ?, ?, 'square_card_on_file', 'paid', 'active',
                auto_renew, square_customer_id, square_card_id
             FROM memberships WHERE id = ?`
          ).run(
            newMemberNumber, nextSeasonEnd, tier.price,
            paymentResult.result.payment.id, m.id,
          );

          await sendMembershipReceipt({
            to: m.email,
            first_name: m.first_name,
            last_name: m.last_name,
            member_number: newMemberNumber,
            membership_type: tier.name,
            amount: tier.price,
            payment_provider: "Square (auto-renewal)",
            season_end: nextSeasonEnd,
          });

          results.push({ id: m.id, status: "charged" });
        } else {
          results.push({ id: m.id, status: "skipped", error: "Payment failed" });
        }
      } catch (err) {
        results.push({ id: m.id, status: "skipped", error: String(err) });
      }
    } else if (body.send_reminders) {
      // No card on file — send renewal reminder email instead
      if (m.email) {
        await sendRenewalReminder({
          to: m.email,
          first_name: m.first_name,
          membership_type: tier.name,
          end_date: m.end_date,
          amount: tier.price,
          auto_renew: false,
        });
        results.push({ id: m.id, status: "reminded" });
      } else {
        results.push({ id: m.id, status: "skipped", error: "No email on file" });
      }
    } else {
      results.push({ id: m.id, status: "skipped" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
