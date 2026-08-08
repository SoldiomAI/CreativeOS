"""Arabic QA — hard gate for RTL correctness."""

from __future__ import annotations

from soldiom.models import QAIssue, QAReport, SceneDSL
from soldiom.renderer.arabic import has_libraqm


def run_rtl_qa(scenes: list[SceneDSL], language: str) -> QAReport:
    issues: list[QAIssue] = []
    if language not in ("ar", "bilingual"):
        return QAReport(status="pass", issues=[])

    if not has_libraqm():
        issues.append(
            QAIssue(
                code="LIBRAQM_MISSING",
                severity="warn",
                message="Install libraqm for production Arabic shaping (apt: libraqm-dev)",
            )
        )

    for i, scene in enumerate(scenes, start=1):
        for el in scene.elements:
            if el.direction == "rtl" and el.text:
                if el.text == el.text[::-1]:
                    issues.append(
                        QAIssue(
                            code="DOUBLE_RESHAPE",
                            severity="block",
                            message="Possible double reshaping detected",
                            scene=i,
                        )
                    )

    status = "block" if any(i.severity == "block" for i in issues) else (
        "warn" if issues else "pass"
    )
    return QAReport(status=status, issues=issues)
