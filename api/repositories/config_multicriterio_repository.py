"""Acesso a dados — ahp.config_multicriterio_avulsa e ahp.config_multicriterio_portfolio.

Interface única; ``tipo`` ("avulsa"|"portfolio") seleciona a tabela. A coluna
``grupo_comparacao`` só existe (e é obrigatória) no portfólio. O binário
``arquivo_conteudo`` nunca é exposto pela API.
"""
from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection

TIPO_CONFIG: dict[str, dict[str, Any]] = {
    "avulsa": {"table": ("ahp", "config_multicriterio_avulsa"), "has_grupo": False},
    "portfolio": {"table": ("ahp", "config_multicriterio_portfolio"), "has_grupo": True},
}

# Colunas comuns às duas tabelas (sem arquivo_conteudo).
_COMMON_COLUMNS = [
    "id",
    "codigo",
    "nome",
    "descricao",
    "status",
    "metodo_entrada",
    "metodo_comparacao",
    "n_criterios",
    "criterios",
    "matriz_comparacao",
    "pesos",
    "lambda_max",
    "indice_consistencia",
    "indice_aleatorio",
    "razao_consistencia",
    "consistente",
    "arquivo_nome",
    "arquivo_tipo",
    "arquivo_hash",
    "configuracao_completa",
    "homologado_em",
    "homologado_por",
    "criado_por",
    "criado_em",
    "atualizado_em",
]

_JSON_FIELDS = {"criterios", "matriz_comparacao", "pesos", "configuracao_completa"}


def _cfg(tipo: str) -> dict[str, Any]:
    if tipo not in TIPO_CONFIG:
        raise ValueError(f"Tipo de configuração inválido: {tipo}")
    return TIPO_CONFIG[tipo]


def _table(tipo: str) -> sql.Identifier:
    schema, name = _cfg(tipo)["table"]
    return sql.Identifier(schema, name)


def _columns(tipo: str) -> list[str]:
    cols = list(_COMMON_COLUMNS)
    if _cfg(tipo)["has_grupo"]:
        cols.append("grupo_comparacao")
        cols.append("tipo_demanda_id")
    return cols


def _select_columns(tipo: str) -> sql.Composed:
    return sql.SQL(", ").join(sql.Identifier(c) for c in _columns(tipo))


def _normalize(tipo: str, row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    out = dict(row)
    out["tipo"] = tipo
    out.setdefault("grupo_comparacao", None)
    return out


def _prepare(key: str, value: Any) -> Any:
    if key in _JSON_FIELDS:
        return Jsonb(value) if value is not None else None
    return value


def insert(tipo: str, data: dict[str, Any]) -> dict[str, Any]:
    """Cria uma configuração (rascunho) e retorna a linha normalizada."""
    _cfg(tipo)
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING id").format(
        table=_table(tipo),
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {k: _prepare(k, v) for k, v in data.items()}
    with get_connection() as conn:
        inserted = conn.execute(query, params).fetchone()
        if not inserted:
            raise RuntimeError("Insert de configuração não retornou id.")
        conn.commit()
    found = get_by_id(tipo, inserted["id"])
    if not found:
        raise RuntimeError("Configuração inserida mas não recuperada.")
    return found


def get_by_id(tipo: str, config_id: Any) -> dict[str, Any] | None:
    query = sql.SQL("SELECT {cols} FROM {table} WHERE id = %s").format(
        cols=_select_columns(tipo), table=_table(tipo)
    )
    with get_connection() as conn:
        return _normalize(tipo, conn.execute(query, (config_id,)).fetchone())


def get_by_codigo(tipo: str, codigo: str) -> dict[str, Any] | None:
    query = sql.SQL("SELECT {cols} FROM {table} WHERE codigo = %s").format(
        cols=_select_columns(tipo), table=_table(tipo)
    )
    with get_connection() as conn:
        return _normalize(tipo, conn.execute(query, (codigo,)).fetchone())


def list_all(
    tipo: str,
    *,
    status: str | None = None,
    grupo: str | None = None,
    tipo_demanda_id: int | None = None,
) -> list[dict[str, Any]]:
    cfg = _cfg(tipo)
    clauses: list[sql.Composable] = []
    params: list[Any] = []
    if status:
        clauses.append(sql.SQL("status = %s"))
        params.append(status)
    if grupo and cfg["has_grupo"]:
        clauses.append(sql.SQL("grupo_comparacao = %s"))
        params.append(grupo)
    if tipo_demanda_id is not None and cfg["has_grupo"]:
        clauses.append(sql.SQL("tipo_demanda_id = %s"))
        params.append(tipo_demanda_id)
    where = sql.SQL("")
    if clauses:
        where = sql.SQL(" WHERE ") + sql.SQL(" AND ").join(clauses)
    query = sql.SQL("SELECT {cols} FROM {table}{where} ORDER BY criado_em DESC").format(
        cols=_select_columns(tipo), table=_table(tipo), where=where
    )
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [r for r in (_normalize(tipo, row) for row in rows) if r is not None]


def update(tipo: str, codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not data:
        return get_by_codigo(tipo, codigo)
    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in data
    ]
    params: dict[str, Any] = {k: _prepare(k, v) for k, v in data.items()}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE {table} SET {sets} WHERE codigo = {codigo}").format(
        table=_table(tipo),
        sets=sql.SQL(", ").join(assignments),
        codigo=sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(tipo, codigo)
