from fastapi import UploadFile
import os
import tempfile


async def save_upload_to_tempfile(file: UploadFile) -> str:
    suffix = ".webm"
    if file.filename and "." in file.filename:
        suffix = "." + file.filename.rsplit(".", 1)[-1].lower()
    fd, path = tempfile.mkstemp(prefix="scc-asr-", suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as target:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                target.write(chunk)
        return path
    except Exception:
        try:
            os.unlink(path)
        finally:
            raise


def remove_tempfile(path: str) -> None:
    try:
        os.unlink(path)
    except FileNotFoundError:
        return
