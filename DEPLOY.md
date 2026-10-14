# Deployment

VoiceClone is built to run **locally for one person**. "Deploying" it means installing it on a machine and starting it. It has no user accounts and no authentication, so do not expose it to a network you do not fully control (see [Network access](#network-access)).

## What was tested

| | |
|---|---|
| OS | Windows 11 |
| GPU | NVIDIA GeForce RTX 5080, 16 GB |
| Python | 3.13 (installed by uv) |
| Speed | about 1.2 s of compute per second of audio; start to "ready" in about 40 s when the models are cached |

Linux and macOS are **not tested**. The code is plain Python and should work on Linux with an NVIDIA GPU. On macOS the pinned CUDA index in `pyproject.toml` will not resolve and needs adjusting. The model card says KittenTTS 2 can run on a CPU, but we have not tried it; Whisper large-v3 is slow on a CPU.

## Requirements

- [uv](https://docs.astral.sh/uv/) (it installs and manages Python for you)
- Python 3.11 to 3.13
- An NVIDIA GPU with a current driver is strongly recommended. The project pins PyTorch builds for **CUDA 12.8** (`pytorch-cu128`), which RTX 50-series (Blackwell) cards need. For older cards you can switch the index in `pyproject.toml` to an older build such as `cu126`.
- About 5 GB of free disk space for the models, plus space for your recordings and generated audio
- A microphone if you want to record in the browser. Browsers allow microphone access on `localhost`.
- Optional: `ffmpeg` on the `PATH` to import M4A/AAC files (WAV, MP3, FLAC and OGG work without it)

## Install and start

```bash
git clone <this repository>
cd VoiceClone
uv sync
uv run python run.py
```

The first start downloads the models (about 5 GB: KittenTTS 2 about 1 GB, Whisper large-v3 about 3 GB, a decoder about 1 GB) into the Hugging Face cache (`~/.cache/huggingface/hub`). The first generation with a cloned voice also loads Whisper, so the first start can take several minutes. Watch the status in the bottom-left corner: "Loading model", then "Warming up", then "Ready".

From the second start on, the app detects that everything is cached and runs **offline**.

### Configuration

Set environment variables before starting (see the table in the README). PowerShell:

```powershell
$env:VOICECLONE_PORT = "9000"
uv run python run.py
```

bash:

```bash
VOICECLONE_PORT=9000 uv run python run.py
```

## Where your data lives

| What | Where |
|---|---|
| Voices and samples | `data/voices/` |
| Generated audio and history | `data/outputs/` (history keeps the 500 newest clips) |
| Settings, disclaimer acceptance | `data/settings.json` |
| Models | Hugging Face cache, outside the project |

**Back up `data/`** if your voices matter to you. It is excluded from Git on purpose; never commit it. To move to another machine, copy `data/` and run the first-time install there.

## Updating

```bash
git pull
uv sync
```

To refresh the models themselves, start once with online mode forced:

```powershell
$env:VOICECLONE_OFFLINE = "0"
uv run python run.py
```

## Start automatically (Windows)

Task Scheduler, run at log-on, in the project folder:

```powershell
$action  = New-ScheduledTaskAction -Execute "uv.exe" -Argument "run python run.py" -WorkingDirectory "C:\path\to\VoiceClone"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "VoiceClone" -Action $action -Trigger $trigger
```

Set `VOICECLONE_NO_BROWSER=1` in the task environment if you do not want a browser tab at every log-on.

## Network access

The server binds to `127.0.0.1` by default, so only your own machine can reach it. Keep it that way unless you have a reason not to:

- There is **no login**. Anyone who can reach the port can create voices, generate speech with your voices and delete your data.
- If you must use it from another device, put it behind a reverse proxy that adds TLS and authentication (for example Caddy or nginx with basic auth) and bind the app only to localhost behind it. Do not publish it on the internet.
- Browsers only allow microphone access on `https://` pages or on `localhost`. Remote use without TLS will not be able to record.

## Hosting the front-end libraries yourself

The page loads GSAP and WaveSurfer.js from CDNs (pinned versions) and the fonts from Google Fonts. For a fully offline machine, download those files, place them in `static/vendor/` and change the `<script>`/`<link>` tags in `static/index.html`. Without them the app still works with the system fonts, but GSAP and WaveSurfer are required for animations and waveforms.

## Troubleshooting

| Problem | What to do |
|---|---|
| Browser shows an old page or empty labels | Reload with Ctrl+F5 once. After that the server forces revalidation. |
| `torch.cuda.is_available()` is `False` | Update the NVIDIA driver and check that `uv sync` installed the `+cu128` build of PyTorch. |
| Port 8765 is in use | Set `VOICECLONE_PORT` to another port, or stop the other process. |
| Download is slow or stuck | Re-run; Hugging Face resumes. Set `HF_TOKEN` for better rate limits. |
| Offline start fails with a missing-file error | Start once with `VOICECLONE_OFFLINE=0` to complete the download. |
| Status stays at "Warming up" for a long time | The first run loads Whisper and compiles audio kernels. Give it a few minutes. |
| Microphone not available | Allow microphone access for `localhost` in the browser and select the right input device. |
| `UnicodeDecodeError` (cp1252) on Windows | Start with `uv run python run.py` (it relaunches in UTF-8 mode). Do not start the server with `uvicorn` directly. |

## Uninstall

Delete the project folder (including `data/` if you no longer need your voices) and, to reclaim disk space, the model folders `models--KittenML--kitten-tts-2`, `models--openai--whisper-large-v3` and `models--ResembleAI--chatterbox-turbo` in the Hugging Face cache.
