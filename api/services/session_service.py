"""Sessão assinada (cookie HttpOnly) para operadores SICARD."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4
from datetime import datetime, timezone

from api.config import get_settings
from api.repositories import session_repository, sigma_usuario_repository

_COOKIE_NAME = "slt_session"
_TTL_SECONDS = 60 * 60 * 8  # 8 horas
REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30  # prazo absoluto de 30 dias
SIGMA_PROFILES = frozenset({"VISUALIZADOR", "OPERADOR", "ANALISTA", "GESTOR", "ADMIN"})


@dataclass(frozen=True)
class SessionUser:
    id: str
    email: str
    username: str
    nome: str
    tipo_usuario: str
    session_id: str | None = None


def profile_from_username(username: str) -> str | None:
    """Deriva o perfil exclusivamente do sufixo após o último sublinhado."""
    normalized = (username or "").strip()
    if not normalized or "@" in normalized or "_" not in normalized:
        return None
    profile = normalized.rsplit("_", 1)[1].upper()
    return profile if profile in SIGMA_PROFILES else None


def cookie_name() -> str:
    return _COOKIE_NAME


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def create_token(user: SessionUser, *, permanecer_conectado: bool = False) -> str:
    settings = get_settings()
    payload = {
        "sid": str(uuid4()),
        "sub": user.id,
        "email": user.email,
        "username": user.username,
        "nome": user.nome,
        "tipo": user.tipo_usuario,
        "exp": int(time.time()) + (REMEMBER_TTL_SECONDS if permanecer_conectado else _TTL_SECONDS),
    }
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(
        settings.session_secret.encode("utf-8"),
        body.encode("ascii"),
        hashlib.sha256,
    ).digest()
    session_repository.register(payload["sid"], user, payload["exp"])
    return f"{body}.{_b64url_encode(sig)}"


def parse_token(token: str | None) -> SessionUser | None:
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    settings = get_settings()
    try:
        expected = hmac.new(
            settings.session_secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64url_encode(expected), sig):
            return None
        payload: dict[str, Any] = json.loads(_b64url_decode(body))
    except (ValueError, UnicodeError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict) or not isinstance(payload.get("exp"), int):
        return None
    if payload["exp"] <= int(time.time()):
        return None

    sub = payload.get("sub")
    sid = payload.get("sid")
    if not sub or not isinstance(sid, str):
        return None

    if not session_repository.is_active(sid, str(sub)):
        return None
    account = sigma_usuario_repository.find_active_by_id(str(sub))
    if not account or account.get("ativo") is not True:
        session_repository.revoke_user(str(sub))
        return None
    blocked = account.get("bloqueado_ate")
    if blocked and blocked.replace(tzinfo=blocked.tzinfo or timezone.utc) > datetime.now(timezone.utc):
        session_repository.revoke_user(str(sub))
        return None
    username = str(account.get("username") or "").strip()
    profile = profile_from_username(username)
    if not profile:
        return None

    return SessionUser(
        id=str(sub),
        email=str(account.get("email_institucional") or ""),
        username=username,
        nome=str(account.get("nome_pessoa") or username),
        tipo_usuario=profile,
        session_id=sid,
    )


def is_gestor(user: SessionUser | None) -> bool:
    if not user:
        return False
    return user.tipo_usuario.strip().upper() in {"GESTOR", "ADMIN"}
