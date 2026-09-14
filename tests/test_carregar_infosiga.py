from __future__ import annotations

from types import SimpleNamespace

import pytest

from scripts.carregar_infosiga import ANO_MAXIMO, normalizar_nome, numero_trecho, trecho_id


def test_ano_maximo_exclui_2026() -> None:
    assert ANO_MAXIMO == 2025


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("São João da Boa Vista", "SAO JOAO DA BOA VISTA"),
        ("  Embu-Guaçu  ", "EMBU GUACU"),
    ],
)
def test_normalizar_nome(entrada: str, esperado: str) -> None:
    assert normalizar_nome(entrada) == esperado


def test_numero_trecho_repete_convencao_da_aplicacao() -> None:
    assert numero_trecho(557.50) == "557.5"
    assert numero_trecho(558.214) == "558.21"


def test_trecho_id_repete_convencao_da_aplicacao() -> None:
    registro = SimpleNamespace(
        Subtrecho="310SPE5865",
        Rodovia="sp 310",
        KmInicial=557.5,
        KmFinal=558.21,
    )
    assert trecho_id(registro) == "310SPE5865 | SP 310 km 557.5-558.21"
