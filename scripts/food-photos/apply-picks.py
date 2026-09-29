"""Apply hand-reviewed Wikimedia Commons picks to the menu (29 Sep 2026).

Each menu item gets its own photo (no photo is shared by two items). For
every pick this downloads the 1280 px rendition, records author / licence /
source for /photo-credits, writes public/menu/online/<key>.webp, updates
src/lib/menu-photo-map.json, and drops photos and credits no item uses.

Run from the app folder:  python scripts/food-photos/apply-picks.py
"""
import html
import io
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parent.parent.parent
UA = {"User-Agent": "STS-cafeteria-prototype/1.0 (Invento; menu photos with attribution)"}
MAP = APP / "src/lib/menu-photo-map.json"
CREDITS = APP / "src/lib/menu-photo-credits.json"
OUT = APP / "public/menu/online"
CATALOG = APP / "src/db/data/menu-catalog.json"

# (menu, item name) -> (photo key, Commons file title, optional crop as fractions l,t,r,b)
PICKS = [
    ("menu-b", "Chicken & Mushroom Quiche", "mushroom-leek-quiche", "File:Mushroom and leek quiche.jpg", None),
    ("menu-b", "Chicken & Spinach Quiche", "spinach-quiche-whole", "File:2020-10-09 23 12 39 Wide view of a ShopRite Vegetarian Spinach Mushroom Cheese Quiche in Rochelle Park Township, Bergen County, New Jersey.jpg", None),
    ("menu-b", "Mixed Veg Quiche", "mini-veg-quiches", "File:Mini mushroom and cheddar quiches, 2007.jpg", None),
    ("menu-b", "Sandwich of the Day - Chicken & Spinach Quiche", "chicken-puff-pockets", None, None),
    ("menu-b", "Asparagus and Chicken Fillet Puff", "chicken-puffs", "File:Chicken puffs from Thiruvananthapuram.jpg", None),
    ("menu-b", "Chocolate Mud Cake", "chocolate-mud-cake", "File:Slice of chocolate cake at the office.jpg", None),
    ("menu-a", "Chicken Supreme Burger", "crispy-chicken-burger", "File:Fried chicken Burger in Milan, Italy.jpg", None),
    ("menu-a", "Chicken Burger + Fries + Lemonade", "chicken-burger-fries-set", "File:Crispy Chicken Burger & French Fry Set.jpg", None),
    ("menu-a", "Cheese Ball (4 Pcs)", "cheese-balls", "File:Malakoff.jpeg", None),
    ("menu-b", "Slider Duo", "slider-trio-fries", "File:Kai Mini Burger Trio (3169045549).jpg", None),
    ("menu-a", "Chicken and Mushroom Bake", "chicken-mushroom-pie", None, (0.44, 0.0, 1.0, 0.58)),
    ("menu-a", "Chicken Mayo Sandwich", "chicken-salad-sandwich", "File:Chicken salad sandwich with gribenes and pickles.jpg", None),
    ("menu-a", "Jaggery Oat Cookies (2 Pcs)", "oatmeal-raisin-cookies", None, None),
    ("menu-b", "Oats & Chocolate Chip Cookies", "oatmeal-cookies-plate", "File:Oatmeal cookies on a plate.jpg", None),
    ("menu-b", "Caesar Wraps", "chicken-caesar-wrap", None, None),
    ("menu-a", "Fried Chicken + Potato Wedges + Cold Coffee", "chicken-leg-fries-meal", "File:Benny&Co Chicken Leg with Fries Meal.jpg", None),
    ("menu-a", "Crispy Chicken Drums", "fried-drumsticks", "File:Fried chicken drumsticks.jpg", None),
    ("menu-a", "Singara + Coffee (Nescafe)", "tea-with-samosa", "File:Tea with Samosa 2.jpg", None),
    ("menu-b", "Hawaiian Quiche", "quiche-lorraine", "File:Quiche lorraine 04.jpg", None),
    ("menu-a", "Hawks Focaccia Club Sandwich", "focaccia-sandwich", None, None),
    ("menu-a", "Baked Cheese Cake", "baked-cheesecake-berries", "File:Baked cheesecake with raspberries and blueberries.jpg", None),
    ("menu-b", "Cookies (per kg)", "assorted-cookies", "File:Assorted cookies in a box at a party.jpg", None),
    ("menu-a", "Hazelnut Latte", "latte-mug", "File:Renmark Hotel 20250717-123802.jpg", None),
    ("menu-a", "Caramel Latte", "caramel-latte-art", None, None),
    ("menu-b", "Flavored Latte", "vanilla-iced-latte", None, None),
    ("menu-b", "Latte", "latte-art-cup", "File:Latte art.jpg", None),
    ("menu-b", "Cappuccino", "cappuccino-latte-art", None, None),
    ("menu-b", "Mocha", "mocha-latte-art", None, None),
    ("menu-b", "Hot/Cold Chocolate", "iced-chocolate", None, None),
    ("menu-b", "Famous Cottage Pie", "shepherds-pie", None, None),
    ("menu-b", "Coffee", "black-coffee", "File:A small cup of coffee.JPG", None),
    ("menu-b", "Americano", "americano-glass-cup", None, None),
    ("menu-b", "Chocolate Mint", "mint-chocolate-milkshake", "File:A Milkshake with Mint Chocolate.jpg", None),
    ("menu-b", "Chocolate Mango Shake", "mango-milkshake", "File:Mango milkshake.jpg", None),
    ("menu-b", "Fish of the Day", "fried-whole-fish", "File:Fried whole fish.jpg", None),
]


