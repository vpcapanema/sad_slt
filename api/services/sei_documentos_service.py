"""Repositório de PDFs recebidos do SEI e sugestão de campos da demanda.

O analista envia o PDF da solicitação que chegou pelo SEI. O sistema guarda o
arquivo, extrai o texto e, sob comando, aplica as regras determinísticas de
`sei_extracao_campos` para sugerir o preenchimento do cadastro. A criação da
demanda continua sendo ato do analista, pelos serviços normais de plano,
programa e projeto.

Nada aqui adivinha conteúdo: PDF sem camada de texto fica marcado como tal e
não produz sugestão alguma. Não há reconhecimento óptico no projeto.
"""
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
from api.services import sei_extracao_campos

# O binário vai para o banco; o teto evita que um anexo grande ocupe a conexão
# e o backup. O envio é em lote, então o proxy da VM precisa aceitar o corpo
# inteiro: `client_max_body_size` em .deploy/nginx/sicard-subpath.conf tem de
# ficar acima de LIMITE_LOTE_BYTES, senão o nginx corta antes da aplicação.
LIMITE_BYTES = 20 * 1024 * 1024
LIMITE_LOTE_BYTES = 60 * 1024 * 1024
LIMITE_PAGINAS = 100
ASSINATURA_PDF = b"%PDF-"


_TRAVAS: dict[str, Lock] = defaultdict(Lock)
_TRAVA_GERAL = Lock()


@contextmanager
def travar(documento_id: str) -> Iterator[None]:
    """Serializa a criação de demanda de um mesmo documento no processo.

    O duplo clique já é barrado no formulário e o vínculo em banco só aceita a
    primeira gravação; esta trava evita o caso intermediário — duas requisições
    simultâneas criando demandas antes de qualquer vínculo existir.
    """
    with _TRAVA_GERAL:
        trava = _TRAVAS[_identificador(documento_id)]
    with trava:
        yield


def _identificador(documento_id: str) -> str:
    try:
        return str(UUID(str(documento_id)))
    except (ValueError, TypeError) as exc:
        raise DemandaValidationError("Identificador de documento inválido.") from exc


def _ler_pdf(conteudo: bytes) -> tuple[int | None, str, str | None]:
    """Retorna páginas, texto e aviso. Falha de leitura não derruba o envio."""
    from pypdf import PdfReader

    try:
        leitor = PdfReader(io.BytesIO(conteudo))
        if leitor.is_encrypted:
            return None, "", "PDF protegido por senha: o texto não pôde ser lido."
        paginas = len(leitor.pages)
        texto = "\n".join(pagina.extract_text() or "" for pagina in leitor.pages[:LIMITE_PAGINAS])
    except Exception:
        return None, "", "O PDF não pôde ser interpretado; confira o arquivo no SEI."
    aviso = None
    if paginas > LIMITE_PAGINAS:
        aviso = f"PDF com {paginas} páginas: apenas as {LIMITE_PAGINAS} primeiras foram lidas."
    if not texto.strip():
        aviso = "PDF sem texto extraível (provável digitalização). Nenhum campo pode ser sugerido."
    return paginas, texto, aviso


def receber(*, conteudo: bytes, nome_arquivo: str, usuario_id: str, usuario_nome: str) -> dict[str, Any]:
    nome = (nome_arquivo or "").strip()[:255]
    if not nome:
        raise DemandaValidationError("Informe o arquivo a enviar.")
    if not conteudo:
        raise DemandaValidationError(f"O arquivo {nome} está vazio.")
    if len(conteudo) > LIMITE_BYTES:
        limite_mb = LIMITE_BYTES // (1024 * 1024)
        raise DemandaValidationError(f"O arquivo {nome} excede o limite de {limite_mb} MB.")
    # A extensão não prova o formato; a assinatura do arquivo, sim.
    if not conteudo.startswith(ASSINATURA_PDF):
        raise DemandaValidationError(f"O arquivo {nome} não é um PDF.")

    digest = _sha256(conteudo).hexdigest()
    existente = repo.obter_por_sha256(digest)
    if existente:
        raise DemandaValidationError(
            f"Este PDF já está no repositório como {existente['nome_arquivo']}."
        )

    paginas, texto, aviso = _ler_pdf(conteudo)
    return repo.inserir(
        usuario_id=usuario_id,
        usuario_nome=usuario_nome or "",
        nome_arquivo=nome,
        sha256=digest,
        tamanho_bytes=len(conteudo),
        conteudo=conteudo,
        paginas=paginas,
        texto=texto,
        status="recebido" if texto.strip() else "sem_texto",
        aviso=aviso,
    )


def listar() -> list[dict[str, Any]]:
    return repo.listar()


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


def analisar(documento_id: str) -> dict[str, Any]:
    """Aplica as regras de extração ao texto já armazenado."""
    documento = obter(documento_id)
    if documento["status"] == "demanda_criada":
        raise DemandaValidationError("Este documento já gerou demanda; a análise não é refeita.")
    if not (documento.get("texto") or "").strip():
        raise DemandaValidationError(
            "Este PDF não tem texto extraível. Preencha o formulário manualmente."
        )
    leitura = sei_extracao_campos.extrair_campos(documento["texto"])
    atualizado = repo.salvar_analise(
        documento_id=documento["id"],
        status="analisado",
        numero_processo=leitura["numero_processo"],
        campos_sugeridos=leitura["campos"],
        evidencias=leitura["evidencias"],
    )
    if not atualizado:
        raise DemandaNotFoundError("Documento não encontrado no repositório do SEI.")
    atualizado["ausentes"] = leitura["ausentes"]
    return atualizado


def analisar_pendentes() -> dict[str, Any]:
    """Comando em lote sobre os documentos ainda não analisados."""
    analisados, ignorados = [], []
    for documento in repo.listar():
        if documento["status"] != "recebido":
            ignorados.append(str(documento["id"]))
            continue
        try:
            analisados.append(analisar(str(documento["id"])))
        except DemandaValidationError:
            ignorados.append(str(documento["id"]))
    return {"analisados": analisados, "ignorados": ignorados}


def marcador_origem(documento: dict[str, Any]) -> str:
    """Rastreabilidade legível dentro da descrição da demanda."""
    numero = documento.get("numero_processo")
    if numero:
        return f"Processo SEI: {numero}"
    return f"Documento SEI: {documento['nome_arquivo']}"


def registrar_demanda(documento_id: str, demanda_id: str) -> dict[str, Any] | None:
    """Vincula a demanda criada. Devolve None quando já havia vínculo."""
    return repo.marcar_demanda(_identificador(documento_id), demanda_id)


def excluir(documento_id: str) -> None:
    documento = obter(documento_id)
    if documento["demanda_id"]:
        raise DemandaValidationError(
            f"Este documento originou a demanda {documento['demanda_id']} e não pode ser excluído."
        )
    if not repo.excluir(documento["id"]):
        raise DemandaNotFoundError("Documento não encontrado no repositório do SEI.")
