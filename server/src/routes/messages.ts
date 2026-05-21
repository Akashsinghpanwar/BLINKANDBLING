import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

let tableReady: Promise<void> | null = null;

async function runTableSetup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bb_messages (
      id VARCHAR(120) PRIMARY KEY,
      project_id VARCHAR(120) NOT NULL,
      author VARCHAR(20) NOT NULL,
      author_name VARCHAR(200) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      read_by_jeweller BOOLEAN DEFAULT false,
      read_by_customer BOOLEAN DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_bb_messages_project
      ON bb_messages(project_id, created_at ASC);
  `);
}

async function ensureTable() {
  if (!tableReady) {
    tableReady = runTableSetup().catch((err: unknown) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

// GET /api/messages/unread-counts  – returns unread count for authenticated user
router.get("/messages/unread-counts", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    if (userId) {
      // Jeweller: count unread customer messages across ALL projects
      const { rows } = await pool.query(
        `SELECT project_id, COUNT(*)::int AS unread
         FROM bb_messages
         WHERE author = 'customer' AND read_by_jeweller = false
         GROUP BY project_id`
      );
      const byProject: Record<string, number> = {};
      let total = 0;
      for (const row of rows) {
        byProject[row.project_id as string] = row.unread as number;
        total += row.unread as number;
      }
      res.json({ total, byProject });
    } else {
      // Customer: count unread jeweller messages for their project
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS unread FROM bb_messages
         WHERE project_id = $1 AND author = 'jeweller' AND read_by_customer = false`,
        [customerProjectId]
      );
      const unread = (rows[0]?.unread as number) ?? 0;
      res.json({ total: unread, byProject: { [customerProjectId as string]: unread } });
    }
  } catch { res.status(500).json({ error: "Failed to get unread counts" }); }
});

// GET /api/messages/:projectId
router.get("/messages/:projectId", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { rows } = await pool.query(
      `SELECT * FROM bb_messages WHERE project_id = $1 ORDER BY created_at ASC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to load messages" }); }
});

// POST /api/messages/:projectId
router.post("/messages/:projectId", async (req, res) => {
  try {
    await ensureTable();
    const userId = req.session.userId;
    const customerProjectId = req.session.customerProjectId;
    if (!userId && !customerProjectId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { id, author, authorName, text } = req.body as {
      id?: string; author: string; authorName: string; text: string;
    };
    if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

    const msgId = id || `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await pool.query(
      `INSERT INTO bb_messages (id, project_id, author, author_name, text, read_by_jeweller, read_by_customer)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [msgId, req.params.projectId, author, authorName, text.trim(),
       author === "jeweller", author === "customer"]
    );

    const { rows } = await pool.query(
      `SELECT * FROM bb_messages WHERE project_id = $1 ORDER BY created_at ASC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to save message" }); }
});

// PATCH /api/messages/:projectId/read  – mark all as read for viewer
router.patch("/messages/:projectId/read", async (req, res) => {
  try {
    await ensureTable();
    const { viewer } = req.body as { viewer: "jeweller" | "customer" };
    const col = viewer === "jeweller" ? "read_by_jeweller" : "read_by_customer";
    await pool.query(`UPDATE bb_messages SET ${col} = true WHERE project_id = $1`, [req.params.projectId]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to mark read" }); }
});

export default router;
