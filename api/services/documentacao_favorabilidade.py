"""Reúne, para a página de documentação, como as camadas de favorabilidade nasceram.

Tudo vem dos artefatos que o próprio processo gerou — a matriz de critérios, o
registro de normalização e os manifestos de exportação dos mapas. Nada é
transcrito à mão: a página acompanha o dado, em vez de envelhecer ao lado dele.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from api.path_policy import project_path

MATRIZ = "config/matriz-criterios-premissas-v3.json"
NORMALIZACAO = "data/geoespacial/outputs/normalizacao_favorabilidade_fase2.json"
MAPAS_BRUTOS = "data/geoespacial/relatorios/mapas_fase2"
MAPAS_NORMALIZADOS = "data/geoespacial/relatorios/mapas_fase2_normalizados"


def _ler_json(relativo: str) -> Any:
    caminho = project_path(relativo)
    if not caminho.is_file():
        return None
    return json.loads(caminho.read_text(encoding="utf-8"))


def _url_mapa(pasta: str, arquivo: str) -> str:
    return f"/{pasta}/{arquivo}"


def _manifesto(pasta: str) -> dict[str, Any]:
    dados = _ler_json(f"{pasta}/manifesto.json") or {}
    for imagem in dados.get("imagens", []):
        imagem["url"] = _url_mapa(pasta, imagem["arquivo"])
    return dados


def montar_contexto() -> dict[str, Any]:
    matriz = _ler_json(MATRIZ) or []
    normalizacao = _ler_json(NORMALIZACAO) or {}
    brutos = _manifesto(MAPAS_BRUTOS)
    normalizados = _manifesto(MAPAS_NORMALIZADOS)

    # A matriz usa o nome do critério como chave natural; é por ele que a
    # premissa se liga ao campo calculado.
    por_criterio = {str(item.get("Critério", "")).strip(): item for item in matriz}

    def montar_grupo(grupo: str) -> list[dict[str, Any]]:
        saida = []
        for criterio in (normalizacao.get("criterios_matriz_v3", {}).get(grupo) or []):
            nome = str(criterio.get("criterio", "")).strip()
            ficha = por_criterio.get(nome, {})
            mapa = next(
                (i for i in normalizados.get("imagens", [])
                 if i.get("atributo") == criterio.get("campo")), None)
            saida.append({
                **criterio,
                "dimensao": ficha.get("Dimensão"),
                "premissa": ficha.get("Premissa"),
                "dado": ficha.get("Dado"),
                "metrica": ficha.get("Métrica (o que é medido)"),
                "unidade": ficha.get("Unidade de medida"),
                "operador": ficha.get("Operador"),
                "relacao": ficha.get("Relação"),
                "fonte": ficha.get("Fonte"),
                "mapa": mapa,
            })
        return saida

    superficies = [
        i for i in normalizados.get("imagens", [])
        if "favorabilidade_media_simples" in str(i.get("arquivo", ""))
    ]

    return {
        "matriz_total": len(matriz),
        "normalizacao": normalizacao,
        "criterios_grade": montar_grupo("grade"),
        "criterios_rede": montar_grupo("rede"),
        "variaveis_brutas": brutos.get("imagens", []),
        "manifesto_brutos": brutos,
        "manifesto_normalizados": normalizados,
        "superficies": superficies,
        "grade": normalizacao.get("grade", {}),
        "rede": normalizacao.get("rede", {}),
    }
