"""Content strategy — hook scoring and selection."""

from __future__ import annotations

from soldiom.models import DirectorBrief, HookCandidate


def score_hooks(brief: DirectorBrief) -> list[HookCandidate]:
    base = brief.hook or brief.key_message[:80]
    candidates = [
        HookCandidate(
            hook=base,
            clarity=9.0,
            novelty=7.5,
            credibility=8.5,
            retention_prediction=8.0,
        ),
        HookCandidate(
            hook=f"Stop scrolling — {base[:60]}",
            clarity=8.5,
            novelty=8.8,
            credibility=7.0,
            retention_prediction=9.0,
        ),
        HookCandidate(
            hook=f"The truth about {brief.key_message[:40]}…",
            clarity=8.0,
            novelty=9.2,
            credibility=7.5,
            retention_prediction=8.7,
        ),
    ]
    return sorted(
        candidates,
        key=lambda h: (h.clarity + h.novelty + h.credibility + h.retention_prediction) / 4,
        reverse=True,
    )


def choose_hook(candidates: list[HookCandidate]) -> str:
    return candidates[0].hook if candidates else ""
