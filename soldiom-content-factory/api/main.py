"""FastAPI bridge for CreativeOS web app."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow running as `uvicorn api.main:app` from soldiom-content-factory/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from soldiom.content_engine.pipeline import ContentPipeline
from soldiom.deploy.config import load_deploy_config
from soldiom.models import ContentFormat, ContentStage, DeploymentMode, UniversalInput

app = FastAPI(title="SOLDIOM Content Factory", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = ContentPipeline(load_deploy_config())


class CreateBody(BaseModel):
    prompt: str = ""
    url: str | None = None
    repo: str | None = None
    brand: str | None = None
    series: str | None = None
    goal: str | None = None
    language: str = "en"
    formats: list[str] = Field(default_factory=lambda: ["instagram_carousel"])
    evidence_required: bool = True
    run_full: bool = True


class ChatBody(BaseModel):
    instruction: str


class AdvanceBody(BaseModel):
    stage: str | None = None


@app.get("/health")
@app.get("/api/scf/health")
def health():
    cfg = load_deploy_config()
    return {
        "ok": True,
        "service": "soldiom-content-factory",
        "deployment_mode": cfg.mode.value,
        "projects_root": cfg.projects_root,
        "libraqm": _libraqm_status(),
        "gemini": bool(cfg.gemini_api_key),
        "elevenlabs": bool(cfg.elevenlabs_api_key),
        "runpod": bool(cfg.runpod_api_key and cfg.runpod_endpoint_id),
        "gcp": bool(cfg.gcp_cloud_run_url),
    }


def _libraqm_status() -> bool:
    try:
        from soldiom.renderer.arabic import has_libraqm

        return has_libraqm()
    except Exception:
        return False


def _parse_formats(raw: list[str]) -> list[ContentFormat]:
    out: list[ContentFormat] = []
    for r in raw:
        try:
            out.append(ContentFormat(r))
        except ValueError:
            if r == "all":
                out.extend(list(ContentFormat)[:6])
            elif r == "carousel":
                out.append(ContentFormat.CAROUSEL)
            elif r == "reel":
                out.extend([ContentFormat.REEL_30, ContentFormat.REEL_60])
    return out or [ContentFormat.CAROUSEL]


@app.post("/projects")
@app.post("/api/scf/projects")
def create_project(body: CreateBody):
    inp = UniversalInput(
        prompt=body.prompt,
        url=body.url,
        repo=body.repo,
        brand=body.brand,
        series=body.series,
        goal=body.goal,
        language=body.language,  # type: ignore[arg-type]
        formats=_parse_formats(body.formats),
        evidence_required=body.evidence_required,
    )
    if body.run_full:
        manifest = pipeline.run_full_pipeline(inp)
    else:
        manifest = pipeline.create_project(inp)
    return manifest.model_dump()


@app.get("/projects")
@app.get("/api/scf/projects")
def list_projects():
    return {"projects": pipeline.list_projects()}


@app.get("/projects/{project_id}")
@app.get("/api/scf/projects/{project_id}")
def get_project(project_id: str):
    try:
        m = pipeline._load_manifest(project_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(404, str(exc)) from exc
    return m.model_dump()


@app.post("/projects/{project_id}/advance")
@app.post("/api/scf/projects/{project_id}/advance")
def advance_project(project_id: str, body: AdvanceBody):
    stage = ContentStage(body.stage) if body.stage else None
    try:
        m = pipeline.advance(project_id, stage)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, str(exc)) from exc
    return m.model_dump()


@app.post("/projects/{project_id}/chat")
@app.post("/api/scf/projects/{project_id}/chat")
def chat_project(project_id: str, body: ChatBody):
    try:
        m = pipeline.chat_modify(project_id, body.instruction)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, str(exc)) from exc
    return m.model_dump()


@app.get("/deploy/modes")
@app.get("/api/scf/deploy/modes")
def deploy_modes():
    cfg = load_deploy_config()
    return {
        "current": cfg.mode.value,
        "modes": [
            {
                "id": "local",
                "label": "Local",
                "description": "Filesystem projects + local Pillow/FFmpeg render",
            },
            {
                "id": "runpod",
                "label": "RunPod",
                "description": "Local metadata + RunPod serverless GPU render",
                "configured": bool(cfg.runpod_api_key and cfg.runpod_endpoint_id),
            },
            {
                "id": "gcp",
                "label": "GCP",
                "description": "Cloud Run render + optional GCS storage",
                "configured": bool(cfg.gcp_cloud_run_url),
            },
        ],
    }


@app.post("/deploy/mode")
@app.post("/api/scf/deploy/mode")
def set_deploy_mode(body: dict):
    mode = body.get("mode", "local")
    os.environ["SCF_DEPLOY_MODE"] = mode
    global pipeline
    pipeline = ContentPipeline(load_deploy_config())
    return {"ok": True, "mode": mode}
