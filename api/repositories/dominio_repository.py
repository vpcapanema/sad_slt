"""Domínios e tabelas de referência do banco SLT."""
from __future__ import annotations

from api.db.connection import get_connection


def list_status_demanda() -> list[dict]:
    sql = """
        SELECT codigo, nome, descricao, ordem
        FROM demandas.dom_status_demanda
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_status_objeto_ahp() -> list[dict]:
    """Status da fase de hierarquização (ciclo unificado, ordem >= 70)."""
    sql = """
        SELECT codigo, nome, descricao, ordem
        FROM demandas.dom_status_demanda
        WHERE ativo = TRUE AND ordem >= 70
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_tipo_demanda() -> list[dict]:
    """Domínio dos níveis de demanda (plano/programa/projeto)."""
    sql = """
        SELECT id, codigo, nome, descricao, ordem
        FROM demandas.dom_tipo_demanda
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())
