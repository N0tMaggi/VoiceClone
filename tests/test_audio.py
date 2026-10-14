import io

import numpy as np
import soundfile as sf

from app import audio


def _wav_bytes(y, sr):
    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV")
    return buf.getvalue()


def _speechlike(seconds, sr=24000, noise=0.002, amp=0.4):
    rng = np.random.default_rng(0)
    t = np.arange(int(seconds * sr)) / sr
    # speech bursts with real pauses in between (the noise estimate needs pauses as a reference)
    env = np.clip(np.sin(2 * np.pi * 1.2 * t) * 2.5, 0, 1)
    y = amp * env * np.sin(2 * np.pi * 180 * t) + noise * rng.standard_normal(len(t))
    return y.astype(np.float32)


def test_resamples_stereo_44k_to_mono_24k():
    y = np.stack([_speechlike(12, 44100), _speechlike(12, 44100)], axis=1)
    out = audio.prepare_reference(_wav_bytes(y, 44100))
    assert out.ndim == 1
    assert abs(len(out) / audio.TARGET_SR - 12) < 0.6


def test_caps_at_30_seconds():
    out = audio.prepare_reference(_wav_bytes(_speechlike(45), 24000))
    assert len(out) <= 30 * audio.TARGET_SR


def test_trims_leading_trailing_silence():
    y = np.concatenate([np.zeros(24000 * 2, np.float32), _speechlike(10), np.zeros(24000 * 2, np.float32)])
    out = audio.prepare_reference(_wav_bytes(y, 24000))
    assert len(out) / audio.TARGET_SR < 10.8


def test_clean_recording_is_good():
    out = audio.prepare_reference(_wav_bytes(_speechlike(15), 24000))
    assert audio.analyze(out)["verdict"] == "good"


def test_clipping_is_flagged():
    y = np.clip(_speechlike(15, amp=3.0), -1, 1)
    out = np.clip(y * 1.0, -1, 1)
    res = audio.analyze(out)
    assert res["verdict"] == "poor"
    assert any(i["code"] == "clipping" for i in res["issues"])


def test_noisy_recording_is_flagged():
    out = audio.prepare_reference(_wav_bytes(_speechlike(15, noise=0.25, amp=0.3), 24000))
    assert any(i["code"] in ("noisy", "some_noise") for i in audio.analyze(out)["issues"])


def test_short_recording_flagged():
    out = audio.prepare_reference(_wav_bytes(_speechlike(2), 24000))
    assert any(i["code"] == "too_short" for i in audio.analyze(out)["issues"])


def test_silence_rejected():
    import pytest

    with pytest.raises(audio.AudioError):
        audio.prepare_reference(_wav_bytes(np.zeros(24000 * 5, np.float32), 24000))
