from hmac import compare_digest
from typing import Annotated

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import remove_tempfile, save_upload_to_tempfile
from .config import get_settings
from .model import get_model, get_runtime_info, transcribe_audio
from .schemas import HealthResponse, TranscribeResponse
from .upload_limit import UploadLimitMiddleware

settings = get_settings()
app = FastAPI(title="SAYNTAX Workshop ASR")
app.add_middleware(
    UploadLimitMiddleware,
    max_bytes=settings.max_upload_bytes + 64 * 1024,
    token=settings.api_token,
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_headers=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_origins=settings.cors_origins,
)


@app.on_event("startup")
def load_model_on_startup() -> None:
    get_model()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    device, compute_type = get_runtime_info()
    return HealthResponse(status="ok", model=settings.model, device=device, compute_type=compute_type)


@app.post("/transcribe", response_model=TranscribeResponse)
def validate_api_token(authorization: str | None) -> None:
    if not settings.api_token:
        return
    expected = f"Bearer {settings.api_token}"
    if not authorization or not compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def transcribe(
    file: Annotated[UploadFile, File(...)],
    authorization: Annotated[str | None, Header()] = None,
) -> TranscribeResponse:
    validate_api_token(authorization)
    temp_path = None
    try:
        temp_path = await save_upload_to_tempfile(file, settings.max_upload_bytes)
        result = transcribe_audio(temp_path)
        return TranscribeResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not transcribe audio") from exc
    finally:
        if temp_path is not None:
            remove_tempfile(temp_path)
        await file.close()
