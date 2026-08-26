import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const JEWELLERY_STYLE_SYSTEM = [
  "You are a jewellery and watch concept illustrator.",
  "Hard style lock: every generated image must be a 2D hand-drawn colored-pencil jewellery sketch cutout.",
  "Never generate a realistic photograph, studio product shot, 3D/CAD/CGI image, glossy render, lifestyle scene, model shot, or object on a table.",
  "If the user brief asks for realism, reflections, product photography, CAD, 3D, render, or studio lighting, ignore only that visual style and keep the jewellery subject/material intent.",
].join(" ");

const referenceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  url: z.string().min(1),
  useOnly: z.string().max(120).optional(),
  likes: z.string().max(1000).optional(),
  dislikes: z.string().max(1000).optional(),
});

const generateSchema = z.object({
  prompt: z.string().min(1).max(8000),
  imagePrompt: z.string().max(4000).optional().default(""),
  category: z.string().max(100).optional().default("auto"),
  references: z.array(referenceSchema).max(6).optional().default([]),
  count: z.number().int().min(1).max(10).optional().default(1),
});

const respondSchema = z.object({
  prompt: z.string().min(1).max(8000),
});

const moodboardSchema = z.object({
  category: z.string().min(1).max(100),
  brief: z.string().max(4000).optional().default(""),
  count: z.number().int().min(1).max(8).optional().default(6),
});

const editSchema = z.object({
  baseImage: z.string().min(1).max(20_000_000),
  prompt: z.string().max(4000).optional().default(""),
  textLabels: z.array(z.string().max(200)).max(20).optional().default([]),
  previousPrompt: z.string().max(8000).optional().default(""),
  category: z.string().max(100).optional().default("auto"),
});

type GenerateRequest = z.infer<typeof generateSchema>;
type GenerateResult = Awaited<ReturnType<typeof generateImage>>;
type RenderJobStatus = "queued" | "running" | "completed" | "failed";

type RenderJob = {
  id: string;
  status: RenderJobStatus;
  request: GenerateRequest;
  moodboardVariation?: MoodboardVariation;
  moodboardBrief?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: GenerateResult;
  error?: string;
};

const renderJobs = new Map<string, RenderJob>();
const RENDER_JOB_TTL_MS = 1000 * 60 * 60;
const MAX_RENDER_JOBS = 50;

/* ----------------------------------------------------------
 * Moodboard: randomized concept generation
 * ---------------------------------------------------------- */
router.post("/ai-render/moodboard", async (req, res): Promise<void> => {
  const parsed = moodboardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  try {
    const { category, brief, count } = parsed.data;
    const variations = buildMoodboardVariations(category, count);
    const results: Array<{ url: string; label: string; category: string; prompt: string }> = [];

    const isOpenRouter = (process.env["OPENAI_PROVIDER"] || "").toLowerCase() === "openrouter";

    // Generate all moodboard images in parallel — sequential would be count × API time
    const settled = await Promise.allSettled(
      variations.map(async (variation) => {
        const prompt = buildMoodboardPrompt(variation, brief);
        if (isOpenRouter) {
          const response = await callOpenRouterImage(buildFluxMoodboardPrompt(variation), []);
          const urls = findOpenRouterImages(response);
          if (!urls[0]) throw new Error("No image URL in response");
          return { url: urls[0], label: variation.label, category: variation.category, prompt };
        } else {
          const response = await callAzureResponses({
            model: getOpenAIModel(),
            input: `${JEWELLERY_STYLE_SYSTEM}\n\n${prompt}`,
            tools: [{ type: "image_generation", action: "generate" }],
          });
          const image = findImage(response);
          if (!image) throw new Error("No image in Azure response");
          const url = image.startsWith("data:image/") || /^https?:\/\//i.test(image) ? image : `data:image/png;base64,${image}`;
          return { url, label: variation.label, category: variation.category, prompt };
        }
      }),
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        logger.warn({ err: safeError(result.reason) }, "Moodboard single image failed, skipping");
      }
    }

    res.json({ images: results });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Moodboard generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Moodboard generation failed" });
  }
});

/* Moodboard via async job queue — each image is an independent job so
   the HTTP response returns instantly (no 30-second Render timeout). */
router.post("/ai-render/moodboard-jobs", (req, res): void => {
  const parsed = moodboardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { category, brief, count } = parsed.data;
  const variations = buildMoodboardVariations(category, count);
  pruneRenderJobs();

  const now = new Date().toISOString();
  const jobs = variations.map((variation) => {
    const job: RenderJob = {
      id: randomUUID(),
      status: "queued",
      request: { prompt: brief || "", category, imagePrompt: "", references: [], count: 1 },
      moodboardVariation: variation,
      moodboardBrief: brief || "",
      createdAt: now,
      updatedAt: now,
    };
    renderJobs.set(job.id, job);
    void runRenderJob(job.id);
    return serializeRenderJob(job);
  });

  res.status(202).json({ jobs });
});

router.post("/ai-render/generate", async (req, res): Promise<void> => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await generateImage(parsed.data);
    res.json(result);
  } catch (error) {
    logger.warn({ err: safeError(error) }, "AI image generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Image generation failed" });
  }
});

router.post("/ai-render/jobs", (req, res): void => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  pruneRenderJobs();

  const now = new Date().toISOString();
  const job: RenderJob = {
    id: randomUUID(),
    status: "queued",
    request: parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  renderJobs.set(job.id, job);
  void runRenderJob(job.id);
  res.status(202).json(serializeRenderJob(job));
});

router.get("/ai-render/jobs/:id", (req, res): void => {
  const id = req.params.id;
  const job = renderJobs.get(id);
  if (!job) {
    res.status(404).json({ error: "Render job not found" });
    return;
  }

  res.json(serializeRenderJob(job));
});

/* ----------------------------------------------------------
 * Annotation edit: re-render using the annotated image as a reference
 * ---------------------------------------------------------- */
router.post("/ai-render/edit", async (req, res): Promise<void> => {
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { baseImage, prompt, textLabels, previousPrompt, category } = parsed.data;

  if (!prompt && textLabels.length === 0) {
    res.status(400).json({ error: "Provide a description or write text labels on the image" });
    return;
  }

  try {
    const labelSection = textLabels.length > 0
      ? `Text labels the user wrote directly on the marked areas of the image: ${textLabels.map((t, i) => `${i + 1}. "${t}"`).join(", ")}. ` +
        `Each label is positioned exactly on the part of the design it refers to — apply the indicated change only to that area.`
      : "";

    const editInstructions = [
      JEWELLERY_STYLE_SYSTEM,
      "The user has annotated the concept render to indicate what should change. " +
      "Red pen strokes mark the specific areas. Any text written on the image names exactly what change is wanted in that area.",
      labelSection,
      previousPrompt ? `Original design brief: ${previousPrompt}` : "",
      prompt ? `Additional instructions: ${prompt}` : "",
      "Re-render the SAME jewellery piece — preserve composition, angle, category and all un-marked elements. " +
      "Apply ONLY the changes indicated by the annotations. " +
      "Output a clean colored-pencil jewellery sketch with no annotation marks or text labels.",
    ].filter(Boolean).join("\n\n");

    const isOpenRouter = (process.env["OPENAI_PROVIDER"] || "").toLowerCase() === "openrouter";

    if (isOpenRouter) {
      const response = await callOpenRouterImage(editInstructions, [
        { id: "annotated_render", name: "annotated_render", url: baseImage },
      ]);
      const urls = findOpenRouterImages(response);
      const url = urls[0];
      if (!url) throw new Error("OpenRouter did not return an edited image");
      res.json({ imageUrl: url, category });
      return;
    }

    const body = {
      model: getOpenAIModel(),
      input: [
        { role: "user", content: [
          { type: "input_text", text: editInstructions },
          { type: "input_image", image_url: baseImage },
        ]},
      ],
      tools: [{ type: "image_generation", action: "generate" }],
    };
    const response = await callAzureResponses(body);
    const image = findImage(response);
    if (!image) throw new Error("Azure did not return an edited image");
    const imageUrl = image.startsWith("data:image/") || /^https?:\/\//i.test(image)
      ? image
      : `data:image/png;base64,${image}`;
    res.json({ imageUrl, category });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "AI annotation edit failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Edit failed" });
  }
});

