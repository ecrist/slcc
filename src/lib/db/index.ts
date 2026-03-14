import Database from "better-sqlite3";
import path from "path";

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

    CREATE INDEX IF NOT EXISTS idx_tee_times_date ON tee_times(date);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

    -- Unique partial index: prevents two active bookings for the same slot at the DB level.
    -- This is a hard safety net against race conditions that slip past application-level checks.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tee_times_unique_active
      ON tee_times(date, time) WHERE status != 'cancelled';
  `);

  // Migrations: add columns introduced after initial schema.
  // ALTER TABLE ADD COLUMN throws if the column already exists — safe to ignore.
  const migrations = [
    "ALTER TABLE tee_times ADD COLUMN group_booking_id TEXT",
    "ALTER TABLE tee_times ADD COLUMN slot_index INTEGER NOT NULL DEFAULT 0",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
