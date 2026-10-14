"""Voice library (voice = collection of samples) and generation history on disk.

The model does not train: it gets ONE reference (5-30 s) per request. For every voice, `reference.wav` is therefore
built from its active samples: best samples first, up to 30 s.
"""
from __future__ import annotations

import json
import re
import shutil
import time
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf

from . import audio
from .errors import CodedError
from .languages import is_speech_lang

DATA = Path(__file__).resolve().parent.parent / "data"
VOICES = DATA / "voices"
OUTPUTS = DATA / "outputs"
HISTORY = OUTPUTS / "history.json"
GAP_S = 0.25
MIN_ROOM_S = 2.0
RANK = {"good": 0, "ok": 1, "poor": 2}

for _p in (VOICES, OUTPUTS):
    _p.mkdir(parents=True, exist_ok=True)


class VoiceError(CodedError):
    pass


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "stimme"


def _valid_id(x: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9-]+", x or ""))


def _vdir(voice_id: str) -> Path:
    return VOICES / voice_id


def _read(voice_id: str) -> dict | None:
    if not _valid_id(voice_id):
        return None
    p = _vdir(voice_id) / "meta.json"
    if not p.exists():
        return None
    try:
        meta = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if "samples" not in meta:  # voice from the first version: reference.wav becomes the first sample
        _migrate(meta)
    return meta


