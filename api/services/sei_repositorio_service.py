"""Repositório e processamento assistido de contribuições recebidas via SEI."""
from __future__ import annotations

import io
from collections import defaultdict
from contextlib import contextmanager
from hashlib import sha256 as _sha256
from threading import Lock
from typing import Any, Iterator
from uuid import UUID

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import sei_documento_repository as repo
from api.services import sei_processamento

LIMITE_BYTES = 80 * 1024 * 1024
LIMITE_LOTE_BYTES = 160 * 1024 * 1024
ASSINATURA_PDF = b"%PDF-"

_TRAVAS: dict[str, Lock] = defaultdict(Lock)
_TRAVA_GERAL = Lock()


@contextmanager
def travar(documento_id: str) -> Iterator[None]:
    with _TRAVA_GERAL:
        trava = _TRAVAS[_identificador(documento_id)]
    with trava:
        yield


def _identificador(documento_id: str) -> str:
    try:
        return str(UUID(str(documento_id)))
    except (ValueError, TypeError) as exc:
        raise DemandaValidationError("Identificador de documento inválido.") from exc


def _inventariar(conteudo: bytes) -> tuple[int | None, str | None]:
    from pypdf import PdfReader

    try:
        leitor = PdfReader(io.BytesIO(conteudo))
        if leitor.is_encrypted:
            return None, "PDF protegido por senha; remova a proteção antes da análise."
        return len(leitor.pages), None
    except Exception:
        return None, "O PDF não pôde ser interpretado; confira o arquivo de origem."


def _evidencias_da_analise(analise: dict[str, Any]) -> dict[str, Any]:
    return {
        campo: resultado.get("evidencias", [])
        for campo, resultado in analise["campos"].items()
        if resultado.get("evidencias")
    }


def receber(
    *,
    conteudo: bytes,
    nome_arquivo: str,
    usuario_id: str,
    usuario_nome: str,
    tipo_demanda: sei_processamento.TipoDemanda = "projeto",
) -> dict[str, Any]:
    """Lê o PDF e grava arquivo e leitura juntos, numa linha só.

    A leitura acontece antes do INSERT de propósito: documento cuja leitura
    falha não entra no repositório, e a rota transforma a falha em recusa
    daquele arquivo sem invalidar os demais do mesmo envio.
    """
    nome = (nome_arquivo or "").strip()[:255]
    if not nome:
        raise DemandaValidationError("Informe o arquivo a enviar.")
    if not conteudo:
        raise DemandaValidationError(f"O arquivo {nome} está vazio.")
    if len(conteudo) > LIMITE_BYTES:
        raise DemandaValidationError(f"O arquivo {nome} excede o limite de {LIMITE_BYTES // 1024 // 1024} MB.")
    if not conteudo.startswith(ASSINATURA_PDF):
        raise DemandaValidationError(f"O arquivo {nome} não é um PDF.")
    digest = _sha256(conteudo).hexdigest()
    existente = repo.obter_por_sha256(digest)
    if existente:
        raise DemandaValidationError(f"Este PDF já está no repositório como {existente['nome_arquivo']}.")
    paginas, aviso = _inventariar(conteudo)
    try:
        analise = sei_processamento.analisar(conteudo, tipo_demanda, nome)
    except Exception as exc:
        # PDF cifrado levanta ValueError, mas arquivo corrompido vem como erro
        # do pymupdf. Qualquer falha de leitura vira recusa deste arquivo — nada
        # é gravado e os demais do mesmo envio seguem.
        raise DemandaValidationError(f"O arquivo {nome} não pôde ser lido: {exc}") from exc
    return repo.inserir(
        usuario_id=usuario_id, usuario_nome=usuario_nome or "", nome_arquivo=nome,
        sha256=digest, tamanho_bytes=len(conteudo), conteudo=conteudo,
        paginas=paginas, texto="", status="analisado",
        aviso=" ".join(analise["avisos"]) or aviso,
        numero_processo=analise["numero_processo"],
        tipo_demanda=tipo_demanda,
        campos_sugeridos=analise["campos_sugeridos"],
        evidencias=_evidencias_da_analise(analise),
        analise=analise,
    )


