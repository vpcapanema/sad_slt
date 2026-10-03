"""Rotas HTTP — demandas."""
from __future__ import annotations

import hashlib
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from shapely import normalize
from shapely.geometry import shape

from api.deps.auth import require_analyst, require_authenticated, require_gestor, require_operator
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.geometria_parser import MAX_GEOMETRIA_UPLOAD_BYTES, parse_upload
from api.schemas.demanda import DemandaCreateSchema, DemandaResponseSchema, DemandaUpdateSchema
from api.schemas.objeto_ahp import AprovarDemandaSchema, ObjetoAhpResponseSchema, ReprovarDemandaSchema
from api.services import demanda_service, objeto_ahp_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/demandas", tags=["demandas"])


@router.post("", response_model=DemandaResponseSchema, status_code=201)
def criar_demanda(
    body: DemandaCreateSchema,
    user: SessionUser = Depends(require_operator),
) -> DemandaResponseSchema:
    """Cria uma nova demanda de projeto."""
    try:
        return demanda_service.criar_demanda(body, usuario_id=user.id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/com-arquivo-geometria", response_model=DemandaResponseSchema, status_code=201)
async def criar_demanda_com_arquivo_geometria(
    payload: str = Form(...),
    arquivo_geometria: UploadFile = File(...),
    user: SessionUser = Depends(require_operator),
) -> DemandaResponseSchema:
    """Cria um projeto e preserva seu arquivo vetorial original na mesma transação."""
    try:
        body = DemandaCreateSchema.model_validate_json(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    if body.geometria is None:
        raise HTTPException(status_code=422, detail="O arquivo exige uma geometria no cadastro.")

    conteudo = await arquivo_geometria.read(MAX_GEOMETRIA_UPLOAD_BYTES + 1)
    if len(conteudo) > MAX_GEOMETRIA_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo maior que 50 MB.")

    nome_arquivo = PurePosixPath((arquivo_geometria.filename or "").replace("\\", "/")).name
    extensao = PurePosixPath(nome_arquivo).suffix.lower().lstrip(".")
    try:
        parsed = parse_upload(nome_arquivo, conteudo)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {exc}") from exc

    submitted_geometry = {
        "type": body.geometria.tipo,
        "coordinates": body.geometria.coordinates,
    }
    uploaded_geometry = parsed["geojson"]["geometry"]
    if not normalize(shape(submitted_geometry)).equals_exact(
        normalize(shape(uploaded_geometry)), tolerance=1e-8
    ):
        raise HTTPException(
            status_code=422,
            detail="A geometria do cadastro não corresponde ao arquivo vetorial enviado.",
        )

    arquivo = {
        "nome_arquivo": nome_arquivo,
        "extensao": extensao,
        "tipo_mime": arquivo_geometria.content_type or "application/octet-stream",
        "geometria_tipo": parsed["tipo"],
        "tamanho_bytes": len(conteudo),
        "sha256": hashlib.sha256(conteudo).hexdigest(),
        "conteudo_binario": conteudo,
    }
    try:
        return demanda_service.criar_demanda(
            body, usuario_id=user.id, arquivo_geometria=arquivo
        )
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[DemandaResponseSchema])
def listar_demandas() -> list[DemandaResponseSchema]:
    """Lista somente demandas cuja publicação foi autorizada pelo status."""
    try:
        return [item for item in demanda_service.listar_demandas() if item.status == "hierarq_ranqueada"]
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/internas", response_model=list[DemandaResponseSchema])
def listar_demandas_internas(
    _user: SessionUser = Depends(require_authenticated),
) -> list[DemandaResponseSchema]:
    return demanda_service.listar_demandas(incluir_auditoria=True)


@router.get("/internas/{codigo}", response_model=DemandaResponseSchema)
def obter_demanda_interna(
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> DemandaResponseSchema:
    return demanda_service.obter_demanda(codigo, incluir_auditoria=True)


@router.get("/{codigo}", response_model=DemandaResponseSchema)
def obter_demanda(codigo: str) -> DemandaResponseSchema:
    """Obtém os detalhes de uma demanda pelo código."""
    try:
        item = demanda_service.obter_demanda(codigo)
        if item.status != "hierarq_ranqueada":
            raise DemandaNotFoundError(codigo)
        return item
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/aprovar", response_model=ObjetoAhpResponseSchema, status_code=201)
def aprovar_demanda(
    codigo: str,
    body: AprovarDemandaSchema | None = None,
    user: SessionUser = Depends(require_analyst),
) -> ObjetoAhpResponseSchema:
    """Aprova demanda e insere objeto em ahp.objeto_ahp (única fonte do módulo AHP)."""
    motivo = body.motivo if body else None
    aprovado_por = user.id
    try:
        return objeto_ahp_service.aprovar_demanda(
            codigo,
            motivo=motivo,
            aprovado_por=aprovado_por,
        )
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/reprovar", response_model=DemandaResponseSchema)
def reprovar_demanda(
    codigo: str,
    body: ReprovarDemandaSchema,
    user: SessionUser = Depends(require_analyst),
) -> DemandaResponseSchema:
    """Reprova uma demanda em análise mediante justificativa obrigatória."""
    try:
        return demanda_service.reprovar_demanda(
            codigo,
            justificativa=body.justificativa,
            reprovado_por=user.id,
        )
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=DemandaResponseSchema)
def atualizar_demanda(
    codigo: str,
    body: DemandaUpdateSchema,
    user: SessionUser = Depends(require_operator),
) -> DemandaResponseSchema:
    """Atualiza uma demanda existente."""
    try:
        return demanda_service.atualizar_demanda(codigo, body, usuario_id=user.id)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/{codigo}", status_code=204)
def excluir_demanda(
    codigo: str,
    _user: SessionUser = Depends(require_gestor),
) -> None:
    """Exclui um projeto (demanda nível 3)."""
    try:
        demanda_service.excluir_demanda(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
