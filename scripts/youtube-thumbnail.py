#!/usr/bin/env python3
"""YouTube thumbnail (1280x720 JPG) for YouTube 16:9 videos.

Run inside MoneyPrinterTurbo's venv (it ships Pillow):
  uv run python youtube-thumbnail.py --frame f.jpg --text "Snake dreams" --out t.jpg --font BeVietnamPro-Bold.ttf
"""

from __future__ import annotations

import argparse
import textwrap

from PIL import Image, ImageDraw, ImageFont, ImageOps

WIDTH, HEIGHT = 1280, 720
MARGIN = 72


def fit_text(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_width: int, max_height: int):
    """Largest font size (and wrapped lines) whose block fits the text area."""
    for size in range(150, 47, -4):
        font = ImageFont.truetype(font_path, size)
        for width_chars in (10, 12, 14, 16, 20):
            lines = textwrap.wrap(text, width=width_chars) or [text]
            if len(lines) > 3:
                continue
            boxes = [draw.textbbox((0, 0), line, font=font, stroke_width=max(2, size // 18)) for line in lines]
            block_width = max(box[2] - box[0] for box in boxes)
            line_height = max(box[3] - box[1] for box in boxes)
            block_height = int(line_height * 1.12 * len(lines))
            if block_width <= max_width and block_height <= max_height:
                return font, lines, line_height
    font = ImageFont.truetype(font_path, 48)
    return font, textwrap.wrap(text, width=20)[:3], 56


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frame", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--font", required=True)
    parser.add_argument("--brand", default="dreamly.art")
    args = parser.parse_args()

    image = ImageOps.fit(Image.open(args.frame).convert("RGB"), (WIDTH, HEIGHT), Image.LANCZOS)
    # Left-to-right dark gradient so white text reads on any footage.
    shade = Image.new("L", (WIDTH, 1))
    for x in range(WIDTH):
        shade.putpixel((x, 0), int(205 * max(0.0, 1 - x / (WIDTH * 0.8))))
    overlay = Image.new("RGB", (WIDTH, HEIGHT), (8, 6, 20))
    image = Image.composite(overlay, image, shade.resize((WIDTH, HEIGHT)))

    draw = ImageDraw.Draw(image)
    text = " ".join(args.text.upper().split())
    font, lines, line_height = fit_text(draw, text, args.font, int(WIDTH * 0.62), int(HEIGHT * 0.62))
    stroke = max(2, font.size // 18)
    y = (HEIGHT - int(line_height * 1.12 * len(lines))) // 2
    for index, line in enumerate(lines):
        # Last line in the brand accent so the eye lands on the key word.
        fill = (255, 214, 102) if index == len(lines) - 1 and len(lines) > 1 else (255, 255, 255)
        draw.text((MARGIN, y), line, font=font, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))
        y += int(line_height * 1.12)

    brand_font = ImageFont.truetype(args.font, 34)
    draw.text((MARGIN, HEIGHT - MARGIN - 20), args.brand, font=brand_font, fill=(230, 222, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    image.save(args.out, "JPEG", quality=90, optimize=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
