"""End-to-end pipeline orchestration."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from soldiom.content_engine.director import run_director, slug_from_input
from soldiom.content_engine.fact_checker import run_fact_check
from soldiom.content_engine.researcher import run_research
from soldiom.content_engine.storyboard import build_storyboard, storyboard_to_voice
from soldiom.content_engine.strategist import choose_hook, score_hooks
from soldiom.content_engine.writer import write_script
from soldiom.deploy.config import DeployConfig, load_deploy_config
from soldiom.deploy.modes import get_backend
from soldiom.models import (
    ContentFormat,
    ContentPackItem,
    ContentStage,
    ProjectManifest,
    SceneDSL,
    SceneElement,
    UniversalInput,
)
from soldiom.renderer.pipeline import compile_timeline, render_carousel_slides, render_preview_frame
from soldiom.qa.visual import run_visual_qa
from soldiom.qa.rtl import run_rtl_qa


STAGE_ORDER = list(ContentStage)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _content_pack(formats: list[ContentFormat], topic: str) -> list[ContentPackItem]:
    return [
        ContentPackItem(format=fmt, title=f"{topic[:40]} — {fmt.value}", status="planned")
        for fmt in formats
    ]


def _storyboard_to_dsl(storyboard, tokens) -> list[SceneDSL]:
    dsl_scenes: list[SceneDSL] = []
    for scene in storyboard:
        direction = scene.visual.get("direction", "ltr")
        align = "right" if direction == "rtl" else "left"
        elements = [
            SceneElement(
                type="headline",
                text=scene.headline,
                align=align,  # type: ignore[arg-type]
                direction=direction,  # type: ignore[arg-type]
                animation=scene.animation,
            )
        ]
        if scene.visual.get("type") == "card":
            elements.append(
                SceneElement(
                    type="paragraph",
                    text=scene.narration,
                    align=align,  # type: ignore[arg-type]
                    direction=direction,  # type: ignore[arg-type]
                    animation="fade",
                )
            )
        dsl_scenes.append(SceneDSL(background="dark", elements=elements))
    return dsl_scenes


class ContentPipeline:
    def __init__(self, config: DeployConfig | None = None):
        self.config = config or load_deploy_config()
        self.backend = get_backend(self.config)
        self.root = Path(self.config.projects_root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _project_dir(self, project_id: str) -> Path:
        p = self.root / project_id
        p.mkdir(parents=True, exist_ok=True)
        for sub in ("research", "assets", "audio", "renders", "qa", "exports"):
            (p / sub).mkdir(exist_ok=True)
        return p

    def _save_manifest(self, manifest: ProjectManifest) -> None:
        pdir = self._project_dir(manifest.id)
        (pdir / "brief.json").write_text(
            manifest.model_dump_json(indent=2), encoding="utf-8"
        )

    def _load_manifest(self, project_id: str) -> ProjectManifest:
        p = self.root / project_id / "brief.json"
        return ProjectManifest.model_validate_json(p.read_text(encoding="utf-8"))

    def create_project(self, inp: UniversalInput) -> ProjectManifest:
        pid = uuid.uuid4().hex[:12]
        slug = slug_from_input(inp)
        manifest = ProjectManifest(
            id=pid,
            slug=slug,
            created_at=_now(),
            updated_at=_now(),
            stage=ContentStage.IDEA,
            input=inp,
            content_pack=_content_pack(inp.formats, inp.prompt or slug),
            deployment_mode=self.config.mode,
        )
        self._save_manifest(manifest)
        return manifest

    def advance(self, project_id: str, target: ContentStage | None = None) -> ProjectManifest:
        manifest = self._load_manifest(project_id)
        idx = STAGE_ORDER.index(manifest.stage)
        next_stage = target or (STAGE_ORDER[min(idx + 1, len(STAGE_ORDER) - 1)])

        if next_stage == ContentStage.RESEARCH or manifest.stage == ContentStage.IDEA:
            brief = run_director(manifest.input, self.config.gemini_api_key)
            manifest.brief = brief
            claims, research_md = run_research(manifest.input, brief)
            manifest.claims = claims
            pdir = self._project_dir(project_id)
            (pdir / "research" / "research.md").write_text(research_md, encoding="utf-8")
            (pdir / "research" / "sources.json").write_text(
                json.dumps([c.model_dump() for c in claims], indent=2),
                encoding="utf-8",
            )
            (pdir / "research" / "fact_pack.json").write_text(
                json.dumps([c.model_dump() for c in claims if c.confidence >= 0.7], indent=2),
                encoding="utf-8",
            )

        if next_stage.value in ("strategy", "script", "storyboard", "design", "voice", "render", "qa", "export"):
            if not manifest.brief:
                manifest.brief = run_director(manifest.input, self.config.gemini_api_key)
            hooks = score_hooks(manifest.brief)
            manifest.hooks = hooks
            manifest.chosen_hook = choose_hook(hooks)
            manifest.script_md = write_script(
                manifest.brief,
                manifest.chosen_hook,
                manifest.input.formats,
            )
            duration = manifest.brief.duration or 30.0
            manifest.storyboard = build_storyboard(
                manifest.brief, manifest.chosen_hook, duration
            )
            manifest.scenes_dsl = _storyboard_to_dsl(manifest.storyboard, manifest.tokens)
            manifest.voice_lines = storyboard_to_voice(manifest.storyboard)
            pdir = self._project_dir(project_id)
            (pdir / "script.md").write_text(manifest.script_md, encoding="utf-8")
            (pdir / "storyboard.json").write_text(
                json.dumps([s.model_dump() for s in manifest.storyboard], indent=2),
                encoding="utf-8",
            )

        if next_stage.value in ("render", "qa", "export"):
            pdir = self._project_dir(project_id)
            timeline = compile_timeline(manifest.storyboard, manifest.tokens)
            (pdir / "timeline.json").write_text(
                json.dumps(timeline, indent=2), encoding="utf-8"
            )
            slides = render_carousel_slides(
                manifest.scenes_dsl, manifest.tokens, pdir / "renders"
            )
            preview = render_preview_frame(
                manifest.scenes_dsl[0] if manifest.scenes_dsl else SceneDSL(),
                manifest.tokens,
                pdir / "renders" / "preview_frame.png",
            )
            job = self.backend.submit_render_job(
                project_id,
                {"timeline": timeline, "slides": len(slides), "preview": preview},
            )
            (pdir / "renders" / "job.json").write_text(json.dumps(job, indent=2), encoding="utf-8")

        if next_stage.value in ("qa", "export"):
            fact_qa = run_fact_check(
                manifest.claims,
                manifest.input.evidence_required,
            )
            visual_qa = run_visual_qa(manifest.scenes_dsl)
            rtl_qa = run_rtl_qa(manifest.scenes_dsl, manifest.input.language)
            all_issues = fact_qa.issues + visual_qa.issues + rtl_qa.issues
            status = "block" if any(i.severity == "block" for i in all_issues) else (
                "warn" if all_issues else "pass"
            )
            manifest.qa = fact_qa.model_copy(update={"issues": all_issues, "status": status})
            pdir = self._project_dir(project_id)
            (pdir / "qa" / "qa_report.json").write_text(
                manifest.qa.model_dump_json(indent=2), encoding="utf-8"
            )

        if next_stage == ContentStage.EXPORT:
            for item in manifest.content_pack:
                item.status = "ready"
            content_hash = hashlib.sha256(
                manifest.model_dump_json().encode("utf-8")
            ).hexdigest()[:16]
            manifest.render_hash = content_hash

        manifest.stage = next_stage
        manifest.updated_at = _now()
        self._save_manifest(manifest)
        return manifest

    def run_full_pipeline(self, inp: UniversalInput) -> ProjectManifest:
        manifest = self.create_project(inp)
        for stage in STAGE_ORDER[1:]:
            manifest = self.advance(manifest.id, stage)
        return manifest

    def list_projects(self) -> list[dict]:
        out = []
        if not self.root.exists():
            return out
        for p in sorted(self.root.iterdir()):
            if not p.is_dir():
                continue
            brief = p / "brief.json"
            if brief.exists():
                m = ProjectManifest.model_validate_json(brief.read_text(encoding="utf-8"))
                out.append(
                    {
                        "id": m.id,
                        "slug": m.slug,
                        "stage": m.stage.value,
                        "hook": m.chosen_hook,
                        "updated_at": m.updated_at,
                    }
                )
        return out

    def chat_modify(self, project_id: str, instruction: str) -> ProjectManifest:
        manifest = self._load_manifest(project_id)
        lower = instruction.lower()
        if "premium" in lower and manifest.brief:
            manifest.brief.visual_style = "luxury"
            manifest.tokens.primary = "#D4AF37"
        if "shorten" in lower or "30 second" in lower:
            if manifest.brief:
                manifest.brief.duration = 30.0
        if "kuwait" in lower or "arabic" in lower:
            manifest.input.language = "ar"
            if manifest.brief:
                manifest.brief.language = "ar"
        if "linkedin" in lower:
            manifest.input.formats = [ContentFormat.LINKEDIN_POST]
        manifest.updated_at = _now()
        self._save_manifest(manifest)
        return self.advance(project_id, ContentStage.RENDER)
