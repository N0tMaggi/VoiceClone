# Third-party software and models

Repository: <https://github.com/N0tMaggi/VoiceClone> · [README](README.md) · [License](LICENSE)

VoiceClone's own code is under the [MIT License](LICENSE). It is **not** redistributed together with the models or the libraries below; they are downloaded or loaded when you install and run the app, and each stays under its own terms. This file lists what the app uses so you can check those terms, especially before commercial use or redistribution.

The license information below was checked against the model cards and package metadata when this file was written. Licenses can change, so verify them at the sources.

## Models (downloaded from Hugging Face on first start)

| Model | Used for | License | Source |
|---|---|---|---|
| KittenTTS 2 weights (`KittenML/kitten-tts-2`) | speech synthesis and voice cloning | **Stellon Labs Community License**: free for research, non-commercial and limited commercial use; the commercial grant ends above USD 1,000,000 in annual revenue or total funding; attribution is required when distributing the weights, derivatives or products built on them | [model card](https://huggingface.co/KittenML/kitten-tts-2) |
| Speaker-embedding model inside `kitten-tts-2` (`speaker/`) | speaker similarity | MIT (per the model card) | same repository |
| Whisper large-v3 (`openai/whisper-large-v3`) | transcribes the reference recording | Apache-2.0 | [model card](https://huggingface.co/openai/whisper-large-v3) |
| Chatterbox Turbo (`ResembleAI/chatterbox-turbo`) | audio decoder used by KittenTTS 2 | MIT | [model card](https://huggingface.co/ResembleAI/chatterbox-turbo) |

**Important:** the KittenTTS 2 license restricts commercial use. Your use of the models, and of any speech they generate in your products, must comply with it. The MIT license of this repository does not change that.

## Python packages (installed by `uv sync`)

| Package | License |
|---|---|
| kittenml | Apache-2.0 |
| PyTorch (`torch`) | BSD-3-Clause |
| NumPy | BSD-3-Clause (plus permissive licenses for bundled parts) |
| SciPy | BSD-3-Clause |
| librosa | ISC |
| soundfile | BSD-3-Clause (it uses the libsndfile library, LGPL-2.1) |
| FastAPI | MIT |
| Uvicorn | BSD-3-Clause |
| python-multipart | Apache-2.0 |
| pytest (development only) | MIT |

These are only the direct dependencies. `uv.lock` pins the complete tree, including transitive packages with their own licenses.

## Front-end libraries and fonts (loaded in the browser from CDNs)

| Item | License |
|---|---|
| [GSAP](https://gsap.com) 3.12.5 (animation) | GSAP Standard License: free to use, including commercially, with one main restriction: it may not be used in tools that let users build visual animations without code and compete with Webflow. [Read the license](https://gsap.com/standard-license/) |
| [WaveSurfer.js](https://wavesurfer.xyz) 7.8.6 (waveforms) | BSD-3-Clause |
| Bricolage Grotesque, JetBrains Mono (Google Fonts) | SIL Open Font License 1.1 |

Nothing from this table is stored in the repository. See [DEPLOY.md](DEPLOY.md) if you want to host these files yourself, and check each license again if you do.

## Trademarks

This project is not affiliated with or endorsed by KittenML, Stellon Labs, Resemble AI, OpenAI or Hugging Face. All product names are trademarks of their respective owners.
