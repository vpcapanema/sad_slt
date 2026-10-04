from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from api.exceptions import DemandaValidationError
from api.schemas.agrupamento_demanda import AgrupamentoDemandaCreateSchema
from api.schemas.universo import UniversoItemSchema
from api.services import agrupamento_demanda_service as service


def _user():
    return SimpleNamespace(id=uuid4())


def _universe_item(code: str, *, tipo: str = "projeto") -> UniversoItemSchema:
    return UniversoItemSchema(
        id=str(uuid4()),
        codigo=code,
        nome=f"Demanda {code}",
        status="analise_aprovada",
        tipo_demanda=tipo,
        descricao="Descrição confiável do banco",
    )


def test_criar_salva_snapshot_das_demandas_elegiveis(monkeypatch: pytest.MonkeyPatch) -> None:
    item = _universe_item("I-PRJ-001")
    monkeypatch.setattr(service.universo_service, "listar_universo", lambda tipo: [item])
    capturado = {}

    def inserir(data):
        capturado.update(data)
        return {
            **data,
            "id": uuid4(),
            "quantidade_demandas": len(data["objetos"]),
            "criado_em": datetime.now(timezone.utc),
            "atualizado_em": datetime.now(timezone.utc),
        }

    monkeypatch.setattr(service.repo, "insert", inserir)
    payload = AgrupamentoDemandaCreateSchema(
        nome="Grupo de teste",
        descricao="Descrição do grupo",
        tipo_demanda="projeto",
        demanda_ids=[item.id],
    )

    result = service.criar(payload, user=_user())

    assert result["nome"] == "Grupo de teste"
    assert result["tipo_demanda"] == "projeto"
    assert result["quantidade_demandas"] == 1
    assert result["objetos"][0]["descricao"] == "Descrição confiável do banco"
    assert capturado["codigo"].startswith("AGR-")


def test_criar_rejeita_demanda_fora_do_universo_elegivel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service.universo_service, "listar_universo", lambda _tipo: [])
    monkeypatch.setattr(service.repo, "insert", lambda _data: pytest.fail("não deveria gravar"))
    payload = AgrupamentoDemandaCreateSchema(
        nome="Grupo inválido",
        tipo_demanda="projeto",
        demanda_ids=[str(uuid4())],
    )

    with pytest.raises(DemandaValidationError, match="não estão mais elegíveis"):
        service.criar(payload, user=_user())


def test_criar_rejeita_ids_duplicados(monkeypatch: pytest.MonkeyPatch) -> None:
    item = _universe_item("I-PRJ-001")
    monkeypatch.setattr(service.universo_service, "listar_universo", lambda _tipo: [item])
    monkeypatch.setattr(service.repo, "insert", lambda _data: pytest.fail("não deveria gravar"))
    payload = AgrupamentoDemandaCreateSchema(
        nome="Grupo duplicado",
        tipo_demanda="projeto",
        demanda_ids=[item.id, item.id],
    )

    with pytest.raises(DemandaValidationError, match="repetidas"):
        service.criar(payload, user=_user())


def test_obter_serializa_id_e_retorna_objetos(monkeypatch: pytest.MonkeyPatch) -> None:
    agrupamento_id = uuid4()
    row = {
        "id": agrupamento_id,
        "codigo": "AGR-TESTE",
        "nome": "Grupo salvo",
        "descricao": None,
        "tipo_demanda_id": 1,
        "objetos": [{"id": "1", "codigo": "PLANO-1"}],
        "quantidade_demandas": 1,
        "criado_em": datetime.now(timezone.utc),
        "atualizado_em": datetime.now(timezone.utc),
    }
    monkeypatch.setattr(service.repo, "get_by_id", lambda _id: row)

    result = service.obter(UUID(str(agrupamento_id)))

    assert result["id"] == str(agrupamento_id)
    assert result["tipo_demanda"] == "plano"
    assert result["objetos"] == row["objetos"]