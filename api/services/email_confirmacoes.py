"""Leitura IMAP de relatórios DSN/MDN correlacionados; nunca altera a caixa."""
from __future__ import annotations

from email import policy
from email.parser import BytesParser
from email.message import Message
from hashlib import sha256
import imaplib
import logging
import re
import ssl
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

from api.repositories import email_convites_repository as repo
from api.services.email_service import FalhaEmail, _config
from api.services.email_status_catalogo import texto_explicacao

logger = logging.getLogger(__name__)
MAX_RELATORIO = 262144


def _destinatario(bloco: Message) -> str:
    valor = str(bloco.get("Final-Recipient") or bloco.get("Original-Recipient") or "")
    tipo, separador, endereco = valor.partition(";")
    return endereco.strip().lower() if separador and tipo.strip().lower() == "rfc822" else ""


@dataclass(frozen=True)
class ConfirmacaoEmail:
    tipo: str
    ocorrido_em: str | None
    detalhe: str
    origem_data: str


def _data_confirmacao(valor: str) -> str | None:
    if not valor:
        return None
    try:
        instante = parsedate_to_datetime(valor)
    except (ValueError, TypeError, OverflowError):
        logger.warning("Relatório de email com data inválida; horário do evento não registrado")
        return None
    if instante.tzinfo is None:
        logger.warning("Relatório de email sem fuso horário; horário do evento não registrado")
        return None
    return instante.astimezone(timezone.utc).isoformat()


def interpretar_confirmacoes(conteudo: bytes, mensagem_id: str, destinatario: str) -> list[ConfirmacaoEmail]:
    mensagem = BytesParser(policy=policy.default).parsebytes(conteudo)
    if mensagem.get_content_type() != "multipart/report":
        return []
    tipo = mensagem.get_param("report-type")
    ids = {str(p.get("Message-ID", "")).strip() for p in mensagem.walk()
           if p is not mensagem}
    # Relatórios do Gmail referenciam a mensagem original apenas em In-Reply-To/References
    # e no campo não padronizado X-Original-Message-ID.
    for cabecalho in ("In-Reply-To", "References"):
        ids.update(str(mensagem.get(cabecalho) or "").split())
    envelope = sha256(mensagem_id.encode()).hexdigest()
    eventos = []
    for parte in mensagem.walk():
        if parte.get_content_type() not in ("message/delivery-status", "message/disposition-notification"):
            continue
        payload = parte.get_payload()
        if not isinstance(payload, list):
            continue
        blocos = [bloco for bloco in payload if isinstance(bloco, Message)]
        correlacionado = mensagem_id in ids or any(
            str(b.get("Original-Message-ID", "")).strip() == mensagem_id
            or str(b.get("X-Original-Message-ID", "")).strip() == mensagem_id
            or str(b.get("Original-Envelope-Id", "")).strip() == envelope for b in blocos
        )
        if not correlacionado:
            continue
        for bloco in blocos:
            if _destinatario(bloco) != destinatario.lower():
                continue
            if tipo == "disposition-notification" and parte.get_content_type() == "message/disposition-notification":
                disposicao = str(bloco.get("Disposition", "")).partition(";")[2].strip().split("/")[0]
                if disposicao.lower() == "displayed":
                    quando = _data_confirmacao(str(mensagem.get("Date") or ""))
                    eventos.append(ConfirmacaoEmail(
                        "leitura", quando, str(bloco.get("Disposition") or ""), "Date do relatório MDN"))
                    # A leitura comprova a entrega; servidores como o Gmail não emitem DSN de sucesso.
                    eventos.append(ConfirmacaoEmail(
                        "confirmada", quando, "Entrega comprovada pela confirmação de leitura (MDN)",
                        "Date do relatório MDN"))
            elif tipo == "delivery-status" and parte.get_content_type() == "message/delivery-status":
                acao = str(bloco.get("Action", "")).strip().lower()
                status = str(bloco.get("Status", "")).strip()
                evento = ("confirmada" if acao == "delivered" and status.startswith("2.") else
                          "falha" if acao == "failed" and status.startswith("5.") else
                          "adiada" if acao == "delayed" and status.startswith("4.") else None)
                if evento:
                    bruto = "; ".join(p for p in (f"Action: {acao}", f"Status: {status}",
                                                  str(bloco.get("Diagnostic-Code") or "")) if p)
                    explicacao = texto_explicacao(status, bruto) if evento != "confirmada" else ""
                    eventos.append(ConfirmacaoEmail(
                        evento, _data_confirmacao(str(bloco.get("Last-Attempt-Date") or "")),
                        f"{explicacao} Relatório original: {bruto}" if explicacao else bruto,
                        "Last-Attempt-Date do relatório DSN"))
    return list(dict.fromkeys(eventos))


