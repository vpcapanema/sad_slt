"""Acesso a dados — universo de demandas elegíveis ao AHP, por tipo.

Sem tabela consolidada nem view: cada tipo é consultado na sua própria tabela
(demandas.plano/programa/projeto), filtrando pelas fases de hierarquização.
O ``grupo_id`` é o conjunto comparável (pai) de cada nível.

As colunas disponíveis para estratificação (universo amostral) são descobertas
por introspecção (information_schema), restritas a tipos escalares seguros.
"""

from __future__ import annotations

from typing import Any

from api.constants import STATUS_UNIVERSO_AHP
from api.db.connection import get_connection

AHP_STATUSES = tuple(STATUS_UNIVERSO_AHP)

# tipo -> (schema, tabela, coluna do pai usada como grupo comparável)
_TIPO_QUERY: dict[str, dict[str, Any]] = {
    "plano": {"schema": "demandas", "table": "plano", "grupo": "diretoria_id"},
    "programa": {"schema": "demandas", "table": "programa", "grupo": "plano_id"},
    "projeto": {"schema": "demandas", "table": "projeto", "grupo": "programa_id"},
}

# Tipos de coluna seguros/expostos para filtro. JSONB, geometria e binários ficam de fora.
_ALLOWED_TYPES = {
    "character varying",
    "text",
    "boolean",
    "date",
    "timestamp with time zone",
    "timestamp without time zone",
    "numeric",
    "integer",
    "smallint",
    "bigint",
    "uuid",
}

_DATE_TYPES = {
    "date",
    "timestamp with time zone",
    "timestamp without time zone",
}

# Colunas internas/UUID que não fazem sentido como filtro do usuário.
# Os UUID do SIGMA têm contrapartida legível (instituicao_nome/representante_nome).
_EXCLUDE_COLS = {
    "criado_por",
    "atualizado_por",
    "aprovado_por",
    "sigma_pessoa_id",
    "sigma_instituicao_id",
    "geometria",
    "geom",
}

_colunas_cache: dict[str, list[dict[str, str]]] = {}


def _cfg(tipo: str) -> dict[str, Any]:
    cfg = _TIPO_QUERY.get(tipo)
    if cfg is None:
        raise ValueError(f"Tipo de demanda inválido: {tipo}")
    return cfg


def colunas(tipo: str) -> list[dict[str, str]]:
    """Colunas filtráveis do tipo (introspecção, cacheada).

    Retorna [{campo, tipo('data'|'texto'), data_type}].
    """
    if tipo in _colunas_cache:
        return _colunas_cache[tipo]
    cfg = _cfg(tipo)
    query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
    """
    with get_connection() as conn:
        rows = conn.execute(query, (cfg["schema"], cfg["table"])).fetchall()
    cols = [
        {
            "campo": r["column_name"],
            "tipo": "data" if r["data_type"] in _DATE_TYPES else "texto",
            "data_type": r["data_type"],
        }
        for r in rows
        if r["data_type"] in _ALLOWED_TYPES and r["column_name"] not in _EXCLUDE_COLS
    ]
    _colunas_cache[tipo] = cols
    return cols


def colunas_validas(tipo: str) -> set[str]:
    return {c["campo"] for c in colunas(tipo)}


def list_elegiveis(tipo: str, *, status: str | None = None) -> list[dict[str, Any]]:
    """Lista demandas de um tipo nas fases de hierarquização (universo do AHP).

    Retorna as colunas ricas (introspectadas) de cada registro, mais ``grupo_id``
    (pai imediato). A estratificação (filtros campo/valor) é feita no cliente.
    """
    cfg = _cfg(tipo)
    cols = sorted(colunas_validas(tipo) | {"id", "codigo", "nome", "status"})
    select_cols = ", ".join(cols)
    table = f'{cfg["schema"]}.{cfg["table"]}'

    query = f"""
        SELECT {select_cols}, {cfg["grupo"]}::text AS grupo_id
        FROM {table}
        WHERE 1=1
    """
    params: list[Any] = []
    if status:
        query += " AND status = %s"
        params.append(status)
    else:
        query += " AND status = ANY(%s)"
        params.append(list(AHP_STATUSES))
    query += " ORDER BY codigo"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())
