import numpy as np
import pytest

from app.engine import Engine

SR = 24000


def _speech_with_pauses(pause_ms=300, bursts=4, burst_ms=500):
    """Speech-like bursts (sine) with silent pauses in between; some silence is kept at the start and end on purpose."""
    t = lambda ms: np.arange(int(SR * ms / 1000)) / SR  # noqa: E731
    parts = [np.zeros(int(SR * 0.2), np.float32)]
    for i in range(bursts):
        parts.append((0.4 * np.sin(2 * np.pi * (180 + 20 * i) * t(burst_ms))).astype(np.float32))
        parts.append(np.zeros(int(SR * pause_ms / 1000), np.float32) + 1e-4 * np.random.default_rng(i).standard_normal(int(SR * pause_ms / 1000)).astype(np.float32))
    parts.append(np.zeros(int(SR * 0.2), np.float32))
    return np.concatenate(parts)


def _seconds(y):
    return len(y) / SR


def test_pauses_shorter():
    y = _speech_with_pauses()
    out = Engine.scale_pauses(y, SR, 0.4)
    assert _seconds(out) < _seconds(y) - 0.4  # three inner pauses, each about 180 ms shorter


def test_pauses_longer():
    y = _speech_with_pauses()
    out = Engine.scale_pauses(y, SR, 2.0)
    assert _seconds(out) > _seconds(y) + 0.6  # three inner pauses, each about 300 ms longer


def test_neutral_factor_keeps_length():
    y = _speech_with_pauses()
    assert abs(len(Engine.scale_pauses(y, SR, 1.0)) - len(y)) < SR * 0.02


def test_speech_itself_is_untouched():
    y = _speech_with_pauses()
    out = Engine.scale_pauses(y, SR, 1.7)
    assert abs(float(np.sum(np.abs(out) > 0.1)) - float(np.sum(np.abs(y) > 0.1))) < SR * 0.01  # same number of loud samples
    assert np.isfinite(out).all() and out.dtype == np.float32


def test_zero_factor_never_glues_words_completely():
    y = _speech_with_pauses()
    out = Engine.scale_pauses(y, SR, 0.0)
    assert _seconds(out) > _seconds(y) - 3 * 0.3  # a small remainder of every pause is kept


def test_edges_untouched():
    y = _speech_with_pauses()
    out = Engine.scale_pauses(y, SR, 2.0)
    assert np.allclose(out[: int(SR * 0.2)], y[: int(SR * 0.2)])  # start
    assert np.allclose(out[-int(SR * 0.2):], y[-int(SR * 0.2):])  # end


def test_continuous_signal_without_pauses_is_unchanged():
    y = (0.4 * np.sin(2 * np.pi * 200 * np.arange(SR * 2) / SR)).astype(np.float32)
    assert len(Engine.scale_pauses(y, SR, 2.0)) == len(y)


@pytest.mark.parametrize("rate", [0.8, 1.25])
def test_speed_changes_length_not_pitch_range(rate):
    y = (0.4 * np.sin(2 * np.pi * 220 * np.arange(SR * 2) / SR)).astype(np.float32)
    out = Engine.change_speed(y, rate)
    assert abs(len(out) / len(y) - 1 / rate) < 0.03
    # pitch is preserved: dominant frequency stays near 220 Hz
    freqs = np.fft.rfftfreq(len(out), 1 / SR)
    assert abs(freqs[np.argmax(np.abs(np.fft.rfft(out)))] - 220) < 15
