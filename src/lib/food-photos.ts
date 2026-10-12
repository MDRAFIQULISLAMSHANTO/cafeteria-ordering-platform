// Locally stored, reusable food photography. Per-image attribution is exposed
// at /photo-credits. These are representative dishes, not client portion photos.
import photoMap from "./menu-photo-map.json";

export const BUNDLED_PHOTOS: Record<string, string[]> = photoMap;

// S Cafe's own dish photos: transparent cut-outs supplied by the client
// (scripts/food-photos/scafe-cutouts.py). They win over everything else.
export const SCAFE_CUTOUTS: Record<string, string> = {
  "menu-a-014": "/menu/scafe/honey-glazed-chicken.webp", // Honey Glazed Buffalo Wings
  "menu-a-015": "/menu/scafe/beef-burger.webp", // Beef Supreme Burger
  "menu-a-017": "/menu/scafe/brownie.webp", // Chocolate Brownie
  "menu-a-037": "/menu/scafe/cafe-latte.webp", // Café Latte
  "menu-a-046": "/menu/scafe/kebab-paratha.webp", // Kebab Paratha & Rasmalai
  "menu-b-062": "/menu/scafe/seekh-kebab.webp", // Mixed Grill Platter
  "menu-b-085": "/menu/scafe/cafe-latte.webp", // Latte (other menu, never on the same page)
};

// Illustrative 3D-style cut-outs (supplied 12 Oct 2026, generated images,
// scripts/food-photos/food-3d-cutouts.py). They win over the stock photos.
// Menu A and menu B never show on the same outlet, so an image may repeat across them.
const D = (k: string) => `/menu/3d/${k}.webp`;
export const FOOD_3D: Record<string, string> = {
  // menu A — S Café
  "menu-a-001": D("chicken-wedges-combo"),
  "menu-a-002": D("chicken-burger-fries-combo"), // composed from the burger and fries images
  "menu-a-005": D("chicken-mushroom-bake"),
  "menu-a-006": D("spinach-quiche"),
  "menu-a-007": D("beef-patty-pastry"),
  "menu-a-008": D("veg-quiche-slice"),
  "menu-a-009": D("chicken-drums"),
  "menu-a-010": D("focaccia-club"),
  "menu-a-011": D("chicken-sandwich"),
  "menu-a-012": D("chicken-burger"),
  "menu-a-013": D("chicken-sub"),
  "menu-a-016": D("berry-cheesecake"),
  "menu-a-018": D("basbousa"),
  "menu-a-021": D("fries"),
  "menu-a-025": D("chicken-wrap"),
  "menu-a-027": D("banana-waffle"),
  "menu-a-030": D("strawberry-mojito"),
  "menu-a-033": D("mango-smoothie"),
  "menu-a-034": D("blueberry-smoothie"),
  "menu-a-035": D("coffee-cup"),
  "menu-a-038": D("latte-biscotti"),
  "menu-a-039": D("iced-caramel-latte"),
  "menu-a-040": D("mocha"),
  "menu-a-041": D("hot-chocolate"),
  "menu-a-043": D("biryani-gulab-jamun"),
  // menu B — Parent Lounge / Head Office
  "menu-b-048": D("chicken-spinach-quiche"),
  "menu-b-053": D("veg-quiche-slice"),
  "menu-b-055": D("caesar-salad"),
  "menu-b-058": D("pasta"),
  "menu-b-061": D("fish-and-chips"),
  "menu-b-067": D("chicken-spinach-quiche"),
  "menu-b-068": D("focaccia-club"),
  "menu-b-074": D("chocolate-lava-cake"),
  "menu-b-075": D("berry-cheesecake"),
  "menu-b-081": D("coffee-cup"),
  "menu-b-087": D("mocha"),
  "menu-b-088": D("iced-latte"),
  "menu-b-089": D("chocolate-cream-mug"),
  "menu-b-093": D("chocolate-frappe"),
  "menu-b-096": D("caramel-frappe"),
};

/** S Cafe's own photo (wording on the menu says so). */
export const isScafePhoto = (src: string) => src.startsWith("/menu/scafe/");
/** A transparent cut-out is shown whole on a tinted plate, not cropped to fill. */
export const isCutout = (src: string) => src.startsWith("/menu/scafe/") || src.startsWith("/menu/3d/");

/** Photos for a product: an uploaded one first, then S Cafe's cut-out, then the 3D cut-out, then the stock photo. */
export function photosFor(productId: string, uploaded: Map<string, number>): string[] | null {
  const at = uploaded.get(productId);
  if (at != null) return [`/api/menu-photo/${encodeURIComponent(productId)}?v=${at}`];
  if (SCAFE_CUTOUTS[productId]) return [SCAFE_CUTOUTS[productId]];
  if (FOOD_3D[productId]) return [FOOD_3D[productId]];
  return BUNDLED_PHOTOS[productId] ?? null;
}
