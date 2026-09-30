// Locally stored, reusable food photography. Per-image attribution is exposed
// at /photo-credits. These are representative dishes, not client portion photos.
import photoMap from "./menu-photo-map.json";

export const BUNDLED_PHOTOS: Record<string, string[]> = photoMap;

// S Cafe's own dish photos: transparent cut-outs supplied by the client
// (scripts/food-photos/scafe-cutouts.py). They win over the stock photos.
export const SCAFE_CUTOUTS: Record<string, string> = {
  "menu-a-014": "/menu/scafe/honey-glazed-chicken.webp", // Honey Glazed Buffalo Wings
  "menu-a-015": "/menu/scafe/beef-burger.webp", // Beef Supreme Burger
  "menu-a-017": "/menu/scafe/brownie.webp", // Chocolate Brownie
  "menu-a-037": "/menu/scafe/cafe-latte.webp", // Café Latte
  "menu-a-046": "/menu/scafe/kebab-paratha.webp", // Kebab Paratha & Rasmalai
  "menu-b-062": "/menu/scafe/seekh-kebab.webp", // Mixed Grill Platter
  "menu-b-085": "/menu/scafe/cafe-latte.webp", // Latte (other menu, never on the same page)
};

/** A transparent cut-out is shown whole on a tinted plate, not cropped to fill. */
export const isCutout = (src: string) => src.startsWith("/menu/scafe/");

/** Photos for a product: an uploaded one first, then S Cafe's cut-out, then the stock photo, else none. */
export function photosFor(productId: string, uploaded: Map<string, number>): string[] | null {
  const at = uploaded.get(productId);
  if (at != null) return [`/api/menu-photo/${encodeURIComponent(productId)}?v=${at}`];
  if (SCAFE_CUTOUTS[productId]) return [SCAFE_CUTOUTS[productId]];
  return BUNDLED_PHOTOS[productId] ?? null;
}
