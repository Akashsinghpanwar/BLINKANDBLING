/**
 * Removes the white/near-white background from a jewelry sketch image.
 * Uses the Canvas API to process pixels directly — no external dependencies.
 *
 * External image URLs are routed through /api/image/proxy to bypass CORS.
 * Data URLs (base64) are used directly.
 *
 * threshold: pixels with min(R,G,B) >= this value AND near-neutral saturation
 *   fade to transparent. 240 works well for pencil-sketch jewelry.
 */

function processPixels(ctx: CanvasRenderingContext2D, w: number, h: number, threshold: number): string {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    // Only strip pixels that are both very bright AND nearly neutral (low saturation).
    // Protects silver/grey metallic pencil shading.
    const isNeutral = (max - min) <= 18;
    if (min >= threshold && isNeutral) {
      // Graduated fade — brightest pixels become fully transparent
      d[i + 3] = Math.round(((255 - min) / (255 - threshold)) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const canvas = ctx.canvas;
  return canvas.toDataURL("image/png");
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

async function tryRemove(src: string, threshold: number, crossOrigin?: string): Promise<string> {
  const img = await loadImage(src, crossOrigin);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(img, 0, 0);
  return processPixels(ctx, canvas.width, canvas.height, threshold);
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
