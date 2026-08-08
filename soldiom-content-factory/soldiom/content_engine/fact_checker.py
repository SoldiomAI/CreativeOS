"""Fact-check gate before export."""

from __future__ import annotations

from soldiom.models import EvidenceClaim, QAIssue, QAReport


def run_fact_check(claims: list[EvidenceClaim], evidence_required: bool) -> QAReport:
    issues: list[QAIssue] = []
    for c in claims:
        if c.confidence < 0.7 and evidence_required:
            issues.append(
                QAIssue(
                    code="LOW_CONFIDENCE",
                    severity="warn",
                    message=f"Claim needs stronger evidence: {c.claim[:80]}",
                )
            )
        if evidence_required and not c.url and c.confidence < 0.8:
            issues.append(
                QAIssue(
                    code="MISSING_SOURCE_URL",
                    severity="warn",
                    message=f"No URL for claim: {c.claim[:60]}",
                )
            )

    status = "block" if any(i.severity == "block" for i in issues) else (
        "warn" if issues else "pass"
    )
    return QAReport(status=status, issues=issues)
