"""
3D generation microservice — TripoSR via Hugging Face Space
  POST /generate        — accepts base64 image, queues a generation task
  GET  /status/{id}     — poll for progress / result
  GET  /result/{id}     — download the final GLB bytes

No GPU required. Generation is offloaded to the free TripoSR HF Space
(stabilityai/TripoSR) via gradio_client.

Run:
  pip install fastapi uvicorn pillow gradio_client
  python main.py
"""

import sys
import io
# Force UTF-8 stdout/stderr so Unicode progress chars don't crash on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import os
import uuid
import base64
import traceback
import threading
import shutil
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

OUTPUT_DIR = Path(os.environ.get("TRELLIS_OUTPUT_DIR", Path(__file__).parent / "outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── In-memory task store ──────────────────────────────────────────────────────
tasks: Dict[str, Dict[str, Any]] = {}
tasks_lock = threading.Lock()

app = FastAPI(title="TRELLIS HF Space proxy")

# ── Image pre-processing ──────────────────────────────────────────────────────

def _enhance_for_3d(image):
    """Sharpen + boost contrast so TRELLIS sees clean edges."""
    from PIL import ImageFilter, ImageEnhance, Image as PILImage

    if image.mode == "RGBA":
        rgb = image.convert("RGB")
        alpha = image.split()[3]
    else:
        rgb = image.convert("RGB")
        alpha = None

    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=3))
    rgb = ImageEnhance.Contrast(rgb).enhance(1.15)

    if alpha is not None:
        result = PILImage.new("RGBA", rgb.size)
        result.paste(rgb)
        result.putalpha(alpha)
        return result
    return rgb.convert("RGBA")


# ── HF Space client (lazy, reused across requests) ────────────────────────────
_hf_client = None
_hf_lock = threading.Lock()

def get_hf_client():
    global _hf_client
    if _hf_client is not None:
        return _hf_client
    with _hf_lock:
        if _hf_client is not None:
            return _hf_client
        from gradio_client import Client
        print("[3D] Connecting to HF Space stabilityai/TripoSR …", flush=True)
        _hf_client = Client("stabilityai/TripoSR")
        print("[3D] HF Space connected.", flush=True)
        return _hf_client


# ── Generation worker ─────────────────────────────────────────────────────────

def _run_generation(task_id: str, image_bytes: bytes, sparse_steps: int, slat_steps: int, seed: int):
    tmp_path = None
    try:
        from PIL import Image
        from gradio_client import handle_file

        with tasks_lock:
            tasks[task_id]["status"] = "IN_PROGRESS"
            tasks[task_id]["progress"] = 5

        # ── 1. Pre-process image ───────────────────────────────────────────
        raw = Image.open(BytesIO(image_bytes))
        image = _enhance_for_3d(raw)

        # Save to temp PNG for gradio_client upload
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            image.save(f.name, format="PNG")
            tmp_path = f.name

        with tasks_lock:
            tasks[task_id]["progress"] = 12

        # ── 2. Call TripoSR HF Space ───────────────────────────────────────
        print(f"[3D] {task_id}: submitting to TripoSR …", flush=True)
        client = get_hf_client()

        with tasks_lock:
            tasks[task_id]["progress"] = 18

        # TripoSR /generate endpoint:
        #   image, do_remove_background (bool), foreground_ratio (float)
        # Returns: (model_path,)  where model_path is a local .obj or .glb file
        result = client.predict(
            image=handle_file(tmp_path),
            do_remove_background=True,
            foreground_ratio=0.85,
            api_name="/generate",
        )

        with tasks_lock:
            tasks[task_id]["progress"] = 88

        # ── 3. Extract mesh path from result ──────────────────────────────
        # gradio_client downloads the file locally and returns its path.
        # TripoSR returns a single file path (str) or a list/tuple with one entry.
        if isinstance(result, (list, tuple)):
            mesh_source = str(result[0]) if result else None
        elif isinstance(result, dict):
            mesh_source = result.get("value") or result.get("path") or result.get("name")
        else:
            mesh_source = str(result)

        if not mesh_source or not Path(mesh_source).exists():
            raise RuntimeError(f"TripoSR did not return a valid mesh. result={result!r}")

        # Convert .obj → .glb if needed (TripoSR may return .obj)
        glb_source = mesh_source

        # ── 4. Copy to our output dir ─────────────────────────────────────
        src_ext = Path(glb_source).suffix.lower() or ".glb"
        out_path = OUTPUT_DIR / f"{task_id}{src_ext}"
        shutil.copy(glb_source, str(out_path))

        with tasks_lock:
            tasks[task_id]["status"] = "SUCCEEDED"
            tasks[task_id]["progress"] = 100
            tasks[task_id]["glb_path"] = str(out_path)

        print(f"[3D] {task_id} done → {out_path}", flush=True)

    except Exception as exc:
        traceback.print_exc()
        with tasks_lock:
            tasks[task_id]["status"] = "FAILED"
            tasks[task_id]["error"] = str(exc)
    finally:
        if tmp_path and Path(tmp_path).exists():
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ── API schemas ───────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    image_data: str          # base64-encoded image (no data-url prefix)
    sparse_steps: int = 50
    slat_steps:   int = 50
    seed:         int = 42


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/generate")
def generate(req: GenerateRequest):
    try:
        image_bytes = base64.b64decode(req.image_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image_data")

    task_id = str(uuid.uuid4())
    with tasks_lock:
        tasks[task_id] = {"status": "PENDING", "progress": 0, "glb_path": None, "error": None}

    thread = threading.Thread(
        target=_run_generation,
        args=(task_id, image_bytes, req.sparse_steps, req.slat_steps, req.seed),
        daemon=True,
    )
    thread.start()
    return {"task_id": task_id}


@app.get("/status/{task_id}")
def status(task_id: str):
    with tasks_lock:
        task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    resp: Dict[str, Any] = {
        "id": task_id,
        "status": task["status"],
        "progress": task["progress"],
    }
    if task["status"] == "SUCCEEDED":
        resp["model_urls"] = {"glb": f"/result/{task_id}"}
    if task["error"]:
        resp["task_error"] = {"message": task["error"]}
    return resp


@app.get("/result/{task_id}")
def result(task_id: str):
    with tasks_lock:
        task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "SUCCEEDED" or not task["glb_path"]:
        raise HTTPException(status_code=400, detail="Model not ready yet")

    path = Path(task["glb_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="GLB file missing on disk")

    ext = path.suffix.lower()
    media = "model/gltf-binary" if ext == ".glb" else "model/obj" if ext == ".obj" else "application/octet-stream"
    return FileResponse(path=str(path), media_type=media, filename=path.name)


if __name__ == "__main__":
    port = int(os.environ.get("TRELLIS_PORT", 8765))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
