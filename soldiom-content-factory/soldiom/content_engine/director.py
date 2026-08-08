"""Content Director — understands intent before any rendering."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from soldiom.models import DirectorBrief, UniversalInput


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:48] or "project"


def _rule_based_brief(inp: UniversalInput) -> DirectorBrief:
    lang = inp.language
    topic = inp.prompt or inp.url or inp.repo or "content"
    is_ar = lang in ("ar", "bilingual")
    hook = (
        f"لماذا يهم {topic[:40]}؟"
        if is_ar
        else f"Why {topic[:40]} matters more than you think"
    )
    return DirectorBrief(
        objective=inp.goal or "inform and engage",
        audience="executives" if inp.goal == "executive" else "general social",
        platform=[f.value for f in inp.formats[:3]],
        language=lang,
        tone="premium" if inp.brand else "confident",
        content_type=inp.formats[0].value if inp.formats else "carousel",
        call_to_action="Follow for more" if not is_ar else "تابعنا للمزيد",
        desired_emotion="curiosity",
        key_message=inp.prompt[:200] if inp.prompt else topic[:200],
        hook=hook,
        supporting_points=[
            "Context and stakes",
            "Evidence-backed insight",
            "Actionable takeaway",
        ],
        visual_style="premium_black_gold" if inp.brand == "soldiom" else "corporate",
        duration=30.0 if any("reel" in f.value for f in inp.formats) else None,
        evidence_required=inp.evidence_required,
    )


def _gemini_brief(inp: UniversalInput, api_key: str) -> DirectorBrief | None:
    prompt = f"""You are a Content Director. Return ONLY valid JSON matching this schema:
{{"objective":"","audience":"","platform":[],"language":"","tone":"","content_type":"","call_to_action":"","desired_emotion":"","key_message":"","hook":"","supporting_points":[],"visual_style":"","duration":null,"evidence_required":true}}

User input:
prompt: {inp.prompt}
url: {inp.url}
repo: {inp.repo}
goal: {inp.goal}
language: {inp.language}
formats: {[f.value for f in inp.formats]}
brand: {inp.brand}
"""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={api_key}"
    )
    try:
        with httpx.Client(timeout=60.0) as client:
            res = client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            res.raise_for_status()
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        data = json.loads(match.group())
        return DirectorBrief.model_validate(data)
    except Exception:
        return None


def run_director(inp: UniversalInput, gemini_api_key: str | None = None) -> DirectorBrief:
    if gemini_api_key and inp.prompt:
        brief = _gemini_brief(inp, gemini_api_key)
        if brief:
            return brief
    return _rule_based_brief(inp)


def slug_from_input(inp: UniversalInput) -> str:
    base = inp.prompt or inp.url or inp.repo or "content"
    return _slugify(base)
