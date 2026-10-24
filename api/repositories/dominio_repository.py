"""Domínios e tabelas de referência do banco SLT."""
from __future__ import annotations

from typing import Any

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


def list_atributos_objeto() -> list[dict]:
    """Atributos estaveis coletados no cadastro dos objetos."""
    sql = """
        SELECT codigo, nome, descricao, tipo_dado, unidade, origem_valor,
               tipos_objeto, dominio_valores, configuracao_por_tipo,
               regras_validacao, exige_evidencia, permite_nao_informado, versao
        FROM demandas.dom_atributo_objeto
        WHERE ativo = TRUE
        ORDER BY nome
    """
    with get_connection() as conn:
        return list(conn.execute(sql).fetchall())


def list_adversidades() -> list[dict]:
    """Famílias e tipos ativos de adversidades para consulta e configuração."""
    sql = """
        SELECT f.codigo AS familia_codigo,
               f.nome AS familia_nome,
               f.conceito AS familia_conceito,
               f.ordem AS familia_ordem,
               t.codigo AS tipo_codigo,
               t.nome AS tipo_nome,
               t.conceito AS tipo_conceito,
               t.ordem AS tipo_ordem
        FROM dominios.familia_adversidade f
        LEFT JOIN dominios.tipo_adversidade t
          ON t.familia_codigo = f.codigo
         AND t.ativo = TRUE
        WHERE f.ativo = TRUE
        ORDER BY f.ordem, f.codigo, t.ordem, t.codigo
    """
    with get_connection() as conn:
        rows = conn.execute(sql).fetchall()

    familias: dict[str, dict[str, Any]] = {}
    for row in rows:
        familia = familias.setdefault(row["familia_codigo"], {
            "codigo": row["familia_codigo"],
            "nome": row["familia_nome"],
            "conceito": row["familia_conceito"],
            "ordem": int(row["familia_ordem"]),
            "tipos": [],
        })
        if row["tipo_codigo"] is not None:
            familia["tipos"].append({
                "codigo": row["tipo_codigo"],
                "nome": row["tipo_nome"],
                "conceito": row["tipo_conceito"],
                "ordem": int(row["tipo_ordem"]),
            })
    return list(familias.values())


def list_camadas_adversidade() -> list[dict]:
    """Inclui vínculos inativos para que uma referência desativada não use outra regra."""
    sql = """
        SELECT c.camada_codigo, t.codigo AS tipo_codigo, t.nome AS tipo_nome,
               f.codigo AS familia_codigo, f.nome AS familia_nome,
               (c.ativo AND t.ativo AND f.ativo) AS ativo
        FROM dominios.camada_adversidade c
        JOIN dominios.tipo_adversidade t ON t.codigo = c.tipo_codigo
        JOIN dominios.familia_adversidade f ON f.codigo = t.familia_codigo
        ORDER BY c.camada_codigo
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
