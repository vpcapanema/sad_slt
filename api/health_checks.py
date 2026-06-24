"""Verificações de saúde do backend SLT."""
from __future__ import annotations

import os
from typing import Any

import httpx

from api.sigma_proxy import SIGMA_BASE, fetch_instituicoes, fetch_pessoas_sigma

TIMEOUT = float(os.getenv("SIGMA_HTTP_TIMEOUT", "15"))


async def check_sigma_instituicoes() -> dict[str, Any]:
    try:
        data = await fetch_instituicoes()
        return {"ok": True, "count": len(data), "message": f"{len(data)} instituição(ões) disponível(is)"}
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"Indisponível: {exc}"}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


async def check_sigma_pessoas() -> dict[str, Any]:
    try:
        data = await fetch_pessoas_sigma()
        return {"ok": True, "count": len(data), "message": f"{len(data)} representante(s) disponível(is)"}
    except httpx.HTTPError as exc:
        return {"ok": False, "message": f"Indisponível: {exc}"}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


async def check_slt_database() -> dict[str, Any]:
    """Banco exclusivo SLT — ainda não configurado nesta fase."""
    dsn = os.getenv("SLT_DATABASE_URL", "").strip()
    if not dsn:
        return {
            "ok": True,
            "configured": False,
            "message": "Não configurado (fase atual: cadastro local)",
        }
    try:
        import psycopg

        with psycopg.connect(dsn, connect_timeout=5) as conn:
            conn.execute("SELECT 1")
            row = conn.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'cadastro' AND table_name = 'cadastro_demanda'
                )
                """
            ).fetchone()
            schema_ok = bool(row[0]) if row else False
        msg = "Conexão OK"
        if schema_ok:
            msg += " · cadastro.cadastro_demanda presente"
        else:
            msg += " · schema pendente (rode scripts/apply-database.ps1)"
        return {"ok": True, "configured": True, "schema_ready": schema_ok, "message": msg}
    except ImportError:
        return {"ok": False, "configured": True, "message": "Instale psycopg: pip install psycopg[binary]"}
    except Exception as exc:
        return {"ok": False, "configured": True, "message": str(exc)}


async def run_ready_checks() -> dict[str, Any]:
    inst = await check_sigma_instituicoes()
    pessoas = await check_sigma_pessoas()
    db = await check_slt_database()

    blocking = not inst["ok"]
    return {
        "ok": not blocking,
        "sigma_base": SIGMA_BASE,
        "checks": {
            "api": {"ok": True, "message": "Servidor respondendo"},
            "sigma_instituicoes": inst,
            "sigma_pessoas": pessoas,
            "slt_database": db,
        },
    }
