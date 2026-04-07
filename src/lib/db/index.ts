import { Pool, type QueryResult, type PoolClient } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon and most cloud PostgreSQL providers require SSL
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  // Allow up to 10 s for cold-start wakeup (Neon scales to zero on free tier)
  connectionTimeoutMillis: 10000,
});

// Typed query: returns all rows
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

// Typed query: returns first row or undefined
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const result = await pool.query(sql, params);
  return result.rows[0] as T | undefined;
}

// Execute a DML statement; returns rowCount and first row's id (from RETURNING id)
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ rowCount: number; id?: number }> {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount ?? 0,
    id: result.rows[0]?.id as number | undefined,
  };
}

type TxFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

// Run fn inside a BEGIN/COMMIT block; automatically rolls back on error
export async function withTransaction<T>(fn: (q: TxFn) => Promise<T>): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn((sql: string, params?: unknown[]) => client.query(sql, params));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
