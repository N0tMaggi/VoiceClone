import importlib

import pytest

from app import offline


def _fake_cache(root, complete=True):
    for repo, files in offline.REQUIRED.items():
        snap = root / f"models--{repo.replace('/', '--')}" / "snapshots" / "abc123"
        for f in files:
            if not complete and repo.startswith("openai") and f == "model.safetensors":
                continue  # Whisper weights missing (interrupted download)
            (snap / f).parent.mkdir(parents=True, exist_ok=True)
            (snap / f).write_bytes(b"x")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for k in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "VOICECLONE_OFFLINE", "VOICECLONE_WEIGHTS", "VOICECLONE_DECODER"):
        monkeypatch.delenv(k, raising=False)


def test_complete_cache_goes_offline(tmp_path, monkeypatch):
    _fake_cache(tmp_path)
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    assert offline.enable_if_cached() is True
    import os
    assert os.environ["HF_HUB_OFFLINE"] == "1" and os.environ["TRANSFORMERS_OFFLINE"] == "1"


def test_partial_download_stays_online(tmp_path, monkeypatch):
    _fake_cache(tmp_path, complete=False)
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    assert offline.enable_if_cached() is False


def test_empty_cache_stays_online(tmp_path, monkeypatch):
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    assert offline.enable_if_cached() is False


def test_force_online_wins(tmp_path, monkeypatch):
    _fake_cache(tmp_path)
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    monkeypatch.setenv("VOICECLONE_OFFLINE", "0")
    assert offline.enable_if_cached() is False


def test_non_default_weights_not_automatic(tmp_path, monkeypatch):
    _fake_cache(tmp_path)
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    monkeypatch.setenv("VOICECLONE_WEIGHTS", "emb4")  # another variant may not be downloaded
    assert offline.enable_if_cached() is False


def test_force_offline(tmp_path, monkeypatch):
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    monkeypatch.setenv("VOICECLONE_OFFLINE", "1")
    assert offline.enable_if_cached() is True
