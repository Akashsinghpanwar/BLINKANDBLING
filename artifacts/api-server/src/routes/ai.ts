import { Router, type IRouter } from "express";
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

    for (const variation of variations) {
      const prompt = buildMoodboardPrompt(variation, brief);
      try {
        if ((process.env["OPENAI_PROVIDER"] || "").toLowerCase() === "openrouter") {
          const response = await callOpenRouterImage(prompt, []);
          const urls = findOpenRouterImages(response);
          if (urls[0]) {
            results.push({ url: urls[0], label: variation.label, category: variation.category, prompt });
          }
        } else {
          const response = await callAzureResponses({
            model: getOpenAIModel(),
            input: `${JEWELLERY_STYLE_SYSTEM}\n\n${prompt}`,
            tools: [{ type: "image_generation", action: "generate" }],
          });
          const image = findImage(response);
          if (image) {
            const url = image.startsWith("data:image/") || /^https?:\/\//i.test(image) ? image : `data:image/png;base64,${image}`;
            results.push({ url, label: variation.label, category: variation.category, prompt });
          }
        }
      } catch (err) {
        logger.warn({ err: safeError(err), label: variation.label }, "Moodboard single image failed, continuing");
      }
    }

    res.json({ images: results });
  } catch (error) {
    logger.warn({ err: safeError(error) }, "Moodboard generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Moodboard generation failed" });
  }
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
    logger.warn({ err: safeError(error) }, "Azure OpenAI image generation failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Image generation failed" });
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

type GenerateRequest = z.infer<typeof generateSchema>;

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

async function generateOpenRouterImages(
  prompt: string,
  imagePrompt: string,
  category: string,
  references: Array<z.infer<typeof referenceSchema>>,
) {
  const variations = createJewelleryVariations(prompt, 1, category);
  const results: Array<{ angle: string; url: string }> = [];

  for (const variation of variations) {
    const finalPrompt = buildJewelleryImagePrompt(prompt, imagePrompt, variation, references);
    const response = await callOpenRouterImage(finalPrompt, references);
    const images = findOpenRouterImages(response);
    const url = images[0];
    if (!url) throw new Error(`OpenRouter did not return image for ${variation.label}`);
    results.push({ angle: variation.label, url });
  }

  return results;
}

async function callOpenRouterImage(prompt: string, references: Array<z.infer<typeof referenceSchema>> = []) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("OpenRouter is not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "Blink & Bling",
    },
    body: JSON.stringify({
      model: getOpenRouterImageModel(),
      messages: [
        { role: "system", content: JEWELLERY_STYLE_SYSTEM },
        { role: "user", content: buildOpenRouterMessageContent(prompt, references) },
      ],
      modalities: ["image"],
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    logger.warn({ status: response.status, detail }, "OpenRouter image request failed");
    throw new Error("OpenRouter image request failed");
  }

  return response.json() as Promise<unknown>;
}

function buildOpenRouterMessageContent(prompt: string, references: Array<z.infer<typeof referenceSchema>>) {
  if (references.length === 0) return prompt;

  return [
    { type: "text", text: prompt },
    ...references
      .filter((reference) => isUsableImageUrl(reference.url))
      .slice(0, 3)
      .map((reference) => ({
        type: "image_url",
        image_url: {
          url: reference.url,
        },
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

function buildJewelleryImagePrompt(
  userPrompt: string,
  imagePrompt: string,
  variation: JewelleryVariation,
  references: Array<z.infer<typeof referenceSchema>> = [],
) {
  return [
    "STYLE LOCK - NON NEGOTIABLE:",
    "2D colored-pencil jewellery/watch concept illustration only. The image must look hand drawn, scanned, and cut out. Do not create a realistic photo, studio product shot, 3D/CAD/CGI image, glossy render, lifestyle scene, or object on a table.",
    "",
    `Create a single isolated ${variation.category} illustration as a transparent PNG cutout.`,
    "",
    "Use this Luna/customer design brief only for subject, category, materials, colors, stones, and design intent. Ignore any conflicting style request for realism, product photography, 3D, CAD, renders, studio lighting, glossy reflections, or lifestyle presentation:",
    userPrompt.trim(),
    imagePrompt.trim()
      ? [
          "",
          "Additional visual guidance from user, still subordinate to the style lock above:",
          imagePrompt.trim(),
        ].join("\n")
      : "",
    "",
    "Generate a new design direction, not a direct copy of any uploaded or known image.",
    "",
    "Exact visual target:",
    "The result must look like a luxury jewellery/watch concept sketch drawn with colored pencils: visible pencil grain, graphite-black outline work, hand-drawn contour lines, bright colored gemstone fills, faceted stone linework, white pencil highlight strokes, and gold/silver metal shading made from pencil strokes. It should look like a scanned professional jewellery design illustration cutout, never like a camera image.",
    "",
    "Design:",
    variation.design,
    "",
    "Style:",
    "Detailed colorful pencil-sketch jewellery concept art, crisp graphite outlines, soft colored-pencil shading, illustrated faceted gemstone drawing, hand-drawn metal sheen strokes, luxury concept illustration, refined catalogue cutout presentation.",
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
    "Single subject only, centered, full product visible, generous clean margins, product-catalog cutout composition, balanced symmetry where appropriate, no extra objects. For jewellery sets, arrange the necklace, earrings, and ring cleanly as one coordinated isolated set.",
    "",
    "Background:",
    "Transparent PNG alpha background only. If alpha is not supported, use pure white seamless background (#FFFFFF), no horizon line, no paper texture, no scene. Do not draw a checkerboard; the viewer may show transparency separately.",
    "",
    "Restrictions:",
    "No text, no logo, no brand name, no watermark, no people, no hands, no mannequin, no table, no box, no fabric, no props, no background scene, no frame, no border, no extra objects, no realistic photograph, no studio photo, no CAD image, no 3D image, no CGI, no glossy render, no plastic look, no dark background, no shadows on a surface.",
    "",
    "Final check before generating: if the image starts looking photographic, 3D, CAD-like, glossy, or studio-lit, convert it back into a flat 2D colored-pencil sketch with visible graphite outlines and pencil texture.",
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
    || process.env["OPENAI_IMAGE_MODEL"]
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
  const choices = Array.isArray(record["choices"]) ? record["choices"] : [];
  const urls: string[] = [];
  const add = (candidate: unknown) => {
    const url = normalizeImageUrl(candidate);
    if (url && !urls.includes(url)) urls.push(url);
  };

  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue;
    const message = (choice as Record<string, unknown>)["message"];
    if (!message || typeof message !== "object") continue;
    const images = (message as Record<string, unknown>)["images"];
    if (!Array.isArray(images)) continue;

    for (const image of images) {
      if (!image || typeof image !== "object") continue;
      const imageUrl = (image as Record<string, unknown>)["image_url"];
      add(image);
      add(imageUrl);
    }
  }

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

export default router;
