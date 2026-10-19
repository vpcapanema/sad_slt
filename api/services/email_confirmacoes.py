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

from api.repositories import email_convites_repository as repo
from api.services.email_service import FalhaEmail, _config

logger = logging.getLogger(__name__)
MAX_RELATORIO = 262144


def _destinatario(bloco: Message) -> str:
    valor = str(bloco.get("Final-Recipient") or bloco.get("Original-Recipient") or "")
    tipo, separador, endereco = valor.partition(";")
    return endereco.strip().lower() if separador and tipo.strip().lower() == "rfc822" else ""


def interpretar(conteudo: bytes, mensagem_id: str, destinatario: str) -> list[str]:
    mensagem = BytesParser(policy=policy.default).parsebytes(conteudo)
    if mensagem.get_content_type() != "multipart/report":
        return []
    tipo = mensagem.get_param("report-type")
    ids = {str(p.get("Message-ID", "")).strip() for p in mensagem.walk()
           if p is not mensagem}
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
                    eventos.append("leitura")
            elif tipo == "delivery-status" and parte.get_content_type() == "message/delivery-status":
                acao = str(bloco.get("Action", "")).strip().lower()
                status = str(bloco.get("Status", "")).strip()
                if acao == "delivered" and status.startswith("2."):
                    eventos.append("confirmada")
                elif acao == "failed" and status.startswith("5."):
                    eventos.append("falha")
                elif acao == "delayed" and status.startswith("4."):
                    eventos.append("adiada")
    return list(dict.fromkeys(eventos))


def _exigir_ok(resposta: tuple) -> list:
    status, dados = resposta
    if status != "OK" or not isinstance(dados, list):
        raise FalhaEmail("imap", "O servidor não concluiu a consulta das confirmações de email.")
    return dados


def _aspas(valor: str) -> str:
    return '"' + valor.replace("\\", "\\\\").replace('"', '\\"') + '"'


def coletar(ambiente_id: str, *, usuario_id: str) -> dict:
    config = _config()
    if not config.imap_habilitado or not config.imap_host or not config.imap_pasta:
        logger.warning("Consulta IMAP desativada ou incompleta usuario=%s", usuario_id)
        raise FalhaEmail("imap", "A coleta IMAP de confirmações não está configurada no SICARD.")
    registros = [r for r in repo.listar(ambiente_id)
                 if r["envio_status"] in {"aceito_smtp", "indeterminado", "enviando"}]
    if not registros:
        return {"registros": repo.listar(ambiente_id), "relatorios_consultados": 0}
    caixa = None
    consultados = 0
    try:
        caixa = imaplib.IMAP4_SSL(
            config.imap_host, config.imap_porta, ssl_context=ssl.create_default_context(),
            timeout=config.timeout,
        )
        _exigir_ok(caixa.login(config.usuario, config.senha.get_secret_value()))
        _exigir_ok(caixa.select(_aspas(config.imap_pasta), readonly=True))
        for registro in registros:
            mensagem_id = registro["mensagem_id"]
            envelope = sha256(mensagem_id.encode()).hexdigest()
            dados = _exigir_ok(caixa.uid(
                "search", "HEADER", "Content-Type", '"multipart/report"',
                "OR", "TEXT", _aspas(mensagem_id), "TEXT", _aspas(envelope),
            ))
            uids = dados[0].split() if dados and dados[0] else []
            if len(uids) > 100:
                raise FalhaEmail("imap", "Há mais de 100 retornos para uma mensagem. A coleta requer revisão administrativa.")
            for uid in uids:
                metadados = _exigir_ok(caixa.uid("fetch", uid, "(RFC822.SIZE)"))
                tamanho = re.search(rb"RFC822.SIZE (\d+)", b" ".join(x for x in metadados if isinstance(x, bytes)))
                if not tamanho or int(tamanho[1]) > MAX_RELATORIO:
                    raise FalhaEmail("imap", "Um retorno excedeu o limite de 256 KiB ou não informou seu tamanho. Revise a caixa de email.")
                partes = _exigir_ok(caixa.uid("fetch", uid, "(BODY.PEEK[])"))
                corpos = [p[1] for p in partes if isinstance(p, tuple) and len(p) == 2 and isinstance(p[1], bytes)]
                if len(corpos) != 1 or len(corpos[0]) > MAX_RELATORIO:
                    raise FalhaEmail("imap", "O servidor retornou um relatório incompleto ou maior que o permitido.")
                conteudo = corpos[0]
                consultados += 1
                for evento in interpretar(conteudo, mensagem_id, registro["destinatario"]):
                    repo.registrar_evento(str(registro["id"]), evento, sha256(conteudo).hexdigest())
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
    return {"registros": repo.listar(ambiente_id), "relatorios_consultados": consultados}
