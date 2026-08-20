"""Re-crop mood faces cleanly from the grid sheet (no edge clipping)."""
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\Siddhant Bhagat\.cursor\projects\d-Resume-projects-Diary\assets"
    r"\c__Users_Siddhant_Bhagat_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"2ff527cf94ee206b4008e922620f4353_images_image-7ae16cb2-7ca5-4ae4-a5b9-73bd5436160f.png"
)
OUT = Path(r"d:\Resume projects\Diary\mobile\assets\images\moods")
REPO = Path(r"d:\Resume projects\Diary\assets\moods")
OUT.mkdir(parents=True, exist_ok=True)
REPO.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
arr = np.asarray(im.convert("RGB"))
h, w, _ = arr.shape
bright = arr.mean(axis=2)
# near-white background
bg = bright >= 242


def bands_from_mask(mask_1d: np.ndarray, min_len: int = 40):
    """Find contiguous content runs (False=content) separated by gaps (True)."""
    bands = []
    in_run = False
    start = 0
    for i, is_gap in enumerate(mask_1d):
        if (not is_gap) and not in_run:
            start = i
            in_run = True
        elif is_gap and in_run:
            if i - start >= min_len:
                bands.append((start, i - 1))
            in_run = False
    if in_run and len(mask_1d) - start >= min_len:
        bands.append((start, len(mask_1d) - 1))
    # Drop trailing fragments that overlap a previous band
    cleaned = []
    for b in bands:
        if cleaned and b[0] <= cleaned[-1][1]:
            continue
        cleaned.append(b)
    return cleaned


# Column/row occupancy: a line is "gap" if almost all pixels are bg
col_bg_frac = bg.mean(axis=0)
row_bg_frac = bg.mean(axis=1)
col_is_gap = col_bg_frac > 0.85
row_is_gap = row_bg_frac > 0.85

col_bands = bands_from_mask(col_is_gap, min_len=60)[:5]
row_bands = bands_from_mask(row_is_gap, min_len=60)[:4]
print("cols", len(col_bands), col_bands)
print("rows", len(row_bands), row_bands)

assert len(col_bands) == 5, col_bands
assert len(row_bands) == 4, row_bands


def extract_face(cell: Image.Image) -> Image.Image:
    """Trim to colored tile, keep full rounded square, pad to even square."""
    rgba = cell.convert("RGBA")
    a = np.asarray(rgba)
    rgb = a[:, :, :3]
    br = rgb.mean(axis=2)
    content = br < 242
    ys, xs = np.where(content)
    if len(xs) == 0:
        return rgba
    # expand a few px so rounded corners aren't shaved
    pad = 3
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(rgba.size[0], int(xs.max()) + 1 + pad)
    y1 = min(rgba.size[1], int(ys.max()) + 1 + pad)
    cropped = rgba.crop((x0, y0, x1, y1))

    # Make background transparent outside the soft tile (keep anti-alias)
    c = np.asarray(cropped).copy()
    br2 = c[:, :, :3].mean(axis=2)
    # white-ish -> transparent
    white = br2 >= 245
    c[white, 3] = 0
    # near-white fringe: soften alpha
    fringe = (br2 >= 235) & (br2 < 245)
    c[fringe, 3] = np.clip(((245 - br2[fringe]) / 10.0 * 255), 0, 255).astype(np.uint8)
    face = Image.fromarray(c, "RGBA")

    # Center on square with small breathing margin
    fw, fh = face.size
    side = max(fw, fh)
    margin = max(4, side // 24)
    canvas_side = side + margin * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    ox = (canvas_side - fw) // 2
    oy = (canvas_side - fh) // 2
    canvas.paste(face, (ox, oy), face)
    return canvas.resize((192, 192), Image.Resampling.LANCZOS)


idx = 0
for r0, r1 in row_bands:
    for c0, c1 in col_bands:
        idx += 1
        # Expand slightly so soft rounded corners aren't cut by band detection
        left = max(0, c0 - 2)
        upper = max(0, r0 - 2)
        right = min(w, c1 + 3)
        lower = min(h, r1 + 3)
        cell = im.crop((left, upper, right, lower))
        face = extract_face(cell)
        name = f"mood-face-{idx:02d}.png"
        face.save(OUT / name)
        face.save(REPO / name)
        print(idx, name, "cell", (right - left, lower - upper), "ok")

print("done", OUT)
