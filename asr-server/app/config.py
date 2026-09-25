from functools import lru_cache
from pydantic import BaseModel, Field
import os


class Settings(BaseModel):
    api_token: str | None = None
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, gt=0, le=100 * 1024 * 1024)
    model: str = "base"
    device: str = "auto"
    compute_type: str = "auto"
    language: str = "vi"
    initial_prompt: str = (
        "Các câu lệnh tiếng Việt cho Blockly: thêm khối bắt đầu, thêm khối in, "
        "đặt chữ Xin chào, chạy chương trình, thêm khối lặp, lặp ba lần, "
        "chèn sau khối một, mở danh sách khối, gợi ý, hoàn tác."
    )
    cors_origins: list[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]


@lru_cache
def get_settings() -> Settings:
    origins = os.getenv("ASR_CORS_ORIGINS", "")
    return Settings(
        api_token=os.getenv("LOCAL_ASR_TOKEN") or None,
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", "10485760")),
        model=os.getenv("ASR_MODEL", "base"),
        device=os.getenv("ASR_DEVICE", "auto"),
        compute_type=os.getenv("ASR_COMPUTE_TYPE", "auto"),
        initial_prompt=os.getenv("ASR_INITIAL_PROMPT", Settings().initial_prompt),
        language=os.getenv("ASR_LANGUAGE", "vi"),
        cors_origins=[item.strip() for item in origins.split(",") if item.strip()] or Settings().cors_origins,
    )
