"""Playwright browser capture (optional — requires playwright install)."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def capture_url(
    url: str,
    output: Path,
    *,
    viewport: str = "mobile",
    full_page: bool = False,
) -> dict[str, Any]:
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        return {"ok": False, "error": "playwright not installed — pip install playwright && playwright install chromium"}

    sizes = {
        "mobile": {"width": 390, "height": 844},
        "desktop": {"width": 1280, "height": 720},
    }
    vp = sizes.get(viewport, sizes["mobile"])
    output.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=vp)
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.screenshot(path=str(output), full_page=full_page)
        browser.close()

    return {"ok": True, "path": str(output), "viewport": viewport}
