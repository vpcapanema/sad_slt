"""Chaves determinísticas para ordenar atributos antes da paginação."""
import re
import unicodedata


def chave_ordenacao(value):
    if value is None:
        return (2, ())
    if isinstance(value, (int, float)):
        return (0, value)
    text = ''.join(c for c in unicodedata.normalize('NFD', str(value).casefold()) if not unicodedata.combining(c))
    return (1, tuple((0, int(p)) if p.isdigit() else (1, p) for p in re.split(r'(\d+)', text)))
