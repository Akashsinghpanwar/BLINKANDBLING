import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

/**
 * Convert a potentially temporary image URL to a permanent base64 data URL.
 * OpenRouter / AI model URLs expire within hours — we download and store the
 * image as base64 so the gallery never loses designs.
 *
 * Falls back to the original URL if download fails.
 */
async function permanentImageUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url; // already permanent
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return url;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const mime = contentType.split(";")[0]?.trim() || "image/png";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return url; // fallback — not ideal but better than throwing
  }
}

const imageSchema = z.object({
  url: z.string().min(1),
  label: z.string().min(1).max(200),
  prompt: z.string().max(8000).optional().default(""),
  angle: z.string().max(120).optional().default(""),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().max(8000).optional().default(""),
  images: z.array(imageSchema).min(1).max(12),
  source: z.enum(["ai", "tryon"]).optional().default("ai"),
});

const renameFolderSchema = z.object({
  name: z.string().min(1).max(200),
});

let galleryTablesReady: Promise<void> | null = null;

async function runGalleryTableSetup() {
  // Create tables (idempotent — safe if already exist)
  await pool.query(`
    create table if not exists bb_gallery_folders (
      id         varchar(120) primary key,
      user_id    varchar(255),
      name       varchar(500) not null,
      source     varchar(40)  not null default 'ai',
      prompt     text,
      created_at timestamptz  not null default now(),
      updated_at timestamptz  not null default now()
    );

    create table if not exists bb_gallery_images (
      id         varchar(120) primary key,
      folder_id  varchar(120) not null references bb_gallery_folders(id) on delete cascade,
      url        text         not null,
      label      varchar(500),
      angle      varchar(120),
      prompt     text,
      created_at timestamptz  not null default now()
    );
  `);

  // Add source column to existing tables that were created without it
  await pool.query(`
    alter table bb_gallery_folders
      add column if not exists source varchar(40) not null default 'ai';

    create index if not exists idx_bb_gallery_folders_user_source
      on bb_gallery_folders(user_id, source, created_at desc);

    create index if not exists idx_bb_gallery_images_folder
      on bb_gallery_images(folder_id, created_at asc);
  `);

  // Fix historical try-on records that were saved with source='ai' by mistake.
  // Folders named with the Virtual Try-On or Motion Sequence prefix were always
  // created by the VirtualTryOn page — reclassify them to source='tryon'.
  await pool.query(`
    update bb_gallery_folders
    set source = 'tryon'
    where source = 'ai'
      and (
        name ilike 'Virtual Try-On%'
        or name ilike 'Motion Sequence%'
      );
  `);
}

async function ensureGalleryTables() {
  if (!galleryTablesReady) {
    galleryTablesReady = runGalleryTableSetup().catch((err: unknown) => {
      galleryTablesReady = null;
      throw err;
    });
  }
  return galleryTablesReady;
}

function ownerId(req: { session?: { userId?: string } }) {
  return req.session?.userId || "demo";
}

