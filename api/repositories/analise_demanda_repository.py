"""Acesso a dados — demandas.analise_demanda (análise de admissibilidade)."""
from __future__ import annotations

from typing import Any

from psycopg import sql

from api.db.connection import get_connection

_SELECT_BASE = """
    SELECT id,
           demanda_codigo,
           demanda_tipo,
           criterio_competencia,
           criterio_clareza,
           criterio_finalidade_publica,
           criterio_relevancia_setorial,
           criterio_nao_duplicidade,
           resultado,
           parecer_texto,
           parecer_complemento,
           decisao,
           avaliador_id,
           avaliador_nome,
           (parecer_pdf IS NOT NULL) AS tem_parecer_pdf,
           parecer_pdf_gerado_em,
           criado_em,
           atualizado_em
    FROM demandas.analise_demanda
"""

_UPSERT_ALLOWED = (
    "criterio_competencia",
    "criterio_clareza",
    "criterio_finalidade_publica",
    "criterio_relevancia_setorial",
    "criterio_nao_duplicidade",
    "resultado",
    "parecer_texto",
    "parecer_complemento",
    "decisao",
    "avaliador_id",
    "avaliador_nome",
)


def get_by_codigo(demanda_codigo: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            f"{_SELECT_BASE} WHERE demanda_codigo = %(codigo)s",
            {"codigo": demanda_codigo},
        ).fetchone()
    return dict(row) if row else None


def upsert(
    *,
    demanda_codigo: str,
    demanda_tipo: str,
    campos: dict[str, Any],
) -> dict[str, Any]:
    """Cria ou atualiza a análise da demanda; só grava colunas conhecidas."""
    dados = {key: campos[key] for key in _UPSERT_ALLOWED if key in campos}

    colunas = ["demanda_codigo", "demanda_tipo", *dados]
    params: dict[str, Any] = {
        "demanda_codigo": demanda_codigo,
        "demanda_tipo": demanda_tipo,
        **dados,
    }

    atualizacoes = [
        sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(col), sql.Identifier(col))
        for col in ("demanda_tipo", *dados)
    ]

    query = sql.SQL(
        "INSERT INTO demandas.analise_demanda ({colunas}) VALUES ({valores}) "
        "ON CONFLICT (demanda_codigo) DO UPDATE SET {atualizacoes} RETURNING id"
    ).format(
        colunas=sql.SQL(", ").join(sql.Identifier(col) for col in colunas),
        valores=sql.SQL(", ").join(sql.Placeholder(col) for col in colunas),
        atualizacoes=sql.SQL(", ").join(atualizacoes),
    )

    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()

    row = get_by_codigo(demanda_codigo)
    if not row:
        raise RuntimeError("Análise gravada mas não recuperada.")
    return row


def salvar_pdf(*, demanda_codigo: str, pdf: bytes) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            """
            UPDATE demandas.analise_demanda
               SET parecer_pdf = %(pdf)s,
                   parecer_pdf_gerado_em = CURRENT_TIMESTAMP
             WHERE demanda_codigo = %(codigo)s
            """,
            {"codigo": demanda_codigo, "pdf": pdf},
        )
        conn.commit()
    return cur.rowcount > 0


def get_pdf(demanda_codigo: str) -> bytes | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT parecer_pdf FROM demandas.analise_demanda WHERE demanda_codigo = %(codigo)s",
            {"codigo": demanda_codigo},
        ).fetchone()
    if not row or row["parecer_pdf"] is None:
        return None
    return bytes(row["parecer_pdf"])
