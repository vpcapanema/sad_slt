"""O overlay usa o motor nativo do OGR e preserva os atributos das duas camadas.

Os produtos consolidados da Fase 1 de agosto/2026 chegaram à biblioteca sem
`criterio_id`, `severidade` nem `base_legal`: o caminho antigo (`gpd.overlay`)
só tratava campos homônimos e deixava o resto por conta do chamador. O OGR
carrega todos os campos, prefixados por camada — que é o que a regra
`<fonte_id>__<nome_campo>` dos fluxos sempre pediu.
"""
from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import box

from api.services.geoespacial_service import (
    _OVERLAY_OGR,
    _overlay_ogr,
    _prefixo_overlay,
)


@pytest.fixture()
def base() -> gpd.GeoDataFrame:
    """Base territorial — o papel que a máscara do estado ocupa nos fluxos."""
    return gpd.GeoDataFrame({"uf": ["SP"], "geometry": [box(0, 0, 10, 10)]}, crs="EPSG:4674")


@pytest.fixture()
def tematica() -> gpd.GeoDataFrame:
    """Camada temática: uma feição sobrepõe a base, outra está distante."""
    return gpd.GeoDataFrame(
        {
            "criterio_id": ["areas_contaminadas", "areas_contaminadas"],
            "severidade": [4, 4],
            "base_legal": ["Lei 13.577/2009", "Lei 13.577/2009"],
            "geometry": [box(5, 5, 15, 15), box(50, 50, 60, 60)],
        },
        crs="EPSG:4674",
    )


def test_identity_preserva_os_campos_de_controle(base, tematica):
    saida = _overlay_ogr(base, tematica, "identity", prefixo_1="uf__", prefixo_2="cont__")
    for campo in ("cont__criterio_id", "cont__severidade", "cont__base_legal"):
        assert campo in saida.columns, f"{campo} deve sobreviver ao overlay"
    assert "uf__uf" in saida.columns, "os campos da entrada também são preservados"


def test_identity_mantem_a_entrada_inteira(base, tematica):
    """Identity conserva toda a entrada: a parte sobreposta e o restante."""
    saida = _overlay_ogr(base, tematica, "identity", prefixo_1="uf__", prefixo_2="cont__")
    assert len(saida) == 2
    assert saida.geometry.area.sum() == pytest.approx(base.geometry.area.sum())
    classificadas = saida["cont__criterio_id"].notna().sum()
    assert classificadas == 1, "só a parte sobreposta recebe os atributos"


def test_identity_descarta_o_que_esta_fora_da_entrada(base, tematica):
    """A feição distante da base não entra — é a semântica do Identity."""
    saida = _overlay_ogr(base, tematica, "identity", prefixo_1="uf__", prefixo_2="cont__")
    assert saida.geometry.bounds["maxx"].max() <= 10.0


def test_union_traz_o_que_o_identity_descarta(base, tematica):
    """Union é quem preserva as duas camadas inteiras — contraste deliberado."""
    identidade = _overlay_ogr(base, tematica, "identity", prefixo_1="a__", prefixo_2="b__")
    uniao = _overlay_ogr(base, tematica, "union", prefixo_1="a__", prefixo_2="b__")
    assert len(uniao) > len(identidade)
    assert uniao.geometry.bounds["maxx"].max() > 10.0


@pytest.mark.parametrize("tipo", sorted(_OVERLAY_OGR))
def test_todas_as_operacoes_passam_pelo_motor_ogr(tipo, base, tematica):
    saida = _overlay_ogr(base, tematica, tipo, prefixo_1="a__", prefixo_2="b__")
    assert isinstance(saida, gpd.GeoDataFrame)
    assert saida.crs == base.crs


def test_tipo_de_overlay_desconhecido_e_recusado():
    assert "erase" not in _OVERLAY_OGR
    assert _OVERLAY_OGR["difference"] == "Erase"


def test_prefixo_vem_da_regra_declarada_no_fluxo():
    assert _prefixo_overlay("<fonte_id>__<nome_campo>", "inundacao") == "inundacao__"
    assert _prefixo_overlay("<fonte_id>.<nome_campo>", "inundacao") == "inundacao."
    assert _prefixo_overlay("", "inundacao") == "inundacao__"


def test_toolbox_declara_o_motor_ogr():
    """A interface da Bancada deve anunciar a biblioteca que de fato executa."""
    from pathlib import Path

    script = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
    assert '"OP-05":"GDAL"' in script
    assert '"OP-05-IDENT":"GDAL"' in script
    assert "regra_nomenclatura" in script, "a regra de nomenclatura deve ser configurável"