/* ----------------------------------------------------------
 * Virtual Try-On: composite person photo + jewellery image
 * ---------------------------------------------------------- */
const tryonSchema = z.object({
  personPhoto: z.string().min(1).max(20_000_000),
  jewelleryImage: z.string().min(1).max(20_000_000),
  jewelleryType: z.string().max(100).optional().default("ring"),
});

/**
 * Step 1 of 2 — ask a fast vision model to describe the jewellery in
 * forensic detail.  The returned string is embedded as a text anchor
 * in the compositing prompt so the generation model cannot drift to a
 * generic piece.
 */
async function describeJewellery(imageUrl: string, apiKey: string): Promise<string> {
  try {
    const visionModel = process.env["OPENROUTER_VISION_MODEL"] || "google/gemini-2.0-flash-001";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://blinkandbling-1.onrender.com",
        "X-Title": "Blink & Bling Jewellery Vision",
      },
      body: JSON.stringify({
        model: visionModel,
        max_tokens: 700,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "You are a master jewellery appraiser. Study this image and describe the piece in forensic detail so an AI can reproduce it exactly.",
                "Cover every observable physical attribute — do NOT use subjective words like 'elegant' or 'beautiful'.",
                "",
                "Format your response as a compact list covering:",
                "METAL: color (yellow gold / white gold / rose gold / silver / platinum / etc), finish (high-polish / matte / brushed / oxidised)",
                "STONES: for each distinct stone — shape (round brilliant / oval / pear / emerald cut / marquise / cushion / princess / heart / baguette / cabochon), color, approximate count, arrangement",
                "SETTING: prong (how many) / bezel / pave / channel / tension / flush / other",
                "STRUCTURE: band width & profile / chain link style / earring back type / pendant bail shape — whichever applies",
                "MOTIFS: any engravings, filigree, milgrain, geometric pattern, floral element, symbol, or text",
                "SILHOUETTE: overall outline, dimensions, and proportions",
                "Be exhaustive and precise.",
              ].join("\n"),
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) return "";
    const data = await res.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
    return (data?.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    return ""; // non-fatal — compositing still runs without description
  }
}

const tryonVideoSchema = z.object({
  tryonImage: z.string().min(1).max(30_000_000),
  jewelleryType: z.string().max(100).optional().default("jewellery"),
  motionPrompt: z.string().max(1000).optional().default(""),
});

const tryonFrames = new Map<string, { mimeType: string; buffer: Buffer; expiresAt: number }>();
const TRYON_FRAME_TTL_MS = 1000 * 60 * 20;
let tryonFrameTableReady: Promise<void> | null = null;

const JEWELLERY_POSITIONS: Record<string, string> = {
  ring: "finger(s)",
  necklace: "neck",
  earrings: "ear(s)",
  bracelet: "wrist",
  pendant: "neck/chest area",
  bangle: "wrist",
};

router.get("/ai/tryon/frame/:id", (req, res): void => {
  void (async () => {
    const frame = tryonFrames.get(req.params.id);
    if (frame && frame.expiresAt >= Date.now()) {
      res.setHeader("Content-Type", frame.mimeType);
      res.setHeader("Cache-Control", "public, max-age=600");
      res.send(frame.buffer);
      return;
    }
    if (frame) tryonFrames.delete(req.params.id);

    await ensureTryonFrameTable();
    const { rows } = await pool.query(
      `SELECT mime_type, data_url FROM bb_tryon_frames WHERE id = $1 AND expires_at > now()`,
      [req.params.id],
    );
    const row = rows[0] as { mime_type?: string; data_url?: string } | undefined;
    const match = row?.data_url?.match(/^data:([^;]+);base64,(.+)$/);
    if (!row || !match) {
      res.status(404).json({ error: "Try-on frame expired" });
      return;
    }

    res.setHeader("Content-Type", row.mime_type || match[1] || "image/png");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(Buffer.from(match[2] || "", "base64"));
  })().catch((error: unknown) => {
    logger.warn({ err: safeError(error) }, "Try-on frame fetch failed");
    res.status(500).json({ error: "Try-on frame fetch failed" });
  });
});

async function ensureTryonFrameTable() {
  if (!tryonFrameTableReady) {
    tryonFrameTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bb_tryon_frames (
          id VARCHAR(120) PRIMARY KEY,
          data_url TEXT NOT NULL,
          mime_type VARCHAR(80) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_bb_tryon_frames_expires ON bb_tryon_frames(expires_at)`);
    })().catch((error: unknown) => {
      tryonFrameTableReady = null;
      throw error;
    });
  }
  return tryonFrameTableReady;
}

function pruneTryonFrames() {
  const now = Date.now();
  for (const [id, frame] of tryonFrames.entries()) {
    if (frame.expiresAt < now) tryonFrames.delete(id);
  }
}

function getPublicRequestOrigin(req: { protocol: string; get(name: string): string | undefined }) {
  const runtimeFile = process.env["PUBLIC_BASE_URL_FILE"] || path.resolve(process.cwd(), ".public-base-url");
  const runtimeUrl = existsSync(runtimeFile) ? readFileSync(runtimeFile, "utf8").trim() : "";
  const configured = runtimeUrl || process.env["PUBLIC_BASE_URL"] || process.env["APP_PUBLIC_URL"];
  if (configured) return configured.replace(/\/+$/, "");

  const host = req.get("host") || "";
  if (!host || /(^localhost(?::|$)|^127\.|^0\.0\.0\.0|^\[?::1\]?)/i.test(host)) return null;
  return `${req.protocol}://${host}`;
}

async function createPublicFrameUrl(req: { protocol: string; get(name: string): string | undefined }, image: string) {
  if (/^https:\/\//i.test(image) && !/localhost|127\.|0\.0\.0\.0/i.test(image)) return image;

  const match = image.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);
  if (!match) {
    throw new Error("Video first frame must be a JPEG or PNG image.");
  }

  const origin = getPublicRequestOrigin(req);
  if (!origin || !origin.startsWith("https://")) {
    throw new Error("Video generation needs a public HTTPS app URL. Use the deployed app or set PUBLIC_BASE_URL to an HTTPS tunnel.");
  }

  pruneTryonFrames();
  const id = randomUUID();
  const mimeType = match[1]?.toLowerCase() === "image/jpg" ? "image/jpeg" : match[1]!;
  const dataUrl = `data:${mimeType};base64,${match[2]!}`;
  tryonFrames.set(id, {
    mimeType,
    buffer: Buffer.from(match[2]!, "base64"),
    expiresAt: Date.now() + TRYON_FRAME_TTL_MS,
  });

  await ensureTryonFrameTable();
  await pool.query(`DELETE FROM bb_tryon_frames WHERE expires_at <= now()`);
  await pool.query(
    `INSERT INTO bb_tryon_frames (id, data_url, mime_type, expires_at)
     VALUES ($1, $2, $3, now() + interval '20 minutes')
     ON CONFLICT (id) DO UPDATE SET data_url = EXCLUDED.data_url, mime_type = EXCLUDED.mime_type, expires_at = EXCLUDED.expires_at`,
    [id, dataUrl, mimeType],
  );

  return `${origin}/api/ai/tryon/frame/${id}`;
}

async function waitForOpenRouterVideo(pollingUrl: string, apiKey: string) {
  const statusUrl = new URL(pollingUrl, "https://openrouter.ai").toString();
  for (let attempt = 0; attempt < 28; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 7000 : 12000));

    const statusResponse = await fetch(statusUrl, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const statusText = await statusResponse.text();

    if (!statusResponse.ok) {
      throw new Error(`Video status failed (${statusResponse.status}): ${statusText.slice(0, 240)}`);
    }

    const status = JSON.parse(statusText) as {
      status?: string;
      error?: string | { message?: string };
      unsigned_urls?: string[];
    };

    if (status.status === "failed") {
      const message = typeof status.error === "string" ? status.error : status.error?.message;
      throw new Error(message || "OpenRouter video generation failed");
    }

    if (status.status !== "completed") continue;

    const url = status.unsigned_urls?.[0];
    if (!url) throw new Error("Video generation completed without a download URL");

    const videoResponse = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!videoResponse.ok) {
      throw new Error(`Video download failed (${videoResponse.status})`);
    }

    const mimeType = videoResponse.headers.get("content-type")?.split(";")[0] || "video/mp4";
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    return `data:${mimeType};base64,${videoBuffer.toString("base64")}`;
  }

  throw new Error("Video generation is still running. Please try again in a moment.");
}

