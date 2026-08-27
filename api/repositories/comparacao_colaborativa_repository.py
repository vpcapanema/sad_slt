"""Data access for collaborative AHP pairwise comparisons."""
from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection


def _touch_ambiente_query() -> sql.SQL:
    return sql.SQL(
        "UPDATE ahp.comparacao_colaborativa_ambiente "
        "SET atualizado_em = now() WHERE id = %s"
    )


def insert_ambiente(data: dict[str, Any]) -> dict[str, Any]:
    columns = list(data)
    query = sql.SQL(
        "INSERT INTO ahp.comparacao_colaborativa_ambiente ({cols}) "
        "VALUES ({vals}) RETURNING *"
    ).format(
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {
        key: Jsonb(value) if key in {"convites", "criterios"} else value
        for key, value in data.items()
    }
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.commit()
    return dict(row) if row else {}


def _get_ambiente(query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def get_ambiente_by_token(token: str) -> dict[str, Any] | None:
    return _get_ambiente(
        """
        SELECT a.*,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas
               ,(SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r WHERE r.ambiente_id=a.id AND r.status='em_preenchimento') AS respostas_em_preenchimento
               ,(SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r WHERE r.ambiente_id=a.id AND r.status='enviada' AND r.consistente) AS respostas_consistentes
               ,(SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_analise an WHERE an.ambiente_id=a.id) AS total_analises
          FROM ahp.comparacao_colaborativa_ambiente a
         WHERE a.token = %s
        """,
        (token,),
    )


def get_ambiente_by_hierarquizacao(hierarquizacao_id: Any) -> dict[str, Any] | None:
    return _get_ambiente(
        """
        SELECT a.*,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas
          FROM ahp.comparacao_colaborativa_ambiente a
         WHERE a.hierarquizacao_id = %s
         ORDER BY a.criado_em DESC
         LIMIT 1
        """,
        (hierarquizacao_id,),
    )


def get_ambiente_by_id(ambiente_id: str) -> dict[str, Any] | None:
    return _get_ambiente(
        """
        SELECT a.*,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas
          FROM ahp.comparacao_colaborativa_ambiente a
         WHERE a.id = %s
        """,
        (ambiente_id,),
    )


def get_active_ambiente_by_config(config_tipo: str, config_id: Any) -> dict[str, Any] | None:
    return _get_ambiente(
        """
        SELECT a.*,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas
          FROM ahp.comparacao_colaborativa_ambiente a
         WHERE a.config_tipo = %s AND a.config_id = %s AND a.status = 'ativa'
         ORDER BY a.criado_em DESC
         LIMIT 1
        """,
        (config_tipo, config_id),
    )


def list_ambientes() -> list[dict[str, Any]]:
    query = """
        SELECT a.*,
               COALESCE(a.config_nome, h.nome) AS hierarquizacao_nome,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r WHERE r.ambiente_id=a.id AND r.status='em_preenchimento') AS respostas_em_preenchimento,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_resposta r WHERE r.ambiente_id=a.id AND r.status='enviada' AND r.consistente) AS respostas_consistentes,
               (SELECT COUNT(*)::int FROM ahp.comparacao_colaborativa_analise an WHERE an.ambiente_id=a.id) AS total_analises
          FROM ahp.comparacao_colaborativa_ambiente a
          LEFT JOIN hierarquizacao_demandas.hierarquizacao_portfolio h
            ON h.id = a.hierarquizacao_id
         ORDER BY a.criado_em DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query).fetchall()
    return [dict(row) for row in rows]


def update_ambiente(ambiente_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not data:
        return get_ambiente_by_id(ambiente_id)
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(key), sql.Placeholder(key))
        for key in data
    )
    query = sql.SQL(
        "UPDATE ahp.comparacao_colaborativa_ambiente "
        "SET {sets}, atualizado_em = now() WHERE id = %(ambiente_id)s RETURNING *"
    ).format(sets=assignments)
    params = {
        key: Jsonb(value) if key in {"convites", "criterios"} else value
        for key, value in data.items()
    }
    params["ambiente_id"] = ambiente_id
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.commit()
    return dict(row) if row else None


def delete_ambiente(ambiente_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "DELETE FROM ahp.comparacao_colaborativa_ambiente WHERE id = %s RETURNING id",
            (ambiente_id,),
        ).fetchone()
        conn.commit()
    return row is not None


def list_ambientes_by_hierarquizacao(hierarquizacao_id: Any) -> list[dict[str, Any]]:
    query = """
        SELECT a.*,
               (SELECT COUNT(*)::int
                  FROM ahp.comparacao_colaborativa_resposta r
                 WHERE r.ambiente_id = a.id AND r.status = 'enviada') AS total_respostas
          FROM ahp.comparacao_colaborativa_ambiente a
         WHERE a.hierarquizacao_id = %s
         ORDER BY a.criado_em DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query, (hierarquizacao_id,)).fetchall()
    return [dict(row) for row in rows]


def encerrar_ambientes_anteriores(hierarquizacao_id: Any) -> None:
    query = """
        UPDATE ahp.comparacao_colaborativa_ambiente
           SET status = 'encerrada', atualizado_em = now()
         WHERE hierarquizacao_id = %s AND status = 'ativa'
    """
    with get_connection() as conn:
        conn.execute(query, (hierarquizacao_id,))
        conn.commit()


def encerrar_ambientes_anteriores_config(config_tipo: str, config_id: Any) -> None:
    with get_connection() as conn:
        conn.execute(
            """UPDATE ahp.comparacao_colaborativa_ambiente
                  SET status = 'encerrada', atualizado_em = now()
                WHERE config_tipo = %s AND config_id = %s AND status = 'ativa'""",
            (config_tipo, config_id),
        )
        conn.commit()


def insert_resposta(data: dict[str, Any]) -> dict[str, Any]:
    columns = list(data)
    query = sql.SQL(
        "INSERT INTO ahp.comparacao_colaborativa_resposta ({cols}) VALUES ({vals}) "
        "ON CONFLICT (ambiente_id, email) DO NOTHING RETURNING *"
    ).format(
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {
        key: Jsonb(value) if key in {"matriz_comparacao", "estatisticas"} else value
        for key, value in data.items()
    }
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        if row:
            conn.execute(_touch_ambiente_query(), (data["ambiente_id"],))
        conn.commit()
    return dict(row) if row else {}


def get_resposta_by_ambiente_email(ambiente_id: str, email: str) -> dict[str, Any] | None:
    return _get_ambiente(
        """SELECT * FROM ahp.comparacao_colaborativa_resposta
             WHERE ambiente_id = %s AND lower(email) = lower(%s) LIMIT 1""",
        (ambiente_id, email),
    )


def update_resposta_progresso(resposta_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(key), sql.Placeholder(key)) for key in data
    )
    query = sql.SQL(
        "UPDATE ahp.comparacao_colaborativa_resposta SET {sets}, atualizado_em = now() "
        "WHERE id = %(resposta_id)s RETURNING *"
    ).format(sets=assignments)
    params = {
        key: Jsonb(value) if key in {"matriz_comparacao", "estatisticas"} else value
        for key, value in data.items()
    }
    params["resposta_id"] = resposta_id
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        conn.commit()
    return dict(row) if row else None


def list_respostas(ambiente_id: str) -> list[dict[str, Any]]:
    query = """
        SELECT *
          FROM ahp.comparacao_colaborativa_resposta
         WHERE ambiente_id = %s
         ORDER BY enviado_em DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query, (ambiente_id,)).fetchall()
    return [dict(row) for row in rows]


def list_respostas_central() -> list[dict[str, Any]]:
    query = """
        SELECT r.*, a.hierarquizacao_id,
               COALESCE(a.config_codigo, a.hierarquizacao_codigo) AS hierarquizacao_codigo,
               a.criterios, a.token, COALESCE(a.config_nome, h.nome) AS hierarquizacao_nome,
               a.config_tipo, a.config_id, a.config_codigo, a.config_nome
          FROM ahp.comparacao_colaborativa_resposta r
          JOIN ahp.comparacao_colaborativa_ambiente a ON a.id = r.ambiente_id
          LEFT JOIN hierarquizacao_demandas.hierarquizacao_portfolio h
            ON h.id = a.hierarquizacao_id
         ORDER BY r.enviado_em DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query).fetchall()
    return [dict(row) for row in rows]


