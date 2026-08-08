"""Platform-specific writer."""

from __future__ import annotations

from soldiom.models import ContentFormat, DirectorBrief, HookCandidate


def write_script(
    brief: DirectorBrief,
    hook: str,
    formats: list[ContentFormat],
) -> str:
    lines = [
        f"# {brief.key_message[:80]}",
        "",
        f"**Hook:** {hook}",
        "",
        "## Script",
        "",
    ]
    for i, point in enumerate(brief.supporting_points, start=1):
        lines.append(f"{i}. {point}")
    lines.extend(["", f"**CTA:** {brief.call_to_action}", ""])
    lines.append("## Formats")
    for fmt in formats:
        lines.append(f"- {fmt.value}: platform-specific rewrite pending export stage")
    return "\n".join(lines)
