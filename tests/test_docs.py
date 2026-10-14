"""The documentation must not rot: every relative link and image must point at a real file, no placeholders left."""
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DOCS = [ROOT / n for n in ("README.md", "README.de.md", "DEPLOY.md", "DISCLAIMER.md", "THIRD_PARTY.md")] + [ROOT / "docs" / "ARCHITECTURE.md"]
REPO_URL = "https://github.com/N0tMaggi/VoiceClone"

LINK = re.compile(r"\]\(([^)\s]+)\)")           # [text](target)
IMG = re.compile(r"""<img[^>]+src=["']([^"']+)["']""")  # <img src="...">


def relative_targets(text: str) -> list[str]:
    targets = LINK.findall(text) + IMG.findall(text)
    return [t.split("#")[0] for t in targets if not t.startswith(("http://", "https://", "mailto:", "#")) and t.split("#")[0]]


@pytest.mark.parametrize("doc", DOCS, ids=lambda p: p.name)
def test_relative_links_and_images_exist(doc):
    missing = [t for t in relative_targets(doc.read_text(encoding="utf-8")) if not (doc.parent / t).exists()]
    assert not missing, f"{doc.name} links to missing files: {missing}"


@pytest.mark.parametrize("doc", DOCS, ids=lambda p: p.name)
def test_no_placeholders_left(doc):
    text = doc.read_text(encoding="utf-8")
    for placeholder in ("<this repository>", "<dieses Repository>", "TODO", "TBD", "lorem ipsum"):
        assert placeholder not in text, f"{doc.name} still contains {placeholder!r}"


def test_readmes_use_the_real_repository_link():
    for name in ("README.md", "README.de.md", "DEPLOY.md"):
        assert REPO_URL in (ROOT / name).read_text(encoding="utf-8"), f"{name} has no link to the real repository"


def test_both_readmes_show_the_same_set_of_screenshots():
    shots = {lang: {Path(t).name for t in relative_targets((ROOT / f).read_text(encoding="utf-8")) if t.endswith(".png")}
             for lang, f in (("en", "README.md"), ("de", "README.de.md"))}
    assert shots["en"] == shots["de"] and len(shots["en"]) >= 7


def test_license_file_is_mit_and_readmes_say_so():
    assert (ROOT / "LICENSE").read_text(encoding="utf-8").startswith("MIT License")
    assert "MIT" in (ROOT / "README.md").read_text(encoding="utf-8") and "MIT" in (ROOT / "README.de.md").read_text(encoding="utf-8")
