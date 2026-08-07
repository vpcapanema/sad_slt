"""Derivação de colunas da matriz de critérios e premissas (Fase 3).

A partir da matriz enviada na gestão de hierarquizações, extrai as linhas de
``Etapa = Priorização`` (Fase 3) e as converte nas COLUNAS do complemento
``_tabela_atributos_objetos.html``:

- cabeçalho da coluna    = ``Métrica (o que é medido)`` (alias amigável);
- tipo de dado da célula = derivado de ``Unidade de medida``;
- direção de normalização= coluna ``Relação`` (↑/↓);
- interface de leitura   = coluna ``Variável (interface de leitura)``;
- selo obrigatório       = coluna ``Mandatório``.

Compartilhado entre o router ``atributos_objetos`` e o serviço de criação de
hierarquizações (que pré-cria os slots de atributo por objeto).
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any


def _norm(value: Any) -> str:
    texto = "" if value is None else str(value)
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return texto.strip().lower()


_ALIASES_COLUNA = {
    "etapa": ("etapa", "fase", "fase da hierarquizacao", "etapa_hierarquizacao", "fase_hierarquizacao"),
    "metrica": ("metrica (o que e medido)", "metrica", "metricas", "o que e medido"),
    "dado": ("dado",),
    "variavel": ("variavel (interface de leitura)", "interface de leitura", "variavel", "variavel medida", "variavel_medida"),
    "unidade": ("unidade de medida", "unidade", "unidade_medida", "un"),
    "relacao": ("relacao",),
    "mandatorio": ("mandatorio", "obrigatorio"),
    "dimensao": ("dimensao",),
    "criterio": ("criterio",),
    "premissa": ("premissa",),
}


def _resolver(row_norm: dict[str, Any], campo: str) -> Any:
    for alias in _ALIASES_COLUNA[campo]:
        if alias in row_norm and str(row_norm[alias]).strip():
            return row_norm[alias]
    return None


def _linhas_da_matriz(matriz: Any) -> list[dict[str, Any]]:
    """Aceita a matriz em formatos tolerantes e devolve a lista de linhas (dicts)."""
    if matriz is None:
        return []
    if isinstance(matriz, dict):
        for chave in ("linhas", "rows", "criterios", "matriz_premissas_criterios", "dados"):
            if isinstance(matriz.get(chave), list):
                matriz = matriz[chave]
                break
        else:
            matriz = [matriz]
    return [linha for linha in matriz if isinstance(linha, dict)]


def _row_normalizado(linha: dict[str, Any]) -> dict[str, Any]:
    return {_norm(chave): valor for chave, valor in linha.items()}


_TOKENS_BOOLEANO = ("sim/nao", "sim / nao", "sim-nao", "booleano", "bool")
_TOKENS_CATEGORICO = ("categoria", "classe", "nivel", "vocabulario", "ordinal", "escala")
_TOKENS_NUMERICO = (
    "r$", "real", "reais", "veic", "km", "metro", "min", "mes", "ano", "%",
    "indice", "numero", "ocorr", "razao", "hora", "tonelada", "kg", "v/c",
    "iri", "pci", "hab", "dia", "carga", "tkm", "km/h", "m/km", "unidade",
    "variancia", "b/c", "grau",
)
_TOKENS_INTEIRO = ("numero", "ocorr", "veic", "conex")


def _tipo_por_unidade(unidade: Any) -> tuple[str, str]:
    """Retorna (tipo, formato) do dado aceito na coluna, derivado da unidade."""
    u = _norm(unidade)
    if not u:
        return "texto", ""
    if any(tok in u for tok in _TOKENS_BOOLEANO):
        return "booleano", ""
    if any(tok in u for tok in _TOKENS_NUMERICO):
        if "r$" in u:  # valor monetário é sempre decimal
            return "numerico", "decimal"
        formato = "inteiro" if any(tok in u for tok in _TOKENS_INTEIRO) else "decimal"
        return "numerico", formato
    if any(tok in u for tok in _TOKENS_CATEGORICO):
        return "categorico", ""
    return "texto", ""


def _relacao(valor: Any) -> tuple[str, str]:
    bruto = "" if valor is None else str(valor)
    r = _norm(bruto)
    if "↑" in bruto or "positiv" in r or "maior" in r:
        return "maior_melhor", "↑"
    if "↓" in bruto or "negativ" in r or "menor" in r:
        return "menor_melhor", "↓"
    return "neutro", ""


def _e_etapa3(valor: Any) -> bool:
    v = _norm(valor).replace(" ", "").replace("-", "_")
    if "prioriza" in v:
        return True
    return v in {"3", "fase3", "fase_3", "etapa3", "etapa_3", "ajuste", "ajuste_fino", "priorizacao_final"}


def _mandatorio(valor: Any) -> bool:
    return _norm(valor) in {"sim", "s", "true", "1", "obrigatorio"}


_PREFIXOS_VARIAVEL = (
    "valor por celula de 100x100 m do raster de ",
    "valor por celula de 100x100 m da superficie de ",
    "valor espacial da superficie de ",
    "valor espacial da superficie ",
    "valor da superficie de ",
    "superficie continua de ",
    "valor de ",
)


def _alias(variavel: Any, criterio: Any, limite: int = 48) -> str:
    base = str(variavel or criterio or "").strip()
    baixo = _norm(base)
    for prefixo in _PREFIXOS_VARIAVEL:
        if baixo.startswith(prefixo):
            base = base[len(prefixo):].strip()
            break
    if not base:
        return "Atributo"
    if len(base) <= limite:
        return base
    corte = base[:limite].rsplit(" ", 1)[0]
    return f"{corte}…"


def _slug(texto: str, usados: set[str]) -> str:
    base = _norm(texto)
    base = re.sub(r"[^a-z0-9]+", "_", base).strip("_") or "attr"
    slug = base
    i = 2
    while slug in usados:
        slug = f"{base}_{i}"
        i += 1
    usados.add(slug)
    return slug


def extrair_colunas(matriz: Any) -> list[dict[str, Any]]:
    """Colunas de Etapa 3 (Priorização) derivadas da matriz de critérios e premissas."""
    colunas: list[dict[str, Any]] = []
    usados: set[str] = set()
    for linha in _linhas_da_matriz(matriz):
        rn = _row_normalizado(linha)
        if not _e_etapa3(_resolver(rn, "etapa")):
            continue
        metrica = _resolver(rn, "metrica")
        dado = _resolver(rn, "dado")
        interface = _resolver(rn, "variavel")
        criterio = _resolver(rn, "criterio")
        medido = metrica or dado or interface
        if not (medido or criterio):
            continue
        unidade = _resolver(rn, "unidade")
        tipo, formato = _tipo_por_unidade(unidade)
        relacao, simbolo = _relacao(_resolver(rn, "relacao"))
        alias = _alias(medido, criterio)
        colunas.append({
            "id": _slug(str(medido or criterio), usados),
            "variavel": str(medido).strip() if medido else None,
            "alias": alias,
            "unidade": str(unidade).strip() if unidade else None,
            "tipo": tipo,
            "formato": formato,
            "relacao": relacao,
            "relacao_simbolo": simbolo,
            "mandatorio": _mandatorio(_resolver(rn, "mandatorio")),
            "dimensao": (str(_resolver(rn, "dimensao")).strip() or None) if _resolver(rn, "dimensao") else None,
            "criterio": str(criterio).strip() if criterio else None,
            "premissa": (str(_resolver(rn, "premissa")).strip() or None) if _resolver(rn, "premissa") else None,
            "interface": str(interface).strip() if interface else None,
        })
    return colunas
