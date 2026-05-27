#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# RunPod one-time setup script for TRELLIS.2
# SSH into your RunPod pod and run:
#   bash runpod_setup.sh
# Takes ~10-15 minutes first time.
# ──────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     BBCad — TRELLIS.2 RunPod Setup               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. System deps ────────────────────────────────────────────────────────────
echo "[1/6] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq git curl libgl1 libglib2.0-0 libgomp1

# ── 2. Clone TRELLIS.2 ───────────────────────────────────────────────────────
echo "[2/6] Cloning TRELLIS.2..."
if [ ! -d "/workspace/TRELLIS.2" ]; then
    git clone --depth=1 https://github.com/microsoft/TRELLIS.2.git /workspace/TRELLIS.2
else
    echo "  Already cloned, skipping."
fi

# ── 3. Install TRELLIS.2 deps ─────────────────────────────────────────────────
echo "[3/6] Installing TRELLIS.2 dependencies (this takes ~8 min)..."
cd /workspace/TRELLIS.2

# Run official setup (handles xformers, nvdiffrast, kaolin, etc.)
bash setup.sh --basic --xformers --flash-attn \
    --diffoctreerast --vox2seq --spconv --mipgaussian \
    --kaolin --nvdiffrast 2>&1 | tail -20

# ── 4. Install service deps ───────────────────────────────────────────────────
echo "[4/6] Installing FastAPI service dependencies..."
pip install -q fastapi uvicorn pillow

# ── 5. Copy service file ──────────────────────────────────────────────────────
echo "[5/6] Writing service file..."
cat > /workspace/trellis_api.py << 'PYEOF'
import os, sys, uuid, base64, traceback, threading
from io import BytesIO
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, "/workspace/TRELLIS.2")

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

OUTPUT_DIR = Path("/workspace/trellis_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

tasks: Dict[str, Dict[str, Any]] = {}
tasks_lock = threading.Lock()
app = FastAPI()

_pipeline = None
_pipeline_lock = threading.Lock()

def get_pipeline():
    global _pipeline
    if _pipeline: return _pipeline
    with _pipeline_lock:
        if _pipeline: return _pipeline
        import torch
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        if vram_gb >= 23:
            model_id = "microsoft/TRELLIS.2-4B"
            from trellis.pipelines import Trellis2ImageTo3DPipeline as Pipeline
        else:
            model_id = "JeffreyXiang/TRELLIS-image-large"
            from trellis.pipelines import TrellisImageTo3DPipeline as Pipeline
        print(f"[TRELLIS] VRAM={vram_gb:.1f}GB → loading {model_id}...", flush=True)
        _pipeline = Pipeline.from_pretrained(model_id)
        _pipeline.cuda()
        print("[TRELLIS] Ready!", flush=True)
        return _pipeline

def _run(task_id, image_bytes, sparse_steps, slat_steps, seed):
    try:
        import torch
        from PIL import Image
        with tasks_lock:
            tasks[task_id]["status"] = "IN_PROGRESS"
            tasks[task_id]["progress"] = 10

        img = Image.open(BytesIO(image_bytes)).convert("RGBA")
        pipe = get_pipeline()
        with tasks_lock: tasks[task_id]["progress"] = 20

        with torch.inference_mode():
            outputs = pipe.run(
                img, seed=seed,
                sparse_structure_sampler_params={"steps": sparse_steps, "cfg_strength": 7.5},
                slat_sampler_params={"steps": slat_steps, "cfg_strength": 3.0},
            )
        with tasks_lock: tasks[task_id]["progress"] = 85

        glb_path = OUTPUT_DIR / f"{task_id}.glb"
        outputs[0].export(str(glb_path))

        with tasks_lock:
            tasks[task_id].update({"status": "SUCCEEDED", "progress": 100, "glb_path": str(glb_path)})
        print(f"[TRELLIS] Done: {glb_path}", flush=True)

    except Exception as e:
        traceback.print_exc()
        with tasks_lock:
            tasks[task_id].update({"status": "FAILED", "error": str(e)})

class GenReq(BaseModel):
    image_data: str
    sparse_steps: int = 25
    slat_steps: int = 25
    seed: int = 42

@app.get("/health")
def health(): return {"ok": True}

@app.post("/generate")
def generate(req: GenReq):
    try:
        image_bytes = base64.b64decode(req.image_data)
    except Exception:
        raise HTTPException(400, "Invalid base64")
    task_id = str(uuid.uuid4())
    with tasks_lock:
        tasks[task_id] = {"status": "PENDING", "progress": 0, "glb_path": None, "error": None}
    threading.Thread(target=_run, args=(task_id, image_bytes, req.sparse_steps, req.slat_steps, req.seed), daemon=True).start()
    return {"task_id": task_id}

@app.get("/status/{task_id}")
def status(task_id: str):
    with tasks_lock: task = tasks.get(task_id)
    if not task: raise HTTPException(404, "Not found")
    resp = {"id": task_id, "status": task["status"], "progress": task["progress"]}
    if task["status"] == "SUCCEEDED":
        resp["model_urls"] = {"glb": f"/result/{task_id}"}
    if task["error"]:
        resp["task_error"] = {"message": task["error"]}
    return resp

@app.get("/result/{task_id}")
def result(task_id: str):
    with tasks_lock: task = tasks.get(task_id)
    if not task or task["status"] != "SUCCEEDED": raise HTTPException(400, "Not ready")
    return FileResponse(task["glb_path"], media_type="model/gltf-binary", filename=f"{task_id}.glb")
PYEOF

# ── 6. Create start script ────────────────────────────────────────────────────
echo "[6/6] Creating start script..."
cat > /workspace/start_trellis.sh << 'EOF'
#!/bin/bash
echo "Starting TRELLIS.2 service on port 8765..."
cd /workspace
python -m uvicorn trellis_api:app --host 0.0.0.0 --port 8765 --log-level info
EOF
chmod +x /workspace/start_trellis.sh

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Setup complete!                                 ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Now run:  bash /workspace/start_trellis.sh      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
