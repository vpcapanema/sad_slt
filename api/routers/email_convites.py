"""Envio e acompanhamento de convites da Central de julgamentos."""
from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request

from api.deps.auth import require_analyst
from api.config import get_email_settings
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.routers.comparacao_colaborativa import _base_url
from api.routers.email import _erro, _nao_armazenar
from api.schemas.email import (
    ConviteEmailEnvioSchema, DivulgacaoEmailEnvioSchema, ExclusaoDestinatariosDivulgacaoSchema,
    ListaDivulgacaoSchema, MensagemDivulgacaoSchema, RespostaEmailEnvioSchema, SalvamentoListaDivulgacaoSchema,
)
from api.services import autorizacao, divulgacao_ahp, email_confirmacoes, email_convites, email_resposta_colaborador
from api.services.atividade_colaboracao_ahp import etapa_colaboracao
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
        return _registros_colaboracao(repo.listar(str(ambiente_id)))
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


def _registros_colaboracao(registros: list[dict]) -> list[dict]:
    return [registro for registro in registros if registro.get("natureza") != divulgacao_ahp.NATUREZA]


def _gestor_divulgacao(user: SessionUser = Depends(require_analyst)) -> SessionUser:
    autorizacao.exigir(user, "mad.operar", acao="gerenciar a divulgação do link público")
    return user


@router.get("/{ambiente_id}/emails/divulgacao", dependencies=[Depends(_gestor_divulgacao)])
def listar_divulgacao(ambiente_id: UUID) -> dict:
    try:
        return {**divulgacao_ahp.listar(str(ambiente_id)), "confirmacoes_configuradas": _confirmacoes_configuradas()}
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.get("/{ambiente_id}/emails/divulgacao/listas", dependencies=[Depends(_gestor_divulgacao)])
def listar_origens_divulgacao(ambiente_id: UUID, origem: UUID | None = None, catalogo: bool = False) -> dict:
    try:
        return divulgacao_ahp.listas_existentes(str(ambiente_id), str(origem) if origem else None, catalogo=catalogo)
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/divulgacao/destinatarios", dependencies=[Depends(_gestor_divulgacao)])
def adicionar_destinatarios_divulgacao(ambiente_id: UUID, dados: ListaDivulgacaoSchema) -> dict:
    try:
        return divulgacao_ahp.adicionar(str(ambiente_id), dados)
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.delete("/{ambiente_id}/emails/divulgacao/destinatarios", dependencies=[Depends(_gestor_divulgacao)])
def excluir_destinatarios_divulgacao(ambiente_id: UUID, dados: ExclusaoDestinatariosDivulgacaoSchema) -> dict:
    try:
        return {"excluidos": divulgacao_ahp.excluir(str(ambiente_id), dados)}
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.put("/{ambiente_id}/emails/divulgacao/destinatarios", dependencies=[Depends(_gestor_divulgacao)])
def salvar_destinatarios_divulgacao(ambiente_id: UUID, dados: SalvamentoListaDivulgacaoSchema) -> dict:
    try:
        return divulgacao_ahp.salvar_destinatarios(str(ambiente_id), dados)
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.put("/{ambiente_id}/emails/divulgacao/mensagem", dependencies=[Depends(_gestor_divulgacao)])
def salvar_mensagem_divulgacao(ambiente_id: UUID, dados: MensagemDivulgacaoSchema) -> dict:
    try:
        return divulgacao_ahp.salvar_mensagem(str(ambiente_id), dados)
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/divulgacao/enviar")
def enviar_divulgacao(ambiente_id: UUID, dados: DivulgacaoEmailEnvioSchema, request: Request,
                      user: SessionUser = Depends(_gestor_divulgacao)) -> dict:
    try:
        return divulgacao_ahp.enviar(str(ambiente_id), dados, user.id, base_url=_base_url(request))
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except (DemandaValidationError, ValueError) as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/{ambiente_id}/emails/divulgacao/confirmacoes")
def coletar_divulgacao(ambiente_id: UUID, user: SessionUser = Depends(_gestor_divulgacao)) -> dict:
    try:
        divulgacao_ahp.ambiente_publico(str(ambiente_id))
        if _confirmacoes_configuradas():
            email_confirmacoes.coletar(str(ambiente_id), usuario_id=user.id)
        return listar_divulgacao(ambiente_id)
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


