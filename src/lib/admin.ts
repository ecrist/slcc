import { query, queryOne, execute } from "./db";

// ---------------------------------------------------------------------------
// Admin user helpers
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string;
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const normalised = email.trim().toLowerCase();
  const row = await queryOne<{ id: number }>(
    "SELECT id FROM admin_users WHERE LOWER(email) = $1 LIMIT 1",
    [normalised]
  );
  return !!row;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return query<AdminUser>("SELECT * FROM admin_users ORDER BY created_at");
}

export async function addAdminUser(email: string, addedBy: string): Promise<void> {
  await execute(
    "INSERT INTO admin_users (email, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [email.trim().toLowerCase(), addedBy]
  );
}

export async function removeAdminUser(email: string): Promise<void> {
  await execute("DELETE FROM admin_users WHERE LOWER(email) = $1", [
    email.trim().toLowerCase(),
  ]);
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

export async function getAllConfig(): Promise<ConfigEntry[]> {
  return query<ConfigEntry>("SELECT * FROM site_config ORDER BY key");
}

export async function getConfigValue(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM site_config WHERE key = $1",
    [key]
  );
  return row?.value ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO site_config (key, value, label, description)
     VALUES ($1, $2, '', '')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}
