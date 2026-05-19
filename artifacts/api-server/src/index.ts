import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(artifactDir, "../../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

const [{ verifyDbConnection }, { default: app }, { logger }] = await Promise.all([
  import("@workspace/db"),
  import("./app"),
  import("./lib/logger"),
]);

try {
  const dbStatus = await verifyDbConnection();
  logger.info(dbStatus, "Database connected");
  const { getSupabaseApiStatus } = await import("@workspace/db/supabase");
  logger.info(getSupabaseApiStatus(), "Supabase API");
} catch (err) {
  logger.error({ err }, "Database connection failed");
  process.exit(1);
}

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
