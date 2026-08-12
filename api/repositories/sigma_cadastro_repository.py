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
