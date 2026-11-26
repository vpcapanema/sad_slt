"""Envio explícito dos convites salvos de um julgamento."""
from __future__ import annotations

import logging
import re
import secrets
from hashlib import sha256
from urllib.parse import urlsplit
from uuid import uuid4

from cryptography.exceptions import InvalidTag

from api.db.connection import atomic_connection, get_connection
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.repositories import convite_individual_repository
from api.schemas.email import ConviteEmailEnvioSchema, EmailEnvioSchema
from api.schemas.comparacao_colaborativa import EMAIL_ASSUNTO_PADRAO, EMAIL_REMETENTE_ALIAS_PADRAO
from api.services import convite_envelope, email_ahp_rascunho, email_service, mensagens_ahp
from api.services.comparacao_colaborativa_service import (
    _link_publico,
    _mensagem_email_padrao,
    _validar_ambiente_ativo,
    base_mensagem_padrao,
    revisao_convites,
)

ASSUNTO = EMAIL_ASSUNTO_PADRAO
_CODIGO_LINK = re.compile(r"[0-9a-f]{32}")
logger = logging.getLogger(__name__)


def _personalizar_mensagem(texto: str, nome: str | None, *, normalizar_assinatura: bool = True) -> str:
    """Aplica somente os dados individuais que não pertencem ao texto-base persistido."""
    mensagem = texto.replace("Equipe SICARD/SLT", "Equipe SICARD-PLI") if normalizar_assinatura else texto
    partes_nome = str(nome or "").strip().split()
    if partes_nome:
        cumprimento = " ".join(partes_nome[:2])
        mensagem = re.sub(
            r"^Olá,[ \t]*colaborador\(a\)!", lambda _: f"Olá, {cumprimento}!", mensagem,
            count=1, flags=re.IGNORECASE,
        )
    return mensagem


def _linha_link(texto: str, caminhos: tuple[str, ...], link_canonico: str | None) -> str | None:
    for linha in texto.splitlines():
        valor = linha.strip()
        if link_canonico is not None:
            if valor == link_canonico:
                return linha
            continue
        if any(c.isspace() for c in valor) or not any(caminho in valor for caminho in caminhos):
            continue
        try:
            url = urlsplit(valor)
        except ValueError:
            continue
        if url.scheme in {"http", "https"} and url.hostname and any(url.path.endswith(caminho) for caminho in caminhos):
            return linha
    return None


def codigo_link(token: str, destinatario: str) -> str:
    """Código público e estável do link de cada destinatário, sem expor o e-mail na URL."""
    return sha256(f"{token}|{destinatario.strip().lower()}".encode()).hexdigest()[:32]


def _link_de_acesso(link: str, segredo: str) -> str:
    # O fragmento só é lido pelo formulário no navegador e fica fora da requisição de navegação.
    return urlsplit(link)._replace(fragment=f"acesso={segredo}").geturl()


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


class ConviteOriginalIndisponivel(DemandaValidationError):
    """Falha específica do destinatário; outros convites do lote podem prosseguir."""


def _mensagem_original(ambiente_id: str, email: str, row: dict) -> dict:
    if row["revogado_em"]:
        raise ConviteOriginalIndisponivel("O convite individual foi revogado.", field="convite")
    if not row["envelope_cifrado"]:
        raise ConviteOriginalIndisponivel(
            "Convite antigo: a mensagem original não foi armazenada para reenvio. "
            "Se ainda for válida, encaminhe o e-mail original para preservar a chave. A chave não foi alterada.",
            field="convite",
        )
    try:
        dados = convite_envelope.abrir(ambiente_id, email, row["envelope_cifrado"])
        segredo = dados["segredo"]
        if not secrets.compare_digest(row["segredo_hash"], sha256(segredo.encode()).hexdigest()):
            raise ValueError("Envelope não corresponde ao convite.")
        mensagem = EmailEnvioSchema.model_validate(dados["mensagem"])
        if str(mensagem.destinatario).lower() != email:
            raise ValueError("Destinatário do envelope inválido.")
        if not isinstance(dados["identidade"], str):
            raise ValueError("Envelope inválido.")
        return dados
    except (InvalidTag, ValueError, TypeError, AttributeError, KeyError):
        raise ConviteOriginalIndisponivel(
            "Não foi possível recuperar a mensagem original. A chave anterior não foi alterada.",
            field="convite",
        ) from None


