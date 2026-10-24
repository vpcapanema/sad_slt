import json
import re
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.exceptions import DatabaseUnavailableError
from api.repositories import dominio_repository
from api.routers import dominios
from api.services import adversidades_camadas


def vinculo(codigo="inundacao", *, ativo=True):
    return {
        "camada_codigo": codigo, "tipo_codigo": "inundacao",
        "tipo_nome": "Inundação, enxurrada ou alagamento",
        "familia_codigo": "perigo_fisico_geotecnico",
        "familia_nome": "Perigos físicos e geotécnicos", "ativo": ativo,
    }


def test_resolve_id_arquivo_componente_e_nao_adivinha_nome(monkeypatch):
    monkeypatch.setattr(dominio_repository, "list_camadas_adversidade", lambda: [vinculo()])
    ids = [
        "inundacao",
        "storage:bases/inundacao.fgb",
        "storage:bases/pacote.gpkg::inundacao",
        "storage:bases/inundacao.gpkg::outra_camada",
        "storage:bases/inundacao_copia.fgb",
        "Inundação",
    ]
    resultado = adversidades_camadas.resolver(ids)
    assert all(resultado[i]["tipo_codigo"] == "inundacao" for i in ids[:3])
    assert all(resultado[i] is None for i in ids[3:])
    assert "ativo" not in resultado[ids[0]]


def test_referencia_exata_tem_precedencia_inclusive_desativada(monkeypatch):
    ident = "storage:bases/inundacao.fgb"
    especifico = {**vinculo(ident), "tipo_codigo": "movimento_massa"}
    monkeypatch.setattr(dominio_repository, "list_camadas_adversidade",
                        lambda: [vinculo(), especifico])
    assert adversidades_camadas.resolver([ident])[ident]["tipo_codigo"] == "movimento_massa"
    especifico["ativo"] = False
    assert adversidades_camadas.resolver([ident])[ident] is None


def test_endpoint_resolve_e_expõe_banco_indisponivel(monkeypatch):
    monkeypatch.setattr(dominio_repository, "list_camadas_adversidade", lambda: [vinculo()])
    app = FastAPI()
    app.include_router(dominios.router, prefix="/api")
    with TestClient(app) as client:
        response = client.post("/api/dominios/adversidades/camadas/resolver",
                               json={"camadas": ["storage:bases/inundacao.fgb", "sem-vinculo"]})
        assert response.status_code == 200
        assert response.json()[0]["adversidade"]["familia_codigo"] == "perigo_fisico_geotecnico"
        assert response.json()[1] == {"id": "sem-vinculo", "adversidade": None}
        assert "risco" not in response.text and "restricao" not in response.text
        for ids in ([], [""], ["a" * 2049], ["a"] * 501):
            assert client.post("/api/dominios/adversidades/camadas/resolver",
                               json={"camadas": ids}).status_code == 422

        def falhar():
            raise DatabaseUnavailableError("Banco indisponível.")
        monkeypatch.setattr(dominio_repository, "list_camadas_adversidade", falhar)
        response = client.post("/api/dominios/adversidades/camadas/resolver", json={"camadas": ["a"]})
        assert response.status_code == 503


def test_migration_cobre_catalogo_sem_fixar_tratamento_ou_sobrescrever_edicoes():
    migration = Path("database/142_vinculos_camadas_adversidades.sql").read_text(encoding="utf-8")
    biblioteca = json.loads(Path("config/geoespacial/biblioteca_criterios_risco_restricao.json").read_text(encoding="utf-8"))
    vinculos = dict(re.findall(r"\('([^']+)', '([^']+)'\)", migration))
    assert set(vinculos) == {c["id"] for c in biblioteca["criterios"]}
    assert len(set(vinculos.values())) == 15
    assert "REFERENCES dominios.tipo_adversidade(codigo) ON DELETE RESTRICT" in migration
    assert "ON CONFLICT (camada_codigo) DO NOTHING" in migration
    assert "tipo_tratamento" not in migration
    script = Path("scripts/apply-database.ps1").read_text(encoding="utf-8")
    assert script.count('"142_vinculos_camadas_adversidades.sql"') == 2
    assert "to_regclass('dominios.camada_adversidade')" in script


def test_falha_do_dominio_interrompe_execucao_antes_de_carregar_geometrias(monkeypatch):
    from api.services import elegibilidade_processamento
    from api.services.controle_processamento import ControleProcessamento

    def falhar(ids):
        raise DatabaseUnavailableError("Banco indisponível.")
    monkeypatch.setattr(adversidades_camadas, "resolver", falhar)
    with pytest.raises(DatabaseUnavailableError):
        elegibilidade_processamento.executar(
            {"restricao": [{"id": "a"}], "risco": []}, ControleProcessamento())
