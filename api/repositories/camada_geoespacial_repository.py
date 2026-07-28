"""Persistência física segregada de camadas importadas, processadas e homologadas."""
from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any, Callable
from uuid import uuid4

import geopandas as gpd
import pandas as pd
from psycopg import sql
from psycopg.types.json import Jsonb
from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry

from api.db.connection import get_connection


STORAGES: dict[str, tuple[str, str, str]] = {
    "importadas": (
        "camada_importada", "camada_importada_feicao", "camada_importada_raster"
    ),
    "processadas": (
        "camada_processada", "camada_processada_feicao", "camada_processada_raster"
    ),
    "homologadas": (
        "camada_homologada", "camada_homologada_feicao", "camada_homologada_raster"
    ),
}


def _json_safe(value: Any) -> Any:
    """Converte valores geoespaciais/pandas para JSON estrito aceito pelo PostgreSQL."""
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if hasattr(value, "item"):
        try:
            return _json_safe(value.item())
        except (TypeError, ValueError):
            pass
    try:
        missing = pd.isna(value)
        if isinstance(missing, bool) and missing:
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    if isinstance(value, datetime) or hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _jsonb(value: Any) -> Jsonb:
    return Jsonb(_json_safe(value))


def _feature_rows(gdf: gpd.GeoDataFrame) -> list[tuple[int, Jsonb, str | None]]:
    spatial = gdf.to_crs("EPSG:4326") if gdf.crs else gdf.set_crs("EPSG:4326")
    geometry_name = str(spatial.geometry.name)
    rows: list[tuple[int, Jsonb, str | None]] = []
    for order, (_, feature) in enumerate(spatial.iterrows()):
        properties = {column: value for column, value in feature.items() if column != geometry_name}
        normalized = _json_safe(properties)
        geometry = feature[geometry_name]
        geometry_json = (
            json.dumps(mapping(geometry))
            if isinstance(geometry, BaseGeometry) and not geometry.is_empty
            else None
        )
        rows.append((order, _jsonb(normalized), geometry_json))
    return rows


def _categoria_origem(origem: str) -> str:
    normalized = origem.strip()
    return "processadas" if normalized == "processamento" or normalized.startswith("OP-") else "importadas"


def _insert_features(conn: Any, table: str, database_id: str, rows: list[tuple[int, Jsonb, str | None]]) -> None:
    if not rows:
        return
    with conn.cursor() as cursor:
        cursor.executemany(
            sql.SQL("""INSERT INTO geoprocessamento.{}
                   (camada_id,ordem,propriedades,geom)
                   VALUES (%s,%s,%s,
                     CASE WHEN %s::text IS NULL THEN NULL
                          ELSE ST_SetSRID(ST_GeomFromGeoJSON(%s::text),4326) END)""").format(
                sql.Identifier(table)
            ),
            [(database_id, order, props, geom, geom) for order, props, geom in rows],
        )


def salvar_vetor(
    *, recurso_id: str, nome: str, origem: str, gdf: gpd.GeoDataFrame,
    metadados: dict[str, Any], hash_arquivo: str | None = None,
) -> str:
    """Grava vetor na tabela física correspondente à sua etapa."""
    categoria = _categoria_origem(origem)
    catalog, features, _ = STORAGES[categoria]
    crs = str(gdf.crs) if gdf.crs else "EPSG:4326"
    geometry_types = sorted(set(gdf.geometry.geom_type.dropna().astype(str)))
    geometry_type = ",".join(geometry_types) or None
    rows = _feature_rows(gdf)
    metadata = {**metadados, "origem": origem, "categoria_armazenamento": categoria}
    with get_connection() as conn:
        if categoria == "importadas":
            camada = conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.{}
                    (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,
                     hash_arquivo,metadados)
                    VALUES (%s,%s,'vetor',%s,%s,'PostGIS',%s,%s) RETURNING id""").format(
                    sql.Identifier(catalog)
                ),
                (recurso_id, nome, geometry_type, crs, hash_arquivo, _jsonb(metadata)),
            ).fetchone()
        else:
            camada = conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.{}
                    (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,
                     operacao_origem,linhagem,metadados)
                    VALUES (%s,%s,'vetor',%s,%s,'PostGIS',%s,%s,%s) RETURNING id""").format(
                    sql.Identifier(catalog)
                ),
                (
                    recurso_id, nome, geometry_type, crs, origem,
                    _jsonb(metadados.get("linhagem", {})), _jsonb(metadata),
                ),
            ).fetchone()
        if not camada:
            raise RuntimeError("Persistência vetorial não retornou identificador")
        database_id = str(camada["id"])
        _insert_features(conn, features, database_id, rows)
        conn.execute(
            sql.SQL("""UPDATE geoprocessamento.{} c
                SET envelope=(SELECT ST_Envelope(ST_Collect(geom))
                              FROM geoprocessamento.{} WHERE camada_id=c.id)
                WHERE c.id=%s""").format(
                sql.Identifier(catalog), sql.Identifier(features)
            ),
            (database_id,),
        )
        conn.commit()
        return database_id


