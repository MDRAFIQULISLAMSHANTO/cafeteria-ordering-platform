// Food photos cut from STS's own files (the S Café menu and a Glenrich
// invitation banner — see scripts/food-photos). Only a handful of dishes are
// pictured there; every other item keeps its drawn plate until the outlet
// uploads a real photo in Operations (stored in product_photo, which wins).
// A combo may show two photos side by side.

const P = (name: string) => `/menu/photos/${name}.webp`;

export const BUNDLED_PHOTOS: Record<string, string[]> = {
  "menu-a-002": [P("burger"), P("lemonade")], // Chicken Burger + Fries + Lemonade
  "menu-a-011": [P("croissant-sandwich")], // Chicken Mayo Sandwich (representative)
  "menu-a-012": [P("burger")], // Chicken Supreme Burger
  "menu-a-014": [P("wings")], // Honey Glazed Buffalo Wings
  "menu-a-036": [P("latte")], // Cappuccino
  "menu-a-037": [P("latte")], // Café Latte
  "menu-a-043": [P("biryani")], // Monday: Mutton Biryani & Gulab Jamun
  "menu-b-084": [P("latte")], // Cappuccino
  "menu-b-085": [P("latte")], // Latte
};

/** Photos for a product: an uploaded one first, else the bundled crops, else none. */
export function photosFor(productId: string, uploaded: Map<string, number>): string[] | null {
  const at = uploaded.get(productId);
  if (at != null) return [`/api/menu-photo/${encodeURIComponent(productId)}?v=${at}`];
  return BUNDLED_PHOTOS[productId] ?? null;
}
