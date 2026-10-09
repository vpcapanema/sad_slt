"""Acesso a dados — demandas.plano (nível 1)."""
from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.repositories import geometria_historico_repository
from api.constants import STATUS_POS_APROVACAO, STATUS_PRE_APROVACAO, STATUS_PRE_REPROVACAO, STATUS_REPROVACAO

_SELECT_BASE = """
    SELECT
        p.id,
        p.codigo,
        p.diretoria_id,
        p.nome,
        p.descricao,
        p.objetivo_estrategico,
        p.responsavel,
        p.sigma_instituicao_id,
        p.instituicao_nome,
        p.instituicao_razao_social,
        p.instituicao_nome_fantasia,
        p.instituicao_cnpj,
        p.sigma_pessoa_id,
        p.representante_nome,
        p.representante_email,
        p.representante_telefone,
        p.vigencia_inicio,
        p.vigencia_fim,
        p.valor_global,
        p.atributos_cadastrais,
        p.maturidade,
        p.prazo_referencia_meses,
        p.base_estimativa_prazo,
        p.status,
        p.aprovado_em,
        p.aprovado_por,
        p.reprovado_em,
        p.reprovado_por,
        p.motivo_reprovacao,
        p.criado_em,
        p.atualizado_em,
        p.criado_por,
        p.atualizado_por,
        COALESCE(
            (
                SELECT array_agg(pue.unidade_espacial_id::text ORDER BY ue.nome)
                FROM demandas.plano_unidade_espacial pue
                JOIN geo.unidade_espacial ue ON ue.id = pue.unidade_espacial_id
                WHERE pue.plano_id = p.id
            ),
            ARRAY[]::text[]
        ) AS unidades_espaciais
    FROM demandas.plano p
"""

_INSERT_SQL = """
    INSERT INTO demandas.plano (
        codigo, diretoria_id, nome, descricao,
        objetivo_estrategico, responsavel,
        sigma_instituicao_id, instituicao_nome, instituicao_razao_social,
        instituicao_nome_fantasia, instituicao_cnpj,
        sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
        vigencia_inicio, vigencia_fim,
        valor_global, atributos_cadastrais, maturidade, prazo_referencia_meses, base_estimativa_prazo,
        status, criado_por, atualizado_por
    ) VALUES (
        %(codigo)s, %(diretoria_id)s, %(nome)s, %(descricao)s,
        %(objetivo_estrategico)s, %(responsavel)s,
        %(sigma_instituicao_id)s, %(instituicao_nome)s, %(instituicao_razao_social)s,
        %(instituicao_nome_fantasia)s, %(instituicao_cnpj)s,
        %(sigma_pessoa_id)s, %(representante_nome)s, %(representante_email)s, %(representante_telefone)s,
        %(vigencia_inicio)s, %(vigencia_fim)s,
        %(valor_global)s, %(atributos_cadastrais)s, %(maturidade)s, %(prazo_referencia_meses)s, %(base_estimativa_prazo)s,
        %(status)s, %(criado_por)s, %(atualizado_por)s
    )
    RETURNING id
"""

_INSERT_UE_SQL = """
    INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
    VALUES (%s, %s)
    ON CONFLICT DO NOTHING
"""

# Geometria materializada do plano: cópia fiel da união das unidades
# espaciais selecionadas, ou a geometria desenhada em tela quando enviada.
_SET_GEOMETRIA_UNIDADES_SQL = """
    UPDATE demandas.plano p
       SET geometria = ST_Transform(u.geom, Find_SRID('demandas','plano','geometria')),
           geometria_origem = 'unidades_espaciais'
      FROM (
            SELECT ST_Multi(ST_Union(ue.geom)) AS geom
              FROM demandas.plano_unidade_espacial pue
              JOIN geo.unidade_espacial ue ON ue.id = pue.unidade_espacial_id
             WHERE pue.plano_id = %(id)s
           ) u
     WHERE p.id = %(id)s AND u.geom IS NOT NULL
"""

_SET_GEOMETRIA_DESENHO_SQL = """
    UPDATE demandas.plano
       SET geometria = ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%(geojson)s::text), 4326), Find_SRID('demandas','plano','geometria')),
           geometria_origem = 'desenho'
     WHERE id = %(id)s
"""


