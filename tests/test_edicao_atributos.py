"""Modo de edição de atributos na Bancada — grava na fonte real da camada.

Sem isto, editar um campo de uma camada gravava só no PostGIS: o arquivo do
acervo — o que o usuário abriu e pensa que está editando — nunca mudava. Agora
a mesma operação escreve nos dois quando a camada tem arquivo, e só no banco
quando não tem.
"""
from __future__ import annotations

import asyncio
import shutil
import warnings
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point

warnings.filterwarnings("ignore")

from api.repositories import camada_geoespacial_repository as repo
from api.services.geoespacial_service import geoespacial_service as geo

# `caminho_arquivo` precisa ser relativo à raiz do projeto (project_path exige
# isso) — por isso o arquivo de teste mora dentro do próprio repositório, não
# num tmp_path do pytest.
DIR_TESTE = Path("data/geoespacial/tests/edicao_atributos")


def _gdf_exemplo() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"nome": ["a", "b"], "valor": [1, 2]},
        geometry=[Point(-46.6, -23.5), Point(-46.7, -23.6)],
        crs="EPSG:4674",
    )


@pytest.fixture()
def camada_somente_banco():
    camada_id = geo.registrar_camada(_gdf_exemplo(), "Teste edição de atributos", "teste")
    yield camada_id
    asyncio.run(geo.excluir_recurso(camada_id))


@pytest.fixture()
def camada_com_arquivo():
    DIR_TESTE.mkdir(parents=True, exist_ok=True)
    caminho = DIR_TESTE / "camada_teste.gpkg"
    gdf = _gdf_exemplo()
    gdf.to_file(caminho)
    relativo = caminho.as_posix()
    camada_id = geo.registrar_camada(
        gdf, "Teste edição com arquivo", "teste", caminho_arquivo=relativo
    )
    yield camada_id, caminho
    asyncio.run(geo.excluir_recurso(camada_id))
    shutil.rmtree(DIR_TESTE, ignore_errors=True)


def test_recusa_editar_camada_homologada(camada_somente_banco, monkeypatch):
    monkeypatch.setattr(repo, "esta_homologada", lambda _id: True)
    with pytest.raises(ValueError, match="somente leitura"):
        geo.salvar_edicoes_atributos(camada_somente_banco, [{"indice": 0, "campos": {"valor": 99}}])


def test_recusa_lista_de_edicoes_vazia(camada_somente_banco):
    with pytest.raises(ValueError, match="dição"):
        geo.salvar_edicoes_atributos(camada_somente_banco, [])


def test_recusa_indice_fora_do_intervalo(camada_somente_banco):
    with pytest.raises(ValueError, match="ndice"):
        geo.salvar_edicoes_atributos(camada_somente_banco, [{"indice": 99, "campos": {"valor": 1}}])


def test_recusa_editar_a_geometria(camada_somente_banco):
    with pytest.raises(ValueError, match="eometria"):
        geo.salvar_edicoes_atributos(camada_somente_banco, [{"indice": 0, "campos": {"geometry": None}}])


def test_recusa_campo_inexistente(camada_somente_banco):
    with pytest.raises(ValueError, match="inexistente"):
        geo.salvar_edicoes_atributos(camada_somente_banco, [{"indice": 0, "campos": {"nao_existe": 1}}])


def test_camada_so_banco_edita_sem_tocar_arquivo(camada_somente_banco):
    resultado = geo.salvar_edicoes_atributos(
        camada_somente_banco, [{"indice": 0, "campos": {"valor": 42}}]
    )
    assert resultado["gravado_em_arquivo"] is False
    assert resultado["linhas_editadas"] == 1

    lido, _ = repo.carregar_vetor(camada_somente_banco)
    assert lido.iloc[0]["valor"] == 42


def test_camada_com_arquivo_grava_nos_dois_lugares(camada_com_arquivo):
    camada_id, caminho = camada_com_arquivo
    resultado = geo.salvar_edicoes_atributos(
        camada_id, [{"indice": 1, "campos": {"nome": "editado"}}]
    )
    assert resultado["gravado_em_arquivo"] is True

    # O arquivo em disco mudou — reabrindo por fora do sistema, sem cache.
    relido = gpd.read_file(caminho)
    assert relido.iloc[1]["nome"] == "editado"

    # E o PostGIS mudou junto — as duas cópias não podem divergir.
    do_banco, _ = repo.carregar_vetor(camada_id)
    assert do_banco.iloc[1]["nome"] == "editado"


def test_arquivo_original_sobrevive_se_a_escrita_falhar(camada_com_arquivo, monkeypatch):
    """Escreve em um temporário antes de trocar — queda no meio não corrompe o original."""
    camada_id, caminho = camada_com_arquivo
    conteudo_original = caminho.read_bytes()

    def _falha(*_args, **_kwargs):
        raise RuntimeError("falha simulada de gravação")

    monkeypatch.setattr(gpd.GeoDataFrame, "to_file", _falha)
    with pytest.raises(RuntimeError):
        geo.salvar_edicoes_atributos(camada_id, [{"indice": 0, "campos": {"valor": 7}}])

    assert caminho.read_bytes() == conteudo_original
