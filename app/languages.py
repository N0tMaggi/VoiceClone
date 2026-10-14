"""Speech languages of KittenTTS 2 (per the model card): language -> built-in voice that carries the accent."""

SPEECH_LANGUAGES: dict[str, str] = {
    "en": "Bella",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
}


def is_speech_lang(code: str | None) -> bool:
    return code in SPEECH_LANGUAGES


def default_voice(code: str) -> str:
    return SPEECH_LANGUAGES.get(code, SPEECH_LANGUAGES["en"])
