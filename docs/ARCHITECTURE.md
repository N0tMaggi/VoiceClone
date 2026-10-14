# Architecture

Repository: <https://github.com/N0tMaggi/VoiceClone> · [README](../README.md) · [Deploy](../DEPLOY.md)

VoiceClone is a single-process FastAPI app that serves a static web UI and wraps KittenTTS 2. There is no build step and no database; all state is files in `data/`.

## Overview

```
Browser (static/)  <--HTTP/JSON-->  FastAPI (app/main.py)  -->  Engine (app/engine.py)  -->  KittenTTS 2 (GPU)
   index.html                          voices.py (data/voices)        |
   app.js, i18n.js                     settings.py (data/settings)    +-- Whisper (reference transcript)
   style.css                           audio.py (checks, resampling)  +-- decoder
```

## Backend modules

| Module | Responsibility |
|---|---|
| `main.py` | HTTP API, error handler (`CodedError` -> localised message via the `X-Lang` header), static files with `Cache-Control: no-cache` |
| `engine.py` | Loads the model in a background thread (states `loading` -> `warming` -> `ready`), serialises generations with a lock, post-processing (speed, pauses, joining sections) |
| `emotions.py` | Splits a text at `[emotion]` tags into sections; each section is generated alone with its own leading tag |
| `voices.py` | Voice library (voice = samples) and generation history on disk. Builds `reference.wav` from the active samples (best first, max. 30 s) |
| `audio.py` | Decoding (soundfile, optional ffmpeg), mono 24 kHz, silence trimming, quality metrics |
| `settings.py` | UI language, default speech language, disclaimer acceptance (`data/settings.json`) |
| `offline.py` | Switches Hugging Face to offline mode when all models are cached; runs before anything imports `huggingface_hub` |
| `languages.py`, `prompts.py` | The 10 speech languages and the reading texts |
| `errors.py` | Error codes and their German/English messages |
| `utf8.py` | Relaunches the process in UTF-8 mode (works around a Windows encoding bug in `kittenml`) |

## API

| Method and path | Purpose |
|---|---|
| `GET /api/status`, `GET /api/system` | Model state; plus GPU memory, counts, storage |
| `GET/PUT /api/settings` | Settings and disclaimer acceptance |
| `GET /api/prompts`, `GET /api/builtin-voices` | Reading texts, built-in voice names |
| `GET/POST /api/voices`, `PATCH/DELETE /api/voices/{id}`, `POST /api/voices/delete` | Voice library (create from a recording, rename, delete) |
| `POST /api/voices/{id}/samples`, `PATCH/DELETE .../samples/{sid}`, `GET .../audio` | Samples of a voice |
| `POST /api/generate` | Generate speech (text, voice, language, fine controls, seed) |
| `GET /api/history`, `PATCH/DELETE /api/history/{id}`, `POST /api/history/delete` | Gallery |
| `GET /api/outputs/{file}` | Generated WAV files |

## Generation pipeline

1. The text is split at emotion tags (`emotions.split_emotions`). One section is the normal case.
2. Every section is generated with the same reference, seed `seed + index` (section 0 uses exactly `seed`, so a single section behaves as before).
3. Multiple sections are joined with the model's own `join_chunks` (edge silence trimmed, short fades, 0.28 s gap).
4. Pause scaling and speed change are applied to the finished audio (`Engine.scale_pauses`, `Engine.change_speed`).
5. The WAV and a history entry (text, voice, parameters, seed) are saved.

## Design decisions

- **Own overlay windows instead of `<dialog>`, CSS animations instead of JS tweens for anything that hides content.** A stalled animation must never leave an invisible modal blocking the page.
- **No-cache static files.** The UI is edited often; stale JS combined with new HTML broke the page once.
- **Offline detection checks the big weight files**, not just config files, so an interrupted download does not lock the app into a broken offline mode.
- **Frontend and backend mirror the section split** (`app.js: emotionSections`, `emotions.py`); the server is authoritative, the UI copy is for display only.

## Privacy and data

Everything user-specific lives in `data/` (voices, samples, generated audio, settings). `.gitignore` excludes it together with `samples/`, `spike_out/` and all audio file types. `scripts/check_private_files.py` (pre-commit hook and test) refuses to let such files into a commit.
