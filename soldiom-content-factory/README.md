# SOLDIOM Content Factory

Universal deterministic AI content creation engine — part of [CreativeOS](../README.md).

## Principle

**Intelligence ≠ Rendering.** LLMs produce structured JSON (brief, storyboard, scene DSL). The deterministic renderer (Pillow today; SVG/HTML/Chromium later) draws pixels. Same input + config + assets → same output.

## Quick start

```bash
pip install -r requirements.txt
export SCF_PROJECTS_ROOT=./projects
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 7870
```

Or from repo root: `npm run content-factory`

## CLI

```bash
python3 cli.py create "Your topic" --language ar --format carousel,reel
```

## Deploy modes

| Mode | Env |
| --- | --- |
| local | `SCF_DEPLOY_MODE=local` (default) |
| runpod | `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID` |
| gcp | `GCP_CLOUD_RUN_URL`, optional `GCP_STORAGE_BUCKET` |

## Arabic

Install system libraqm for production RTL shaping:

```bash
sudo apt install libraqm-dev
```

Tests: `pytest tests/`
