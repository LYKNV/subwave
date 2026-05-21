#!/usr/bin/env python3
"""
Chatterbox TTS worker — line-protocol child process.

The Node side (controller/src/audio/chatterbox.ts) spawns this once and keeps
it alive, because loading the Chatterbox Turbo model takes 5-15 seconds and we
don't want to eat that on every DJ link. Protocol is one JSON object per line
over stdin/stdout, identical in shape to kokoro_worker.py.

Request:  {"id": "...", "text": "...", "out": "/path/to.wav",
           "reference_wav": "/optional/reference.wav",
           "exaggeration": 0.5, "cfg_weight": 0.5}
Response: {"id": "...", "ok": true,  "path": "/path/to.wav", "duration_s": 3.4}
       |  {"id": "...", "ok": false, "error": "..."}

Backend selection:
  CHATTERBOX_BACKEND=onnx  (default) — uses chatterbox_onnx (ONNX runtime).
                                       Smaller, faster cold-start, no PyTorch.
  CHATTERBOX_BACKEND=torch         — uses the PyTorch `chatterbox-tts` package.
                                       Required for CUDA acceleration on GPU.

We try the requested backend first, then fall back to the other if its
dependencies aren't installed — keeps install scripts forgiving.
"""

import json
import os
import sys
import traceback
from pathlib import Path

BACKEND = os.environ.get("CHATTERBOX_BACKEND", "onnx").lower()
DEVICE = os.environ.get("CHATTERBOX_DEVICE", "cpu").lower()
MODEL_DIR = os.environ.get("CHATTERBOX_MODEL_DIR", "/opt/chatterbox/models")
DEFAULT_REFERENCE = os.environ.get("CHATTERBOX_REFERENCE_WAV", "")
DEFAULT_EXAGGERATION = float(os.environ.get("CHATTERBOX_EXAGGERATION", "0.5"))
DEFAULT_CFG_WEIGHT = float(os.environ.get("CHATTERBOX_CFG_WEIGHT", "0.5"))


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def log(msg):
    sys.stderr.write(f"[chatterbox-worker] {msg}\n")
    sys.stderr.flush()


class OnnxBackend:
    """ResembleAI/chatterbox-turbo-ONNX via onnxruntime."""

    def __init__(self):
        from chatterbox_onnx import ChatterboxTTS  # type: ignore
        log(f"loading onnx model from: {MODEL_DIR}")
        # The package accepts either a HF repo id or a local dir. The install
        # script downloads weights to MODEL_DIR so offline operation works.
        self.model = ChatterboxTTS.from_local(MODEL_DIR) if Path(MODEL_DIR).is_dir() \
            else ChatterboxTTS.from_pretrained("ResembleAI/chatterbox-turbo-ONNX")
        self.sample_rate = getattr(self.model, "sr", 24000)

    def generate(self, text, reference_wav, exaggeration, cfg_weight):
        wav = self.model.generate(
            text,
            audio_prompt_path=reference_wav or None,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
        )
        return wav, self.sample_rate


class TorchBackend:
    """Reference PyTorch `chatterbox-tts` package."""

    def __init__(self):
        import torch  # type: ignore
        from chatterbox.tts import ChatterboxTTS  # type: ignore
        device = "cuda" if (DEVICE == "cuda" and torch.cuda.is_available()) else "cpu"
        log(f"loading torch model on device={device}")
        self.model = ChatterboxTTS.from_pretrained(device=device)
        self.sample_rate = self.model.sr
        self.torch = torch

    def generate(self, text, reference_wav, exaggeration, cfg_weight):
        wav = self.model.generate(
            text,
            audio_prompt_path=reference_wav or None,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
        )
        # torch tensor → numpy for soundfile.
        if hasattr(wav, "cpu"):
            wav = wav.cpu().numpy().squeeze()
        return wav, self.sample_rate


def load_backend():
    preferred = OnnxBackend if BACKEND == "onnx" else TorchBackend
    fallback = TorchBackend if BACKEND == "onnx" else OnnxBackend
    try:
        return preferred()
    except Exception as e:
        log(f"preferred backend ({BACKEND}) failed: {e}")
        try:
            log("trying alternate backend")
            return fallback()
        except Exception as e2:
            raise RuntimeError(
                f"both chatterbox backends failed: preferred={e}; alternate={e2}"
            )


def main():
    try:
        import soundfile as sf  # noqa: F401
    except Exception as e:
        emit({"id": None, "ok": False, "fatal": True, "error": f"soundfile import failed: {e}"})
        sys.exit(1)

    try:
        backend = load_backend()
    except Exception as e:
        emit({"id": None, "ok": False, "fatal": True, "error": str(e)})
        sys.exit(1)

    import soundfile as sf
    log("ready")
    emit({"id": None, "ready": True})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = (req.get("text") or "").strip()
            if not text:
                raise ValueError("empty text")
            out = req.get("out")
            if not out:
                raise ValueError("missing 'out' path")
            reference_wav = req.get("reference_wav") or DEFAULT_REFERENCE
            if reference_wav and not Path(reference_wav).is_file():
                log(f"reference_wav not found, falling back to default voice: {reference_wav}")
                reference_wav = ""
            exaggeration = float(req.get("exaggeration") or DEFAULT_EXAGGERATION)
            cfg_weight = float(req.get("cfg_weight") or DEFAULT_CFG_WEIGHT)
            Path(out).parent.mkdir(parents=True, exist_ok=True)

            wav, sr = backend.generate(text, reference_wav, exaggeration, cfg_weight)
            sf.write(out, wav, sr)

            duration = float(len(wav)) / float(sr)
            emit({"id": req_id, "ok": True, "path": out, "duration_s": round(duration, 3)})
        except Exception as e:
            log(f"request failed: {e}\n{traceback.format_exc()}")
            emit({"id": req_id, "ok": False, "error": str(e)})


if __name__ == "__main__":
    main()
