import nodemailer from "nodemailer";
import { getConfigValue } from "@/lib/admin";

async function getTransporter() {
  const host = await getConfigValue("smtp_host");
  if (!host) return null;
  const user = (await getConfigValue("smtp_user")) || undefined;
  return nodemailer.createTransport({
    host,
    port: parseInt((await getConfigValue("smtp_port")) ?? "587"),
    secure: (await getConfigValue("smtp_secure")) === "true",
    auth: user ? { user, pass: (await getConfigValue("smtp_pass")) ?? "" } : undefined,
  });
}

async function getFrom() {
  return (
    (await getConfigValue("smtp_from")) ??
    "Swan Lake Country Club <noreply@swanlakecc.com>"
  );
}

function getSiteUrl() {
  return process.env.NEXTAUTH_URL ?? "https://book.swanlakecc.com";
}

async function send(to: string, subject: string, html: string) {
  const t = await getTransporter();
  if (!t) {
    console.warn("[email] smtp_host not configured in site settings — skipping email to", to);
    return;
  }
  const FROM = await getFrom();
  try {
    await t.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send to", to, err);
  }
}

function layout(body: string) {
  const SITE = getSiteUrl();
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="background:#1a4a2e;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#c9a84c;margin:0;font-size:20px;">Swan Lake Country Club</h1>
    <p style="color:#a0b8a8;margin:4px 0 0;font-size:13px;">Pengilly, MN</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${body}
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
    Swan Lake Country Club &bull; Pengilly, MN &bull; (218) 885-3543 &bull; <a href="${SITE}" style="color:#9ca3af;">${SITE}</a>
  </p></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${value}</td></tr>`;
}

// ── Tee time confirmation ──────────────────────────────────────────────────────

export async function sendTeeTimeConfirmation(opts: {
  to: string;
  player_name: string;
  date: string;
  time: string;
  players: number;
  holes: number;
  slots: string[];
  carts: number;
  buggies: number;
  clubs: number;
  personal_cart_drop: boolean;
  group_booking_id: string;
}) {
  const dateLabel = new Date(opts.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeLabel = opts.time;
  const extras = [
    opts.carts > 0 && `${opts.carts} golf cart${opts.carts > 1 ? "s" : ""}`,
    opts.buggies > 0 && `${opts.buggies} walking buggy${opts.buggies > 1 ? "s" : ""}`,
    opts.clubs > 0 && `${opts.clubs} club set${opts.clubs > 1 ? "s" : ""}`,
    opts.personal_cart_drop && "personal cart drop",
  ].filter(Boolean).join(", ");

  await send(
    opts.to,
    `Tee Time Confirmed — ${dateLabel} at ${timeLabel}`,
    layout(`
      <h2 style="color:#1a4a2e;margin:0 0 16px;">Your tee time is confirmed!</h2>
      <table cellpadding="0" cellspacing="0">
        ${row("Date", dateLabel)}
        ${row("Tee time", timeLabel)}
        ${row("Players", String(opts.players))}
        ${row("Holes", String(opts.holes))}
        ${opts.slots.length > 1 ? row("Slots reserved", opts.slots.join(", ")) : ""}
        ${extras ? row("Equipment", extras) : ""}
      </table>
      <p style="margin:20px 0 8px;font-size:13px;color:#6b7280;">
        To cancel your tee time, visit <a href="${getSiteUrl()}/tee-times" style="color:#1a4a2e;">${getSiteUrl()}/tee-times</a>
        or call us at (218) 885-3543.
      </p>
    `)
  );
}

// ── Membership receipt ─────────────────────────────────────────────────────────

export async function sendMembershipReceipt(opts: {
  to: string;
  first_name: string;
  last_name: string;
  member_number: string;
  membership_type: string;
  amount: number;
  payment_provider: string;
  season_end: string;
}) {
  await send(
    opts.to,
    `Membership Confirmed — Welcome to Swan Lake CC, ${opts.first_name}!`,
    layout(`
      <h2 style="color:#1a4a2e;margin:0 0 4px;">Welcome to Swan Lake Country Club!</h2>
      <p style="margin:0 0 20px;color:#4b5563;">Your ${opts.membership_type} membership is active for the 2026 season.</p>
      <table cellpadding="0" cellspacing="0">
        ${row("Member name", `${opts.first_name} ${opts.last_name}`)}
        ${row("Member #", opts.member_number)}
        ${row("Membership", opts.membership_type)}
        ${row("Amount paid", `$${opts.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)}
        ${row("Valid through", opts.season_end)}
        ${row("Payment", opts.payment_provider)}
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
        Questions? Call us at (218) 885-3543 or email <a href="mailto:golf@swanlakecc.com" style="color:#1a4a2e;">golf@swanlakecc.com</a>.
      </p>
    `)
  );
}

