import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

function envCandidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.resolve(process.cwd(), ".env"),
    path.resolve(here, "../../../.env"),
    path.resolve(here, "../../../../.env"),
  ];
}

export function loadAppEnv(): string | null {
  if (loaded) {
    return process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || null;
  }

  for (const envPath of envCandidates()) {
    if (existsSync(envPath)) {
      process.loadEnvFile?.(envPath);
      loaded = true;
      return envPath;
    }
  }

  loaded = true;
  return null;
}

export function getDatabaseUrl(): string {
  loadAppEnv();

  // Prefer DATABASE_URL (Neon/standard) over the legacy SUPABASE_DATABASE_URL.
  // SUPABASE_DATABASE_URL is kept last so old envs still work, but it no longer
  // takes priority — preventing stale Supabase connections after migration.
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.LOCAL_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set. Add it to app/.env (e.g. your Neon or Postgres connection string).",
    );
  }

  return connectionString;
}

export type DatabaseProvider = "supabase" | "local" | "postgres";

export function getDatabaseProvider(connectionString: string): DatabaseProvider {
  if (/supabase\.(co|com)/i.test(connectionString)) {
    return "supabase";
  }
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) {
    return "local";
  }
  return "postgres";
}

export function databaseHost(connectionString: string): string {
  try {
    return new URL(connectionString.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    return "unknown";
  }
}
