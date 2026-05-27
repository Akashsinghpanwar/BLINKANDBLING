#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Start the TRELLIS.2 microservice
# Run this inside WSL2 (Linux) with the trellis2 conda env active.
#
# Usage:
#   cd app/trellis-service
#   conda activate trellis2
#   bash start.sh
#
# Or point to a different TRELLIS.2 repo clone:
#   TRELLIS_REPO_PATH=/path/to/TRELLIS.2 bash start.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default: TRELLIS.2 cloned next to this service
export TRELLIS_REPO_PATH="${TRELLIS_REPO_PATH:-$SCRIPT_DIR/TRELLIS.2}"
export TRELLIS_OUTPUT_DIR="${TRELLIS_OUTPUT_DIR:-$SCRIPT_DIR/outputs}"
export TRELLIS_PORT="${TRELLIS_PORT:-8765}"

echo "TRELLIS_REPO_PATH : $TRELLIS_REPO_PATH"
echo "TRELLIS_OUTPUT_DIR: $TRELLIS_OUTPUT_DIR"
echo "Port              : $TRELLIS_PORT"

if [ ! -d "$TRELLIS_REPO_PATH" ]; then
  echo ""
  echo "TRELLIS.2 repo not found at $TRELLIS_REPO_PATH"
  echo "Clone it first:"
  echo "  git clone https://github.com/microsoft/TRELLIS.2.git $TRELLIS_REPO_PATH"
  echo "  cd $TRELLIS_REPO_PATH && bash setup.sh --new-env --basic --xformers --flash-attn \\"
  echo "       --diffoctreerast --vox2seq --spconv --mipgaussian --kaolin --nvdiffrast"
  exit 1
fi

pip install -q fastapi uvicorn pillow

python "$SCRIPT_DIR/main.py"
