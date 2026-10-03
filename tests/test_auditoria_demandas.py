from __future__ import annotations

import pytest

from api.routers import demandas as demandas_router
from api.routers import planos as planos_router
from api.routers import programas as programas_router
from api.schemas.objeto_ahp import AprovarDemandaSchema, ReprovarDemandaSchema
from api.services import campos_demanda
from api.services.session_service import SessionUser


PESSOA_ID = "00000000-0000-0000-0000-000000000001"
USUARIO_ID = "00000000-0000-0000-0000-000000000010"


@pytest.mark.parametrize(
    "normalizar",
    [
        campos_demanda.normalizar_plano,
        campos_demanda.normalizar_programa,
        campos_demanda.normalizar_projeto,
    ],
)
def test_autoria_usa_id_do_usuario_sem_substituir_representante(normalizar):
    row = {"representante_nome": "Representante Legal"}

    normalizar(row, pessoa_id=PESSOA_ID, usuario_id=USUARIO_ID)

    assert row["sigma_pessoa_id"] == PESSOA_ID
    assert row["criado_por"] == USUARIO_ID
    assert row["atualizado_por"] == USUARIO_ID


def test_resolve_nomes_completos_sem_alterar_ids(monkeypatch):
    monkeypatch.setattr(
        campos_demanda.sigma_usuario_repository,
        "nomes_por_ids",
        lambda ids: {USUARIO_ID: "Usuária Operadora"},
    )
    monkeypatch.setattr(
        campos_demanda.sigma_cadastro_repository,
        "nomes_pessoas_por_ids",
        lambda ids: {PESSOA_ID: "Representante Legal"},
    )
    row = {
        "sigma_pessoa_id": PESSOA_ID,
        "representante_nome": "Nome desatualizado",
        "criado_por": USUARIO_ID,
        "atualizado_por": USUARIO_ID,
        "aprovado_por": None,
        "reprovado_por": None,
    }

    result = campos_demanda.resolver_nomes_registros([row])[0]

    assert result["sigma_pessoa_id"] == PESSOA_ID
    assert result["criado_por"] == USUARIO_ID
    assert result["representante_nome_completo"] == "Representante Legal"
    assert result["criado_por_nome"] == "Usuária Operadora"
    assert result["atualizado_por_nome"] == "Usuária Operadora"


@pytest.mark.parametrize(
    ("router", "service_name", "operation", "body", "author_field"),
    [
        (demandas_router, "objeto_ahp_service", "aprovar_demanda", AprovarDemandaSchema(aprovado_por=PESSOA_ID), "aprovado_por"),
        (planos_router, "plano_service", "aprovar_plano", AprovarDemandaSchema(aprovado_por=PESSOA_ID), "aprovado_por"),
        (programas_router, "programa_service", "aprovar_programa", AprovarDemandaSchema(aprovado_por=PESSOA_ID), "aprovado_por"),
        (demandas_router, "demanda_service", "reprovar_demanda", ReprovarDemandaSchema(justificativa="Motivo", reprovado_por=PESSOA_ID), "reprovado_por"),
        (planos_router, "plano_service", "reprovar_plano", ReprovarDemandaSchema(justificativa="Motivo", reprovado_por=PESSOA_ID), "reprovado_por"),
        (programas_router, "programa_service", "reprovar_programa", ReprovarDemandaSchema(justificativa="Motivo", reprovado_por=PESSOA_ID), "reprovado_por"),
    ],
)
def test_moderation_authorship_uses_session_user_not_payload(
    monkeypatch, router, service_name, operation, body, author_field
):
    captured = {}
    service = getattr(router, service_name)

    def record(*_args, **kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(service, operation, record)
    user = SessionUser(
        id=USUARIO_ID,
        email="operador@example.org",
        username="teste_operador",
        nome="Usuária Operadora",
        tipo_usuario="ANALISTA",
    )

    getattr(router, operation)("I-PRJ-TESTE", body, user)

    assert captured[author_field] == USUARIO_ID