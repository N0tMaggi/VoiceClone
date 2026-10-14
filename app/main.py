from __future__ import annotations

import random
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import audio, settings, voices
from .engine import engine
from .emotions import split_emotions, to_model_texts
from .errors import CodedError, message
from .languages import default_voice, is_speech_lang
from .prompts import PROMPTS

ROOT = Path(__file__).resolve().parent.parent
MAX_UPLOAD = 60 * 1024 * 1024


@asynccontextmanager
async def lifespan(_: FastAPI):
    engine.start_loading()
    yield


app = FastAPI(title="VoiceClone", lifespan=lifespan)


@app.exception_handler(CodedError)
async def coded_error(request: Request, exc: CodedError):
    lang = request.headers.get("x-lang", "de")
    return JSONResponse({"detail": message(lang, exc.code, **exc.kw), "code": exc.code}, status_code=exc.status)


# ---------- Status, settings, texts ----------

@app.get("/api/status")
def status():
    return engine.info()


@app.get("/api/prompts")
def prompts():
    return PROMPTS


@app.get("/api/settings")
def get_settings():
    return settings.load()


class SettingsPatch(BaseModel):
    lang: str | None = None
    gen_lang: str | None = None
    disclaimer: dict | None = None
    reset_disclaimer: bool = False


@app.put("/api/settings")
def put_settings(body: SettingsPatch):
    patch = body.model_dump(exclude_unset=True)
    if patch.pop("reset_disclaimer", False):
        patch["disclaimer"] = None
    return settings.update(patch)


def gpu_info() -> dict | None:
    """GPU usage, but only once torch has finished importing.

    While the model loads, the loader thread imports torch. Touching the half-initialised module from here
    raises AttributeError (a race right after startup), hence nothing is read before the "warming" state.
    """
    import sys

    torch = sys.modules.get("torch")
    if torch is None or engine.state not in ("warming", "ready"):
        return None
    try:
        if not torch.cuda.is_available():
            return None
        free, total = torch.cuda.mem_get_info()
        return {"name": torch.cuda.get_device_name(0), "total": total, "used": total - free}
    except Exception:  # noqa: BLE001 - a status readout must never break the app
        return None


@app.get("/api/system")
def system():
    return {
        "engine": engine.info(),
        "voices": len(voices.list_voices()),
        "clips": len(voices.load_history()),
        "bytes": voices.storage_bytes(),
        "gpu": gpu_info(),
    }


@app.get("/api/builtin-voices")
def builtin_voices():
    return engine.builtin_voices()


# ---------- Voices ----------

@app.get("/api/voices")
def list_voices():
    return voices.list_voices()


async def _read_sample(file: UploadFile) -> tuple:
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise CodedError("too_large", 413)
    y = audio.prepare_reference(data)
    analysis = audio.analyze(y)
    if analysis["duration"] < audio.MIN_SECONDS:
        raise CodedError("too_short", d=f"{analysis['duration']:.1f}", m=f"{audio.MIN_SECONDS:.0f}")
    return y, analysis


@app.post("/api/voices")
async def create_voice(name: str = Form(...), language: str = Form("en"), file: UploadFile = File(...)):
    y, analysis = await _read_sample(file)
    return {"voice": voices.create_voice(name, language, y, analysis), "analysis": analysis}


@app.post("/api/voices/{voice_id}/samples")
async def add_sample(voice_id: str, label: str = Form("Sample"), file: UploadFile = File(...)):
    if not voices.get_voice(voice_id):
        raise CodedError("voice_not_found", 404)
    y, analysis = await _read_sample(file)
    return {"voice": voices.add_sample(voice_id, y, analysis, label), "analysis": analysis}


class SamplePatch(BaseModel):
    label: str | None = Field(default=None, max_length=60)
    enabled: bool | None = None


@app.patch("/api/voices/{voice_id}/samples/{sid}")
def patch_sample(voice_id: str, sid: str, body: SamplePatch):
    return voices.update_sample(voice_id, sid, body.label, body.enabled)


@app.delete("/api/voices/{voice_id}/samples/{sid}")
def remove_sample(voice_id: str, sid: str):
    return voices.delete_sample(voice_id, sid)


@app.get("/api/voices/{voice_id}/samples/{sid}/audio")
def sample_audio(voice_id: str, sid: str):
    p = voices.sample_path(voice_id, sid)
    if not p:
        raise CodedError("sample_not_found", 404)
    return FileResponse(p, media_type="audio/wav")


class Rename(BaseModel):
    name: str = Field(min_length=1, max_length=60)


@app.patch("/api/voices/{voice_id}")
def rename_voice(voice_id: str, body: Rename):
    meta = voices.rename_voice(voice_id, body.name)
    if not meta:
        raise CodedError("voice_not_found", 404)
    return meta


@app.delete("/api/voices/{voice_id}")
def delete_voice(voice_id: str):
    if not voices.delete_voice(voice_id):
        raise CodedError("voice_not_found", 404)
    return {"ok": True}


