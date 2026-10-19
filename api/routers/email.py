"""Endpoints administrativos de email; não expõem credenciais SMTP."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response

from api.deps.auth import require_admin
from api.schemas.email import (
    EmailConexaoResultado, EmailDiagnostico, EmailEnvioResultado, EmailEnvioSchema, EmailTesteSchema,
)
from api.services import email_service
from api.services.session_service import SessionUser


def _nao_armazenar(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(
    prefix="/email", tags=["Email"],
    dependencies=[Depends(require_admin), Depends(_nao_armazenar)],
)


def _erro(exc: email_service.FalhaEmail) -> HTTPException:
    status = {
        "configuracao": 503, "conexao": 503, "resultado_indeterminado": 504,
    }.get(exc.codigo, 502)
    return HTTPException(
        status_code=status, detail=str(exc),
        headers={"Cache-Control": "no-store", "X-SICARD-Email-Error": exc.codigo},
    )


@router.get("/diagnostico", response_model=EmailDiagnostico)
def diagnostico() -> EmailDiagnostico:
    try:
        return email_service.diagnostico()
    except email_service.FalhaEmail as exc:
        raise _erro(exc) from exc


@router.post("/teste-conexao", response_model=EmailConexaoResultado)
def testar_conexao(user: SessionUser = Depends(require_admin)) -> EmailConexaoResultado:
    try:
        return email_service.testar_conexao(usuario_id=user.id)
    except email_service.FalhaEmail as exc:
        raise _erro(exc) from exc


@router.post("/enviar", response_model=EmailEnvioResultado)
def enviar(dados: EmailEnvioSchema, user: SessionUser = Depends(require_admin)) -> EmailEnvioResultado:
    try:
        return email_service.enviar(dados, usuario_id=user.id)
    except email_service.FalhaEmail as exc:
        raise _erro(exc) from exc


@router.post("/teste", response_model=EmailEnvioResultado)
def enviar_teste(dados: EmailTesteSchema, user: SessionUser = Depends(require_admin)) -> EmailEnvioResultado:
    mensagem = EmailEnvioSchema(
        destinatario=dados.destinatario, assunto="Teste de email - SICARD",
        texto=(
            "Este é um teste de envio pelo SICARD, usando a conta SMTP compartilhada com o SIGMA. "
            "Se recebeu esta mensagem, a entrega a este endereço foi confirmada. Não é necessário responder."
        ),
    )
    return enviar(mensagem, user)
