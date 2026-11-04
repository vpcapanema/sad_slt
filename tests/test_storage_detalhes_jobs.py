"""Metadados sintéticos: nenhum acesso ao banco ou storage oficial."""
from threading import Event
from time import perf_counter

import pytest

from api.services import storage_detalhes_jobs as jobs
from api.services import storage_geoespacial as storage


def test_totais_recursivos_sem_n_mais_um_por_arquivo(monkeypatch):
    chamadas = []
    arvore = {
        "saidas-geoespaciais": [{"nome": "a", "pasta": True, "tamanho": 4096}],
        "saidas-geoespaciais/a": [{"nome": "sub", "pasta": True, "tamanho": 4096},
                                *[{"nome": f"{i}.gpkg", "pasta": False, "tamanho": 1000} for i in range(10000)],
                                {"nome": ".oculto", "pasta": False, "tamanho": 7}],
        "saidas-geoespaciais/a/sub": [{"nome": "notas.txt", "pasta": False, "tamanho": 13}],
    }
    def listar(path, *, incluir_ocultos=False):
        assert incluir_ocultos
        chamadas.append(path)
        return arvore[path]
    monkeypatch.setattr(storage, "_listar", listar)
    inicio = perf_counter()
    totais = jobs.totais("saidas-geoespaciais")
    elapsed = perf_counter() - inicio
    assert totais == {"saidas-geoespaciais/a/sub": 13, "saidas-geoespaciais/a": 10000020,
                     "saidas-geoespaciais": 10000020}
    assert len(chamadas) == 3
    print(f"10002 arquivos: {len(chamadas)} listagens, {elapsed:.4f}s")


@pytest.mark.parametrize("tamanho", [None, -1, "3"])
def test_tamanho_ausente_nao_vira_zero(monkeypatch, tamanho):
    monkeypatch.setattr(storage, "_listar", lambda *a, **k: [{"nome": "x", "pasta": False, "tamanho": tamanho}])
    with pytest.raises(ValueError):
        jobs.totais("saidas-geoespaciais")


def test_vazia_tem_total_real_zero(monkeypatch):
    monkeypatch.setattr(storage, "_listar", lambda *a, **k: [])
    assert jobs.totais("saidas-geoespaciais") == {"saidas-geoespaciais": 0}


def test_listing_pasta_preserva_mtime_proprio(monkeypatch):
    monkeypatch.setattr(storage, "_listar", lambda *a, **k: [
        {"nome": "pasta", "pasta": True, "modificado": 1730000001, "tamanho": 4096},
        {"nome": "arquivo.gpkg", "pasta": False, "modificado": 1730000002, "tamanho": 123},
    ])
    resultado = storage.navegar("saidas-geoespaciais", detalhar=False)
    assert resultado["pastas"][0]["modificado_em"] == 1730000001
    assert resultado["arquivos"][0]["tamanho_bytes"] == 123
    assert resultado["arquivos"][0]["modificado_em"] == 1730000002


def test_inicio_nao_bloqueia_e_deduplica_consulta_ativa(monkeypatch):
    entrou, liberar = Event(), Event()
    def totais(path):
        entrou.set()
        liberar.wait(3)
        return {path: 5}
    monkeypatch.setattr(jobs, "totais", totais)
    try:
        inicio = perf_counter()
        primeiro = jobs.iniciar("saidas-geoespaciais/teste", "teste-detalhes")
        assert perf_counter() - inicio < .5
        assert entrou.wait(1)
        segundo = jobs.iniciar("saidas-geoespaciais/teste", "teste-detalhes")
        assert segundo["id"] == primeiro["id"]
        with pytest.raises(FileNotFoundError):
            jobs.obter(primeiro["id"], "outro")
    finally:
        liberar.set()


def test_falha_descendente_nao_publica_total_parcial(monkeypatch):
    def falhar(*args, **kwargs):
        raise OSError("storage inacessível")
    monkeypatch.setattr(jobs, "totais", falhar)
    job = dict(caminho="saidas-geoespaciais", status="pendente")
    jobs._executar(job)
    assert job["status"] == "erro"
    assert job["resultado"] is None
    assert job["erro"]


@pytest.mark.parametrize("path", ["", "../saidas-geoespaciais", "saidas-geoespaciais/../privado", "privado"])
def test_caminho_invalido(path):
    with pytest.raises(ValueError):
        jobs.iniciar(path, "teste")


def test_metadata_remota_ausente_nao_inventa_tamanho(monkeypatch):
    from contextlib import contextmanager
    from types import SimpleNamespace
    from api.services import storage_remoto
    @contextmanager
    def cliente():
        yield None
    monkeypatch.setattr(storage_remoto, "_cliente", cliente)
    monkeypatch.setattr(storage_remoto, "_pedir", lambda *a, **k: SimpleNamespace(
        status_code=200, json=lambda: [{"name": "ausente.gpkg"}, {"name": "vazio.gpkg", "size": 0}]))
    itens = storage_remoto.listar("saidas-geoespaciais")
    assert itens[0]["tamanho"] is None
    assert itens[1]["tamanho"] == 0


def test_rotas_iniciam_e_acompanham_sem_banco(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from types import SimpleNamespace
    from api.routers.geoespacial import router
    from api.deps.auth import require_geospatial_access
    from api.deps.execucao_geoespacial import rastrear_execucao
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id="rota-detalhes")
    app.dependency_overrides[rastrear_execucao] = lambda: None
    monkeypatch.setattr(jobs, "totais", lambda path: {path: 13})
    with TestClient(app) as client:
        assert client.post("/geoespacial/storage/detalhes?caminho=../privado").status_code == 422
        response = client.post("/geoespacial/storage/detalhes?caminho=saidas-geoespaciais/rota")
        assert response.status_code == 200
        ident = response.json()["id"]
        assert client.get(f"/geoespacial/storage/detalhes/{ident}").status_code == 200
        assert client.get("/geoespacial/storage/detalhes/inexistente").status_code == 404
