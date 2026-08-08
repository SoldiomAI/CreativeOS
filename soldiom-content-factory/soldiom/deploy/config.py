"""Environment-driven deployment configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass

from soldiom.models import DeploymentMode


@dataclass
class DeployConfig:
    mode: DeploymentMode
    projects_root: str
    api_port: int
    # RunPod
    runpod_api_key: str | None
    runpod_endpoint_id: str | None
    runpod_base_url: str | None
    # GCP
    gcp_project_id: str | None
    gcp_location: str | None
    gcp_cloud_run_url: str | None
    gcp_storage_bucket: str | None
    # Voice / research
    gemini_api_key: str | None
    elevenlabs_api_key: str | None


def load_deploy_config() -> DeployConfig:
    mode_raw = os.environ.get("SCF_DEPLOY_MODE", "local").strip().lower()
    try:
        mode = DeploymentMode(mode_raw)
    except ValueError:
        mode = DeploymentMode.LOCAL

    root = os.environ.get(
        "SCF_PROJECTS_ROOT",
        os.path.join(os.getcwd(), "projects"),
    )

    return DeployConfig(
        mode=mode,
        projects_root=root,
        api_port=int(os.environ.get("SCF_API_PORT", "7870")),
        runpod_api_key=os.environ.get("RUNPOD_API_KEY") or None,
        runpod_endpoint_id=os.environ.get("RUNPOD_ENDPOINT_ID") or None,
        runpod_base_url=os.environ.get("RUNPOD_BASE_URL") or "https://api.runpod.ai/v2",
        gcp_project_id=os.environ.get("GCP_PROJECT_ID") or None,
        gcp_location=os.environ.get("GCP_LOCATION") or "us-central1",
        gcp_cloud_run_url=os.environ.get("GCP_CLOUD_RUN_URL") or None,
        gcp_storage_bucket=os.environ.get("GCP_STORAGE_BUCKET") or None,
        gemini_api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or None,
        elevenlabs_api_key=os.environ.get("ELEVENLABS_API_KEY") or None,
    )
