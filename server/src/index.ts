import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(artifactDir, "../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

const [{ verifyDbConnection, warmDbConnection, pool }, { default: app }, { logger }] = await Promise.all([
  import("@workspace/db"),
  import("./app"),
  import("./lib/logger"),
]);

try {
  const dbStatus = await warmDbConnection();
  logger.info(dbStatus, "Database warmed up");
  const { getSupabaseApiStatus } = await import("@workspace/db/supabase");
  logger.info(getSupabaseApiStatus(), "Supabase API");
} catch (err) {
  logger.error({ err }, "Database connection failed");
  process.exit(1);
}

// Ping DB every 4 min — keeps Supabase free-tier awake and pool connections alive
const DB_PING_INTERVAL_MS = 4 * 60 * 1000;
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    logger.debug("DB keep-alive ok");
  } catch (err) {
    logger.warn({ err }, "DB keep-alive failed");
  }
}, DB_PING_INTERVAL_MS);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
