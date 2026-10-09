"""Entradas no PostGIS; saídas no Storage com catálogo de metadados no banco."""
from __future__ import annotations
from api.services.extracao_ogr import reproject as _gdal_reproject

import json
import math
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any, Callable
from uuid import uuid4

import geopandas as gpd
import pandas as pd
from psycopg import sql
from psycopg.types.json import Jsonb
from shapely.geometry import mapping

from api.path_policy import project_path
from shapely.geometry.base import BaseGeometry

from api.db.connection import get_connection


STORAGES: dict[str, tuple[str, str, str]] = {
    "importadas": (
        "camada_importada", "camada_importada_feicao", "camada_importada_raster"
    ),
    "processadas": (
        "camada_processada", "camada_processada_feicao", "camada_processada_raster"
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


def _feature_rows(gdf: gpd.GeoDataFrame, *, usar_wkb: bool = False) -> list[tuple[int, Jsonb, str | bytes | None]]:
    # EPSG:4674 (SIRGAS 2000) é o CRS de armazenamento do sistema — ver
    # migração 100_padronizar_geometria_sirgas2000.sql.
    spatial = _gdal_reproject(gdf, "EPSG:4674") if gdf.crs else gdf.set_crs("EPSG:4674")
    geometry_name = str(spatial.geometry.name)
    rows: list[tuple[int, Jsonb, str | bytes | None]] = []
    for order, (_, feature) in enumerate(spatial.iterrows()):
        properties = {column: value for column, value in feature.items() if column != geometry_name}
        normalized = _json_safe(properties)
        geometry = feature[geometry_name]
        geometry_json = (
            json.dumps(mapping(geometry))
            if isinstance(geometry, BaseGeometry) and not geometry.is_empty
            else None
        )
        if usar_wkb:
            geometry_json = geometry.wkb if isinstance(geometry, BaseGeometry) else None
        rows.append((order, _jsonb(normalized), geometry_json))
    return rows


def _categoria_origem(origem: str) -> str:
    normalized = origem.strip()
    return "processadas" if normalized == "processamento" or normalized.startswith("OP-") else "importadas"


def _insert_features(conn: Any, table: str, database_id: str, rows: list[tuple[int, Jsonb, str | bytes | None]], *, usar_wkb: bool = False) -> None:
    if not rows:
        return
    with conn.cursor() as cursor:
        if usar_wkb:
            cursor.executemany(
                sql.SQL("""INSERT INTO geoprocessamento.{}
                    (camada_id,ordem,propriedades,geom)
                    VALUES (%s,%s,%s,ST_GeomFromWKB(%s::bytea,4674))""").format(sql.Identifier(table)),
                [(database_id, order, props, geom) for order, props, geom in rows],
            )
            return
        cursor.executemany(
            sql.SQL("""INSERT INTO geoprocessamento.{}
                   (camada_id,ordem,propriedades,geom)
                   VALUES (%s,%s,%s,
                     CASE WHEN %s::text IS NULL THEN NULL
                          ELSE ST_SetSRID(ST_GeomFromGeoJSON(%s::text),4674) END)""").format(
                sql.Identifier(table)
            ),
            [(database_id, order, props, geom, geom) for order, props, geom in rows],
        )


def salvar_vetor(
    *, recurso_id: str, nome: str, origem: str, gdf: gpd.GeoDataFrame,
    metadados: dict[str, Any], hash_arquivo: str | None = None,
    gravar_arquivo: bool = True,
    preservar_geometrias: bool = False,
) -> str:
    """Importadas mantêm conteúdo no banco; processadas sempre geram arquivo no Storage."""
    categoria = _categoria_origem(origem)
    catalog, features, _ = STORAGES[categoria]
    # O geom sempre acaba gravado em EPSG:4674 (ver _feature_rows) —
    # o metadado "crs" tem de descrever o que está de fato na coluna,
    # não o CRS de origem do gdf recebido, que _feature_rows já reprojeta.
    crs = "EPSG:4674"
    geometry_types = sorted(set(gdf.geometry.geom_type.dropna().astype(str)))
    geometry_type = ",".join(geometry_types) or None
    metadata = {**metadados, "origem": origem, "categoria_armazenamento": categoria}
    if categoria == 'processadas':
        ident = _salvar_saida(recurso_id, nome, origem, gdf=gdf, metadados=metadata,
                             geometria_tipo=geometry_type, crs=crs)
        metadados.update(metadata)
        return ident
    rows = _feature_rows(gdf, usar_wkb=preservar_geometrias)
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
        _insert_features(conn, features, database_id, rows, usar_wkb=preservar_geometrias)
        conn.execute(
            sql.SQL("""UPDATE geoprocessamento.{} c
                SET envelope=(SELECT ST_Envelope(ST_Collect(geom))
                              FROM geoprocessamento.{} WHERE camada_id=c.id)
                WHERE c.id=%s""").format(
                sql.Identifier(catalog), sql.Identifier(features)
            ),
            (database_id,),
        )
        if categoria == "processadas" and gravar_arquivo:
            from api.services.ciclo_vida_arquivos import gravar_e_confirmar
            spatial = _gdal_reproject(gdf, crs) if gdf.crs else gdf.set_crs(crs)
            gravar_e_confirmar(conn, database_id, metadata, frame=spatial)
            metadados.update(metadata)
        else:
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
    if categoria == 'processadas':
        metadata.update(perfil=perfil, largura=largura, altura=altura, dtype=dtype, nodata=nodata)
        ident = _salvar_saida(recurso_id, nome, origem, raster_bytes=dados_geotiff,
                             metadados=metadata, geometria_tipo='Raster', crs=crs)
        metadados.update(metadata)
        return ident
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
        if categoria == "processadas":
            from api.services.ciclo_vida_arquivos import gravar_e_confirmar
            gravar_e_confirmar(conn, database_id, metadata, raster_bytes=dados_geotiff)
            metadados.update(metadata)
        else:
            conn.commit()
        return database_id


def _salvar_saida(recurso_id, nome, origem, *, metadados, geometria_tipo, crs,
                  gdf=None, raster_bytes=None):
    """Catálogo no banco; conteúdo vetorial/raster exclusivamente no storage."""
    metadados.update(nome=nome)
    with get_connection() as conn:
        from api.services import ciclo_vida_arquivos as ciclo, saidas_storage
        execution=ciclo.execucao_atual.get()
        if execution is None:
            execution=str(uuid4())
            conn.execute('''INSERT INTO geoprocessamento.execucao_arquivo
                (id,operacao,status,finalizado_em,parametros)
                VALUES (%s,%s,'concluido',now(),%s)''',
                (execution,origem,_jsonb({'linhagem_original':metadados.get('linhagem')})))
        destino=saidas_storage.destino(execution,'camadas',nome+('.gpkg' if gdf is not None else '.tif'))
        row = conn.execute('''INSERT INTO geoprocessamento.camada_processada
            (recurso_sessao_id,nome,tipo,geometria_tipo,crs,formato,operacao_origem,linhagem,metadados,storage_caminho)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id''',
            (recurso_id,nome,'vetor' if gdf is not None else 'raster',geometria_tipo,crs,
             'GPKG' if gdf is not None else 'GTiff',origem,_jsonb(metadados.get('linhagem',{})),_jsonb(metadados),destino)).fetchone()
        from api.services.ciclo_vida_arquivos import gravar_e_confirmar
        frame = (_gdal_reproject(gdf, crs) if gdf.crs else gdf.set_crs(crs)) if gdf is not None else None
        gravar_e_confirmar(conn,str(row['id']),metadados,frame=frame,raster_bytes=raster_bytes,
                          execucao_id=execution,caminho_destino=destino)
    return str(row['id'])


def _find_working_layer(conn: Any, recurso_id: str) -> tuple[str, dict[str, Any]] | None:
    for categoria in ("processadas", "importadas"):
        catalog = STORAGES[categoria][0]
        row = conn.execute(
            sql.SQL("SELECT * FROM geoprocessamento.{} WHERE recurso_sessao_id=%s FOR UPDATE").format(
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
    from uuid import UUID
    try:
        ident = UUID(recurso_id)
    except (ValueError, TypeError):
        return None
    for categoria in ("processadas", "importadas"):
        row = conn.execute(sql.SQL('SELECT * FROM geoprocessamento.{} WHERE id=%s')
                           .format(sql.Identifier(STORAGES[categoria][0])),(ident,)).fetchone()
        if row:
            return categoria,dict(row)
    return None


def substituir_vetor(recurso_id: str, gdf: gpd.GeoDataFrame, metadados: dict[str, Any],
                      *, arquivo_editado: Path | None = None, gravar_arquivo: Callable[[], None] | None = None) -> None:
    """Substitui somente uma camada de trabalho; snapshots nunca entram nesta busca."""
    rows = _feature_rows(gdf)
    with get_connection() as conn:
        found = _find_working_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            raise RuntimeError(f"Camada de trabalho {recurso_id} não encontrada")
        categoria, camada = found
        if categoria == 'processadas':
            raise ValueError('Saídas são imutáveis. Gere uma nova camada para editar seu conteúdo.')
        catalog, features, _ = STORAGES[categoria]
        database_id = str(camada["id"])
        if (arquivo_editado is None) != (gravar_arquivo is None):
            raise ValueError("A gravação exige o caminho e a operação de escrita do arquivo.")
        if arquivo_editado is not None:
            registrado = (camada.get("metadados") or {}).get("caminho_arquivo") or ((camada.get("metadados") or {}).get("metadados") or {}).get("caminho_arquivo")
            if not registrado or project_path(registrado).resolve() != arquivo_editado.resolve():
                raise ValueError("O arquivo não corresponde à camada informada.")
        if arquivo_editado is None and categoria == "processadas" and conn.execute(
            "SELECT 1 FROM geoprocessamento.arquivo_resultado WHERE camada_id=%s FOR UPDATE",
            (database_id,),
        ).fetchone():
            raise ValueError("Resultado com arquivo é imutável. Gere uma nova camada para editar seu conteúdo.")
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
            ("EPSG:4674", _jsonb(metadados), database_id),
        )
        if gravar_arquivo is not None:
            # O mesmo registro e o mesmo arquivo recebem a edição. Não cria saída nem backup.
            gravar_arquivo()
            from api.services.ciclo_vida_arquivos import digest
            checksum = digest(arquivo_editado)
            if categoria == "processadas":
                conn.execute("""UPDATE geoprocessamento.arquivo_resultado
                    SET sha256=%s,tamanho_bytes=%s,validacao=COALESCE(validacao,'{}'::jsonb)||%s WHERE camada_id=%s""",
                    (checksum, arquivo_editado.stat().st_size,
                     _jsonb({"feicoes": len(gdf), "edicao_no_original": True}), database_id))
            else:
                conn.execute("UPDATE geoprocessamento.camada_importada SET hash_arquivo=%s WHERE id=%s",
                             (checksum, database_id))
        conn.commit()


def migrar_vetor_existente(database_id: str, recurso_id: str, gdf: gpd.GeoDataFrame, uri_relativa: str) -> None:
    """Compatibilidade para internalização de registros legados."""
    del database_id
    salvar_vetor(
        recurso_id=recurso_id, nome=Path(uri_relativa).stem, origem="arquivo",
        gdf=gdf, metadados={"uri_legada_relativa": uri_relativa},
    )


def listar(*, incluir_manifesto: bool = True) -> list[dict[str, Any]]:
    """Une os três catálogos apenas na resposta; o armazenamento permanece separado."""
    # O inventário integral dos pacotes não é necessário à navegação.
    metadata = sql.SQL("metadados" if incluir_manifesto else
                       "(metadados - 'manifesto') #- '{metadados,manifesto}'")
    rows: list[dict[str, Any]] = []
    with get_connection() as conn:
        for categoria, (catalog, _, _) in STORAGES.items():
            date_column = "homologado_em" if categoria == "homologadas" else "criado_em"
            selected = conn.execute(
                sql.SQL("""SELECT id,recurso_sessao_id,nome,tipo,crs,formato,{} AS metadados,
                           geometria_tipo,
                           {} AS criado_em,
                           TRUE AS persistida,(tipo='vetor') AS tem_vetor,
                           (tipo='raster') AS tem_raster,%s::text AS categoria
                    FROM geoprocessamento.{}
                    WHERE recurso_sessao_id IS NOT NULL ORDER BY {}""").format(
                    metadata, sql.Identifier(date_column), sql.Identifier(catalog),
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
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            return vetor(camada), {**camada, 'categoria': categoria}
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
    # ST_AsGeoJSON devolve as coordenadas cruas, no SRID que o geom já tem
    # (4674 desde a migração 100) — sem CRS embutido no próprio GeoJSON, o
    # GeoDataFrame precisa ser rotulado com o CRS real, não um valor antigo.
    gdf = (
        gpd.GeoDataFrame.from_features(feature_collection, crs="EPSG:4674")
        if feature_collection else gpd.GeoDataFrame(geometry=[], crs="EPSG:4674")
    )
    if camada.get("crs") and str(camada["crs"]).upper() != "EPSG:4674" and not gdf.empty:
        gdf = _gdal_reproject(gdf, camada["crs"])
    camada["categoria"] = categoria
    return gdf, camada


def carregar_vetor_bruto(recurso_id: str):
    """Leitura binária do PostGIS, preservando precisão e atributos sem GeoJSON."""
    import pandas as pd
    import shapely
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]['tipo'] != 'vetor':
            return None
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            return vetor(camada), {**camada, 'categoria': categoria}
        rows = conn.execute(sql.SQL(
            'SELECT propriedades, ST_AsBinary(geom) AS wkb FROM geoprocessamento.{} '
            'WHERE camada_id=%s ORDER BY ordem'
        ).format(sql.Identifier(STORAGES[categoria][1])), (camada['id'],)).fetchall()
    tabela = pd.DataFrame([r['propriedades'] or {} for r in rows])
    campo = '__geometria_original__'
    while campo in tabela.columns:
        campo += '_'
    tabela[campo] = gpd.GeoSeries([shapely.from_wkb(bytes(r['wkb'])) if r['wkb'] is not None else None for r in rows], crs=4674)
    frame = gpd.GeoDataFrame(tabela, geometry=campo, crs=4674)
    if camada.get('crs') and str(camada['crs']).upper() != 'EPSG:4674' and not frame.empty:
        frame = _gdal_reproject(frame, camada['crs'])
    return frame, {**camada, 'categoria': categoria}


def atributos_paginados(recurso_id: str, offset: int = 0, limite: int = 100) -> dict[str, Any] | None:
    """Tabela integral por páginas, sem carregar ou simplificar as geometrias."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]['tipo'] != 'vetor':
            return None
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            frame = vetor(camada)
            fields = [c for c in frame.columns if c != frame.geometry.name]
            return {'campos':fields,'linhas':_json_safe(frame.iloc[offset:offset+limite][fields].to_dict('records')),
                    'total':len(frame),'offset':offset,'limite':limite}
        tabela = sql.Identifier(STORAGES[categoria][1])
        total = conn.execute(sql.SQL('SELECT count(*) AS total FROM geoprocessamento.{} WHERE camada_id=%s').format(tabela),
                             (camada['id'],)).fetchone()['total']
        campos = conn.execute(sql.SQL('SELECT DISTINCT jsonb_object_keys(propriedades) AS campo '
                                     'FROM geoprocessamento.{} WHERE camada_id=%s ORDER BY campo').format(tabela),
                              (camada['id'],)).fetchall()
        rows = conn.execute(sql.SQL('SELECT propriedades FROM geoprocessamento.{} WHERE camada_id=%s '
                                   'ORDER BY ordem LIMIT %s OFFSET %s').format(tabela),
                            (camada['id'],limite,offset)).fetchall()
    return {'campos':[r['campo'] for r in campos],'linhas':[r['propriedades'] for r in rows],
            'total':total,'offset':offset,'limite':limite}


def atributos_dashboard(recurso_id: str) -> list[dict] | None:
    """Atributos integrais sem transferir as geometrias para cada filtro."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]['tipo'] != 'vetor':
            return None
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            frame = vetor(camada)
            fields = [c for c in frame.columns if c != frame.geometry.name]
            return [{'ordem':i,'propriedades':_json_safe(row)} for i,row in enumerate(frame[fields].to_dict('records'))]
        return conn.execute(sql.SQL('SELECT ordem,propriedades FROM geoprocessamento.{} '
                                    'WHERE camada_id=%s ORDER BY ordem').format(sql.Identifier(STORAGES[categoria][1])),
                            (camada['id'],)).fetchall()


def geometrias_dashboard(recurso_id: str, ordens: list[int]):
    """Somente as geometrias da página; ordem liga cada feição à linha exata."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]['tipo'] != 'vetor':
            raise LookupError('Camada de saída não encontrada.')
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            frame = _gdal_reproject(vetor(camada), 4674)
            return [{'ordem':i,'geometria':mapping(frame.geometry.iloc[i]) if frame.geometry.iloc[i] is not None else None}
                    for i in sorted(set(ordens)) if 0 <= i < len(frame)]
        rows = conn.execute(sql.SQL('SELECT ordem,ST_AsGeoJSON(geom)::jsonb AS geometria '
                                    'FROM geoprocessamento.{} WHERE camada_id=%s AND ordem=ANY(%s) ORDER BY ordem')
                            .format(sql.Identifier(STORAGES[categoria][1])), (camada['id'], ordens)).fetchall()
    return rows


def carregar_vetor_geojson(recurso_id: str) -> dict[str, Any] | None:
    """Monta o GeoJSON integral diretamente no PostGIS, sem alterar geometrias."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import vetor
            return json.loads(_gdal_reproject(vetor(camada), 4674).to_json(default=str))
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
    """Retorna a extensão integral da camada em EPSG:4674 (o CRS de armazenamento)."""
    with get_connection() as conn:
        found = _find_layer(conn, recurso_id)
        if not found or found[1]["tipo"] != "vetor":
            return None
        categoria, camada = found
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.storage_geoespacial import bounds
            return bounds(camada['storage_caminho'], 'resultado')
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
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.storage_geoespacial import tile
            return tile(camada['storage_caminho'], 'resultado', z, x, y)
        features = STORAGES[categoria][1]
        row = conn.execute(
            sql.SQL("""WITH tile_bounds AS (
                    SELECT ST_TileEnvelope(%s,%s,%s) AS geom,
                           -- Precisa bater o SRID de f.geom (4674 desde a
                           -- migração 100) para o filtro && comparar caixas
                           -- no mesmo referencial; com SRIDs diferentes o
                           -- predicado compararia números sem sentido físico
                           -- comum, perdendo feição perto da borda do tile.
                           ST_Transform(ST_TileEnvelope(%s,%s,%s, margin => 0.015625),4674) AS query_geom
                ), tile_rows AS (
                    SELECT propriedades, f.ordem AS __gp_indice,
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
        if categoria == 'processadas' and camada.get('storage_caminho'):
            from api.services.saidas_storage import conferir
            metadata = camada.get('metadados') or {}
            return conferir(camada['storage_caminho'], metadata.get('sha256')), {**camada, **metadata, 'categoria':categoria}
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


def _remover_arquivo_de_saida(caminho: str) -> None:
    """Apaga o arquivo de um resultado retirado, sem sair de outputs."""
    from api.services import saidas_storage
    if caminho.startswith(saidas_storage.RAIZ + '/'):
        saidas_storage.remover(caminho)
        return
    raiz = project_path("data/geoespacial/outputs").resolve()
    try:
        alvo = project_path(caminho).resolve()
    except (OSError, ValueError):
        return
    if alvo.is_relative_to(raiz) and alvo.is_file():
        alvo.unlink(missing_ok=True)


def excluir(recurso_id: str) -> bool:
    with get_connection() as conn:
        # arquivo_resultado referencia camada_processada com ON DELETE RESTRICT:
        # sem retirar antes o registro do arquivo e seus usos, a exclusão da
        # camada falha no banco e o endpoint devolvia um 409 enganoso.
        arquivos = conn.execute(
            """SELECT a.id, a.caminho FROM geoprocessamento.arquivo_resultado a
               JOIN geoprocessamento.camada_processada c ON c.id = a.camada_id
               WHERE c.recurso_sessao_id=%s""",
            (recurso_id,),
        ).fetchall()
        for arquivo in arquivos:
            conn.execute(
                "DELETE FROM geoprocessamento.arquivo_resultado_uso WHERE arquivo_id=%s",
                (arquivo["id"],),
            )
            conn.execute(
                "DELETE FROM geoprocessamento.arquivo_resultado WHERE id=%s",
                (arquivo["id"],),
            )
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
            # Só depois do commit: o arquivo não pode sumir se a transação cair.
            for arquivo in arquivos:
                _remover_arquivo_de_saida(arquivo["caminho"])
        return removido


def esta_homologada(recurso_id: str) -> bool:
    """Compatibilidade: o conceito de camada homologada foi retirado."""
    return False


def resolver_recurso_id(identificador: str) -> str | None:
    if not identificador:
        return None
    with get_connection() as conn:
        found = _find_layer(conn, identificador)
        return found[1]['recurso_sessao_id'] if found else None


def homologar(*args, **kwargs):
    raise ValueError('Homologação de camadas descontinuada. As saídas estão no Sicard Storage.')


def listar_biblioteca(modulo: str | None = None) -> list[dict[str, Any]]:
    from api.repositories.saidas_geoespaciais_repository import listar as saidas
    return [{**row, 'nome_publicacao':row['nome'], 'homologacao_id':None,
             'versao':'', 'modulo_consumidor':None} for row in saidas()]


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


def listar_biblioteca_canonica_arquivos(modulo: str | None = None) -> list[dict[str, Any]]:
    """Compatibilidade de leitura: lista exclusivamente o catálogo no Storage."""
    return [{**row, 'registrada':True, 'subdiretorio':row['ferramenta'],
             'nome_publicacao':row['nome'], 'versao':'', 'homologacao_id':None}
            for row in listar_biblioteca(modulo)]
