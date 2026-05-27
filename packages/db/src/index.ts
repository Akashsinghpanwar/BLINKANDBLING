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

function positiveIntFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: positiveIntFromEnv("DB_POOL_MAX", 10),
  min: positiveIntFromEnv("DB_POOL_MIN", 1),
  idleTimeoutMillis: positiveIntFromEnv("DB_IDLE_TIMEOUT_MS", 30_000),
  connectionTimeoutMillis: positiveIntFromEnv("DB_CONNECTION_TIMEOUT_MS", 30_000),
  keepAlive: true,
  keepAliveInitialDelayMillis: positiveIntFromEnv("DB_KEEPALIVE_INITIAL_DELAY_MS", 10_000),
});

const rawPoolQuery = pool.query.bind(pool) as (...args: unknown[]) => unknown;

function isTransientConnectionError(err: unknown) {
  if (!(err instanceof Error)) return false;

  const detail = `${err.message} ${err.cause instanceof Error ? err.cause.message : ""}`;
  return /Connection terminated|ECONNRESET|ETIMEDOUT|timeout|Connection ended unexpectedly/i.test(detail);
}

pool.query = ((...args: unknown[]) => {
  const maybeCallback = args.at(-1);

  if (typeof maybeCallback === "function") {
    const queryArgs = args.slice(0, -1);
    return rawPoolQuery(...queryArgs, (err: unknown, result: unknown) => {
      if (isTransientConnectionError(err)) {
        setTimeout(() => rawPoolQuery(...queryArgs, maybeCallback), 150);
        return;
      }

      maybeCallback(err, result);
    });
  }

  return Promise.resolve(rawPoolQuery(...args)).catch((err: unknown) => {
    if (!isTransientConnectionError(err)) throw err;
    return rawPoolQuery(...args);
  });
}) as typeof pool.query;

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

type WarmupQuery = {
  name: string;
  sql: string;
};

type WarmupCheck = {
  name: string;
  ok: boolean;
  durationMs: number;
  error?: string;
};

const warmupQueries: WarmupQuery[] = [
  { name: "customers", sql: "select id from bb_customer_workspaces limit 1" },
  { name: "gallery_folders", sql: "select id from bb_gallery_folders limit 1" },
  { name: "gallery_images", sql: "select id from bb_gallery_images limit 1" },
  { name: "cad_files", sql: "select id from bb_cad_files limit 1" },
  { name: "uploads", sql: "select id from bb_uploads limit 1" },
  { name: "messages", sql: "select id from bb_messages limit 1" },
  { name: "sessions", sql: "select sid from bb_sessions limit 1" },
];

async function runWarmupQuery(check: WarmupQuery): Promise<WarmupCheck> {
  const startedAt = Date.now();
  try {
    await pool.query(check.sql);
    return {
      name: check.name,
      ok: true,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      name: check.name,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "Warmup query failed",
    };
  }
}

export async function warmDbConnection() {
  const startedAt = Date.now();
  const status = await verifyDbConnection();
  const checks = await Promise.all(warmupQueries.map(runWarmupQuery));

  return {
    ...status,
    warmed: true as const,
    warmedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    checks,
  };
}

export * from "./schema";
