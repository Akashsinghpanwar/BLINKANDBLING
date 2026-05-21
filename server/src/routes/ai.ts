import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
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
  const source = variantsByCategory[category] || fallback;
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
    || process.env["OPENROUTER_MODEL"]
    || "openai/gpt-5.4-image-2";
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