def update_resposta(resposta_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not data:
        query = "SELECT * FROM ahp.comparacao_colaborativa_resposta WHERE id = %s"
        with get_connection() as conn:
            row = conn.execute(query, (resposta_id,)).fetchone()
        return dict(row) if row else None
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(key), sql.Placeholder(key)) for key in data
    )
    query = sql.SQL(
        "UPDATE ahp.comparacao_colaborativa_resposta SET {sets} "
        "WHERE id = %(resposta_id)s RETURNING *"
    ).format(sets=assignments)
    params = {**data, "resposta_id": resposta_id}
    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        if row:
            conn.execute(_touch_ambiente_query(), (row["ambiente_id"],))
        conn.commit()
    return dict(row) if row else None


def delete_resposta(resposta_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "DELETE FROM ahp.comparacao_colaborativa_resposta WHERE id = %s RETURNING ambiente_id",
            (resposta_id,),
        ).fetchone()
        if row:
            conn.execute(_touch_ambiente_query(), (row["ambiente_id"],))
        conn.commit()
    return row is not None


def resposta_existe(ambiente_id: str, email: str) -> bool:
    query = """
        SELECT 1
          FROM ahp.comparacao_colaborativa_resposta
         WHERE ambiente_id = %s AND lower(email) = lower(%s)
         LIMIT 1
    """
    with get_connection() as conn:
        row = conn.execute(query, (ambiente_id, email)).fetchone()
    return row is not None


def atualizar_consolidacao(
    ambiente_id: str,
    data: dict[str, Any],
    hierarquizacao_data: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Persist the round and hierarchy result in one transaction."""
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(key), sql.Placeholder(key))
        for key in data
    )
    query = sql.SQL(
        "UPDATE ahp.comparacao_colaborativa_ambiente "
        "SET {sets}, atualizado_em = now() "
        "WHERE id = %(ambiente_id)s RETURNING *"
    ).format(sets=assignments)
    params = {
        key: Jsonb(value) if key in {"matriz_consolidada", "pesos_consolidados"} else value
        for key, value in data.items()
    }
    params["ambiente_id"] = ambiente_id

    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        if row and hierarquizacao_data:
            linked = conn.execute(
                """
                UPDATE hierarquizacao_demandas.hierarquizacao_portfolio
                   SET dados_hierarquizacao =
                           COALESCE(dados_hierarquizacao, '{}'::jsonb)
                           || %(dados_hierarquizacao)s,
                       atualizado_em = now()
                 WHERE id = %(hierarquizacao_id)s
                 RETURNING id
                """,
                {
                    "dados_hierarquizacao": Jsonb(hierarquizacao_data),
                    "hierarquizacao_id": row["hierarquizacao_id"],
                },
            ).fetchone()
            if not linked:
                raise RuntimeError("Linked hierarchy was not found.")
        conn.commit()
    return dict(row) if row else None