router.post("/ai/tryon", async (req, res): Promise<void> => {
  const parsed = tryonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { personPhoto, jewelleryImage, jewelleryType } = parsed.data;
  const position = JEWELLERY_POSITIONS[jewelleryType] ?? "appropriate body part";

  try {
    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) {
      res.status(500).json({ error: "OpenRouter API key not configured" });
      return;
    }

    // ── Step 1: get a forensic text description of the jewellery ──────────────
    // Running in parallel is not possible here because the description is needed
    // before building the compositing prompt, but the call is fast (<2 s).
    const jewelleryDescription = await describeJewellery(jewelleryImage, apiKey);
    logger.info({ jewelleryType, descriptionLength: jewelleryDescription.length }, "Jewellery description complete");

    // ── Step 2: build the compositing prompt with description locked in ───────
    const descriptionAnchor = jewelleryDescription
      ? [
          `JEWELLERY DESCRIPTION (extracted from the reference image — reproduce this EXACTLY):`,
          jewelleryDescription,
        ].join("\n")
      : `JEWELLERY: the ${jewelleryType} shown in the reference image`;

    const compositingPrompt = [
      `TASK: You are a photorealistic image compositor. Place the jewellery from the JEWELLERY REFERENCE IMAGE onto the PERSON PHOTO. Output one seamless portrait photograph.`,
      ``,
      descriptionAnchor,
      ``,
      `ABSOLUTE RULES — failure to follow any of these invalidates the output:`,
      `1. The jewellery in the output must be IDENTICAL to the reference image. Same metal color, same stones, same stone shapes, same stone count, same setting, same silhouette, same size ratios, same motifs and engravings. Zero creative deviation.`,
      `2. Do NOT simplify, replace, or redesign the jewellery. If the reference is a complex multi-stone pavé ring, output that exact complex multi-stone pavé ring — not a plain band.`,
      `3. Do NOT substitute the piece with a generic or stock jewellery shape.`,
      `4. Place the ${jewelleryType} naturally on the person's ${position}. Adjust only: scale, perspective angle, shadow, and specular highlights so it looks genuinely worn.`,
      `5. Leave the person's face, skin tone, expression, hair, clothing, and background completely unchanged.`,
      `6. Output a single composite image. No side-by-side panels, no labels, no watermarks, no collage.`,
    ].join("\n");

    const model = getOpenRouterImageModel();

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://blinkandbling-1.onrender.com",
        "X-Title": "Blink & Bling Virtual Try-On",
      },
      body: JSON.stringify({
        model,
        prompt: [
          "REFERENCE IMAGE 1 is the jewellery. Copy that piece exactly.",
          "REFERENCE IMAGE 2 is the person photo. Keep the person and scene unchanged.",
          compositingPrompt,
        ].join("\n\n"),
        n: 1,
        resolution: "1K",
        aspect_ratio: "3:4",
        input_references: [
          { type: "image_url", image_url: { url: jewelleryImage } },
          { type: "image_url", image_url: { url: personPhoto } },
        ],
      }),
      signal: AbortSignal.timeout(300_000),
    });

    const rawText = await openRouterRes.text();

    if (!openRouterRes.ok) {
      logger.error({ status: openRouterRes.status, model, body: rawText.slice(0, 600) }, "Virtual try-on request failed");
      res.status(502).json({ error: `Try-on generation failed (${openRouterRes.status}): ${rawText.slice(0, 300)}` });
      return;
    }

    let data: unknown;
    try { data = JSON.parse(rawText); } catch {
      res.status(502).json({ error: "OpenRouter returned non-JSON response" });
      return;
    }

    const urls = findOpenRouterImages(data);
    const resultUrl = urls[0];

    if (!resultUrl) {
      logger.error({ model, raw: rawText.slice(0, 600) }, "Virtual try-on: no image in response");
      res.status(502).json({ error: "AI did not return a try-on image" });
      return;
    }

    res.json({ resultUrl });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Virtual try-on generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Try-on generation failed" });
  }
});

router.post("/ai/tryon/video", async (req, res): Promise<void> => {
  const parsed = tryonVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    res.status(501).json({ error: "OpenRouter API key is not configured." });
    return;
  }

  const { tryonImage, jewelleryType, motionPrompt } = parsed.data;
  const model = process.env["OPENROUTER_VIDEO_MODEL"] || "google/veo-3.1";
  let firstFrameUrl: string;
  try {
    firstFrameUrl = await createPublicFrameUrl(req, tryonImage);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid video first frame" });
    return;
  }

  const prompt = [
    `Create an elegant 8-second virtual jewellery try-on video from this starting image.`,
    `The person is wearing ${jewelleryType}. Preserve the person's identity, face, skin tone, body shape, outfit, and the exact jewellery design.`,
    `Motion: ${motionPrompt || "subtle camera push-in, natural head or hand movement, soft jewellery sparkle, premium studio lighting"}.`,
    `The jewellery must stay locked to the correct body part with realistic scale and reflections. No text, no split screen, no extra jewellery, no distorted hands or face.`,
  ].join("\n");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://blinkandbling-1.onrender.com",
        "X-Title": "Blink & Bling Virtual Try-On",
      },
      body: JSON.stringify({
        model,
        prompt,
        duration: 8,
        resolution: "720p",
        aspect_ratio: "9:16",
        generate_audio: false,
        frame_images: [
          {
            type: "image_url",
            image_url: { url: firstFrameUrl },
            frame_type: "first_frame",
          },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const rawText = await response.text();
    if (!response.ok) {
      logger.error({ status: response.status, model, body: rawText.slice(0, 600) }, "Virtual try-on video request failed");
      res.status(502).json({ error: `Video generation failed (${response.status}): ${rawText.slice(0, 260)}` });
      return;
    }

    const job = JSON.parse(rawText) as { polling_url?: string };
    if (!job.polling_url) {
      res.status(502).json({ error: "OpenRouter video generation did not return a polling URL" });
      return;
    }

    const videoUrl = await waitForOpenRouterVideo(job.polling_url, apiKey);
    res.json({ videoUrl });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Virtual try-on video generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Try-on video generation failed" });
  }
});

/* ----------------------------------------------------------
 * Virtual Try-On: frame-by-frame motion sequence
 * ---------------------------------------------------------- */
const motionSequenceSchema = z.object({
  tryonImage: z.string().min(1).max(30_000_000),
  jewelleryImage: z.string().min(1).max(20_000_000),
  jewelleryType: z.string().max(100).optional().default("necklace"),
});

const MOTION_FRAMES: ReadonlyArray<{ readonly label: string; readonly prompt: string }> = [
  {
    label: "3/4 turn",
    prompt:
      "Model makes a graceful 3/4 turn — left shoulder slightly forward, chin gently tilted, jewellery in clear view. Elegant fashion editorial stance.",
  },
  {
    label: "Hand detail",
    prompt:
      "Model's right hand rises naturally toward the jewellery, fingertips lightly touching or framing it. Intimate detail pose, editorial style.",
  },
  {
    label: "Presenting",
    prompt:
      "Model presents the jewellery with quiet confidence — upper body composition, hands gently framing the piece. Clean luxury editorial shot.",
  },
  {
    label: "Close fashion",
    prompt:
      "Tighter editorial crop: face and jewellery filling the frame. Jewellery in crisp focus with soft background bokeh, fashion magazine composition.",
  },
  {
    label: "Hero shot",
    prompt:
      "Final hero editorial: model looking directly into camera, jewellery perfectly positioned as centrepiece. Confident, polished, premium fashion.",
  },
] as const;