router.get("/gallery/folders", async (req, res): Promise<void> => {
  try {
    await ensureGalleryTables();
    const userId = ownerId(req);

    // Auto-claim: if an authenticated jeweller hits this endpoint, reassign any
    // gallery folders stored under 'demo' to their real account so previously
    // generated designs are not lost after login.
    if (userId !== "demo") {
      await pool.query(
        `update bb_gallery_folders set user_id = $1 where user_id = 'demo'`,
        [userId],
      );
    }

    // Return /api/gallery/images/:id as the URL — this keeps the list response
    // lightweight (no 1-2 MB base64 blobs per image) and lets the browser
    // stream each image individually.
    const source = typeof req.query["source"] === "string" ? req.query["source"] : "ai";
    const allowedSources = ["ai", "tryon"];
    const effectiveSource = allowedSources.includes(source) ? source : "ai";

    const { rows } = await pool.query(
      `
        select
          f.id,
          f.name,
          f.source,
          f.prompt,
          f.created_at as "createdAt",
          f.updated_at as "updatedAt",
          coalesce(
            json_agg(
              json_build_object(
                'id', i.id,
                'url', '/api/gallery/images/' || i.id,
                'label', i.label,
                'angle', i.angle,
                'prompt', i.prompt,
                'createdAt', i.created_at
              )
              order by i.created_at asc
            ) filter (where i.id is not null),
            '[]'
          ) as images
        from bb_gallery_folders f
        left join bb_gallery_images i on i.folder_id = f.id
        where f.user_id = $1 and f.source = $2
        group by f.id
        order by f.created_at desc
      `,
      [userId, effectiveSource],
    );
    res.json({ folders: rows });
  } catch (err) {
    console.error("Gallery list error:", err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

/**
 * Serve an individual gallery image by ID.
 * Images are stored as base64 data URLs in the DB — decode and stream as binary
 * so the browser receives a normal image response (not a 1MB+ JSON string).
 * Same-origin, so no CORS headers needed and canvas API can read it freely.
 */
router.get("/gallery/images/:id", async (req, res): Promise<void> => {
  try {
    await ensureGalleryTables();
    const { rows } = await pool.query(
      "select url from bb_gallery_images where id = $1",
      [req.params.id],
    );
    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const url: string = row.url;

    // Stored as base64 data URL — decode and serve as binary
    if (url.startsWith("data:")) {
      const [header, b64] = url.split(",") as [string, string];
      const mime = header.replace("data:", "").replace(";base64", "") || "image/png";
      const buffer = Buffer.from(b64, "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
      return;
    }

    // External URL — redirect (edge case for older rows stored before permanentImageUrl)
    res.redirect(302, url);
  } catch (err) {
    console.error("Gallery image serve error:", err);
    res.status(500).json({ error: "Failed to load image" });
  }
});

router.post("/gallery/folders", async (req, res): Promise<void> => {
  const parsed = createFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const client = await pool.connect();
  try {
    await ensureGalleryTables();
    await client.query("begin");
    const folderResult = await client.query(
      `
        insert into bb_gallery_folders(user_id, name, source, prompt)
        values ($1, $2, $3, $4)
        returning id, name, source, prompt, created_at as "createdAt", updated_at as "updatedAt"
      `,
      [ownerId(req), parsed.data.name, parsed.data.source, parsed.data.prompt],
    );
    const folder = folderResult.rows[0];

    // Download all temporary external URLs in parallel before inserting,
    // so the entire set is fetched at once rather than one-by-one.
    const permanentUrls = await Promise.all(
      parsed.data.images.map((image) => permanentImageUrl(image.url)),
    );

    const images = [];
    for (let idx = 0; idx < parsed.data.images.length; idx++) {
      const image = parsed.data.images[idx]!;
      const permanentUrl = permanentUrls[idx]!;
      const imageResult = await client.query(
        `
          insert into bb_gallery_images(folder_id, url, label, angle, prompt)
          values ($1, $2, $3, $4, $5)
          returning id, url, label, angle, prompt, created_at as "createdAt"
        `,
        [folder.id, permanentUrl, image.label, image.angle, image.prompt],
      );
      images.push(imageResult.rows[0]);
    }

    await client.query("commit");
    res.status(201).json({ folder: { ...folder, images } });
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error("Gallery create error:", err);
    res.status(500).json({ error: "Failed to save gallery folder" });
  } finally {
    client.release();
  }
});

router.patch("/gallery/folders/:id", async (req, res): Promise<void> => {
  const parsed = renameFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  try {
    await ensureGalleryTables();
    const { rows } = await pool.query(
      `
        update bb_gallery_folders
        set name = $1, updated_at = now()
        where id = $2 and user_id = $3
        returning id, name, source, prompt, created_at as "createdAt", updated_at as "updatedAt"
      `,
      [parsed.data.name, req.params.id, ownerId(req)],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    res.json({ folder: rows[0] });
  } catch (err) {
    console.error("Gallery rename error:", err);
    res.status(500).json({ error: "Failed to rename folder" });
  }
});

router.delete("/gallery/folders/:id", async (req, res): Promise<void> => {
  try {
    await ensureGalleryTables();
    const result = await pool.query(
      "delete from bb_gallery_folders where id = $1 and user_id = $2",
      [req.params.id, ownerId(req)],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Gallery delete error:", err);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

export default router;
