"""Domínios e tabelas de referência do banco SLT."""
from __future__ import annotations

from api.db.connection import get_connection


def list_status_demanda() -> list[dict]:
    sql = """
        SELECT codigo, nome, descricao, ordem, fase
        FROM demandas.dom_status_demanda
        WHERE ativo = TRUE
        ORDER BY ordem
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_status_objeto_ahp() -> list[dict]:
    """Status da fase de hierarquização (fase hierarquizacao)."""
    sql = """
        SELECT codigo, nome, descricao, ordem, fase
        FROM demandas.dom_status_demanda
        WHERE ativo = TRUE
          AND fase = 'hierarquizacao'
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


def list_transicoes_status_demanda(*, patch_only: bool = False) -> list[dict]:
    """Arestas da matriz de transição entre status (dom_status_demanda_transicao)."""
    sql = """
        SELECT status_origem, status_destino, via_aprovar
        FROM demandas.dom_status_demanda_transicao
    """
    params: tuple = ()
    if patch_only:
        sql += " WHERE via_aprovar = FALSE"
    sql += " ORDER BY status_origem, status_destino"
    with get_connection() as conn:
        return list(conn.execute(sql, params).fetchall())
