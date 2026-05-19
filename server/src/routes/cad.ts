import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const cadFileSchema = z.object({
  name: z.string().min(1).max(240),
  url: z.string().min(1),
  mimeType: z.string().max(120).optional().default(""),
  extension: z.string().max(24).optional().default(""),
  size: z.number().int().nonnegative().max(70 * 1024 * 1024).optional().default(0),
  source: z.string().max(60).optional().default("upload"),
  sourceImageId: z.string().max(120).optional().default(""),
  projectId: z.string().uuid().optional(),
});

async function ensureCadTables() {
  await pool.query(`
    create table if not exists bb_cad_files (
      id uuid primary key default gen_random_uuid(),
      user_id varchar(255),
      project_id uuid,
      name varchar(240) not null,
      url text not null,
      mime_type varchar(120),
      extension varchar(24),
      size_bytes integer not null default 0,
      source varchar(60) not null default 'upload',
      source_image_id varchar(120),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_bb_cad_files_user_created
      on bb_cad_files(user_id, created_at desc);
    create index if not exists idx_bb_cad_files_project_created
      on bb_cad_files(project_id, created_at desc);
  `);
}

function ownerId(req: { session?: { userId?: string; customerProjectId?: string } }) {
  return req.session?.userId || req.session?.customerProjectId || "demo";
}

function rowToCadFile(row: any) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    mimeType: row.mime_type || "",
    extension: row.extension || "",
    size: row.size_bytes || 0,
    source: row.source || "upload",
    sourceImageId: row.source_image_id || "",
    projectId: row.project_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/cad/files", async (req, res): Promise<void> => {
  try {
    await ensureCadTables();
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : "";
    const params: unknown[] = [ownerId(req)];
    let projectClause = "";

    if (projectId) {
      params.push(projectId);
      projectClause = "or project_id = $2";
    }

    const { rows } = await pool.query(
      `
        select *
        from bb_cad_files
        where user_id = $1 ${projectClause}
        order by created_at desc
      `,
      params,
    );
    res.json({ files: rows.map(rowToCadFile) });
  } catch (err) {
    console.error("CAD file list error:", err);
    res.status(500).json({ error: "Failed to load CAD files" });
  }
});

router.post("/cad/files", async (req, res): Promise<void> => {
  const parsed = cadFileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid CAD file", details: parsed.error.flatten() });
    return;
  }

  try {
    await ensureCadTables();
    const projectId = parsed.data.projectId || req.session.customerProjectId || null;
    const extension = (parsed.data.extension || parsed.data.name.split(".").pop() || "").toLowerCase();
    const { rows } = await pool.query(
      `
        insert into bb_cad_files(
          user_id, project_id, name, url, mime_type, extension, size_bytes, source, source_image_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning *
      `,
      [
        ownerId(req),
        projectId,
        parsed.data.name,
        parsed.data.url,
        parsed.data.mimeType,
        extension,
        parsed.data.size,
        parsed.data.source,
        parsed.data.sourceImageId,
      ],
    );
    res.status(201).json({ file: rowToCadFile(rows[0]) });
  } catch (err) {
    console.error("CAD file save error:", err);
    res.status(500).json({ error: "Failed to save CAD file" });
  }
});

router.delete("/cad/files/:id", async (req, res): Promise<void> => {
  try {
    await ensureCadTables();
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : "";
    const params: unknown[] = [req.params.id, ownerId(req)];
    let projectClause = "";

    if (projectId) {
      params.push(projectId);
      projectClause = "or project_id = $3";
    }

    const result = await pool.query(
      `delete from bb_cad_files where id = $1 and (user_id = $2 or project_id::text = $2 ${projectClause})`,
      params,
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "CAD file not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("CAD file delete error:", err);
    res.status(500).json({ error: "Failed to delete CAD file" });
  }
});

export default router;
