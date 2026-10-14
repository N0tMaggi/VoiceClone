"""Hugging Face offline mode, enabled as soon as all models are available locally.

Without it every start asks Hugging Face for updates ("Fetching 107 files", missing-token warning).
Must run BEFORE the first import of huggingface_hub/transformers (they read the variable at import time).

VOICECLONE_OFFLINE: auto (default) | 1 (always offline) | 0 (always online, e.g. for model updates).
"""
from __future__ import annotations

import os
from pathlib import Path

# repo -> files that are all present only after a finished download (including the large weights)
REQUIRED: dict[str, list[str]] = {
    "KittenML/kitten-tts-2": ["config.json", "lm/model-ternary.safetensors"],
    "openai/whisper-large-v3": ["config.json", "model.safetensors", "tokenizer.json", "preprocessor_config.json"],
    "ResembleAI/chatterbox-turbo": ["s3gen_meanflow.safetensors"],
}


def hub_cache() -> Path:
    if os.environ.get("HF_HUB_CACHE"):
        return Path(os.environ["HF_HUB_CACHE"])
    if os.environ.get("HF_HOME"):
        return Path(os.environ["HF_HOME"]) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"


def all_cached(cache: Path | None = None) -> bool:
    cache = cache or hub_cache()
    for repo, files in REQUIRED.items():
        snaps = cache / f"models--{repo.replace('/', '--')}" / "snapshots"
        if not snaps.is_dir() or not any(all((s / f).exists() for f in files) for s in snaps.iterdir() if s.is_dir()):
            return False
    return True


def enable_if_cached() -> bool:
    """Set HF_HUB_OFFLINE when appropriate. Returns whether the app runs offline."""
    if os.environ.get("HF_HUB_OFFLINE") == "1":
        return True
    mode = os.environ.get("VOICECLONE_OFFLINE", "auto").lower()
    if mode in ("0", "false", "off"):
        return False
    # Other weight/decoder variants may not be downloaded: do not go offline automatically then.
    default_variant = os.environ.get("VOICECLONE_WEIGHTS", "packed") == "packed" and os.environ.get("VOICECLONE_DECODER", "default") == "default"
    if mode in ("1", "true", "on") or (default_variant and all_cached()):
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        return True
    return False


OFFLINE = enable_if_cached()
