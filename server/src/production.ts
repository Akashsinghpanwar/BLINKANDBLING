import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

// Load .env if present (local dev)
const envPath = path.resolve(artifactDir, "../../.env");
if (existsSync(envPath)) process.loadEnvFile?.(envPath);

// ── Bind port IMMEDIATELY so Render detects it before any async work ─────────
const port = Number(process.env.PORT ?? "10000");
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${process.env.PORT}"`);

const bootstrap = express();
const server = bootstrap.listen(port, "0.0.0.0", () => {
  console.log(`[boot] Listening on port ${port}`);
});

// ── Now do the heavier async setup ───────────────────────────────────────────
try {
  const { default: app } = await import("./app");
  const { logger } = await import("./lib/logger");

  // Serve frontend static files
  const staticDir = path.resolve(artifactDir, "../../client/dist/public");
  if (!existsSync(staticDir)) {
    logger.error({ staticDir }, "Frontend build missing — run pnpm run build:deploy first");
  } else {
    app.use(express.static(staticDir, { index: false }));
    app.get(/^(?!\/api).*/, (_req, res, next) => {
      const indexFile = path.join(staticDir, "index.html");
      if (!existsSync(indexFile)) return next();
      res.sendFile(indexFile);
    });
    logger.info({ staticDir }, "Static files ready");
  }

  // Hand all requests from the bootstrap server to the real app
  server.removeAllListeners("request");
  server.on("request", app);

  logger.info({ port }, "App fully initialised");

  // Connect to DB and auto-create all tables (non-blocking — server is already up)
  try {
    const { verifyDbConnection } = await import("@workspace/db");
    const { getSupabaseApiStatus } = await import("@workspace/db/supabase");
    const { ensureSchema } = await import("./lib/ensureSchema");
    const dbStatus = await verifyDbConnection();
    logger.info(dbStatus, "Database connected");
    logger.info(getSupabaseApiStatus(), "Supabase API");
    await ensureSchema();
    logger.info("Database schema ready");
  } catch (err) {
    logger.error({ err }, "Database connection/schema failed — check SUPABASE_DATABASE_URL");
  }

} catch (err) {
  console.error("[boot] Fatal startup error:", err);
  // Keep the process alive so Render doesn't see repeated crash loops —
  // the port is already bound so health checks can eventually pass once
  // env vars are fixed.
  process.exitCode = 1;
}
