"""Complementacao dinamica dos atributos requeridos pela matriz vigente."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, File, Form, UploadFile
from pydantic import ValidationError

from api.deps.auth import require_operator
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository, sigma_usuario_repository, demanda_repository, plano_repository, programa_repository
from api.services.session_service import SessionUser
from api.services import demanda_service, plano_service, programa_service
from api.services.campos_demanda import resolver_nomes_registros
from api.schemas.demanda import DemandaUpdateSchema
from api.schemas.plano import PlanoUpdateSchema
from api.schemas.programa import ProgramaUpdateSchema
from api.exceptions import DemandaValidationError

router = APIRouter(prefix="/complementacao", tags=["complementacao"])
STATUS_COMPLEMENTACAO = "analise_aguardando_complementacao"
CADASTROS = {
    "projeto": (demanda_repository, demanda_service, DemandaUpdateSchema, demanda_service.atualizar_demanda),
    "plano": (plano_repository, plano_service, PlanoUpdateSchema, plano_service.atualizar_plano),
    "programa": (programa_repository, programa_service, ProgramaUpdateSchema, programa_service.atualizar_programa),
}


def _visivel(demanda: dict, user: SessionUser, pessoa_id: str | None) -> bool:
    if demanda.get("status") != STATUS_COMPLEMENTACAO:
        return False
    return user.tipo_usuario.strip().upper() in {"ANALISTA", "GESTOR", "ADMIN"} or _pode_editar(
        {}, pessoa_id=pessoa_id, usuario_id=str(user.id), demanda=demanda
    )


def _demanda_autorizada(tipo: str, codigo: str, user: SessionUser) -> dict:
    if tipo not in CADASTROS:
        raise HTTPException(422, "Tipo de demanda inválido.")
    demanda = CADASTROS[tipo][0].get_by_codigo(codigo)
    if not demanda or not _visivel(demanda, user, _pessoa_id(user)):
        raise HTTPException(403, "Demanda indisponível para complementação por este usuário.")
    return demanda


def _pessoa_id(user: SessionUser) -> str | None:
    row = sigma_usuario_repository.find_active_by_id(user.id)
    return str(row["pessoa_id"]) if row and row.get("pessoa_id") else None


def _pode_editar(
    cabecalho: dict[str, Any],
    *,
    pessoa_id: str | None,
    usuario_id: str | None = None,
    demanda: dict[str, Any] | None = None,
) -> bool:
    if demanda is not None:
        return bool(
            (usuario_id and str(demanda.get("criado_por") or "") == usuario_id)
            or (pessoa_id and str(demanda.get("sigma_pessoa_id") or "") == pessoa_id)
        )
    atributos = cabecalho.get("atributos") or {}
    representante = atributos.get("representante") or {}
    responsaveis = [atributos.get("sigma_pessoa_id"), atributos.get("pessoa_id"), representante.get("pessoa_id")]
    return bool((usuario_id and str(atributos.get("criado_por") or "") == usuario_id)
                or (pessoa_id and any(str(p or "") == pessoa_id for p in responsaveis)))


def _cadastros() -> dict[str, dict[str, Any]]:
    return {str(d["codigo"]): d for repo in (plano_repository, programa_repository, demanda_repository)
            for d in repo.list_all()}


def _acesso(cab: dict[str, Any], user: SessionUser, pessoa_id: str | None,
            cadastros: dict[str, dict[str, Any]]) -> bool:
    # Não utiliza a cópia histórica do agrupamento como fonte de autorização.
    demanda = cadastros.get(str(cab.get("codigo")))
    return bool(demanda and _visivel(demanda, user, pessoa_id))


def _pode_listar(item: dict[str, Any], user: SessionUser) -> bool:
    return item["pode_editar"]


def _matriz(row: dict[str, Any]) -> Any:
    dados = row.get("dados_hierarquizacao") or {}
    matriz = (dados.get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")
    return matriz if extrair_colunas(matriz) else row.get("config_criterios") or matriz


def _item(row: dict[str, Any], obj: dict[str, Any], *, pode_editar: bool) -> dict[str, Any]:
    cab = obj.get("cabecalho_objeto") or {}
    colunas = extrair_colunas(_matriz(row))
    slots = cab.get("atributos_fase3") or {}
    preenchidos = sum(
        1 for col in colunas
        if (slots.get(col["id"]) or {}).get("valor_bruto", (slots.get(col["id"]) or {}).get("valor")) not in (None, "")
    )
    pendentes = sum(1 for col in colunas
                    if (slots.get(col["id"]) or {}).get("origem") != "cadastro"
                    and (slots.get(col["id"]) or {}).get("valor_bruto", (slots.get(col["id"]) or {}).get("valor")) in (None, ""))
    return {
        "hierarquizacao_codigo": row["codigo"],
        "hierarquizacao_nome": row.get("nome"),
        "objeto_codigo": cab.get("codigo"),
        "objeto_nome": cab.get("nome"),
        "tipo_demanda": cab.get("tipo_demanda"),
        "total_atributos": len(colunas),
        "atributos_preenchidos": preenchidos,
        "pode_editar": pode_editar,
        "situacao_complementacao": "em_complementacao" if pendentes else "complementada",
        "colunas": colunas,
        "valores": slots,
    }


@router.get("/demandas/{tipo}")
def listar_demandas_complementaveis(tipo: str, user: SessionUser = Depends(require_operator)):
    if tipo not in CADASTROS:
        raise HTTPException(422, "Tipo de demanda inválido.")
    repo, service, _, _ = CADASTROS[tipo]
    pessoa_id = _pessoa_id(user)
    rows = [row for row in repo.list_all() if _visivel(row, user, pessoa_id)]
    rows = resolver_nomes_registros(rows)
    return [service._row_to_response(row, incluir_auditoria=True, nomes_resolvidos=True) for row in rows]


@router.get("/demandas/{tipo}/{codigo}")
def obter_demanda_complementavel(tipo: str, codigo: str, user: SessionUser = Depends(require_operator)):
    row = _demanda_autorizada(tipo, codigo, user)
    return CADASTROS[tipo][1]._row_to_response(row, incluir_auditoria=True)


@router.patch("/demandas/{tipo}/{codigo}/cadastro")
def salvar_cadastro(tipo: str, codigo: str, body: dict = Body(...), user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user)
    _, _, schema, atualizar = CADASTROS[tipo]
    permitidos = set(schema.model_fields) - {"status"}
    if set(body) - permitidos:
        raise HTTPException(422, "Campo não permitido na complementação cadastral.")
    try:
        return atualizar(codigo, schema.model_validate(body), usuario_id=user.id)
    except (ValidationError, DemandaValidationError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post("/demandas/{tipo}/{codigo}/geometria/conferir")
async def conferir_geometria_complementacao(tipo: str, codigo: str, file: UploadFile = File(...),
                                           user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user)
    from api.routers.geometria import conferir_geometria
    return await conferir_geometria(tipo, codigo, file, user)


@router.post("/demandas/{tipo}/{codigo}/geometria/substituir")
async def substituir_geometria_complementacao(tipo: str, codigo: str, confirmacao: str = Form(...),
                                             file: UploadFile = File(...), user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user)
    from api.routers.geometria import substituir_geometria
    return await substituir_geometria(tipo, codigo, confirmacao, file, user)


@router.get("/objetos")
def listar_objetos(user: SessionUser = Depends(require_operator)) -> list[dict[str, Any]]:
    itens: list[dict[str, Any]] = []
    pessoa_id = _pessoa_id(user)
    cadastros = _cadastros()
    for row in hierarquizacao_repository.list_all():
        if not extrair_colunas(_matriz(row)):
            continue
        for obj in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
            cab = obj.get("cabecalho_objeto") or {}
            if cab.get("codigo"):
                item = _item(row, obj, pode_editar=_acesso(cab, user, pessoa_id, cadastros))
                if _pode_listar(item, user):
                    itens.append(item)
    return itens


@router.get("/{hierarquizacao_codigo}/{objeto_codigo}")
def obter_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                               user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
    if not row:
        raise HTTPException(404, "Hierarquizacao nao encontrada.")
    pessoa_id = _pessoa_id(user)
    cadastros = _cadastros()
    for obj in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        if cab.get("codigo") == objeto_codigo:
            item = _item(row, obj, pode_editar=_acesso(cab, user, pessoa_id, cadastros))
            if not _pode_listar(item, user):
                raise HTTPException(403, "Você não tem acesso a esta complementação.")
            return item
    raise HTTPException(404, "Objeto nao encontrado nesta hierarquizacao.")


@router.patch("/{hierarquizacao_codigo}/{objeto_codigo}")
def salvar_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                                valores: dict[str, Any] = Body(..., embed=True),
                                user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
    if not row:
        raise HTTPException(404, "Hierarquizacao nao encontrada.")
    pessoa_id = _pessoa_id(user)
    cadastros = _cadastros()
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    colunas = {c["id"]: c for c in extrair_colunas(_matriz(row))}
    for obj in dados.get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        if cab.get("codigo") != objeto_codigo:
            continue
        if not _acesso(cab, user, pessoa_id, cadastros):
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
