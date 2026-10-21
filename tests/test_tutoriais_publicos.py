"""Leitura publica das midias, sem conexao com Storage ou bancos oficiais."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
import pytest

from api.server import app
from api.services import tutoriais_publicos as servico


@pytest.fixture(params=["remoto", "montado"])
def midia(request, monkeypatch, tmp_path):
    manifesto = deepcopy(servico.manifesto())
    nome = manifesto["tutoriais"][0]["video"]
    dados = bytes(range(256)) * 4097
    manifesto["arquivos"][nome] = {"bytes": len(dados), "sha256": sha256(dados).hexdigest()}
    relativo = manifesto["diretorio_storage"] + "/" + nome
    leituras, fechamentos = [], []

    class StorageSimulado:
        def __init__(self):
            self.client = SimpleNamespace(close=lambda: fechamentos.append(True))

        def info(self, path):
            assert path == relativo
            return {"size": len(dados), "mode": 0}

        def read(self, path, offset, length):
            assert path == relativo
            leituras.append((offset, length))
            return dados[offset:offset + length]

    monkeypatch.setattr(servico, "manifesto", lambda: manifesto)
    monkeypatch.setattr(servico, "StorageHTTP", StorageSimulado)
    raiz = tmp_path if request.param == "montado" else None
    monkeypatch.setattr(servico, "raiz_montada", lambda: raiz)
    if raiz is not None:
        alvo = raiz / Path(relativo)
        alvo.parent.mkdir(parents=True)
        alvo.write_bytes(dados)
    return SimpleNamespace(
        client=TestClient(app), url=servico.BASE_URL + nome,
        dados=dados, leituras=leituras, fechamentos=fechamentos,
        remoto=request.param == "remoto", classe=StorageSimulado,
        manifesto=manifesto, raiz=raiz, relativo=relativo,
    )


def test_leitura_completa_e_mime(midia):
    resposta = midia.client.get(midia.url, headers={"X-Forwarded-Prefix": "/sicard"})
    assert resposta.status_code == 200
    assert resposta.content == midia.dados
    assert resposta.headers["content-type"] == "video/mp4"
    assert int(resposta.headers["content-length"]) == len(midia.dados)
    assert resposta.headers["accept-ranges"] == "bytes"
    assert resposta.headers["x-content-type-options"] == "nosniff"
    assert resposta.headers["etag"] == f'"{sha256(midia.dados).hexdigest()}"'
    if midia.remoto:
        assert len(midia.leituras) == 3
        assert midia.fechamentos == [True]


@pytest.mark.parametrize("intervalo, inicio, fim", [
    ("bytes=0-99", 0, 99),
    ("bytes=300-", 300, None),
    ("bytes=-50", -50, None),
    ("bytes=1048570-99999999", 1048570, None),
])
def test_range_retorna_somente_trecho(midia, intervalo, inicio, fim):
    resposta = midia.client.get(midia.url, headers={"Range": intervalo})
    inicio = inicio if inicio >= 0 else len(midia.dados) + inicio
    fim = fim if fim is not None else len(midia.dados) - 1
    assert resposta.status_code == 206
    assert resposta.content == midia.dados[inicio:fim + 1]
    assert resposta.headers["content-range"] == f"bytes {inicio}-{fim}/{len(midia.dados)}"
    assert int(resposta.headers["content-length"]) == fim - inicio + 1
    if midia.remoto:
        assert sum(length for _, length in midia.leituras) == fim - inicio + 1
        assert midia.fechamentos == [True]


@pytest.mark.parametrize("intervalo", ["bytes=99999999-", "bytes=10-5", "bytes=-0"])
def test_intervalos_insatisfativeis(midia, intervalo):
    resposta = midia.client.get(midia.url, headers={"Range": intervalo})
    assert resposta.status_code == 416
    assert resposta.headers["content-range"] == f"bytes */{len(midia.dados)}"
    assert not midia.leituras


def test_head_nao_le_corpo(midia):
    resposta = midia.client.head(midia.url, headers={"Range": "bytes=0-10"})
    assert resposta.status_code == 200
    assert resposta.content == b""
    assert int(resposta.headers["content-length"]) == len(midia.dados)
    assert not midia.leituras
    if midia.remoto:
        assert midia.fechamentos == [True]


@pytest.mark.parametrize("correto", [True, False])
def test_if_range(midia, correto):
    etag = f'"{sha256(midia.dados).hexdigest()}"' if correto else '"outra-versao"'
    resposta = midia.client.get(midia.url, headers={"Range": "bytes=0-9", "If-Range": etag})
    assert resposta.status_code == (206 if correto else 200)
    assert resposta.content == (midia.dados[:10] if correto else midia.dados)


@pytest.mark.parametrize("nome", [
    "manifesto.json", "CONFERENCIA_STATUS.txt", "arquivo.mp4",
    "..%2Fmanifesto.json", "%2e%2e%5cmanifesto.json",
])
def test_allowlist_recusa_outros_arquivos(midia, nome):
    resposta = midia.client.get(servico.BASE_URL + nome)
    assert resposta.status_code == 404
    assert not midia.leituras
    assert not midia.fechamentos


def test_midia_ausente_e_indisponibilidade_sao_explicitas(midia, monkeypatch):
    if midia.remoto:
        def falhar(self, path):
            raise FileNotFoundError(path)
        monkeypatch.setattr(midia.classe, "info", falhar)
    else:
        (midia.raiz / Path(midia.relativo)).unlink()
    resposta = midia.client.get(midia.url)
    assert resposta.status_code == 503
    assert resposta.json()["detail"]
    if midia.remoto:
        assert midia.fechamentos == [True]


def test_tamanho_divergente_bloqueia_midia(midia):
    nome = midia.manifesto["tutoriais"][0]["video"]
    midia.manifesto["arquivos"][nome]["bytes"] += 1
    resposta = midia.client.get(midia.url)
    assert resposta.status_code == 503
    assert "diverge" in resposta.json()["detail"]
    assert not midia.leituras


@pytest.mark.parametrize("campo, mime", [
    ("capa", "image/jpeg"), ("srt", "application/x-subrip"), ("vtt", "text/vtt"),
])
def test_mime_dos_complementos(monkeypatch, tmp_path, campo, mime):
    manifesto = deepcopy(servico.manifesto())
    nome = manifesto["tutoriais"][0][campo]
    dados = b"WEBVTT\n\n" if campo == "vtt" else b"conteudo-de-teste"
    manifesto["arquivos"][nome] = {"bytes": len(dados), "sha256": sha256(dados).hexdigest()}
    alvo = tmp_path / Path(manifesto["diretorio_storage"]) / nome
    alvo.parent.mkdir(parents=True)
    alvo.write_bytes(dados)
    monkeypatch.setattr(servico, "manifesto", lambda: manifesto)
    monkeypatch.setattr(servico, "raiz_montada", lambda: tmp_path)
    resposta = TestClient(app).get(servico.BASE_URL + nome)
    assert resposta.status_code == 200
    assert resposta.headers["content-type"].split(";")[0] == mime
    assert resposta.content == dados


def test_manifesto_sem_autorizacao_publica_e_recusado(monkeypatch):
    manifesto = servico.manifesto()
    manifesto["conteudo_publico"] = False
    from unittest.mock import Mock
    import json
    monkeypatch.setattr(servico, "project_path", lambda path: Mock(read_text=lambda **kw: json.dumps(manifesto)))
    with pytest.raises(RuntimeError, match="aprovada"):
        servico.manifesto()
