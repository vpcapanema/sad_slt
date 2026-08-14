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
        c.codigo AS config_codigo,
        c.criterios AS config_criterios,
        h.nome,
        h.descricao,
        h.tipo_demanda_id,
        h.grupo_id,
        h.status,
        h.objetos,
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
"""

_JSON_FIELDS = {
    "objetos", "julgamento_projetos", "pesos_projetos", "ranking", "dados_hierarquizacao",
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


def get_excel_matriz_by_codigo(codigo: str) -> bytes | None:
    """Retorna somente o XLSX original, sem expor o binário nas respostas da API."""
    query = """
        SELECT arquivo_excel_matriz_criterios_premissas
        FROM hierarquizacao_demandas.hierarquizacao_portfolio
        WHERE codigo = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (codigo,)).fetchone()
    if not row:
        return None
    value = row.get("arquivo_excel_matriz_criterios_premissas")
    return bytes(value) if value is not None else None


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
    # Uma demanda pode pertencer a várias rodadas. Só liberamos quando não
    # restar nenhuma outra hierarquização contendo o ID no snapshot JSONB.
    liberaveis = []
    for demanda_id in ids:
        restante = conn.execute(
            sql.SQL("SELECT 1 FROM {tbl} WHERE jsonb_path_exists(COALESCE(objetos, '[]'::jsonb), %s::jsonpath) LIMIT 1").format(tbl=tbl),
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
        cur = conn.execute(query, (codigo,))
        deleted = cur.fetchone()
        if deleted and liberar_demandas:
            _liberar_demandas_universo(conn, liberar_demandas)
        conn.commit()
    return deleted is not None


def intersecoes_camada(camada_id: str, *, longitude: float, latitude: float) -> list[dict[str, Any]]:
    query = """
        SELECT h.id::text AS camada_id, h.nome_publicacao AS camada_origem,
               h.versao, h.finalidade, f.ordem, f.propriedades,
               ST_AsGeoJSON(ST_Transform(f.geom, 4326))::jsonb AS geometria
        FROM geoprocessamento.camada_homologada h
        JOIN geoprocessamento.camada_homologada_feicao f ON f.camada_id = h.id
        WHERE h.id = %s::uuid
          AND ST_Intersects(
              f.geom,
              CASE WHEN ST_SRID(f.geom) IN (0, 4326)
                   THEN ST_SetSRID(ST_MakePoint(%s, %s), ST_SRID(f.geom))
                   ELSE ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), ST_SRID(f.geom))
              END
          )
        ORDER BY f.ordem
    """
    with get_connection() as conn:
        return list(conn.execute(query, (camada_id, longitude, latitude, longitude, latitude)).fetchall())


def camada_homologada(camada_id: str) -> dict[str, Any] | None:
    query = """SELECT id::text AS id, nome_publicacao AS nome, versao, finalidade, metadados
               FROM geoprocessamento.camada_homologada WHERE id=%s::uuid"""
    with get_connection() as conn:
        return conn.execute(query, (camada_id,)).fetchone()


def listar_pacotes_homologados(modulo: str) -> list[dict[str, Any]]:
    query = """
        SELECT p.id::text AS pacote_id,p.codigo,p.nome,p.versao,p.status,p.crs_saida,
               p.metadados,p.atualizado_em,
               COALESCE(jsonb_agg(jsonb_build_object(
                   'id',h.id::text,'nome',h.nome_publicacao,'tipo',h.tipo,
                   'finalidade',h.finalidade,'versao',h.versao,'hash',h.hash_conteudo,
                   'metadados',h.metadados
               ) ORDER BY h.homologado_em) FILTER (WHERE h.id IS NOT NULL),'[]'::jsonb) AS camadas
        FROM geoprocessamento.produto p
        LEFT JOIN geoprocessamento.camada_homologada h ON h.produto_id=p.id
        WHERE p.modulo=%s AND p.status IN ('homologado','publicado')
        GROUP BY p.id ORDER BY p.atualizado_em DESC
    """
    with get_connection() as conn:
        return list(conn.execute(query, (modulo,)).fetchall())


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
    query = """SELECT h.id::text AS id,h.nome_publicacao AS nome,h.versao,h.hash_conteudo,
                      h.metadados,r.dados_geotiff,r.nodata,r.perfil
               FROM geoprocessamento.camada_homologada h
               JOIN geoprocessamento.camada_homologada_raster r ON r.camada_id=h.id
               WHERE h.id=%s::uuid"""
    with get_connection() as conn:
        return conn.execute(query, (camada_id,)).fetchone()
