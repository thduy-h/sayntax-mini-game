from faster_whisper import WhisperModel
from functools import lru_cache
from time import perf_counter
from typing import Any

from .config import get_settings

_RUNTIME_DEVICE: str | None = None
_RUNTIME_COMPUTE_TYPE: str | None = None


def _cuda_available() -> bool:
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


def resolve_device() -> tuple[str, str]:
    settings = get_settings()
    if settings.device != "auto":
        device = settings.device
    else:
        device = "cuda" if _cuda_available() else "cpu"

    if settings.compute_type != "auto":
        compute_type = settings.compute_type
    else:
        compute_type = "float16" if device == "cuda" else "int8"
    return device, compute_type


def _cuda_runtime_failed(error: RuntimeError) -> bool:
    message = str(error).lower()
    return "cuda" in message or "cudnn" in message


@lru_cache
def get_model() -> WhisperModel:
    global _RUNTIME_COMPUTE_TYPE, _RUNTIME_DEVICE
    settings = get_settings()
    device, compute_type = resolve_device()
    try:
        model = WhisperModel(settings.model, device=device, compute_type=compute_type)
        _RUNTIME_DEVICE = device
        _RUNTIME_COMPUTE_TYPE = compute_type
        return model
    except RuntimeError as exc:
        if settings.device == "auto" and device == "cuda" and _cuda_runtime_failed(exc):
            fallback_device = "cpu"
            fallback_compute_type = "int8" if settings.compute_type == "auto" else settings.compute_type
            model = WhisperModel(settings.model, device=fallback_device, compute_type=fallback_compute_type)
            _RUNTIME_DEVICE = fallback_device
            _RUNTIME_COMPUTE_TYPE = fallback_compute_type
            return model
        if device == "cuda" and _cuda_runtime_failed(exc):
            raise RuntimeError(
                "CUDA was selected but faster-whisper could not initialize it. "
                "Your NVIDIA driver is older than the CUDA runtime used by ctranslate2. "
                "Use ASR_DEVICE=auto or ASR_DEVICE=cpu for the demo, or update the NVIDIA driver / use a compatible CUDA runtime."
            ) from exc
        raise


def get_runtime_info() -> tuple[str, str]:
    if _RUNTIME_DEVICE is None or _RUNTIME_COMPUTE_TYPE is None:
        return resolve_device()
    return _RUNTIME_DEVICE, _RUNTIME_COMPUTE_TYPE


def _normalize_for_filter(value: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("đ", "d").replace("Đ", "D").lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _is_likely_hallucination(text: str) -> bool:
    normalized = _normalize_for_filter(text)
    if not normalized:
        return True
    phrases = (
        "hay subscribe",
        "dang ky kenh",
        "ghien mi go",
        "de khong bo lo",
        "nhung video hap dan",
        "cam on cac ban da theo doi",
        "hen gap lai",
    )
    return any(phrase in normalized for phrase in phrases)


def transcribe_audio(path: str) -> dict[str, Any]:
    settings = get_settings()
    model = get_model()
    started = perf_counter()
    segments_iter, info = model.transcribe(
        path,
        beam_size=3,
        condition_on_previous_text=False,
        initial_prompt=settings.initial_prompt,
        language=settings.language,
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        no_speech_threshold=0.55,
        temperature=0.0,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 350, "speech_pad_ms": 250},
    )
    segments = [
        {"start": float(segment.start), "end": float(segment.end), "text": segment.text.strip()}
        for segment in segments_iter
        if segment.text.strip()
    ]
    text = " ".join(segment["text"] for segment in segments).strip()
    if _is_likely_hallucination(text):
        text = ""
        segments = []
    return {
        "duration": float(getattr(info, "duration", 0.0) or 0.0),
        "language": settings.language,
        "processing_time": perf_counter() - started,
        "segments": segments,
        "text": text,
    }
