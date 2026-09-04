"""As duas portas de entrada do sistema devem classificar igual.

Até 2026-09-02, `.gpkg` era `vetor` para `api.path_policy` (saída de
geoprocesso) e `geodatabase` para `geospatial_upload_storage` (upload). O mesmo
arquivo ia para pastas diferentes conforme a porta — e foi assim que
`datastorage/geodatabase/` acabou cheio de GeoPackage vetorial.
"""
from __future__ import annotations

import pytest

from api import path_policy
from api.services import geospatial_upload_storage as upload

EXTENSOES = [".gpkg", ".geodatabase", ".gdb", ".shp", ".geojson", ".json",
             ".kml", ".fgb", ".tif", ".tiff", ".img"]


@pytest.mark.parametrize("extensao", EXTENSOES)
def test_as_duas_portas_classificam_igual(extensao):
    nome = f"camada{extensao}"
    assert path_policy.categoria_por_extensao(nome) == upload._member_category(nome)


def test_geopackage_e_vetor_e_nao_categoria_propria():
    assert path_policy.categoria_por_extensao("camada.gpkg") == "vetor"
    assert upload._member_category("camada.gpkg") == "vetor"


def test_geodatabase_deixou_de_ser_categoria_de_saida():
    assert path_policy.GEO_OUTPUT_CATEGORIES == ("vetor", "raster")


def test_membro_dentro_de_gdb_e_vetor():
    assert upload._member_category("pacote/base.gdb/a00000001.gdbtable") == "vetor"


def test_conteiner_nao_e_renomeado_na_extracao(tmp_path):
    """Renomear membro interno de um contêiner o corrompe."""
    (tmp_path / "Base.gdb").mkdir()
    (tmp_path / "Base.gdb" / "a00000001.gdbtable").write_bytes(b"x")
    upload._normalize_extracted_tree(tmp_path, "vetor")
    assert (tmp_path / "Base.gdb" / "a00000001.gdbtable").exists()


def test_pacote_sem_conteiner_continua_normalizando(tmp_path):
    (tmp_path / "Área Contaminada.shp").write_bytes(b"x")
    upload._normalize_extracted_tree(tmp_path, "vetor")
    assert (tmp_path / "area_contaminada.shp").exists()


def test_conteiner_tem_precedencia_como_dataset_principal(tmp_path):
    (tmp_path / "auxiliar.shp").write_bytes(b"x")
    (tmp_path / "principal.gpkg").write_bytes(b"x")
    assert upload._primary_dataset(tmp_path, "vetor").name == "principal.gpkg"


def test_saida_de_geoprocesso_fica_na_raiz_de_outputs():
    """Toda saída vai direto para data/geoespacial/outputs, sem subpasta."""
    caminho = path_policy.geo_output_path("identity_restricao.gpkg")
    assert caminho.parent == path_policy.PROJECT_ROOT / path_policy.GEO_OUTPUTS_DIR
    assert caminho.parent.name == "outputs"


def test_categoria_nao_vira_subpasta():
    vetor = path_policy.geo_output_path("camada.gpkg", categoria="vetor")
    raster = path_policy.geo_output_path("superficie.tif", categoria="raster")
    assert vetor.parent == raster.parent, "vetor e raster compartilham o destino único"


def test_validacao_de_categoria_continua_de_pe():
    """A categoria deixou de rotear, mas segue impedindo extensão incoerente."""
    with pytest.raises(ValueError, match="categoria"):
        path_policy.geo_output_path("superficie.gpkg", categoria="raster")
