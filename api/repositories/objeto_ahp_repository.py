"""Acesso a dados — ahp.objeto_ahp."""
from __future__ import annotations

import json
from typing import Any

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection

_SELECT_BASE = """
    SELECT
        o.id,
        o.codigo,
        o.demanda_id,
        o.demanda_codigo,
        o.status,
        o.status_atualizado_em,
        o.grupo_comparacao,
        o.nome,
        o.descricao,
        o.diretoria_id,
        o.plano_id,
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
    FROM ahp.objeto_ahp o
"""

_INSERT_SQL = """
    INSERT INTO ahp.objeto_ahp (
        codigo,
        demanda_id,
        demanda_codigo,
        status,
        grupo_comparacao,
        nome,
        descricao,
        diretoria_id,
        plano_id,
        classificacao,
        complementos,
        instituicao_nome,
        instituicao_cnpj,
        latitude,
        longitude,
        geometria_tipo,
        geometria,
        aprovado_por,
        motivo_aprovacao
    ) VALUES (
        %(codigo)s,
        %(demanda_id)s,
        %(demanda_codigo)s,
        %(status)s,
        %(grupo_comparacao)s,
        %(nome)s,
        %(descricao)s,
        %(diretoria_id)s,
        %(plano_id)s,
        %(classificacao)s,
        %(complementos)s,
        %(instituicao_nome)s,
        %(instituicao_cnpj)s,
        %(latitude)s,
        %(longitude)s,
        %(geometria_tipo)s,
        CASE
            WHEN %(geometria_geojson)s::text IS NULL THEN NULL
            ELSE ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s::text), 4326)
        END,
        %(aprovado_por)s,
        %(motivo_aprovacao)s
    )
    RETURNING id
"""


def prepare_params(data: dict[str, Any]) -> dict[str, Any]:
    """Normaliza campos JSON/GeoJSON antes da persistência."""
    params = dict(data)
    for key in ("classificacao", "complementos"):
        val = params.get(key)
        params[key] = Jsonb(val) if val is not None else None
    geo = params.get("geometria_geojson")
    if geo is not None and not isinstance(geo, str):
        params["geometria_geojson"] = json.dumps(geo)
    return params


def insert_with_connection(conn: psycopg.Connection[dict[str, Any]], row: dict[str, Any]) -> Any:
    """Insere um objeto AHP usando a conexão/transação já aberta."""
    cur = conn.execute(_INSERT_SQL, prepare_params(row))
    inserted = cur.fetchone()
    if not inserted:
        raise RuntimeError("Insert de objeto AHP não retornou id.")
    return inserted["id"]


def insert(row: dict[str, Any]) -> dict[str, Any]:
    """Insere um objeto AHP e retorna a linha persistida."""
    with get_connection() as conn:
        inserted_id = insert_with_connection(conn, row)
        conn.commit()
        found = get_by_id(inserted_id)
        if not found:
            raise RuntimeError("Objeto AHP inserido mas não recuperado.")
        return found


def list_all(*, status: str | None = None, grupo: str | None = None) -> list[dict[str, Any]]:
    """Lista objetos AHP com filtros opcionais por status e grupo."""
    query = _SELECT_BASE + " WHERE 1=1"
    params: list[Any] = []
    if status:
        query += " AND o.status = %s"
        params.append(status)
    if grupo:
        query += " AND o.grupo_comparacao = %s"
        params.append(grupo)
    query += " ORDER BY o.aprovado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())


def get_by_id(objeto_id: Any) -> dict[str, Any] | None:
    """Busca um objeto AHP pelo identificador UUID."""
    query = _SELECT_BASE + " WHERE o.id = %s"
    with get_connection() as conn:
        return conn.execute(query, (objeto_id,)).fetchone()


def get_by_demanda_id(demanda_id: Any) -> dict[str, Any] | None:
    """Busca o objeto AHP vinculado a uma demanda."""
    query = _SELECT_BASE + " WHERE o.demanda_id = %s"
    with get_connection() as conn:
        return conn.execute(query, (demanda_id,)).fetchone()


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    """Busca um objeto AHP pelo código legível."""
    query = _SELECT_BASE + " WHERE o.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


_UPDATE_ALLOWED = {
    "status": "status",
    "grupo_comparacao": "grupo_comparacao",
    "nome": "nome",
    "descricao": "descricao",
    "diretoria_id": "diretoria_id",
    "plano_id": "plano_id",
    "classificacao": "classificacao",
    "complementos": "complementos",
    "instituicao_nome": "instituicao_nome",
    "instituicao_cnpj": "instituicao_cnpj",
    "motivo_aprovacao": "motivo_aprovacao",
}


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos do objeto AHP e retorna o registro final."""
    if not data:
        return get_by_codigo(codigo)

    sets: list[str] = []
    params: dict[str, Any] = {"codigo": codigo}
    for key, column in _UPDATE_ALLOWED.items():
        if key not in data:
            continue
        val = data[key]
        if key in ("classificacao", "complementos"):
            val = Jsonb(val) if val is not None else None
        sets.append(f"{column} = %({key})s")
        params[key] = val

    if not sets:
        return get_by_codigo(codigo)

    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(_UPDATE_ALLOWED[key]), sql.Placeholder(key))
        for key in params
        if key != "codigo"
    ]
    query = sql.SQL("UPDATE ahp.objeto_ahp SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)
