import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(artifactDir, "../../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

const [{ default: app }, { logger }, { verifyDbConnection }] = await Promise.all([
  import("./app"),
  import("./lib/logger"),
  import("@workspace/db"),
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

const staticDir = path.resolve(artifactDir, "../../startupvisual/dist/public");
if (!existsSync(staticDir)) {
  logger.error(
    { staticDir },
    "Frontend build missing. Run: pnpm --filter @workspace/startupvisual run build",
  );
  process.exit(1);
}

app.use(express.static(staticDir, { index: false }));

app.get(/^(?!\/api).*/, (_req, res, next) => {
  const indexFile = path.join(staticDir, "index.html");
  if (!existsSync(indexFile)) {
    next();
    return;
  }
  res.sendFile(indexFile);
});

const rawPort = process.env.PORT ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port, staticDir }, "Production server listening");
});
