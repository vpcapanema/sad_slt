"""Normalização de textos — português brasileiro (norma culta)."""
from __future__ import annotations

import re
from typing import Any

_RE_ESPACOS = re.compile(r"\s+")
_RE_ESPACO_PONTUACAO = re.compile(r"\s+([,.;:!?])")
_RE_PONTUACAO_COLADA = re.compile(r"([,.;:!?])(?=[^\s])")


def _colapsar(texto: str) -> str:
    return _RE_ESPACOS.sub(" ", texto.replace("\u00a0", " ").strip())


def _corrigir_pontuacao(texto: str) -> str:
    t = _RE_ESPACO_PONTUACAO.sub(r"\1", texto)
    t = _RE_PONTUACAO_COLADA.sub(r"\1 ", t)
    return _colapsar(t)


def normalizar_titulo(texto: str | None) -> str | None:
    if texto is None:
        return None
    t = _corrigir_pontuacao(str(texto))
    if not t:
        return None
    return re.sub(r"[.!?]+$", "", t).strip() or None


def normalizar_paragrafo(texto: str | None) -> str | None:
    if texto is None:
        return None
    t = _corrigir_pontuacao(str(texto))
    if not t:
        return None
    if not re.search(r"[.!?]$", t):
        t += "."
    return t


def normalizar_campo(texto: str | None) -> str | None:
    if texto is None:
        return None
    t = _corrigir_pontuacao(str(texto))
    if not t:
        return None
    return re.sub(r"[.!?]+$", "", t).strip() or None


def normalizar_criterio_row(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    if out.get("criterio") is not None:
        out["criterio"] = normalizar_campo(str(out["criterio"])) or out["criterio"]
    if out.get("premissa") is not None:
        out["premissa"] = normalizar_paragrafo(str(out["premissa"])) or out["premissa"]
    if out.get("dimensao") is not None:
        out["dimensao"] = normalizar_campo(str(out["dimensao"])) or out["dimensao"]
    if out.get("metricas") is not None:
        out["metricas"] = normalizar_campo(str(out["metricas"]))
    if out.get("fonte") is not None:
        out["fonte"] = _colapsar(str(out["fonte"])) or None
    if out.get("relacao") is not None:
        out["relacao"] = _colapsar(str(out["relacao"])) or out["relacao"]
    if out.get("mandatorio") is not None:
        out["mandatorio"] = _colapsar(str(out["mandatorio"])) or out["mandatorio"]
    return out


def normalizar_criterios(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
    if rows is None:
        return None
    return [normalizar_criterio_row(r) for r in rows if isinstance(r, dict)]
