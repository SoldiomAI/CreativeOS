"""Arabic typography — RTL via Pillow direction=rtl when libraqm available."""

from __future__ import annotations

import os
from typing import Any

from PIL import ImageFont


def has_libraqm() -> bool:
    try:
        from PIL import features  # type: ignore

        return bool(features.check("raqm"))
    except Exception:
        return False


def draw_text_rtl(
    draw: Any,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
    *,
    direction: str = "ltr",
    language: str = "en",
    anchor: str = "la",
) -> None:
    """Use direction='rtl' explicitly (libraqm/FriBiDi/HarfBuzz), not anchor alone."""
    kwargs: dict[str, Any] = {
        "xy": xy,
        "text": text,
        "font": font,
        "fill": fill,
        "anchor": anchor,
    }
    if direction == "rtl" and has_libraqm():
        kwargs["direction"] = "rtl"
        kwargs["language"] = language
    draw.text(**kwargs)


def measure_wrapped_text(
    draw: Any,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: int,
    *,
    direction: str = "ltr",
    language: str = "en",
) -> tuple[list[str], int]:
    """Word-wrap with shaped-text measurement for Arabic."""
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        bbox = draw.textbbox(
            (0, 0),
            trial,
            font=font,
            direction="rtl" if direction == "rtl" and has_libraqm() else None,
            language=language if direction == "rtl" and has_libraqm() else None,
        )
        w = bbox[2] - bbox[0]
        if w <= max_width or not current:
            current.append(word)
        else:
            lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    line_h = draw.textbbox((0, 0), "Ay", font=font)[3]
    return lines, line_h * max(len(lines), 1)
