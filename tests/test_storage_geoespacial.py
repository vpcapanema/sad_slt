"""Camadas lidas direto do storage: pastas viram grupos, arquivos viram camadas.

O storage é somente leitura para o SICARD; os tiles saem do próprio arquivo,
sem passar pelo banco. Estes testes montam um storage mínimo em disco.
"""
from __future__ import annotations

from pathlib import Path

import mercantile
import pytest
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.server import app
from api.services import storage_geoespacial


def _gpkg(caminho: Path, camadas: tuple[str, ...] = ("uf",)) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    ds = ogr.GetDriverByName("GPKG").CreateDataSource(str(caminho))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4674)
    for nome in camadas:
        lyr = ds.CreateLayer(nome, srs, ogr.wkbPolygon)
        lyr.CreateField(ogr.FieldDefn("nome", ogr.OFTString))
        feicao = ogr.Feature(lyr.GetLayerDefn())
        feicao.SetField("nome", "São Paulo")
        feicao.SetGeometry(ogr.CreateGeometryFromWkt("POLYGON((-50 -24,-45 -24,-45 -20,-50 -20,-50 -24))"))
        lyr.CreateFeature(feicao)
    ds = None


@pytest.fixture
def storage(tmp_path, monkeypatch):
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: tmp_path)
    _gpkg(tmp_path / "base-geoespacial/vetor/uf_sp.gpkg")
    _gpkg(tmp_path / "base-geoespacial/vetor/duas.gpkg", ("rios", "lagos"))
    (tmp_path / "base-geoespacial/raster").mkdir(parents=True)
    (tmp_path / "base-geoespacial/vetor/leia-me.txt").write_text("fora da lista", encoding="utf-8")
    (tmp_path / "superficies-indices/hierarquizacao/elegibilidade").mkdir(parents=True)
    (tmp_path / "base-geodatabase").mkdir()
    return tmp_path


def test_pastas_viram_grupos_e_arquivos_viram_camadas(storage):
    arvore = storage_geoespacial.arvore("base-geoespacial")

    assert [grupo["nome"] for grupo in arvore["grupos"]] == ["raster", "vetor"]
    vetor = arvore["grupos"][1]
    assert [camada["nome"] for camada in vetor["camadas"]] == ["rios", "lagos", "uf_sp"], (
        "arquivo com uma camada leva o nome do arquivo; com várias, o de cada camada"
    )
    uf = vetor["camadas"][2]
    assert uf["arquivo"] == "base-geoespacial/vetor/uf_sp.gpkg"
    assert uf["crs"] == "EPSG:4674" and uf["feicoes"] == 1


def test_pastas_aninhadas_de_superficies_indices(storage):
    arvore = storage_geoespacial.arvore("superficies-indices")
    hierarquizacao = arvore["grupos"][0]
    assert hierarquizacao["nome"] == "hierarquizacao"
    assert [grupo["nome"] for grupo in hierarquizacao["grupos"]] == ["elegibilidade"]


@pytest.mark.parametrize("raiz", ["base-geodatabase", "..", "outra"])
def test_so_as_pastas_publicadas_sao_listadas(storage, raiz):
    with pytest.raises(ValueError):
        storage_geoespacial.arvore(raiz)


@pytest.mark.parametrize("caminho", ["../fora.gpkg", "/etc/passwd", "base-geoespacial/../../x.gpkg", "base-geodatabase/a.gpkg"])
def test_caminho_de_camada_nao_sai_do_storage(storage, caminho):
    with pytest.raises(ValueError):
        storage_geoespacial.resolver(caminho)


def test_extensao_e_tile_saem_do_arquivo(storage):
    minx, miny, maxx, maxy = storage_geoespacial.bounds("base-geoespacial/vetor/uf_sp.gpkg", "uf")
    assert (round(minx), round(miny), round(maxx), round(maxy)) == (-50, -24, -45, -20)

    tile = mercantile.tile(-47.5, -22, 6)
    conteudo = storage_geoespacial.tile("base-geoespacial/vetor/uf_sp.gpkg", "uf", 6, tile.x, tile.y)
    assert conteudo, "tile sobre a feição não pode vir vazio"
    longe = mercantile.tile(120, 40, 6)
    assert storage_geoespacial.tile("base-geoespacial/vetor/uf_sp.gpkg", "uf", 6, longe.x, longe.y) == b""


def test_pagina_renomeada_e_rota_antiga_redireciona():
    client = TestClient(app)
    antiga = client.get("/restrict/geoespacial/visualizador-insumos-geoespaciais/", follow_redirects=False)
    assert antiga.status_code == 308
    assert antiga.headers["location"] == "/restrict/geoespacial/visualizador-bases-geoespaciais/"

    indice = Path("templates/paginas/geoespacial/index.html").read_text(encoding="utf-8")
    assert "Visualizador de bases geoespaciais" in indice
    assert "Camadas de Superfícies-índice" in indice
    assert "insumos geoespaciais" not in indice.lower()
