"""Audio loading, normalisation and quality check for reference recordings."""
from __future__ import annotations

import io
import shutil
import subprocess
import tempfile
from math import gcd
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from .errors import CodedError

TARGET_SR = 24_000
MAX_SECONDS = 30.0
MIN_SECONDS = 3.0


class AudioError(CodedError):
    pass


def _decode_with_ffmpeg(data: bytes) -> tuple[np.ndarray, int]:
    if not shutil.which("ffmpeg"):
        raise AudioError("unsupported_format")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "in.bin"
        dst = Path(tmp) / "out.wav"
        src.write_bytes(data)
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", str(TARGET_SR), str(dst)],
            capture_output=True,
        )
        if proc.returncode != 0 or not dst.exists():
            raise AudioError("unreadable")
        y, sr = sf.read(dst, dtype="float32", always_2d=False)
        return y, sr


def decode(data: bytes) -> tuple[np.ndarray, int]:
    try:
        y, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=False)
    except Exception:
        y, sr = _decode_with_ffmpeg(data)
    return y, sr


def to_mono_24k(y: np.ndarray, sr: int) -> np.ndarray:
    if y.ndim > 1:
        y = y.mean(axis=1)
    y = np.nan_to_num(y.astype(np.float32))
    if sr != TARGET_SR:
        g = gcd(sr, TARGET_SR)
        y = resample_poly(y, TARGET_SR // g, sr // g).astype(np.float32)
    return y


def _frame_rms(y: np.ndarray, frame: int = 480) -> np.ndarray:
    n = len(y) // frame
    if n == 0:
        return np.array([float(np.sqrt(np.mean(y**2))) if len(y) else 0.0])
    frames = y[: n * frame].reshape(n, frame)
    return np.sqrt(np.mean(frames**2, axis=1))


def trim_silence(y: np.ndarray, threshold_db: float = -45.0, pad_s: float = 0.15) -> np.ndarray:
    frame = 480
    rms = _frame_rms(y, frame)
    if len(rms) <= 1:
        return y
    db = 20 * np.log10(np.maximum(rms, 1e-8))
    loud = np.where(db > threshold_db)[0]
    if len(loud) == 0:
        return y
    pad = int(pad_s * TARGET_SR)
    start = max(0, loud[0] * frame - pad)
    end = min(len(y), (loud[-1] + 1) * frame + pad)
    return y[start:end]


def prepare_reference(data: bytes) -> np.ndarray:
    """Bytes -> mono 24 kHz, no silence at the edges, max. 30 s, peak at -1 dBFS."""
    y, sr = decode(data)
    y = to_mono_24k(y, sr)
    if len(y) < TARGET_SR // 2:
        raise AudioError("empty_audio")
    y = trim_silence(y)
    y = y[: int(MAX_SECONDS * TARGET_SR)]
    peak = float(np.max(np.abs(y))) if len(y) else 0.0
    if peak < 1e-4:
        raise AudioError("silent_audio")
    return (y * (0.89 / peak)).astype(np.float32)


def analyze(y: np.ndarray, original_peak: float | None = None) -> dict:
    """Quality metrics and hints. `y` is already mono 24 kHz."""
    duration = len(y) / TARGET_SR
    rms = _frame_rms(y)
    db = 20 * np.log10(np.maximum(rms, 1e-8))
    speech_db = float(np.percentile(db, 90))
    noise_db = float(np.percentile(db, 10))
    snr = speech_db - noise_db
    clip_frac = float(np.mean(np.abs(y) > 0.985))
    issues: list[dict] = []

    if duration < MIN_SECONDS:
        issues.append({"level": "bad", "code": "too_short"})
    elif duration < 8:
        issues.append({"level": "warn", "code": "short"})
    if clip_frac > 0.002:
        issues.append({"level": "bad", "code": "clipping"})
    if speech_db < -38:
        issues.append({"level": "warn", "code": "quiet"})
    if snr < 15:
        issues.append({"level": "bad", "code": "noisy"})
    elif snr < 25:
        issues.append({"level": "warn", "code": "some_noise"})

    if any(i["level"] == "bad" for i in issues):
        verdict = "poor"
    elif issues:
        verdict = "ok"
    else:
        verdict = "good"
    return {
        "duration": round(duration, 2),
        "snr_db": round(snr, 1),
        "level_db": round(speech_db, 1),
        "clipping": round(clip_frac, 5),
        "verdict": verdict,
        "issues": issues,
    }


def write_wav(path: Path, y: np.ndarray) -> None:
    sf.write(str(path), y, TARGET_SR, subtype="PCM_16")
