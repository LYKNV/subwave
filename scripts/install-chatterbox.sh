#!/usr/bin/env bash
# install-chatterbox.sh — opt-in installer for the Chatterbox Turbo TTS engine.
#
# Chatterbox is the fourth TTS engine alongside Piper / Kokoro / Cloud. It is
# NOT baked into the default Docker image because the model is ~1-2 GB and the
# CPU performance is far slower than Piper or Kokoro — most operators on a
# homelab don't need it. Run this once on the host where you want it, then add
# the bind mounts shown below to docker-compose.prod.yml and restart the
# controller.
#
# Usage:
#   scripts/install-chatterbox.sh             # ONNX runtime (CPU, default)
#   scripts/install-chatterbox.sh --gpu       # ONNX runtime (GPU, onnxruntime-gpu)
#   scripts/install-chatterbox.sh --torch     # PyTorch backend (CUDA-capable)
#
# What this does:
#   1. Creates a Python venv at /opt/chatterbox/venv.
#   2. Installs onnxruntime (+ chatterbox-onnx + soundfile + numpy) OR torch
#      + chatterbox-tts depending on the flag.
#   3. Downloads the model weights from Hugging Face into /opt/chatterbox/models.
#   4. Creates /opt/chatterbox/voices for per-persona reference WAVs.
#   5. Appends CHATTERBOX_* env vars to controller/.env if not already present.
#
# After running:
#   - Add the following two lines to docker-compose.prod.yml under
#     `services.controller.volumes`:
#       - /opt/chatterbox:/opt/chatterbox:ro
#       - /opt/chatterbox/voices:/opt/chatterbox/voices:ro
#   - Restart the controller: `docker compose -f docker/docker-compose.prod.yml \
#       up -d --build controller`
#   - Open the admin Settings page → Voice engine → switch Default to Chatterbox,
#     or assign it to a single persona on the Personas page.

set -euo pipefail

BACKEND="onnx"
GPU=0
for arg in "$@"; do
  case "$arg" in
    --gpu)   GPU=1 ;;
    --torch) BACKEND="torch" ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | grep -v '^set -euo' | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

INSTALL_ROOT="${CHATTERBOX_ROOT:-/opt/chatterbox}"
VENV="$INSTALL_ROOT/venv"
MODELS="$INSTALL_ROOT/models"
VOICES="$INSTALL_ROOT/voices"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_SRC="$REPO_ROOT/controller/scripts/chatterbox_worker.py"
ENV_FILE="$REPO_ROOT/controller/.env"

echo "[chatterbox] install root: $INSTALL_ROOT"
echo "[chatterbox] backend: $BACKEND (gpu=$GPU)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[chatterbox] python3 not found on PATH — install it first (apt install python3-venv on Debian/Ubuntu)" >&2
  exit 1
fi

sudo mkdir -p "$INSTALL_ROOT" "$MODELS" "$VOICES"
sudo chown -R "$USER" "$INSTALL_ROOT"

if [ ! -x "$VENV/bin/python" ]; then
  echo "[chatterbox] creating venv at $VENV"
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install --upgrade pip >/dev/null

echo "[chatterbox] installing Python deps ($BACKEND backend)"
if [ "$BACKEND" = "onnx" ]; then
  if [ "$GPU" = 1 ]; then
    "$VENV/bin/pip" install onnxruntime-gpu soundfile numpy
  else
    "$VENV/bin/pip" install onnxruntime soundfile numpy
  fi
  # The ResembleAI ONNX wrapper. If a different package name is published in
  # the future, override with CHATTERBOX_PIP_PKG=...
  "$VENV/bin/pip" install "${CHATTERBOX_PIP_PKG:-chatterbox-onnx}"
else
  # PyTorch backend — the reference `chatterbox-tts` package.
  if [ "$GPU" = 1 ]; then
    "$VENV/bin/pip" install --index-url https://download.pytorch.org/whl/cu121 torch torchaudio
  else
    "$VENV/bin/pip" install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  fi
  "$VENV/bin/pip" install chatterbox-tts soundfile numpy
fi

# Download model weights into $MODELS. The chatterbox_onnx / chatterbox-tts
# packages will pull from HF on first use if MODEL_DIR is empty — but pre-warming
# avoids a multi-GB download on the first DJ link.
echo "[chatterbox] pre-fetching model weights into $MODELS"
if [ "$BACKEND" = "onnx" ]; then
  "$VENV/bin/python" - <<PY
import os
from huggingface_hub import snapshot_download
snapshot_download(repo_id="ResembleAI/chatterbox-turbo-ONNX", local_dir=os.environ["MODELS"])
PY
else
  "$VENV/bin/python" - <<PY
from huggingface_hub import snapshot_download
import os
snapshot_download(repo_id="ResembleAI/chatterbox-turbo", local_dir=os.environ["MODELS"])
PY
fi

# Append CHATTERBOX_* env vars to controller/.env (only if missing). The
# controller reads these on next boot — see controller/src/config.ts.
append_env() {
  local key="$1"
  local val="$2"
  if [ -f "$ENV_FILE" ] && grep -q "^${key}=" "$ENV_FILE"; then
    echo "[chatterbox] $key already set in $ENV_FILE — leaving as-is"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "[chatterbox] wrote $key to $ENV_FILE"
  fi
}

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
append_env CHATTERBOX_PYTHON "$VENV/bin/python"
append_env CHATTERBOX_WORKER "/app/scripts/chatterbox_worker.py"
append_env CHATTERBOX_MODEL_DIR "/opt/chatterbox/models"
append_env CHATTERBOX_VOICE_DIR "/opt/chatterbox/voices"
append_env CHATTERBOX_BACKEND "$BACKEND"
if [ "$GPU" = 1 ]; then
  append_env CHATTERBOX_DEVICE "cuda"
else
  append_env CHATTERBOX_DEVICE "cpu"
fi

if [ -f "$WORKER_SRC" ]; then
  echo "[chatterbox] worker script ships in the controller image at /app/scripts/chatterbox_worker.py — no host copy needed."
else
  echo "[chatterbox] warning: $WORKER_SRC not found — make sure your controller image is built from this checkout." >&2
fi

cat <<EOM

[chatterbox] install complete.

Next steps:
  1. Add bind mounts to docker/docker-compose.prod.yml under controller.volumes:
       - /opt/chatterbox:/opt/chatterbox:ro
       - /opt/chatterbox/voices:/opt/chatterbox/voices:ro
  2. Rebuild + restart the controller:
       docker compose -f docker/docker-compose.prod.yml up -d --build controller
  3. Drop reference WAVs (5+ seconds of clean speech) into:
       $VOICES
  4. Open the admin UI → Settings → Voice engine, switch to Chatterbox or
     assign it to a single persona on the Personas page.
EOM
