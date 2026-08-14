"""Reescreve caminhos absolutos quando a app roda atrás de um proxy com
prefixo de sub-rota (ex.: https://56.125.163.194/sicard/), sinalizado pelo
header `X-Forwarded-Prefix`. Sem esse header (dev local), não faz nada.

A aplicação usa caminhos absolutos fixos em templates e JS estáticos
(`/assets/...`, `/api/...`, `/public/...`, `/restrict/...`, `/data/...`).
Este middleware prefixa essas strings nas respostas texto (HTML/CSS/JS/JSON)
e no header `Location`, sem exigir mudanças nos templates.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_REWRITE_PREFIXES = ("/assets", "/api", "/public", "/restrict", "/data", "/favicon.ico")
_REWRITE_CONTENT_TYPES = (
    "text/html",
    "text/css",
    "application/javascript",
    "text/javascript",
    "application/json",
)
_MAX_BODY_BYTES = 8 * 1024 * 1024  # não reescreve respostas grandes (ex.: rasters em JSON)


class SubpathRewriteMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        prefix = request.headers.get("x-forwarded-prefix", "").rstrip("/")
        response = await call_next(request)
        if not prefix:
            return response

        location = response.headers.get("location")
        if location and location.startswith("/") and not location.startswith(prefix + "/"):
            response.headers["location"] = prefix + location

        content_type = response.headers.get("content-type", "")
        if not any(ct in content_type for ct in _REWRITE_CONTENT_TYPES):
            return response

        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > _MAX_BODY_BYTES:
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        if len(body) > _MAX_BODY_BYTES:
            return Response(content=body, status_code=response.status_code, headers=dict(response.headers))

        text = body.decode("utf-8", errors="ignore")
        for path in _REWRITE_PREFIXES:
            for quote in ('"', "'", "`"):
                text = text.replace(f"{quote}{path}", f"{quote}{prefix}{path}")
        new_body = text.encode("utf-8")

        raw_headers = [
            (k, v) for k, v in response.raw_headers if k.lower() not in (b"content-length", b"content-encoding")
        ]
        raw_headers.append((b"content-length", str(len(new_body)).encode()))
        new_response = Response(content=new_body, status_code=response.status_code)
        new_response.raw_headers = raw_headers
        return new_response
