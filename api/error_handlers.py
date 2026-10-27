"""Tratamento central de erros HTTP: mensagens legíveis e específicas, sem vazar segredos.

Contrato preservado: toda resposta de erro continua com ``detail``. Acrescentam-se
``message`` (texto legível em português), ``status`` e ``path``. Em 422 de validação,
``detail`` segue a lista estruturada do FastAPI (``loc``/``msg``/``type``) enriquecida
com ``campo``, ``mensagem`` e ``valor_recebido``.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("sicard.erros")

_MAX_VALOR = 120
_MAX_MSG = 500

_SEGREDOS = re.compile(
    r"(?i)(password|passwd|pwd|senha|secret|token|api[_-]?key|authorization)(\s*[=:]\s*)([^\s,;&'\"]+)"
)
_URL_CRED = re.compile(r"(?i)([a-z][a-z0-9+.-]*://[^/\s:@]+:)([^@\s]+)(@)")

_FRASES_HTTP = {
    "not found": "Recurso não encontrado",
    "method not allowed": "Método HTTP não permitido para este recurso",
    "unprocessable entity": "Dados enviados não puderam ser processados",
    "internal server error": "Erro interno do servidor",
    "bad request": "Requisição inválida",
    "forbidden": "Acesso negado a este recurso",
    "unauthorized": "Autenticação necessária ou expirada",
    "bad gateway": "Falha ao comunicar com um serviço dependente",
    "service unavailable": "Serviço temporariamente indisponível",
}

_TIPOS = {
    "missing": "campo obrigatório ausente",
    "string_too_short": "texto curto demais",
    "string_too_long": "texto longo demais",
    "string_type": "esperado texto",
    "int_type": "esperado número inteiro",
    "int_parsing": "não é um número inteiro válido",
    "float_type": "esperado número",
    "float_parsing": "não é um número válido",
    "bool_type": "esperado verdadeiro/falso",
    "bool_parsing": "não é um valor booleano válido",
    "uuid_parsing": "não é um UUID válido",
    "uuid_type": "esperado UUID",
    "list_type": "esperado uma lista",
    "dict_type": "esperado um objeto",
    "json_invalid": "JSON malformado",
    "literal_error": "valor fora das opções permitidas",
    "enum": "valor fora das opções permitidas",
    "greater_than": "valor menor ou igual ao limite inferior",
    "greater_than_equal": "valor abaixo do mínimo",
    "less_than": "valor maior ou igual ao limite superior",
    "less_than_equal": "valor acima do máximo",
    "too_short": "poucos itens",
    "too_long": "itens demais",
    "string_pattern_mismatch": "formato inválido",
    "value_error": "valor inválido",
    "datetime_parsing": "data/hora inválida",
    "date_parsing": "data inválida",
    "model_attributes_type": "esperado um objeto",
}


def sanitizar(texto: Any, limite: int = _MAX_MSG) -> str:
    """Remove credenciais conhecidas e limita o tamanho do texto exibido."""
    valor = _URL_CRED.sub(r"\1***\3", str(texto))
    valor = _SEGREDOS.sub(r"\1\2***", valor)
    return valor if len(valor) <= limite else valor[: limite - 1] + "…"


def _valor_legivel(valor: Any) -> Any:
    if valor is None or isinstance(valor, (bool, int, float)):
        return valor
    if isinstance(valor, (str, bytes)):
        return sanitizar(valor if isinstance(valor, str) else f"<{len(valor)} bytes>", _MAX_VALOR)
    return sanitizar(repr(valor), _MAX_VALOR)


def _campo(loc: Any) -> str:
    partes = [str(p) for p in (loc or ())]
    origem = {"body", "query", "path", "header", "cookie", "form"}
    nome = ".".join(p for i, p in enumerate(partes) if not (i == 0 and p in origem))
    return nome or (partes[0] if partes else "(requisição)")


def _origem(loc: Any) -> str:
    primeiro = str((loc or ("",))[0])
    return {"body": "corpo", "query": "parâmetro de consulta", "path": "parâmetro de rota",
            "header": "cabeçalho", "cookie": "cookie", "form": "formulário"}.get(primeiro, "")


def _esperado(erro: dict[str, Any]) -> str:
    ctx = erro.get("ctx") or {}
    for chave, rotulo in (("min_length", "mínimo de caracteres/itens"), ("max_length", "máximo de caracteres/itens"),
                          ("ge", "mínimo"), ("gt", "maior que"), ("le", "máximo"), ("lt", "menor que"),
                          ("pattern", "padrão"), ("expected", "opções válidas")):
        if chave in ctx:
            return f"{rotulo}: {sanitizar(ctx[chave], 80)}"
    return ""


def formatar_erros_validacao(erros: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Enriquece erros Pydantic mantendo ``loc``/``msg``/``type`` originais."""
    saida: list[dict[str, Any]] = []
    for erro in erros:
        loc = list(erro.get("loc") or [])
        tipo = str(erro.get("type") or "")
        motivo = _TIPOS.get(tipo) or _TIPOS.get(tipo.split(".")[-1]) or sanitizar(erro.get("msg") or "valor inválido", 200)
        esperado = _esperado(erro)
        campo = _campo(loc)
        item: dict[str, Any] = {
            "loc": [p if isinstance(p, int) else str(p) for p in loc],
            "msg": sanitizar(erro.get("msg") or "", 300),
            "type": tipo,
            "campo": campo,
            "origem": _origem(loc),
        }
        if "input" in erro and tipo != "missing":
            item["valor_recebido"] = _valor_legivel(erro.get("input"))
        texto = f"Campo '{campo}': {motivo}"
        if "valor_recebido" in item:
            texto += f" (recebido: {item['valor_recebido']!r})"
        if esperado:
            texto += f" [{esperado}]"
        item["mensagem"] = texto
        saida.append(item)
    return saida


