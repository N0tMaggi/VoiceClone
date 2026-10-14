"""Windows: kittenml reads JSON without encoding=, so Python falls back to cp1252. Force UTF-8 mode.

This only works when the interpreter starts, so the script relaunches itself once. Ctrl+C reaches both processes
(same console): the child shuts down cleanly, the parent waits for it and exits quietly.
"""
import os
import subprocess
import sys


def ensure_utf8_mode() -> None:
    if sys.flags.utf8_mode:
        return
    env = {**os.environ, "PYTHONUTF8": "1"}
    proc = subprocess.Popen([sys.executable, "-X", "utf8", *sys.argv], env=env)
    interrupts = 0
    while True:
        try:
            code = proc.wait()
        except KeyboardInterrupt:
            interrupts += 1
            if interrupts == 1:
                continue  # the child also receives Ctrl+C and shuts itself down: wait for it
            proc.terminate()  # second Ctrl+C: stop waiting
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            sys.exit(0)
        sys.exit(0 if interrupts else code)