def salvar_raster(
    *, recurso_id: str, nome: str, origem: str, crs: str, dados_geotiff: bytes,
    largura: int, altura: int, dtype: str, nodata: float | None,
    perfil: dict[str, Any], metadados: dict[str, Any], hash_arquivo: str | None = None,
) -> str:
    """Grava raster na tabela física correspondente à sua etapa."""
    categoria = _categoria_origem(origem)
    catalog, _, rasters = STORAGES[categoria]
    metadata = {**metadados, "origem": origem, "categoria_armazenamento": categoria}
    with get_connection() as conn:
        if categoria == "importadas":
            camada = conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.{}
                    (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,
                     hash_arquivo,metadados)
                    VALUES (%s,%s,'raster','Raster',%s,'GeoTIFF',%s,%s) RETURNING id""").format(
                    sql.Identifier(catalog)
                ),
                (recurso_id, nome, crs, hash_arquivo, _jsonb(metadata)),
            ).fetchone()
        else:
            camada = conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.{}
                    (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,
                     operacao_origem,linhagem,metadados)
                    VALUES (%s,%s,'raster','Raster',%s,'GeoTIFF',%s,%s,%s) RETURNING id""").format(
                    sql.Identifier(catalog)
                ),
                (
                    recurso_id, nome, crs, origem,
                    _jsonb(metadados.get("linhagem", {})), _jsonb(metadata),
                ),
            ).fetchone()
        if not camada:
            raise RuntimeError("Persistência raster não retornou identificador")
        database_id = str(camada["id"])
        conn.execute(
            sql.SQL("""INSERT INTO geoprocessamento.{}
                (camada_id,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil)
                VALUES (%s,%s,%s,%s,1,%s,%s,%s)""").format(sql.Identifier(rasters)),
            (database_id, dados_geotiff, largura, altura, dtype, nodata, _jsonb(perfil)),
        )
        conn.commit()
        return database_id


def _find_working_layer(conn: Any, recurso_id: str) -> tuple[str, dict[str, Any]] | None:
    for categoria in ("processadas", "importadas"):
        catalog = STORAGES[categoria][0]
        row = conn.execute(
            sql.SQL("SELECT * FROM geoprocessamento.{} WHERE recurso_sessao_id=%s").format(
                sql.Identifier(catalog)
            ),
            (recurso_id,),
        ).fetchone()
        if row:
            return categoria, dict(row)
    return None


