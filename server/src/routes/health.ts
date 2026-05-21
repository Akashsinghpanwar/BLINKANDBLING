import { Router, type IRouter } from "express";
import { z } from "zod";
import { verifyDbConnection, warmDbConnection } from "@workspace/db";
import { getSupabaseApiStatus } from "@workspace/db/supabase";

const HealthCheckResponse = z.object({ status: z.string() });

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res) => {
  try {
    const status = await verifyDbConnection();
    res.json(status);
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Database unavailable",
    });
  }
});

router.get("/healthz/warmup", async (_req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });

  try {
    const status = await warmDbConnection();
    res.json(status);
  } catch (err) {
    res.status(503).json({
      ok: false,
      warmed: false,
      error: err instanceof Error ? err.message : "Database warmup failed",
    });
  }
});

router.get("/healthz/supabase", (_req, res) => {
  res.json(getSupabaseApiStatus());
});

export default router;
