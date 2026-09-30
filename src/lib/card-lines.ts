// One short line for each menu card. STS's printed menus describe only some
// items; for the rest Invento wrote a neutral line from the item's name alone
// (no extra ingredients, so no allergen claims). Replace with STS's own
// descriptions when they are supplied. Combos list what's in them.

const LINES: Record<string, string> = {
  // S Café — A La Carte
  "menu-a-005": "Chicken and mushroom, baked until golden",
  "menu-a-006": "Savoury tart with spinach and chicken",
  "menu-a-007": "Flaky pastry with a spiced beef filling",
  "menu-a-008": "Savoury tart with mixed vegetables",
  "menu-a-009": "Crispy fried chicken drumsticks",
  "menu-a-010": "Club sandwich on focaccia bread",
  "menu-a-011": "Chicken and mayonnaise sandwich",
  "menu-a-012": "Crispy chicken fillet in a soft bun",
  "menu-a-013": "Chicken in a soft sub roll",
  "menu-a-014": "Chicken wings with a honey glaze",
  "menu-a-015": "Beef patty in a soft bun",
  "menu-a-016": "Classic baked cheesecake slice",
  "menu-a-017": "Rich chocolate brownie",
  "menu-a-018": "Semolina cake with cream",
  "menu-a-019": "Two chocolate chip cookies",
  "menu-a-020": "Two oat cookies sweetened with jaggery",
  // S Café — Live Counter
  "menu-a-021": "Freshly fried, crispy fries",
  "menu-a-022": "Seasoned potato wedges",
  "menu-a-023": "Crisp pastry with a vegetable filling",
  "menu-a-024": "Two crispy chicken spring rolls",
  "menu-a-025": "Chicken kebab rolled in a wrap",
  "menu-a-026": "Four golden fried cheese balls",
  "menu-a-027": "Waffle with Nutella and banana",
  // S Café — Beverages
  "menu-a-028": "Fresh lemonade, 150 ml",
  "menu-a-029": "Green mango cooler, 150 ml",
  "menu-a-030": "Strawberry mojito (no alcohol), 150 ml",
  "menu-a-031": "Freshly squeezed orange juice, 150 ml",
  "menu-a-032": "Fresh watermelon juice, 150 ml",
  "menu-a-033": "Mango smoothie, 150 ml",
  "menu-a-034": "Blueberry smoothie, 150 ml",
  "menu-a-035": "Espresso topped with hot water",
  "menu-a-036": "Espresso with steamed milk and foam",
  "menu-a-037": "Espresso with plenty of steamed milk",
  "menu-a-038": "Latte with hazelnut flavour",
  "menu-a-039": "Latte with caramel flavour",
  "menu-a-040": "Espresso, chocolate and steamed milk",
  "menu-a-041": "Warm chocolate drink",
  // S Café — Day Specials (main + dessert)
  "menu-a-042": "Omelette with toast, plus a chocolate pancake",
  "menu-a-043": "Mutton biryani, with gulab jamun for dessert",
  "menu-a-044": "Chicken quesadilla, with fudge brownie",
  "menu-a-045": "Masala dosa, with kheer for dessert",
  "menu-a-046": "Kebab paratha, with rasmalai for dessert",
  // Parent Lounge — Desserts sold by weight
  "menu-b-078": "Assorted cookies, priced per kg",
  "menu-b-079": "Chocolate pieces, priced per kg",
  "menu-b-080": "Oat and chocolate chip cookies, per kg",
  // Parent Lounge — Beverages, tea, shakes
  "menu-b-081": "Freshly brewed coffee",
  "menu-b-082": "A short, strong shot of coffee",
  "menu-b-083": "Espresso topped with hot water",
  "menu-b-084": "Espresso with steamed milk and foam",
  "menu-b-085": "Espresso with plenty of steamed milk",
  "menu-b-086": "Whisked green tea",
  "menu-b-087": "Espresso, chocolate and steamed milk",
  "menu-b-089": "Chocolate drink, served hot or cold",
  "menu-b-090": "Green tea with steamed milk",
  "menu-b-091": "A choice of premium Halda Valley teas",
  "menu-b-092": "Cookies and cream shake",
  "menu-b-093": "Chocolate shake",
  "menu-b-094": "Chocolate mint shake",
  "menu-b-095": "Chocolate and mango shake",
};

/** The line shown under the name: STS's description, the combo's contents, or a short summary. */
export function cardLine(p: { id: string; description?: string | null; comboItems?: string[] | null }): string | null {
  if (p.comboItems?.length) return p.comboItems.join(" · ");
  return p.description?.trim() || LINES[p.id] || null;
}
