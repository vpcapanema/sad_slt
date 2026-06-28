"""Acesso a dados — demandas.programa (nível 2)."""
from __future__ import annotations

from typing import Any

from psycopg import sql

from api.db.connection import get_connection
from api.constants import STATUS_POS_APROVACAO, STATUS_PRE_APROVACAO

_SELECT_BASE = """
    SELECT
        pg.id,
        pg.codigo,
        pg.plano_id,
        pl.codigo AS plano_codigo,
        pl.nome   AS plano_nome,
        pl.diretoria_id,
        pg.nome,
        pg.descricao,
        pg.objetivo,
        pg.publico_alvo,
        pg.orgao_responsavel,
        pg.justificativa,
        pg.valor_global,
        pg.vinculo_institucional,
        pg.sigma_instituicao_id,
        pg.instituicao_nome,
        pg.instituicao_razao_social,
        pg.instituicao_nome_fantasia,
        pg.instituicao_cnpj,
        pg.sigma_pessoa_id,
        pg.representante_nome,
        pg.representante_email,
        pg.representante_telefone,
        pg.status,
        pg.criado_em,
        pg.atualizado_em,
        COALESCE(
            (
                SELECT array_agg(pue.unidade_espacial_id::text ORDER BY ue.nome)
                FROM demandas.programa_unidade_espacial pue
                JOIN geo.unidade_espacial ue ON ue.id = pue.unidade_espacial_id
                WHERE pue.programa_id = pg.id
            ),
            ARRAY[]::text[]
        ) AS unidades_espaciais
    FROM demandas.programa pg
    LEFT JOIN demandas.plano pl ON pl.id = pg.plano_id
"""

_INSERT_SQL = """
    INSERT INTO demandas.programa (
        codigo, plano_id, nome, descricao,
        objetivo, publico_alvo, orgao_responsavel, justificativa,
        valor_global, vinculo_institucional,
        sigma_instituicao_id, instituicao_nome, instituicao_razao_social,
        instituicao_nome_fantasia, instituicao_cnpj,
        sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
        status, criado_por, atualizado_por
    ) VALUES (
        %(codigo)s, %(plano_id)s, %(nome)s, %(descricao)s,
        %(objetivo)s, %(publico_alvo)s, %(orgao_responsavel)s, %(justificativa)s,
        %(valor_global)s, %(vinculo_institucional)s,
        %(sigma_instituicao_id)s, %(instituicao_nome)s, %(instituicao_razao_social)s,
        %(instituicao_nome_fantasia)s, %(instituicao_cnpj)s,
        %(sigma_pessoa_id)s, %(representante_nome)s, %(representante_email)s, %(representante_telefone)s,
        %(status)s, %(criado_por)s, %(atualizado_por)s
    )
    RETURNING id
"""

_INSERT_UE_SQL = """
    INSERT INTO demandas.programa_unidade_espacial (programa_id, unidade_espacial_id)
    VALUES (%s, %s)
    ON CONFLICT DO NOTHING
"""


def insert(row: dict[str, Any], unidades: list[str] | None = None) -> dict[str, Any]:
    """Insere um programa e seus vínculos de abrangência espacial."""
    with get_connection() as conn:
        cur = conn.execute(_INSERT_SQL, row)
        inserted = cur.fetchone()
        if not inserted:
            raise RuntimeError("Insert de programa não retornou id.")
        new_id = inserted["id"]
        for ue in unidades or []:
            conn.execute(_INSERT_UE_SQL, (new_id, ue))
        conn.commit()
    found = get_by_codigo(row["codigo"])
    if not found:
        raise RuntimeError("Programa inserido mas não recuperado.")
    return found


_UPDATE_ALLOWED = {
    "status": "status",
    "plano_id": "plano_id",
    "nome": "nome",
    "descricao": "descricao",
    "objetivo": "objetivo",
    "publico_alvo": "publico_alvo",
    "orgao_responsavel": "orgao_responsavel",
    "justificativa": "justificativa",
    "valor_global": "valor_global",
    "sigma_instituicao_id": "sigma_instituicao_id",
    "instituicao_nome": "instituicao_nome",
    "instituicao_cnpj": "instituicao_cnpj",
    "instituicao_razao_social": "instituicao_razao_social",
    "instituicao_nome_fantasia": "instituicao_nome_fantasia",
    "sigma_pessoa_id": "sigma_pessoa_id",
    "representante_nome": "representante_nome",
    "representante_email": "representante_email",
    "representante_telefone": "representante_telefone",
    "atualizado_por": "atualizado_por",
}


def list_all() -> list[dict[str, Any]]:
    """Lista todos os programas, do mais recente para o mais antigo."""
    query = _SELECT_BASE + " ORDER BY pg.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query).fetchall())


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    """Busca um programa pelo código legível."""
    query = _SELECT_BASE + " WHERE pg.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


_APROVAR_SQL = """
    UPDATE demandas.programa
       SET status = %(pos_aprovacao)s,
           aprovado_em = CURRENT_TIMESTAMP,
           aprovado_por = %(aprovado_por)s,
           motivo_aprovacao = NULLIF(%(motivo)s, '')
     WHERE codigo = %(codigo)s
       AND status = ANY(%(pre)s)
     RETURNING id
"""


def aprovar(codigo: str, *, aprovado_por: str | None, motivo: str | None) -> dict[str, Any] | None:
    """Promove o programa ao universo AHP (transição de status in-place)."""
    params = {
        "codigo": codigo,
        "aprovado_por": aprovado_por,
        "motivo": motivo,
        "pre": list(STATUS_PRE_APROVACAO),
        "pos_aprovacao": STATUS_POS_APROVACAO,
    }
    with get_connection() as conn:
        row = conn.execute(_APROVAR_SQL, params).fetchone()
        conn.commit()
    if not row:
        return None
    return get_by_codigo(codigo)


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos de um programa."""
    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(_UPDATE_ALLOWED[key]), sql.Placeholder(key))
        for key in data
        if key in _UPDATE_ALLOWED
    ]
    if not assignments:
        return get_by_codigo(codigo)
    params = {key: data[key] for key in data if key in _UPDATE_ALLOWED}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE demandas.programa SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)


def list_by_plano_id(plano_id: Any) -> list[dict[str, Any]]:
    """Lista programas filhos de um plano."""
    query = _SELECT_BASE + " WHERE pg.plano_id = %s ORDER BY pg.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query, (plano_id,)).fetchall())


def delete_by_codigo(codigo: str) -> bool:
    """Remove um programa pelo código legível."""
    with get_connection() as conn:
        conn.execute(
            "DELETE FROM demandas.indicadores WHERE programa_id = (SELECT id FROM demandas.programa WHERE codigo = %s)",
            (codigo,),
        )
        cur = conn.execute("DELETE FROM demandas.programa WHERE codigo = %s RETURNING id", (codigo,))
        deleted = cur.fetchone()
        conn.commit()
    return deleted is not None
