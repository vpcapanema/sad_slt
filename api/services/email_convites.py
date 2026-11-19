"""Envio explícito dos convites salvos de um julgamento."""
from __future__ import annotations

import logging
import re
from hashlib import sha256
from html import escape
from urllib.parse import quote
from uuid import uuid4

from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.repositories import convite_individual_repository
from api.schemas.email import ConviteEmailEnvioSchema, EmailEnvioSchema
from api.schemas.comparacao_colaborativa import EMAIL_ASSUNTO_PADRAO, EMAIL_REMETENTE_ALIAS_PADRAO
from api.services import email_service
from api.services.comparacao_colaborativa_service import (
    _validar_ambiente_ativo,
)

ASSUNTO = EMAIL_ASSUNTO_PADRAO
_CODIGO_LINK = re.compile(r"[0-9a-f]{32}")
logger = logging.getLogger(__name__)


def _html_convite(texto: str, segredo: str, caminhos: tuple[str, ...]) -> str:
    """Versão institucional do convite; o texto puro continua como alternativa."""
    linhas = texto.splitlines()
    indice_link = next(
        (indice for indice, linha in enumerate(linhas) if any(caminho in linha for caminho in caminhos)),
        None,
    )
    if indice_link is None:
        raise DemandaValidationError("A mensagem não contém o link deste julgamento.", field="texto")
    link = linhas[indice_link].strip()
    prefixo_publico = link.split("/public/analise-multicriterio/", 1)[0]
    link_copiar_chave = (
        f"{prefixo_publico}/public/analise-multicriterio/copiar-chave/#{quote(segredo, safe='')}"
    )
    linhas_sem_link = linhas[:indice_link] + linhas[indice_link + 1:]
    blocos = "".join(
        f'<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        f'line-height:1.55;color:#22333f;">{escape(linha)}</p>'
        if linha.strip() else '<div style="height:4px;line-height:4px;">&nbsp;</div>'
        for linha in linhas_sem_link
    )
    chave = escape(segredo)
    return (
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:0;background:#eef3f7;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;">'
        '<tr><td align="center" style="padding:18px 8px;">'
        '<table role="presentation" width="640" cellpadding="0" cellspacing="0" '
        'style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5dee6;">'
        '<tr><td style="background:#00507a;padding:16px 22px;font-family:Arial,Helvetica,sans-serif;'
        'color:#ffffff;font-size:18px;font-weight:bold;">SICARD &middot; Convite para colaboração</td></tr>'
        '<tr><td style="padding:22px;">'
        f'{blocos}'
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;">'
        '<tr><td align="center" style="border-radius:5px;background:#00507a;">'
        f'<a href="{escape(link, quote=True)}" target="_blank" style="display:inline-block;padding:13px 24px;'
        'font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;'
        'text-decoration:none;border:1px solid #003d5c;border-radius:5px;">Acessar formulário colaborativo</a>'
        '</td></tr></table>'
        '<div style="margin:18px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;'
        'font-weight:bold;color:#00507a;">Chave individual do convite</div>'
        '<div style="padding:13px 14px;border:1px solid #9fb4c3;border-left:5px solid #00507a;'
        'background:#f3f7fa;font-family:Consolas,Monaco,monospace;font-size:16px;line-height:1.5;'
        f'letter-spacing:.03em;color:#12303f;word-break:break-all;user-select:all;">{chave}</div>'
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">'
        '<tr><td align="center" style="border-radius:5px;background:#ffffff;border:1px solid #00507a;">'
        f'<a href="{escape(link_copiar_chave, quote=True)}" target="_blank" style="display:inline-block;padding:10px 16px;'
        'font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#00507a;'
        'text-decoration:none;border-radius:5px;">Copiar chave</a></td></tr></table>'
        '<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;'
        'color:#516878;">O botão abre uma página segura do SICARD e copia a chave sem enviá-la ao servidor. '
        'Se preferir, selecione a chave acima e use Copiar.</p>'
        '<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;'
        'color:#516878;">A chave é exclusiva deste destinatário, revogável e válida dentro do prazo do '
        'julgamento. Um novo envio invalida a chave anterior. Não compartilhe.</p>'
        '</td></tr></table></td></tr></table></body></html>'
    )


def codigo_link(token: str, destinatario: str) -> str:
    """Código público e estável do link de cada destinatário, sem expor o e-mail na URL."""
    return sha256(f"{token}|{destinatario.strip().lower()}".encode()).hexdigest()[:32]


def _marcar_links(texto: str, token: str, destinatario: str, caminhos: tuple[str, ...]) -> str:
    codigo = codigo_link(token, destinatario)
    for caminho in caminhos:
        texto = re.sub(re.escape(caminho) + r"(?:\?c=[0-9a-f]{32})?", lambda _, caminho=caminho: f"{caminho}?c={codigo}", texto)
    return texto


