import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(artifactDir, "../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

const { default: app } = await import("./app");
const { logger } = await import("./lib/logger");

// Serve frontend static files
const staticDir = path.resolve(artifactDir, "../../client/dist/public");
if (!existsSync(staticDir)) {
  logger.error({ staticDir }, "Frontend build missing.");
  process.exit(1);
}

app.use(express.static(staticDir, { index: false }));
app.get(/^(?!\/api).*/, (_req, res, next) => {
  const indexFile = path.join(staticDir, "index.html");
  if (!existsSync(indexFile)) return next();
  res.sendFile(indexFile);
});

// Bind port FIRST so Render detects it immediately
const port = Number(process.env.PORT ?? "10000");
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});

// Connect to DB after server is already up
const { verifyDbConnection } = await import("@workspace/db");
const { getSupabaseApiStatus } = await import("@workspace/db/supabase");

try {
  const dbStatus = await verifyDbConnection();
  logger.info(dbStatus, "Database connected");
  logger.info(getSupabaseApiStatus(), "Supabase API");
} catch (err) {
  logger.error({ err }, "Database connection failed — check SUPABASE_DATABASE_URL");
}
