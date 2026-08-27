from __future__ import annotations

from typing import Any
from psycopg import sql
from psycopg.types.json import Jsonb
from api.db.connection import get_connection

JSON_FIELDS = {"matriz_consolidada", "pesos_consolidados", "estatisticas_analise"}


def insert(data: dict[str, Any]) -> dict[str, Any]:
    cols = list(data)
    query = sql.SQL("INSERT INTO ahp.comparacao_colaborativa_analise ({}) VALUES ({}) RETURNING *").format(
        sql.SQL(",").join(map(sql.Identifier, cols)), sql.SQL(",").join(sql.Placeholder(c) for c in cols)
    )
    params = {k: Jsonb(v) if k in JSON_FIELDS else v for k, v in data.items()}
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone(); conn.commit()
    return dict(row)


def insert_with_respostas(data: dict[str, Any], respostas: list[dict[str, Any]]) -> dict[str, Any]:
    """Cria o cenário e seu recorte de respostas na mesma transação."""
    cols = list(data)
    query = sql.SQL("INSERT INTO ahp.comparacao_colaborativa_analise ({}) VALUES ({}) RETURNING *").format(
        sql.SQL(",").join(map(sql.Identifier, cols)), sql.SQL(",").join(sql.Placeholder(c) for c in cols)
    )
    params = {k: Jsonb(v) if k in JSON_FIELDS else v for k, v in data.items()}
    with get_connection() as conn:
        row = dict(conn.execute(query, params).fetchone())
        with conn.cursor() as cursor:
            cursor.executemany(
                """INSERT INTO ahp.comparacao_colaborativa_analise_resposta
                   (analise_id,resposta_id,incluida,motivo_exclusao,considerada_por)
                   VALUES (%s,%s,%s,%s,%s)""",
                [(str(row["id"]), r["resposta_id"], r.get("incluida", True), r.get("motivo_exclusao"), r.get("considerada_por")) for r in respostas],
            )
        conn.commit()
    return row


def add_respostas(analise_id: str, respostas: list[dict[str, Any]]) -> None:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.executemany(
                """INSERT INTO ahp.comparacao_colaborativa_analise_resposta
                   (analise_id,resposta_id,incluida,motivo_exclusao,considerada_por)
                   VALUES (%s,%s,%s,%s,%s)""",
                [(analise_id, r["resposta_id"], r.get("incluida", True), r.get("motivo_exclusao"), r.get("considerada_por")) for r in respostas],
            )
        conn.commit()


def list_by_ambiente(ambiente_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT a.*, count(ar.resposta_id) FILTER (WHERE ar.incluida) AS respostas_incluidas
                 FROM ahp.comparacao_colaborativa_analise a
                 LEFT JOIN ahp.comparacao_colaborativa_analise_resposta ar ON ar.analise_id=a.id
                WHERE a.ambiente_id=%s GROUP BY a.id ORDER BY a.criado_em DESC""", (ambiente_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_by_id(analise_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM ahp.comparacao_colaborativa_analise WHERE id=%s", (analise_id,)).fetchone()
    return dict(row) if row else None


def list_resposta_ids(analise_id: str) -> list[str]:
    with get_connection() as conn:
        rows = conn.execute("SELECT resposta_id FROM ahp.comparacao_colaborativa_analise_resposta WHERE analise_id=%s AND incluida ORDER BY resposta_id", (analise_id,)).fetchall()
    return [str(r["resposta_id"]) for r in rows]


def homologar(analise_id: str, ambiente_id: str, usuario_id: str | None) -> dict[str, Any]:
    with get_connection() as conn:
        conn.execute("UPDATE ahp.comparacao_colaborativa_analise SET status='arquivada',atualizado_em=now() WHERE ambiente_id=%s AND status='homologada' AND id<>%s", (ambiente_id, analise_id))
        row = conn.execute("UPDATE ahp.comparacao_colaborativa_analise SET status='homologada',homologado_por=%s,homologado_em=now(),atualizado_em=now() WHERE id=%s RETURNING *", (usuario_id, analise_id)).fetchone()
        conn.execute("UPDATE ahp.comparacao_colaborativa_ambiente SET analise_homologada_id=%s,atualizado_em=now() WHERE id=%s", (analise_id, ambiente_id))
        conn.commit()
    return dict(row) if row else {}