def link_lembrete(ambiente_id: str, email: str, versao, link: str, token: str) -> str:
    try:
        convite = convite_individual_repository.obter(ambiente_id, email, versao)
    except DemandaValidationError as exc:
        raise ConviteOriginalIndisponivel(str(exc), field="convite") from exc
    if convite is None:
        raise ConviteOriginalIndisponivel("O convite não está mais disponível.", field="convite")
    segredo = _mensagem_original(ambiente_id, email, convite)["segredo"]
    return _link_de_acesso(f"{link}?c={codigo_link(token, email)}", segredo)


def _preparar_convite(ambiente: dict, convite: dict, destinatario: str, segredo: str, *,
                      conteudo: dict | None = None, base_url: str = "") -> dict:
    # O servidor acrescenta o codigo persistido, nunca um codigo fornecido pelo cliente.
    caminhos = (
        f"/public/analise-multicriterio/formulario-comparacao-pareada/{ambiente['token']}/",
        f"/public/analise-multicriterio/{ambiente['token']}/",
    )
    corpo = conteudo["texto"] if conteudo else ambiente.get("email_mensagem")
    if not corpo or not corpo.strip():
        raise DemandaValidationError("Salve a mensagem do convite antes de enviar.", field="email_mensagem")
    base = None if conteudo else base_mensagem_padrao(ambiente)
    if base is not None:
        corpo = _mensagem_email_padrao(ambiente, base_url=base)
    corpo = _personalizar_mensagem(corpo, convite.get("nome"), normalizar_assinatura=conteudo is None)
    if not any(caminho in corpo for caminho in caminhos):
        raise DemandaValidationError("A mensagem não contém o link deste julgamento.", field="texto")
    assunto = conteudo["assunto"] if conteudo else ambiente.get("email_assunto") or EMAIL_ASSUNTO_PADRAO
    alias_remetente = conteudo["alias_remetente"] if conteudo else ambiente.get("email_remetente_alias") or EMAIL_REMETENTE_ALIAS_PADRAO
    corpo = _marcar_links("\n".join(corpo.splitlines()), ambiente["token"], destinatario, caminhos)
    link_canonico = _marcar_links(_link_publico(ambiente, base_url=base_url), ambiente["token"], destinatario, caminhos) if conteudo else None
    linha_link = _linha_link(corpo, caminhos, link_canonico)
    if linha_link is None:
        raise DemandaValidationError("Mantenha o link do julgamento em uma linha própria da mensagem.", field="texto")
    link = _link_de_acesso(linha_link.strip(), segredo)
    texto = re.sub(r"(?m)^" + re.escape(linha_link) + r"$", lambda _: link, corpo, count=1)
    if len(texto) > 50000:
        raise DemandaValidationError(
            "Reduza a mensagem para que o texto, incluindo o link de acesso, tenha até 50.000 caracteres.",
            field="texto",
        )
    identidade = alias_remetente + "\n" + assunto + "\n" + corpo
    mensagem = EmailEnvioSchema(
        destinatario=destinatario,
        alias_remetente=alias_remetente,
        assunto=assunto,
        texto=texto,
        html=mensagens_ahp.html(texto, link, mensagens_ahp.ACAO_CONVITE, julgamento=ambiente.get("nome") or ""),
    )
    return {"segredo": segredo, "identidade": identidade, "mensagem": mensagem.model_dump(mode="json")}