def obter_importada_por_hash(hash_arquivo: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT id,recurso_sessao_id,nome,tipo,crs,formato,metadados,criado_em
               FROM geoprocessamento.camada_importada WHERE hash_arquivo=%s""",
            (hash_arquivo,),
        ).fetchone()
        return dict(row) if row else None


def _find_layer(conn: Any, recurso_id: str) -> tuple[str, dict[str, Any]] | None:
    for categoria in ("homologadas", "processadas", "importadas"):
        catalog = STORAGES[categoria][0]
        row = conn.execute(
            sql.SQL("SELECT * FROM geoprocessamento.{} WHERE recurso_sessao_id=%s").format(
                sql.Identifier(catalog)
            ),
            (recurso_id,),
        ).fetchone()
        if row:
            return categoria, dict(row)
    return None


def substituir_vetor(recurso_id: str, gdf: gpd.GeoDataFrame, metadados: dict[str, Any]) -> None:
    """Substitui somente uma camada de trabalho; snapshots nunca entram nesta busca."""
    rows = _feature_rows(gdf)
    with get_connection() as conn:
        found = _find_working_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            raise RuntimeError(f"Camada de trabalho {recurso_id} não encontrada")
        categoria, camada = found
        catalog, features, _ = STORAGES[categoria]
        database_id = str(camada["id"])
        conn.execute(
            sql.SQL("DELETE FROM geoprocessamento.{} WHERE camada_id=%s").format(
                sql.Identifier(features)
            ),
            (database_id,),
        )
        _insert_features(conn, features, database_id, rows)
        conn.execute(
            sql.SQL("""UPDATE geoprocessamento.{} c
                SET crs=%s,metadados=%s,atualizado_em=CURRENT_TIMESTAMP,
                    envelope=(SELECT ST_Envelope(ST_Collect(geom))
                              FROM geoprocessamento.{} WHERE camada_id=c.id)
                WHERE c.id=%s""").format(
                sql.Identifier(catalog), sql.Identifier(features)
            ),
            (str(gdf.crs) if gdf.crs else "EPSG:4326", _jsonb(metadados), database_id),
        )
        conn.commit()


def migrar_vetor_existente(database_id: str, recurso_id: str, gdf: gpd.GeoDataFrame, uri_relativa: str) -> None:
    """Compatibilidade para internalização de registros legados."""
    del database_id
    salvar_vetor(
        recurso_id=recurso_id, nome=Path(uri_relativa).stem, origem="arquivo",
        gdf=gdf, metadados={"uri_legada_relativa": uri_relativa},
    )


def listar() -> list[dict[str, Any]]:
    """Une os três catálogos apenas na resposta; o armazenamento permanece separado."""
    rows: list[dict[str, Any]] = []
    with get_connection() as conn:
        for categoria, (catalog, _, _) in STORAGES.items():
            date_column = "homologado_em" if categoria == "homologadas" else "criado_em"
            selected = conn.execute(
                sql.SQL("""SELECT id,recurso_sessao_id,nome,tipo,crs,formato,metadados,
                           {} AS criado_em,
                           TRUE AS persistida,(tipo='vetor') AS tem_vetor,
                           (tipo='raster') AS tem_raster,%s::text AS categoria
                    FROM geoprocessamento.{}
                    WHERE recurso_sessao_id IS NOT NULL ORDER BY {}""").format(
                    sql.Identifier(date_column), sql.Identifier(catalog),
                    sql.Identifier(date_column)
                ),
                (categoria,),
            ).fetchall()
            rows.extend(dict(row) for row in selected)
    return rows


def carregar_vetor(recurso_id: str) -> tuple[gpd.GeoDataFrame, dict[str, Any]] | None:
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        features = STORAGES[categoria][1]
        rows = conn.execute(
            sql.SQL("""SELECT propriedades,ST_AsGeoJSON(geom)::jsonb AS geometria
                FROM geoprocessamento.{} WHERE camada_id=%s ORDER BY ordem""").format(
                sql.Identifier(features)
            ),
            (camada["id"],),
        ).fetchall()
    feature_collection = [
        {"type": "Feature", "properties": row["propriedades"], "geometry": row["geometria"]}
        for row in rows
    ]
    gdf = (
        gpd.GeoDataFrame.from_features(feature_collection, crs="EPSG:4326")
        if feature_collection else gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")
    )
    if camada.get("crs") and str(camada["crs"]).upper() != "EPSG:4326" and not gdf.empty:
        gdf = gdf.to_crs(camada["crs"])
    camada["categoria"] = categoria
    return gdf, camada


def carregar_vetor_geojson(recurso_id: str) -> dict[str, Any] | None:
    """Monta o GeoJSON integral diretamente no PostGIS, sem alterar geometrias."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        features = STORAGES[categoria][1]
        row = conn.execute(
            sql.SQL("""SELECT jsonb_build_object(
                    'type','FeatureCollection',
                    'features',COALESCE(jsonb_agg(jsonb_build_object(
                        'type','Feature',
                        'properties',propriedades,
                        'geometry',ST_AsGeoJSON(geom,15)::jsonb
                    ) ORDER BY ordem) FILTER (WHERE geom IS NOT NULL),'[]'::jsonb)
                ) AS geojson FROM geoprocessamento.{} WHERE camada_id=%s""").format(
                sql.Identifier(features)
            ),
            (camada["id"],),
        ).fetchone()
    return dict(row["geojson"]) if row and row["geojson"] else {"type": "FeatureCollection", "features": []}


def obter_vetor_bounds(recurso_id: str) -> list[float] | None:
    """Retorna a extensão integral da camada em EPSG:4326."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        features = STORAGES[categoria][1]
        row = conn.execute(
            sql.SQL("""SELECT ST_XMin(extent) AS xmin,ST_YMin(extent) AS ymin,
                              ST_XMax(extent) AS xmax,ST_YMax(extent) AS ymax
                       FROM (SELECT ST_Extent(geom) AS extent
                             FROM geoprocessamento.{} WHERE camada_id=%s) q""").format(
                sql.Identifier(features)
            ),
            (camada["id"],),
        ).fetchone()
    if not row or row["xmin"] is None:
        return None
    return [float(row["xmin"]), float(row["ymin"]), float(row["xmax"]), float(row["ymax"])]


def carregar_vetor_mvt(recurso_id: str, z: int, x: int, y: int) -> bytes | None:
    """Gera somente a parcela MVT visível; a geometria persistida não é modificada."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        features = STORAGES[categoria][1]
        row = conn.execute(
            sql.SQL("""WITH tile_bounds AS (
                    SELECT ST_TileEnvelope(%s,%s,%s) AS geom,
                           ST_Transform(ST_TileEnvelope(%s,%s,%s, margin => 0.015625),4326) AS query_geom
                ), tile_rows AS (
                    SELECT propriedades,
                           ST_AsMVTGeom(ST_Transform(f.geom,3857),b.geom,4096,64,true) AS geom
                    FROM geoprocessamento.{} f CROSS JOIN tile_bounds b
                    WHERE f.camada_id=%s AND f.geom && b.query_geom
                ) SELECT ST_AsMVT(tile_rows,'camada',4096,'geom') AS tile FROM tile_rows""").format(
                sql.Identifier(features)
            ),
            (z, x, y, z, x, y, camada["id"]),
        ).fetchone()
    return bytes(row["tile"] or b"") if row else b""


def carregar_raster(recurso_id: str) -> tuple[bytes, dict[str, Any]] | None:
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "raster":
            return None
        categoria, camada = found
        rasters = STORAGES[categoria][2]
        row = conn.execute(
            sql.SQL("SELECT * FROM geoprocessamento.{} WHERE camada_id=%s").format(
                sql.Identifier(rasters)
            ),
            (camada["id"],),
        ).fetchone()
        if not row:
            return None
        metadata = {**camada, **dict(row), "categoria": categoria}
        return bytes(row["dados_geotiff"]), metadata


def excluir(recurso_id: str) -> bool:
    with get_connection() as conn:
        if conn.execute(
            "SELECT 1 FROM geoprocessamento.camada_homologada WHERE recurso_sessao_id=%s",
            (recurso_id,),
        ).fetchone():
            raise ValueError("Camada homologada é somente leitura")
        removido = False
        for categoria in ("processadas", "importadas"):
            catalog = STORAGES[categoria][0]
            row = conn.execute(
                sql.SQL(
                    "DELETE FROM geoprocessamento.{} WHERE recurso_sessao_id=%s RETURNING id"
                ).format(sql.Identifier(catalog)),
                (recurso_id,),
            ).fetchone()
            if row:
                removido = True

        # Compatibilidade com registros legados eventualmente remanescentes.
        legado = conn.execute(
            "SELECT to_regclass('geoprocessamento.camada') AS tabela"
        ).fetchone()
        if legado and legado["tabela"] is not None:
            legado_row = conn.execute(
                "DELETE FROM geoprocessamento.camada WHERE recurso_sessao_id=%s RETURNING id",
                (recurso_id,),
            ).fetchone()
            if legado_row:
                removido = True

        if removido:
            conn.commit()
        return removido


def esta_homologada(recurso_id: str) -> bool:
    with get_connection() as conn:
        return conn.execute(
            "SELECT 1 FROM geoprocessamento.camada_homologada WHERE recurso_sessao_id=%s",
            (recurso_id,),
        ).fetchone() is not None


def homologar(
    recurso_id: str, *, modulo_consumidor: str, nome_publicacao: str, versao: str,
    finalidade: str | None, homologado_por: str | None, produto_id: str | None,
    metadados: dict[str, Any],
    progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Cria um snapshot físico completo e independente na biblioteca oficial."""
    homologada_recurso_id = f"homologada_{uuid4().hex}"
    with get_connection() as conn:
        found = _find_working_layer(conn, recurso_id)
        if not found:
            raise ValueError(f"Camada de trabalho {recurso_id} não encontrada")
        if progress:
            progress("Camada de origem localizada no armazenamento de trabalho")
        categoria, source = found
        source_features = STORAGES[categoria][1]
        source_rasters = STORAGES[categoria][2]
        if source["tipo"] == "vetor":
            hash_row = conn.execute(
                sql.SQL("""SELECT md5(COALESCE(string_agg(
                        ordem::text || propriedades::text ||
                        COALESCE(encode(ST_AsEWKB(geom),'hex'),''), '' ORDER BY ordem
                    ),'')) AS hash
                    FROM geoprocessamento.{} WHERE camada_id=%s""").format(
                    sql.Identifier(source_features)
                ),
                (source["id"],),
            ).fetchone()
        else:
            hash_row = conn.execute(
                sql.SQL(
                    "SELECT md5(dados_geotiff) AS hash "
                    "FROM geoprocessamento.{} WHERE camada_id=%s"
                ).format(sql.Identifier(source_rasters)),
                (source["id"],),
            ).fetchone()
        if progress:
            progress("Hash do conteúdo geoespacial calculado")
        content_hash = hash_row["hash"] if hash_row else None
        metadata = {
            **(source.get("metadados") or {}), **metadados,
            "origem": "homologada", "snapshot_de": recurso_id,
            "categoria_armazenamento": "homologadas",
        }
        snapshot = conn.execute(
            """INSERT INTO geoprocessamento.camada_homologada
               (camada_id,recurso_sessao_id,origem_categoria,origem_camada_id,
                origem_recurso_id,produto_id,modulo_consumidor,nome_publicacao,nome,
                versao,finalidade,metadados,homologado_por,tipo,geometria_tipo,crs,
                formato,envelope,hash_conteudo)
               VALUES (NULL,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING *""",
            (
                homologada_recurso_id, categoria, source["id"], recurso_id,
                produto_id, modulo_consumidor, nome_publicacao, nome_publicacao,
                versao, finalidade, _jsonb(metadata), homologado_por, source["tipo"],
                source.get("geometria_tipo"), source.get("crs"), source.get("formato"),
                source.get("envelope"), content_hash,
            ),
        ).fetchone()
        if not snapshot:
            raise RuntimeError("Homologação não retornou o snapshot")
        if progress:
            progress("Registro imutável criado no catálogo homologado")
        if source["tipo"] == "vetor":
            conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.camada_homologada_feicao
                    (camada_id,ordem,propriedades,geom)
                    SELECT %s,ordem,propriedades,geom
                    FROM geoprocessamento.{} WHERE camada_id=%s""").format(
                    sql.Identifier(source_features)
                ),
                (snapshot["id"], source["id"]),
            )
            if progress:
                progress("Feições copiadas para o armazenamento homologado")
        else:
            conn.execute(
                sql.SQL("""INSERT INTO geoprocessamento.camada_homologada_raster
                    (camada_id,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil)
                    SELECT %s,dados_geotiff,largura,altura,bandas,dtype,nodata,perfil
                    FROM geoprocessamento.{} WHERE camada_id=%s""").format(
                    sql.Identifier(source_rasters)
                ),
                (snapshot["id"], source["id"]),
            )
            if progress:
                progress("Bloco raster copiado para o armazenamento homologado")
        conn.commit()
        if progress:
            progress("Transação de homologação confirmada no banco")
        result = dict(snapshot)
        result["homologacao_id"] = str(result["id"])
        result["id"] = homologada_recurso_id
        return result


def listar_biblioteca(modulo: str | None = None) -> list[dict[str, Any]]:
    filter_clause = (
        sql.SQL(" WHERE modulo_consumidor IN (%s,'ambos')")
        if modulo else sql.SQL("")
    )
    query = sql.SQL("""SELECT id AS homologacao_id,recurso_sessao_id AS id,
                      origem_categoria,origem_camada_id,origem_recurso_id,
                      modulo_consumidor,nome_publicacao,nome,versao,finalidade,
                      homologado_por,homologado_em,metadados AS homologacao_metadados,
                      tipo,geometria_tipo,crs,formato,metadados
               FROM geoprocessamento.camada_homologada{}
               ORDER BY nome_publicacao,versao,homologado_em DESC""").format(
        filter_clause
    )
    params: tuple[Any, ...] = (modulo,) if modulo else ()
    with get_connection() as conn:
        return [dict(row) for row in conn.execute(query, params).fetchall()]


def _directory_rows(categoria: str) -> list[dict[str, Any]]:
    catalog = STORAGES[categoria][0]
    date_column = "homologado_em" if categoria == "homologadas" else "criado_em"
    extra = (
        sql.SQL(",nome_publicacao,modulo_consumidor,versao")
        if categoria == "homologadas" else sql.SQL("")
    )
    with get_connection() as conn:
        rows = conn.execute(
            sql.SQL("""SELECT recurso_sessao_id AS id,nome,tipo,geometria_tipo,crs,formato,
                       metadados,{} AS criado_em{}
                FROM geoprocessamento.{} ORDER BY {} DESC""").format(
                sql.Identifier(date_column), extra, sql.Identifier(catalog),
                sql.Identifier(date_column)
            )
        ).fetchall()
    return [
        {**dict(row), "criado_em": row["criado_em"].isoformat()}
        for row in rows
    ]


def listar_diretorio() -> dict[str, list[dict[str, Any]]]:
    """Expõe diretamente os três armazenamentos físicos, sem classificação por metadados."""
    return {categoria: _directory_rows(categoria) for categoria in STORAGES}
