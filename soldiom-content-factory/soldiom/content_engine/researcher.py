"""Research engine — claims with sources (stub + Gemini augmentation)."""

from __future__ import annotations

from datetime import datetime, timezone

from soldiom.models import DirectorBrief, EvidenceClaim, UniversalInput


def run_research(
    inp: UniversalInput,
    brief: DirectorBrief,
) -> tuple[list[EvidenceClaim], str]:
    """Return claims + research.md markdown."""
    now = datetime.now(timezone.utc).date().isoformat()
    claims: list[EvidenceClaim] = []

    if inp.url:
        claims.append(
            EvidenceClaim(
                claim=f"Primary source referenced: {inp.url}",
                source="User-provided URL",
                url=inp.url,
                published="",
                retrieved=now,
                confidence=0.85,
            )
        )

    if brief.key_message:
        claims.append(
            EvidenceClaim(
                claim=brief.key_message,
                source="Director brief (requires verification)",
                url=inp.url or "",
                published="",
                retrieved=now,
                confidence=0.6 if brief.evidence_required else 0.9,
            )
        )

    for i, point in enumerate(brief.supporting_points[:5], start=1):
        claims.append(
            EvidenceClaim(
                claim=point,
                source=f"Supporting point {i}",
                url="",
                published="",
                retrieved=now,
                confidence=0.5,
            )
        )

    md_lines = [
        "# Research",
        "",
        f"**Topic:** {inp.prompt or inp.url or 'N/A'}",
        f"**Retrieved:** {now}",
        "",
        "## Claims",
    ]
    for c in claims:
        md_lines.append(f"- {c.claim} (confidence: {c.confidence})")
        if c.url:
            md_lines.append(f"  - Source: {c.url}")

    return claims, "\n".join(md_lines)
