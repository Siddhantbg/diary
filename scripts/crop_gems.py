"""
Segment each gem via connected components and export with ONLY that
component's pixels (no neighbor bleed).
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\Siddhant Bhagat\.cursor\projects\d-Resume-projects-Diary\assets"
    r"\c__Users_Siddhant_Bhagat_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"2ff527cf94ee206b4008e922620f4353_images_image-6f0e2687-d663-42fd-a3e5-a2a8f27af10a.png"
)
OUT = Path(r"d:\Resume projects\Diary\mobile\assets\images\gems")
REPO = Path(r"d:\Resume projects\Diary\assets\gems")
OUT.mkdir(parents=True, exist_ok=True)
REPO.mkdir(parents=True, exist_ok=True)

NAMES = [
    "amethyst-emerald",
    "sky-octagon",
    "citrine-kite",
    "amber-octagon",
    "seafoam-oval",
    "sapphire-star",
    "lime-trilliant",
    "rust-octagon",
    "cobalt-pentagon",
    "lilac-spike",
    "rose-oval",
    "gold-needle",
    "aqua-shield",
    "tangerine-diamond",
    "lavender-oval",
    "fire-starburst",
    "jade-pear",
    "teal-hex",
]

im = Image.open(SRC).convert("RGBA")
rgb = np.asarray(im.convert("RGB"))
rgba_full = np.asarray(im)
h, w, _ = rgb.shape
bright = rgb.mean(axis=2)
mask = bright < 248


def dilate(m: np.ndarray, r: int = 1) -> np.ndarray:
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx == 0 and dy == 0:
                continue
            shifted = np.zeros_like(m)
            y0, y1 = max(0, dy), h + min(0, dy)
            x0, x1 = max(0, dx), w + min(0, dx)
            shifted[y0:y1, x0:x1] = m[y0 - dy : y1 - dy, x0 - dx : x1 - dx]
            out |= shifted
    return out


def erode(m: np.ndarray, r: int = 1) -> np.ndarray:
    return ~dilate(~m, r)


# Tiny close so thin facet cracks don't split one gem into pieces
closed = erode(dilate(mask, 1), 1)

visited = np.zeros((h, w), dtype=bool)
labels = np.zeros((h, w), dtype=np.int32)
components = []
label_id = 0

ys, xs = np.where(closed)
for y, x in zip(ys.tolist(), xs.tolist()):
    if visited[y, x]:
        continue
    label_id += 1
    q = deque([(y, x)])
    visited[y, x] = True
    pixels = []
    minx = maxx = x
    miny = maxy = y
    while q:
        cy, cx = q.popleft()
        pixels.append((cy, cx))
        labels[cy, cx] = label_id
        minx = min(minx, cx)
        maxx = max(maxx, cx)
        miny = min(miny, cy)
        maxy = max(maxy, cy)
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and closed[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))
    area = len(pixels)
    if area < 180:
        continue
    bw = maxx - minx + 1
    bh = maxy - miny + 1
    if bw < 8 or bh < 12:
        continue
    components.append(
        {
            "id": label_id,
            "area": area,
            "bbox": (minx, miny, maxx, maxy),
            "cx": (minx + maxx) / 2,
            "cy": (miny + maxy) / 2,
        }
    )

components.sort(key=lambda c: -c["area"])
selected = []
for c in components:
    if len(selected) >= 18:
        break
    if any(abs(c["cx"] - s["cx"]) < 28 and abs(c["cy"] - s["cy"]) < 28 for s in selected):
        continue
    selected.append(c)

assert len(selected) == 18, f"expected 18, got {len(selected)}"


def assign_rows(items):
    items = sorted(items, key=lambda c: c["cy"])
    gaps = [(items[i + 1]["cy"] - items[i]["cy"], i) for i in range(len(items) - 1)]
    gaps.sort(reverse=True)
    cuts = sorted([gaps[0][1], gaps[1][1]])
    return [
        items[: cuts[0] + 1],
        items[cuts[0] + 1 : cuts[1] + 1],
        items[cuts[1] + 1 :],
    ]


rows = assign_rows(selected)
for r in rows:
    r.sort(key=lambda c: c["cx"])
ordered = [c for r in rows for c in r]
assert all(len(r) == 6 for r in rows), [len(r) for r in rows]


def export_gem(comp, index: int):
    lid = comp["id"]
    minx, miny, maxx, maxy = comp["bbox"]
    pad = 10
    x0 = max(0, minx - pad)
    y0 = max(0, miny - pad)
    x1 = min(w, maxx + 1 + pad)
    y1 = min(h, maxy + 1 + pad)

    crop = rgba_full[y0:y1, x0:x1].copy()
    lab = labels[y0:y1, x0:x1]
    own = lab == lid

    # Soft fringe: near-white pixels adjacent to this gem only
    own_dilated = own.copy()
    ch_, cw_ = own.shape
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            shifted = np.zeros_like(own)
            yy0, yy1 = max(0, dy), ch_ + min(0, dy)
            xx0, xx1 = max(0, dx), cw_ + min(0, dx)
            shifted[yy0:yy1, xx0:xx1] = own[yy0 - dy : yy1 - dy, xx0 - dx : xx1 - dx]
            own_dilated |= shifted

    local_bright = bright[y0:y1, x0:x1]
    alpha = np.zeros(own.shape, dtype=np.uint8)
    alpha[own] = 255
    # fringe only where NOT another gem's label
    fringe = own_dilated & (~own) & (lab == 0) & (local_bright < 252)
    alpha[fringe] = np.clip(((252 - local_bright[fringe]) / 12.0 * 200), 0, 200).astype(
        np.uint8
    )
    crop[:, :, 3] = alpha

    # Force RGB of fully transparent pixels to 0 (cleaner)
    crop[alpha == 0, :3] = 0

    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        raise RuntimeError(f"empty gem {index}")
    tpad = 6
    tx0 = max(0, int(xs.min()) - tpad)
    ty0 = max(0, int(ys.min()) - tpad)
    tx1 = min(crop.shape[1], int(xs.max()) + 1 + tpad)
    ty1 = min(crop.shape[0], int(ys.max()) + 1 + tpad)
    crop = crop[ty0:ty1, tx0:tx1]

    gem = Image.fromarray(crop, "RGBA")
    gw, gh = gem.size
    side = max(gw, gh)
    margin = max(12, side // 8)
    canvas_side = side + margin * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    canvas.paste(gem, ((canvas_side - gw) // 2, (canvas_side - gh) // 2), gem)
    out = canvas.resize((180, 180), Image.Resampling.LANCZOS)

    name = f"gem-{index:02d}-{NAMES[index - 1]}.png"
    out.save(OUT / name)
    out.save(REPO / name)
    print(index, name, f"{gw}x{gh}")


for p in list(OUT.glob("gem-*.png")) + list(REPO.glob("gem-*.png")):
    p.unlink(missing_ok=True)

for i, comp in enumerate(ordered, start=1):
    export_gem(comp, i)

print("done — 18 isolated gems")
