import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  // Split into separate statements — some PG drivers reject multiple DDL in one query()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bb_uploads (
      id VARCHAR(120) PRIMARY KEY,
      project_id VARCHAR(120),
      user_id VARCHAR(255),
      name VARCHAR(240) NOT NULL,
      data_url TEXT NOT NULL,
      mime_type VARCHAR(120),
      size_bytes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bb_uploads_project ON bb_uploads(project_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bb_uploads_user ON bb_uploads(user_id, created_at DESC)`);
  tableReady = true;
}

// GET /api/uploads
router.get("/uploads", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { projectId } = req.query;
    const pid = (projectId as string) || customerProjectId;

    const { rows } = pid
      ? await pool.query(
          `SELECT id, project_id, user_id, name, mime_type, size_bytes, created_at, data_url
           FROM bb_uploads WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [pid]
        )
      : await pool.query(
          `SELECT id, project_id, user_id, name, mime_type, size_bytes, created_at, data_url
           FROM bb_uploads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [userId]
        );

    res.json(rows);
  } catch (err) {
    console.error("Uploads GET error:", err);
    res.status(500).json({ error: "Failed to load uploads" });
  }
});

// POST /api/uploads
router.post("/uploads", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { name, dataUrl, mimeType, sizeBytes, projectId } = req.body as {
      name: string; dataUrl: string; mimeType?: string; sizeBytes?: number; projectId?: string;
    };

    if (!name || !dataUrl) { res.status(400).json({ error: "name and dataUrl are required" }); return; }
    // 10 MB limit (base64 is ~1.37x raw size, so 14MB string ≈ 10MB file)
    if (dataUrl.length > 14_000_000) { res.status(413).json({ error: "File too large — max 10 MB" }); return; }

    const id = `upload_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await pool.query(
      `INSERT INTO bb_uploads (id, project_id, user_id, name, data_url, mime_type, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, projectId || customerProjectId || null, userId || null,
       name, dataUrl, mimeType || "application/octet-stream", sizeBytes || 0]
    );

    res.json({ id, name, url: dataUrl, mimeType, sizeBytes });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Upload failed: ${msg}` });
  }
});

// DELETE /api/uploads/:id
router.delete("/uploads/:id", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    await pool.query(
      `DELETE FROM bb_uploads WHERE id = $1 AND (user_id = $2 OR project_id = $3)`,
      [req.params.id, userId || null, customerProjectId || null]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete upload" }); }
});

export default router;
