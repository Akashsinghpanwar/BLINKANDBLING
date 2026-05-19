import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { verifyDbConnection } from "@workspace/db";
import { getSupabaseApiStatus } from "@workspace/db/supabase";

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

router.get("/healthz/supabase", (_req, res) => {
  res.json(getSupabaseApiStatus());
});

export default router;
