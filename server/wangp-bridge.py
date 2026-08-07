#!/usr/bin/env python3
"""
CreativeOS ↔ Wan2GP bridge (https://github.com/deepbeepmeep/Wan2GP)

Exposes a small REST API over WanGP's in-process Python API (shared.api).
Requires a local Wan2GP install:

  export WAN2GP_ROOT=/path/to/Wan2GP
  python3 server/wangp-bridge.py

Vite proxies /api/wangp → http://127.0.0.1:7867

Alternative: run Wan2GP MCP (python wgp.py --mcp --mcp-transport streamable-http --mcp-port 7866)
and point CreativeOS MCP bridge at it — this bridge is the simpler direct path.
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

ROOT = os.environ.get("WAN2GP_ROOT", "").strip()
PORT = int(os.environ.get("WANGP_BRIDGE_PORT", "7867"))
DEFAULT_MODEL = os.environ.get("WANGP_MODEL_TYPE", "wan2.2_t2v_14B").strip()

_session = None
_session_lock = threading.Lock()
_jobs: dict[str, dict[str, Any]] = {}
_file_tokens: dict[str, str] = {}


def _json_response(handler: BaseHTTPRequestHandler, code: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", 0))
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def _ensure_session():
    global _session
    with _session_lock:
        if _session is not None:
            return _session
        if not ROOT:
            raise RuntimeError(
                "WAN2GP_ROOT is not set. Clone https://github.com/deepbeepmeep/Wan2GP and export WAN2GP_ROOT."
            )
        root_path = Path(ROOT).resolve()
        if not root_path.exists():
            raise RuntimeError(f"WAN2GP_ROOT does not exist: {root_path}")

        import sys

        if str(root_path) not in sys.path:
            sys.path.insert(0, str(root_path))
        os.chdir(root_path)

        from shared.api import init  # type: ignore

        _session = init(root=root_path, console_output=False)
        return _session


def _resolution_for_aspect(aspect: str) -> str:
    if aspect == "16:9":
        return "1280x720"
    if aspect == "1:1":
        return "720x720"
    return "720x1280"


def _build_settings(body: dict) -> dict:
    prompt = str(body.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("prompt required")

    aspect = str(body.get("aspectRatio") or "9:16")
    duration_sec = float(body.get("durationSec") or 5)
    model_type = str(body.get("modelType") or DEFAULT_MODEL).strip() or DEFAULT_MODEL
    fps = int(body.get("fps") or 24)
    video_length = max(17, min(int(duration_sec * fps), 241))

    settings: dict[str, Any] = {
        "model_type": model_type,
        "prompt": prompt,
        "resolution": _resolution_for_aspect(aspect),
        "num_inference_steps": int(body.get("numInferenceSteps") or 20),
        "video_length": video_length,
        "duration_seconds": duration_sec,
        "force_fps": fps,
    }

    if body.get("negativePrompt"):
        settings["negative_prompt"] = str(body["negativePrompt"])

    image_b64 = body.get("imageBase64")
    image_name = body.get("imageName") or "reference.png"
    if image_b64:
        tmp_dir = Path(ROOT).resolve() / "outputs" / "creativeos_bridge"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(image_name).suffix or ".png"
        img_path = tmp_dir / f"{uuid.uuid4().hex}{ext}"
        img_path.write_bytes(base64.b64decode(str(image_b64).split(",")[-1]))
        settings["image_start"] = str(img_path)

    extra = body.get("settings")
    if isinstance(extra, dict):
        settings.update(extra)

    return settings


def _register_file(path: str) -> str:
    token = uuid.uuid4().hex
    _file_tokens[token] = path
    return token


def _run_job(job_id: str, settings: dict) -> None:
    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["startedAt"] = time.time()
    try:
        session = _ensure_session()
        job = session.submit_task(settings)
        for event in job.events.iter(timeout=0.5):
            if event.kind == "progress":
                prog = event.data
                _jobs[job_id]["phase"] = getattr(prog, "phase", "generating")
                _jobs[job_id]["progress"] = getattr(prog, "progress", None)
        result = job.result()
        if not result.success:
            msgs = [e.message for e in (result.errors or []) if getattr(e, "message", None)]
            raise RuntimeError("; ".join(msgs) or "Wan2GP generation failed")

        video_path = None
        if result.generated_files:
            video_path = str(result.generated_files[0])
        elif result.artifacts:
            art = result.artifacts[0]
            video_path = getattr(art, "path", None)

        if not video_path or not Path(video_path).exists():
            raise RuntimeError("Wan2GP finished but no video file was produced")

        token = _register_file(video_path)
        _jobs[job_id].update(
            {
                "status": "done",
                "fileToken": token,
                "path": video_path,
                "finishedAt": time.time(),
            }
        )
    except Exception as exc:  # noqa: BLE001
        _jobs[job_id].update(
            {"status": "error", "error": str(exc), "finishedAt": time.time()}
        )


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: D401
        print(f"[wangp-bridge] {self.address_string()} - {fmt % args}")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/health" or path == "/api/wangp/health":
            ok = bool(ROOT and Path(ROOT).exists())
            ready = False
            err = None
            if ok:
                try:
                    _ensure_session()
                    ready = True
                except Exception as exc:  # noqa: BLE001
                    err = str(exc)
            _json_response(
                self,
                200 if ok else 503,
                {
                    "ok": ok,
                    "ready": ready,
                    "root": ROOT or None,
                    "defaultModel": DEFAULT_MODEL,
                    "message": err or ("Wan2GP session ready" if ready else "Set WAN2GP_ROOT"),
                    "docs": "https://github.com/deepbeepmeep/Wan2GP/blob/master/docs/API.md",
                },
            )
            return

        if path.startswith("/job/") or path.startswith("/api/wangp/job/"):
            job_id = path.rsplit("/", 1)[-1]
            job = _jobs.get(job_id)
            if not job:
                _json_response(self, 404, {"error": "job not found"})
                return
            _json_response(self, 200, job)
            return

        if path.startswith("/files/") or path.startswith("/api/wangp/files/"):
            token = path.rsplit("/", 1)[-1]
            file_path = _file_tokens.get(token)
            if not file_path or not Path(file_path).exists():
                _json_response(self, 404, {"error": "file not found"})
                return
            p = Path(file_path)
            mime, _ = mimetypes.guess_type(str(p))
            mime = mime or "video/mp4"
            data = p.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        _json_response(self, 404, {"error": "not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path not in ("/generate", "/api/wangp/generate"):
            _json_response(self, 404, {"error": "not found"})
            return

        try:
            body = _read_json(self)
            settings = _build_settings(body)
            wait = bool(body.get("wait", True))
            job_id = uuid.uuid4().hex
            _jobs[job_id] = {
                "id": job_id,
                "status": "queued",
                "modelType": settings.get("model_type"),
                "prompt": settings.get("prompt", "")[:120],
            }
            thread = threading.Thread(target=_run_job, args=(job_id, settings), daemon=True)
            thread.start()

            if not wait:
                _json_response(self, 202, {"jobId": job_id, "status": "queued"})
                return

            deadline = time.time() + float(body.get("timeoutSec") or 900)
            while time.time() < deadline:
                job = _jobs.get(job_id, {})
                if job.get("status") == "done":
                    token = job["fileToken"]
                    _json_response(
                        self,
                        200,
                        {
                            "ok": True,
                            "jobId": job_id,
                            "fileToken": token,
                            "videoUrl": f"/api/wangp/files/{token}",
                            "path": job.get("path"),
                        },
                    )
                    return
                if job.get("status") == "error":
                    _json_response(self, 500, {"ok": False, "error": job.get("error"), "jobId": job_id})
                    return
                time.sleep(1)

            _json_response(self, 504, {"ok": False, "error": "timeout", "jobId": job_id})
        except Exception as exc:  # noqa: BLE001
            _json_response(self, 400, {"ok": False, "error": str(exc)})


def main() -> None:
    print(f"[CreativeOS] Wan2GP bridge http://0.0.0.0:{PORT}")
    print(f"  Health: http://127.0.0.1:{PORT}/api/wangp/health")
    if not ROOT:
        print("  WARN: WAN2GP_ROOT not set — configure before generating")
    else:
        print(f"  WAN2GP_ROOT={ROOT}")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), BridgeHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
