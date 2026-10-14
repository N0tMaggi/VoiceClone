"""Feasibility check for KittenTTS 2 (GPU, cloning, German).

Usage:  uv run python scripts/spike.py path/to/your_voice.wav
Writes results to spike_out/ (git-ignored) and prints timings. Then listen to the WAVs:
  clone_en.wav   -> does it sound like you?
  clone_de.wav   -> German text with your clone: German pronunciation? Your timbre?
  builtin_de.wav -> comparison with the built-in German voice
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.utf8 import ensure_utf8_mode  # noqa: E402

ensure_utf8_mode()

import numpy as np
import soundfile as sf
import torch

ref = sys.argv[1] if len(sys.argv) > 1 else None
out = Path("spike_out")
out.mkdir(exist_ok=True)

print("torch", torch.__version__, "| cuda:", torch.cuda.is_available(),
      torch.cuda.get_device_name(0) if torch.cuda.is_available() else "")

from kittenml import KittenTTS  # noqa: E402

t = time.perf_counter()
m = KittenTTS("KittenML/kitten-tts-2")
print(f"Model loaded in {time.perf_counter() - t:.1f}s, sample_rate={m.sample_rate}")
print("Voices:", m.available_voices)


def save(name, text, **kw):
    t0 = time.perf_counter()
    a = m.generate(text, **kw)
    took = time.perf_counter() - t0
    a = a.detach().cpu().numpy() if hasattr(a, "detach") else np.asarray(a)
    a = a.astype(np.float32).squeeze()
    sf.write(out / name, a, m.sample_rate)
    print(f"{name}: type={type(a).__name__} {len(a) / m.sample_rate:.1f}s of audio in {took:.1f}s")


save("builtin_en.wav", "This is a test of the built in voice.", voice="Bella")
save("builtin_de.wav", "Guten Morgen. Das ist ein Test der deutschen Stimme.", voice="German", normalize=False)
if ref:
    save("clone_en.wav", "This is my own voice, speaking English.", reference=ref)
    save("clone_de.wav", "Das ist meine eigene Stimme, und ich spreche Deutsch.", reference=ref, normalize=False)
else:
    print("No reference audio given, cloning test skipped.")