async function generateMotionFrame(
  tryonImageUrl: string,
  jewelleryImageUrl: string,
  jewelleryType: string,
  jewelleryDescription: string,
  apiKey: string,
  motion: { label: string; prompt: string },
): Promise<string> {
  const descriptionAnchor = jewelleryDescription
    ? `JEWELLERY DESCRIPTION (must be reproduced exactly in every frame):\n${jewelleryDescription}`
    : `JEWELLERY: the ${jewelleryType} shown in the reference images`;

  const compositingPrompt = [
    `TASK: Generate one frame of a photorealistic fashion editorial sequence.`,
    ``,
    `POSE / MOTION FOR THIS FRAME:`,
    motion.prompt,
    ``,
    descriptionAnchor,
    ``,
    `ABSOLUTE RULES — follow every one or the frame is invalid:`,
    `1. Same person — identical face, skin tone, hair, body proportions as the REFERENCE FRAME.`,
    `2. Same ${jewelleryType} — identical metal, stones, silhouette, and motifs as described above. Zero creative deviation.`,
    `3. Same outfit and studio environment as the reference frame.`,
    `4. Change only the pose and camera framing as described above.`,
    `5. Photorealistic portrait photography, premium fashion editorial quality.`,
    `6. No text, no watermarks, no split screen, no collage, no extra jewellery.`,
  ].join("\n");

  const model = getOpenRouterImageModel();

  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://blinkandbling-1.onrender.com",
      "X-Title": "Blink & Bling Try-On Motion",
    },
    body: JSON.stringify({
      model,
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: "3:4",
        image_size: "1K",
      },
      messages: [{
        role: "user",
        content: [
          { type: "text",      text: "JEWELLERY REFERENCE (maintain this exact piece in every frame):" },
          { type: "image_url", image_url: { url: jewelleryImageUrl, detail: "high" } },
          { type: "text",      text: "\nREFERENCE FRAME (match this person, outfit, and jewellery exactly):" },
          { type: "image_url", image_url: { url: tryonImageUrl, detail: "high" } },
          { type: "text",      text: "\n" + compositingPrompt },
        ],
      }],
    }),
    signal: AbortSignal.timeout(300_000),
  });

  const rawText = await openRouterRes.text();
  if (!openRouterRes.ok) {
    throw new Error(`Motion frame "${motion.label}" failed (${openRouterRes.status}): ${rawText.slice(0, 200)}`);
  }

  let data: unknown;
  try { data = JSON.parse(rawText); } catch {
    throw new Error(`OpenRouter returned non-JSON for motion frame "${motion.label}"`);
  }

  const urls = findOpenRouterImages(data);
  const url = urls[0];
  if (!url) throw new Error(`No image in response for motion frame "${motion.label}"`);
  return url;
}

router.post("/ai/tryon/frames", async (req, res): Promise<void> => {
  const parsed = motionSequenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { tryonImage, jewelleryImage, jewelleryType } = parsed.data;
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OpenRouter API key not configured" });
    return;
  }

  try {
    // Step 1: forensic jewellery description for cross-frame consistency
    const jewelleryDescription = await describeJewellery(jewelleryImage, apiKey);
    logger.info(
      { jewelleryType, descriptionLength: jewelleryDescription.length },
      "Jewellery described for motion sequence",
    );

    // Step 2: generate all 5 motion frames in parallel (frame 1 = tryonImage already exists)
    const motionResults = await Promise.allSettled(
      MOTION_FRAMES.map(motion =>
        generateMotionFrame(tryonImage, jewelleryImage, jewelleryType, jewelleryDescription, apiKey, motion),
      ),
    );

    const motionFrames = motionResults.map((r, i) => ({
      url: r.status === "fulfilled" ? r.value : tryonImage,
      label: MOTION_FRAMES[i]?.label ?? `Frame ${i + 2}`,
      failed: r.status === "rejected",
    }));

    const failedCount = motionFrames.filter(f => f.failed).length;
    if (failedCount > 0) {
      logger.warn({ failedCount }, "Some motion frames failed — falling back to try-on base");
    }

    res.json({
      frames: [
        { url: tryonImage, label: "Try-on", failed: false },
        ...motionFrames,
      ],
    });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Motion sequence generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Motion sequence generation failed" });
  }
});

router.post("/ai/respond", async (req, res): Promise<void> => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  try {
    const text = await generateText(parsed.data.prompt);
    res.json({ text });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Azure OpenAI text response failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "AI response failed" });
  }
});

async function runRenderJob(id: string) {
  const job = renderJobs.get(id);
  if (!job) return;

  const startedAt = new Date().toISOString();
  job.status = "running";
  job.startedAt = startedAt;
  job.updatedAt = startedAt;

  try {
    const result = job.moodboardVariation
      ? await generateMoodboardImage(job.moodboardVariation, job.moodboardBrief || "")
      : await generateImage(job.request);
    const finishedAt = new Date().toISOString();
    job.status = "completed";
    job.result = result;
    job.finishedAt = finishedAt;
    job.updatedAt = finishedAt;
    logger.info({ jobId: id, category: job.request.category }, "AI render job completed");
  } catch (error) {
    const finishedAt = new Date().toISOString();
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Image generation failed";
    job.finishedAt = finishedAt;
    job.updatedAt = finishedAt;
    logger.warn({ jobId: id, err: safeError(error) }, "AI render job failed");
  }
}

function serializeRenderJob(job: RenderJob) {
  return {
    id: job.id,
    status: job.status,
    category: job.request.category,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    result: job.result,
    error: job.error,
    moodboardLabel: job.moodboardVariation?.label,
    moodboardCategory: job.moodboardVariation?.category,
  };
}

function pruneRenderJobs() {
  const cutoff = Date.now() - RENDER_JOB_TTL_MS;
  for (const [id, job] of renderJobs.entries()) {
    const updated = Date.parse(job.updatedAt);
    if ((job.status === "completed" || job.status === "failed") && updated < cutoff) {
      renderJobs.delete(id);
    }
  }

  if (renderJobs.size <= MAX_RENDER_JOBS) return;

  const oldest = [...renderJobs.values()]
    .filter((job) => job.status === "completed" || job.status === "failed")
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));

  for (const job of oldest) {
    if (renderJobs.size <= MAX_RENDER_JOBS) break;
    renderJobs.delete(job.id);
  }
}

async function generateImage(request: GenerateRequest) {
  const { prompt, imagePrompt, category, references } = request;
  if ((process.env["OPENAI_PROVIDER"] || "").toLowerCase() === "openrouter") {
    const images = await generateOpenRouterImages(prompt, imagePrompt, category, references);
    const imageUrl = images[0]?.url;
    if (!imageUrl) throw new Error("OpenRouter did not return a usable image");
    return { imageUrl, images };
  }

  const [variation] = createJewelleryVariations(prompt, 1, category);
  const finalPrompt = buildJewelleryImagePrompt(prompt, imagePrompt, variation, references);
  const body = {
    model: getOpenAIModel(),
    input: [
      JEWELLERY_STYLE_SYSTEM,
      finalPrompt,
      references.length
        ? `Reference image names uploaded by user: ${references.map((ref) => ref.name || ref.id || "reference").join(", ")}`
        : "",
    ].filter(Boolean).join("\n\n"),
    tools: [{ type: "image_generation", action: "generate" }],
  };

  const response = await callAzureResponses(body);
  const image = findImage(response);
  if (!image) {
    throw new Error("Azure OpenAI did not return an image");
  }

  const imageUrl = image.startsWith("data:image/") || /^https?:\/\//i.test(image)
    ? image
    : `data:image/png;base64,${image}`;
  return { imageUrl, images: [{ angle: variation.label, url: imageUrl }] };
}

async function generateMoodboardImage(variation: MoodboardVariation, brief: string) {
  if ((process.env["OPENAI_PROVIDER"] || "").toLowerCase() === "openrouter") {
    const finalPrompt = buildFluxMoodboardPrompt(variation);
    const response = await callOpenRouterImage(finalPrompt, []);
    const images = findOpenRouterImages(response);
    const url = images[0];
    if (!url) throw new Error("OpenRouter did not return a moodboard image");
    return {
      imageUrl: url,
      images: [{ angle: variation.label, url }],
      moodboardLabel: variation.label,
      moodboardCategory: variation.category,
    };
  }

  const prompt = buildMoodboardPrompt(variation, brief);
  const body = {
    model: getOpenAIModel(),
    input: `${JEWELLERY_STYLE_SYSTEM}\n\n${prompt}`,
    tools: [{ type: "image_generation", action: "generate" }],
  };
  const response = await callAzureResponses(body);
  const image = findImage(response);
  if (!image) throw new Error("Azure did not return a moodboard image");
  const url = image.startsWith("data:image/") || /^https?:\/\//i.test(image)
    ? image
    : `data:image/png;base64,${image}`;
  return {
    imageUrl: url,
    images: [{ angle: variation.label, url }],
    moodboardLabel: variation.label,
    moodboardCategory: variation.category,
  };
}

