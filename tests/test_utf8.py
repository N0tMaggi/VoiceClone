import subprocess
import sys

import pytest

from app import utf8


class FakeProc:
    """wait() raises KeyboardInterrupt first (Ctrl+C), then the "child" exits."""

    def __init__(self, waits):
        self.waits = list(waits)
        self.terminated = self.killed = False

    def wait(self, timeout=None):
        w = self.waits.pop(0)
        if isinstance(w, BaseException):
            raise w
        return w

    def terminate(self):
        self.terminated = True

    def kill(self):
        self.killed = True


def _run(monkeypatch, proc):
    monkeypatch.setattr(utf8, "sys", type("S", (), {"flags": type("F", (), {"utf8_mode": 0})(), "executable": "py", "argv": ["run.py"], "exit": sys.exit})())
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: proc)
    with pytest.raises(SystemExit) as e:
        utf8.ensure_utf8_mode()
    return e.value.code


def test_single_ctrl_c_waits_for_child_and_exits_quietly(monkeypatch):
    proc = FakeProc([KeyboardInterrupt(), 3221225786])  # child exits with the Windows Ctrl+C exit code
    assert _run(monkeypatch, proc) == 0
    assert not proc.terminated


def test_second_ctrl_c_terminates_child(monkeypatch):
    proc = FakeProc([KeyboardInterrupt(), KeyboardInterrupt(), 0])
    assert _run(monkeypatch, proc) == 0
    assert proc.terminated


def test_normal_exit_code_is_passed_through(monkeypatch):
    assert _run(monkeypatch, FakeProc([7])) == 7
