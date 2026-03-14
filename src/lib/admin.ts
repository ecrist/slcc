import { getDb } from "./db";

// ---------------------------------------------------------------------------
// Admin user helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the email belongs to an admin.
 *
 * INITIAL_ADMIN_EMAIL always grants access as a recovery mechanism — even if
 * the email is removed from the admin_users table, the configured super-admin
 * can still sign in and restore access.
 */
export function isAdminEmail(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM admin_users WHERE lower(email) = ? LIMIT 1")
    .get(normalised);
  return !!row;
}

export interface AdminUser {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string;
}

export function getAdminUsers(): AdminUser[] {
  const db = getDb();
  return db.prepare("SELECT * FROM admin_users ORDER BY created_at").all() as AdminUser[];
}

export function addAdminUser(email: string, addedBy: string): void {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO admin_users (email, added_by) VALUES (?, ?)").run(
    email.trim().toLowerCase(),
    addedBy
  );
}

export function removeAdminUser(email: string): void {
  const db = getDb();
  db.prepare("DELETE FROM admin_users WHERE lower(email) = ?").run(
    email.trim().toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Site configuration helpers
// ---------------------------------------------------------------------------

export interface ConfigEntry {
  key: string;
  value: string;
  label: string;
  description: string;
  updated_at: string;
}

export function getAllConfig(): ConfigEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM site_config ORDER BY key").all() as ConfigEntry[];
}

export function getConfigValue(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM site_config WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfigValue(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO site_config (key, value, label, description)
    VALUES (?, ?, '', '')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}
