import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "swan-lake.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tee_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      players INTEGER NOT NULL DEFAULT 1,
      player_name TEXT NOT NULL,
      player_email TEXT NOT NULL,
      player_phone TEXT,
      holes INTEGER NOT NULL DEFAULT 18,
      cart INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'confirmed',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_number TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT DEFAULT 'MN',
      zip TEXT,
      membership_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      amount_paid REAL,
      payment_id TEXT,
      payment_provider TEXT,
      payment_status TEXT DEFAULT 'pending',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT DEFAULT 'Swan Lake Country Club',
      event_type TEXT NOT NULL DEFAULT 'general',
      max_participants INTEGER,
      current_participants INTEGER DEFAULT 0,
      cost REAL,
      is_public INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      party_size INTEGER DEFAULT 1,
      payment_id TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      added_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'walk_in',
      name TEXT NOT NULL,
      email TEXT,
      players INTEGER NOT NULL DEFAULT 1,
      holes INTEGER NOT NULL DEFAULT 18,
      carts_requested INTEGER NOT NULL DEFAULT 0,
      buggies_requested INTEGER NOT NULL DEFAULT 0,
      clubs_requested INTEGER NOT NULL DEFAULT 0,
      personal_cart_drop INTEGER NOT NULL DEFAULT 0,
      membership_id INTEGER,
      tee_time_id INTEGER,
      notes TEXT,
      checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (membership_id) REFERENCES memberships(id),
      FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      service_notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      tournament_date TEXT NOT NULL,
      registration_deadline TEXT,
      format TEXT NOT NULL DEFAULT 'luck_of_the_draw',
      team_size INTEGER NOT NULL DEFAULT 2,
      max_entries INTEGER,
      entry_fee REAL NOT NULL DEFAULT 0,
      holes INTEGER NOT NULL DEFAULT 18,
      status TEXT NOT NULL DEFAULT 'registration_open',
      results_notes TEXT,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      player_email TEXT,
      player_phone TEXT,
      handicap REAL,
      team_id INTEGER,
      flight TEXT,
      notes TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tournament_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      flight TEXT,
      tee_time TEXT,
      tee_hole INTEGER DEFAULT 1,
      gross_score INTEGER,
      net_score REAL,
      place INTEGER,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(tournament_date);
    CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);

    CREATE INDEX IF NOT EXISTS idx_tee_times_date ON tee_times(date);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
    CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
    CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checked_in_at);

    -- Unique partial index: prevents two active bookings for the same slot at the DB level.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tee_times_unique_active
      ON tee_times(date, time) WHERE status != 'cancelled';
  `);

  // Migrations: add columns introduced after initial schema.
  const migrations = [
    "ALTER TABLE tee_times ADD COLUMN group_booking_id TEXT",
    "ALTER TABLE tee_times ADD COLUMN slot_index INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN carts_requested INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN buggies_requested INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN clubs_requested INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN personal_cart_drop INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN checked_in INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tee_times ADD COLUMN checked_in_at TEXT",
    "ALTER TABLE memberships ADD COLUMN nfc_token TEXT",
    "ALTER TABLE equipment ADD COLUMN make TEXT",
    "ALTER TABLE equipment ADD COLUMN model TEXT",
    "ALTER TABLE equipment ADD COLUMN year INTEGER",
    "ALTER TABLE equipment ADD COLUMN serial_number TEXT",
    "ALTER TABLE equipment ADD COLUMN color TEXT",
    "ALTER TABLE equipment ADD COLUMN seats INTEGER",
    "ALTER TABLE equipment ADD COLUMN fuel_type TEXT",
    "ALTER TABLE equipment ADD COLUMN battery_year INTEGER",
    "ALTER TABLE equipment ADD COLUMN hours_reading REAL",
    "ALTER TABLE equipment ADD COLUMN last_service_date TEXT",
    "ALTER TABLE memberships ADD COLUMN auto_renew INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE memberships ADD COLUMN square_customer_id TEXT",
    "ALTER TABLE memberships ADD COLUMN square_card_id TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Seed default site configuration (INSERT OR IGNORE — never overwrites saved values).
  const seedConfig = db.prepare(
    "INSERT OR IGNORE INTO site_config (key, value, label, description) VALUES (?, ?, ?, ?)"
  );
  const defaults: [string, string, string, string][] = [
    // Course operation
    ["course_open",             "true",                    "Course Open for Booking",        "Allow new tee time bookings to be made online"],
    ["booking_days_ahead",      "7",                       "Booking Window (days)",          "How many days in advance tee times can be booked"],
    ["green_fee_9_holes",       "25",                      "9-Hole Green Fee ($)",           ""],
    ["green_fee_18_holes",      "35",                      "18-Hole Green Fee ($)",          ""],
    ["cart_fee_per_9",          "10",                      "Cart Rental Fee ($ / 9 holes)",  ""],
    ["buggy_fee",               "5",                       "Walking Buggy Fee ($)",          "Fee to rent a push/pull buggy for a round"],
    ["clubs_fee",               "15",                      "Club Rental Fee ($)",            "Fee to rent a set of clubs for a round"],
    ["personal_cart_drop_fee",  "15",                      "Personal Cart Drop Fee ($)",     "Daily fee for a guest to bring their own golf cart onto the course"],
    ["contact_phone",           "(218) 885-3543",          "Contact Phone",                  ""],
    ["contact_email",           "golf@swanlakecc.com",     "Contact Email",                  ""],
    ["season_start",            "May 1",                   "Season Start",                   ""],
    ["season_end",              "October 31",              "Season End",                     ""],
    // Email (SMTP)
    ["smtp_host",               "",   "SMTP Host",               "e.g. smtp.sendgrid.net or mail.swanlakecc.com"],
    ["smtp_port",               "587","SMTP Port",               "587 for STARTTLS, 465 for implicit TLS"],
    ["smtp_secure",             "",   "SMTP Secure (TLS)",       "Set to 'true' for port 465; leave empty for STARTTLS"],
    ["smtp_user",               "",   "SMTP Username",           ""],
    ["smtp_pass",               "",   "SMTP Password",           ""],
    ["smtp_from",               "Swan Lake Country Club <noreply@swanlakecc.com>", "From Address", ""],
    // Square Payments
    ["square_access_token",     "",           "Square Access Token",      "Server-side token from Square Developer Dashboard"],
    ["square_application_id",   "",           "Square Application ID",    "Also used client-side for Google Pay / Apple Pay"],
    ["square_location_id",      "",           "Square Location ID",       ""],
    ["square_environment",      "sandbox",    "Square Environment",       "sandbox or production"],
    // QuickBooks
    ["quickbooks_client_id",      "",                                               "QuickBooks Client ID",       ""],
    ["quickbooks_client_secret",  "",                                               "QuickBooks Client Secret",   ""],
    ["quickbooks_redirect_uri",   "https://book.swanlakecc.com/api/payments/quickbooks/callback", "QuickBooks Redirect URI", ""],
    ["quickbooks_environment",    "sandbox",                                        "QuickBooks Environment",     "sandbox or production"],
    // Google OAuth
    ["google_client_id",        "", "Google Client ID",     "From Google Cloud Console → OAuth 2.0 Client IDs"],
    ["google_client_secret",    "", "Google Client Secret", ""],
    // Apple Sign In
    ["apple_id",                "", "Apple Services ID",    "e.g. com.swanlakecc.book"],
    ["apple_secret",            "", "Apple Private Key",    "Full contents of your .p8 private key file"],
    // Security
    ["cron_secret",             "", "Cron Secret",          "Shared secret for POST /api/admin/billing/renew?secret=… — use a long random string"],
  ];
  for (const row of defaults) seedConfig.run(...row);

  // Seed a default admin user account if no users exist yet.
  // Default credentials: admin@swanlakecc.com / admin
  // Change the password immediately after first login via /admin/settings.
  const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync("admin", 12);
    db.prepare("INSERT OR IGNORE INTO users (email, name, password_hash) VALUES (?, ?, ?)")
      .run("admin@swanlakecc.com", "Admin", passwordHash);
    db.prepare("INSERT OR IGNORE INTO admin_users (email, added_by) VALUES (?, 'system')")
      .run("admin@swanlakecc.com");
  }
}
