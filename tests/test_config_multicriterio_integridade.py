"""Invariantes de persistência da configuração multicritério AHP."""
from datetime import datetime, timezone

import pytest

from api.exceptions import DemandaValidationError
from api.repositories import hierarquizacao_repository as hier_repo
from api.schemas.config_multicriterio import ConfigCreateSchema, ConfigUpdateSchema
from api.services import config_multicriterio_service as service


def _row(**extra):
    row = {
        "id": "11111111-1111-1111-1111-111111111111",
        "codigo": "CFG-A-001",
        "tipo": "avulsa",
        "nome": "Teste",
        "status": "calculada",
        "metodo_entrada": "manual",
        "metodo_comparacao": "formulario",
        "modo_preenchimento": "individual",
        "n_criterios": 2,
        "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}],
        "matriz_comparacao": [[1, 2], [0.5, 1]],
        "pesos": {"criteria": ["Custo", "Prazo"], "weights": [0.66, 0.34]},
        "consistente": True,
        "pacote_fase": "fase_2",
        "criado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "atualizado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }
    row.update(extra)
    return row


def test_alterar_matriz_invalida_resultados_derivados(monkeypatch) -> None:
    atual = _row()
    gravado = {}
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda *_: atual)

    def update(_tipo, _codigo, data):
        gravado.update(data)
        return _row(**data)

    monkeypatch.setattr(service.repo, "update", update)
    service.atualizar_config(
        "avulsa",
        "CFG-A-001",
        ConfigUpdateSchema(matriz_comparacao=[[1, 3], [1 / 3, 1]], n_criterios=2),
    )

    assert gravado["pesos"] is None
    assert gravado["razao_consistencia"] is None
    assert gravado["consistente"] is None
    assert gravado["status"] == "rascunho"
    assert gravado["arquivo_config_homologado"] is None


def test_rejeita_matriz_com_dimensao_divergente(monkeypatch) -> None:
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda *_: _row())
    with pytest.raises(DemandaValidationError, match="dimensão"):
        service.atualizar_config(
            "avulsa",
            "CFG-A-001",
            ConfigUpdateSchema(matriz_comparacao=[[1]], n_criterios=2),
        )


def test_modo_preenchimento_e_independente_da_estrategia(monkeypatch) -> None:
    atual = _row()
    gravado = {}
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda *_: atual)

    def update(_tipo, _codigo, data):
        gravado.update(data)
        return _row(**data)

    monkeypatch.setattr(service.repo, "update", update)
    resposta = service.atualizar_config(
        "avulsa",
        "CFG-A-001",
        ConfigUpdateSchema(
            metodo_comparacao="formulario", modo_preenchimento="colaborativo"
        ),
    )

    assert gravado["metodo_comparacao"] == "formulario"
    assert gravado["modo_preenchimento"] == "colaborativo"
    assert resposta.modo_preenchimento == "colaborativo"


def test_config_portfolio_copia_excel_da_hierarquizacao(monkeypatch) -> None:
    captured = {}
    conteudo = b"PK\x03\x04matriz-da-hierarquizacao"
    row = _row(
        tipo="portfolio",
        codigo="CFG-P-001",
        tipo_demanda_id=3,
        universo_objetos=[{"id": "1", "codigo": "P-1", "nome": "Projeto"}],
    )

    monkeypatch.setattr(
        hier_repo,
        "get_by_codigo",
        lambda _codigo: {
            "id": "h-1",
            "dados_hierarquizacao": {
                "cabecalho_grupo": {
                    "matriz_premissas_criterios": {
                        "arquivo": "matriz_original.xlsx",
                        "linhas": [
                            {"criterio": "Custo", "premissa": "Menor custo é preferível."},
                            {"criterio": "Prazo", "premissa": "Menor prazo é preferível."},
                        ],
                    }
                }
            },
        },
    )
    monkeypatch.setattr(hier_repo, "get_excel_matriz_by_codigo", lambda _codigo: conteudo)
    monkeypatch.setattr(hier_repo, "update", lambda *_args, **_kwargs: None)

    def insert(_tipo, data, **_kwargs):
        captured.update(data)
        return dict(row, **data)

    monkeypatch.setattr(service.repo, "insert", insert)
    monkeypatch.setattr(service.repo, "update", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda *_args: dict(row, **captured))

    service.criar_config(
        ConfigCreateSchema(
            tipo="portfolio",
            nome="Configuração",
            tipo_demanda="projeto",
            universo_objetos=[{"id": "1", "codigo": "P-1", "nome": "Projeto"}],
            hierarquizacao_codigo="HIER-001",
        )
    )

    assert captured["arquivo_excel_matriz_criterios_premissas"] == conteudo
    assert captured["n_criterios"] == 2
    assert captured["criterios"][0]["premissa"] == "Menor custo é preferível."
    assert captured["arquivo_nome"] == "matriz_original.xlsx"
