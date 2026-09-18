"""Localização assistida da leitura de PDFs do SEI.

O município citado no documento delimita onde a coordenada pode estar; para
porto, a área se restringe à faixa litorânea desse município. Coordenada lida
fora da área é descartada, e sem coordenada utilizável sugere-se um ponto
estimado dentro da área — sempre marcado como estimativa, para o analista
conferir no mapa.

Dados: municípios de SP (database/geo/raw/municipio) e linha de costa
(database/geo/derived/linha_costa_sp.geojson, gerada por
scripts/gerar_linha_costa_sp.py). Ambos entram na imagem Docker.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import shapefile
from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform

_RAIZ = Path(__file__).resolve().parents[2]
_MUNICIPIOS = _RAIZ / "database/geo/raw/municipio/municipio.shp"
_COSTA = _RAIZ / "database/geo/derived/linha_costa_sp.geojson"

# Porto fica na beira-mar: a faixa descarta o interior do município.
FAIXA_LITORANEA_M = 3000
# Tolerância de borda (~50 m) para ponto sobre o limite desenhado.
_TOLERANCIA_GRAUS = 0.0005

# SIRGAS 2000 geográfico ↔ SIRGAS 2000 / UTM 23S (toda a costa paulista está no fuso 23).
_PARA_METROS = Transformer.from_crs("EPSG:4674", "EPSG:31983", always_xy=True).transform
_PARA_GRAUS = Transformer.from_crs("EPSG:31983", "EPSG:4674", always_xy=True).transform

# "Peruíbe-SP", "PERUIBE UF: SP", "Peruíbe/SP", "Peruíbe (SP)".
_UF_NO_FIM = re.compile(r"(?:\s+(?:uf|estado de|est))?\s+(?:sp|sao paulo)$")


def _chave(texto: str | None) -> str:
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", (texto or "").lower()) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", sem_acento)).strip()


@dataclass(frozen=True)
class Municipio:
    nome: str
    codigo_ibge: int
    geometria: Any


@dataclass(frozen=True)
class Area:
    geometria: Any
    descricao: str
    litoranea: bool


@lru_cache(maxsize=1)
def _municipios() -> dict[str, Municipio]:
    leitor = shapefile.Reader(str(_MUNICIPIOS), encoding="utf-8")
    return {
        _chave(registro["Municipio"]): Municipio(
            registro["Municipio"], int(registro["Cod_ibge"]), shape(forma.__geo_interface__)
        )
        for forma, registro in zip(leitor.shapes(), leitor.records())
    }


@lru_cache(maxsize=1)
def _costa_em_metros() -> Any:
    geometria = json.loads(_COSTA.read_text(encoding="utf-8"))["geometry"]
    return transform(_PARA_METROS, shape(geometria))


def municipio_por_nome(texto: str | None) -> Municipio | None:
    """Município de SP pelo nome, aceitando caixa, acento e UF no fim."""
    chave = _chave(texto)
    if not chave:
        return None
    base = _municipios()
    return base.get(chave) or base.get(_UF_NO_FIM.sub("", chave).strip())


def municipios_no_texto(texto: str | None) -> list[Municipio]:
    """Municípios citados por extenso num texto curto (nome do arquivo, título).

    Nome contido em outro achado maior não conta ("Santos" dentro de
    "Bom Jesus dos Perdões" não, mas em "São José dos Santos" sim, só o maior).
    """
    alvo = f" {_chave(texto)} "
    achados = [m for chave, m in _municipios().items() if len(chave) >= 4 and f" {chave} " in alvo]
    return [
        m for m in achados
        if not any(o is not m and f" {_chave(m.nome)} " in f" {_chave(o.nome)} " for o in achados)
    ]


def area_permitida(municipio: Municipio, litoral: bool = False) -> Area:
    """Área onde a coordenada pode estar: faixa litorânea (porto) ou limite municipal."""
    if litoral:
        em_metros = transform(_PARA_METROS, municipio.geometria)
        faixa = em_metros.intersection(_costa_em_metros().buffer(FAIXA_LITORANEA_M))
        if not faixa.is_empty and faixa.area > 0:
            return Area(
                transform(_PARA_GRAUS, faixa),
                f"faixa litorânea de {FAIXA_LITORANEA_M // 1000} km de {municipio.nome}",
                True,
            )
        # Município sem costa: vale o limite municipal.
    return Area(municipio.geometria, f"limite municipal de {municipio.nome}", False)


def contem(area: Area, lat: float, lng: float) -> bool:
    return area.geometria.buffer(_TOLERANCIA_GRAUS).covers(Point(lng, lat))


def ponto_estimado(area: Area) -> tuple[float, float]:
    """Ponto dentro da área: o centroide, ou o ponto representativo se ele cair fora."""
    centro = area.geometria.centroid
    ponto = centro if area.geometria.covers(centro) else area.geometria.representative_point()
    return round(ponto.y, 6), round(ponto.x, 6)
