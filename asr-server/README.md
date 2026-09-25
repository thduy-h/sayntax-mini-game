# SAYNTAX Workshop ASR

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
LOCAL_ASR_TOKEN=choose-a-workshop-token
```

`ASR_DEVICE=auto` uses CUDA with `float16` when available, otherwise CPU with `int8`.
When `LOCAL_ASR_TOKEN` is set, `/transcribe` requires `Authorization: Bearer <token>`. The Next.js server adds this header in workshop mode; browsers do not call FastAPI directly.

## Check

```bash
curl http://127.0.0.1:8000/health
```

Expected:

```json
{"status":"ok","model":"base","device":"cpu","compute_type":"int8"}
```

The server only stores uploaded audio in a temporary file during inference and deletes it after each request.

## Upload limits and verification

`MAX_UPLOAD_BYTES` defaults to 10485760 (10 MiB), with a configuration range of
1 byte to 100 MiB. The complete multipart request is capped at this value plus
64 KiB of framing overhead, even without Content-Length. Oversized uploads return
413; unsupported MIME types return 415. Accepted types: WebM, Ogg, WAV/x-wav,
MPEG, MP4, FLAC/x-flac. MIME validation does not prove file contents are audio;
the decoder still validates input during transcription.

```bash
python -m unittest discover -s tests -v
```

Direct dependency pins in requirements.txt match the existing local Python 3.12
environment, not a framework upgrade. Transitive dependencies are not yet locked.
After testing on the deployment machine, capture the full environment:

```bash
uv pip freeze > requirements.lock.txt
uv pip install -r requirements.lock.txt
```

Review the lock before committing: no local paths or private index credentials.
These checks do not validate CUDA/model inference or capacity for 300 users.

## Production checklist (not implemented)

- HTTPS termination and explicit allowed frontend origins.
- Authentication before accepting uploads; CORS is not authentication.
- Per-user rate limits and a reverse-proxy body/read timeout.
- Concurrency limits for CPU/GPU inference; bounded queues/workers when needed.
- Load tests with real audio and expected simultaneous sessions, latency and memory budgets.
- Browser ASR fallback when the service is unavailable, and manual command fallback.

Keep this service local until those controls are in place. No Redis/Celery or
production inference timeout is introduced here; cancelling an async request does
not reliably interrupt GPU inference.
