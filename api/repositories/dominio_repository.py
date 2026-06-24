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
        FROM ahp.dom_status_objeto
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())