def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(10 * (i + 1))


def clean(text):
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def info(title):
    params = urllib.parse.urlencode({
        "action": "query", "titles": title, "prop": "imageinfo",
        "iiprop": "url|extmetadata|size", "iiurlwidth": "1280", "format": "json",
    })
    page = next(iter(json.loads(get("https://commons.wikimedia.org/w/api.php?" + params))["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"Not found on Commons: {title}")
    return page["title"], page["imageinfo"][0]


def main(titles):
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["products"]
    by_name = {(p["menu"], p["name"]): p["id"] for p in catalog}
    photo_map = json.loads(MAP.read_text(encoding="utf-8"))
    credits = {c["key"]: c for c in json.loads(CREDITS.read_text(encoding="utf-8"))}

    for menu, name, key, title, crop in PICKS:
        pid = by_name.get((menu, name))
        if not pid:
            raise SystemExit(f"No product {menu} / {name}")
        title = title or titles[key]
        real_title, ii = info(title)
        img = Image.open(io.BytesIO(get(ii["thumburl"]))).convert("RGB")
        if crop:
            w, h = img.size
            img = img.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        img.thumbnail((1280, 1280))
        img.save(OUT / f"{key}.webp", "WEBP", quality=82, method=6)
        meta = ii.get("extmetadata") or {}
        credits[key] = {
            "key": key,
            "title": real_title.removeprefix("File:"),
            "author": clean((meta.get("Artist") or {}).get("value")) or "Unknown",
            "source": ii["descriptionurl"],
            "license": clean((meta.get("LicenseShortName") or {}).get("value")),
            "licenseUrl": (meta.get("LicenseUrl") or {}).get("value", ""),
            "file": f"/menu/online/{key}.webp",
            "width": img.width,
            "height": img.height,
            "changes": ("Cropped, resized and converted to WebP." if crop else "Resized and converted to WebP; cropped to fit menu cards.") + " No AI generation or enlargement.",
        }
        photo_map[pid] = [f"/menu/online/{key}.webp"]
        print(f"{pid:12} {name[:40]:40} <- {real_title[5:70]}")
        time.sleep(1.5)

    # one photo per item: fail loudly if any file is still shared
    seen = {}
    for pid, files in photo_map.items():
        for f in files:
            seen.setdefault(f, []).append(pid)
    shared = {f: ids for f, ids in seen.items() if len(ids) > 1}
    if shared:
        raise SystemExit(f"Still shared: {shared}")

    used = set(seen)
    kept = [c for c in credits.values() if c["file"] in used]
    for f in OUT.glob("*.webp"):
        if f"/menu/online/{f.name}" not in used:
            f.unlink()
            print("removed unused", f.name)
    MAP.write_text(json.dumps(dict(sorted(photo_map.items())), indent=2) + "\n", encoding="utf-8")
    CREDITS.write_text(json.dumps(sorted(kept, key=lambda c: c["key"]), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(photo_map)} items, {len(used)} unique photos, {len(kept)} credits")


if __name__ == "__main__":
    import sys
    main(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")) if len(sys.argv) > 1 else {})
