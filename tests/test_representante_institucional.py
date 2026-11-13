from types import SimpleNamespace

import pytest

from api.exceptions import DemandaValidationError
from api.schemas.demanda import DemandaCreateSchema
from api.schemas.plano import PlanoCreateSchema
from api.schemas.programa import ProgramaCreateSchema
from api.services import demanda_service, plano_service, programa_service
from api.services.patch_helpers import apply_representante, resolve_representante

INTERESSADA = "00000000-0000-0000-0000-000000000001"
REPRESENTANTE = "00000000-0000-0000-0000-000000000002"
AUTOR = "00000000-0000-0000-0000-000000000003"


@pytest.mark.parametrize("tipo", ["demanda", "plano", "programa"])
@pytest.mark.parametrize("institucional", [True, False])
def test_creation_preserves_representative_and_interested_institution(monkeypatch, tipo, institucional):
    services = {"demanda": demanda_service, "plano": plano_service, "programa": programa_service}
    schemas = {"demanda": DemandaCreateSchema, "plano": PlanoCreateSchema, "programa": ProgramaCreateSchema}
    service = services[tipo]
    rep = {"instituicao_id" if institucional else "pessoa_id": REPRESENTANTE, "nome": "Representante"}
    payload = schemas[tipo](nome="Teste", descricao="Teste", diretoria_id="DIR", plano_id="PLANO",
                            lat=-23, lng=-46, instituicao_id=INTERESSADA, representante=rep)
    if tipo == "demanda":
        monkeypatch.setattr(service, "resolve_programa_pai_id", lambda **kw: None)
        monkeypatch.setattr(service.plano_repository, "get_by_codigo", lambda _: {"diretoria_id": "DIR"})
        row = service._build_persist_row(payload, "I-PRJ-TESTE", AUTOR)
    else:
        repo = getattr(service, tipo + "_repository")
        monkeypatch.setattr(service, "gerar_codigo_unico", lambda *a: "I-PLA-TESTE")
        monkeypatch.setattr(repo, "insert", lambda row, *a, **kw: row)
        monkeypatch.setattr(service, "_row_to_response", lambda row, **kw: row)
        if tipo == "programa":
            monkeypatch.setattr(service, "resolve_plano_pai_id", lambda **kw: "PLANO")
        row = getattr(service, "criar_" + tipo)(payload, usuario_id=AUTOR)
    assert row["sigma_instituicao_id"] == INTERESSADA
    assert row["representante_instituicao_id"] == (REPRESENTANTE if institucional else None)
    assert row["sigma_pessoa_id"] == (None if institucional else REPRESENTANTE)
    assert row["criado_por"] == AUTOR


@pytest.mark.parametrize("pessoa,instituicao", [(None, None), (REPRESENTANTE, INTERESSADA), (None, "invalid")])
def test_rejects_missing_ambiguous_or_invalid_representative(pessoa, instituicao):
    payload = SimpleNamespace(pessoa_id=pessoa, representante=SimpleNamespace(pessoa_id=None, instituicao_id=instituicao))
    with pytest.raises(DemandaValidationError):
        resolve_representante(payload)


def test_switching_representative_clears_previous_kind():
    data = {"representante": {"instituicao_id": REPRESENTANTE, "nome": "Instituicao"}}
    apply_representante(data, data)
    assert data["sigma_pessoa_id"] is None
    assert data["representante_instituicao_id"] == REPRESENTANTE
    data = {"representante": {"pessoa_id": REPRESENTANTE, "nome": "Pessoa"}}
    apply_representante(data, data)
    assert data["representante_instituicao_id"] is None
    assert data["sigma_pessoa_id"] == REPRESENTANTE
