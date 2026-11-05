"""Envio e acompanhamento de convites da Central de julgamentos."""
from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_analyst
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.routers.email import _erro, _nao_armazenar
from api.schemas.email import ConviteEmailEnvioSchema, EmailTesteSchema
from api.services import email_confirmacoes, email_convites, email_resposta_colaborador
from api.services.email_service import FalhaEmail
from api.services.session_service import SessionUser

router = APIRouter(
    prefix="/ahp/comparacao-colaborativa/ambientes", tags=["Email de convites"],
    dependencies=[Depends(require_analyst), Depends(_nao_armazenar)],
)


@router.get("/{ambiente_id}/emails")
def listar(ambiente_id: UUID) -> list[dict]:
    try:
        if not ambientes.get_ambiente_by_id(str(ambiente_id)):
            raise HTTPException(404, "Julgamento não encontrado.")
        return repo.listar(str(ambiente_id))
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/enviar")
def enviar(ambiente_id: UUID, dados: ConviteEmailEnvioSchema,
           user: SessionUser = Depends(require_analyst)) -> dict:
    try:
        return email_convites.enviar(str(ambiente_id), dados, user.id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.get("/{ambiente_id}/emails/monitoramento")
def monitoramento(ambiente_id: UUID) -> dict:
    try:
        ambiente = ambientes.get_ambiente_by_id(str(ambiente_id))
        if not ambiente:
            raise HTTPException(404, "Julgamento não encontrado.")
        respondidos = {str(r["email"]).strip().lower() for r in ambientes.list_respostas(str(ambiente_id))
                       if r.get("status") == "enviada"}
        return {
            "registros": repo.listar(str(ambiente_id)),
            "colaboradores": [
                {"nome": c.get("nome") or "", "email": c["email"],
                 "resposta_recebida": str(c["email"]).strip().lower() in respondidos}
                for c in ambiente["convites"]
            ],
        }
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/resposta/enviar")
def enviar_resposta(ambiente_id: UUID, dados: EmailTesteSchema,
                    user: SessionUser = Depends(require_analyst)) -> dict:
    try:
        return email_resposta_colaborador.enviar(str(ambiente_id), str(dados.destinatario), user.id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/confirmacoes")
def coletar(ambiente_id: UUID, user: SessionUser = Depends(require_analyst)) -> dict:
    try:
        if not ambientes.get_ambiente_by_id(str(ambiente_id)):
            raise HTTPException(404, "Julgamento não encontrado.")
        return email_confirmacoes.coletar(str(ambiente_id), usuario_id=user.id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