def listar() -> list[dict[str, Any]]:
    """Lista os documentos do repositório.

    O processo é gravado desde o recebimento; a derivação pelo nome do arquivo
    cobre os documentos recebidos antes disso, que têm a coluna nula no banco.
    """
    documentos = []
    for documento in repo.listar():
        if not documento.get("numero_processo"):
            numero = sei_processamento.numero_no_nome(documento.get("nome_arquivo"))
            if numero:
                documento = {**documento, "numero_processo": numero}
        documentos.append(documento)
    return documentos


def obter(documento_id: str) -> dict[str, Any]:
    documento = repo.obter(_identificador(documento_id))
    if not documento:
        raise DemandaNotFoundError("Documento não encontrado no repositório do SEI.")
    return documento


def arquivo(documento_id: str) -> tuple[str, bytes]:
    registro = repo.obter_conteudo(_identificador(documento_id))
    if not registro:
        raise DemandaNotFoundError("Documento não encontrado no repositório do SEI.")
    return registro["nome_arquivo"], bytes(registro["conteudo"])


def _conteudo(documento: dict[str, Any]) -> bytes:
    registro = repo.obter_conteudo(documento["id"])
    if not registro:
        raise DemandaNotFoundError("Conteúdo do documento não encontrado.")
    return bytes(registro["conteudo"])


def analisar(documento_id: str, tipo_demanda: sei_processamento.TipoDemanda = "projeto") -> dict[str, Any]:
    """Relê o PDF e regrava a leitura, com o tipo escolhido agora.

    É o caminho do Reanalisar: o documento já está no repositório com uma
    leitura gravada, e esta substitui a anterior.
    """
    documento = obter(documento_id)
    if documento["status"] == "demanda_criada":
        raise DemandaValidationError("Este documento já gerou demanda; a análise não é refeita.")
    try:
        # O nome do arquivo carrega o número do processo e, em anexo sem rótulo,
        # o único título de projeto que existe.
        analise = sei_processamento.analisar(_conteudo(documento), tipo_demanda, documento["nome_arquivo"])
    except ValueError as exc:
        raise DemandaValidationError(str(exc)) from exc
    evidencias = _evidencias_da_analise(analise)
    gravado = repo.marcar_analisado(
        documento["id"],
        numero_processo=analise["numero_processo"],
        tipo_demanda=tipo_demanda,
        campos_sugeridos=analise["campos_sugeridos"],
        evidencias=evidencias,
        analise=analise,
    )
    documento = gravado or documento
    return {
        **documento,
        "tipo_demanda": tipo_demanda,
        "numero_processo": analise["numero_processo"],
        "campos_sugeridos": analise["campos_sugeridos"],
        "evidencias": evidencias,
        "analise": analise,
        "aviso": " ".join(analise["avisos"]) or documento.get("aviso"),
        "ausentes": analise["ausentes"],
    }


def marcador_origem(documento: dict[str, Any]) -> str:
    # A leitura não é gravada: o número do processo é lido do PDF no momento da criação.
    numero = documento.get("numero_processo") or sei_processamento.numero_no_nome(documento.get("nome_arquivo"))
    if not numero:
        # Só lê o PDF de novo quando o nome do arquivo não traz o processo.
        try:
            numero = sei_processamento.numero_processo(_conteudo(documento))
        except (ValueError, DemandaNotFoundError):
            numero = None
    return f"Processo SEI: {numero}" if numero else f"Documento SEI: {documento['nome_arquivo']}"


def registrar_demanda(documento_id: str, demanda_id: str) -> dict[str, Any] | None:
    return repo.marcar_demanda(_identificador(documento_id), demanda_id)


def excluir(documento_id: str) -> None:
    documento = obter(documento_id)
    if documento["demanda_id"]:
        raise DemandaValidationError(f"Este documento originou a demanda {documento['demanda_id']} e não pode ser excluído.")
    if not repo.excluir(documento["id"]):
        raise DemandaNotFoundError("Documento não encontrado no repositório do SEI.")
