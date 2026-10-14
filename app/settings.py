"""App settings (UI language, default speech language, disclaimer) in data/settings.json."""
from __future__ import annotations

import json
import time

from . import voices
from .errors import CodedError
from .languages import is_speech_lang

DISCLAIMER_VERSION = 1
LANGS = ("de", "en")
DEFAULTS = {"lang": None, "gen_lang": "en", "disclaimer": None}


def _path():
    return voices.DATA / "settings.json"


def load() -> dict:
    data = dict(DEFAULTS)
    p = _path()
    if p.exists():
        try:
            data.update({k: v for k, v in json.loads(p.read_text(encoding="utf-8")).items() if k in DEFAULTS})
        except json.JSONDecodeError:
            pass
    return {**data, "disclaimer_version": DISCLAIMER_VERSION}


def update(patch: dict) -> dict:
    cur = load()
    cur.pop("disclaimer_version", None)
    if "lang" in patch:
        if patch["lang"] not in LANGS:
            raise CodedError("bad_setting")
        cur["lang"] = patch["lang"]
    if "gen_lang" in patch:
        if not is_speech_lang(patch["gen_lang"]):
            raise CodedError("bad_setting")
        cur["gen_lang"] = patch["gen_lang"]
    if "disclaimer" in patch:
        d = patch["disclaimer"]
        if d is None:
            cur["disclaimer"] = None
        elif isinstance(d, dict) and d.get("version") == DISCLAIMER_VERSION:
            cur["disclaimer"] = {"version": DISCLAIMER_VERSION, "accepted_at": d.get("accepted_at") or time.time()}
        else:
            raise CodedError("bad_setting")
    _path().write_text(json.dumps(cur, ensure_ascii=False, indent=2), encoding="utf-8")
    return {**cur, "disclaimer_version": DISCLAIMER_VERSION}
