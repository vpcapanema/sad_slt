"""Sessão assinada (cookie HttpOnly) para gestores SLT."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any

from api.config import get_settings

_COOKIE_NAME = "slt_session"
_TTL_SECONDS = 60 * 60 * 8  # 8 horas


@dataclass(frozen=True)
class SessionUser:
    id: str
    email: str
    username: str
    nome: str
    tipo_usuario: str


def cookie_name() -> str:
    return _COOKIE_NAME


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def create_token(user: SessionUser) -> str:
    settings = get_settings()
    payload = {
        "sub": user.id,
        "email": user.email,
        "username": user.username,
        "nome": user.nome,
        "tipo": user.tipo_usuario,
        "exp": int(time.time()) + _TTL_SECONDS,
    }
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(
        settings.session_secret.encode("utf-8"),
        body.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{body}.{_b64url_encode(sig)}"


def parse_token(token: str | None) -> SessionUser | None:
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    settings = get_settings()
    expected = hmac.new(
        settings.session_secret.encode("utf-8"),
        body.encode("ascii"),
        hashlib.sha256,
    ).digest()
    try:
        if not hmac.compare_digest(_b64url_encode(expected), sig):
            return None
        payload: dict[str, Any] = json.loads(_b64url_decode(body))
    except (ValueError, json.JSONDecodeError):
        return None

    if int(payload.get("exp") or 0) < int(time.time()):
        return None

    sub = payload.get("sub")
    if not sub:
        return None

    return SessionUser(
        id=str(sub),
        email=str(payload.get("email") or ""),
        username=str(payload.get("username") or payload.get("email") or "").split("@")[0],
        nome=str(payload.get("nome") or payload.get("email") or "Gestor"),
        tipo_usuario=str(payload.get("tipo") or ""),
    )


def is_gestor(user: SessionUser | None) -> bool:
    if not user:
        return False
    return user.tipo_usuario.strip().upper() == "GESTOR"
