from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from api.codigos_demanda import (
    codigo_demanda_valido,
    gerar_codigo_plano,
    gerar_codigo_programa,
    gerar_codigo_projeto,
    tipo_demandante_do_codigo,
)
from api.schemas.demanda import DemandaCreateSchema
from api.schemas.plano import PlanoCreateSchema
from api.schemas.programa import ProgramaCreateSchema
from api.services import demanda_service


HEX = r"[0-9A-F]{8}"


def test_novos_codigos_incluem_tipo_do_demandante() -> None:
    assert re.fullmatch(rf"I-PLA-{HEX}", gerar_codigo_plano())
    assert re.fullmatch(rf"I-PRO-{HEX}", gerar_codigo_programa())
    assert re.fullmatch(rf"I-PRJ-{HEX}", gerar_codigo_projeto("institucional"))
    assert re.fullmatch(rf"P-PRJ-{HEX}", gerar_codigo_projeto("privada"))


@pytest.mark.parametrize(
    "codigo",
    [
        "I-PLA-0123ABCD",
        "I-PRO-0123ABCD",
        "I-PRJ-0123ABCD",
        "P-PRJ-0123ABCD",
        # Registros anteriores continuam legíveis.
        "PLA-0123ABCD",
        "PRO-0123ABCD",
        "PRJ-0123ABCD",
    ],
)
def test_validador_aceita_codigos_novos_e_legados(codigo: str) -> None:
    assert codigo_demanda_valido(codigo)


@pytest.mark.parametrize(
    "codigo",
    ["P-PLA-0123ABCD", "P-PRO-0123ABCD", "X-PRJ-0123ABCD", "I-PRJ-123"],
)
def test_validador_rejeita_combinacoes_incompativeis(codigo: str) -> None:
    assert not codigo_demanda_valido(codigo)


def test_tipo_do_demandante_e_inferido_do_codigo() -> None:
    assert tipo_demandante_do_codigo("P-PRJ-0123ABCD") == "privada"
    assert tipo_demandante_do_codigo("I-PRJ-0123ABCD") == "institucional"
    assert tipo_demandante_do_codigo("PRJ-0123ABCD") == "institucional"


def test_plano_e_programa_nao_aceitam_demandante_privado() -> None:
    plano = {
        "tipo_demandante": "privada",
        "diretoria_id": "DIR",
        "nome": "Plano",
        "descricao": "Descrição",
        "instituicao_id": "instituicao",
        "representante": {"nome": "Representante"},
    }
    programa = {
        "tipo_demandante": "privada",
        "nome": "Programa",
        "descricao": "Descrição",
        "instituicao_id": "instituicao",
        "representante": {"nome": "Representante"},
    }
    with pytest.raises(ValidationError):
        PlanoCreateSchema.model_validate(plano)
    with pytest.raises(ValidationError):
        ProgramaCreateSchema.model_validate(programa)


def test_projeto_aceita_os_dois_tipos_de_demandante() -> None:
    base = {
        "instituicao_id": "instituicao",
        "lat": -23.5,
        "lng": -46.6,
        "representante": {"nome": "Representante"},
        "diretoria_id": "DIR",
        "plano_id": "PLANO",
        "nome": "Projeto",
    }
    assert DemandaCreateSchema.model_validate(
        {**base, "tipo_demandante": "institucional"}
    ).tipo_demandante == "institucional"
    assert DemandaCreateSchema.model_validate(
        {**base, "tipo_demandante": "privada"}
    ).tipo_demandante == "privada"


@pytest.mark.parametrize(
    ("tipo_demandante", "prefixo"),
    [("institucional", "I-PRJ-"), ("privada", "P-PRJ-")],
)
def test_servico_usa_demandante_ao_gerar_codigo_do_projeto(
    monkeypatch: pytest.MonkeyPatch,
    tipo_demandante: str,
    prefixo: str,
) -> None:
    payload = DemandaCreateSchema.model_validate(
        {
            "tipo_demandante": tipo_demandante,
            "instituicao_id": "instituicao",
            "lat": -23.5,
            "lng": -46.6,
            "representante": {"nome": "Representante"},
            "diretoria_id": "DIR",
            "plano_id": "PLANO",
            "nome": "Projeto",
        }
    )
    monkeypatch.setattr(demanda_service.demanda_repository, "get_by_codigo", lambda _codigo: None)
    monkeypatch.setattr(
        demanda_service,
        "_build_persist_row",
        lambda _payload, codigo: {"codigo": codigo},
    )
    monkeypatch.setattr(demanda_service.demanda_repository, "insert", lambda row: row)
    monkeypatch.setattr(demanda_service, "_row_to_response", lambda row: row["codigo"])

    assert demanda_service.criar_demanda(payload).startswith(prefixo)
