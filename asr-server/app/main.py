from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import remove_tempfile, save_upload_to_tempfile
from .config import get_settings
from .model import get_model, get_runtime_info, transcribe_audio
from .schemas import HealthResponse, TranscribeResponse

settings = get_settings()
app = FastAPI(title="SheCanCode Voice Local ASR")

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
async def transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Expected an audio file")
    temp_path = await save_upload_to_tempfile(file)
    try:
        result = transcribe_audio(temp_path)
        return TranscribeResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not transcribe audio") from exc
    finally:
        remove_tempfile(temp_path)
