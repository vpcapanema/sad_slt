"""Duas causas reais de lentidão na Bancada, achadas medindo em vez de supor.

1. `/camadas/{id}/geojson` remontava o GeoJSON inteiro no PostGIS remoto a
   cada carregamento de camada, sem cache — para a grade de favorabilidade
   (103.620 feições) isso é o payload inteiro computado e transportado pela
   rede toda vez. Passa a preferir o arquivo do acervo, como o geoprocessamento
   já fazia, com a reprojeção obrigatória para EPSG:4326 (o PostGIS sempre
   grava nesse CRS; o arquivo fica no CRS original, em geral EPSG:4674).

2. Arrastar um seletor de cor no editor de simbologia dispara "input" dezenas
   de vezes por segundo, e cada tique reconstruía o HTML inteiro do painel de
   camadas e reescaneava os ícones — por isso "as alterações de simbologia"
   pareciam travar. O repaint do mapa continua imediato; só a reconstrução do
   painel foi adiada (debounce).
"""
from __future__ import annotations

import inspect
from pathlib import Path

JS = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")


def test_geojson_da_camada_le_do_acervo_primeiro():
    import api.services.geoespacial_service as modulo

    fonte = inspect.getsource(modulo.GeoespacialService.camada_geojson)
    assert "self.obter_camada_dados(camada_id)" in fonte
    assert "carregar_vetor_geojson" not in fonte, (
        "voltou a montar o GeoJSON no PostGIS a cada carregamento"
    )


def test_geojson_da_camada_reprojeta_para_4326():
    """Sem isto a camada aparece na posição errada: o PostGIS sempre grava em
    4326, mas o arquivo do acervo fica no CRS original (em geral 4674)."""
    import api.services.geoespacial_service as modulo

    fonte = inspect.getsource(modulo.GeoespacialService.camada_geojson)
    assert 'to_crs("EPSG:4326")' in fonte
    assert 'set_crs("EPSG:4326")' in fonte


def test_geojson_da_camada_trata_colunas_de_data():
    """`gdf.to_json()` puro derruba em Timestamp do pandas; o PostGIS não
    sofria disso porque a coluna já chegava como JSONB pronto."""
    import api.services.geoespacial_service as modulo

    fonte = inspect.getsource(modulo.GeoespacialService.camada_geojson)
    assert "default=str" in fonte


def test_debounce_existe_e_e_usado_no_preview_de_simbologia():
    assert "function debounce(fn,atraso)" in JS
    assert "const renderLayersDebounced=debounce(renderLayers,120)" in JS


def test_arrastar_cor_nao_reconstroi_o_painel_a_cada_tique():
    corpo_preview = JS.split("function previewSymbology(layerId){", 1)[1].split("}", 1)[0]
    assert "renderLayersDebounced()" in corpo_preview
    assert "renderLayers()" not in corpo_preview, (
        "voltou a reconstruir o painel inteiro em todo tique do color picker"
    )


def test_digitar_rotulo_nao_reconstroi_o_painel_a_cada_tecla():
    trecho = JS.split('$$("[data-sym-rotulo]"', 1)[1].split("});", 1)[0]
    assert "renderLayersDebounced()" in trecho
