"""Commit guard: refuse files that must never be versioned (voices, recordings, generated audio, secrets).

Usage:
  python scripts/check_private_files.py --staged   check what is about to be committed (pre-commit hook)
  python scripts/check_private_files.py --all      check every tracked file

Exit code 1 and a list of offending paths if anything private is found. The .gitignore already excludes these
files; this guard also catches `git add -f` and a damaged .gitignore.
"""
from __future__ import annotations

import argparse
import subprocess
import sys

PRIVATE_DIRS = ("data/", "samples/", "spike_out/", "recordings/", "exports/", "outputs/")

PRIVATE_EXTENSIONS = {
    # audio
    ".wav", ".wave", ".mp3", ".ogg", ".oga", ".opus", ".flac", ".m4a", ".aac", ".wma", ".aiff", ".aif", ".aifc",
    ".webm", ".weba", ".mka", ".mp4", ".m4b", ".caf", ".amr", ".3gp", ".mid", ".midi",
    # model weights
    ".safetensors", ".gguf", ".onnx", ".pt", ".pth", ".ckpt", ".bin", ".npz", ".npy",
    # secrets
    ".pem", ".key", ".p12", ".pfx",
}

ALLOWED_ENV_FILES = {".env.example"}


def violations(paths: list[str]) -> list[tuple[str, str]]:
    """Return (path, reason) for every path that must not be committed."""
    found = []
    for raw in paths:
        path = raw.replace("\\", "/").removeprefix("./").lower()  # not lstrip(): it would eat the dot of ".env"
        name = path.rsplit("/", 1)[-1]
        ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
        if path.startswith(PRIVATE_DIRS):
            found.append((raw, "inside a private folder (voices, samples, generated output)"))
        elif ext in PRIVATE_EXTENSIONS:
            found.append((raw, f"private file type {ext} (audio, model weights or key)"))
        elif (name == ".env" or name.startswith(".env.")) and name not in ALLOWED_ENV_FILES:
            found.append((raw, "environment file with possible secrets"))
    return found


def git_paths(staged: bool) -> list[str]:
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] if staged else ["git", "ls-files", "-z"]
    out = subprocess.run(cmd, capture_output=True, check=True).stdout.decode("utf-8", "replace")
    return [p for p in out.split("\0") if p]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--staged", action="store_true", help="check staged files (default)")
    mode.add_argument("--all", action="store_true", help="check all tracked files")
    args = ap.parse_args()
    try:
        bad = violations(git_paths(staged=not args.all))
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"check_private_files: could not read the file list from git ({exc}). Refusing to continue.", file=sys.stderr)
        return 1
    if not bad:
        return 0
    print("\nBLOCKED: private files must never be committed:\n", file=sys.stderr)
    for path, reason in bad:
        print(f"  {path}\n      -> {reason}", file=sys.stderr)
    print(
        "\nThese hold personal voice data or secrets. Unstage them with:  git restore --staged <path>\n"
        "Check why they were added with:  git check-ignore -v <path>\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