def mensagem_validacao(itens: list[dict[str, Any]], metodo: str, caminho: str) -> str:
    resumo = "; ".join(i["mensagem"] for i in itens[:5])
    if len(itens) > 5:
        resumo += f"; … e mais {len(itens) - 5} erro(s)"
    return f"Requisição {metodo} {caminho} rejeitada (HTTP 422): {resumo or 'dados inválidos'}"


def _enriquecer_http(detail: Any, status: int, metodo: str, caminho: str) -> Any:
    """Troca frases HTTP genéricas por texto específico; preserva o restante."""
    if detail is None or (isinstance(detail, str) and (not detail.strip() or detail.strip().lower() in _FRASES_HTTP)):
        base = _FRASES_HTTP.get(str(detail or "").strip().lower(), "Requisição não concluída")
        return f"{base}: {metodo} {caminho} (HTTP {status})."
    return detail


async def tratar_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    itens = formatar_erros_validacao(exc.errors())
    mensagem = mensagem_validacao(itens, request.method, request.url.path)
    logger.warning("Validação 422: %s", mensagem)
    return JSONResponse(status_code=422, content=jsonable_encoder(
        {"detail": itens, "message": mensagem, "status": 422, "path": request.url.path}))


async def tratar_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = _enriquecer_http(exc.detail, exc.status_code, request.method, request.url.path)
    content: dict[str, Any] = {"detail": detail, "status": exc.status_code, "path": request.url.path}
    if isinstance(detail, str):
        content["message"] = detail
    causa = exc.__cause__
    if causa is not None and (getattr(causa, "field", None) or getattr(causa, "sugestao", None)):
        if getattr(causa, "field", None):
            content["campo"] = causa.field
        if getattr(causa, "sugestao", None):
            content["sugestao"] = causa.sugestao
    return JSONResponse(content=jsonable_encoder(content), status_code=exc.status_code,
                        headers=getattr(exc, "headers", None))


async def tratar_inesperado(request: Request, exc: Exception) -> JSONResponse:
    """Erro não previsto: causa resumida ao cliente; stack trace apenas no log."""
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    mensagem = (f"Erro interno ao executar {request.method} {request.url.path} (HTTP 500): "
                f"{type(exc).__name__}: {sanitizar(exc, 300) or 'sem mensagem'}. "
                "Detalhes técnicos foram registrados no log do servidor.")
    return JSONResponse(status_code=500, content={"detail": mensagem, "message": mensagem,
                                                  "status": 500, "path": request.url.path,
                                                  "tipo": type(exc).__name__})


def registrar_tratadores(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, tratar_validacao)
    app.add_exception_handler(StarletteHTTPException, tratar_http)
    app.add_exception_handler(Exception, tratar_inesperado)
