"""Domínios e tabelas de referência do banco SLT."""
from __future__ import annotations

from api.db.connection import get_connection


def list_status_demanda() -> list[dict]:
    sql = """
        SELECT codigo, nome, descricao, ordem
        FROM cadastro.dom_status_demanda
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_status_objeto_ahp() -> list[dict]:
    sql = """
        SELECT codigo, nome, descricao, ordem
        FROM demandas_aprovadas.dom_status_demandas_aprovadas
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())
