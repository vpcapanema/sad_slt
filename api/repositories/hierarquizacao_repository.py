"""Acesso a dados — hierarquizacao_demandas.hierarquizacao_portfolio."""

from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection

_TABLE = sql.Identifier("hierarquizacao_demandas", "hierarquizacao_portfolio")

_SELECT_BASE = """
    SELECT
        h.id,
        h.codigo,
        h.config_id,
        h.grupo_demanda_id,
        g.codigo AS grupo_demanda_codigo,
        c.codigo AS config_codigo,
        (SELECT a.id
           FROM ahp.comparacao_colaborativa_ambiente a
          WHERE a.hierarquizacao_id = h.id
          ORDER BY (a.status = 'ativa') DESC, a.criado_em DESC
          LIMIT 1) AS julgamento_id,
        c.criterios AS config_criterios,
        h.nome,
        h.descricao,
        h.tipo_demanda_id,
        h.grupo_id,
        h.status,
        g.objetos AS objetos,
        h.julgamento_projetos,
        h.pesos_projetos,
        h.ranking,
        h.dados_hierarquizacao,
        h.relatorio_fase1,
        h.relatorio_fase2,
        h.relatorio_fase3,
        h.relatorio_consolidado,
        h.homologado_em,
        h.homologado_por,
        h.criado_por,
        h.criado_em,
        h.atualizado_em
    FROM hierarquizacao_demandas.hierarquizacao_portfolio h
    LEFT JOIN ahp.config_multicriterio_portfolio c ON c.id = h.config_id
    JOIN demandas.grupos_demandas g ON g.id = h.grupo_demanda_id
"""


def status_hierarquizacao_ativo(codigo: str) -> bool:
    query = """
        SELECT 1
          FROM hierarquizacao_demandas.dom_status_hierarquizacao
         WHERE codigo = %s AND ativo = TRUE
         LIMIT 1
    """
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone() is not None


