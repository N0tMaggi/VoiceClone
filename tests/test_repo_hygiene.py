"""Safety net: user voices, recordings and generated audio must never reach version control."""
import shutil
import subprocess
from pathlib import Path

import pytest

from scripts.check_private_files import violations

ROOT = Path(__file__).resolve().parent.parent
PRIVATE_EXAMPLES = [
    "data/voices/alex-1a2b3c/reference.wav",
    "data/voices/alex-1a2b3c/samples/s1.wav",
    "data/outputs/0123456789.wav",
    "data/outputs/history.json",
    "data/settings.json",
    "samples/voice-message.ogg",
    "spike_out/clone_de.wav",
    "spike_out/sprachen/klon_fr.wav",
    "somewhere/else/recording.mp3",
    "anywhere/take.flac",
    "app/voice.m4a",
    "weights/model.safetensors",
    ".env",
    ".env.production",
    "certs/server.pem",
]
ALLOWED_EXAMPLES = [
    "app/main.py", "static/app.js", "README.md", "DISCLAIMER.md", "uv.lock", "pyproject.toml",
    "scripts/check_private_files.py", ".gitignore", ".env.example", "tests/test_audio.py",
]


def test_guard_flags_every_private_example():
    flagged = {path for path, _ in violations(PRIVATE_EXAMPLES)}
    assert flagged == set(PRIVATE_EXAMPLES)


def test_guard_allows_normal_project_files():
    assert violations(ALLOWED_EXAMPLES) == []


def test_guard_handles_windows_paths_and_case():
    assert len(violations([r"DATA\voices\x\reference.WAV", r".\samples\a.ogg"])) == 2


def test_gitignore_contains_the_critical_rules():
    rules = {line.strip() for line in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()}
    for rule in ("/data/", "/samples/", "/spike_out/", "*.wav", "*.mp3", "*.ogg", "*.flac", "*.m4a", "*.webm", "*.safetensors", ".env"):
        assert rule in rules, f".gitignore lost the rule {rule!r}"


@pytest.mark.skipif(shutil.which("git") is None or not (ROOT / ".git").exists(), reason="not a git checkout")
def test_git_really_ignores_private_paths():
    for path in PRIVATE_EXAMPLES:
        if path.startswith((".env", "certs/")) or path.endswith((".safetensors",)):
            continue  # covered by the pattern test above, not every example is ignored by path alone
        result = subprocess.run(["git", "check-ignore", "-q", path], cwd=ROOT)
        assert result.returncode == 0, f"git would NOT ignore {path}"


@pytest.mark.skipif(shutil.which("git") is None or not (ROOT / ".git").exists(), reason="not a git checkout")
def test_no_private_file_is_tracked():
    tracked = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout.decode("utf-8").split("\0")
    assert violations([p for p in tracked if p]) == []
