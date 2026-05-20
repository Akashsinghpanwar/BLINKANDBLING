/**
 * Removes the white/near-white background from a jewelry sketch image.
 * Uses the Canvas API to process pixels directly — no external dependencies.
 *
 * External image URLs are routed through /api/image/proxy to bypass CORS.
 * Data URLs (base64) are used directly.
 *
 * threshold: pixels with min(R,G,B) >= this value fade to transparent.
 * 230 works well for pencil-sketch jewelry with crisp white backgrounds.
 */
export async function removeWhiteBackground(
  imageUrl: string,
  threshold = 244,
): Promise<string> {
  const src = imageUrl.startsWith("data:")
    ? imageUrl
    : `/api/image/proxy?url=${encodeURIComponent(imageUrl)}`;

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imageUrl); return; }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        // Only strip pixels that are both very bright AND nearly neutral (low saturation).
        // This protects silver/grey metallic pencil shading — those pixels have high
        // brightness but are still colored content, not background.
        const isNeutral = (max - min) <= 12;

        if (min >= threshold && isNeutral) {
          d[i + 3] = Math.round(((255 - min) / (255 - threshold)) * 255);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };

    // If anything fails, fall back to the original URL unchanged
    img.onerror = () => resolve(imageUrl);
    img.src = src;
  });
}
