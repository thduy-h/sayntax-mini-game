from fastapi import HTTPException, UploadFile
import os
import tempfile


async def save_upload_to_tempfile(file: UploadFile, max_bytes: int) -> str:
    formats = {
        "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/wav": ".wav",
        "audio/x-wav": ".wav", "audio/mpeg": ".mp3", "audio/mp4": ".mp4",
        "audio/flac": ".flac", "audio/x-flac": ".flac",
    }
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in formats:
        raise HTTPException(status_code=415, detail="Unsupported audio content type")
    suffix = formats[content_type]
    fd, path = tempfile.mkstemp(prefix="scc-asr-", suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as target:
            size = 0
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(status_code=413, detail="Audio file too large")
                target.write(chunk)
            if size == 0:
                raise HTTPException(status_code=400, detail="Empty audio file")
        return path
    except BaseException:
        try:
            os.unlink(path)
        finally:
            raise


def remove_tempfile(path: str) -> None:
    try:
        os.unlink(path)
    except FileNotFoundError:
        return
