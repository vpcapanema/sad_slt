"""Acesso a dados — cadastro.projeto."""
from __future__ import annotations

import json
from typing import Any

from psycopg import errors
from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection

_SELECT_BASE = """
    SELECT
        d.id,
        d.codigo,
        d.status,
        d.criado_em,
        d.sigma_instituicao_id,
        d.instituicao_nome,
        d.instituicao_cnpj,
        d.sigma_pessoa_id,
        d.representante_nome,
        d.representante_email,
        d.representante_telefone,
        d.diretoria_id,
        d.plano_id,
        d.programa_id,
        d.nome,
        d.descricao,
        d.latitude,
        d.longitude,
        d.geometria_tipo,
        CASE
            WHEN d.geometria IS NULL THEN NULL
            ELSE ST_AsGeoJSON(d.geometria)::jsonb
        END AS geometria_geojson,
        d.classificacao,
        d.complementos
    FROM cadastro.projeto d
"""

_INSERT_SQL = """
    INSERT INTO cadastro.projeto (
        codigo,
        status,
        sigma_instituicao_id,
        instituicao_nome,
        instituicao_cnpj,
        sigma_pessoa_id,
        representante_nome,
        representante_email,
        representante_telefone,
        diretoria_id,
        plano_id,
        nome,
        descricao,
        latitude,
        longitude,
        geometria_tipo,
        geometria,
        classificacao,
        complementos
    ) VALUES (
        %(codigo)s,
        %(status)s,
        %(sigma_instituicao_id)s,
        %(instituicao_nome)s,
        %(instituicao_cnpj)s,
        %(sigma_pessoa_id)s,
        %(representante_nome)s,
        %(representante_email)s,
        %(representante_telefone)s,
        %(diretoria_id)s,
        %(plano_id)s,
        %(nome)s,
        %(descricao)s,
        %(latitude)s,
        %(longitude)s,
        %(geometria_tipo)s,
        ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s::text), 4326),
        %(classificacao)s,
        %(complementos)s
    )
    RETURNING id
"""


def insert(row: dict[str, Any]) -> dict[str, Any]:
    """Insere uma demanda e retorna a linha persistida."""
    with get_connection() as conn:
        try:
            cur = conn.execute(_INSERT_SQL, row)
            inserted = cur.fetchone()
            if not inserted:
                raise RuntimeError("Insert de demanda não retornou id.")
            inserted_id = inserted["id"]
            conn.commit()
        except errors.UniqueViolation as exc:
            conn.rollback()
            raise exc
        found = get_by_uuid(inserted_id)
        if not found:
            raise RuntimeError("Demanda inserida mas não recuperada.")
        return found


def list_all() -> list[dict[str, Any]]:
    """Lista todas as demandas ordenadas da mais recente para a mais antiga."""
    query = _SELECT_BASE + " ORDER BY d.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query).fetchall())


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    """Busca uma demanda pelo código legível."""
    query = _SELECT_BASE + " WHERE d.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


def get_by_uuid(demanda_id: Any) -> dict[str, Any] | None:
    """Busca uma demanda pelo identificador UUID."""
    query = _SELECT_BASE + " WHERE d.id = %s"
    with get_connection() as conn:
        return conn.execute(query, (demanda_id,)).fetchone()


def prepare_insert_params(data: dict[str, Any]) -> dict[str, Any]:
    """Normaliza dict de persistência para parâmetros psycopg."""
    params = dict(data)
    for key in ("classificacao", "complementos"):
        val = params.get(key)
        params[key] = Jsonb(val) if val is not None else None
    geo = params.get("geometria_geojson")
    if geo is not None and not isinstance(geo, str):
        params["geometria_geojson"] = json.dumps(geo)
    return params


_UPDATE_ALLOWED = {
    "status": "status",
    "instituicao_nome": "instituicao_nome",
    "instituicao_cnpj": "instituicao_cnpj",
    "representante_nome": "representante_nome",
    "representante_email": "representante_email",
    "representante_telefone": "representante_telefone",
    "diretoria_id": "diretoria_id",
    "plano_id": "plano_id",
    "nome": "nome",
    "descricao": "descricao",
    "latitude": "latitude",
    "longitude": "longitude",
    "classificacao": "classificacao",
    "complementos": "complementos",
}


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos de uma demanda e retorna o registro final."""
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
    query = sql.SQL("UPDATE cadastro.projeto SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)
