from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "packaging" / "icons"
ICONSET_DIR = ICON_DIR / "app-icon.iconset"
PNG_PATH = ICON_DIR / "app-icon-1024.png"
ICNS_PATH = ICON_DIR / "app-icon.icns"
ICO_PATH = ICON_DIR / "app-icon.ico"

ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024]


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    pixels = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(size):
            pixels[x, y] = (*color, 255)
    return img


def make_icon(size: int = 1024) -> Image.Image:
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    margin = round(size * 0.07)
    radius = round(size * 0.22)
    shadow_draw.rounded_rectangle(
        (margin, margin + round(size * 0.025), size - margin, size - margin + round(size * 0.025)),
        radius=radius,
        fill=(0, 0, 0, 120),
    )
    icon.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(round(size * 0.035))))

    body = gradient(size, (10, 18, 34), (24, 43, 72))
    body_mask = rounded_rect_mask(size - margin * 2, radius)
    body_crop = body.crop((margin, margin, size - margin, size - margin))
    icon.paste(body_crop, (margin, margin), body_mask)

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (round(size * 0.05), round(size * -0.04), round(size * 0.62), round(size * 0.48)),
        fill=(56, 189, 248, 72),
    )
    glow_draw.ellipse(
        (round(size * 0.38), round(size * 0.4), round(size * 1.06), round(size * 1.05)),
        fill=(52, 211, 153, 58),
    )
    glow_draw.ellipse(
        (round(size * 0.3), round(size * 0.16), round(size * 0.95), round(size * 0.78)),
        fill=(124, 58, 237, 70),
    )
    icon.alpha_composite(glow.filter(ImageFilter.GaussianBlur(round(size * 0.04))))

    draw = ImageDraw.Draw(icon)
    inset = round(size * 0.15)
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=round(size * 0.15),
        outline=(125, 211, 252, 70),
        width=max(2, round(size * 0.01)),
    )

    stroke = max(18, round(size * 0.075))
    points = [
        (round(size * 0.22), round(size * 0.29)),
        (round(size * 0.36), round(size * 0.71)),
        (round(size * 0.5), round(size * 0.43)),
        (round(size * 0.64), round(size * 0.71)),
        (round(size * 0.78), round(size * 0.29)),
    ]
    for width, color in (
        (stroke + round(size * 0.035), (15, 23, 42, 155)),
        (stroke, (103, 232, 249, 255)),
        (round(stroke * 0.58), (52, 211, 153, 255)),
    ):
        draw.line(points, fill=color, width=width, joint="curve")

    draw.arc(
        (round(size * 0.25), round(size * 0.19), round(size * 0.75), round(size * 0.47)),
        start=205,
        end=335,
        fill=(248, 250, 252, 155),
        width=max(3, round(size * 0.012)),
    )
    center = (round(size * 0.5), round(size * 0.45))
    dot = round(size * 0.038)
    draw.ellipse(
        (center[0] - dot, center[1] - dot, center[0] + dot, center[1] + dot),
        fill=(248, 250, 252, 245),
    )
    return icon


def save_iconset(source: Image.Image) -> None:
    ICONSET_DIR.mkdir(parents=True, exist_ok=True)
    for size in [16, 32, 128, 256, 512]:
        source.resize((size, size), Image.Resampling.LANCZOS).save(ICONSET_DIR / f"icon_{size}x{size}.png")
        source.resize((size * 2, size * 2), Image.Resampling.LANCZOS).save(ICONSET_DIR / f"icon_{size}x{size}@2x.png")


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    icon = make_icon()
    icon.save(PNG_PATH)
    save_iconset(icon)
    subprocess.run(["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(ICNS_PATH)], check=True)
    ico_images = [icon.resize((size, size), Image.Resampling.LANCZOS) for size in ICON_SIZES]
    ico_images[-1].save(ICO_PATH, sizes=[(size, size) for size in ICON_SIZES], append_images=ico_images[:-1])
    print(f"Generated {ICNS_PATH}")
    print(f"Generated {ICO_PATH}")


if __name__ == "__main__":
    main()
