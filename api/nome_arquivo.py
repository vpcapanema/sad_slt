"""Nomes portáteis das saídas entregues pelo SICARD."""

import re
import unicodedata


def _parte(valor: str | None, caracteres: str) -> str:
    texto = unicodedata.normalize('NFKD', str(valor or ''))
    texto = re.sub(r'[\u0300-\u036f]', '', texto)
    return re.sub(f'[^A-Za-z0-9{caracteres}]+', '_', texto).strip('_-')


def nome_arquivo(registro: str | None, produto: str, extensao: str, *, referencia: str | None = None) -> str:
    """Preserva a grafia do registro e reserva espaço para o produto e a extensão."""
    sufixo = extensao.lower().lstrip('.')
    if not re.fullmatch(r'[a-z0-9]+(?:\.[a-z0-9]+)*', sufixo) or len(sufixo) > 30:
        raise ValueError('Extensão de arquivo inválida.')
    prefixo = _parte(registro, '-') or _parte(referencia, '-') or 'SICARD'
    descricao = _parte(produto, '').lower()[:60].rstrip('_') or 'arquivo'
    limite = 118 - len(descricao) - len(sufixo)
    return f'{prefixo[:limite].rstrip("_-")}_{descricao}.{sufixo}'


def anexo(nome: str) -> str:
    return f'attachment; filename="{nome}"'
