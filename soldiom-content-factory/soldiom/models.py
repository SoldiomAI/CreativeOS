"""Structured JSON models — intelligence layer output, never raw pixels."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class DeploymentMode(str, Enum):
    LOCAL = "local"
    RUNPOD = "runpod"
    GCP = "gcp"


class ContentStage(str, Enum):
    IDEA = "idea"
    RESEARCH = "research"
    STRATEGY = "strategy"
    SCRIPT = "script"
    STORYBOARD = "storyboard"
    DESIGN = "design"
    VOICE = "voice"
    RENDER = "render"
    QA = "qa"
    EXPORT = "export"


class ContentFormat(str, Enum):
    CAROUSEL = "instagram_carousel"
    REEL_30 = "reel_30"
    REEL_60 = "reel_60"
    TIKTOK = "tiktok"
    YOUTUBE_SHORT = "youtube_short"
    LINKEDIN_POST = "linkedin_post"
    X_THREAD = "x_thread"
    PRESENTATION = "presentation"
    INFOGRAPHIC = "infographic"
    ARTICLE = "article"
    STORY = "instagram_story"
    WHATSAPP = "whatsapp_teaser"


class UniversalInput(BaseModel):
    """Anything → content. One universal intake shape."""

    prompt: str = ""
    url: str | None = None
    repo: str | None = None
    pdf_path: str | None = None
    brand: str | None = None
    series: str | None = None
    goal: str | None = None  # viral, executive, product-launch, …
    language: Literal["ar", "en", "bilingual"] = "en"
    formats: list[ContentFormat] = Field(default_factory=lambda: [ContentFormat.CAROUSEL])
    evidence_required: bool = True


class DirectorBrief(BaseModel):
    objective: str = ""
    audience: str = ""
    platform: list[str] = Field(default_factory=list)
    language: str = "en"
    tone: str = ""
    content_type: str = ""
    call_to_action: str = ""
    desired_emotion: str = ""
    key_message: str = ""
    hook: str = ""
    supporting_points: list[str] = Field(default_factory=list)
    visual_style: str = "premium_black_gold"
    duration: float | None = None
    evidence_required: bool = True


class EvidenceClaim(BaseModel):
    claim: str
    source: str = ""
    url: str = ""
    published: str = ""
    retrieved: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    confidence: float = 0.0


class HookCandidate(BaseModel):
    hook: str
    clarity: float = 0.0
    novelty: float = 0.0
    credibility: float = 0.0
    retention_prediction: float = 0.0


class StoryboardScene(BaseModel):
    scene: int
    start: float
    end: float
    narration: str = ""
    headline: str = ""
    visual: dict[str, Any] = Field(default_factory=dict)
    animation: str = "fade_up"
    citation: str | None = None


class DesignTokens(BaseModel):
    background: str = "#0B0F14"
    surface: str = "#151A22"
    primary: str = "#D4AF37"
    text_primary: str = "#FFFFFF"
    text_secondary: str = "#AAB2C0"
    radius: int = 24
    margin: int = 72


class SceneElement(BaseModel):
    type: str
    text: str | None = None
    value: str | None = None
    caption: str | None = None
    align: Literal["left", "center", "right"] = "left"
    direction: Literal["ltr", "rtl"] = "ltr"
    animation: str = "fade_up"
    source: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class SceneDSL(BaseModel):
    background: str = "dark"
    elements: list[SceneElement] = Field(default_factory=list)


class VoiceLine(BaseModel):
    text: str
    emotion: str = "neutral"
    pace: float = 1.0
    pause_after: float = 0.0
    emphasis: list[str] = Field(default_factory=list)


class QAIssue(BaseModel):
    code: str
    severity: Literal["pass", "warn", "block"] = "warn"
    message: str
    scene: int | None = None


class QAReport(BaseModel):
    status: Literal["pass", "warn", "block"] = "pass"
    issues: list[QAIssue] = Field(default_factory=list)
    checked_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContentPackItem(BaseModel):
    format: ContentFormat
    title: str
    status: Literal["planned", "draft", "ready", "exported"] = "planned"
    path: str | None = None


class CalendarEntry(BaseModel):
    id: str
    title: str
    scheduled_at: str
    format: ContentFormat
    series: str | None = None
    status: Literal["planned", "queued", "published"] = "planned"


class ProjectManifest(BaseModel):
    id: str
    slug: str
    created_at: str
    updated_at: str
    stage: ContentStage = ContentStage.IDEA
    input: UniversalInput
    brief: DirectorBrief | None = None
    claims: list[EvidenceClaim] = Field(default_factory=list)
    hooks: list[HookCandidate] = Field(default_factory=list)
    chosen_hook: str | None = None
    script_md: str = ""
    storyboard: list[StoryboardScene] = Field(default_factory=list)
    scenes_dsl: list[SceneDSL] = Field(default_factory=list)
    tokens: DesignTokens = Field(default_factory=DesignTokens)
    voice_lines: list[VoiceLine] = Field(default_factory=list)
    content_pack: list[ContentPackItem] = Field(default_factory=list)
    qa: QAReport | None = None
    deployment_mode: DeploymentMode = DeploymentMode.LOCAL
    render_hash: str | None = None