def get_transicao_status_hierarquizacao(origem: str, destino: str) -> dict[str, Any] | None:
    query = """
        SELECT status_origem, status_destino, via_homologar
          FROM hierarquizacao_demandas.dom_status_hierarquizacao_transicao
         WHERE status_origem = %s AND status_destino = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (origem, destino)).fetchone()
    return dict(row) if row else None

_JSON_FIELDS = {
    "julgamento_projetos", "pesos_projetos", "ranking", "dados_hierarquizacao",
    "relatorio_fase1", "relatorio_fase2", "relatorio_fase3", "relatorio_consolidado",
}


def _json_default(obj: Any) -> Any:
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    raise TypeError(f"Objeto não serializável em JSON: {type(obj).__name__}")


def _dumps(value: Any) -> str:
    return json.dumps(value, default=_json_default, ensure_ascii=False)


def _prepare(key: str, value: Any) -> Any:
    if key in _JSON_FIELDS:
        return Jsonb(value, dumps=_dumps) if value is not None else None
    return value


def insert(data: dict[str, Any], *, status_transicao: dict[str, Any] | None = None) -> dict[str, Any]:
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING id").format(
        table=_TABLE,
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    params = {k: _prepare(k, v) for k, v in data.items()}
    with get_connection() as conn:
        inserted = conn.execute(query, params).fetchone()
        if not inserted:
            raise RuntimeError("Insert de hierarquização não retornou id.")
        if status_transicao:
            ids = [i for i in status_transicao.get("ids", []) if i]
            if ids:
                schema, table = status_transicao["tabela"]
                q = sql.SQL("UPDATE {tbl} SET status=%s WHERE id=ANY(%s::uuid[]) AND status=%s").format(tbl=sql.Identifier(schema, table))
                conn.execute(q, (status_transicao["para"], ids, status_transicao["de"]))
        conn.commit()
    found = get_by_id(inserted["id"])
    if not found:
        raise RuntimeError("Hierarquização inserida mas não recuperada.")
    return found


def get_by_id(hierarquizacao_id: Any) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.id = %s"
    with get_connection() as conn:
        return conn.execute(query, (hierarquizacao_id,)).fetchone()


def get_by_codigo(codigo: str) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.codigo = %s"
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone()


def list_all(
    *,
    status: str | None = None,
    grupo: str | None = None,
    tipo_demanda_id: int | None = None,
    config_id: Any = None,
) -> list[dict[str, Any]]:
    query = _SELECT_BASE + " WHERE 1=1"
    params: list[Any] = []
    if status:
        query += " AND h.status = %s"
        params.append(status)
    if grupo:
        query += " AND h.grupo_id = %s"
        params.append(grupo)
    if tipo_demanda_id is not None:
        query += " AND h.tipo_demanda_id = %s"
        params.append(tipo_demanda_id)
    if config_id:
        query += " AND h.config_id = %s"
        params.append(config_id)
    query += " ORDER BY h.criado_em DESC"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())


def update(codigo: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not data:
        return get_by_codigo(codigo)
    assignments = [sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in data]
    params: dict[str, Any] = {k: _prepare(k, v) for k, v in data.items()}
    params["codigo"] = codigo
    query = sql.SQL("UPDATE {table} SET {sets} WHERE codigo = {codigo}").format(
        table=_TABLE,
        sets=sql.SQL(", ").join(assignments),
        codigo=sql.Placeholder("codigo"),
    )
    with get_connection() as conn:
        conn.execute(query, params)
        conn.commit()
    return get_by_codigo(codigo)


def _liberar_demandas_universo(conn: Any, transicao: dict[str, Any]) -> None:
    """Reverte o status das demandas do universo na MESMA transação do delete.

    ``transicao`` = {"tabela": (schema, table), "ids": [...], "de": str, "para": str}.
    Só altera quem está exatamente no status de origem (idempotente e seguro).
    """
    ids = [i for i in (transicao.get("ids") or []) if i]
    if not ids:
        return
    schema, table = transicao["tabela"]
    tbl = sql.Identifier(schema, table)
    # Só liberamos quando nenhuma outra hierarquização usar um grupo que contenha o ID.
    liberaveis = []
    for demanda_id in ids:
        restante = conn.execute(
                        sql.SQL("""
                                SELECT 1
                                    FROM {hier_table} h
                                    JOIN demandas.grupos_demandas g ON g.id = h.grupo_demanda_id
                                 WHERE jsonb_path_exists(COALESCE(g.objetos, '[]'::jsonb), %s::jsonpath)
                                 LIMIT 1
                        """).format(hier_table=_TABLE),
            (f'$[*] ? (@.id == "{demanda_id}")',),
        ).fetchone()
        if not restante:
            liberaveis.append(demanda_id)
    if liberaveis:
        conn.execute(
            sql.SQL("UPDATE {tbl} SET status = %s WHERE id = ANY(%s::uuid[]) AND status = %s").format(tbl=tbl),
            (transicao["para"], liberaveis, transicao["de"]),
        )


def delete_by_codigo(
    codigo: str, *, liberar_demandas: dict[str, Any] | None = None
) -> bool:
    """Remove uma hierarquização pelo código legível.

    Quando ``liberar_demandas`` é informado, as demandas do universo voltam ao
    status de origem na mesma transação — ficando disponíveis para nova análise.
    """
    query = sql.SQL("DELETE FROM {table} WHERE codigo = %s RETURNING id").format(table=_TABLE)
    with get_connection() as conn:
        # A configuração de portfólio guarda uma cópia independente dos
        # critérios/premissas da hierarquização. Ao remover a origem, preserve
        # essa configuração e desfaça somente o vínculo de procedência. Isso
        # precisa ocorrer na mesma transação, antes do DELETE, por causa da FK
        # fk_config_portfolio_hierarquizacao_origem (ON DELETE RESTRICT).
        conn.execute(
            sql.SQL(
                "UPDATE ahp.config_multicriterio_portfolio c "
                "SET hierarquizacao_id = NULL, atualizado_em = now() "
                "FROM {table} h "
                "WHERE h.codigo = %s AND c.hierarquizacao_id = h.id"
            ).format(table=_TABLE),
            (codigo,),
        )
        cur = conn.execute(query, (codigo,))
        deleted = cur.fetchone()
        if deleted and liberar_demandas:
            _liberar_demandas_universo(conn, liberar_demandas)
        conn.commit()
    return deleted is not None


def intersecoes_camada(camada_id: str, *, longitude: float, latitude: float) -> list[dict[str, Any]]:
    from api.repositories import camada_geoespacial_repository as camadas
    from shapely.geometry import Point, mapping
    loaded = camadas.carregar_vetor(camada_id)
    if not loaded:
        return []
    frame, metadata = loaded
    spatial = frame.to_crs(4326)
    indices = spatial.sindex.query(Point(longitude,latitude), predicate='intersects')
    return [{'camada_id':str(metadata['id']), 'camada_origem':metadata['nome'],
             'versao':'', 'finalidade':(metadata.get('metadados') or {}).get('finalidade'),
             'ordem':int(index), 'propriedades':camadas._json_safe(spatial.drop(columns=spatial.geometry.name).iloc[index].to_dict()),
             'geometria':mapping(spatial.geometry.iloc[index])} for index in sorted(indices)]


def conjuntos_camada(camada_id: str) -> list[str]:
    from api.repositories.camada_geoespacial_repository import carregar_vetor
    loaded = carregar_vetor(camada_id)
    if not loaded or 'conjunto' not in loaded[0]:
        return []
    return sorted(str(value) for value in loaded[0]['conjunto'].dropna().unique())


def camada_homologada(camada_id: str) -> dict[str, Any] | None:
    """Nome legado do contrato; resolve uma saída do catálogo no Storage."""
    from api.repositories.saidas_geoespaciais_repository import listar
    for row in listar():
        if camada_id in {row['id'],str((row.get('metadados') or {}).get('id_banco',''))}:
            return {**row,'versao':'','finalidade':(row.get('metadados') or {}).get('finalidade')}
    from api.repositories import camada_geoespacial_repository as camadas
    with get_connection() as conn:
        found=camadas._find_layer(conn,camada_id)
    if not found or found[0]!='processadas':
        return None
    row=found[1]
    return {**row,'id':str(row['id']),'versao':'','finalidade':(row.get('metadados') or {}).get('finalidade')}


def listar_pacotes_homologados(modulo: str) -> list[dict[str, Any]]:
    """Pacotes de homologação descontinuados; nenhum novo snapshot é criado."""
    return []


def obter_pacote_homologado(pacote_id: str, modulo: str) -> dict[str, Any] | None:
    return next((p for p in listar_pacotes_homologados(modulo) if p["pacote_id"] == pacote_id), None)


def listar_fatiamentos_fase1() -> list[dict[str, Any]]:
    with get_connection() as conn:
        return list(conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1
            WHERE ativo ORDER BY padrao DESC,nome""").fetchall())


