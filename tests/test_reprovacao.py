from __future__ import annotations

import pytest
from pydantic import ValidationError

from api.exceptions import DemandaValidationError
from api.server import app
from api.schemas.objeto_ahp import ReprovarDemandaSchema
from api.services.reprovacao import validar_reprovacao


def test_reprovacao_exige_justificativa_no_contrato_http() -> None:
    with pytest.raises(ValidationError):
        ReprovarDemandaSchema(justificativa="")


def test_reprovacao_recusa_justificativa_composta_por_espacos() -> None:
    with pytest.raises(DemandaValidationError, match="justificativa.*obrigatória"):
        validar_reprovacao("   ", None)


def test_reprovacao_normaliza_justificativa_e_usuario() -> None:
    usuario = "00000000-0000-0000-0000-000000000123"

    assert validar_reprovacao("  Parecer técnico desfavorável.  ", usuario) == (
        "Parecer técnico desfavorável.",
        usuario,
    )


def test_reprovacao_recusa_uuid_invalido() -> None:
    with pytest.raises(DemandaValidationError, match="UUID esperado"):
        validar_reprovacao("Parecer técnico desfavorável.", "usuario-invalido")


def test_rotas_de_reprovacao_exigem_corpo() -> None:
    paths = app.openapi()["paths"]

    for tipo in ("demandas", "planos", "programas"):
        operation = paths[f"/api/{tipo}/{{codigo}}/reprovar"]["post"]
        assert operation["requestBody"]["required"] is True