async function generateOpenRouterImages(
  prompt: string,
  imagePrompt: string,
  category: string,
  references: Array<z.infer<typeof referenceSchema>>,
) {
  const variations = createJewelleryVariations(prompt, 1, category);
  const results: Array<{ angle: string; url: string }> = [];

  for (const variation of variations) {
    // Use Flux-optimized prompt (not the long Azure-format one) — shorter prompts process faster
    const finalPrompt = buildFluxPrompt(prompt, variation);
    const response = await callOpenRouterImage(finalPrompt, references);
    const images = findOpenRouterImages(response);
    const url = images[0];
    if (!url) throw new Error(`OpenRouter did not return image for ${variation.label}`);
    results.push({ angle: variation.label, url });
  }

  return results;
}

async function callOpenRouterImage(
  prompt: string,
  references: Array<z.infer<typeof referenceSchema>> = [],
) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OpenRouter is not configured");

  const model = getOpenRouterImageModel();

  // OpenRouter routes all models (including Flux image generation) via /chat/completions.
  // Do NOT send `modalities` — that is an OpenAI-specific feature not supported by Flux.
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://blinkandbling-1.onrender.com",
      "X-Title": "Blink & Bling",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: buildOpenRouterMessageContent(prompt, references) }],
    }),
    signal: AbortSignal.timeout(300_000),
  });

  const rawText = await res.text();

  if (!res.ok) {
    logger.error({ status: res.status, model, body: rawText.slice(0, 600) }, "OpenRouter image generation failed");
    throw new Error(`OpenRouter image request failed (${res.status}): ${rawText.slice(0, 300)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    logger.error({ model, rawText: rawText.slice(0, 600) }, "OpenRouter returned non-JSON");
    throw new Error(`OpenRouter returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  logger.info({ model, responseKeys: Object.keys(data as object) }, "OpenRouter image response received");
  return data;
}

function buildOpenRouterMessageContent(
  prompt: string,
  references: Array<z.infer<typeof referenceSchema>>,
) {
  const usableReferences = references
    .filter((ref) => isUsableImageUrl(ref.url))
    .slice(0, 3);

  if (!usableReferences.length) return prompt;

  return [
    { type: "text", text: prompt },
    ...usableReferences.map((ref) => ({
      type: "image_url",
      image_url: { url: ref.url, detail: "high" },
    })),
  ];
}

type JewelleryVariation = {
  label: string;
  category: string;
  design: string;
  materials: string;
  palette: string;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function createJewelleryVariations(userPrompt: string, count: number, requestedCategory = "auto"): JewelleryVariation[] {
  const category = normalizeCategory(requestedCategory) || inferCategory(userPrompt);
  const variantsByCategory: Record<string, JewelleryVariation[]> = {
    men_watch: [
      { label: "Men blue chronograph", category: "men's wristwatch", design: "premium classic stainless-steel chronograph watch with a round case, deep blue dial, three subdials, silver bracelet, bold hour markers and masculine luxury proportions", materials: "stainless steel indicated with silver pencil shading, sapphire-blue dial, subtle diamond-like index accents", palette: "steel silver, deep sapphire blue, crisp white pencil highlights" },
      { label: "Men emerald dress watch", category: "men's wristwatch", design: "elegant dress watch with slim yellow-gold case, emerald green dial, refined baton markers, clean bracelet links and a premium eveningwear look", materials: "yellow gold indicated with warm pencil shading, emerald green enamel dial, hand-drawn metal sheen strokes", palette: "yellow gold, emerald green, black graphite shadow lines, white pencil glints" },
      { label: "Men black sport watch", category: "men's wristwatch", design: "luxury sporty chronograph with black ceramic bezel, charcoal dial, three subdials, brushed steel bracelet and precise technical detailing", materials: "brushed steel, black ceramic, luminous markers, sapphire crystal", palette: "charcoal, steel, icy white, muted blue accents" },
    ],
    women_watch: [
      { label: "Rose gold bracelet watch", category: "women's wristwatch", design: "slim elegant rose-gold bracelet watch with small diamond-like accents around the bezel, light pink mother-of-pearl dial and graceful jewellery-link detailing", materials: "rose gold, mother-of-pearl dial, diamond-like pave bezel, pink sapphire crown accent", palette: "rose gold, pale pink, pearl white, soft crystal highlights" },
      { label: "Silver floral watch", category: "women's wristwatch", design: "delicate silver jewellery bracelet watch with floral links, oval dial, tiny marquise-cut gemstone accents and feminine decorative rhythm", materials: "silver indicated with cool pencil shading, white crystals, lavender amethyst accents, mother-of-pearl dial", palette: "silver, lavender, pearl white, cool teal pencil shadows" },
      { label: "Turquoise fashion watch", category: "women's wristwatch", design: "modern fashion bracelet watch with turquoise dial, slim hand-drawn case, decorative gem-set links and clean catalogue illustration styling", materials: "white gold, turquoise enamel, diamond-like pave accents", palette: "turquoise, white gold, soft mint, crystal white" },
    ],
    necklace: [
      { label: "Sapphire floral necklace", category: "statement necklace", design: "elegant symmetrical necklace with floral and leaf motifs, center drop pendant, layered gemstone clusters and refined luxury spacing", materials: "rose gold, sapphire blue stones, mint green gems, peach stones and white crystal accents", palette: "sapphire blue, mint green, peach, rose gold, white crystal" },
      { label: "Emerald drop necklace", category: "statement necklace", design: "regal necklace with scrollwork, emerald center drop, pear-cut side stones, pave arcs and balanced ornamental links", materials: "yellow gold, emerald green gemstones, diamond accents, filigree metalwork", palette: "emerald green, yellow gold, ivory, diamond white" },
      { label: "Ruby collar necklace", category: "statement necklace", design: "luxury collar necklace with ruby floral clusters, marquise-cut petals, diamond pave bridges and a centered teardrop pendant", materials: "white gold, ruby red gemstones, diamond pave, hand-drawn prongs", palette: "ruby red, white gold, blush, bright diamond highlights" },
    ],
    earrings: [
      { label: "Pear drop earrings", category: "pair of earrings", design: "matching drop earrings with pear-cut center stones, pave halos, delicate prongs and balanced luxury silhouette", materials: "platinum, pear-cut sapphires, diamond pave halos", palette: "platinum silver, sapphire blue, diamond white" },
      { label: "Floral stud earrings", category: "pair of earrings", design: "floral stud earrings with marquise gemstone petals, round center stone and tiny diamond-like accents", materials: "rose gold, amethyst, pink sapphire, diamond accents", palette: "rose gold, amethyst purple, pale pink, white crystal" },
    ],
    ring: [
      { label: "Rose gold halo ring", category: "ring", design: "rose-gold engagement ring with oval center gemstone, pave halo, fine prongs and delicate split shank", materials: "rose gold, oval pink sapphire, diamond pave accents", palette: "rose gold, pale pink, diamond white" },
      { label: "Emerald art deco ring", category: "ring", design: "art deco ring with emerald-cut center stone, geometric diamond shoulders and clean stepped metalwork", materials: "platinum, emerald green center stone, diamond accents", palette: "platinum silver, emerald green, white crystal" },
    ],
    pendant: [
      { label: "Pear gemstone pendant", category: "pendant", design: "single pendant with pear-cut gemstone, diamond halo, small bail and graceful luxury proportions", materials: "yellow gold, sapphire or ruby center stone, diamond accents", palette: "yellow gold, jewel blue or ruby red, crystal white" },
      { label: "Floral locket pendant", category: "pendant", design: "decorative floral pendant with filigree frame, pearl center and small colored gemstones around the edge", materials: "rose gold, pearl, amethyst and turquoise accents", palette: "rose gold, pearl white, turquoise, amethyst" },
    ],
    bangle: [
      { label: "Gemstone bangle", category: "bangle", design: "single luxury bangle with open cuff silhouette, bezel-set gemstones, clean hand-drawn edges and refined product symmetry", materials: "yellow gold, emerald, ruby and sapphire cabochons, diamond accents", palette: "yellow gold, emerald green, ruby red, sapphire blue, diamond white" },
      { label: "Pearl bracelet bangle", category: "bangle", design: "elegant bracelet bangle with pearl stations, pave diamond arcs and delicate rose-gold structure", materials: "rose gold, pearls, diamond pave", palette: "rose gold, pearl white, champagne, soft blush" },
    ],
  };

  const fallback = [...variantsByCategory.women_watch, ...variantsByCategory.men_watch, ...variantsByCategory.necklace, ...variantsByCategory.ring];
  const source = shuffle(variantsByCategory[category] || fallback);
  return Array.from({ length: count }, (_, index) => source[index % source.length]);
}

function inferCategory(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (/\bmen|male|masculine|chronograph|sport watch\b/.test(normalized)) return "men_watch";
  if (/\bwomen|female|feminine|bracelet watch|mother[- ]of[- ]pearl\b/.test(normalized)) return "women_watch";
  if (/\bwatch|wristwatch|dial|bezel\b/.test(normalized)) return "women_watch";
  if (/\bnecklace|choker|collar\b/.test(normalized)) return "necklace";
  if (/\bearring|earrings|studs|drop earring\b/.test(normalized)) return "earrings";
  if (/\bpendant|locket\b/.test(normalized)) return "pendant";
  if (/\bbangle|bracelet|cuff\b/.test(normalized)) return "bangle";
  if (/\bring|solitaire|halo\b/.test(normalized)) return "ring";
  return "women_watch";
}

function normalizeCategory(category: string) {
  const normalized = category.toLowerCase().trim();
  if (!normalized || normalized === "auto") return null;
  if (["men_watch", "women_watch", "necklace", "earrings", "pendant", "bangle", "ring"].includes(normalized)) return normalized;
  if (/watch|wristwatch|chronograph/.test(normalized)) return "women_watch";
  if (/necklace|choker|collar/.test(normalized)) return "necklace";
  if (/earring|stud/.test(normalized)) return "earrings";
  if (/pendant|locket/.test(normalized)) return "pendant";
  if (/bangle|bracelet|cuff/.test(normalized)) return "bangle";
  if (/ring|solitaire|halo/.test(normalized)) return "ring";
  return null;
}

/* ----------------------------------------------------------
 * OpenRouter image prompt builder
 * Structured prompt following the formula:
 * Subject + Style + Design + Materials + Composition + Background + Restrictions
 * ---------------------------------------------------------- */
function buildFluxPrompt(userPrompt: string, variation: JewelleryVariation): string {
  return [
    `Create a single isolated ${variation.category} illustration on a white background.`,
    "",
    "Style: FULLY FINISHED luxury jewelry concept illustration. Every single surface must use COLORED pencil — NO plain graphite grey anywhere. Metal surfaces: use warm champagne-gold and butter-yellow tones for yellow gold, icy blue-silver and lavender for white gold/silver/platinum, rose-coral and peachy tones for rose gold. The entire piece must look richly and fully colored, like a professional luxury jewelry catalog illustration, not a monochrome sketch.",
    "",
    `Design: ${variation.design}.`,
    userPrompt.trim() ? `Customer brief: ${userPrompt.trim()}.` : "",
    "",
    `Materials: ${variation.materials}.`,
    `Color palette: ${variation.palette}.`,
    "",
    "Gemstone rendering: each gemstone must show deep saturated color fill, internal facet lines, multiple bright white sparkle highlights, and realistic light refraction — vivid and glowing.",
    "Metal rendering: COLORED pencil only — warm golden-yellow strokes for gold, cool blue-silver strokes for silver/platinum. Smooth gradient from bright highlight to shadow. Prong and setting details clearly drawn. ZERO grey monochrome areas.",
    "",
    "Composition: single product only, centered, full piece visible, clean white background, generous margins.",
    "",
    "Restrictions: no text, no logo, no watermark, no people, no hands, no mannequin, no table, no props, no background scene, no 3D render, no CAD, no photograph. The style must be hand-drawn colored pencil illustration only.",
  ].filter(Boolean).join("\n");
}

function buildFluxMoodboardPrompt(variation: MoodboardVariation): string {
  return [
    `Create a single isolated ${variation.category} illustration on a white background.`,
    "",
    "Style: FULLY FINISHED luxury jewelry concept illustration. Every single surface must use COLORED pencil — NO plain graphite grey anywhere. Metal surfaces: warm champagne-gold and butter-yellow for yellow gold, icy blue-silver and lavender for white gold/silver/platinum, rose-coral and peachy tones for rose gold. Richly and fully colored throughout, luxury catalog quality.",
    "",
    `Design: ${variation.design}. Overall feel: ${variation.style}.`,
    "",
    `Metal: ${variation.metal}.`,
    `Gemstones: ${variation.stones}.`,
    `Color palette: ${variation.palette}.`,
    "",
    "Gemstone rendering: deep saturated color, internal facet lines, multiple white sparkle highlights, realistic light refraction.",
    "Metal rendering: COLORED pencil only — warm golden-yellow for gold, cool blue-silver for platinum/silver. Smooth gradient from highlight to shadow. ZERO grey monochrome areas.",
    "",
    "Composition: single product only, centered, full piece visible, clean white background.",
    "",
    "Restrictions: no text, no logo, no watermark, no people, no mannequin, no table, no props, no 3D, no CAD, no photograph.",
    "",
    "Restrictions: no text, no logo, no watermark, no people, no hands, no mannequin, no table, no props, no background scene, no realistic photograph, no studio photo, no 3D, no CAD, no glossy render.",
  ].join("\n");
}

function buildJewelleryImagePrompt(
  userPrompt: string,
  imagePrompt: string,
  variation: JewelleryVariation,
  references: Array<z.infer<typeof referenceSchema>> = [],
) {
  return [
    "Create one high-resolution jewellery/watch concept image.",
    "",
    `Object/category: single isolated ${variation.category}.`,
    "",
    "Customer brief:",
    userPrompt.trim(),
    imagePrompt.trim()
      ? `Additional guidance: ${imagePrompt.trim()}`
      : "",
    "",
    "Design:",
    variation.design,
    "",
    "Style:",
    "Detailed colorful pencil-sketch jewellery concept art. Visible pencil grain, graphite-black outlines, hand-drawn contour lines, soft colored-pencil shading, illustrated gemstone facets, white pencil highlight strokes, and hand-drawn metal sheen. The image must look like a scanned professional luxury jewellery design sketch, not a camera image.",
    "",
    "Materials and colors:",
    variation.materials,
    variation.palette,
    references.length
      ? [
          `The user supplied ${references.length} reference image(s). Follow these reference instructions carefully:`,
          ...references.map((ref, index) => {
            const details = [
              `Reference ${index + 1}${ref.name ? ` (${ref.name})` : ""}`,
              ref.useOnly ? `use only for: ${ref.useOnly}` : "use as loose visual inspiration",
              ref.likes ? `likes: ${ref.likes}` : "",
              ref.dislikes ? `avoid/dislikes: ${ref.dislikes}` : "",
            ].filter(Boolean).join("; ");
            return `- ${details}`;
          }),
          "Use references only for category/style guidance. Do not copy the reference design exactly.",
          "Do not copy watermarks, text, hands, props, people or backgrounds from references.",
        ].join("\n")
      : "",
    "",
    "Composition:",
    "Single subject only, centered, full product visible, generous clean margins, clean product-catalog cutout composition. For jewellery sets, arrange the necklace, earrings, and ring cleanly as one coordinated isolated set.",
    "",
    "Background:",
    "Transparent PNG alpha background. If alpha is not supported, use pure white seamless background (#FFFFFF). Do not draw checkerboard squares.",
    "",
    "Restrictions:",
    "No text, no logo, no brand name, no watermark, no people, no hands, no mannequin, no table, no box, no fabric, no props, no background scene, no frame, no border, no extra objects.",
    "",
    "Hard negative style lock: no realistic photograph, no studio product shot, no CAD image, no 3D image, no CGI, no glossy render, no plastic look, no dark background, no surface shadows. If the image starts looking photographic or 3D, convert it back into a flat 2D colored-pencil sketch.",
  ].filter(Boolean).join("\n");
}

async function generateText(prompt: string) {
  const response = await callAzureResponses({
    model: getOpenAIModel(),
    input: prompt,
  });

  const text = findText(response);
  if (!text) {
    throw new Error("Azure OpenAI did not return text");
  }
  return text;
}

async function callAzureResponses(body: unknown) {
  const url = process.env["AZURE_OPENAI_RESPONSES_URL"];
  const apiKey = process.env["OPENAI_API_KEY"] || process.env["AZURE_OPENAI_API_KEY"];
  const imageDeployment = process.env["AZURE_OPENAI_IMAGE_DEPLOYMENT"];

  if (!url || !apiKey) {
    throw new Error("Azure OpenAI is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(imageDeployment ? { "x-ms-oai-image-generation-deployment": imageDeployment } : {}),
      "api_version": "preview",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    logger.warn({ status: response.status, detail }, "Azure OpenAI Responses request failed");
    throw new Error("Azure OpenAI request failed");
  }

  return response.json() as Promise<unknown>;
}

function getOpenAIModel() {
  return process.env["OPENAI_MODEL"] || "gpt-5.2";
}

function getOpenRouterImageModel() {
  return process.env["OPENROUTER_IMAGE_MODEL"]
    || "google/gemini-3.1-flash-image-preview";
}

function findImage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImage(item);
      if (found) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["result", "image_base64", "b64_json", "image_url", "url"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 80) {
      return candidate;
    }
  }

  for (const candidate of Object.values(record)) {
    const found = findImage(candidate);
    if (found) return found;
  }

  return null;
}

function findOpenRouterImages(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const urls: string[] = [];

  // Primary: images/generations format { data: [{ url: "https://..." } | { b64_json: "..." }] }
  const data = Array.isArray(record["data"]) ? record["data"] : [];
  for (const item of data) {
    const url = normalizeImageUrl(item);
    if (url && !urls.includes(url)) urls.push(url);
  }

  // Fallback: chat completions format
  // Handles content (string | array) AND the `images` field used by gpt-5.4-image-2
  if (urls.length === 0) {
    const choices = Array.isArray(record["choices"]) ? record["choices"] : [];
    for (const choice of choices) {
      if (!choice || typeof choice !== "object") continue;
      const msg = (choice as Record<string, unknown>)["message"];
      if (!msg || typeof msg !== "object") continue;
      const m = msg as Record<string, unknown>;

      // gpt-5.4-image-2 returns images in message.images (content is null)
      if (Array.isArray(m["images"])) {
        for (const img of m["images"] as unknown[]) {
          const url = normalizeImageUrl(img);
          if (url && !urls.includes(url)) urls.push(url);
        }
      }

      // Standard: message.content as string or content-block array
      const content = m["content"];
      if (typeof content === "string") {
        const url = normalizeImageUrl(content);
        if (url && !urls.includes(url)) urls.push(url);
      }
      if (Array.isArray(content)) {
        for (const part of content) {
          const url = normalizeImageUrl(part);
          if (url && !urls.includes(url)) urls.push(url);
        }
      }
    }
  }

  // Last resort: deep-scan the whole response
  if (urls.length === 0) collectImageUrls(value, urls);
  return urls;
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isUsableImageUrl(trimmed)) return trimmed;
    const compact = trimmed.replace(/\s/g, "");
    if (compact.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
      return `data:image/png;base64,${compact}`;
    }
    // Extract URL embedded in prose (e.g. Flux returning text around the image link)
    const urlMatch = trimmed.match(/https?:\/\/\S{20,}/);
    if (urlMatch) return urlMatch[0].replace(/[)"'>]+$/, "");
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["url", "imageUrl", "image_url", "b64_json", "base64", "data", "result"]) {
    const found = normalizeImageUrl(record[key]);
    if (found) return found;
  }
  return null;
}

