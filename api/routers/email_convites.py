"""Envio e acompanhamento de convites da Central de julgamentos."""
from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_analyst
from api.config import get_email_settings
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.routers.email import _erro, _nao_armazenar
from api.schemas.email import ConviteEmailEnvioSchema, RespostaEmailEnvioSchema
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


@router.get("/{ambiente_id}/emails/configuracao")
def configuracao_remetente(ambiente_id: UUID) -> dict:
    """Expõe somente a conta usada pelo backend para autenticação SMTP."""
    try:
        if not ambientes.get_ambiente_by_id(str(ambiente_id)):
            raise HTTPException(404, "Julgamento não encontrado.")
        config = get_email_settings()
        return {"conta_autenticacao": config.usuario}
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/enviar")
def enviar(ambiente_id: UUID, dados: ConviteEmailEnvioSchema,
           user: SessionUser = Depends(require_analyst)) -> dict:
    try:
        return email_convites.enviar(str(ambiente_id), dados, user.id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except email_convites.ConviteOriginalIndisponivel as exc:
        raise HTTPException(422, detail=str(exc), headers={
            "Cache-Control": "no-store", "X-SICARD-Email-Error": "convite_original_indisponivel",
        }) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


def _iso(valor) -> str | None:
    if valor is None:
        return None
    return valor.isoformat() if hasattr(valor, "isoformat") else str(valor)


def _confirmacoes_configuradas() -> bool:
    config = get_email_settings()
    return bool(
        config.habilitado and config.imap_habilitado
        and config.imap_host and config.imap_pasta
    )


def _monitorar_colaborador(convite: dict, respostas: dict, cliques: dict, registros: list[dict]) -> dict:
    email = str(convite["email"]).strip().lower()
    resposta = respostas.get(email)
    clique = cliques.get(email)
    convites = [
        registro for registro in registros
        if registro.get("natureza") == "convite"
        and str(registro.get("destinatario", "")).strip().lower() == email
    ]
    enviado = any(registro.get("envio_status") == "aceito_smtp" for registro in convites)
    if resposta and resposta.get("status") == "enviada":
        codigo, rotulo, atualizado = "resposta_enviada", "Resposta enviada", resposta.get("enviado_em")
    elif resposta:
        codigo, rotulo, atualizado = "em_preenchimento", "Em preenchimento", resposta.get("iniciado_em")
    elif clique:
        codigo, rotulo, atualizado = "link_acessado", "Link acessado", clique
    elif enviado:
        datas = [registro.get("criado_em") for registro in convites
                 if registro.get("envio_status") == "aceito_smtp" and registro.get("criado_em")]
        codigo, rotulo, atualizado = "convite_enviado", "Convite enviado", min(datas) if datas else None
    else:
        codigo, rotulo, atualizado = "convite_nao_enviado", "Convite não enviado", None
    return {
        "nome": convite.get("nome") or "", "email": convite["email"],
        "resposta_recebida": bool(resposta and resposta.get("status") == "enviada"),
        "acesso_formulario_em": _iso(resposta.get("iniciado_em")) if resposta else None,
        "resposta_enviada_em": _iso(resposta.get("enviado_em")) if resposta else None,
        "clique_link_em": _iso(clique), "etapa_codigo": codigo,
        "etapa_rotulo": rotulo, "etapa_atualizada_em": _iso(atualizado),
    }


@router.get("/{ambiente_id}/emails/monitoramento")
def monitoramento(ambiente_id: UUID) -> dict:
    from api.services import email_confirmacoes_automaticas

    try:
        ambiente = ambientes.get_ambiente_by_id(str(ambiente_id))
        if not ambiente:
            raise HTTPException(404, "Julgamento não encontrado.")
        respostas = ambientes.list_respostas(str(ambiente_id))
        por_email = {str(r["email"]).strip().lower(): r for r in respostas}
        registros = repo.listar(str(ambiente_id))
        cliques: dict[str, object] = {}
        for registro in registros:
            if registro.get("natureza") == "convite" and registro.get("link_acessado_em"):
                email = str(registro["destinatario"]).strip().lower()
                cliques[email] = min(cliques.get(email) or registro["link_acessado_em"], registro["link_acessado_em"])
        return {
            "registros": registros,
            "coleta_automatica": email_confirmacoes_automaticas.estado(),
            "confirmacoes_configuradas": _confirmacoes_configuradas(),
            "colaboradores": [
                _monitorar_colaborador(c, por_email, cliques, registros)
                for c in ambiente["convites"]
            ],
        }
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/resposta/enviar")
def enviar_resposta(ambiente_id: UUID, dados: RespostaEmailEnvioSchema,
                    user: SessionUser = Depends(require_analyst)) -> dict:
    try:
        return email_resposta_colaborador.enviar(
            str(ambiente_id), str(dados.destinatario), user.id, reenvio_id=dados.reenvio_id
        )
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
        if not _confirmacoes_configuradas():
            return {
                "registros": repo.listar(str(ambiente_id)),
                "relatorios_consultados": 0,
                "configurado": False,
                "mensagem": "A coleta IMAP está desativada; o monitoramento das atividades internas continua automático.",
            }
        return email_confirmacoes.coletar(str(ambiente_id), usuario_id=user.id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
