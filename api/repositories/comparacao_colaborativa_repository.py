"""Acesso a dados — preenchimento colaborativo da matriz pareada."""

from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection


def _touch_ambiente_query() -> sql.SQL:
    return sql.SQL("UPDATE ahp.comparacao_colaborativa_ambiente SET atualizado_em = now() WHERE id = %s")


def insert_ambiente(data: dict[str, Any]) -> dict[str, Any]:
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO ahp.comparacao_colaborativa_ambiente ({cols}) VALUES ({vals}) RETURNING *").format(
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {k: Jsonb(v) if k == "convites" else v for k, v in data.items()}
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.commit()
    return dict(row) if row else {}


def get_ambiente_by_token(token: str) -> dict[str, Any] | None:
    query = """
        SELECT a.*,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r
                WHERE r.ambiente_id = a.id) AS total_respostas
        FROM ahp.comparacao_colaborativa_ambiente a
        WHERE a.token = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (token,)).fetchone()
    return dict(row) if row else None


def get_ambiente_by_config(tipo: str, codigo: str) -> dict[str, Any] | None:
    query = """
        SELECT a.*,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r
                WHERE r.ambiente_id = a.id) AS total_respostas
        FROM ahp.comparacao_colaborativa_ambiente a
        WHERE a.config_tipo = %s AND a.config_codigo = %s
        ORDER BY a.criado_em DESC
        LIMIT 1
    """
    with get_connection() as conn:
        row = conn.execute(query, (tipo, codigo)).fetchone()
    return dict(row) if row else None


def get_ambiente_by_id(ambiente_id: str) -> dict[str, Any] | None:
    query = """
        SELECT a.*,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r
                WHERE r.ambiente_id = a.id) AS total_respostas
        FROM ahp.comparacao_colaborativa_ambiente a
        WHERE a.id = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (ambiente_id,)).fetchone()
    return dict(row) if row else None


def encerrar_ambientes_anteriores(tipo: str, codigo: str) -> None:
    query = """
        UPDATE ahp.comparacao_colaborativa_ambiente
        SET status = 'encerrada', atualizado_em = now()
        WHERE config_tipo = %s AND config_codigo = %s AND status = 'ativa'
    """
    with get_connection() as conn:
        conn.execute(query, (tipo, codigo))
        conn.commit()


def insert_resposta(data: dict[str, Any]) -> dict[str, Any]:
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO ahp.comparacao_colaborativa_resposta ({cols}) VALUES ({vals}) RETURNING *").format(
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    json_fields = {"matriz_comparacao", "estatisticas"}
    params = {k: Jsonb(v) if k in json_fields else v for k, v in data.items()}
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.execute(_touch_ambiente_query(), (data["ambiente_id"],))
        conn.commit()
    return dict(row) if row else {}


def list_respostas(ambiente_id: str) -> list[dict[str, Any]]:
    query = """
        SELECT * FROM ahp.comparacao_colaborativa_resposta
        WHERE ambiente_id = %s
        ORDER BY enviado_em DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query, (ambiente_id,)).fetchall()
    return [dict(r) for r in rows]


def resposta_existe(ambiente_id: str, email: str) -> bool:
    query = """
        SELECT 1 FROM ahp.comparacao_colaborativa_resposta
        WHERE ambiente_id = %s AND lower(email) = lower(%s)
        LIMIT 1
    """
    with get_connection() as conn:
        row = conn.execute(query, (ambiente_id, email)).fetchone()
    return row is not None
