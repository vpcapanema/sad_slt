from __future__ import annotations

from api.services import painel_service


def _row(codigo: str, status: str) -> dict:
    return {
        "codigo": codigo,
        "tipo": "projeto",
        "status": status,
        "criado_em": "2026-07-15T12:00:00",
        "nome": f"Demanda {codigo}",
        "representante_nome": "Pessoa Restrita",
        "representante_email": "restrito@example.org",
        "representante_telefone": "(00) 0000-0000",
        "sigma_pessoa_id": "00000000-0000-0000-0000-000000000001",
    }


def test_painel_publico_lista_todos_os_status_e_remove_dados_pessoais(monkeypatch) -> None:
    rows = [
        _row("PROJ-001", "cadastro_pendente"),
        _row("PROJ-002", "hierarq_ranqueada"),
    ]
    monkeypatch.setattr(painel_service.painel_repository, "list_all", lambda: rows)

    items = painel_service.listar_demandas_painel(public_only=True)

    assert [item.id for item in items] == ["PROJ-001", "PROJ-002"]
    assert [item.status for item in items] == ["cadastro_pendente", "hierarq_ranqueada"]
    assert all(item.representante is None for item in items)


def test_painel_restrito_mantem_dados_pessoais(monkeypatch) -> None:
    monkeypatch.setattr(
        painel_service.painel_repository,
        "list_all",
        lambda: [_row("PROJ-001", "cadastro_pendente")],
    )

    [item] = painel_service.listar_demandas_painel(public_only=False)

    assert item.representante is not None
    assert item.representante.nome == "Pessoa Restrita"
    assert item.representante.email == "restrito@example.org"
