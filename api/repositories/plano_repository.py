"""Acesso a dados — demandas.plano (nível 1)."""
from __future__ import annotations

from typing import Any

from psycopg import sql

from api.db.connection import get_connection

_SELECT_BASE = """
    SELECT
        p.id,
        p.codigo,
        p.diretoria_id,
        p.nome,
        p.descricao,
        p.objetivo_estrategico,
        p.responsavel,
        p.vigencia_inicio,
        p.vigencia_fim,
        p.valor_global,
        p.status,
        p.criado_em,
        p.atualizado_em
    FROM demandas.plano p
"""

_INSERT_SQL = """
    INSERT INTO demandas.plano (
        codigo, diretoria_id, nome, descricao,
        objetivo_estrategico, responsavel, vigencia_inicio, vigencia_fim,
        valor_global, status
    ) VALUES (
        %(codigo)s, %(diretoria_id)s, %(nome)s, %(descricao)s,
        %(objetivo_estrategico)s, %(responsavel)s, %(vigencia_inicio)s, %(vigencia_fim)s,
        %(valor_global)s, %(status)s
    )
    RETURNING id
"""

_INSERT_UE_SQL = """
    INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
    VALUES (%s, %s)
    ON CONFLICT DO NOTHING
"""


def insert(row: dict[str, Any], unidades: list[str] | None = None) -> dict[str, Any]:
    """Insere um plano e seus vínculos de abrangência espacial."""
    with get_connection() as conn:
        cur = conn.execute(_INSERT_SQL, row)
        inserted = cur.fetchone()
        if not inserted:
            raise RuntimeError("Insert de plano não retornou id.")
        new_id = inserted["id"]
        for ue in unidades or []:
            conn.execute(_INSERT_UE_SQL, (new_id, ue))
        conn.commit()
    found = get_by_codigo(row["codigo"])
    if not found:
        raise RuntimeError("Plano inserido mas não recuperado.")
    return found


_UPDATE_ALLOWED = {
    "status": "status",
    "nome": "nome",
    "descricao": "descricao",
    "diretoria_id": "diretoria_id",
    "objetivo_estrategico": "objetivo_estrategico",
    "responsavel": "responsavel",
    "vigencia_inicio": "vigencia_inicio",
    "vigencia_fim": "vigencia_fim",
    "valor_global": "valor_global",
}


def list_all() -> list[dict[str, Any]]:
    """Lista todos os planos, do mais recente para o mais antigo."""
    query = _SELECT_BASE + " ORDER BY p.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query).fetchall())


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    """Busca um plano pelo código legível."""
    query = _SELECT_BASE + " WHERE p.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


_APROVAR_SQL = """
    UPDATE demandas.plano
       SET status = 'elegivel_ahp',
           aprovado_em = CURRENT_TIMESTAMP,
           aprovado_por = %(aprovado_por)s,
           motivo_aprovacao = NULLIF(%(motivo)s, '')
     WHERE codigo = %(codigo)s
"""


def aprovar(codigo: str, *, aprovado_por: str | None, motivo: str | None) -> dict[str, Any] | None:
    """Promove o plano ao universo AHP (transição de status in-place)."""
    params = {"codigo": codigo, "aprovado_por": aprovado_por, "motivo": motivo}
    with get_connection() as conn:
        conn.execute(_APROVAR_SQL, params)
        conn.commit()
    return get_by_codigo(codigo)


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos de um plano."""
    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(_UPDATE_ALLOWED[key]), sql.Placeholder(key))
        for key in data
        if key in _UPDATE_ALLOWED
    ]
    if not assignments:
        return get_by_codigo(codigo)
    params = {key: data[key] for key in data if key in _UPDATE_ALLOWED}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE demandas.plano SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)