def interpretar(conteudo: bytes, mensagem_id: str, destinatario: str) -> list[str]:
    return list(dict.fromkeys(evento.tipo for evento in interpretar_confirmacoes(conteudo, mensagem_id, destinatario)))


def _exigir_ok(resposta: tuple) -> list:
    status, dados = resposta
    if status != "OK" or not isinstance(dados, list):
        raise FalhaEmail("imap", "O servidor não concluiu a consulta das confirmações de email.")
    return dados


def _aspas(valor: str) -> str:
    return '"' + valor.replace("\\", "\\\\").replace('"', '\\"') + '"'


_MESES_IMAP = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_cache_relatorios: OrderedDict[tuple[str, bytes], bytes] = OrderedDict()
_CACHE_MAX = 200


def _criterio_periodo(registros: list[dict]) -> tuple[str, ...]:
    """Janela de busca: a véspera do envio pendente mais antigo. Sem data, varre a caixa inteira."""
    datas = []
    for registro in registros:
        valor = registro.get("criado_em")
        if isinstance(valor, str):
            try:
                valor = datetime.fromisoformat(valor)
            except ValueError:
                valor = None
        if not isinstance(valor, datetime):
            return ("ALL",)
        if valor.tzinfo is None:
            valor = valor.replace(tzinfo=timezone.utc)
        datas.append(valor.astimezone(timezone.utc) - timedelta(days=1))
    inicio = min(datas)
    return ("SINCE", f"{inicio.day:02d}-{_MESES_IMAP[inicio.month - 1]}-{inicio.year}")


def _uidvalidity(caixa: imaplib.IMAP4) -> str:
    valores = caixa.response("UIDVALIDITY")[1] or []
    return next((v.decode() for v in valores if isinstance(v, bytes)), "")


def _relatorios_na_caixa(caixa: imaplib.IMAP4, criterio: tuple[str, ...]) -> list[bytes]:
    """Servidores como o Gmail não filtram Content-Type nem texto literal; o filtro é local."""
    dados = _exigir_ok(caixa.uid("search", *criterio))
    uids = dados[0].split() if dados and dados[0] else []
    if not uids:
        return []
    resposta = _exigir_ok(caixa.uid(
        "fetch", b",".join(uids).decode(), "(UID RFC822.SIZE BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE)])",
    ))
    relatorios = []
    for item in resposta:
        if not (isinstance(item, tuple) and len(item) == 2 and isinstance(item[0], bytes)):
            continue
        uid = re.search(rb"UID (\d+)", item[0])
        tamanho = re.search(rb"RFC822\.SIZE (\d+)", item[0])
        tipo = BytesParser(policy=policy.default).parsebytes(item[1], headersonly=True).get_content_type()
        if not uid or tipo != "multipart/report":
            continue
        if not tamanho or int(tamanho[1]) > MAX_RELATORIO:
            logger.warning("Relatório de email uid=%s ignorado: excede %s bytes ou sem tamanho", uid[1].decode(), MAX_RELATORIO)
            continue
        relatorios.append(uid[1])
    return relatorios


def _carregar_relatorio(caixa: imaplib.IMAP4, validade: str, uid: bytes) -> bytes | None:
    chave = (validade, uid)
    if validade and chave in _cache_relatorios:
        _cache_relatorios.move_to_end(chave)
        return _cache_relatorios[chave]
    partes = _exigir_ok(caixa.uid("fetch", uid, "(BODY.PEEK[])"))
    corpos = [p[1] for p in partes if isinstance(p, tuple) and len(p) == 2 and isinstance(p[1], bytes)]
    if len(corpos) != 1 or len(corpos[0]) > MAX_RELATORIO:
        raise FalhaEmail("imap", "O servidor retornou um relatório incompleto ou maior que o permitido.")
    if validade:
        _cache_relatorios[chave] = corpos[0]
        while len(_cache_relatorios) > _CACHE_MAX:
            _cache_relatorios.popitem(last=False)
    return corpos[0]


