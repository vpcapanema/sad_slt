"""Rotas HTTP — Atributos dos Objetos de Demanda (Fase 3).

As colunas de Etapa 3 (Priorização) são derivadas da matriz de critérios e
premissas pela lógica compartilhada em :mod:`api.matriz_colunas`.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from api.deps.auth import require_authenticated
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository

router = APIRouter(prefix="/ahp/atributos-objetos", tags=["ahp-atributos-objetos"])


def _matriz_da_hierarquizacao(row: dict[str, Any]) -> Any:
    dados = row.get("dados_hierarquizacao") or {}
    cabecalho = dados.get("cabecalho_grupo") or {}
    matriz = cabecalho.get("matriz_premissas_criterios")
    return matriz if extrair_colunas(matriz) else row.get("config_criterios") or matriz


@router.get("/hierarquizacoes/{codigo}/colunas")
async def colunas_por_hierarquizacao(
    codigo: str,
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas do complemento derivadas da matriz já armazenada na hierarquização."""
    row = hierarquizacao_repository.get_by_codigo(codigo)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Hierarquização não encontrada: {codigo}")
    colunas = extrair_colunas(_matriz_da_hierarquizacao(row))
    return {"codigo": codigo, "total": len(colunas), "colunas": colunas}


@router.post("/colunas/preview")
async def colunas_preview(
    matriz: Any = Body(..., embed=True),
    _user=Depends(require_authenticated),
) -> dict[str, Any]:
    """Colunas derivadas de uma matriz enviada no corpo (pré-visualização no cadastro)."""
    colunas = extrair_colunas(matriz)
    return {"total": len(colunas), "colunas": colunas}
