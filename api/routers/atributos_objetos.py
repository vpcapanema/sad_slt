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
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository
from api.services.atributos_hierarquizacao import colunas_da_hierarquizacao

router = APIRouter(prefix="/ahp/atributos-objetos", tags=["ahp-atributos-objetos"])


@router.get("/hierarquizacoes/{codigo}/colunas")
def colunas_por_hierarquizacao(
    codigo: str,
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas compartilhadas pela tabela da Fase 3 e pela complementação."""
    row = hierarquizacao_repository.get_by_codigo(codigo)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Hierarquização não encontrada: {codigo}")
    colunas = colunas_da_hierarquizacao(row)
    total_matriz = sum(coluna["origem"] == "matriz_premissas_criterios" for coluna in colunas)
    return {
        "codigo": codigo,
        "total": len(colunas),
        "colunas": colunas,
        "por_origem": {
            "matriz_premissas_criterios": total_matriz,
            "configurador_fase3": len(colunas) - total_matriz,
        },
    }


@router.post("/colunas/preview")
def colunas_preview(
    matriz: Any = Body(..., embed=True),
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas derivadas de uma matriz enviada no corpo (pré-visualização no cadastro)."""
    colunas = extrair_colunas(matriz)
    return {"total": len(colunas), "colunas": colunas}