def insert(
    row: dict[str, Any],
    unidades: list[str] | None = None,
    geometria_geojson: str | None = None,
    arquivo_geometria: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Insere um plano, seus vínculos de abrangência espacial e a geometria materializada.

    Com ``arquivo_geometria`` (upload), a versão e o arquivo original vão para
    o histórico de geometrias na mesma transação."""
    row = {
        "maturidade": None,
        "prazo_referencia_meses": None,
        "base_estimativa_prazo": None,
        **row,
        "atributos_cadastrais": Jsonb(row.get("atributos_cadastrais") or {}),
    }
    with get_connection() as conn:
        cur = conn.execute(_INSERT_SQL, row)
        inserted = cur.fetchone()
        if not inserted:
            raise RuntimeError("Insert de plano não retornou id.")
        new_id = inserted["id"]
        for ue in unidades or []:
            conn.execute(_INSERT_UE_SQL, (new_id, ue))
        if geometria_geojson:
            conn.execute(_SET_GEOMETRIA_DESENHO_SQL, {"id": new_id, "geojson": geometria_geojson})
        elif unidades:
            conn.execute(_SET_GEOMETRIA_UNIDADES_SQL, {"id": new_id})
        if arquivo_geometria is not None:
            geometria_historico_repository.insert_upload(
                conn,
                alvo="plano",
                alvo_id=new_id,
                geometria_geojson=geometria_geojson,
                arquivo=arquivo_geometria,
                criado_por=row.get("criado_por"),
            )
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
    "atributos_cadastrais": "atributos_cadastrais",
    "maturidade": "maturidade",
    "prazo_referencia_meses": "prazo_referencia_meses",
    "base_estimativa_prazo": "base_estimativa_prazo",
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
       SET status = %(pos_aprovacao)s,
           aprovado_em = CURRENT_TIMESTAMP,
           aprovado_por = %(aprovado_por)s,
           atualizado_por = %(aprovado_por)s,
           motivo_aprovacao = COALESCE(%(motivo)s, '')
     WHERE codigo = %(codigo)s
       AND status = ANY(%(pre)s)
     RETURNING id
"""


def aprovar(codigo: str, *, aprovado_por: str | None, motivo: str | None) -> dict[str, Any] | None:
    """Promove o plano ao universo AHP (transição de status in-place)."""
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


_REPROVAR_SQL = """
    UPDATE demandas.plano
       SET status = %(status_reprovado)s,
           reprovado_em = CURRENT_TIMESTAMP,
           reprovado_por = %(reprovado_por)s,
           atualizado_por = %(reprovado_por)s,
           motivo_reprovacao = %(justificativa)s
     WHERE codigo = %(codigo)s
       AND status = ANY(%(pre)s)
     RETURNING id
"""


def reprovar(codigo: str, *, reprovado_por: str | None, justificativa: str) -> dict[str, Any] | None:
    params = {
        "codigo": codigo,
        "reprovado_por": reprovado_por,
        "justificativa": justificativa,
        "pre": list(STATUS_PRE_REPROVACAO),
        "status_reprovado": STATUS_REPROVACAO,
    }
    with get_connection() as conn:
        row = conn.execute(_REPROVAR_SQL, params).fetchone()
        conn.commit()
    return get_by_codigo(codigo) if row else None


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Atualiza os campos permitidos de um plano."""
    assignments = [
        sql.SQL("{} = {}").format(sql.Identifier(_UPDATE_ALLOWED[key]), sql.Placeholder(key))
        for key in data
        if key in _UPDATE_ALLOWED
    ]
    if not assignments:
        return get_by_codigo(codigo)
    params = {key: (Jsonb(data[key]) if key == "atributos_cadastrais" else data[key]) for key in data if key in _UPDATE_ALLOWED}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE demandas.plano SET {} WHERE codigo = {}").format(
        sql.SQL(", ").join(assignments),
        sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)


def delete_by_codigo(codigo: str) -> bool:
    """Remove um plano pelo código legível."""
    with get_connection() as conn:
        conn.execute(
            "DELETE FROM demandas.indicadores WHERE plano_id = (SELECT id FROM demandas.plano WHERE codigo = %s)",
            (codigo,),
        )
        cur = conn.execute("DELETE FROM demandas.plano WHERE codigo = %s RETURNING id", (codigo,))
        deleted = cur.fetchone()
        conn.commit()
    return deleted is not None
