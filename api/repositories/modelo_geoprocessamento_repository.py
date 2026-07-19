"""Persistência de funções e fluxos reutilizáveis do geoprocessamento."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from api.db.connection import get_connection


def listar(tipo: str, modulo: str | None = None) -> list[dict[str, Any]]:
    query = "SELECT definicao FROM geoprocessamento.modelo_geoprocessamento WHERE tipo=%s AND ativo"
    params: list[Any] = [tipo]
    if modulo:
        query += " AND modulo IN (%s,'geral')"
        params.append(modulo)
    query += " ORDER BY nome"
    with get_connection() as conn:
        return [dict(row["definicao"]) for row in conn.execute(query, params).fetchall()]


def obter(modelo_id: str, tipo: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT definicao FROM geoprocessamento.modelo_geoprocessamento WHERE id=%s AND tipo=%s AND ativo",
            (modelo_id, tipo),
        ).fetchone()
        return dict(row["definicao"]) if row else None


def salvar(definicao: dict[str, Any], tipo: str) -> dict[str, Any]:
    modelo_id = str(definicao["id"])
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO geoprocessamento.modelo_geoprocessamento
               (id,tipo,nome,descricao,modulo,definicao)
               VALUES (%s,%s,%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome,
                 descricao=EXCLUDED.descricao,modulo=EXCLUDED.modulo,
                 definicao=EXCLUDED.definicao,ativo=TRUE,atualizado_em=CURRENT_TIMESTAMP""",
            (modelo_id, tipo, definicao.get("nome") or modelo_id, definicao.get("descricao"),
             definicao.get("modulo") or "geral", Jsonb(definicao)),
        )
        conn.commit()
    return definicao


def excluir(modelo_id: str, tipo: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "UPDATE geoprocessamento.modelo_geoprocessamento SET ativo=FALSE,atualizado_em=CURRENT_TIMESTAMP WHERE id=%s AND tipo=%s RETURNING id",
            (modelo_id, tipo),
        ).fetchone()
        conn.commit()
        return bool(row)
