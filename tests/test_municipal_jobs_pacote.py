from hashlib import sha256
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4
from zipfile import ZipFile

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routers import municipal_layer as router
from api.services import municipal_jobs as jobs, saidas_storage, storage_remoto


@pytest.fixture
def pacote_salvo(monkeypatch):
    user = SimpleNamespace(id=uuid4())
    execucao = str(uuid4())
    buffer = BytesIO()
    with ZipFile(buffer, "w") as zipfile:
        for nome in ("municipios_sp.gpkg", "municipios_sp.qml", "municipios_sp_dicionario.csv",
                     "municipios_sp_metadados.json", "municipios_sp_atributos.xlsx"):
            zipfile.writestr(nome, b"conteudo sintetico")
    conteudo = buffer.getvalue()
    resultado = {
        "id": "camada_teste",
        "arquivo": f"saidas-geoespaciais/execucoes/{execucao}/camadas/camada.gpkg",
        "pacote_caminho": f"saidas-geoespaciais/execucoes/{execucao}/pacotes/original.zip",
        "pacote_sha256": sha256(conteudo).hexdigest(),
    }
    job = {"dono": str(user.id), "controle": SimpleNamespace(status="concluido"), "resultado": resultado}
    monkeypatch.setattr(jobs, "_jobs", {"job-teste": job})
    downloads = []

    def baixar(caminho):
        downloads.append(caminho)
        assert caminho == resultado["pacote_caminho"]
        return conteudo

    monkeypatch.setattr(storage_remoto, "baixar", baixar)
    return user, job, conteudo, downloads


def test_baixa_zip_original_do_storage_sem_remontar_diretorio_local(pacote_salvo):
    user, job, conteudo, downloads = pacote_salvo
    pacote, resultado = jobs.pacote("job-teste", user)
    assert pacote == conteudo
    assert resultado is job["resultado"]
    assert downloads == [resultado["pacote_caminho"]]
    with ZipFile(BytesIO(pacote)) as zipfile:
        assert len(zipfile.namelist()) == 5
        assert "municipios_sp_dicionario.csv" in zipfile.namelist()


def test_pacote_confere_hash_antes_de_entregar(pacote_salvo):
    user, job, _, _ = pacote_salvo
    job["resultado"]["pacote_sha256"] = "0" * 64
    with pytest.raises(ValueError, match="diverge do hash"):
        jobs.pacote("job-teste", user)


@pytest.mark.parametrize("status", ["executando", "cancelado", "erro"])
def test_nao_baixa_antes_da_conclusao(pacote_salvo, status):
    user, job, _, downloads = pacote_salvo
    job["controle"].status = status
    with pytest.raises(ValueError, match="ainda não está disponível"):
        jobs.pacote("job-teste", user)
    assert downloads == []


def test_outro_usuario_nao_acessa_pacote(pacote_salvo):
    _, _, _, downloads = pacote_salvo
    with pytest.raises(LookupError):
        jobs.pacote("job-teste", SimpleNamespace(id=uuid4()))
    assert downloads == []


@pytest.fixture
def client(pacote_salvo):
    user, _, _, _ = pacote_salvo
    app = FastAPI()
    app.include_router(router.router)
    app.dependency_overrides[router.require_geospatial_access] = lambda: user
    with TestClient(app) as client:
        yield client


def test_rota_entrega_bytes_e_referencias_da_camada(client, pacote_salvo):
    _, job, conteudo, _ = pacote_salvo
    response = client.get("/municipal/social/jobs/job-teste/pacote")
    assert response.status_code == 200
    assert response.content == conteudo
    assert response.headers["content-type"] == "application/zip"
    assert response.headers["x-camada-arquivo"] == job["resultado"]["arquivo"]
    assert response.headers["x-camada-id"] == job["resultado"]["id"]


@pytest.mark.parametrize("falha", [
    storage_remoto.StorageIndisponivel("Detalhe interno da conexão"),
    FileNotFoundError("caminho interno"),
])
def test_rota_informa_falha_no_download_sem_induzir_nova_geracao(client, monkeypatch, falha, caplog):
    def baixar(*_):
        raise falha
    monkeypatch.setattr(saidas_storage, "conferir", baixar)
    response = client.get("/municipal/social/jobs/job-teste/pacote")
    assert response.status_code == 503
    assert "camada foi gerada" in response.json()["detail"]
    assert "não gere outra camada" in response.json()["detail"]
    assert "interno" not in response.text
    assert "job-teste" in caplog.text
