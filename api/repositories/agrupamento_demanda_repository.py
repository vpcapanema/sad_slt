"""Acesso a dados dos agrupamentos reutilizáveis de demandas."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from api.constants import TIPO_DEMANDA_ID_TO_COD
from api.db.connection import get_connection

_TABLE = "demandas.grupos_demandas"
_FORA_DO_REGISTRO = {"geometria"}


def hidratar_objetos(conn: Any, tipo_demanda_id: int | None, objetos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Monta cada membro a partir do cadastro vivo; o grupo guarda só o vínculo (id)."""
    tipo = TIPO_DEMANDA_ID_TO_COD.get(tipo_demanda_id)
    ids = [str(o["id"]) for o in objetos if isinstance(o, dict) and o.get("id")]
    if not tipo or not ids:
        return objetos
    vivos = {
        str(r["id"]): r for r in conn.execute(
            f"SELECT * FROM demandas.{tipo} WHERE id = ANY(%s::uuid[])", (ids,)
        ).fetchall()
    }
    resultado = []
    for objeto in objetos:
        vivo = vivos.get(str(objeto.get("id")))
        if not vivo:
            continue  # demanda removida do cadastro deixa de compor o grupo
        resultado.append({
            **{k: v for k, v in vivo.items() if k not in _FORA_DO_REGISTRO},
            "tipo_demanda": tipo,
            **({"grupo_id": objeto["grupo_id"]} if objeto.get("grupo_id") else {}),
        })
    return resultado


def get_by_id(agrupamento_id: UUID) -> dict[str, Any] | None:
    query = f"""
        SELECT id, codigo, nome, descricao, tipo_demanda_id, objetos,
               jsonb_array_length(objetos) AS quantidade_demandas,
               criado_em, atualizado_em, criado_por
          FROM {_TABLE}
         WHERE id = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (agrupamento_id,)).fetchone()
        if row:
            row["objetos"] = hidratar_objetos(conn, row["tipo_demanda_id"], row["objetos"] or [])
        return row


def list_all() -> list[dict[str, Any]]:
    query = f"""
        SELECT id, codigo, nome, descricao, tipo_demanda_id,
               jsonb_array_length(objetos) AS quantidade_demandas,
               criado_em, atualizado_em, criado_por
          FROM {_TABLE}
         ORDER BY criado_em DESC, codigo DESC
    """
    with get_connection() as conn:
        return list(conn.execute(query).fetchall())


def insert(data: dict[str, Any]) -> dict[str, Any]:
    query = f"""
        INSERT INTO {_TABLE}
            (codigo, nome, descricao, tipo_demanda_id, objetos, criado_por)
        VALUES (%(codigo)s, %(nome)s, %(descricao)s, %(tipo_demanda_id)s,
                %(objetos)s, %(criado_por)s)
        RETURNING id, codigo, nome, descricao, tipo_demanda_id, objetos,
                  jsonb_array_length(objetos) AS quantidade_demandas,
                  criado_em, atualizado_em, criado_por
    """
    params = dict(data)
    params["objetos"] = Jsonb(data["objetos"], dumps=lambda value: json.dumps(value, ensure_ascii=False))
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        if row:
            row["objetos"] = hidratar_objetos(conn, row["tipo_demanda_id"], row["objetos"] or [])
    if not row:
        raise RuntimeError("A gravação do agrupamento não retornou um registro.")
    return row

def update(agrupamento_id: UUID, data: dict[str, Any]) -> dict[str, Any] | None:
    params = dict(data, id=agrupamento_id)
    params["objetos"] = Jsonb(data["objetos"], dumps=lambda value: json.dumps(value, ensure_ascii=False))
    with get_connection() as conn:
        row = conn.execute(f"""
            UPDATE {_TABLE}
               SET nome=%(nome)s, descricao=%(descricao)s,
                   tipo_demanda_id=%(tipo_demanda_id)s, objetos=%(objetos)s,
                   atualizado_em=CURRENT_TIMESTAMP
             WHERE id=%(id)s
             RETURNING *, jsonb_array_length(objetos) AS quantidade_demandas
        """, params).fetchone()
        if row:
            row["objetos"] = hidratar_objetos(conn, row["tipo_demanda_id"], row["objetos"] or [])
        return row
