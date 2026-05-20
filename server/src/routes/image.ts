import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/image/proxy", async (req, res): Promise<void> => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!rawUrl) {
    res.status(400).json({ error: "Missing image URL" });
    return;
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid image URL" });
    return;
  }

  if (!["http:", "https:"].includes(target.protocol) || isBlockedProxyHost(target.hostname)) {
    res.status(400).json({ error: "Unsupported image URL" });
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "BlinkAndBling/1.0 image proxy",
        "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Image fetch failed" });
      return;
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
    if (contentType && !contentType.startsWith("image/") && contentType !== "application/octet-stream") {
      res.status(415).json({ error: "URL did not return an image" });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", contentType.startsWith("image/") ? contentType : "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (error) {
    logger.warn({ err: safeError(error), host: target.hostname }, "Image proxy failed");
    res.status(502).json({ error: "Image proxy failed" });
  }
});

function isBlockedProxyHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost"
    || host === "0.0.0.0"
    || host === "::1"
    || host.endsWith(".local")
    || /^127\./.test(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    || /^169\.254\./.test(host);
}

function safeError(error: unknown) {
  return error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
}

export default router;
