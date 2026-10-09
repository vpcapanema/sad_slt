"""Acesso a dados — itens exibidos nos painéis de acompanhamento (mapa + sidebar)."""
from __future__ import annotations

from typing import Any

from api.db.connection import get_connection

_ABRANGENCIA_GEO = """
    CASE
        WHEN {alias}.geometria IS NOT NULL THEN ST_AsGeoJSON(ST_Transform({alias}.geometria,4326))::jsonb
    END AS geometria_geojson,
    ST_Y(ST_Centroid(ST_Transform({alias}.geometria,4326))) AS latitude,
    ST_X(ST_Centroid(ST_Transform({alias}.geometria,4326))) AS longitude,
    abr.abrangencia_nomes
"""

_PLANOS_SQL = f"""
    SELECT
        p.codigo,
        'plano'::text AS tipo,
        p.status,
        p.criado_em,
        p.nome,
        p.descricao,
        p.diretoria_id,
        NULL::text AS plano_id,
        NULL::text AS plano_codigo,
        NULL::text AS plano_nome,
        NULL::uuid AS programa_id,
        NULL::text AS programa_nome,
        p.objetivo_estrategico,
        p.responsavel,
        p.vigencia_inicio,
        p.vigencia_fim,
        p.valor_global,
        NULL::uuid AS sigma_instituicao_id,
        NULL::text AS instituicao_nome,
        NULL::text AS instituicao_cnpj,
        NULL::uuid AS sigma_pessoa_id,
        NULL::text AS representante_nome,
        NULL::text AS representante_email,
        NULL::text AS representante_telefone,
        NULL::jsonb AS classificacao,
        NULL::jsonb AS complementos,
        NULL::text AS objetivo,
        NULL::text AS publico_alvo,
        NULL::text AS orgao_responsavel,
        NULL::text AS justificativa,
        {_ABRANGENCIA_GEO.format(alias="p")}
    FROM demandas.plano p
    LEFT JOIN LATERAL (
        SELECT array_agg(ue.nome ORDER BY ue.nome) AS abrangencia_nomes
        FROM demandas.plano_unidade_espacial pu
        JOIN geo.unidade_espacial ue ON ue.id = pu.unidade_espacial_id
        WHERE pu.plano_id = p.id
    ) abr ON true
    ORDER BY p.criado_em DESC
"""

_PROGRAMAS_SQL = f"""
    SELECT
        pg.codigo,
        'programa'::text AS tipo,
        pg.status,
        pg.criado_em,
        pg.nome,
        pg.descricao,
        pl.diretoria_id,
        pl.codigo AS plano_id,
        pl.codigo AS plano_codigo,
        pl.nome AS plano_nome,
        pg.id AS programa_id,
        pg.nome AS programa_nome,
        NULL::text AS objetivo_estrategico,
        NULL::text AS responsavel,
        NULL::date AS vigencia_inicio,
        NULL::date AS vigencia_fim,
        pg.valor_global,
        NULL::uuid AS sigma_instituicao_id,
        NULL::text AS instituicao_nome,
        NULL::text AS instituicao_cnpj,
        NULL::uuid AS sigma_pessoa_id,
        NULL::text AS representante_nome,
        NULL::text AS representante_email,
        NULL::text AS representante_telefone,
        NULL::jsonb AS classificacao,
        NULL::jsonb AS complementos,
        pg.objetivo,
        pg.publico_alvo,
        pg.orgao_responsavel,
        pg.justificativa,
        {_ABRANGENCIA_GEO.format(alias="pg")}
    FROM demandas.programa pg
    LEFT JOIN demandas.plano pl ON pl.id = pg.plano_id
    LEFT JOIN LATERAL (
        SELECT array_agg(ue.nome ORDER BY ue.nome) AS abrangencia_nomes
        FROM demandas.programa_unidade_espacial pgu
        JOIN geo.unidade_espacial ue ON ue.id = pgu.unidade_espacial_id
        WHERE pgu.programa_id = pg.id
    ) abr ON true
    ORDER BY pg.criado_em DESC
"""

_PROJETOS_SQL = """
    SELECT
        d.codigo,
        'projeto'::text AS tipo,
        d.status,
        d.criado_em,
        d.nome,
        d.descricao,
        d.diretoria_id,
        d.plano_id,
        NULL::text AS plano_codigo,
        NULL::text AS plano_nome,
        d.programa_id,
        NULL::text AS programa_nome,
        NULL::text AS objetivo_estrategico,
        NULL::text AS responsavel,
        d.vigencia_inicio,
        d.vigencia_fim,
        d.valor_global,
        d.sigma_instituicao_id,
        d.instituicao_nome,
        d.instituicao_cnpj,
        d.sigma_pessoa_id,
        d.representante_nome,
        d.representante_email,
        d.representante_telefone,
        d.classificacao,
        d.complementos,
        NULL::text AS objetivo,
        NULL::text AS publico_alvo,
        NULL::text AS orgao_responsavel,
        NULL::text AS justificativa,
        CASE
            WHEN d.geometria IS NULL THEN NULL
            ELSE ST_AsGeoJSON(ST_Transform(d.geometria,4326))::jsonb
        END AS geometria_geojson,
        d.latitude,
        d.longitude,
        NULL::text[] AS abrangencia_nomes
    FROM demandas.projeto d
    ORDER BY d.criado_em DESC
"""


def list_all() -> list[dict[str, Any]]:
    """Lista planos, programas e projetos com geometria para o mapa."""
    with get_connection() as conn:
        planos = list(conn.execute(_PLANOS_SQL).fetchall())
        programas = list(conn.execute(_PROGRAMAS_SQL).fetchall())
        projetos = list(conn.execute(_PROJETOS_SQL).fetchall())
    return planos + programas + projetos


def estatisticas_operador(usuario_id: str) -> dict[str, int]:
    """Agrega registros protocolados pela conta SIGMA autenticada."""
    query = """
        WITH registros AS (
            SELECT codigo, status, aprovado_em
            FROM demandas.plano
            WHERE criado_por = %(usuario_id)s
            UNION ALL
            SELECT codigo, status, aprovado_em
            FROM demandas.programa
            WHERE criado_por = %(usuario_id)s
            UNION ALL
            SELECT codigo, status, aprovado_em
            FROM demandas.projeto
            WHERE criado_por = %(usuario_id)s
        )
        SELECT
            count(*)::int AS protocoladas,
            count(*) FILTER (WHERE aprovado_em IS NOT NULL)::int AS aprovadas,
            count(*) FILTER (WHERE status = 'analise_em_avaliacao')::int AS em_analise,
            count(*) FILTER (WHERE aprovado_em IS NOT NULL OR status IN ('analise_aprovada', 'analise_reprovada') OR a.decisao IS NOT NULL)::int AS analises_concluidas,
            count(*) FILTER (WHERE aprovado_em IS NOT NULL OR status NOT IN ('analise_rascunho', 'rascunho') OR a.id IS NOT NULL)::int AS analises_total
        FROM registros r
        LEFT JOIN demandas.analise_demanda a ON a.demanda_codigo = r.codigo
    """
    with get_connection() as conn:
        row = conn.execute(query, {"usuario_id": usuario_id}).fetchone()
    return {
        "aprovadas": int(row["aprovadas"]),
        "protocoladas": int(row["protocoladas"]),
        "em_analise": int(row["em_analise"]),
        "analises_concluidas": int(row["analises_concluidas"]),
        "analises_total": int(row["analises_total"]),
    }
