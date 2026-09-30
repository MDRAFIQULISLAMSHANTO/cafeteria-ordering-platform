"""S Cafe's own food cut-outs and logo -> web assets.

Source: analysis/Selected Foods for web animation (transparent PNGs supplied
by the client). Trims the empty border, scales down (never up) and writes
WebP with alpha to public/menu/scafe/, plus the logo to public/branding/.

Run from the app root:  python scripts/food-photos/scafe-cutouts.py
"""
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parents[2]
SRC = APP.parents[1] / "analysis" / "Selected Foods for web animation"
OUT = APP / "public" / "menu" / "scafe"

FOODS = {
    "Brownie-transparent.png": "brownie",
    "Burger-3-transparent-image.png": "beef-burger",
    "Cafe-latte-coffee-cup-transparent-image.png": "cafe-latte",
    "Honey-Glazed-Chicken-top-view-transparent-image.png": "honey-glazed-chicken",
    "Kabab-and-Parata_05A1551.png": "kebab-paratha",
    "kabab-food-transparent-image.png": "seekh-kebab",
    "Loaded-Beef-Nachos-delicious-food-transparent-image.png": "loaded-beef-nachos",
    "Tandoori-chicken-transparent-image.png": "tandoori-chicken",
    "red-velvet-cake-slice-pastry-transparent-image.png": "red-velvet-cake",
}
MAX = 900


def trimmed(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, key in FOODS.items():
        im = trimmed(SRC / name)
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        dest = OUT / f"{key}.webp"
        im.save(dest, "WEBP", quality=84, method=6)
        print(f"{key}: {im.size} {dest.stat().st_size // 1024} KB")

    logo = trimmed(SRC / "S-cafe-logo-Transparent-image.png")
    for width, suffix in ((480, ""), (192, "-sm")):
        copy = logo.copy()
        copy.thumbnail((width, width), Image.LANCZOS)
        dest = APP / "public" / "branding" / f"scafe-logo{suffix}.png"
        copy.save(dest, optimize=True)
        print(f"logo{suffix}: {copy.size} {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
