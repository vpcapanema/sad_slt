"""Complementacao dinamica dos atributos requeridos pela matriz vigente."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from api.deps.auth import require_operator
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository, sigma_usuario_repository
from api.services.session_service import SessionUser

router = APIRouter(prefix="/complementacao", tags=["complementacao"])


def _pessoa_id(user: SessionUser) -> str | None:
    row = sigma_usuario_repository.find_active_by_id(user.id)
    return str(row["pessoa_id"]) if row and row.get("pessoa_id") else None


def _pode_editar(
    cabecalho: dict[str, Any],
    *,
    pessoa_id: str | None,
) -> bool:
    atributos = cabecalho.get("atributos") or {}
    representante = atributos.get("representante") or {}
    responsavel = atributos.get("pessoa_id") or representante.get("pessoa_id")
    return bool(pessoa_id and responsavel and str(pessoa_id) == str(responsavel))


def _matriz(row: dict[str, Any]) -> Any:
    dados = row.get("dados_hierarquizacao") or {}
    return (dados.get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")


def _item(row: dict[str, Any], obj: dict[str, Any], *, pode_editar: bool) -> dict[str, Any]:
    cab = obj.get("cabecalho_objeto") or {}
    colunas = extrair_colunas(_matriz(row))
    slots = cab.get("atributos_fase3") or {}
    preenchidos = sum(
        1 for col in colunas
        if (slots.get(col["id"]) or {}).get("valor_bruto", (slots.get(col["id"]) or {}).get("valor")) not in (None, "")
    )
    return {
        "hierarquizacao_codigo": row["codigo"],
        "hierarquizacao_nome": row.get("nome"),
        "objeto_codigo": cab.get("codigo"),
        "objeto_nome": cab.get("nome"),
        "tipo_demanda": cab.get("tipo_demanda"),
        "total_atributos": len(colunas),
        "atributos_preenchidos": preenchidos,
        "pode_editar": pode_editar,
        "colunas": colunas,
        "valores": slots,
    }


@router.get("/objetos")
async def listar_objetos(user: SessionUser = Depends(require_operator)) -> list[dict[str, Any]]:
    itens: list[dict[str, Any]] = []
    pessoa_id = _pessoa_id(user)
    for row in hierarquizacao_repository.list_all():
        if not extrair_colunas(_matriz(row)):
            continue
        for obj in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
            cab = obj.get("cabecalho_objeto") or {}
            if cab.get("codigo"):
                itens.append(_item(row, obj, pode_editar=_pode_editar(cab, pessoa_id=pessoa_id)))
    return itens


@router.get("/{hierarquizacao_codigo}/{objeto_codigo}")
async def obter_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                               user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
    if not row:
        raise HTTPException(404, "Hierarquizacao nao encontrada.")
    pessoa_id = _pessoa_id(user)
    for obj in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        if cab.get("codigo") == objeto_codigo:
            return _item(row, obj, pode_editar=_pode_editar(cab, pessoa_id=pessoa_id))
    raise HTTPException(404, "Objeto nao encontrado nesta hierarquizacao.")


@router.patch("/{hierarquizacao_codigo}/{objeto_codigo}")
async def salvar_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                                valores: dict[str, Any] = Body(..., embed=True),
                                user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
    if not row:
        raise HTTPException(404, "Hierarquizacao nao encontrada.")
    pessoa_id = _pessoa_id(user)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    colunas = {c["id"]: c for c in extrair_colunas(_matriz(row))}
    for obj in dados.get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        if cab.get("codigo") != objeto_codigo:
            continue
        if not _pode_editar(cab, pessoa_id=pessoa_id):
            raise HTTPException(403, "Este objeto nao pertence ao usuario conectado.")
        slots = cab.setdefault("atributos_fase3", {})
        for codigo, valor in valores.items():
            if codigo not in colunas:
                raise HTTPException(422, f"Atributo nao pertence a matriz vigente: {codigo}")
            slot = slots.setdefault(codigo, {
                "origem": "complementacao",
                "valor_bruto": None,
                "valor_rescalonado": None,
                "peso": None,
            })
            if slot.get("origem") == "cadastro":
                continue
            slot.update({
                "valor_bruto": valor,
                "valor": valor,
                "valor_rescalonado": None,
                "origem": "complementacao",
                "preenchido_por": user.id,
            })
        hierarquizacao_repository.update(hierarquizacao_codigo, {"dados_hierarquizacao": dados})
        return _item(
            {**row, "dados_hierarquizacao": dados},
            obj,
            pode_editar=True,
        )
    raise HTTPException(404, "Objeto nao encontrado nesta hierarquizacao.")
