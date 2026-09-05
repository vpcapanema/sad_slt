"""EPSG:4674 (SIRGAS 2000) é o CRS de armazenamento do acervo geoespacial.

Antes, o schema gravava tudo em EPSG:4326 por convenção de código nunca
declarada — o próprio backend já trata 4674 como o CRS oficial em toda a
documentação e nos parâmetros de importação (SYSTEM_CRS), então o PostGIS
divergia do padrão que o sistema afirma seguir.
"""
from __future__ import annotations

import asyncio
import inspect
import warnings

import geopandas as gpd
import pytest
from shapely.geometry import Point

warnings.filterwarnings("ignore")

from api.repositories import camada_geoespacial_repository as repo
from api.services.geoespacial_service import geoespacial_service as geo


def test_grava_geometria_em_4674_nao_em_4326():
    fonte = inspect.getsource(repo._feature_rows)
    assert 'EPSG:4674' in fonte
    assert 'EPSG:4326' not in fonte


def test_insert_features_marca_srid_4674():
    fonte = inspect.getsource(repo._insert_features)
    assert 'ST_SetSRID(ST_GeomFromGeoJSON(%s::text),4674)' in fonte


def test_colunas_de_feicao_continuam_genericas_para_aceitar_z():
    """A migração 056 relaxou geom para `geometry` genérico (sem SRID no
    typmod) para aceitar coordenada Z. A padronização de CRS não pode
    reintroduzir um typmod tipado, ou perde essa aceitação de novo."""
    import api.db.connection as db

    with db.get_connection() as conn:
        linhas = conn.execute(
            """SELECT c.relname AS tabela, format_type(a.atttypid, a.atttypmod) AS tipo
               FROM pg_attribute a
               JOIN pg_class c ON a.attrelid = c.oid
               JOIN pg_namespace n ON c.relnamespace = n.oid
               WHERE n.nspname = 'geoprocessamento' AND a.attname = 'geom'
                 AND c.relname LIKE 'camada_%_feicao'"""
        ).fetchall()
    assert linhas, "tabelas de feição não encontradas"
    for linha in linhas:
        assert linha["tipo"] == "geometry", (
            f"{linha['tabela']}.geom ganhou typmod tipado — perde aceitação de Z"
        )


def test_envelopes_estao_tipados_em_4674():
    import api.db.connection as db

    with db.get_connection() as conn:
        linhas = conn.execute(
            """SELECT c.relname AS tabela, format_type(a.atttypid, a.atttypmod) AS tipo
               FROM pg_attribute a
               JOIN pg_class c ON a.attrelid = c.oid
               JOIN pg_namespace n ON c.relnamespace = n.oid
               WHERE n.nspname = 'geoprocessamento' AND a.attname = 'envelope'
                 AND c.relname IN ('camada_importada', 'camada_homologada', 'camada_processada')"""
        ).fetchall()
    assert linhas
    for linha in linhas:
        assert linha["tipo"] == "geometry(Geometry,4674)", linha["tabela"]


def test_ciclo_completo_grava_e_le_em_sirgas2000():
    """Escreve um ponto conhecido, lê de volta do banco, confere CRS e valor."""
    gdf = gpd.GeoDataFrame(
        {"nome": ["teste_crs"]}, geometry=[Point(-46.6333, -23.5505)], crs="EPSG:4674"
    )
    camada_id = geo.registrar_camada(gdf, "Teste automatizado — CRS SIRGAS2000", "teste")
    try:
        lido, metadados = repo.carregar_vetor(camada_id)
        assert metadados["crs"] == "EPSG:4674"
        assert str(lido.crs).upper() == "EPSG:4674"
        assert lido.geometry.iloc[0].x == pytest.approx(-46.6333, abs=1e-6)
        assert lido.geometry.iloc[0].y == pytest.approx(-23.5505, abs=1e-6)

        geojson = asyncio.run(geo.camada_geojson(camada_id))
        # A saída para o mapa web permanece 4326 — é a fronteira de exibição,
        # não o formato de guarda.
        coords = geojson["features"][0]["geometry"]["coordinates"]
        assert coords[0] == pytest.approx(-46.6333, abs=1e-4)
        assert coords[1] == pytest.approx(-23.5505, abs=1e-4)
    finally:
        asyncio.run(geo.excluir_recurso(camada_id))


def test_tile_mvt_compara_no_mesmo_srid_do_geom():
    """O filtro && do MVT precisa comparar 4674 com 4674, não 4674 com 4326."""
    fonte = inspect.getsource(repo.carregar_vetor_mvt)
    assert "ST_TileEnvelope(%s,%s,%s, margin => 0.015625),4674)" in fonte
    assert ",4326)" not in fonte
