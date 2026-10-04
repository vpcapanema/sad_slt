"""Acesso a dados dos agrupamentos reutilizáveis de demandas."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from api.db.connection import get_connection

_TABLE = "demandas.grupos_demandas"


def list_all() -> list[dict[str, Any]]:
    query = f"""
        SELECT id, codigo, nome, descricao, tipo_demanda_id,
               jsonb_array_length(objetos) AS quantidade_demandas,
               criado_em, atualizado_em
          FROM {_TABLE}
         ORDER BY criado_em DESC, codigo DESC
    """
    with get_connection() as conn:
        return list(conn.execute(query).fetchall())


def get_by_id(agrupamento_id: UUID) -> dict[str, Any] | None:
    query = f"""
        SELECT id, codigo, nome, descricao, tipo_demanda_id, objetos,
               jsonb_array_length(objetos) AS quantidade_demandas,
               criado_em, atualizado_em
          FROM {_TABLE}
         WHERE id = %s
    """
    with get_connection() as conn:
        return conn.execute(query, (agrupamento_id,)).fetchone()


def insert(data: dict[str, Any]) -> dict[str, Any]:
    query = f"""
        INSERT INTO {_TABLE}
            (codigo, nome, descricao, tipo_demanda_id, objetos, criado_por)
        VALUES (%(codigo)s, %(nome)s, %(descricao)s, %(tipo_demanda_id)s,
                %(objetos)s, %(criado_por)s)
        RETURNING id, codigo, nome, descricao, tipo_demanda_id, objetos,
                  jsonb_array_length(objetos) AS quantidade_demandas,
                  criado_em, atualizado_em
    """
    params = dict(data)
    params["objetos"] = Jsonb(data["objetos"], dumps=lambda value: json.dumps(value, ensure_ascii=False))
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
    if not row:
        raise RuntimeError("A gravação do agrupamento não retornou um registro.")
    return row