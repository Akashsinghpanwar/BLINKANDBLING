import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

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
});

const renameFolderSchema = z.object({
  name: z.string().min(1).max(200),
});

let galleryTablesReady: Promise<void> | null = null;

async function runGalleryTableSetup() {
  await pool.query(`
    create table if not exists bb_gallery_folders (
      id uuid primary key default gen_random_uuid(),
      user_id varchar(255),
      name varchar(200) not null,
      source varchar(40) not null default 'ai',
      prompt text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_bb_gallery_folders_user_source
      on bb_gallery_folders(user_id, source, created_at desc);

    create table if not exists bb_gallery_images (
      id uuid primary key default gen_random_uuid(),
      folder_id uuid not null references bb_gallery_folders(id) on delete cascade,
      url text not null,
      label varchar(200) not null,
      angle varchar(120),
      prompt text,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_bb_gallery_images_folder
      on bb_gallery_images(folder_id, created_at asc);
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
                'url', i.url,
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
        where f.user_id = $1 and f.source = 'ai'
        group by f.id
        order by f.created_at desc
      `,
      [ownerId(req)],
    );
    res.json({ folders: rows });
  } catch (err) {
    console.error("Gallery list error:", err);
    res.status(500).json({ error: "Failed to load gallery" });
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
        values ($1, $2, 'ai', $3)
        returning id, name, source, prompt, created_at as "createdAt", updated_at as "updatedAt"
      `,
      [ownerId(req), parsed.data.name, parsed.data.prompt],
    );
    const folder = folderResult.rows[0];

    const images = [];
    for (const image of parsed.data.images) {
      const imageResult = await client.query(
        `
          insert into bb_gallery_images(folder_id, url, label, angle, prompt)
          values ($1, $2, $3, $4, $5)
          returning id, url, label, angle, prompt, created_at as "createdAt"
        `,
        [folder.id, image.url, image.label, image.angle, image.prompt],
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
        where id = $2 and user_id = $3 and source = 'ai'
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
      "delete from bb_gallery_folders where id = $1 and user_id = $2 and source = 'ai'",
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