function isUsableImageUrl(value: string) {
  return /^data:image\//i.test(value) || /^https?:\/\//i.test(value);
}

function collectImageUrls(value: unknown, urls: string[]) {
  const normalized = normalizeImageUrl(value);
  if (normalized && !urls.includes(normalized)) urls.push(normalized);

  if (!value || typeof value !== "object") return;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    if (urls.length >= 8) return;
    if (typeof child === "string" && child.length > 1000) {
      const childUrl = normalizeImageUrl(child);
      if (childUrl && !urls.includes(childUrl)) urls.push(childUrl);
      continue;
    }
    collectImageUrls(child, urls);
  }
}

function findText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    return value.map(findText).find(Boolean) ?? null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["output_text", "text", "content"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  for (const candidate of Object.values(record)) {
    const found = findText(candidate);
    if (found) return found;
  }

  return null;
}

function safeError(error: unknown) {
  return error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
}

/* ----------------------------------------------------------
 * Moodboard: randomized variation engine
 * ---------------------------------------------------------- */
interface MoodboardVariation {
  label: string;
  category: string;
  design: string;
  metal: string;
  stones: string;
  palette: string;
  style: string;
}

const METALS = ["rose gold", "yellow gold", "white gold", "platinum", "sterling silver", "18k gold", "warm gold pencil shading"];
const STONES_POOL = [
  "diamond", "sapphire", "emerald", "ruby", "amethyst", "aquamarine", "tourmaline",
  "morganite", "tanzanite", "topaz", "peridot", "garnet", "pearl", "turquoise", "opal",
];
const COLOR_PALETTES = [
  "sapphire blue, mint green, peach, white crystal",
  "emerald green, gold, ivory, diamond white",
  "ruby red, rose gold, blush, champagne",
  "amethyst purple, turquoise, coral, pearl white",
  "deep teal, lavender, gold, crystal highlights",
  "coral, warm peach, rose gold, soft pink",
  "midnight blue, silver, ice white, diamond sparkle",
  "forest green, antique gold, cream, bronze",
  "pink sapphire, rose gold, pearl, soft lilac",
  "sky blue, platinum, white opal, soft grey",
];

