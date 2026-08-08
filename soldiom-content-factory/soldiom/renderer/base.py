"""Renderer abstraction — same storyboard, multiple backends (Pillow today, SVG/HTML later)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from soldiom.models import DesignTokens, SceneDSL


class RenderBackend(ABC):
    name: str = "base"

    @abstractmethod
    def render_scene(
        self,
        scene: SceneDSL,
        tokens: DesignTokens,
        width: int,
        height: int,
        output: Path,
    ) -> str:
        ...

    @abstractmethod
    def render_text_block(
        self,
        text: str,
        *,
        direction: str = "ltr",
        language: str = "en",
        max_width: int,
        font_size: int,
    ) -> dict[str, Any]:
        ...
