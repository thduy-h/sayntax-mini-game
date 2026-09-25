import io
import os
import tempfile
import unittest
import importlib
import sys
import types
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from app.audio import save_upload_to_tempfile, remove_tempfile
from app.upload_limit import UploadLimitMiddleware


class UploadTests(unittest.IsolatedAsyncioTestCase):
    async def test_endpoint_cleanup_on_success_and_inference_failure(self):
        # Isolate upload handling from model downloads/GPU initialization.
        model = types.ModuleType("app.model")
        model.get_model = lambda: None
        model.get_runtime_info = lambda: ("cpu", "int8")
        model.transcribe_audio = lambda path: {}
        with patch.dict(sys.modules, {"app.model": model}):
            main = importlib.import_module("app.main")
        result = {"text": "xin chao", "language": "vi", "duration": 1.0,
                  "processing_time": 0.1, "segments": []}
        with tempfile.TemporaryDirectory() as directory:
            with patch("tempfile.tempdir", directory):
                for failure in (False, True):
                    file = UploadFile(io.BytesIO(b"audio"), headers=Headers({"content-type": "audio/webm"}))
                    with patch.object(main, "transcribe_audio", return_value=result,
                                      side_effect=RuntimeError("decode failed") if failure else None):
                        if failure:
                            with self.assertRaises(HTTPException) as error:
                                await main.transcribe(file, authorization=None)
                            self.assertEqual(error.exception.status_code, 500)
                        else:
                            self.assertEqual((await main.transcribe(file, authorization=None)).text, "xin chao")
                    self.assertTrue(file.file.closed)
                    self.assertEqual(os.listdir(directory), [])

    async def test_valid_and_oversized_file_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("tempfile.tempdir", directory):
                file = UploadFile(io.BytesIO(b"audio"), headers=Headers({"content-type": "audio/webm;codecs=opus"}))
                path = await save_upload_to_tempfile(file, 5)
                with open(path, "rb") as saved:
                    self.assertEqual(saved.read(), b"audio")
                remove_tempfile(path)
                await file.seek(0)
                with self.assertRaises(HTTPException) as error:
                    await save_upload_to_tempfile(file, 4)
                self.assertEqual(error.exception.status_code, 413)
                self.assertEqual(os.listdir(directory), [])
                await file.close()

    async def test_invalid_content_type(self):
        file = UploadFile(io.BytesIO(b"not audio"), headers=Headers({"content-type": "text/plain"}))
        with self.assertRaises(HTTPException) as error:
            await save_upload_to_tempfile(file, 100)
        self.assertEqual(error.exception.status_code, 415)
        await file.close()

    async def test_optional_local_token(self):
        from app import main
        original = main.settings.api_token
        main.settings.api_token = "workshop-secret"
        try:
            with self.assertRaises(HTTPException) as missing:
                main.validate_api_token(None)
            self.assertEqual(missing.exception.status_code, 401)
            with self.assertRaises(HTTPException) as wrong:
                main.validate_api_token("Bearer wrong")
            self.assertEqual(wrong.exception.status_code, 401)
            main.validate_api_token("Bearer workshop-secret")
        finally:
            main.settings.api_token = original

    async def test_request_limit_with_and_without_content_length(self):
        for headers in ([], [(b"content-length", b"10")]):
            sent = []
            async def downstream(scope, receive, send):
                self.fail("Oversized request reached parser")
            async def receive():
                return {"type": "http.request", "body": b"0123456789"}
            async def send(message):
                sent.append(message)
            await UploadLimitMiddleware(downstream, 5)({"type": "http", "path": "/transcribe", "headers": headers}, receive, send)
            self.assertEqual(sent[0]["status"], 413)

    async def test_middleware_rejects_invalid_token_before_reading_body(self):
        sent = []
        body_read = False
        async def downstream(scope, receive, send):
            self.fail("Unauthorized request reached parser")
        async def receive():
            nonlocal body_read
            body_read = True
            return {"type": "http.request", "body": b"audio"}
        async def send(message):
            sent.append(message)
        middleware = UploadLimitMiddleware(downstream, 10, token="secret")
        await middleware({"type": "http", "path": "/transcribe", "headers": []}, receive, send)
        self.assertEqual(sent[0]["status"], 401)
        self.assertFalse(body_read)

    async def test_valid_request_reaches_parser(self):
        async def downstream(scope, receive, send):
            self.assertEqual((await receive())["body"], b"audio")
        async def receive():
            return {"type": "http.request", "body": b"audio"}
        async def send(message):
            self.fail("Unexpected rejection")
        await UploadLimitMiddleware(downstream, 5)({"type": "http", "path": "/transcribe", "headers": []}, receive, send)
