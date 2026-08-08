"""ElevenLabs voice adapter (optional API key)."""

from __future__ import annotations

from typing import Any

import httpx

from soldiom.models import VoiceLine


def synthesize_lines(
    lines: list[VoiceLine],
    api_key: str | None,
    voice_id: str = "21m00Tcm4TlvDq8ikWAM",
) -> dict[str, Any]:
    if not api_key or not lines:
        return {"ok": False, "message": "ElevenLabs key missing or no lines", "segments": []}

    segments: list[dict[str, Any]] = []
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

    for i, line in enumerate(lines):
        body = {
            "text": line.text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": line.pace},
        }
        try:
            with httpx.Client(timeout=120.0) as client:
                res = client.post(url, json=body, headers=headers)
                res.raise_for_status()
                segments.append({"index": i, "bytes": len(res.content), "emotion": line.emotion})
        except Exception as exc:  # noqa: BLE001
            segments.append({"index": i, "error": str(exc)})

    return {"ok": True, "segments": segments, "provider": "elevenlabs"}
