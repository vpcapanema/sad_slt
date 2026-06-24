"""Cliente HTTP para API SIGMA-PLI em produção."""
from __future__ import annotations

import os
from typing import Any

import httpx

SIGMA_BASE = os.getenv("SIGMA_API_BASE", "http://56.125.163.194").rstrip("/")
TIMEOUT = float(os.getenv("SIGMA_HTTP_TIMEOUT", "30"))


async def fetch_instituicoes() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page = 1
    limit = 200
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
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
                break
            page += 1
    return items


def _normalize_pessoas(body: Any) -> list[dict[str, Any]] | None:
    if isinstance(body, dict) and body.get("success") and body.get("data"):
        rows = body["data"]
    elif isinstance(body, dict) and body.get("pessoas"):
        rows = body["pessoas"]
    elif isinstance(body, dict) and body.get("data") and isinstance(body["data"], list):
        rows = body["data"]
    elif isinstance(body, list):
        rows = body
    else:
        return None
    return [
        {
            "id": str(p["id"]),
            "nome_completo": p.get("nome_completo") or p.get("nome"),
            "email": p.get("email"),
            "telefone": p.get("telefone"),
        }
        for p in rows
        if isinstance(p, dict) and p.get("id") is not None
    ]


async def _fetch_pessoas_path(client: httpx.AsyncClient, path: str, headers: dict | None = None) -> list[dict[str, Any]] | None:
    res = await client.get(f"{SIGMA_BASE}{path}", headers=headers)
    if res.status_code in (404, 401, 403):
        return None
    res.raise_for_status()
    return _normalize_pessoas(res.json())


async def fetch_pessoas_sigma() -> list[dict[str, Any]]:
    """Lista cadastro.pessoa via endpoints públicos do SIGMA (somente leitura)."""
    paths = (
        "/dicionario/api/cadastro/pessoas",
        "/api/cadastros/pessoas/publica/listar",
    )
    token = os.getenv("SIGMA_API_TOKEN", "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token else None

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for path in paths:
            parsed = await _fetch_pessoas_path(client, path, headers)
            if parsed:
                return parsed

        if headers:
            parsed = await _fetch_pessoas_path(client, "/api/cadastros/pessoas", headers)
            if parsed:
                return parsed

    raise httpx.HTTPError("Nenhum endpoint de pessoas disponível no SIGMA")


async def login_usuario(payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(f"{SIGMA_BASE}/api/auth/login", json=payload)
        if res.status_code >= 400:
            try:
                body = res.json()
                msg = body.get("detail") or body.get("message") or res.text
            except Exception:
                msg = res.text or "Falha no login"
            raise ValueError(str(msg))
        return res.json()
