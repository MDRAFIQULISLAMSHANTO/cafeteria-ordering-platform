"""Cut the food photos out of STS's own files into public/menu/photos/*.webp.

Run from the app folder:  python scripts/food-photos/crop.py
Crops stay at their native size (no upscaling); WebP quality 88.
"""
import json
from pathlib import Path
from PIL import Image

here = Path(__file__).parent
app = here.parent.parent
cfg = json.loads((here / "crops.json").read_text(encoding="utf-8"))
out_dir = app / "public" / "menu" / "photos"
out_dir.mkdir(parents=True, exist_ok=True)
for c in cfg["crops"]:
    src = (app / cfg["sources"][c["src"]]).resolve()
    im = Image.open(src).convert("RGB").crop(tuple(c["box"]))
    im.save(out_dir / f'{c["out"]}.webp', "WEBP", quality=88, method=6)
    print(c["out"], im.size)
