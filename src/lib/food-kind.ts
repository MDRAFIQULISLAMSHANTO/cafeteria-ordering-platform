// Which drawn illustration represents a menu item. The menus came with no
// product photos, so every item gets a code-drawn plate (src/components/food)
// chosen from its name and section. Pure: used on server and client.

export type FoodKind =
  | "burger" | "fries" | "chicken" | "sandwich" | "wrap" | "quiche" | "cake" | "cookie" | "waffle"
  | "rice" | "pasta" | "main" | "salad" | "soup" | "pizza" | "hot" | "cold" | "combo" | "platter";

export type DrinkTint = "coffee" | "tea" | "matcha" | "choc" | "lemon" | "mango" | "orange" | "melon" | "berry" | "strawberry" | "lime" | "cream";

export type FoodLook = { kind: FoodKind; tint?: DrinkTint };

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w));

function drinkTint(n: string): DrinkTint {
  if (has(n, "matcha")) return "matcha";
  if (has(n, "chocolate", "mocha", "mint")) return "choc";
  if (has(n, "tea")) return "tea";
  if (has(n, "lemonade", "lemon")) return "lemon";
  if (has(n, "green mango", "mojito", "cooler")) return n.includes("strawberry") ? "strawberry" : "lime";
  if (has(n, "mango")) return "mango";
  if (has(n, "orange")) return "orange";
  if (has(n, "watermelon")) return "melon";
  if (has(n, "blueberry")) return "berry";
  if (has(n, "strawberry")) return "strawberry";
  if (has(n, "cookies & cream", "frapp")) return "cream";
  return "coffee";
}

export function foodLook(name: string, category: string): FoodLook {
  const c = category.toLowerCase();
  // a day special is "main & dessert" — draw the main
  const n = (c.includes("special") && name.includes(" & ") ? name.split(" & ")[0] : name).toLowerCase();
  if (c.includes("combo") || n.includes(" + ")) {
    if (has(n, "burger", "fried chicken")) return { kind: "combo" };
    if (has(n, "coffee")) return { kind: "hot", tint: "coffee" };
  }
  if (has(c, "beverage", "tea", "shake", "frapp") || has(n, "latte", "americano", "espresso", "cappuccino", "smoothie", "juice", "lemonade", "cooler", "mojito", "hot chocolate", "coffee")) {
    const cold = has(n, "cold", "smoothie", "juice", "lemonade", "cooler", "mojito", "shake", "frapp", "ml)") || has(c, "shake", "frapp");
    return { kind: cold ? "cold" : "hot", tint: drinkTint(n) };
  }
  if (has(n, "biryani", "rice")) return { kind: "rice" };
  if (has(n, "burger", "slider", "sub bun")) return { kind: "burger" };
  if (has(n, "fries", "wedges")) return { kind: "fries" };
  if (has(n, "chicken drums", "wings", "fried chicken", "cheese ball")) return { kind: "chicken" };
  if (has(n, "pizza")) return { kind: "pizza" };
  if (has(n, "pasta", "linguine", "mac & cheese")) return { kind: "pasta" };
  if (has(n, "salad", "fruit")) return { kind: "salad" };
  if (has(n, "charcuterie", "platter", "grill")) return { kind: "platter" };
  if (has(n, "soup")) return { kind: "soup" };
  if (has(n, "waffle", "pancake", "omelette")) return { kind: "waffle" };
  if (has(n, "cookie")) return { kind: "cookie" };
  if (has(n, "cheesecake", "cheese cake")) return { kind: "cake", tint: "cream" };
  if (has(n, "basbousa", "gulab", "rasmalai", "kheer")) return { kind: "cake", tint: "mango" };
  if (has(n, "cake", "brownie", "mousse", "eclair", "mouldage", "fudge")) return { kind: "cake", tint: "choc" };
  if (has(n, "sandwich", "club", "focaccia", "quesadilla")) return { kind: "sandwich" };
  if (has(n, "wrap", "roll", "singara", "patty", "puff", "paratha", "dosa")) return { kind: "wrap" };
  if (has(n, "quiche", "pie", "jambon", "bake")) return { kind: "quiche" };
  if (has(n, "salmon", "fish", "prawn", "beef", "chicken", "steak")) return { kind: "main" };
  return { kind: "platter" };
}
