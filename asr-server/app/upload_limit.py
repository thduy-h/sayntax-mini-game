from hmac import compare_digest

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Scope, Receive, Send


class UploadLimitMiddleware:
    """Bound multipart bodies before the parser spools files, including chunked uploads."""

    def __init__(self, app: ASGIApp, max_bytes: int, token: str | None = None):
        self.app = app
        self.max_bytes = max_bytes
        self.token = token

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["path"] != "/transcribe":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        if self.token:
            authorization = headers.get(b"authorization", b"").decode("utf-8", errors="ignore")
            if not compare_digest(authorization, f"Bearer {self.token}"):
                return await JSONResponse({"detail": "Unauthorized"}, 401)(scope, receive, send)
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid content length"}, 400)(scope, receive, send)
        if length > self.max_bytes:
            return await JSONResponse({"detail": "Upload too large"}, 413)(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > self.max_bytes:
                return await JSONResponse({"detail": "Upload too large"}, 413)(scope, receive, send)
            body.extend(chunk)
            if not message.get("more_body", False):
                break

        async def replay():
            nonlocal body
            data = bytes(body)
            body.clear()
            return {"type": "http.request", "body": data, "more_body": False}

        await self.app(scope, replay, send)
