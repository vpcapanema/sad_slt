"""Classificação por feição da Fase 1, aplicada na geração das camadas.

Cadeia que precisa dizer a mesma coisa, de ponta a ponta:

    página do arcabouço  ->  geoprocessamento.regra_classificacao_fase1
                         ->  config/geoespacial/classificacao_fase1.json
                         ->  este módulo  ->  camada consolidada

A página ``/restrict/geoespacial/configuracao-risco-restricao/`` é a doutrina:
sete camadas de restrição e treze de risco, categoria da CAMADA oficial e não do
atributo de cada feição. A tabela é a fonte editável e versionada por migração;
o JSON é a cópia de contingência, regerada a partir dela, usada quando o banco
não responde. ``tests/test_arcabouco_fase1.py`` falha se qualquer elo divergir.

Escopo: estas regras valem na IMPORTAÇÃO da camada oficial, enquanto ela ainda
carrega os atributos de origem. Depois da consolidação por Identity esses
atributos se perdem, e a Fase 1 em tempo de execução passa a usar a categoria da
camada (``finalidade``/``conjunto``), não o atributo da feição.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np

from api.db.connection import get_connection
from api.exceptions import DatabaseUnavailableError

RULES_PATH = Path(__file__).resolve().parents[2] / "config" / "geoespacial" / "classificacao_fase1.json"

# (ordem, expressao, tipo_tratamento, severidade, base_legal)
Regra = tuple[int, str, str, int, str]


def carregar_configuracao() -> dict[str, Any]:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def _regras_do_banco(criterio_id: str) -> list[Regra]:
    try:
        with get_connection() as conn:
            linhas = conn.execute(
                """SELECT ordem, expressao, tipo_tratamento_resultante, severidade, base_legal
                   FROM geoprocessamento.regra_classificacao_fase1
                   WHERE ativo AND criterio_id = %s
                   ORDER BY ordem""",
                (criterio_id,),
            ).fetchall()
    except DatabaseUnavailableError:
        return []
    return [
        (
            int(linha["ordem"]),
            linha["expressao"],
            linha["tipo_tratamento_resultante"],
            int(linha["severidade"]),
            linha["base_legal"] or "",
        )
        for linha in linhas
    ]


def carregar_regras(criterio_id: str) -> tuple[list[Regra], str]:
    """Regras do critério e a origem efetivamente usada."""
    regras = _regras_do_banco(criterio_id)
    if regras:
        return regras, "geoprocessamento.regra_classificacao_fase1"

    configuracao = carregar_configuracao()
    do_json = [tuple(regra) for regra in configuracao["regras"].get(criterio_id, [])]
    if not do_json:
        raise ValueError(
            f"Nenhuma regra encontrada para o critério '{criterio_id}'. "
            "Critério fora do arcabouço não deve ser classificado pela Fase 1."
        )
    return do_json, f"classificacao_fase1.json@{configuracao['versao']}"


def classificar(gdf: gpd.GeoDataFrame, criterio_id: str) -> tuple[gpd.GeoDataFrame, str]:
    """Aplica as regras do critério, da menor para a maior ordem.

    A primeira regra que casar decide a feição. Regra cuja expressão não pode ser
    avaliada sobre os atributos presentes é ignorada e registrada em
    ``regras_nao_avaliadas``: a ausência do atributo não pode passar por
    classificação bem-sucedida, e a doutrina é explícita em que "a restrição
    nunca é inferida pela simples ausência de informação na camada".
    """
    regras, origem = carregar_regras(criterio_id)
    resultado = gdf.copy()
    padrao = next((r for r in regras if r[1] == "True"), None)
    tipos = np.array([(padrao[2] if padrao else "risco")] * len(resultado), dtype=object)
    severidades = np.full(len(resultado), int(padrao[3]) if padrao else 2, dtype=int)
    bases = np.array([(padrao[4] if padrao else "")] * len(resultado), dtype=object)
    pendentes = np.ones(len(resultado), dtype=bool)
    nao_avaliadas: list[str] = []

    for _, expressao, tipo, severidade, base_legal in sorted(regras, key=lambda item: item[0]):
        if expressao == "True":
            mascara = np.ones(len(resultado), dtype=bool)
        else:
            try:
                mascara = resultado.index.isin(resultado.query(expressao).index)
            except Exception:
                nao_avaliadas.append(expressao)
                continue
        aplicar = mascara & pendentes
        tipos[aplicar], severidades[aplicar], bases[aplicar] = tipo, int(severidade), base_legal
        pendentes &= ~aplicar

    resultado["tipo_tratamento"] = tipos
    resultado["severidade"] = severidades
    resultado["base_legal"] = bases
    resultado.attrs["origem_regras"] = origem
    resultado.attrs["regras_nao_avaliadas"] = nao_avaliadas
    return resultado, origem