def _monitorar_colaborador(convite: dict, respostas: dict, cliques: dict, registros: list[dict]) -> dict:
    email = str(convite["email"]).strip().lower()
    resposta = respostas.get(email)
    clique = cliques.get(email)
    convites = [
        registro for registro in registros
        if registro.get("natureza") == "convite"
        and str(registro.get("destinatario", "")).strip().lower() == email
    ]
    enviados = [registro for registro in convites if registro.get("envio_status") == "aceito_smtp"]
    datas = [registro["criado_em"] for registro in enviados if registro.get("criado_em")]
    etapa = etapa_colaboracao(resposta, publico=False, clique_em=clique, convite_enviado=bool(enviados),
                              convite_em=min(datas) if datas else None)
    return _atividade_colaborador(convite, resposta, etapa, clique=clique)


def _atividade_colaborador(pessoa: dict, resposta: dict | None, etapa: tuple, *, clique=None) -> dict:
    codigo, rotulo, atualizado = etapa
    return {
        "nome": pessoa.get("nome") or "", "email": pessoa["email"],
        "instituicao": ((resposta or {}).get("instituicao") or pessoa.get("instituicao")),
        "resposta_recebida": bool(resposta and resposta.get("status") == "enviada"),
        "acesso_formulario_em": _iso(resposta.get("iniciado_em")) if resposta else None,
        "resposta_enviada_em": _iso(resposta.get("enviado_em")) if resposta else None,
        "clique_link_em": _iso(clique), "etapa_codigo": codigo,
        "etapa_rotulo": rotulo, "etapa_atualizada_em": _iso(atualizado),
    }


def _monitorar_inscritos(inscricoes: list[dict], respostas: list[dict]) -> list[dict]:
    por_inscricao = {str(r["inscricao_id"]): r for r in respostas if r.get("inscricao_id")}
    colaboradores = []
    for inscricao in inscricoes:
        ident = str(inscricao["id"])
        resposta = por_inscricao.get(ident)
        etapa = etapa_colaboracao(resposta, publico=True, inscrito_em=inscricao.get("criado_em"))
        colaboradores.append({**_atividade_colaborador(inscricao, resposta, etapa), "inscricao_id": ident,
                              "registrado_em": _iso(inscricao.get("criado_em"))})
    return colaboradores


@router.get("/{ambiente_id}/emails/monitoramento")
def monitoramento(ambiente_id: UUID, user: SessionUser = Depends(require_analyst)) -> dict:
    from api.services import email_confirmacoes_automaticas

    try:
        ambiente = ambientes.get_ambiente_by_id(str(ambiente_id))
        if not ambiente:
            raise HTTPException(404, "Julgamento não encontrado.")
        publico = ambiente.get("modo_participacao") == "publico"
        if publico:
            autorizacao.exigir(user, "mad.operar", acao="consultar os inscritos por link público")
        respostas = ambientes.list_respostas(str(ambiente_id))
        registros = repo.listar(str(ambiente_id))
        if publico:
            colaboradores = _monitorar_inscritos(ambientes.list_inscricoes(str(ambiente_id)), respostas)
            registros = [r for r in registros if r.get("natureza") == "resposta"]
        else:
            por_email = {str(r["email"]).strip().lower(): r for r in respostas}
            cliques: dict[str, object] = {}
            for registro in registros:
                if registro.get("natureza") == "convite" and registro.get("link_acessado_em"):
                    email = str(registro["destinatario"]).strip().lower()
                    cliques[email] = min(cliques.get(email) or registro["link_acessado_em"], registro["link_acessado_em"])
            colaboradores = [_monitorar_colaborador(c, por_email, cliques, registros) for c in ambiente["convites"]]
        return {
            "registros": registros,
            "coleta_automatica": email_confirmacoes_automaticas.estado(),
            "confirmacoes_configuradas": _confirmacoes_configuradas(),
            "colaboradores": colaboradores,
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
                "registros": _registros_colaboracao(repo.listar(str(ambiente_id))),
                "relatorios_consultados": 0,
                "configurado": False,
                "mensagem": "A coleta IMAP está desativada; o monitoramento das atividades internas continua automático.",
            }
        resultado = email_confirmacoes.coletar(str(ambiente_id), usuario_id=user.id)
        return {**resultado, "registros": _registros_colaboracao(resultado["registros"])}
    except FalhaEmail as exc:
        raise _erro(exc) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
