"""Fonte versionada e avaliação das regras de classificação da Fase 1."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np

RULES_PATH = Path(__file__).resolve().parents[2] / "data" / "geoespacial" / "classificacao_fase1.json"


def carregar_configuracao() -> dict[str, Any]:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def classificar(gdf: gpd.GeoDataFrame, criterio_id: str) -> tuple[gpd.GeoDataFrame, str]:
    configuracao = carregar_configuracao()
    regras = configuracao["regras"].get(criterio_id, [])
    if not regras:
        raise ValueError(f"Nenhuma regra JSON encontrada para critério '{criterio_id}'.")
    resultado = gdf.copy()
    tipos = np.array(["risco"] * len(resultado), dtype=object)
    severidades = np.full(len(resultado), 2, dtype=int)
    bases = np.array([""] * len(resultado), dtype=object)
    pendentes = np.ones(len(resultado), dtype=bool)
    for _, expressao, tipo, severidade, base_legal in sorted(regras, key=lambda item: item[0]):
        if expressao == "True":
            mascara = np.ones(len(resultado), dtype=bool)
        else:
            try:
                mascara = resultado.index.isin(resultado.query(expressao).index)
            except Exception:
                continue
        aplicar = mascara & pendentes
        tipos[aplicar], severidades[aplicar], bases[aplicar] = tipo, int(severidade), base_legal
        pendentes &= ~aplicar
    resultado["tipo_tratamento"] = tipos
    resultado["severidade"] = severidades
    resultado["base_legal"] = bases
    return resultado, configuracao["versao"]