def obter_fatiamento_fase1(config_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        return conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1 WHERE id=%s::uuid AND ativo""", (config_id,)).fetchone()


def obter_fatiamento_padrao_fase1() -> dict[str, Any] | None:
    """Classificação padrão da Fase 1 (risco + restrição binária) aplicada em toda execução."""
    with get_connection() as conn:
        return conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1
            WHERE ativo ORDER BY padrao DESC, nome LIMIT 1""").fetchone()


def salvar_fatiamento_fase1(data: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            """INSERT INTO geoprocessamento.configuracao_fatiamento_fase1
                (codigo,nome,descricao,parametros) VALUES (%s,%s,%s,%s)
                ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome,descricao=EXCLUDED.descricao,
                  parametros=EXCLUDED.parametros,atualizado_em=CURRENT_TIMESTAMP
                RETURNING id::text AS id,codigo,nome,descricao,padrao,parametros""",
            (data["codigo"], data["nome"], data.get("descricao"), Jsonb(data["parametros"])),
        ).fetchone()
        conn.commit()
        if not row:
            raise RuntimeError("A configuração de fatiamento não foi persistida.")
        return row


def raster_homologado(camada_id: str) -> dict[str, Any] | None:
    """Contrato de leitura legado, agora servido pelo arquivo no Storage."""
    from api.repositories.camada_geoespacial_repository import carregar_raster
    loaded=carregar_raster(camada_id)
    if not loaded:
        return None
    content,metadata=loaded
    return {**metadata,'id':str(metadata['id']),'versao':'','dados_geotiff':content,
            'hash_conteudo':metadata.get('sha256'),'perfil':metadata.get('perfil',{})}
