import sys
import types

import pytest

from app import main
from app.engine import engine


@pytest.fixture(autouse=True)
def restore(monkeypatch):
    monkeypatch.setattr(engine, "state", engine.state)


def _half_imported_torch():
    """Reproduces the race: torch is in sys.modules but still mid-import (no .cuda yet)."""
    return types.ModuleType("torch")


def test_system_survives_half_imported_torch_while_loading(monkeypatch):
    monkeypatch.setitem(sys.modules, "torch", _half_imported_torch())
    monkeypatch.setattr(engine, "state", "loading")
    info = main.system()  # used to raise AttributeError -> HTTP 500
    assert info["gpu"] is None
    assert info["engine"]["state"] == "loading"


def test_system_survives_broken_torch_even_when_ready(monkeypatch):
    monkeypatch.setitem(sys.modules, "torch", _half_imported_torch())
    monkeypatch.setattr(engine, "state", "ready")
    assert main.gpu_info() is None  # query errors are swallowed


def test_gpu_info_reads_values_when_ready(monkeypatch):
    fake = types.ModuleType("torch")
    fake.cuda = types.SimpleNamespace(
        is_available=lambda: True,
        mem_get_info=lambda: (6_000_000_000, 16_000_000_000),
        get_device_name=lambda i: "Test GPU",
    )
    monkeypatch.setitem(sys.modules, "torch", fake)
    monkeypatch.setattr(engine, "state", "ready")
    assert main.gpu_info() == {"name": "Test GPU", "total": 16_000_000_000, "used": 10_000_000_000}


def test_no_gpu_without_cuda(monkeypatch):
    fake = types.ModuleType("torch")
    fake.cuda = types.SimpleNamespace(is_available=lambda: False)
    monkeypatch.setitem(sys.modules, "torch", fake)
    monkeypatch.setattr(engine, "state", "ready")
    assert main.gpu_info() is None
