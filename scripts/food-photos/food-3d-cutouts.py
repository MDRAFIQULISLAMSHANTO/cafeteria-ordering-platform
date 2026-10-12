"""3D-style food images -> web cut-outs for the menu.

Source: analysis/3D food images (transparent PNGs the user supplied on
12 Oct 2026). Trims the empty border, splits the two collages into single
dishes, scales down (never up) and writes WebP with alpha to
public/menu/3d/. The product mapping lives in src/lib/food-photos.ts.

Run from the app root:  python scripts/food-photos/food-3d-cutouts.py
"""
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parents[2]
SRC = APP.parents[1] / "analysis" / "3D food images"
OUT = APP / "public" / "menu" / "3d"
MAX = 900

SINGLE = {
    "Crispy Sesame Chicken Burger.png": "chicken-burger",
    "Seeded Chicken Sub with Creamy Sauce.png": "chicken-sub",
    "hawks-focaccia-club-sandwich.png": "focaccia-club",
    "Toasted Chicken Salad Sandwich Triangles.png": "chicken-sandwich",
    "Grilled Chicken Shawarma Wrap Cutout.png": "chicken-wrap",
    "Golden Chicken Mushroom Gratin.png": "chicken-mushroom-bake",
    "ChatGPT Image Oct 12, 2026, 11_52_14 AM-1.png": "spinach-quiche",
    "ChatGPT Image Oct 12, 2026, 11_52_15 AM-2.png": "beef-patty",
    "ChatGPT Image Oct 12, 2026, 11_52_16 AM-3.png": "veg-quiche",
    "ChatGPT Image Oct 12, 2026, 11_52_17 AM-4.png": "chicken-drums",
    "Spinach and Chicken Quiche Slice.png": "chicken-spinach-quiche",
    "Mutton Biryani and Gulab Jamun Feast.png": "biryani-gulab-jamun",
    "Iced Coffee with Marbled Milk and Ice.png": "iced-latte",
    "Iced Caramel Latte with Ice and Straw-2.png": "iced-caramel-latte",
    "Decadent Chocolate Frappé with Whipped Cream.png": "chocolate-frappe",
    "Decadent Caramel Frappe with Whipped Cream.png": "caramel-frappe",
    "Strawberry Mint Mojito with Lime.png": "strawberry-mojito",
    "Mango Smoothie with Mint and Mango Cubes.png": "mango-smoothie",
    "Blueberry Mint Smoothie with Berries.png": "blueberry-smoothie",
    "Berry-Topped Cheesecake Slice.png": "berry-cheesecake",
    "Pistachio-Topped Golden Basbousa Slice.png": "basbousa",
    "Decadent Chocolate Banana Waffle.png": "banana-waffle",
    "Molten Chocolate Cake with Ice Cream-1.png": "chocolate-lava-cake",
    "Steaming Coffee Cup with Beans.png": "coffee-cup",
    "Latte Art with Biscotti and Beans.png": "latte-biscotti",
    "Decadent Chocolate Mocha Mug.png": "mocha",
    "Decadent Whipped Cream Hot Chocolate Mug.png": "hot-chocolate",
    "Strawberry Smoothie with Mint Garnish.png": "strawberry-smoothie",
    "Decadent Chocolate Brownie Sundae.png": "brownie-sundae",
}

# Collages: one dish per box (full-size pixels); the largest opaque region in
# the box is kept, so a neighbour's edge cannot leak in.
COLLAGES = {
    "Isolated Gourmet Favourites Collage-1.png": {
        "pasta": ((10, 505, 850, 985), None),
        "fries": ((850, 500, 1536, 1000), None),
    },
    "Quiche, Lasagna, Pasta, Salad and Fish Chips-2.png": {
        "caesar-salad": ((563, 528, 1028, 958), None),
        "fish-and-chips": ((1030, 500, 1536, 985), None),
        "lasagna": ((790, 20, 1515, 545), None),
    },
}


def trimmed(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())


def save(im: Image.Image, key: str) -> None:
    im = trimmed(im)
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    dest = OUT / f"{key}.webp"
    im.save(dest, "WEBP", quality=84, method=6)
    print(f"{key}: {im.size} {dest.stat().st_size // 1024} KB")


def largest_region(im: Image.Image) -> Image.Image:
    """Clear everything but the largest opaque region (on a 4x smaller mask)."""
    # solid pixels only: soft shadows would bridge neighbouring dishes
    small = im.getchannel("A").resize((max(1, im.width // 4), max(1, im.height // 4))).point(lambda a: 255 if a > 230 else 0)
    w, h = small.size
    px = small.load()
    label = [0] * (w * h)
    sizes = {}
    n = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] and not label[y * w + x]:
                n += 1
                stack = [(x, y)]
                label[y * w + x] = n
                count = 0
                while stack:
                    cx, cy = stack.pop()
                    count += 1
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not label[ny * w + nx]:
                            label[ny * w + nx] = n
                            stack.append((nx, ny))
                sizes[n] = count
    if not sizes:
        return im
    keep = max(sizes, key=sizes.get)
    mask = Image.new("L", (w, h))
    mask.putdata([255 if v == keep else 0 for v in label])
    from PIL import ImageFilter, ImageChops
    mask = mask.filter(ImageFilter.MaxFilter(5)).resize(im.size)
    out = im.copy()
    out.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    return out


def main(only_collages: bool = False) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, key in ({} if only_collages else SINGLE).items():
        save(Image.open(SRC / name), key)
    for name, boxes in COLLAGES.items():
        im = Image.open(SRC / name).convert("RGBA")
        for key, (box, _) in boxes.items():
            save(largest_region(im.crop(box)), key)


if __name__ == "__main__":
    import sys

    main(only_collages="--collages" in sys.argv)