def _reservar_convite(
    ambiente_id: str, dados: ConviteEmailEnvioSchema, usuario_id: str, *, conn=None, base_url: str = "",
) -> tuple[dict, EmailEnvioSchema | None]:
    revisao = dados.revisao_convites
    ambiente = ambientes.get_ambiente_by_id(ambiente_id, bloquear=revisao is not None)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    _validar_ambiente_ativo(ambiente)
    versao = ambiente["atualizado_em"]
    if revisao and revisao != revisao_convites(ambiente):
        raise DemandaValidationError("A configuração dos convites mudou. Reabra o julgamento e confira os dados antes de enviar.",
                                     field="revisao_convites")
    if revisao is None and versao != dados.versao:
        raise DemandaValidationError("O julgamento mudou. Reabra o registro antes de enviar.", field="versao")
    destinatario = str(dados.destinatario).lower()
    convites = {str(c["email"]).strip().lower(): c for c in ambiente["convites"]}
    convite = convites.get(destinatario)
    if convite is None:
        raise DemandaValidationError("O destinatário não pertence aos colaboradores salvos.", field="destinatario")
    original = convite_individual_repository.obter(ambiente_id, destinatario, versao)
    envelope_original = _mensagem_original(ambiente_id, destinatario, original) if original else None
    conteudo = email_ahp_rascunho.para_envio(
        conn, ambiente, usuario_id, dados.rascunho_id, dados.reenvio_id, base_url,
    ) if dados.usar_modelo_atual else None
    envelope = envelope_original
    if conteudo or not envelope:
        segredo = envelope_original["segredo"] if envelope_original else secrets.token_urlsafe(32)
        try:
            envelope = _preparar_convite(ambiente, convite, str(dados.destinatario), segredo,
                                        conteudo=conteudo, base_url=base_url)
        except ValueError:
            raise DemandaValidationError("O conteúdo do convite não atende aos limites de envio.", field="texto") from None
    cifrado = None if original else convite_envelope.cifrar(ambiente_id, destinatario, envelope)
    config = email_service._config()
    identidade = envelope["identidade"]
    if dados.reenvio_id:
        identidade += "\nReenvio: " + str(dados.reenvio_id)
    resumo = sha256(identidade.encode()).hexdigest()
    reserva = (
        ambiente_id, destinatario, resumo, f"<sicard.{uuid4().hex}@{str(config.remetente).rsplit('@', 1)[1]}>",
        usuario_id, versao,
    )
    if dados.somente_nao_enviado:
        registro, novo = repo.reservar_monitorado(*reserva, rejeitar_enviado=False)
    else:
        registro, novo = repo.reservar(*reserva)
    if not novo:
        return {**registro, "reutilizado": True}, None
    try:
        if cifrado is not None:
            original = convite_individual_repository.registrar(
                ambiente_id, destinatario, versao,
                sha256(envelope["segredo"].encode()).hexdigest(), cifrado,
            )
        else:
            # Confirma novamente a validade vigente depois da reserva.
            original = convite_individual_repository.obter(ambiente_id, destinatario, versao)
        if not original:
            raise DemandaValidationError("O convite mudou. Reabra o julgamento.", field="convite")
        validado = _mensagem_original(ambiente_id, destinatario, original)
        if conteudo is None or cifrado is not None:
            envelope = validado
        return registro, EmailEnvioSchema.model_validate(envelope["mensagem"])
    except (DatabaseUnavailableError, DemandaValidationError):
        if revisao is None:
            repo.finalizar(str(registro["id"]), "falha", "Convite não emitido. Reabra o julgamento e tente novamente.")
        raise


def enviar(ambiente_id: str, dados: ConviteEmailEnvioSchema, usuario_id: str, *, base_url: str = "") -> dict:
    if dados.revisao_convites is None and not dados.usar_modelo_atual:
        registro, mensagem = _reservar_convite(ambiente_id, dados, usuario_id)
    else:
        # A revisão, a chave individual e a reserva são conferidas juntas antes do SMTP.
        with get_connection() as conn, atomic_connection(conn):
            repo.bloquear_envio(conn, ambiente_id, str(dados.destinatario).lower())
            registro, mensagem = _reservar_convite(ambiente_id, dados, usuario_id, conn=conn, base_url=base_url)
    if mensagem is None:
        return registro
    try:
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
