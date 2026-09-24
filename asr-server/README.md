# SheCanCode Voice Local ASR

FastAPI server for local demo speech recognition with `faster-whisper`.

## Setup

```bash
cd asr-server
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install:

```bash
pip install -r requirements.txt
```

Run:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

First run downloads the Whisper model. Default model is `base`, language is `vi`.

## Environment

Copy `.env.example` if needed and export the values before running:

```bash
ASR_MODEL=base
ASR_DEVICE=auto
ASR_COMPUTE_TYPE=auto
ASR_LANGUAGE=vi
```

`ASR_DEVICE=auto` uses CUDA with `float16` when available, otherwise CPU with `int8`.

## Check

```bash
curl http://127.0.0.1:8000/health
```

Expected:

```json
{"status":"ok","model":"base","device":"cpu","compute_type":"int8"}
```

The server only stores uploaded audio in a temporary file during inference and deletes it after each request.
