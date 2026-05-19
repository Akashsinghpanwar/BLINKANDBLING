import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import {
  databaseHost,
  getDatabaseProvider,
  getDatabaseUrl,
  loadAppEnv,
} from "./load-env";

const { Pool } = pg;

loadAppEnv();

const connectionString = getDatabaseUrl();
const provider = getDatabaseProvider(connectionString);
const isSupabase = provider === "supabase";

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("Database pool idle client error:", err);
});

export const db = drizzle(pool, { schema });

export async function verifyDbConnection() {
  const { rows } = await pool.query<{ db: string }>(
    "select current_database() as db",
  );
  return {
    ok: true as const,
    provider,
    host: databaseHost(connectionString),
    database: rows[0]?.db ?? "postgres",
  };
}

export * from "./schema";
