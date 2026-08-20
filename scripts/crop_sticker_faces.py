"""Crop the 16 glossy face emojis from the first two rows of the icon sheet."""
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\Siddhant Bhagat\AppData\Roaming\Cursor\User\workspaceStorage"
    r"\2ff527cf94ee206b4008e922620f4353\images"
    r"\7d8b7f7e-918e-423c-a58d-51145e0cff4f-02fcb276-6ce0-4297-8155-97b97fb0f70b.png"
)
OUT = Path(r"d:\Resume projects\Diary\mobile\assets\images\sticker-faces")
REPO = Path(r"d:\Resume projects\Diary\assets\sticker-faces")
OUT.mkdir(parents=True, exist_ok=True)
REPO.mkdir(parents=True, exist_ok=True)

NAMES = [
    "grin-closed",
    "grin-open",
    "calm",
    "sleepy",
    "sad",
    "crying",
    "angry",
    "heart-eyes",
    "thinking",
    "cool",
    "party",
    "halo",
    "wink",
    "wink-tongue",
    "star-eyes",
    "hearts",
]

im = Image.open(SRC).convert("RGBA")
arr = np.asarray(im)
h, w = arr.shape[:2]
print("size", w, h)

# Black sheet: content is non-black
rgb = arr[:, :, :3].astype(np.int16)
bright = rgb.max(axis=2)
content = bright > 28

col_frac = content.mean(axis=0)
row_frac = content.mean(axis=1)


def bands(mask_1d: np.ndarray, min_len: int = 40):
    out = []
    in_run = False
    start = 0
    for i, on in enumerate(mask_1d):
        if on and not in_run:
            start = i
            in_run = True
        elif (not on) and in_run:
            if i - start >= min_len:
                out.append((start, i - 1))
            in_run = False
    if in_run and len(mask_1d) - start >= min_len:
        out.append((start, len(mask_1d) - 1))
    return out


col_bands = bands(col_frac > 0.02, min_len=40)
row_bands = bands(row_frac > 0.02, min_len=40)
print("cols", len(col_bands), col_bands)
print("rows", len(row_bands), [(a, b, b - a) for a, b in row_bands])

assert len(col_bands) == 8, col_bands
assert len(row_bands) >= 2, row_bands


def extract(cell: Image.Image) -> Image.Image:
    a = np.asarray(cell.convert("RGBA")).copy()
    br = a[:, :, :3].max(axis=2)
    # black -> transparent
    a[br <= 22, 3] = 0
    fringe = (br > 22) & (br < 40)
    a[fringe, 3] = np.clip((br[fringe] - 22) / 18.0 * 255, 0, 255).astype(np.uint8)
    face = Image.fromarray(a, "RGBA")
    ys, xs = np.where(a[:, :, 3] > 20)
    if len(xs) == 0:
        return face
    pad = 6
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(face.size[0], int(xs.max()) + 1 + pad)
    y1 = min(face.size[1], int(ys.max()) + 1 + pad)
    cropped = face.crop((x0, y0, x1, y1))
    fw, fh = cropped.size
    side = max(fw, fh)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - fw) // 2, (side - fh) // 2), cropped)
    return canvas.resize((192, 192), Image.Resampling.LANCZOS)


idx = 0
for r0, r1 in row_bands[:2]:
    for c0, c1 in col_bands:
        left = max(0, c0 - 4)
        upper = max(0, r0 - 4)
        right = min(w, c1 + 5)
        lower = min(h, r1 + 5)
        cell = im.crop((left, upper, right, lower))
        face = extract(cell)
        name = f"face-{idx + 1:02d}-{NAMES[idx]}.png"
        face.save(OUT / name)
        face.save(REPO / name)
        print(idx + 1, name, "cell", (right - left, lower - upper))
        idx += 1

print("done", OUT)