@app.get("/api/voices/{voice_id}/audio")
def voice_audio(voice_id: str):
    p = voices.reference_path(voice_id)
    if not p:
        raise CodedError("voice_not_found", 404)
    return FileResponse(p, media_type="audio/wav")


class IdList(BaseModel):
    ids: list[str] = Field(max_length=500)


@app.post("/api/voices/delete")
def delete_voices(body: IdList):
    return {"deleted": voices.delete_voices_many(body.ids)}


# ---------- Generation & history ----------

class GenerateIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice_id: str | None = None
    builtin: str | None = None
    language: str = "en"
    expressive: bool = False
    # Fine controls (None = model default)
    speed: float = Field(1.0, ge=0.5, le=2.0)
    temperature: float | None = Field(None, ge=0.1, le=1.5)
    top_p: float | None = Field(None, ge=0.1, le=1.0)
    top_k: int | None = Field(None, ge=1, le=500)
    pause_scale: float = Field(1.0, ge=0.0, le=3.0)
    seed: int | None = Field(None, ge=0, le=2**31 - 1)
    ref_prompt: bool | None = None
    split_emotions: bool = True  # False: whole text in one pass (tags passed to the model unchanged)


@app.post("/api/generate")
def generate(body: GenerateIn):
    ref = None
    lang = body.language if is_speech_lang(body.language) else "en"
    voice_name = default_voice(lang)  # default built-in voice for this language
    if body.voice_id:
        p = voices.reference_path(body.voice_id)
        meta = voices.get_voice(body.voice_id)
        if not p or not meta:
            raise CodedError("voice_not_found", 404)
        ref, voice_name = str(p), meta["name"]
    builtin = body.builtin if body.builtin in engine.builtin_voices() else None
    if not ref and builtin:
        voice_name = builtin
    if engine.state != "ready":
        raise CodedError("engine_not_ready", 503)
    parts = split_emotions(body.text) if body.split_emotions else [(None, body.text.strip())]  # switch: every section is generated on its own with its own leading tag
    if not parts:
        raise CodedError("no_text")
    seed = body.seed if body.seed is not None else random.randint(0, 2**31 - 1)  # always keep the seed so a take can be repeated
    try:
        y, took = engine.generate(
            body.text.strip(), ref, lang, body.expressive, builtin,
            temperature=body.temperature, top_p=body.top_p, top_k=body.top_k, pause_scale=body.pause_scale,
            seed=seed, ref_prompt=body.ref_prompt, speed=body.speed,
            segments=to_model_texts(parts) if len(parts) > 1 else None)
    except Exception as exc:  # noqa: BLE001
        raise CodedError("gen_failed", 500, err=f"{type(exc).__name__}: {exc}") from exc
    if y.size == 0:
        raise CodedError("no_audio", 500)
    item_id = uuid.uuid4().hex[:10]
    fname = f"{item_id}.wav"
    import soundfile as sf

    sf.write(str(voices.OUTPUTS / fname), np.clip(y, -1, 1), engine.sample_rate, subtype="PCM_16")
    item = {
        "id": item_id,
        "file": fname,
        "url": f"/api/outputs/{fname}",
        "text": body.text.strip(),
        "voice": voice_name,
        "language": lang,
        "duration": round(len(y) / engine.sample_rate, 2),
        "took": round(took, 2),
        "created": time.time(),
        "fav": False,
        "cloned": bool(ref),
        "seed": seed,
        "segments": len(parts),
        "params": {
            "expressive": body.expressive, "speed": body.speed, "temperature": body.temperature, "top_p": body.top_p,
            "top_k": body.top_k, "pause_scale": body.pause_scale, "ref_prompt": body.ref_prompt, "split_emotions": body.split_emotions,
        },
    }
    voices.add_history(item)
    return item


@app.get("/api/history")
def history():
    return voices.load_history()


class HistoryPatch(BaseModel):
    fav: bool


@app.patch("/api/history/{item_id}")
def patch_history(item_id: str, body: HistoryPatch):
    item = voices.update_history(item_id, fav=body.fav)
    if not item:
        raise CodedError("item_not_found", 404)
    return item


@app.post("/api/history/delete")
def delete_history_many(body: IdList):
    return {"deleted": voices.remove_history_many(body.ids)}


@app.delete("/api/history/{item_id}")
def delete_history(item_id: str):
    if not voices.remove_history(item_id):
        raise CodedError("item_not_found", 404)
    return {"ok": True}


@app.get("/api/outputs/{fname}")
def output(fname: str):
    if "/" in fname or "\\" in fname or not fname.endswith(".wav"):
        raise CodedError("not_found", 404)
    p = voices.OUTPUTS / fname
    if not p.exists():
        raise CodedError("not_found", 404)
    return FileResponse(p, media_type="audio/wav")


class NoCacheStatic(StaticFiles):
    """The browser revalidates via ETag on every load, so stale app.js/style.css can no longer be served."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache"
        return response


app.mount("/", NoCacheStatic(directory=ROOT / "static", html=True), name="static")
