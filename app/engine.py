"""Thin wrapper around KittenTTS 2. Loads the model in the background and serialises generations."""
from __future__ import annotations

import os
import threading
import time

import numpy as np

from . import offline  # noqa: F401  (sets HF_HUB_OFFLINE before anything imports huggingface_hub)
from .languages import default_voice

MODEL_ID = os.environ.get("VOICECLONE_MODEL", "KittenML/kitten-tts-2")
WEIGHTS = os.environ.get("VOICECLONE_WEIGHTS", "packed")  # packed | emb4 | full
DECODER = os.environ.get("VOICECLONE_DECODER", "default")  # default | student_w4


class Engine:
    def __init__(self) -> None:
        self.model = None
        self.state = "idle"  # idle | loading | ready | error
        self.error: str | None = None
        self.device = "?"
        self.sample_rate = 24_000
        self.busy = False
        self._lock = threading.Lock()

    def start_loading(self) -> None:
        if self.state in ("loading", "warming", "ready"):
            return
        self.state = "loading"
        threading.Thread(target=self._load, daemon=True).start()

    def _load(self) -> None:
        try:
            import torch
            from kittenml import KittenTTS

            self.device = "cuda:" + torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"
            kwargs = {}
            if WEIGHTS != "packed":
                kwargs["weights"] = WEIGHTS
            if DECODER != "default":
                kwargs["decoder"] = DECODER
            self.model = KittenTTS(MODEL_ID, **kwargs)
            self.sample_rate = int(getattr(self.model, "sample_rate", 24_000))
            self.state = "warming"
            self._warm_up()
            self.state = "ready"
        except Exception as exc:  # noqa: BLE001 - shown to the user
            self.error = f"{type(exc).__name__}: {exc}"
            self.state = "error"

    def _warm_up(self) -> None:
        """Generate once plainly and once with a reference: loads kernels and Whisper before the first real text."""
        import tempfile

        import soundfile as sf

        try:
            base = self._to_numpy(self.model.generate("Warming up the voice engine.", voice="Bella"))
            with tempfile.TemporaryDirectory() as tmp:
                ref = f"{tmp}/ref.wav"
                sf.write(ref, base, self.sample_rate)
                self.model.generate("Ready.", reference=ref)
            self.change_speed(base[:24000], 1.1)  # compile numba/librosa once so the first time-stretch does not stall
        except Exception:  # noqa: BLE001 - warm-up is optional, the first real request reports real errors
            pass

    def info(self) -> dict:
        return {"state": self.state, "error": self.error, "device": self.device, "model": MODEL_ID,
                "weights": WEIGHTS, "busy": self.busy, "offline": offline.OFFLINE}

    @staticmethod
    def _to_numpy(audio) -> np.ndarray:
        if hasattr(audio, "detach"):
            audio = audio.detach().cpu().numpy()
        return np.asarray(audio, dtype=np.float32).squeeze()

    def builtin_voices(self) -> list[str]:
        try:
            return list(self.model.available_voices) if self.model else []
        except Exception:  # noqa: BLE001
            return []

    def generate(self, text: str, reference: str | None, language: str, expressive: bool = False,
                 builtin: str | None = None, *, temperature: float | None = None, top_p: float | None = None,
                 top_k: int | None = None, pause_scale: float = 1.0, seed: int | None = None,
                 ref_prompt: bool | None = None, speed: float = 1.0,
                 segments: list[str] | None = None, segment_gap: float = 0.28) -> tuple[np.ndarray, float]:
        """Generate `text`, or with `segments` generate every section on its own (emotion switches) and join them."""
        if self.state != "ready" or self.model is None:
            raise RuntimeError("The model is not loaded yet.")
        kwargs: dict = {"normalize": language == "en"}
        if reference:
            kwargs["reference"] = reference
        else:
            kwargs["voice"] = builtin or default_voice(language)
        if expressive:
            kwargs["preset"] = "expressive"
        # Fine controls: only pass what the user actually changed (otherwise the preset values apply)
        for key, val in (("temperature", temperature), ("top_p", top_p), ("top_k", top_k)):
            if val is not None:
                kwargs[key] = val
        if ref_prompt is not None:
            kwargs["use_reference_prompt"] = ref_prompt
        texts = segments or [text]
        with self._lock:  # all sections under one lock: no other request gets in between
            self.busy = True
            try:
                t0 = time.perf_counter()
                wavs = []
                for i, piece in enumerate(texts):
                    kw = dict(kwargs)
                    if seed is not None:
                        kw["advanced"] = {"seed": seed + i}  # section 0 uses exactly `seed`: a single section behaves as before
                    wavs.append(self._to_numpy(self.model.generate(piece, **kw)))
                took = time.perf_counter() - t0
            finally:
                self.busy = False
        y = wavs[0] if len(wavs) == 1 else self.join_segments(wavs, self.sample_rate, segment_gap)
        if abs(pause_scale - 1.0) > 0.01:
            y = self.scale_pauses(y, self.sample_rate, pause_scale)
        if abs(speed - 1.0) > 0.01:
            y = self.change_speed(y, speed)
        return y, took

    @staticmethod
    def join_segments(wavs: list[np.ndarray], sr: int, gap_s: float) -> np.ndarray:
        """Join sections seamlessly: trim edge silence, short fades, an even pause in between."""
        try:
            from kittenml.kittentts2.text import join_chunks

            joined = join_chunks(wavs, sr, gap_s=gap_s)
            if joined is not None:
                return np.asarray(joined, dtype=np.float32)
        except Exception:  # noqa: BLE001 - fallback below
            pass
        gap = np.zeros(int(sr * gap_s), np.float32)
        out = []
        for i, w in enumerate(wavs):
            out.append(w)
            if i != len(wavs) - 1:
                out.append(gap)
        return np.concatenate(out)

    @staticmethod
    def scale_pauses(y: np.ndarray, sr: int, factor: float, min_ms: int = 90) -> np.ndarray:
        """Shorten or stretch speech pauses (comma, sentence end, section seam) by `factor`; the speech stays unchanged.

        The model has no pause control that works for normal texts (its chunk gap only applies from about
        530 characters). So silent stretches are located in the finished audio and scaled. The start and end
        stay untouched.
        """
        frame = max(1, int(sr * 0.01))
        n = len(y) // frame
        if n < 20:
            return y
        rms = np.sqrt(np.mean(y[: n * frame].reshape(n, frame).astype(np.float64) ** 2, axis=1))
        db = 20 * np.log10(rms + 1e-9)
        thr = max(float(np.percentile(db, 90)) - 35.0, -70.0)  # relative to the speech level
        silent = db < thr
        min_frames = max(2, int(min_ms / 10))
        out, i, last = [], 0, 0
        while i < n:
            if not silent[i]:
                i += 1
                continue
            j = i
            while j < n and silent[j]:
                j += 1
            if i > 0 and j < n and (j - i) >= min_frames:  # only pauses in the middle of the flow
                seg = y[i * frame : j * frame]
                out.append(y[last * frame : i * frame])
                target = max(int(len(seg) * factor), 3 * frame)  # never removed entirely: words would stick together
                if target <= len(seg):
                    keep = target // 2  # keep the edges of both sides (smooth transitions)
                    out.append(np.concatenate([seg[:keep], seg[len(seg) - (target - keep):]]))
                else:
                    pad = np.resize(seg[len(seg) // 4 : max(len(seg) // 4 + 1, 3 * len(seg) // 4)], target - len(seg))
                    out.append(np.concatenate([seg[: len(seg) // 2], pad, seg[len(seg) // 2 :]]))
                last = j
            i = j
        out.append(y[last * frame :])
        return np.concatenate(out).astype(np.float32)

    @staticmethod
    def change_speed(y: np.ndarray, rate: float) -> np.ndarray:
        """Change speed without changing pitch (phase vocoder). The model itself has no speed parameter."""
        import librosa  # a hard dependency of kittenml

        return librosa.effects.time_stretch(y.astype(np.float32), rate=float(rate))


engine = Engine()
