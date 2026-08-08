"""Pillow rendering backend — deterministic pixels."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from soldiom.models import DesignTokens, SceneDSL
from soldiom.renderer.arabic import draw_text_rtl, measure_wrapped_text, has_libraqm
from soldiom.renderer.base import RenderBackend as AbstractRenderBackend


def _hex(color: str) -> str:
    return color if color.startswith("#") else f"#{color}"


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


class PillowBackend(AbstractRenderBackend):
    name = "pillow"

    def render_text_block(
        self,
        text: str,
        *,
        direction: str = "ltr",
        language: str = "en",
        max_width: int,
        font_size: int,
    ) -> dict[str, Any]:
        img = Image.new("RGB", (max_width, 400), "#000000")
        draw = ImageDraw.Draw(img)
        font = _font(font_size)
        lines, height = measure_wrapped_text(
            draw, text, font, max_width, direction=direction, language=language
        )
        return {"lines": lines, "height": height, "font_size": font_size, "libraqm": has_libraqm()}

    def render_scene(
        self,
        scene: SceneDSL,
        tokens: DesignTokens,
        width: int,
        height: int,
        output: Path,
    ) -> str:
        bg = _hex(tokens.background)
        img = Image.new("RGB", (width, height), bg)
        draw = ImageDraw.Draw(img)
        margin = tokens.margin
        y = margin

        for el in scene.elements:
            text = el.text or el.value or el.caption or ""
            if not text:
                continue
            direction = el.direction
            language = "ar" if direction == "rtl" else "en"
            font_size = 72 if el.type == "headline" else 42
            font = _font(font_size)
            max_w = width - margin * 2
            lines, block_h = measure_wrapped_text(
                draw, text, font, max_w, direction=direction, language=language
            )
            anchor = "ra" if el.align == "right" else ("ma" if el.align == "center" else "la")
            x = width - margin if el.align == "right" else (width // 2 if el.align == "center" else margin)
            for line in lines:
                draw_text_rtl(
                    draw,
                    (x, y),
                    line,
                    font,
                    _hex(tokens.text_primary),
                    direction=direction,
                    language=language,
                    anchor=anchor,
                )
                y += int(block_h / max(len(lines), 1)) + 12
            y += 24

        output.parent.mkdir(parents=True, exist_ok=True)
        img.save(output, format="PNG")
        return str(output)


def get_renderer(name: str = "pillow") -> AbstractRenderBackend:
    if name == "pillow":
        return PillowBackend()
    return PillowBackend()
