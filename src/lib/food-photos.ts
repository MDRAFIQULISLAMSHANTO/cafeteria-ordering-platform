// Locally stored, reusable food photography. Per-image attribution is exposed
// at /photo-credits. These are representative dishes, not client portion photos.
import photoMap from "./menu-photo-map.json";

export const BUNDLED_PHOTOS: Record<string, string[]> = photoMap;

/** Photos for a product: an uploaded one first, else the bundled crops, else none. */
export function photosFor(productId: string, uploaded: Map<string, number>): string[] | null {
  const at = uploaded.get(productId);
  if (at != null) return [`/api/menu-photo/${encodeURIComponent(productId)}?v=${at}`];
  return BUNDLED_PHOTOS[productId] ?? null;
}
