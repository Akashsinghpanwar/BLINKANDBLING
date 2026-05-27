/**
 * Removes the background from a jewelry sketch/render image.
 * Handles both light (white/near-white) and dark (charcoal/near-black) backgrounds
 * by sampling corner pixels to auto-detect which type is present.
 *
 * External image URLs are routed through /api/image/proxy to bypass CORS.
 * Data URLs (base64) are used directly.
 */

/** Sample average brightness of the 4 corners to detect bg type. */
function detectBgBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const;
  let total = 0;
  for (const [x, y] of corners) {
    const px = ctx.getImageData(x, y, 1, 1).data;
    total += (px[0]! + px[1]! + px[2]!) / 3;
  }
  return total / 4;
}

function processPixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lightThreshold: number,
  darkThreshold: number,
): string {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    // Near-neutral saturation check — protects coloured gemstones and metallic shading
    const isNeutral = (max - min) <= 22;

    // Remove near-white neutral background (light bg mode)
    if (isNeutral && min >= lightThreshold) {
      d[i + 3] = Math.round(((255 - min) / (255 - lightThreshold)) * 255);
    }
    // Remove near-black neutral background (dark bg mode)
    else if (isNeutral && max <= darkThreshold) {
      d[i + 3] = Math.round((max / darkThreshold) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return ctx.canvas.toDataURL("image/png");
}

function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

async function tryRemove(src: string, lightThreshold: number, crossOrigin?: string): Promise<string> {
  const img = await loadImage(src, crossOrigin);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(img, 0, 0);

  // Auto-detect background: if corners avg < 100 it's a dark bg, otherwise light
  const avgBrightness = detectBgBrightness(ctx, canvas.width, canvas.height);
  const isDark = avgBrightness < 100;

  // For light bg: strip bright neutrals. For dark bg: strip dark neutrals.
  const darkThreshold = isDark ? Math.round(avgBrightness * 1.4) : 0;
  const lightThr = isDark ? 255 : lightThreshold; // disable light removal for dark images

  return processPixels(ctx, canvas.width, canvas.height, lightThr, darkThreshold);
}

export async function removeWhiteBackground(
  imageUrl: string,
  threshold = 240,
): Promise<string> {
  // Data URLs and same-origin paths — process directly, no CORS needed.
  // Gallery images are served via /api/gallery/images/:id (same origin),
  // so canvas can read them without a CORS proxy.
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("/")) {
    try {
      return await tryRemove(imageUrl, threshold);
    } catch {
      return imageUrl;
    }
  }

  // External URL — try via server-side proxy first (avoids CORS entirely)
  const proxied = `/api/image/proxy?url=${encodeURIComponent(imageUrl)}`;
  try {
    return await tryRemove(proxied, threshold);
  } catch {
    // Proxy failed — try loading the image directly with crossOrigin header
    try {
      return await tryRemove(imageUrl, threshold, "anonymous");
    } catch {
      // All attempts failed — fall back to original URL with white background
      return imageUrl;
    }
  }
}
