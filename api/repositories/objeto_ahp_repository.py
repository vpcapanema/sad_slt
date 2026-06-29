"""Acesso a dados — universo AHP de PROJETOS (demandas.projeto por status).

Com o colapso do modelo dual, não há mais tabela-espelho: o "objeto AHP" é a
própria demanda de projeto quando está numa das fases de hierarquização. A
aprovação é feita in-place (UPDATE de status), não há mais INSERT de snapshot.
"""
from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.constants import STATUS_POS_APROVACAO, STATUS_PRE_APROVACAO
from api.db.connection import get_connection

# Status da fase de hierarquização que compõem o universo do AHP.
AHP_STATUSES = ("hierarq_apta", "hierarq_em_andamento", "hierarq_finalizada")

_SELECT_BASE = """
    SELECT
        o.id,
        o.codigo,
        o.status,
        o.status_atualizado_em,
        o.programa_id,
        o.plano_id,
        o.diretoria_id,
        o.nome,
        o.descricao,
        o.classificacao,
        o.complementos,
        o.instituicao_nome,
        o.instituicao_cnpj,
        o.latitude,
        o.longitude,
        o.geometria_tipo,
        CASE
            WHEN o.geometria IS NULL THEN NULL
            ELSE ST_AsGeoJSON(o.geometria)::jsonb
        END AS geometria_geojson,
        o.aprovado_em,
        o.aprovado_por,
        o.motivo_aprovacao,
        o.criado_em,
        o.atualizado_em
    FROM demandas.projeto o
"""


def list_all(*, status: str | None = None, grupo: str | None = None) -> list[dict[str, Any]]:
    """Lista projetos do universo AHP. Sem status, retorna as fases de hierarquização."""
    query = _SELECT_BASE + " WHERE 1=1"
    params: list[Any] = []
    if status:
        query += " AND o.status = %s"
        params.append(status)
    else:
        query += " AND o.status = ANY(%s)"
        params.append(list(AHP_STATUSES))
    if grupo:
        query += " AND o.programa_id::text = %s"
        params.append(grupo)
    query += " ORDER BY o.aprovado_em DESC NULLS LAST, o.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())


def get_by_id(objeto_id: Any) -> dict[str, Any] | None:
    """Busca um projeto pelo identificador UUID."""
    query = _SELECT_BASE + " WHERE o.id = %s"
    with get_connection() as conn:
        return conn.execute(query, (objeto_id,)).fetchone()


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    """Busca um projeto pelo código legível."""
    query = _SELECT_BASE + " WHERE o.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


_PRE_APROVACAO = tuple(STATUS_PRE_APROVACAO)


def aprovar(
    codigo: str, *, aprovado_por: Any = None, motivo: str | None = None
) -> dict[str, Any] | None:
    """Promove a demanda ao universo AHP in-place (status -> elegivel_ahp)."""
    query = """
        UPDATE demandas.projeto
        SET status = %(pos_aprovacao)s,
            aprovado_em = CURRENT_TIMESTAMP,
            aprovado_por = %(aprovado_por)s,
            motivo_aprovacao = %(motivo)s
        WHERE codigo = %(codigo)s AND status = ANY(%(pre)s)
        RETURNING id
    """
    params = {
        "codigo": codigo,
        "aprovado_por": aprovado_por,
        "motivo": motivo,
        "pre": list(_PRE_APROVACAO),
        "pos_aprovacao": STATUS_POS_APROVACAO,
    }
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.commit()
    if not row:
        return None
    return get_by_codigo(codigo)


_UPDATE_ALLOWED = {
    "status": "status",
    "programa_id": "programa_id",
    "nome": "nome",
    "descricao": "descricao",
    "classificacao": "classificacao",
    "complementos": "complementos",
    "instituicao_nome": "instituicao_nome",
    "instituicao_cnpj": "instituicao_cnpj",
    "motivo_aprovacao": "motivo_aprovacao",
}


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos do projeto e retorna o registro final."""
    if not data:
        return get_by_codigo(codigo)

    params: dict[str, Any] = {"codigo": codigo}
    for key in _UPDATE_ALLOWED:
        if key not in data:
            continue
        val = data[key]
        if key in ("classificacao", "complementos"):
            val = Jsonb(val) if val is not None else None
        params[key] = val

    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(_UPDATE_ALLOWED[key]), sql.Placeholder(key))
        for key in params
        if key != "codigo"
    ]
    if not assignments:
        return get_by_codigo(codigo)

    query = sql.SQL("UPDATE demandas.projeto SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)
