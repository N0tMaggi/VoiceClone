"""Start VoiceClone locally: uv run python run.py

Environment variables (all optional):
  VOICECLONE_HOST        bind address, default 127.0.0.1 (localhost only - the app has no authentication)
  VOICECLONE_PORT        port, default 8765
  VOICECLONE_NO_BROWSER  set to 1 to not open the browser automatically
"""
import os
import threading
import webbrowser

from app.utf8 import ensure_utf8_mode

ensure_utf8_mode()

import uvicorn  # noqa: E402

HOST = os.environ.get("VOICECLONE_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOICECLONE_PORT", "8765"))

if __name__ == "__main__":
    if os.environ.get("VOICECLONE_NO_BROWSER") != "1":
        threading.Timer(1.5, lambda: webbrowser.open(f"http://{HOST}:{PORT}")).start()
    uvicorn.run("app.main:app", host=HOST, port=PORT, log_level="info")
