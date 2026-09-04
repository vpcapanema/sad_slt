"""Geoprocesso lê a camada do arquivo do acervo, não do PostGIS remoto.

Geoprocesso consome a camada INTEIRA, e para leitura completa o arquivo ganha do
banco: no aferimento do MapServer, GeoPackage lê em 0,042s contra 0,053s do
PostGIS nativo — e aqui o PostGIS é remoto, somando rede a cada leitura. Medido
neste acervo, o arquivo é de 3 a 38 vezes mais rápido.

O banco permanece como retaguarda: camada sem arquivo (saída de geoprocesso) ou
com arquivo ausente continua sendo servida por ele.
"""
from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import Point

from api.services.geoespacial_service import geoespacial_service as geo


@pytest.fixture()
def camada(tmp_path):
    quadro = gpd.GeoDataFrame(
        {"nome": ["a", "b"]}, geometry=[Point(0, 0), Point(1, 1)], crs="EPSG:4674"
    )
    destino = tmp_path / "camada.gpkg"
    quadro.to_file(destino, driver="GPKG")
    return quadro, destino


def test_le_do_arquivo_quando_ha_vinculo(camada, monkeypatch):
    quadro, destino = camada
    recurso = "camada_teste_arquivo"
    geo._metadados[recurso] = {"id": recurso, "caminho_arquivo": str(destino)}
    geo._camadas.pop(recurso, None)
    monkeypatch.setattr(
        "api.services.geoespacial_service.project_path", lambda valor, **_: destino
    )

    def nao_deve_ler_do_banco(_):
        raise AssertionError("com arquivo disponível, o banco não deve ser consultado")

    monkeypatch.setattr(
        "api.repositories.camada_geoespacial_repository.carregar_vetor",
        nao_deve_ler_do_banco,
    )

    lido = geo.obter_camada_dados(recurso)
    assert len(lido) == len(quadro)
    geo._camadas.pop(recurso, None)
    geo._metadados.pop(recurso, None)


def test_cai_para_o_banco_quando_nao_ha_arquivo(monkeypatch):
    recurso = "camada_teste_sem_arquivo"
    geo._metadados[recurso] = {"id": recurso, "caminho_arquivo": None}
    geo._camadas.pop(recurso, None)
    esperado = gpd.GeoDataFrame({"n": [1]}, geometry=[Point(0, 0)], crs="EPSG:4674")
    monkeypatch.setattr(
        "api.repositories.camada_geoespacial_repository.carregar_vetor",
        lambda _: (esperado, {}),
    )

    lido = geo.obter_camada_dados(recurso)
    assert len(lido) == 1
    geo._camadas.pop(recurso, None)
    geo._metadados.pop(recurso, None)


def test_cai_para_o_banco_quando_o_arquivo_sumiu(tmp_path, monkeypatch):
    recurso = "camada_teste_arquivo_ausente"
    ausente = tmp_path / "nao_existe.gpkg"
    geo._metadados[recurso] = {"id": recurso, "caminho_arquivo": str(ausente)}
    geo._camadas.pop(recurso, None)
    monkeypatch.setattr(
        "api.services.geoespacial_service.project_path", lambda valor, **_: ausente
    )
    esperado = gpd.GeoDataFrame({"n": [1]}, geometry=[Point(0, 0)], crs="EPSG:4674")
    monkeypatch.setattr(
        "api.repositories.camada_geoespacial_repository.carregar_vetor",
        lambda _: (esperado, {}),
    )

    assert len(geo.obter_camada_dados(recurso)) == 1
    geo._camadas.pop(recurso, None)
    geo._metadados.pop(recurso, None)


def test_importacao_grava_o_vinculo_com_o_arquivo():
    """Sem esta chave o registro não sabe de que arquivo veio."""
    import inspect

    from api.services import importar_camadas_service

    fonte = inspect.getsource(importar_camadas_service)
    assert '"caminho_arquivo": stored.relative_import_path' in fonte, (
        "o import deve gravar o caminho do dataset legível no registro"
    )