def _write(meta: dict) -> None:
    (_vdir(meta["id"]) / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def _migrate(meta: dict) -> None:
    d = _vdir(meta["id"])
    (d / "samples").mkdir(exist_ok=True)
    old = d / "reference.wav"
    sid = "s1"
    if old.exists():
        shutil.copy2(old, d / "samples" / f"{sid}.wav")
    meta["samples"] = [{
        "id": sid, "label": "Erste Aufnahme", "created": meta.get("created", time.time()),
        "duration": meta.get("duration", 0), "verdict": meta.get("verdict", "ok"),
        "snr_db": 20.0, "enabled": True,
    }]
    _rebuild(meta)


def _sample_path(voice_id: str, sid: str) -> Path:
    return _vdir(voice_id) / "samples" / f"{sid}.wav"


def _rebuild(meta: dict) -> None:
    """Build reference.wav from the active samples (best first, max. 30 s) and update the metadata."""
    sr = audio.TARGET_SR
    active = sorted((s for s in meta["samples"] if s["enabled"]),
                    key=lambda s: (RANK.get(s["verdict"], 1), -s.get("snr_db", 0)))
    parts: list[np.ndarray] = []
    used: list[str] = []
    total = 0
    gap = np.zeros(int(GAP_S * sr), np.float32)
    for s in active:
        room = audio.MAX_SECONDS * sr - total
        if parts and room < MIN_ROOM_S * sr:
            break
        y, _ = sf.read(_sample_path(meta["id"], s["id"]), dtype="float32")
        y = y[: int(room)]
        parts += [y, gap]
        used.append(s["id"])
        total += len(y) + len(gap)
    for s in meta["samples"]:
        s["used"] = s["id"] in used
    if not parts:
        raise VoiceError("min_one_active")
    ref = np.concatenate(parts[:-1])
    audio.write_wav(_vdir(meta["id"]) / "reference.wav", ref)
    meta["duration"] = round(len(ref) / sr, 2)
    meta["verdict"] = min((s["verdict"] for s in active if s["id"] in used), key=lambda v: RANK.get(v, 1))
    _write(meta)


def _sample_entry(sid: str, label: str, analysis: dict) -> dict:
    return {
        "id": sid, "label": label.strip()[:60] or "Sample", "created": time.time(),
        "duration": analysis["duration"], "verdict": analysis["verdict"],
        "snr_db": analysis["snr_db"], "enabled": True,
    }


def list_voices() -> list[dict]:
    out = [m for d in VOICES.iterdir() if d.is_dir() and (m := _read(d.name))]
    out.sort(key=lambda v: v.get("created", 0), reverse=True)
    return out


def get_voice(voice_id: str) -> dict | None:
    return _read(voice_id)


def reference_path(voice_id: str) -> Path | None:
    if not _valid_id(voice_id) or not _read(voice_id):
        return None
    p = _vdir(voice_id) / "reference.wav"
    return p if p.exists() else None


def sample_path(voice_id: str, sid: str) -> Path | None:
    if not _valid_id(voice_id) or not _valid_id(sid):
        return None
    p = _sample_path(voice_id, sid)
    return p if p.exists() else None


def create_voice(name: str, language: str, y: np.ndarray, analysis: dict) -> dict:
    voice_id = f"{_slug(name)}-{uuid.uuid4().hex[:6]}"
    d = _vdir(voice_id)
    (d / "samples").mkdir(parents=True)
    audio.write_wav(d / "samples" / "s1.wav", y)
    meta = {
        "id": voice_id, "name": name.strip()[:60] or "Stimme",
        "language": language if is_speech_lang(language) else "en", "created": time.time(),
        "samples": [_sample_entry("s1", "Erste Aufnahme", analysis)],
    }
    _rebuild(meta)
    return meta


def add_sample(voice_id: str, y: np.ndarray, analysis: dict, label: str) -> dict:
    meta = _read(voice_id)
    if not meta:
        raise VoiceError("voice_not_found", 404)
    sid = f"s{uuid.uuid4().hex[:6]}"
    audio.write_wav(_sample_path(voice_id, sid), y)
    meta["samples"].append(_sample_entry(sid, label, analysis))
    _rebuild(meta)
    return meta


def update_sample(voice_id: str, sid: str, label: str | None, enabled: bool | None) -> dict:
    meta = _read(voice_id)
    s = next((x for x in meta["samples"] if x["id"] == sid), None) if meta else None
    if not s:
        raise VoiceError("sample_not_found", 404)
    if label is not None:
        s["label"] = label.strip()[:60] or s["label"]
    if enabled is not None:
        s["enabled"] = enabled
    _rebuild(meta)
    return meta


def delete_sample(voice_id: str, sid: str) -> dict:
    meta = _read(voice_id)
    if not meta or not any(x["id"] == sid for x in meta["samples"]):
        raise VoiceError("sample_not_found", 404)
    if len(meta["samples"]) == 1:
        raise VoiceError("last_sample")
    meta["samples"] = [x for x in meta["samples"] if x["id"] != sid]
    _sample_path(voice_id, sid).unlink(missing_ok=True)
    if not any(x["enabled"] for x in meta["samples"]):
        meta["samples"][0]["enabled"] = True
    _rebuild(meta)
    return meta


def rename_voice(voice_id: str, name: str) -> dict | None:
    meta = _read(voice_id)
    if not meta:
        return None
    meta["name"] = name.strip()[:60] or meta["name"]
    _write(meta)
    return meta


def delete_voice(voice_id: str) -> bool:
    if not _valid_id(voice_id) or not _vdir(voice_id).exists():
        return False
    shutil.rmtree(_vdir(voice_id))
    return True


def delete_voices_many(ids: list[str]) -> int:
    return sum(1 for i in ids if delete_voice(i))


# ---------- History ----------

def load_history() -> list[dict]:
    if not HISTORY.exists():
        return []
    try:
        return json.loads(HISTORY.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_history(items: list[dict]) -> None:
    HISTORY.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def add_history(item: dict) -> None:
    items = load_history()
    items.insert(0, item)
    for old in items[500:]:
        (OUTPUTS / old["file"]).unlink(missing_ok=True)
    save_history(items[:500])


def update_history(item_id: str, **fields) -> dict | None:
    items = load_history()
    for i in items:
        if i["id"] == item_id:
            i.update(fields)
            save_history(items)
            return i
    return None


def remove_history(item_id: str) -> bool:
    items = load_history()
    keep = [i for i in items if i["id"] != item_id]
    if len(keep) == len(items):
        return False
    for i in items:
        if i["id"] == item_id:
            (OUTPUTS / i["file"]).unlink(missing_ok=True)
    save_history(keep)
    return True


def remove_history_many(ids: list[str]) -> int:
    return sum(1 for i in ids if remove_history(i))


def storage_bytes() -> int:
    return sum(f.stat().st_size for f in DATA.rglob("*") if f.is_file())
