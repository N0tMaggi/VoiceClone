"""Errors carry a code instead of fixed text: the frontend sends `X-Lang`, the handler in main.py translates."""
from __future__ import annotations

MESSAGES: dict[str, dict[str, str]] = {
    "de": {
        "too_large": "Datei ist zu groß (max. 60 MB).",
        "unsupported_format": "Dieses Format wird nicht direkt unterstützt. Nutze WAV, MP3, FLAC oder OGG (oder installiere ffmpeg).",
        "unreadable": "Die Datei konnte nicht gelesen werden.",
        "empty_audio": "Die Aufnahme ist praktisch leer.",
        "silent_audio": "In der Aufnahme ist nichts zu hören.",
        "too_short": "Nur {d} s Sprache erkannt. Mindestens {m} s nötig.",
        "voice_not_found": "Stimme nicht gefunden.",
        "sample_not_found": "Sample nicht gefunden.",
        "item_not_found": "Eintrag nicht gefunden.",
        "not_found": "Nicht gefunden.",
        "last_sample": "Das letzte Sample kann nicht gelöscht werden. Lösche stattdessen die ganze Stimme.",
        "min_one_active": "Mindestens ein Sample muss aktiv sein.",
        "engine_not_ready": "Das Modell ist noch nicht geladen.",
        "gen_failed": "Generierung fehlgeschlagen: {err}",
        "no_audio": "Das Modell hat kein Audio geliefert.",
        "no_text": "Es ist kein Text zum Sprechen übrig (nur Gefühls-Tags?).",
        "bad_setting": "Ungültige Einstellung.",
    },
    "en": {
        "too_large": "File is too large (max 60 MB).",
        "unsupported_format": "This format is not supported directly. Use WAV, MP3, FLAC or OGG (or install ffmpeg).",
        "unreadable": "The file could not be read.",
        "empty_audio": "The recording is practically empty.",
        "silent_audio": "Nothing audible in the recording.",
        "too_short": "Only {d} s of speech detected. At least {m} s needed.",
        "voice_not_found": "Voice not found.",
        "sample_not_found": "Sample not found.",
        "item_not_found": "Item not found.",
        "not_found": "Not found.",
        "last_sample": "The last sample cannot be deleted. Delete the whole voice instead.",
        "min_one_active": "At least one sample must stay active.",
        "engine_not_ready": "The model is not loaded yet.",
        "gen_failed": "Generation failed: {err}",
        "no_audio": "The model returned no audio.",
        "no_text": "There is no text left to speak (only emotion tags?).",
        "bad_setting": "Invalid setting.",
    },
}


class CodedError(ValueError):
    def __init__(self, code: str, status: int = 400, **kw):
        super().__init__(code)
        self.code, self.status, self.kw = code, status, kw


def message(lang: str, code: str, **kw) -> str:
    table = MESSAGES.get(lang, MESSAGES["de"])
    text = table.get(code) or MESSAGES["de"].get(code) or code
    try:
        return text.format(**kw)
    except (KeyError, IndexError):
        return text