def _coletar_registros(registros: list[dict], registrar_evento: Callable[[dict, ConfirmacaoEmail, str], None],
                       *, usuario_id: str, interromper: Callable[[], bool] | None = None) -> int:
    config = _config()
    if not config.imap_habilitado or not config.imap_host or not config.imap_pasta:
        logger.warning("Consulta IMAP desativada ou incompleta usuario=%s", usuario_id)
        raise FalhaEmail("imap", "A coleta IMAP de confirmações não está configurada no SICARD.")
    if not registros:
        return 0
    caixa = None
    consultados = 0
    try:
        caixa = imaplib.IMAP4_SSL(
            config.imap_host, config.imap_porta, ssl_context=ssl.create_default_context(),
            timeout=config.timeout,
        )
        _exigir_ok(caixa.login(config.usuario, config.senha.get_secret_value()))
        _exigir_ok(caixa.select(_aspas(config.imap_pasta), readonly=True))
        validade = _uidvalidity(caixa)
        for uid in _relatorios_na_caixa(caixa, _criterio_periodo(registros)):
            if interromper and interromper():
                break
            conteudo = _carregar_relatorio(caixa, validade, uid)
            if conteudo is None:
                continue
            consultados += 1
            fonte = sha256(conteudo).hexdigest()
            for registro in registros:
                mensagem_id = registro["mensagem_id"]
                envelope = sha256(mensagem_id.encode()).hexdigest()
                if mensagem_id.encode() not in conteudo and envelope.encode() not in conteudo:
                    continue
                for evento in interpretar_confirmacoes(conteudo, mensagem_id, registro["destinatario"]):
                    registrar_evento(registro, evento, fonte)
    except (imaplib.IMAP4.error, OSError, UnicodeError) as exc:
        logger.error("Consulta IMAP falhou usuario=%s tipo=%s", usuario_id, type(exc).__name__)
        raise FalhaEmail(
            "imap", "Não foi possível consultar os retornos de email. Verifique a configuração IMAP; o envio não será repetido.",
        ) from exc
    except FalhaEmail as exc:
        logger.error("Coleta IMAP incompleta usuario=%s codigo=%s", usuario_id, exc.codigo)
        raise
    finally:
        if caixa is not None:
            try:
                caixa.logout()
            except (imaplib.IMAP4.error, OSError) as exc:
                logger.warning("Encerramento IMAP sem confirmação tipo=%s", type(exc).__name__)
    return consultados


def _registrar_confirmacao(registro: dict, evento: ConfirmacaoEmail, fonte: str) -> None:
    repo.registrar_evento(
        str(registro["id"]), evento.tipo, fonte, ocorrido_em=evento.ocorrido_em,
        detalhe=evento.detalhe, origem_data=evento.origem_data,
    )


def coletar_automaticamente(interromper: Callable[[], bool]) -> int:
    return _coletar_registros(
        repo.listar_para_confirmacao(), _registrar_confirmacao,
        usuario_id="coleta-automatica", interromper=interromper,
    )


def coletar(ambiente_id: str, *, usuario_id: str) -> dict:
    registros = [r for r in repo.listar(ambiente_id)
                 if r["envio_status"] in {"aceito_smtp", "indeterminado", "enviando"}]
    consultados = _coletar_registros(
        registros, _registrar_confirmacao,
        usuario_id=usuario_id,
    )
    return {"registros": repo.listar(ambiente_id), "relatorios_consultados": consultados}


def coletar_pendencia(pedido: dict, *, usuario_id: str) -> dict:
    from api.repositories import solicitacao_complementacao_repository as solicitacoes
    notificacao = pedido.get("notificacao") or {}
    mensagem_id, destinatario = notificacao.get("id_mensagem"), notificacao.get("destinatario")
    if not mensagem_id or not destinatario:
        raise FalhaEmail("historico", "A notificação não possui identificador e destinatário para correlacionar os retornos.")
    registro = {"id": pedido["id"], "mensagem_id": mensagem_id, "destinatario": destinatario,
                "criado_em": notificacao.get("enviado_em")}
    consultados = _coletar_registros(
        [registro], lambda r, evento, fonte: solicitacoes.registrar_confirmacao(
            r["id"], r["mensagem_id"], evento.tipo, fonte, ocorrido_em=evento.ocorrido_em,
            detalhe=evento.detalhe, origem_data=evento.origem_data),
        usuario_id=usuario_id,
    )
    return {"solicitacao": solicitacoes.obter(pedido["id"], interno=True),
            "relatorios_consultados": consultados}
