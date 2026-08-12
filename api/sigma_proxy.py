"""Cliente de leitura da API SIGMA, com fallback PostgreSQL read-only."""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from api.exceptions import DatabaseUnavailableError
from api.repositories import sigma_cadastro_repository

SIGMA_BASE = os.getenv("SIGMA_API_BASE", "https://56.125.163.194").rstrip("/")
TIMEOUT = float(os.getenv("SIGMA_HTTP_TIMEOUT", "30"))
logger = logging.getLogger(__name__)


def _db_fallback(kind: str, exc: Exception) -> list[dict[str, Any]]:
    logger.warning("API SIGMA indisponivel para %s; usando banco read-only: %s", kind, exc)
    try:
        if kind == "instituicoes":
            return sigma_cadastro_repository.list_instituicoes_ativas()
        return sigma_cadastro_repository.list_pessoas_ativas()
    except DatabaseUnavailableError as db_exc:
        raise httpx.HTTPError(f"API SIGMA: {exc}; fallback PostgreSQL: {db_exc}") from db_exc


async def fetch_instituicoes() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page = 1
    limit = 200
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            while True:
                res = await client.get(
                    f"{SIGMA_BASE}/api/cadastros/instituicoes/publica/listar",
                    params={"page": page, "limit": limit, "ativa": True},
                )
                res.raise_for_status()
                body = res.json()
                batch = body.get("data") or []
                items.extend(batch)
                pages = body.get("pages") or 1
                if page >= pages or not batch:
                    return items
                page += 1
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        return _db_fallback("instituicoes", exc)


def _normalize_pessoas(body: Any) -> list[dict[str, Any]] | None:
    if isinstance(body, dict) and body.get("success") and body.get("data"):
        rows = body["data"]
    elif isinstance(body, dict) and body.get("pessoas"):
        rows = body["pessoas"]
    elif isinstance(body, dict) and isinstance(body.get("data"), list):
        rows = body["data"]
    elif isinstance(body, list):
        rows = body
    else:
        return None
    return [
        {"id": str(p["id"]), "nome_completo": p.get("nome_completo") or p.get("nome"),
         "email": p.get("email"), "telefone": p.get("telefone")}
        for p in rows if isinstance(p, dict) and p.get("id") is not None
    ]


async def _fetch_pessoas_path(client: httpx.AsyncClient, path: str,
                              headers: dict | None = None) -> list[dict[str, Any]] | None:
    res = await client.get(f"{SIGMA_BASE}{path}", headers=headers)
    if res.status_code in (404, 401, 403):
        return None
    res.raise_for_status()
    return _normalize_pessoas(res.json())


async def fetch_pessoas_sigma() -> list[dict[str, Any]]:
    paths = ("/dicionario/api/cadastro/pessoas", "/api/cadastros/pessoas/publica/listar")
    token = os.getenv("SIGMA_API_TOKEN", "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token else None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            for path in paths:
                parsed = await _fetch_pessoas_path(client, path, headers)
                if parsed:
                    return parsed
            if headers:
                parsed = await _fetch_pessoas_path(client, "/api/cadastros/pessoas", headers)
                if parsed:
                    return parsed
        raise httpx.HTTPError("Nenhum endpoint de pessoas disponivel no SIGMA")
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        return _db_fallback("pessoas", exc)


async def login_usuario(payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        res = await client.post(f"{SIGMA_BASE}/api/auth/login", json=payload)
        if res.status_code >= 400:
            try:
                body = res.json()
                msg = body.get("detail") or body.get("message") or res.text
            except Exception:
                msg = res.text or "Falha no login"
            raise ValueError(str(msg))
        return res.json()
