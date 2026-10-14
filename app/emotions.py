"""Emotion switches in the text: a [tag] splits the text into sections, every section is generated on its own.

Per the model card KittenTTS 2 takes "one leading tag for the whole line": the emotion applies to the whole piece it
is generating. A tag in the middle of the text is passed through to the model, but that is not a reliable switch
(and the model groups long texts at sentence boundaries internally, so a later tag ends up inside a piece).
That is why the app splits at every emotion tag: each section gets its own leading tag.
"""
from __future__ import annotations

import re

EMOTIONS = ("mundane", "nervous", "tender", "angry", "excited", "stern", "sad", "contemplative", "surprised", "joyful")
_TAG = re.compile(r"\[(" + "|".join(EMOTIONS) + r")\]", re.IGNORECASE)


def split_emotions(text: str) -> list[tuple[str | None, str]]:
    """Text -> [(emotion or None, section text)]. Empty sections are dropped, neighbours with the same emotion are merged."""
    matches = list(_TAG.finditer(text))
    parts: list[tuple[str | None, str]] = []
    head = text[: matches[0].start()].strip() if matches else text.strip()
    if head:
        parts.append((None, head))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end():end].strip()
        if body:
            parts.append((m.group(1).lower(), body))
    merged: list[tuple[str | None, str]] = []
    for emo, body in parts:
        if merged and merged[-1][0] == emo:
            merged[-1] = (emo, merged[-1][1] + " " + body)
        else:
            merged.append((emo, body))
    return merged


def to_model_texts(parts: list[tuple[str | None, str]]) -> list[str]:
    """Every section again with its emotion as the leading tag."""
    return [f"[{emo}] {body}" if emo else body for emo, body in parts]
