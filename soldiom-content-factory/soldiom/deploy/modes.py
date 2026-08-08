"""Deployment mode adapters: local filesystem, RunPod serverless, GCP Cloud Run + GCS."""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import httpx

from soldiom.deploy.config import DeployConfig
from soldiom.models import DeploymentMode


class RenderBackend(ABC):
    @abstractmethod
    def store_project(self, project_id: str, rel_path: str, data: bytes) -> str:
        ...

    @abstractmethod
    def read_project(self, project_id: str, rel_path: str) -> bytes:
        ...

    @abstractmethod
    def submit_render_job(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        ...


class LocalBackend(RenderBackend):
    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, project_id: str, rel_path: str) -> Path:
        p = self.root / project_id / rel_path
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def store_project(self, project_id: str, rel_path: str, data: bytes) -> str:
        p = self._path(project_id, rel_path)
        p.write_bytes(data)
        return str(p)

    def read_project(self, project_id: str, rel_path: str) -> bytes:
        return self._path(project_id, rel_path).read_bytes()

    def submit_render_job(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        job_path = self._path(project_id, "renders/job.json")
        job_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return {"ok": True, "mode": "local", "jobPath": str(job_path)}


class RunPodBackend(LocalBackend):
    """Local project files + remote GPU render via RunPod serverless."""

    def __init__(self, root: str, config: DeployConfig):
        super().__init__(root)
        self.config = config

    def submit_render_job(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.config.runpod_api_key or not self.config.runpod_endpoint_id:
            return super().submit_render_job(project_id, payload)

        url = (
            f"{self.config.runpod_base_url.rstrip('/')}/"
            f"{self.config.runpod_endpoint_id}/runsync"
        )
        body = {"input": {"project_id": project_id, **payload}}
        headers = {"Authorization": f"Bearer {self.config.runpod_api_key}"}
        try:
            with httpx.Client(timeout=900.0) as client:
                res = client.post(url, json=body, headers=headers)
                res.raise_for_status()
                data = res.json()
            return {"ok": True, "mode": "runpod", "runpod": data}
        except Exception as exc:  # noqa: BLE001
            local = super().submit_render_job(project_id, payload)
            local["runpod_error"] = str(exc)
            local["fallback"] = "local"
            return local


class GCPBackend(LocalBackend):
    """Local metadata + optional Cloud Run render + GCS object storage."""

    def __init__(self, root: str, config: DeployConfig):
        super().__init__(root)
        self.config = config

    def submit_render_job(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.config.gcp_cloud_run_url:
            return super().submit_render_job(project_id, payload)

        url = f"{self.config.gcp_cloud_run_url.rstrip('/')}/render"
        body = {"projectId": project_id, **payload}
        try:
            with httpx.Client(timeout=900.0) as client:
                res = client.post(url, json=body)
                res.raise_for_status()
                data = res.json()
            if self.config.gcp_storage_bucket and data.get("gcsUri"):
                self._path(project_id, "renders/gcp_uri.txt").write_text(
                    data["gcsUri"], encoding="utf-8"
                )
            return {"ok": True, "mode": "gcp", "gcp": data}
        except Exception as exc:  # noqa: BLE001
            local = super().submit_render_job(project_id, payload)
            local["gcp_error"] = str(exc)
            local["fallback"] = "local"
            return local


def get_backend(config: DeployConfig) -> RenderBackend:
    if config.mode == DeploymentMode.RUNPOD:
        return RunPodBackend(config.projects_root, config)
    if config.mode == DeploymentMode.GCP:
        return GCPBackend(config.projects_root, config)
    return LocalBackend(config.projects_root)
