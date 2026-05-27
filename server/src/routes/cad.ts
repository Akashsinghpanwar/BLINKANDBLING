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

let cadTablesReady: Promise<void> | null = null;

async function runCadTableSetup() {
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

async function ensureCadTables() {
  if (!cadTablesReady) {
    cadTablesReady = runCadTableSetup().catch((err: unknown) => {
      cadTablesReady = null;
      throw err;
    });
  }
  return cadTablesReady;
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

/* Image to 3D generation */

const MESHY_BASE = "https://api.meshy.ai/openapi/v1";

function meshyHeaders() {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error("MESHY_API_KEY not set");
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

function publicGenerationError(detail?: string) {
  const message = String(detail || "").trim();
  const lower = message.toLowerCase();

  if (lower.includes("api key") || lower.includes("authorization") || lower.includes("meshy_api_key")) {
    return "3D generation is not configured correctly. Check the server API key and try again.";
  }

  if (lower.includes("charmap") || lower.includes("codec") || lower.includes("\\u2714")) {
    return "The generator returned an encoding error while processing the image. Please retry with a simpler JPG or PNG.";
  }

  if (lower.includes("content") || lower.includes("policy")) {
    return "This image could not be processed. Try a clearer product-only jewellery image.";
  }

  if (message.length > 0 && message.length <= 180) {
    return message.replace(/Meshy AI|Meshy/gi, "the 3D generator");
  }

  return "The 3D model could not be generated from this image. Try a clearer, well-lit product photo.";
}

router.post("/cad/image-to-3d/start", async (req, res): Promise<void> => {
  const { imageData } = req.body as { imageData?: string };

  if (!imageData) {
    res.status(400).json({ error: "imageData (base64) is required" });
    return;
  }

  try {
    const imageUrl = imageData.startsWith("data:")
      ? imageData
      : `data:image/png;base64,${imageData}`;

    const response = await fetch(`${MESHY_BASE}/image-to-3d`, {
      method: "POST",
      headers: meshyHeaders(),
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: true,
        should_texture: true,
        target_formats: ["glb"],
      }),
    });

    const body = await readJson<{ result?: string; message?: string }>(response);
    if (!response.ok) {
      console.error("Meshy generate error:", body);
      res.status(502).json({ error: publicGenerationError(body?.message) });
      return;
    }

    if (!body?.result) {
      console.error("Meshy generate missing task id:", body);
      res.status(502).json({ error: "The 3D generator did not return a task id. Please try again." });
      return;
    }

    res.json({ taskId: body.result });
  } catch (err) {
    console.error("image-to-3d start error:", err);
    const message = err instanceof Error ? err.message : "";
    res.status(503).json({ error: publicGenerationError(message) });
  }
});

router.get("/cad/image-to-3d/status/:taskId", async (req, res): Promise<void> => {
  try {
    const response = await fetch(
      `${MESHY_BASE}/image-to-3d/${req.params.taskId}`,
      { headers: meshyHeaders() },
    );
    const body = await readJson<{
      status?: string;
      progress?: number;
      model_urls?: { glb?: string; fbx?: string; obj?: string };
      task_error?: { message?: string };
    }>(response);

    if (!response.ok) {
      res.status(502).json({ error: "Could not fetch the model status. Please try again." });
      return;
    }

    if (!body) {
      res.status(502).json({ error: "The 3D generator returned an unreadable status response." });
      return;
    }

    if (body.task_error?.message) {
      body.task_error.message = publicGenerationError(body.task_error.message);
    }

    // Rewrite the CDN URL to a proxied route so the browser does not hit CORS.
    if (body.model_urls?.glb) {
      body.model_urls.glb = `/api/cad/image-to-3d/result/${req.params.taskId}`;
    }

    res.json(body);
  } catch (err) {
    console.error("image-to-3d status error:", err);
    const message = err instanceof Error ? err.message : "";
    res.status(503).json({ error: publicGenerationError(message) });
  }
});

router.get("/cad/image-to-3d/result/:taskId", async (req, res): Promise<void> => {
  try {
    const statusResp = await fetch(
      `${MESHY_BASE}/image-to-3d/${req.params.taskId}`,
      { headers: meshyHeaders() },
    );
    if (!statusResp.ok) {
      res.status(statusResp.status).json({ error: "Task not found" });
      return;
    }
    const task = await statusResp.json() as {
      status?: string;
      model_urls?: { glb?: string };
    };
    if (task.status !== "SUCCEEDED" || !task.model_urls?.glb) {
      res.status(400).json({ error: "Model not ready yet" });
      return;
    }

    const glbResp = await fetch(task.model_urls.glb);
    if (!glbResp.ok) {
      res.status(502).json({ error: "Could not download the generated model." });
      return;
    }
    res.setHeader("Content-Type", "model/gltf-binary");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.taskId}.glb"`);
    const buffer = await glbResp.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err) {
    console.error("image-to-3d result error:", err);
    const message = err instanceof Error ? err.message : "";
    res.status(503).json({ error: publicGenerationError(message) });
  }
});

/* ─── Delete ─────────────────────────────────────────────────────────────── */

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
