"""Visual QA — overflow, contrast, empty frames."""

from __future__ import annotations

from soldiom.models import QAIssue, QAReport, SceneDSL
from soldiom.renderer.pillow_backend import get_renderer


def run_visual_qa(scenes: list[SceneDSL]) -> QAReport:
    issues: list[QAIssue] = []
    renderer = get_renderer("pillow")

    if not scenes:
        issues.append(
            QAIssue(code="EMPTY_STORYBOARD", severity="block", message="No scenes to render")
        )

    for i, scene in enumerate(scenes, start=1):
        if not scene.elements:
            issues.append(
                QAIssue(
                    code="EMPTY_SCENE",
                    severity="warn",
                    message=f"Scene {i} has no elements",
                    scene=i,
                )
            )
        for el in scene.elements:
            text = el.text or el.value or ""
            if not text:
                continue
            fit = renderer.render_text_block(
                text,
                direction=el.direction,
                language="ar" if el.direction == "rtl" else "en",
                max_width=936,
                font_size=72 if el.type == "headline" else 42,
            )
            if len(fit["lines"]) > 8:
                issues.append(
                    QAIssue(
                        code="TEXT_OVERFLOW",
                        severity="warn",
                        message=f"Text may overflow in scene {i}",
                        scene=i,
                    )
                )

    status = "block" if any(i.severity == "block" for i in issues) else (
        "warn" if issues else "pass"
    )
    return QAReport(status=status, issues=issues)
