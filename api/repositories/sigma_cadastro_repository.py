"""Leitura de instituicoes e pessoas diretamente do SIGMA (fallback read-only)."""
from __future__ import annotations

from typing import Any

from api.db.sigma_connection import get_sigma_connection


def list_instituicoes_ativas() -> list[dict[str, Any]]:
    sql = """
        SELECT id, nome, sigla, cnpj, tipo, telefone, email, site,
               razao_social, nome_fantasia
        FROM cadastro.instituicao
        WHERE ativa = TRUE
        ORDER BY COALESCE(razao_social, nome, nome_fantasia)
    """
    with get_sigma_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_pessoas_ativas() -> list[dict[str, Any]]:
    sql = """
        SELECT id, nome_completo, email, telefone
        FROM cadastro.pessoa
        WHERE ativa = TRUE
        ORDER BY nome_completo
    """
    with get_sigma_connection() as conn:
        return list(conn.execute(sql).fetchall())


def nomes_pessoas_por_ids(ids: list[str]) -> dict[str, str]:
    """Resolve IDs de pessoas SIGMA para nome completo, sem expor o UUID na UI."""
    ids = [ident for ident in {str(value) for value in ids if value}]
    if not ids:
        return {}
    query = """
        SELECT id, nome_completo
        FROM cadastro.pessoa
        WHERE id = ANY(%(ids)s::uuid[])
    """
    with get_sigma_connection() as conn:
        rows = conn.execute(query, {"ids": ids}).fetchall()
    return {
        str(row["id"]): str(row["nome_completo"]).strip()
        for row in rows
        if row.get("nome_completo")
    }
