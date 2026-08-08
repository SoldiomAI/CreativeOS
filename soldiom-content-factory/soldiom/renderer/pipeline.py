"""Timeline compiler + frame/carousel rendering."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from soldiom.models import DesignTokens, SceneDSL, StoryboardScene
from soldiom.renderer.pillow_backend import get_renderer

RESOLUTIONS = {
    "reel": (1080, 1920),
    "portrait": (1080, 1350),
    "square": (1080, 1080),
    "landscape": (1920, 1080),
    "story": (1080, 1920),
    "preview": (540, 960),
}


def compile_timeline(
    storyboard: list[StoryboardScene],
    tokens: DesignTokens,
    fps: int = 24,
) -> dict[str, Any]:
    frames: list[dict[str, Any]] = []
    for scene in storyboard:
        start_frame = int(scene.start * fps)
        end_frame = int(scene.end * fps)
        frames.append(
            {
                "scene": scene.scene,
                "start_frame": start_frame,
                "end_frame": end_frame,
                "animation": scene.animation,
                "headline": scene.headline,
            }
        )
    return {
        "fps": fps,
        "tokens": tokens.model_dump(),
        "frames": frames,
        "total_frames": frames[-1]["end_frame"] if frames else 0,
    }


def render_carousel_slides(
    scenes: list[SceneDSL],
    tokens: DesignTokens,
    out_dir: Path,
    size: tuple[int, int] = RESOLUTIONS["portrait"],
) -> list[str]:
    renderer = get_renderer("pillow")
    paths: list[str] = []
    for i, scene in enumerate(scenes, start=1):
        out = out_dir / f"carousel_slide_{i:02d}.png"
        paths.append(renderer.render_scene(scene, tokens, size[0], size[1], out))
    return paths


def render_preview_frame(
    scene: SceneDSL,
    tokens: DesignTokens,
    output: Path,
    quality: str = "preview",
) -> str:
    w, h = RESOLUTIONS.get(quality, RESOLUTIONS["preview"])
    renderer = get_renderer("pillow")
    return renderer.render_scene(scene, tokens, w, h, output)