// ── Account invite (admin-created membership) ─────────────────────────────────

export async function sendAccountInvite(opts: {
  to: string;
  first_name: string;
  member_number: string;
}) {
  const SITE = getSiteUrl();
  await send(
    opts.to,
    `Welcome to Swan Lake CC — Set Up Your Account`,
    layout(`
      <h2 style="color:#1a4a2e;margin:0 0 4px;">Welcome to Swan Lake Country Club!</h2>
      <p style="margin:0 0 16px;color:#4b5563;">
        Hi ${opts.first_name}, a membership has been created for you (member #${opts.member_number}).
        An account has been set up with this email address. Please set your password to get started.
      </p>
      <a href="${SITE}/login" style="background:#1a4a2e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
        Sign In &amp; Set Password
      </a>
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
        Once logged in, visit your <a href="${SITE}/settings" style="color:#1a4a2e;">account settings</a> to update your password and profile.
        Questions? Call (218) 885-3543 or email <a href="mailto:golf@swanlakecc.com" style="color:#1a4a2e;">golf@swanlakecc.com</a>.
      </p>
    `)
  );
}

// ── Membership renewal reminder ────────────────────────────────────────────────

export async function sendRenewalReminder(opts: {
  to: string;
  first_name: string;
  membership_type: string;
  end_date: string;
  amount: number;
  auto_renew: boolean;
}) {
  const subject = opts.auto_renew
    ? `Your Swan Lake CC membership renews soon`
    : `Renew your Swan Lake CC membership for 2027`;

  await send(
    opts.to,
    subject,
    layout(`
      <h2 style="color:#1a4a2e;margin:0 0 4px;">Membership Renewal</h2>
      <p style="margin:0 0 16px;color:#4b5563;">
        ${opts.auto_renew
          ? `Your <strong>${opts.membership_type}</strong> membership will automatically renew on <strong>${opts.end_date}</strong> for $${opts.amount}.`
          : `Your <strong>${opts.membership_type}</strong> membership expires on <strong>${opts.end_date}</strong>. Renew now to lock in your 2027 season!`}
      </p>
      ${!opts.auto_renew ? `<a href="${getSiteUrl()}/memberships" style="background:#1a4a2e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Renew Membership</a>` : ""}
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
        Questions? Call (218) 885-3543 or email <a href="mailto:golf@swanlakecc.com" style="color:#1a4a2e;">golf@swanlakecc.com</a>.
      </p>
    `)
  );
}

// ── Tournament registration ────────────────────────────────────────────────────

export async function sendTournamentRegistration(opts: {
  to: string;
  player_name: string;
  tournament_title: string;
  tournament_date: string;
  format: string;
  entry_fee: number;
}) {
  const dateLabel = new Date(opts.tournament_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await send(
    opts.to,
    `Tournament Registration — ${opts.tournament_title}`,
    layout(`
      <h2 style="color:#1a4a2e;margin:0 0 4px;">You're registered!</h2>
      <p style="margin:0 0 20px;color:#4b5563;">Your registration for <strong>${opts.tournament_title}</strong> has been received.</p>
      <table cellpadding="0" cellspacing="0">
        ${row("Player", opts.player_name)}
        ${row("Tournament", opts.tournament_title)}
        ${row("Date", dateLabel)}
        ${row("Format", opts.format.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))}
        ${opts.entry_fee > 0 ? row("Entry fee", `$${opts.entry_fee}`) : ""}
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
        Check <a href="${getSiteUrl()}/tournaments" style="color:#1a4a2e;">${getSiteUrl()}/tournaments</a> for draw results and leaderboards.
        Questions? Call (218) 885-3543.
      </p>
    `)
  );
}
