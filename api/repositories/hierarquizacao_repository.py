"""Acesso a dados — hierarquizacao_demandas.hierarquizacao_portfolio."""

from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection

_TABLE = sql.Identifier("hierarquizacao_demandas", "hierarquizacao_portfolio")

_SELECT_BASE = """
    SELECT
        h.id,
        h.codigo,
        h.config_id,
        c.codigo AS config_codigo,
        h.nome,
        h.descricao,
        h.grupo_comparacao,
        h.status,
        h.objetos,
        h.julgamento_projetos,
        h.pesos_projetos,
        h.ranking,
        h.homologado_em,
        h.homologado_por,
        h.criado_por,
        h.criado_em,
        h.atualizado_em
    FROM hierarquizacao_demandas.hierarquizacao_portfolio h
    LEFT JOIN ahp.config_multicriterio_portfolio c ON c.id = h.config_id
"""

_JSON_FIELDS = {"objetos", "julgamento_projetos", "pesos_projetos", "ranking"}


def _prepare(key: str, value: Any) -> Any:
    if key in _JSON_FIELDS:
        return Jsonb(value) if value is not None else None
    return value


def insert(data: dict[str, Any]) -> dict[str, Any]:
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING id").format(
        table=_TABLE,
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {k: _prepare(k, v) for k, v in data.items()}
    with get_connection() as conn:
        inserted = conn.execute(query, params).fetchone()
        if not inserted:
            raise RuntimeError("Insert de hierarquização não retornou id.")
        conn.commit()
    found = get_by_id(inserted["id"])
    if not found:
        raise RuntimeError("Hierarquização inserida mas não recuperada.")
    return found


def get_by_id(hierarquizacao_id: Any) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.id = %s"
    with get_connection() as conn:
        return conn.execute(query, (hierarquizacao_id,)).fetchone()


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


def list_all(*, status: str | None = None, grupo: str | None = None, config_id: Any = None) -> list[dict[str, Any]]:
    query = _SELECT_BASE + " WHERE 1=1"
    params: list[Any] = []
    if status:
        query += " AND h.status = %s"
        params.append(status)
    if grupo:
        query += " AND h.grupo_comparacao = %s"
        params.append(grupo)
    if config_id:
        query += " AND h.config_id = %s"
        params.append(config_id)
    query += " ORDER BY h.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not data:
        return get_by_codigo(codigo)
    assignments = [sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in data]
    params: dict[str, Any] = {k: _prepare(k, v) for k, v in data.items()}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE {table} SET {sets} WHERE codigo = {codigo}").format(
        table=_TABLE,
        sets=sql.SQL(", ").join(assignments),
        codigo=sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)
