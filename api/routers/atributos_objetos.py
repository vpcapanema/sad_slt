"""Rotas HTTP — Atributos dos Objetos de Demanda (Fase 3).

As colunas de Etapa 3 (Priorização) vêm de duas fontes, nesta ordem:

1. a matriz de critérios e premissas da hierarquização, pela lógica compartilhada
   em :mod:`api.matriz_colunas`;
2. ``geoprocessamento.atributo_fase3``, alimentada pelo Configurador da Fase 3.

Antes só a primeira era consultada, e os atributos cadastrados no configurador
não chegavam à página da Fase 3.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from api.deps.auth import require_authenticated
from api.exceptions import DatabaseUnavailableError
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository
from api.repositories.geoespacial_repository import geoespacial_repository

router = APIRouter(prefix="/ahp/atributos-objetos", tags=["ahp-atributos-objetos"])


def _matriz_da_hierarquizacao(row: dict[str, Any]) -> Any:
    # `config_criterios` não é coluna de hierarquizacao_portfolio; o fallback
    # anterior a essa chave resolvia sempre em None.
    dados = row.get("dados_hierarquizacao") or {}
    cabecalho = dados.get("cabecalho_grupo") or {}
    return cabecalho.get("matriz_premissas_criterios")


async def _colunas_configuradas() -> list[dict[str, Any]]:
    """Atributos da Fase 3 cadastrados no Configurador, normalizados como coluna."""
    try:
        atributos = await geoespacial_repository.listar_atributos_fase3()
    except DatabaseUnavailableError:
        return []
    colunas: list[dict[str, Any]] = []
    for atributo in atributos:
        identificador = atributo.get("nome_coluna") or atributo.get("atributo_id")
        if not identificador:
            continue
        colunas.append({
            **atributo,
            "id": identificador,
            "alias": atributo.get("rotulo") or atributo.get("alias") or identificador,
            "origem": "configurador_fase3",
        })
    return colunas


def _mesclar(da_matriz: list[dict[str, Any]], do_configurador: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Une as duas fontes sem duplicar coluna: a matriz da rodada tem prioridade."""
    resultado = [{**coluna, "origem": "matriz_premissas_criterios"} for coluna in da_matriz]
    vistos = {str(coluna.get("id")) for coluna in resultado}
    for coluna in do_configurador:
        if str(coluna.get("id")) not in vistos:
            resultado.append(coluna)
            vistos.add(str(coluna.get("id")))
    return resultado


@router.get("/hierarquizacoes/{codigo}/colunas")
async def colunas_por_hierarquizacao(
    codigo: str,
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas do complemento derivadas da matriz já armazenada na hierarquização."""
    row = hierarquizacao_repository.get_by_codigo(codigo)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Hierarquização não encontrada: {codigo}")
    da_matriz = extrair_colunas(_matriz_da_hierarquizacao(row))
    colunas = _mesclar(da_matriz, await _colunas_configuradas())
    return {
        "codigo": codigo,
        "total": len(colunas),
        "colunas": colunas,
        "por_origem": {
            "matriz_premissas_criterios": len(da_matriz),
            "configurador_fase3": len(colunas) - len(da_matriz),
        },
    }


@router.post("/colunas/preview")
async def colunas_preview(
    matriz: Any = Body(..., embed=True),
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas derivadas de uma matriz enviada no corpo (pré-visualização no cadastro)."""
    colunas = extrair_colunas(matriz)
    return {"total": len(colunas), "colunas": colunas}
