"""Storyboard engine — scenes as single source of truth."""

from __future__ import annotations

from soldiom.models import DirectorBrief, StoryboardScene, VoiceLine


def build_storyboard(brief: DirectorBrief, hook: str, duration: float = 30.0) -> list[StoryboardScene]:
    beats = [hook] + brief.supporting_points[:3] + [brief.call_to_action]
    n = len(beats)
    seg = duration / max(n, 1)
    scenes: list[StoryboardScene] = []
    rtl = brief.language in ("ar", "bilingual")

    for i, text in enumerate(beats):
        start = round(i * seg, 1)
        end = round((i + 1) * seg, 1)
        scenes.append(
            StoryboardScene(
                scene=i + 1,
                start=start,
                end=end,
                narration=text if rtl else text,
                headline=text[:60],
                visual={
                    "type": "headline" if i == 0 else "card",
                    "text": text,
                    "direction": "rtl" if rtl else "ltr",
                },
                animation="fade_up" if i == 0 else "slide",
                citation=f"source_{min(i + 1, 3):02d}" if i < 3 else None,
            )
        )
    return scenes


def storyboard_to_voice(scenes: list[StoryboardScene]) -> list[VoiceLine]:
    return [
        VoiceLine(
            text=s.narration,
            emotion="confident" if s.scene == 1 else "neutral",
            pace=0.92 if s.scene == 1 else 1.0,
            pause_after=0.3,
        )
        for s in scenes
        if s.narration
    ]
