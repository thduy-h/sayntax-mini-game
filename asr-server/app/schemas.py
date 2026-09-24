from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    compute_type: str


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration: float
    processing_time: float
    segments: list[TranscriptSegment]
