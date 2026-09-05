"""Prévia da inspeção com camada que tem coluna de data.

A camada de risco consolidada traz dois campos de data (`uc_us__dt_sync`,
`tombado_iphan__dt_cadastr`). O `to_json()` do GeoDataFrame os entrega como
Timestamp do pandas, que o codificador JSON padrão não serializa — a prévia
respondia 500 e a tela de upload ficava sem pré-visualização, sem dizer por quê.
"""
from __future__ import annotations

import inspect
import json
import warnings

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Polygon

warnings.filterwarnings("ignore")

from api.services import importar_camadas_service as servico


def _quadro_com_data() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {
            "nome": ["a", "b"],
            "dt_sync": pd.to_datetime(["2026-01-15", "2026-02-20"]),
        },
        geometry=[
            Polygon([(-46.6, -23.5), (-46.5, -23.5), (-46.5, -23.4), (-46.6, -23.4)]),
            Polygon([(-46.4, -23.3), (-46.3, -23.3), (-46.3, -23.2), (-46.4, -23.2)]),
        ],
        crs="EPSG:4674",
    )


def test_geodataframe_com_data_nao_serializa_sem_o_default():
    """Guarda a causa: sem `default=str` o próprio pandas derruba a serialização."""
    with pytest.raises(TypeError, match="Timestamp"):
        _quadro_com_data().to_json()


def test_previa_serializa_data_como_texto():
    dados = json.loads(_quadro_com_data().to_json(default=str))
    assert len(dados["features"]) == 2
    assert dados["features"][0]["properties"]["dt_sync"].startswith("2026-01-15")


def test_previa_da_inspecao_usa_o_default():
    fonte = inspect.getsource(servico.previa_da_inspecao)
    assert "to_json(default=str)" in fonte
