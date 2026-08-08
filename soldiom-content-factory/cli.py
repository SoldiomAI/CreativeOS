#!/usr/bin/env python3
"""CLI — content create / render / qa / export."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from soldiom.content_engine.pipeline import ContentPipeline
from soldiom.models import ContentFormat, UniversalInput


def cmd_create(args: argparse.Namespace) -> int:
    formats = []
    for f in (args.format or "carousel").split(","):
        f = f.strip()
        if f == "all":
            formats = list(ContentFormat)[:8]
            break
        try:
            formats.append(ContentFormat(f))
        except ValueError:
            if f == "carousel":
                formats.append(ContentFormat.CAROUSEL)
            elif f == "reel":
                formats.extend([ContentFormat.REEL_30, ContentFormat.REEL_60])

    inp = UniversalInput(
        prompt=args.prompt or "",
        url=args.url,
        repo=args.repo,
        brand=args.brand,
        goal=args.goal,
        language=args.language,  # type: ignore[arg-type]
        formats=formats or [ContentFormat.CAROUSEL],
    )
    pipe = ContentPipeline()
    manifest = pipe.run_full_pipeline(inp)
    print(json.dumps({"id": manifest.id, "slug": manifest.slug, "stage": manifest.stage.value}, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="content", description="SOLDIOM Content Factory CLI")
    sub = parser.add_subparsers(dest="command")

    create = sub.add_parser("create", help="Create content from prompt/URL/repo")
    create.add_argument("prompt", nargs="?", default="")
    create.add_argument("--url")
    create.add_argument("--repo")
    create.add_argument("--brand")
    create.add_argument("--goal")
    create.add_argument("--language", default="en")
    create.add_argument("--format", default="carousel")
    create.set_defaults(func=cmd_create)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
