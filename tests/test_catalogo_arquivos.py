from pathlib import Path

from api.services.catalogo_arquivos import conciliar, caminho_seguro


def test_snapshot_nao_utiliza_arquivo_original(tmp_path):
    original = tmp_path / "data/geoespacial/uploads/datastorage/vetor/original.gpkg"
    original.parent.mkdir(parents=True)
    original.touch()
    row = {"id": "h", "nome": "Homologada", "nome_publicacao": "Risco",
           "versao": "v1", "modulo_consumidor": "fase1", "tipo": "vetor",
           "metadados": {"caminho_arquivo": original.relative_to(tmp_path).as_posix()}}
    report = conciliar({"homologadas": [row]}, tmp_path)
    assert report["camadas"][0]["situacao"] == "arquivo_nao_localizado"
    assert not report["arquivos"][0]["registrada"]


def test_multiplas_camadas_no_mesmo_arquivo_e_relatorios(tmp_path):
    folder = tmp_path / "data/geoespacial/outputs"
    folder.mkdir(parents=True)
    (folder / "resultado.gpkg").touch()
    (folder / "relatorio.json").write_text('{"resultado": 1}')
    rows = [{"id": n, "nome": n, "metadados": {"caminho_arquivo": "data/geoespacial/outputs/resultado.gpkg"}} for n in ("a", "b")]
    report = conciliar({"processadas": rows}, tmp_path)
    assert report["resumo"] == {"disponivel": 2}
    assert len(report["arquivos"]) == 1
    assert report["arquivos"][0]["camadas_ids"] == ["a", "b"]


def test_arquivo_orfao_nao_vira_camada(tmp_path):
    folder = tmp_path / "data/geoespacial/outputs"
    folder.mkdir(parents=True)
    (folder / "orfao.gpkg").touch()
    report = conciliar({}, tmp_path)
    assert report["camadas"] == []
    assert report["arquivos_sem_registro"] == 1


def test_sem_caminho_nao_afirma_que_conteudo_existe_no_banco(tmp_path):
    report = conciliar({"processadas": [{"id": "a", "metadados": {}}]}, tmp_path)
    assert report["camadas"][0]["situacao"] == "sem_vinculo_arquivo"


def test_rejeita_caminhos_fora_da_raiz(tmp_path):
    assert caminho_seguro(tmp_path, "data/geoespacial/../../secret") is None
    assert caminho_seguro(tmp_path, "C:/secret") is None


def test_consulta_sem_arquivos_nao_acessa_banco(monkeypatch):
    from api.services import catalogo_arquivos as service
    def proibido():
        raise AssertionError("Pasta sem arquivos não deve consultar o catálogo")
    monkeypatch.setattr(service, "get_connection", proibido)
    assert service.camadas_dos_arquivos(set()) == []


def test_consulta_pontual_preserva_vinculos_sem_varrer_storage(monkeypatch, tmp_path):
    from contextlib import contextmanager
    from api.services import catalogo_arquivos as service
    relative = "data/geoespacial/outputs/resultado.gpkg"
    target = tmp_path / relative
    target.parent.mkdir(parents=True)
    target.touch()
    rows = [{"id": str(i), "categoria": "processadas", "nome": "Resultado",
             "tipo": "vetor", "estado_arquivo": state,
             "metadados": {"caminho_arquivo": relative}}
            for i, state in enumerate(["definitivo", "temporario", "removido", None])]
    class Connection:
        def execute(self, query, params):
            assert [relative] in params
            return self
        def fetchall(self):
            return rows
    @contextmanager
    def connection():
        yield Connection()
    def proibido(*args, **kwargs):
        raise AssertionError("Navegação não deve inventariar o storage")
    monkeypatch.setattr(service, "get_connection", connection)
    monkeypatch.setattr(service, "project_path", lambda _: tmp_path)
    monkeypatch.setattr(service.os, "walk", proibido)
    assert [r["id"] for r in service.camadas_dos_arquivos({relative})] == ["0", "3"]
    target.unlink()
    assert service.camadas_dos_arquivos({relative}) == []


def test_api_exige_administrador():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.conciliacao_geoespacial import router
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        assert client.get("/catalogo/conciliacao").status_code == 401
        assert client.get("/catalogo/conciliacao/pagina").status_code == 401
        assert client.post("/catalogo/conciliacao/importadas/a/normalizar").status_code == 401


def test_normalizacao_preserva_historico_e_identificador(monkeypatch, tmp_path):
    from contextlib import contextmanager
    from api.services import catalogo_arquivos as service
    relative = "data/geoespacial/outputs/resultado.gpkg"
    target = tmp_path / relative
    target.parent.mkdir(parents=True)
    target.touch()
    updates = []
    class Connection:
        def execute(self, query, params):
            if len(params) == 1:
                return self
            updates.append(params)
        def fetchone(self):
            return {"id": "id-preservado", "metadados": {"metadados": {"caminho_arquivo": relative}, "outro": "preservar"}}
    @contextmanager
    def connection():
        yield Connection()
    monkeypatch.setattr(service, "get_connection", connection)
    monkeypatch.setattr(service, "project_path", lambda _: tmp_path)
    result = service.normalizar_vinculo("processadas", "recurso", "responsavel-teste")
    assert result["alterado"]
    metadata = updates[0][0].obj
    assert updates[0][1] == "id-preservado"
    assert metadata["outro"] == "preservar"
    assert metadata["caminho_arquivo"] == relative
    assert metadata["historico_conciliacao"][0]["responsavel"] == "responsavel-teste"


def test_recusa_normalizacao_de_homologada():
    import pytest
    from api.services.catalogo_arquivos import normalizar_vinculo
    with pytest.raises(ValueError):
        normalizar_vinculo("homologadas", "id", "usuario")


def test_pagina_renderiza_no_harness_de_teste():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.deps.auth import require_admin
    from api.routers.conciliacao_geoespacial import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_admin] = lambda: object()
    with TestClient(app) as client:
        response = client.get("/catalogo/conciliacao/pagina")
        assert response.status_code == 200
        assert 'id="conciliacao-linhas"' in response.text