def registrar_clique_link(token: str, codigo: str) -> None:
    """Grava o primeiro acesso ao link do convite; falhas nunca interrompem a página pública."""
    if not _CODIGO_LINK.fullmatch(codigo):
        return
    try:
        ambiente = ambientes.get_ambiente_by_token(token)
        if not ambiente:
            return
        for convite in ambiente["convites"]:
            email = str(convite["email"]).strip().lower()
            if codigo_link(token, email) == codigo:
                repo.registrar_clique(str(ambiente["id"]), email)
                return
    except Exception:
        logger.exception("Falha ao registrar o clique no link do convite")


def enviar(ambiente_id: str, dados: ConviteEmailEnvioSchema, usuario_id: str) -> dict:
    ambiente = ambientes.get_ambiente_by_id(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    _validar_ambiente_ativo(ambiente)
    if ambiente["atualizado_em"] != dados.versao:
        raise DemandaValidationError("O julgamento mudou. Reabra o registro antes de enviar.", field="versao")
    destinatario = str(dados.destinatario).lower()
    autorizados = {str(c["email"]).strip().lower() for c in ambiente["convites"]}
    if destinatario not in autorizados:
        raise DemandaValidationError("O destinatário não pertence aos colaboradores salvos.", field="destinatario")
    # O servidor acrescenta o codigo persistido, nunca um codigo fornecido pelo cliente.
    caminhos = (
        f"/public/analise-multicriterio/formulario-comparacao-pareada/{ambiente['token']}/",
        f"/public/analise-multicriterio/{ambiente['token']}/",
    )
    corpo = ambiente.get("email_mensagem")
    if not corpo or not corpo.strip():
        raise DemandaValidationError("Salve a mensagem do convite antes de enviar.", field="email_mensagem")
    if not any(caminho in corpo for caminho in caminhos):
        raise DemandaValidationError("A mensagem não contém o link deste julgamento.", field="texto")
    config = email_service._config()
    assunto = ambiente.get("email_assunto") or EMAIL_ASSUNTO_PADRAO
    alias_remetente = ambiente.get("email_remetente_alias") or EMAIL_REMETENTE_ALIAS_PADRAO
    instrucoes = (
        "\n\nChave individual do convite: {segredo}\n"
        "Informe seu e-mail convidado e esta chave no formulário. Não compartilhe a chave. "
        "Ela é revogável, exclusiva deste destinatário e válida dentro do prazo do julgamento. "
        "Um novo envio invalida a chave anterior."
    )
    corpo = _marcar_links(corpo, ambiente["token"], destinatario, caminhos)
    texto = corpo
    if len(texto) + len(instrucoes.format(segredo="x" * 43)) > 50000:
        raise DemandaValidationError(
            "Reduza a mensagem para que o texto, incluindo a chave individual e suas instruções, tenha até 50.000 caracteres.",
            field="texto",
        )
    identidade = alias_remetente + "\n" + assunto + "\n" + texto
    if dados.reenvio_id:
        identidade += "\nReenvio: " + str(dados.reenvio_id)
    resumo = sha256(identidade.encode()).hexdigest()
    reservar = repo.reservar_monitorado if dados.somente_nao_enviado else repo.reservar
    registro, novo = reservar(
        ambiente_id, destinatario, resumo, f"<sicard.{uuid4().hex}@{str(config.remetente).rsplit('@', 1)[1]}>",
        usuario_id, dados.versao,
    )
    if not novo:
        return {**registro, "reutilizado": True}
    try:
        segredo = convite_individual_repository.emitir(ambiente_id, destinatario, dados.versao)
        texto += instrucoes.format(segredo=segredo)
        mensagem = EmailEnvioSchema(
            destinatario=dados.destinatario,
            alias_remetente=alias_remetente,
            assunto=assunto,
            texto=texto,
            html=_html_convite(corpo, segredo, caminhos),
        )
        resultado = email_service.enviar(
            mensagem,
            usuario_id=usuario_id, id_mensagem=registro["mensagem_id"], solicitar_confirmacoes=True,
        )
    except (DatabaseUnavailableError, DemandaValidationError):
        repo.finalizar(str(registro["id"]), "falha", "Convite não emitido. Reabra o julgamento e tente novamente.")
        raise
    except email_service.FalhaEmail as exc:
        status = "indeterminado" if exc.codigo == "resultado_indeterminado" else "falha"
        return repo.finalizar(str(registro["id"]), status, str(exc))
    try:
        return repo.finalizar(
            str(registro["id"]), "aceito_smtp", resultado.mensagem,
            dsn=resultado.confirmacao_entrega_solicitada, leitura=True,
        )
    except (DatabaseUnavailableError, DemandaValidationError) as exc:
        email_service.logger.error(
            "SMTP aceitou convite; histórico indisponível registro=%s tipo=%s",
            registro["id"], type(exc).__name__,
        )
        raise email_service.FalhaEmail(
            "resultado_indeterminado",
            "O SMTP aceitou a mensagem, mas o histórico não foi atualizado. Não reenvie; consulte as confirmações.",
        ) from exc