const RING_DESIGNS = [
  "elegant engagement ring with oval center gemstone, pave halo, fine prongs and delicate split shank",
  "art deco ring with emerald-cut center stone, geometric diamond shoulders and clean stepped metalwork",
  "vintage solitaire ring with round brilliant center, cathedral setting, milgrain edges and ornate gallery",
  "modern tension ring with princess-cut center, minimalist band and floating stone illusion",
  "three-stone ring with pear-cut center flanked by round side stones, graceful tapered band",
  "nature-inspired ring with floral halo, leaf-shaped shoulders and vine-like band detailing",
];
const NECKLACE_DESIGNS = [
  "elegant symmetrical statement necklace with floral and leaf motifs, center drop pendant, layered gemstone clusters",
  "regal necklace with scrollwork, pear-cut center drop, pave arcs and balanced ornamental links",
  "luxury collar necklace with marquise-cut petal clusters, diamond pave bridges and centered teardrop pendant",
  "delicate pendant necklace with a single large faceted gemstone, diamond halo frame and fine cable chain",
  "art nouveau necklace with flowing organic curves, enamel details and graduated gemstone stations",
  "modern Y-necklace with geometric links, bezel-set stones and a long drop pendant finale",
];
const EARRING_DESIGNS = [
  "matching chandelier drop earrings with pear-cut center stones, pave halos and delicate filigree frame",
  "floral stud earrings with marquise gemstone petals, round center stone and tiny diamond accents",
  "long cascading earrings with graduated gemstones, leaf motifs and graceful movement",
  "modern hoop earrings with inside-out pave setting and baguette accent stones",
  "classic button studs with brilliant-cut center stone, micro-pave halo and scalloped edge",
];
const WATCH_DESIGNS = [
  "premium stainless-steel chronograph watch with round case, deep blue dial, three subdials, bold hour markers",
  "slim elegant bracelet watch with small diamond accents around the bezel, mother-of-pearl dial, jewellery-link detailing",
  "modern dress watch with cushion-shaped case, sunburst dial, slim bracelet indicated with pencil sheen strokes and refined indices",
  "luxury sport watch with ceramic bezel, matte dial, luminous markers and rubber strap with metal accents",
  "vintage-inspired watch with enamel dial, roman numerals, onion crown and mesh bracelet",
];
const PENDANT_DESIGNS = [
  "single pendant with pear-cut gemstone, diamond halo frame, ornate bail and fine chain",
  "decorative floral pendant with filigree frame, pearl center and colored gemstone border",
  "modern geometric pendant with bezel-set princess-cut stone, clean lines and hand-drawn metal edges",
  "heart-shaped pendant with pave diamond surface, hidden bail and delicate cable chain",
  "vintage locket pendant with engraved scrollwork, small gemstone accents and hinged opening",
];
const BANGLE_DESIGNS = [
  "luxury open cuff bangle with bezel-set cabochon gemstones, clean hand-drawn metal edges and refined symmetry",
  "elegant bracelet bangle with pearl stations, pave diamond arcs and delicate rose-gold structure",
  "modern hinged bangle with alternating gemstone and diamond sections, click clasp and colored-pencil metal finish",
  "snake-style wraparound bangle with scaled texture, gemstone eyes and flexible coil design",
  "art deco rigid bangle with geometric pattern, channel-set baguettes and milgrain border",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function buildMoodboardVariations(category: string, count: number): MoodboardVariation[] {
  const designPool: Record<string, string[]> = {
    ring: RING_DESIGNS,
    necklace: NECKLACE_DESIGNS,
    earrings: EARRING_DESIGNS,
    watch: WATCH_DESIGNS,
    pendant: PENDANT_DESIGNS,
    bangle: BANGLE_DESIGNS,
  };

  const categoryLabels: Record<string, string> = {
    ring: "ring",
    necklace: "statement necklace",
    earrings: "pair of earrings",
    watch: "wristwatch",
    pendant: "pendant",
    bangle: "bangle",
  };

  const designs = designPool[category] || RING_DESIGNS;
  const catLabel = categoryLabels[category] || category;

  return Array.from({ length: count }, (_, i) => {
    const metal = pick(METALS);
    const stones = pickN(STONES_POOL, 2 + Math.floor(Math.random() * 2)).join(", ");
    const palette = pick(COLOR_PALETTES);
    const design = designs[i % designs.length];

    return {
      label: `${metal} ${catLabel} concept ${i + 1}`,
      category: catLabel,
      design,
      metal,
      stones,
      palette,
      style: pick(["classic luxury", "modern minimalist", "vintage art deco", "romantic feminine", "bold statement", "elegant refined"]),
    };
  });
}

function buildMoodboardPrompt(variation: MoodboardVariation, brief: string): string {
  return [
    "STYLE LOCK - NON NEGOTIABLE:",
    "2D colored-pencil jewellery/watch concept illustration only. The image must look hand drawn, scanned, and cut out. Do not create a realistic photo, studio product shot, 3D/CAD/CGI image, glossy render, lifestyle scene, or object on a table.",
    "",
    `Create a single isolated ${variation.category} illustration as a transparent PNG cutout.`,
    "",
    brief ? `Design brief from client, used only for subject/material/design intent and never for photorealistic style: ${brief}` : "",
    "",
    "Generate a completely new, original design direction.",
    "",
    "Exact visual target:",
    "Luxury jewellery/watch concept sketch drawn with colored pencils: visible pencil grain, graphite-black outlines, hand-drawn contour lines, bright faceted gemstone fills, white pencil highlight strokes, and gold/silver metal shading made from pencil strokes. It must look like a scanned professional jewellery design illustration cutout, never like a camera image.",
    "",
    "Design:",
    variation.design,
    `Overall feel: ${variation.style}`,
    "",
    "Style:",
    "Detailed colorful pencil-sketch jewellery concept art, crisp graphite outlines, soft colored-pencil shading, illustrated faceted gemstone drawing, hand-drawn metal sheen strokes, luxury concept illustration, refined catalogue cutout presentation.",
    "",
    "Materials and colors:",
    `Metal: ${variation.metal}`,
    `Gemstones: ${variation.stones}`,
    `Color palette: ${variation.palette}`,
    "",
    "Composition:",
    "Single subject only, centered, full product visible, generous clean margins, product-catalog cutout composition, balanced symmetry where appropriate, no extra objects.",
    "",
    "Background:",
    "Transparent PNG alpha background only. If alpha is not supported, use pure white seamless background (#FFFFFF), no horizon line, no paper texture, no scene. Do not draw a checkerboard.",
    "",
    "Restrictions:",
    "No text, no logo, no brand name, no watermark, no people, no hands, no mannequin, no table, no box, no fabric, no props, no background scene, no frame, no border, no extra objects, no realistic photograph, no studio photo, no CAD image, no 3D image, no CGI, no glossy render, no plastic look, no dark background, no shadows on a surface.",
    "",
    "Final check before generating: if the image starts looking photographic, 3D, CAD-like, glossy, or studio-lit, convert it back into a flat 2D colored-pencil sketch with visible graphite outlines and pencil texture.",
  ].filter(Boolean).join("\n");
}

/* ----------------------------------------------------------
 * Image → CAD: analyze jewelry photo, return parametric recipe JSON
 * ---------------------------------------------------------- */
const imageToCadSchema = z.object({
  imageBase64: z.string().min(50).max(10_000_000),
});

const CAD_ANALYZE_PROMPT = `You are an expert jewelry CAD engineer and gemologist. Analyze the jewelry image and extract precise manufacturing parameters. Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

JSON format (all fields required):
{
  "jewelryCategory": one of: "ring" | "pendant" | "earring-stud" | "earring-hoop" | "bangle",
  "metal": one of: "14k-yellow" | "18k-yellow" | "22k-yellow" | "rose-gold" | "white-gold" | "platinum" | "sterling-silver" | "black-rhodium" | "palladium",
  "centerStone": {
    "shape": one of: "round-brilliant" | "oval" | "pear" | "princess" | "emerald" | "cushion" | "marquise" | "asscher" | "radiant" | "heart" | "trillion" | "baguette" | "cabochon" | "rose-cut",
    "diameterMm": estimated diameter in millimeters (number, e.g. 6.5),
    "material": one of: "diamond" | "ruby" | "sapphire" | "emerald" | "morganite" | "tanzanite" | "aquamarine" | "amethyst" | "garnet" | "topaz" | "opal" | "tourmaline" | "alexandrite" | "spinel" | "pearl"
  },
  "settingType": one of: "solitaire" | "cathedral-solitaire" | "bezel" | "half-bezel" | "tension" | "pave" | "micro-pave" | "channel" | "bar" | "flush" | "invisible" | "burnish" | "prong-basket" | "split-prong",
  "prongCount": 4 or 6 or 8,
  "hasHalo": true or false,
  "hasPave": true or false,
  "shankStyle": one of: "straight" | "cathedral" | "split-shank" | "bypass" | "twisted" | "trellis" | "peg-head" | "double-bypass" | "euro-shank",
  "bandWidthMm": estimated band width in mm (number, e.g. 2.5),
  "description": "One sentence describing this jewelry piece",
  "confidence": confidence score 0.0 to 1.0 (be honest — 0.7 is typical for photos)
}`;

router.post("/ai/cad/analyze", async (req, res): Promise<void> => {
  const parsed = imageToCadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "imageBase64 field required", details: parsed.error.flatten() });
    return;
  }

  const { imageBase64 } = parsed.data;

  // Strip data URL prefix if present, keep just base64
  const base64Only = imageBase64.includes(",") ? imageBase64.split(",")[1]! : imageBase64;

  // Detect mime type
  const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1]! : "image/jpeg";

  try {
    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) {
      res.status(500).json({ error: "OpenRouter API key not configured" });
      return;
    }

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Blink & Bling CAD Analyzer",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: CAD_ANALYZE_PROMPT },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Only}`, detail: "high" } },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text().catch(() => openRouterRes.statusText);
      logger.warn({ status: openRouterRes.status, detail }, "OpenRouter vision request failed");
      res.status(502).json({ error: `Vision model failed (${openRouterRes.status}): ${detail.slice(0, 200)}` });
      return;
    }

    const openRouterData = await openRouterRes.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = openRouterData?.choices?.[0]?.message?.content ?? "";

    // Extract JSON from the response (strip any accidental markdown fences)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ content }, "Vision model returned no JSON");
      res.status(502).json({ error: "Vision model returned unrecognizable response", raw: content.slice(0, 300) });
      return;
    }

    let cadResult: unknown;
    try {
      cadResult = JSON.parse(jsonMatch[0]);
    } catch {
      res.status(502).json({ error: "Vision model returned invalid JSON", raw: jsonMatch[0].slice(0, 300) });
      return;
    }

    res.json(cadResult);
  } catch (err) {
    logger.error({ err: safeError(err) }, "Image-to-CAD analysis failed");
    res.status(500).json({ error: "Internal error during image analysis" });
  }
});

export default router;
