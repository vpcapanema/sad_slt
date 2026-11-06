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


def _iso(valor) -> str | None:
    if valor is None:
        return None
    return valor.isoformat() if hasattr(valor, "isoformat") else str(valor)


@router.get("/{ambiente_id}/emails/monitoramento")
def monitoramento(ambiente_id: UUID) -> dict:
    from api.services import email_confirmacoes_automaticas

    try:
        ambiente = ambientes.get_ambiente_by_id(str(ambiente_id))
        if not ambiente:
            raise HTTPException(404, "Julgamento não encontrado.")
        respostas = ambientes.list_respostas(str(ambiente_id))
        respondidos = {str(r["email"]).strip().lower() for r in respostas if r.get("status") == "enviada"}
        acessos = {str(r["email"]).strip().lower(): r.get("iniciado_em") for r in respostas if r.get("status") != "enviada"}
        registros = repo.listar(str(ambiente_id))
        cliques: dict[str, object] = {}
        for registro in registros:
            if registro.get("natureza") == "convite" and registro.get("link_acessado_em"):
                email = str(registro["destinatario"]).strip().lower()
                cliques[email] = min(cliques.get(email) or registro["link_acessado_em"], registro["link_acessado_em"])
        return {
            "registros": registros,
            "coleta_automatica": email_confirmacoes_automaticas.estado(),
            "colaboradores": [
                {"nome": c.get("nome") or "", "email": c["email"],
                 "resposta_recebida": str(c["email"]).strip().lower() in respondidos,
                 "acesso_formulario_em": _iso(acessos.get(str(c["email"]).strip().lower())),
                 "clique_link_em": _iso(cliques.get(str(c["email"]).strip().lower()))}
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