def test_overlay_nao_devolve_geometria_de_dimensao_menor():
    """Bordas e toques não podem virar linha/ponto na saída.

    Sem KEEP_LOWER_DIMENSION_GEOMETRIES=NO o OGR devolve GEOMETRYCOLLECTION com
    fragmentos de borda. Além de fugir da semântica do ArcGIS, essas coleções
    reentram na rodada seguinte de um encadeamento e derrubam o GDAL sem
    exceção Python — foi o que interrompeu a consolidação da restrição.
    """
    # Dois polígonos que se tocam apenas pela aresta: a interseção é uma linha.
    a = gpd.GeoDataFrame({"a": [1], "geometry": [box(0, 0, 10, 10)]}, crs="EPSG:4674")
    b = gpd.GeoDataFrame({"b": [1], "geometry": [box(10, 0, 20, 10)]}, crs="EPSG:4674")

    saida = _overlay_ogr(a, b, "identity", prefixo_1="a__", prefixo_2="b__")

    tipos = set(saida.geometry.geom_type)
    assert not (tipos & {"LineString", "MultiLineString", "Point", "MultiPoint"}), tipos
    assert "GeometryCollection" not in tipos, tipos


def test_encadeamento_sucessivo_preserva_o_tipo_poligonal():
    """Três rodadas seguidas — o padrão do consolidador da Fase 1."""
    acumulador = gpd.GeoDataFrame(
        {"uf": ["SP"], "geometry": [box(0, 0, 30, 30)]}, crs="EPSG:4674"
    )
    for indice, caixa in enumerate([box(0, 0, 10, 30), box(10, 0, 20, 30), box(20, 0, 30, 30)]):
        tema = gpd.GeoDataFrame(
            {"criterio_id": [f"c{indice}"], "geometry": [caixa]}, crs="EPSG:4674"
        )
        acumulador = _overlay_ogr(
            acumulador, tema, "identity", prefixo_1=None, prefixo_2=f"t{indice}__"
        )
        tipos = set(acumulador.geometry.geom_type)
        assert tipos <= {"Polygon", "MultiPolygon"}, f"rodada {indice}: {tipos}"

    assert acumulador.geometry.area.sum() == pytest.approx(900.0)


def test_saida_nunca_traz_geometrycollection_no_encadeamento_real(base, tematica):
    """O caso que derrubou a consolidação: coleção sobrevivendo à rodada.

    Não basta pedir KEEP_LOWER_DIMENSION_GEOMETRIES=NO — o GDAL só honra a opção
    quando a camada de saída tem tipo desconhecido, e aqui ela é criada com o
    tipo da entrada. A saída tem de ser normalizada para a dimensão da entrada.
    """
    saida = _overlay_ogr(base, tematica, "identity", prefixo_1=None, prefixo_2="t0__")
    assert "GeometryCollection" not in set(saida.geometry.geom_type)
    # Prefixo distinto por rodada, como no consolidador: repetir o mesmo prefixo
    # colide com o campo já criado e o OGR recusa, corretamente.
    for rodada in range(1, 4):
        saida = _overlay_ogr(
            saida, tematica, "identity", prefixo_1=None, prefixo_2=f"t{rodada}__"
        )
        assert set(saida.geometry.geom_type) <= {"Polygon", "MultiPolygon"}


def test_restringir_dimensao_extrai_o_poligono_da_colecao():
    from shapely.geometry import GeometryCollection, LineString, Point, box

    from api.services.geoespacial_service import _restringir_dimensao

    referencia = gpd.GeoDataFrame({"geometry": [box(0, 0, 1, 1)]}, crs="EPSG:4674")
    colecao = GeometryCollection([box(0, 0, 2, 2), LineString([(0, 0), (3, 3)]), Point(9, 9)])
    bruto = gpd.GeoDataFrame({"i": [1, 2], "geometry": [colecao, LineString([(0, 0), (1, 1)])]},
                             crs="EPSG:4674")

    saida = _restringir_dimensao(bruto, referencia)

    assert len(saida) == 1, "a feição puramente linear é descartada"
    assert saida.geometry.iloc[0].geom_type in {"Polygon", "MultiPolygon"}
    assert saida.geometry.iloc[0].area == pytest.approx(4.0)
