/**
 * Database migration script.
 * Run once on fresh installs and after updates:
 *
 *   npm run db:migrate
 *
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS and ON CONFLICT DO NOTHING.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // ── Schema ─────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tee_times (
        id                SERIAL PRIMARY KEY,
        date              TEXT NOT NULL,
        time              TEXT NOT NULL,
        players           INTEGER NOT NULL DEFAULT 1,
        player_name       TEXT NOT NULL,
        player_email      TEXT NOT NULL,
        player_phone      TEXT,
        holes             INTEGER NOT NULL DEFAULT 18,
        cart              SMALLINT NOT NULL DEFAULT 0,
        status            TEXT NOT NULL DEFAULT 'confirmed',
        notes             TEXT,
        group_booking_id  TEXT,
        slot_index        INTEGER NOT NULL DEFAULT 0,
        carts_requested   INTEGER NOT NULL DEFAULT 0,
        buggies_requested INTEGER NOT NULL DEFAULT 0,
        clubs_requested   INTEGER NOT NULL DEFAULT 0,
        personal_cart_drop SMALLINT NOT NULL DEFAULT 0,
        checked_in        SMALLINT NOT NULL DEFAULT 0,
        checked_in_at     TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memberships (
        id                 SERIAL PRIMARY KEY,
        member_number      TEXT UNIQUE,
        first_name         TEXT NOT NULL,
        last_name          TEXT NOT NULL,
        email              TEXT NOT NULL,
        phone              TEXT,
        address            TEXT,
        city               TEXT,
        state              TEXT DEFAULT 'MN',
        zip                TEXT,
        membership_type    TEXT NOT NULL,
        start_date         TEXT NOT NULL,
        end_date           TEXT NOT NULL,
        amount_paid        REAL,
        payment_id         TEXT,
        payment_provider   TEXT,
        payment_status     TEXT DEFAULT 'pending',
        status             TEXT NOT NULL DEFAULT 'active',
        nfc_token          TEXT,
        auto_renew         SMALLINT NOT NULL DEFAULT 0,
        square_customer_id TEXT,
        square_card_id     TEXT,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS events (
        id                   SERIAL PRIMARY KEY,
        title                TEXT NOT NULL,
        description          TEXT,
        event_date           TEXT NOT NULL,
        start_time           TEXT,
        end_time             TEXT,
        location             TEXT DEFAULT 'Swan Lake Country Club',
        event_type           TEXT NOT NULL DEFAULT 'general',
        max_participants     INTEGER,
        current_participants INTEGER DEFAULT 0,
        cost                 REAL,
        is_public            SMALLINT NOT NULL DEFAULT 1,
        image_url            TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_registrations (
        id             SERIAL PRIMARY KEY,
        event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name           TEXT NOT NULL,
        email          TEXT NOT NULL,
        phone          TEXT,
        party_size     INTEGER DEFAULT 1,
        payment_id     TEXT,
        payment_status TEXT DEFAULT 'pending',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL UNIQUE,
        added_by   TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS site_config (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        label       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id                 SERIAL PRIMARY KEY,
        type               TEXT NOT NULL DEFAULT 'walk_in',
        name               TEXT NOT NULL,
        email              TEXT,
        players            INTEGER NOT NULL DEFAULT 1,
        holes              INTEGER NOT NULL DEFAULT 18,
        carts_requested    INTEGER NOT NULL DEFAULT 0,
        buggies_requested  INTEGER NOT NULL DEFAULT 0,
        clubs_requested    INTEGER NOT NULL DEFAULT 0,
        personal_cart_drop SMALLINT NOT NULL DEFAULT 0,
        membership_id      INTEGER REFERENCES memberships(id),
        tee_time_id        INTEGER REFERENCES tee_times(id),
        notes              TEXT,
        checked_in_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS equipment (
        id               SERIAL PRIMARY KEY,
        type             TEXT NOT NULL,
        identifier       TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'available',
        service_notes    TEXT,
        make             TEXT,
        model            TEXT,
        year             INTEGER,
        serial_number    TEXT,
        color            TEXT,
        seats            INTEGER,
        fuel_type        TEXT,
        battery_year     INTEGER,
        hours_reading    REAL,
        last_service_date TEXT,
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id                    SERIAL PRIMARY KEY,
        title                 TEXT NOT NULL,
        description           TEXT,
        tournament_date       TEXT NOT NULL,
        registration_deadline TEXT,
        format                TEXT NOT NULL DEFAULT 'luck_of_the_draw',
        team_size             INTEGER NOT NULL DEFAULT 2,
        max_entries           INTEGER,
        entry_fee             REAL NOT NULL DEFAULT 0,
        holes                 INTEGER NOT NULL DEFAULT 18,
        status                TEXT NOT NULL DEFAULT 'registration_open',
        results_notes         TEXT,
        is_public             SMALLINT NOT NULL DEFAULT 1,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournament_entries (
        id             SERIAL PRIMARY KEY,
        tournament_id  INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        player_name    TEXT NOT NULL,
        player_email   TEXT,
        player_phone   TEXT,
        handicap       REAL,
        team_id        INTEGER,
        flight         TEXT,
        notes          TEXT,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_id     TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournament_teams (
        id            SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        team_name     TEXT NOT NULL,
        flight        TEXT,
        tee_time      TEXT,
        tee_hole      INTEGER DEFAULT 1,
        gross_score   INTEGER,
        net_score     REAL,
        place         INTEGER
      );

      CREATE TABLE IF NOT EXISTS member_charges (
        id            SERIAL PRIMARY KEY,
        membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
        member_name   TEXT NOT NULL,
        member_email  TEXT,
        charge_type   TEXT NOT NULL DEFAULT 'other',
        description   TEXT NOT NULL,
        amount        REAL NOT NULL,
        status        TEXT NOT NULL DEFAULT 'open',
        notes         TEXT,
        created_by    TEXT,
        paid_at       TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── contacts table ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id            SERIAL PRIMARY KEY,
        first_name    TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        zip           TEXT,
        email         TEXT,
        phone         TEXT,
        membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Column migrations (idempotent) ─────────────────────────────────────────
    const alterations = [
      // Toast POS dedup / source tracking
      "ALTER TABLE member_charges ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE",
      "ALTER TABLE member_charges ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'",
      // Nickname for member name matching (Toast tab names, desk search, etc.)
      "ALTER TABLE memberships ADD COLUMN IF NOT EXISTS nickname TEXT",
      "ALTER TABLE contacts   ADD COLUMN IF NOT EXISTS nickname TEXT",
      // Contact / corporate-event linking
      "ALTER TABLE member_charges ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL",
      "ALTER TABLE member_charges ADD COLUMN IF NOT EXISTS event_id   INTEGER REFERENCES events(id) ON DELETE SET NULL",
      // Member credit accounts
      "ALTER TABLE memberships ADD COLUMN IF NOT EXISTS credit_limit REAL",
      // Corporate-event flag on events
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS is_corporate_event SMALLINT NOT NULL DEFAULT 0",
      // Walk-in contact linkage on check-in log
      "ALTER TABLE checkins ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL",
      // Link memberships to user accounts
      "ALTER TABLE memberships ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
      // Add phone to users for profile completeness
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT",
      // Split name into first_name / last_name
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT NOT NULL DEFAULT ''",
    ];

    // ── Password reset tokens table ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const sql of alterations) {
      await client.query(sql);
    }

    // ── Backfill: split users.name → first_name / last_name ──────────────────
    await client.query(`
      UPDATE users
      SET
        first_name = CASE WHEN name LIKE '% %' THEN split_part(name, ' ', 1) ELSE name END,
        last_name  = CASE WHEN name LIKE '% %' THEN trim(substring(name FROM position(' ' IN name))) ELSE '' END
      WHERE first_name = ''
    `);

    // ── Backfill: link memberships to users by email ─────────────────────────
    await client.query(`
      UPDATE memberships m
      SET user_id = u.id
      FROM users u
      WHERE LOWER(m.email) = LOWER(u.email)
        AND m.user_id IS NULL
    `);

    // ── Indexes ────────────────────────────────────────────────────────────────
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(tournament_date)",
      "CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id)",
      "CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id)",
      "CREATE INDEX IF NOT EXISTS idx_tee_times_date ON tee_times(date)",
      "CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)",
      "CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status)",
      "CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type)",
      "CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checked_in_at)",
      // Prevents double-booking at the DB level
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_tee_times_unique_active ON tee_times(date, time) WHERE status != 'cancelled'",
    ];
    for (const idx of indexes) {
      await client.query(idx);
    }

    // ── Default site configuration ─────────────────────────────────────────────
    const defaults: [string, string, string, string][] = [
      ["course_open",            "true",            "Course Open for Booking",       "Allow new tee time bookings to be made online"],
      ["booking_days_ahead",     "8",               "Booking Window (days)",          "How many days ahead tee times are shown (e.g. 8 = today through 8 days out)"],
      ["green_fee_9_holes",      "25",              "9-Hole Green Fee ($)",           ""],
      ["green_fee_18_holes",     "35",              "18-Hole Green Fee ($)",          ""],
      ["cart_fee_per_9",         "10",              "Cart Rental Fee ($ / 9 holes)",  ""],
      ["buggy_fee",              "5",               "Walking Buggy Fee ($)",          "Fee to rent a push/pull buggy for a round"],
      ["clubs_fee",              "15",              "Club Rental Fee ($)",            "Fee to rent a set of clubs for a round"],
      ["personal_cart_drop_fee", "15",              "Personal Cart Drop Fee ($)",     "Daily fee for a guest to bring their own golf cart onto the course"],
      ["cart_storage_fee",       "250",             "Cart Storage Fee ($ / season)",  "Seasonal fee for members to store their personal cart at the club"],
      ["contact_phone",          "(218) 885-3543",  "Contact Phone",                  ""],
      ["contact_email",          "golf@swanlakecc.com", "Contact Email",             ""],
      ["season_start",           "05-01",           "Season Start (MM-DD)",            "First day bookings are accepted, e.g. 05-01 for May 1"],
      ["season_end",             "10-31",           "Season End (MM-DD)",              "Last day bookings are accepted, e.g. 10-31 for Oct 31"],
      ["tee_time_open",          "07:00",           "First Tee Time",                  "Earliest available booking slot, e.g. 07:00"],
      ["tee_time_close",         "",                "Last Tee Time",                   "Latest booking slot (e.g. 17:48). Leave blank to use sunset-based cutoff automatically."],
      ["clubhouse_open",         "06:00",           "Clubhouse Opens",                 "When the clubhouse opens (display only)"],
      ["clubhouse_close",        "20:00",           "Clubhouse Closes",                "When the clubhouse closes (display only)"],
      ["sunset_cutoff_enabled",  "true",            "Sunset Cutoff (legacy)",          "No longer used — sunset cutoff is automatic when Last Tee Time is blank"],
      ["sunset_cutoff_hours",    "2",               "Sunset Cutoff (hours before)",    "How many hours before sunset to stop accepting bookings"],
      ["course_latitude",        "47.72",           "Course Latitude",                 "Used for sunset calculation — Pengilly, MN default"],
      ["course_longitude",       "-93.01",          "Course Longitude",                "Used for sunset calculation — Pengilly, MN default"],
      ["smtp_host",              "",                "SMTP Host",                      "e.g. smtp.sendgrid.net or mail.swanlakecc.com"],
      ["smtp_port",              "587",             "SMTP Port",                      "587 for STARTTLS, 465 for implicit TLS"],
      ["smtp_secure",            "",                "SMTP Secure (TLS)",              "Set to 'true' for port 465; leave empty for STARTTLS"],
      ["smtp_user",              "",                "SMTP Username",                  ""],
      ["smtp_pass",              "",                "SMTP Password",                  ""],
      ["smtp_from",              "Swan Lake Country Club <noreply@swanlakecc.com>", "From Address", ""],
      ["square_access_token",    "",                "Square Access Token",            "Server-side token from Square Developer Dashboard"],
      ["square_application_id",  "",                "Square Application ID",          "Also used client-side for Google Pay / Apple Pay"],
      ["square_location_id",     "",                "Square Location ID",             ""],
      ["square_environment",     "sandbox",         "Square Environment",             "sandbox or production"],
      ["quickbooks_client_id",   "",                "QuickBooks Client ID",           ""],
      ["quickbooks_client_secret", "",              "QuickBooks Client Secret",       ""],
      ["quickbooks_redirect_uri", "https://book.swanlakecc.com/api/payments/quickbooks/callback", "QuickBooks Redirect URI", ""],
      ["quickbooks_environment", "sandbox",         "QuickBooks Environment",         "sandbox or production"],
      ["google_client_id",       "",                "Google Client ID",               "From Google Cloud Console — set GOOGLE_CLIENT_ID env var too"],
      ["google_client_secret",   "",                "Google Client Secret",           "Set GOOGLE_CLIENT_SECRET env var too"],
      ["apple_id",               "",                "Apple Services ID",              "e.g. com.swanlakecc.book — set APPLE_ID env var too"],
      ["apple_secret",           "",                "Apple Private Key",              "Full contents of your .p8 file — set APPLE_SECRET env var too"],
      ["cron_secret",            "",                "Cron Secret",                    "Shared secret for POST /api/admin/billing/renew?secret=… — use a long random string"],
      ["toast_webhook_secret",   "",                "Toast Webhook Secret",            "HMAC-SHA256 secret from Toast Partner Portal — used to verify incoming webhook signatures"],
      ["toast_location_guid",    "",                "Toast Restaurant GUID",           "Your restaurant's GUID from the Toast Portal — used to validate that webhooks are for this location"],
      ["announcement_enabled",   "false",           "Show Announcement Banner",        "Display a site-wide announcement banner above the header"],
      ["announcement_message",   "",                "Announcement Message",            "Text to display in the announcement banner (e.g. course closed for weather, special event)"],
      // Rates — green fees
      ["green_fee_youth_16_18",  "15",              "Youth Green Fee 16-18 ($)",       ""],
      ["green_fee_youth_13_15",  "10",              "Youth Green Fee 13-15 ($)",       ""],
      // Rates — cart fees (member)
      ["cart_member_half_9",     "10",              "Member Half Cart 9 Holes ($)",    ""],
      ["cart_member_full_9",     "17.50",           "Member Full Cart 9 Holes ($)",    ""],
      ["cart_member_half_18",    "15",              "Member Half Cart 18 Holes ($)",   ""],
      ["cart_member_full_18",    "25",              "Member Full Cart 18 Holes ($)",   ""],
      // Rates — cart fees (non-member)
      ["cart_nonmember_half_9",  "17.50",           "Non-Member Half Cart 9 Holes ($)",""],
      ["cart_nonmember_full_9",  "30",              "Non-Member Full Cart 9 Holes ($)",""],
      ["cart_nonmember_half_18", "25",              "Non-Member Half Cart 18 Holes ($)",""],
      ["cart_nonmember_full_18", "40",              "Non-Member Full Cart 18 Holes ($)",""],
      // Rates — other fees
      ["pull_cart_fee",          "3",               "Pull Cart Rental ($)",            ""],
      ["club_rental_9",         "15",              "Club Rental 9 Holes ($)",         ""],
      ["club_rental_18",        "20",              "Club Rental 18 Holes ($)",        ""],
      ["cart_storage_trail",     "120",             "Trail Fee Seasonal ($)",          ""],
      ["cart_storage_gas",       "200",             "Gas Cart Storage Annual ($)",     ""],
      ["cart_storage_electric",  "230",             "Electric Cart Storage Annual ($)",""],
      // Rates — driving range
      ["range_small_bag",        "5",               "Range Small Bag ($)",             ""],
      ["range_large_bag",        "7",               "Range Large Bag ($)",             ""],
      // Season auto-toggle dates
      ["course_auto_open_date",  "",                "Auto-Open Date",                  "Automatically open the course on this date (YYYY-MM-DD). Leave blank for manual control."],
      ["course_auto_close_date", "",                "Auto-Close Date",                 "Automatically close the course on this date (YYYY-MM-DD). Leave blank for manual control."],
      // Footer / display hours
      ["proshop_open",           "7:00 AM",         "Pro Shop Opens",                  "Display only — shown in the site footer"],
      ["proshop_close",          "6:00 PM",         "Pro Shop Closes",                 "Display only — shown in the site footer"],
    ];

    for (const [key, value, label, description] of defaults) {
      await client.query(
        `INSERT INTO site_config (key, value, label, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [key, value, label, description]
      );
    }

    // ── Default admin user (only if no users exist) ────────────────────────────
    const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM users");
    if ((rows[0] as { n: number }).n === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        "INSERT INTO users (email, first_name, last_name, name, password_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        ["admin@swanlakecc.com", "Admin", "", "Admin", passwordHash]
      );
      await client.query(
        "INSERT INTO admin_users (email, added_by) VALUES ($1, 'system') ON CONFLICT DO NOTHING",
        ["admin@swanlakecc.com"]
      );
      console.log("Created default admin: admin@swanlakecc.com / " + adminPassword);
      console.log("Change the password immediately after first login.");
    }

    console.log("Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
