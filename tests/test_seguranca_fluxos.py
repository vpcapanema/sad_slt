"""Regressões dos seis fluxos; sem rede externa ou banco real."""
import asyncio
import io
import json
import socket
import zipfile
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, UploadFile
from fastapi.testclient import TestClient

from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import session_repository, convite_individual_repository
from api.routers import auth, comparacao_colaborativa, planos, programas, sigma
from api.services import session_service, comparacao_colaborativa_service as colaborativa
from api.services import stac_transport, archive_budget
from api.services.hierarquia_outros import resolve_plano_pai_id, resolve_programa_pai_id

KEY_A = "A" * 43
KEY_B = "B" * 43
ID = "22222222-2222-2222-2222-222222222222"
HIER = "44444444-4444-4444-4444-444444444444"
BASE = "/api/ahp/comparacao-colaborativa"


def client_for(router, profile=None):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    client = TestClient(app)
    if profile:
        token = session_service.create_token(session_service.SessionUser(
            "fixture", "", "fixture_" + profile.lower(), "Fixture", profile))
        client.cookies.set(session_service.cookie_name(), token)
    return client


@pytest.fixture
def ambiente(monkeypatch):
    row = {
        "id": ID, "hierarquizacao_id": HIER, "hierarquizacao_codigo": "H-1",
        "token": "ambiente-nao-autoriza", "token_acesso": "012345",
        "status": "ativa", "valido_ate": datetime.now(timezone.utc) + timedelta(days=1),
        "convites": [{"email": "a@example.org", "segredo": "nao-serializar"},
                    {"email": "b@example.org"}],
        "criterios": [{"criterio": "A", "Etapa": "Fase 3"}, {"criterio": "B", "Etapa": "Fase 3"}],
    }
    monkeypatch.setattr(colaborativa.repo, "get_ambiente_by_token", lambda _: row)
    monkeypatch.setattr(colaborativa.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(colaborativa.repo, "get_ambiente_by_hierarquizacao", lambda _: row)
    monkeypatch.setattr(colaborativa.repo, "list_ambientes", lambda: [row])
    monkeypatch.setattr(colaborativa.repo, "list_ambientes_by_hierarquizacao", lambda _: [row])
    monkeypatch.setattr(colaborativa.hierarq_repo, "get_by_id", lambda _: {"nome": "Teste"})
    active = {"a@example.org": KEY_A, "b@example.org": KEY_B}
    monkeypatch.setattr(convite_individual_repository, "validar",
                        lambda _id, email, key: active.get(email) == key and key is not None)
    return row, active


@pytest.mark.parametrize("suffix", [
    "/ambientes", f"/ambientes/{ID}", f"/hierarquizacoes/{HIER}/ambientes",
    f"/hierarquizacoes/{HIER}/ambiente",
])
def test_a01_visualizador_consulta_sem_tokens_convites(ambiente, suffix):
    response = client_for(comparacao_colaborativa.router, "VISUALIZADOR").get(BASE + suffix)
    assert response.status_code == 200
    data = response.json()
    for row in data if isinstance(data, list) else [data]:
        assert row["token"] == "" and row["url_publica"] == ""
        assert row["convites"] == [] and row["token_acesso"] is None
        assert row["criterios"]
    assert "a@example.org" not in response.text and "012345" not in response.text


@pytest.mark.parametrize("operation", ["acesso", "respostas/iniciar", "respostas/progresso", "respostas"])
def test_a01_chave_a_nao_age_como_b_nem_revogada_ou_expirada(ambiente, monkeypatch, operation):
    row, active = ambiente
    client = client_for(comparacao_colaborativa.router)
    writes = MagicMock(side_effect=AssertionError("Não ler/gravar resposta não autorizada"))
    monkeypatch.setattr(colaborativa.repo, "get_resposta_by_ambiente_email", writes)
    payload = {"email": "b@example.org", "token_acesso": KEY_A,
               "identificacao": {"nome_completo": "Bia", "email": "b@example.org", "instituicao": "Externa"},
               "matriz_comparacao": [[1, 1], [1, 1]]}
    method = "PATCH" if operation.endswith("progresso") else "POST"
    url = BASE + "/publico/ambiente-nao-autoriza/" + operation
    assert client.request(method, url, json=payload).status_code == 422
    payload["email"] = payload["identificacao"]["email"] = "a@example.org"
    active.clear()
    assert client.request(method, url, json=payload).status_code == 422
    active["a@example.org"] = KEY_A
    row["valido_ate"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert client.request(method, url, json=payload).status_code == 422
    writes.assert_not_called()


def test_a01_externo_sem_conta_e_codigo_legado_rejeitado(ambiente):
    client = client_for(comparacao_colaborativa.router)
    url = BASE + "/publico/ambiente-nao-autoriza/acesso"
    assert client.post(url, json={"email": "a@example.org", "token_acesso": "012345"}).status_code == 422
    response = client.post(url, json={"email": " A@EXAMPLE.ORG ", "token_acesso": KEY_A})
    assert response.status_code == 200 and response.json()["email_autorizado"]


def test_a01_repositorio_compara_hash_e_revogacao(monkeypatch):
    import hashlib
    context = MagicMock()
    conn = context.__enter__.return_value
    conn.execute.return_value.fetchone.return_value = {"segredo_hash": hashlib.sha256(KEY_A.encode()).hexdigest()}
    monkeypatch.setattr(convite_individual_repository, "get_connection", lambda: context)
    assert convite_individual_repository.validar(ID, "a@example.org", KEY_A)
    assert not convite_individual_repository.validar(ID, "a@example.org", KEY_B)
    assert "revogado_em IS NULL" in conn.execute.call_args.args[0]
    assert not convite_individual_repository.validar(ID, "a@example.org", "012345")


@pytest.mark.parametrize("router,repository,resolve,field", [
    (planos.router, planos.plano_repository, resolve_plano_pai_id, "plano_codigo"),
    (programas.router, programas.programa_repository, resolve_programa_pai_id, "programa_codigo"),
])
@pytest.mark.parametrize("status,allowed", [
    ("cadastro_em_avaliacao", False), ("analise_reprovada", False),
    ("analise_aprovada", True), ("hierarq_publicada", True),
    ("hierarq_suspensa", False), ("hierarq_aguardando_complementacao", False),
])
def test_a02_dto_minimo_e_mesma_elegibilidade_no_backend(monkeypatch, router, repository, resolve, field, status, allowed):
    row = {"id": ID, "codigo": "P-1", "nome": "Pai", "status": status,
           "representante_email": "privado@example.org", "descricao": "Interna", "valor_global": 123}
    monkeypatch.setattr(repository, "list_all", lambda: [row])
    monkeypatch.setattr(repository, "get_by_codigo", lambda _: row)
    prefix = "/planos" if field == "plano_codigo" else "/programas"
    data = client_for(router).get("/api" + prefix + "/vinculaveis").json()
    assert data == ([{"codigo": "P-1", "nome": "Pai"}] if allowed else [])
    kwargs = {field: "P-1", "vinculo_institucional": True}
    if field == "programa_codigo":
        kwargs["vinculo_tipo"] = "programa"
    if allowed:
        assert resolve(**kwargs) == ID
    else:
        with pytest.raises(DemandaValidationError):
            resolve(**kwargs)


def test_a03_logout_revoga_replay_cookie_e_bearer(monkeypatch):
    monkeypatch.setattr(auth.auth_service, "logout_usuario", lambda *a, **k: None)
    client = client_for(auth.router, "ANALISTA")
    token = client.cookies.get(session_service.cookie_name())
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 401
    client.cookies.set(session_service.cookie_name(), token)
    assert client.get("/api/auth/me").status_code == 401


@pytest.mark.parametrize("estado_ativo", [False, None])
def test_a03_perfil_atual_desativacao_e_sem_fail_open(sessoes_sinteticas, monkeypatch, estado_ativo):
    client = client_for(auth.router, "ADMIN")
    sessions, accounts = sessoes_sinteticas
    accounts["fixture"]["username"] = "fixture_visualizador"
    assert client.get("/api/auth/me").json()["tipo_usuario"] == "VISUALIZADOR"
    if estado_ativo is None:
        accounts["fixture"].pop("ativo")
    else:
        accounts["fixture"]["ativo"] = estado_ativo
    assert client.get("/api/auth/me").status_code == 401
    accounts["fixture"]["ativo"] = True
    assert client.get("/api/auth/me").status_code == 401
    client = client_for(auth.router, "ADMIN")
    def unavailable(*a):
        raise DatabaseUnavailableError("sintético")
    monkeypatch.setattr(session_repository, "is_active", unavailable)
    assert client.get("/api/auth/me").status_code == 503
    assert client.post("/api/auth/logout").status_code == 503


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fe80::1", "fc00::1", "::ffff:8.8.8.8"])
def test_a04_destinos_internos_nao_chegam_ao_transporte(monkeypatch, address):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **k: [(socket.AF_INET6, 1, 0, "", (address, 443))])
    connect = MagicMock(side_effect=AssertionError("Não conectar"))
    monkeypatch.setattr(stac_transport, "_PinnedHTTPS", connect)
    with pytest.raises(ValueError):
        stac_transport.baixar_asset("https://asset.example.org/cena.tif")
    connect.assert_not_called()


def test_a04_destino_efetivo_fixado_rebinding_tls_e_redirect(monkeypatch):
    calls = []
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **k: [(2, 1, 0, "", ("8.8.8.8", 443))])
    raw = MagicMock()
    raw.getpeername.return_value = ("8.8.8.8", 443)
    monkeypatch.setattr(socket, "create_connection", lambda address, **k: calls.append(address) or raw)
    conn = stac_transport._PinnedHTTPS("asset.example.org", "8.8.8.8")
    conn._context = MagicMock()
    conn.connect()
    assert calls == [("8.8.8.8", 443)]
    conn._context.wrap_socket.assert_called_once_with(raw, server_hostname="asset.example.org")
    raw.getpeername.return_value = ("127.0.0.1", 443)
    with pytest.raises(ValueError, match="efetivo"):
        conn.connect()
    transport = MagicMock()
    transport.getresponse.return_value.status = 302
    monkeypatch.setattr(stac_transport, "_PinnedHTTPS", lambda host, ip: transport)
    with pytest.raises(ValueError, match="redirecionamentos"):
        stac_transport.baixar_asset("https://asset.example.org/cena.tif")
    transport.request.assert_called_once()
    transport.close.assert_called_once()


def test_a04_ticket_vincula_origem_asset_e_expiracao(monkeypatch):
    monkeypatch.setattr(stac_transport, "get_settings", lambda: SimpleNamespace(session_secret="fixture"))
    ticket = stac_transport.autorizar_asset("1", "https://stac.example.org", "https://asset.example.org/a.tif")
    stac_transport.verificar_asset(ticket, "1", "https://stac.example.org", "https://asset.example.org/a.tif")
    for service, origin, url in [
        ("2", "https://stac.example.org", "https://asset.example.org/a.tif"),
        ("1", "https://outro.example.org", "https://asset.example.org/a.tif"),
        ("1", "https://stac.example.org", "https://127.0.0.1/a.tif"),
    ]:
        with pytest.raises(ValueError):
            stac_transport.verificar_asset(ticket, service, origin, url)
    monkeypatch.setattr(stac_transport.time, "time", lambda: 10**12)
    with pytest.raises(ValueError):
        stac_transport.verificar_asset(ticket, "1", "https://stac.example.org", "https://asset.example.org/a.tif")


def test_a04_asset_legitimo_importa_gtiff_real_sem_url_no_gdal(monkeypatch):
    import numpy as np
    from rasterio.io import MemoryFile
    from rasterio.transform import from_origin
    from api.services.geoespacial_service import GeoespacialService
    with MemoryFile() as memory:
        with memory.open(driver="GTiff", width=4, height=4, count=1, dtype="uint8",
                         crs="EPSG:4326", transform=from_origin(-47, -23, .01, .01)) as dataset:
            dataset.write(np.ones((4, 4), dtype="uint8"), 1)
        content = memory.read()
    transport = MagicMock()
    response = transport.getresponse.return_value
    response.status = 200
    response.getheader.side_effect = lambda name, default=None: str(len(content)) if name == "Content-Length" else default
    response.read1.side_effect = [content, b""]
    monkeypatch.setattr(socket, "getaddrinfo", lambda *a, **k: [(2, 1, 0, "", ("8.8.8.8", 443))])
    monkeypatch.setattr(stac_transport, "_PinnedHTTPS", lambda host, ip: transport)
    service = GeoespacialService()
    registrar = MagicMock(return_value="raster-sintetico")
    monkeypatch.setattr(service, "registrar_raster", registrar)
    result = asyncio.run(service.importar_raster_url("https://asset.example.org/a.tif", "Cena"))
    assert result["shape"] == [4, 4] and result["raster_id"] == "raster-sintetico"
    np.testing.assert_array_equal(registrar.call_args.args[0], np.ones((4, 4)))
    assert registrar.call_args.args[1]["crs"].to_epsg() == 4326


@pytest.mark.parametrize("url", [
    "https://user:pass@asset.example.org/a.tif", "file:///a.tif",
    "http://asset.example.org/a.tif", "https://asset.example.org:444/a.tif",
    "https://[fe80::1%25eth0]/a.tif",
])
def test_a04_credenciais_protocolos_e_portas_invalidas(monkeypatch, url):
    dns = MagicMock(side_effect=AssertionError("Não resolver URL inválida"))
    monkeypatch.setattr(socket, "getaddrinfo", dns)
    with pytest.raises(ValueError):
        stac_transport.baixar_asset(url)
    dns.assert_not_called()


def test_a05_fallback_local_zip_respeita_orcamento_durante_leitura(monkeypatch):
    from api.services import pacote_geoespacial_memoria as pacote
    monkeypatch.setattr(pacote, "libarchive", None)
    with pytest.raises(ValueError, match="bytes"):
        pacote.componentes(zip_bytes([("a.geojson", b"x" * 100)]), "a.zip", 32)


def zip_bytes(entries):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return out.getvalue()


def test_a05_leitura_limitada_antes_de_parse(monkeypatch):
    from api.routers import geometria
    stream = MagicMock()
    stream.read.return_value = b"x" * 11
    monkeypatch.setattr(geometria, "MAX_GEOMETRIA_UPLOAD_BYTES", 10)
    with pytest.raises(Exception) as exc:
        geometria.api_geometria_parse(UploadFile(filename="a.zip", file=stream))
    assert exc.value.status_code == 413
    stream.read.assert_called_once_with(11)


@pytest.mark.parametrize("extension", ["zip", "kmz"])
def test_a05_expansao_e_repeticoes_recusadas_sem_residuos(monkeypatch, extension):
    from api import geometria_parser as parser
    from contextlib import contextmanager
    from pathlib import Path
    import shutil
    directory = Path("artifacts") / "security-parser-regression"
    @contextmanager
    def staging():
        directory.mkdir(parents=True, exist_ok=True)
        try:
            yield str(directory)
        finally:
            shutil.rmtree(directory)
    monkeypatch.setattr(parser.tempfile, "TemporaryDirectory", staging)
    monkeypatch.setattr(parser, "MAX_GEOMETRIA_UPLOAD_BYTES", 32)
    parse = parser.parse_shapefile_zip if extension == "zip" else parser.parse_kmz
    name = "a.shp" if extension == "zip" else "doc.kml"
    with pytest.raises(ValueError, match="bytes"):
        parse(zip_bytes([(name, b"x" * 100)]))
    assert not directory.exists()
    with pytest.warns(UserWarning):
        content = zip_bytes([(name, b"x"), (name, b"x")])
    with pytest.raises(ValueError, match="repetidos"):
        parse(content)
    assert not directory.exists()


def test_a05_orcamento_bytes_reais_membros_tempo():
    budget = archive_budget.ArchiveBudget(8)
    target = io.BytesIO()
    with pytest.raises(ValueError, match="bytes"):
        budget.copy(io.BytesIO(b"x" * 9), target)
    assert len(target.getvalue()) <= 8
    budget = archive_budget.ArchiveBudget()
    for index in range(archive_budget.MAX_MEMBERS):
        budget.member(str(index))
    with pytest.raises(ValueError, match="2000"):
        budget.member("extra")
    budget.deadline = 0
    with pytest.raises(ValueError, match="tempo"):
        budget.read(io.BytesIO(b"x"))


def test_a06_auth_antes_do_proxy_ou_fallback_e_paginacao(monkeypatch):
    lookup = MagicMock()
    async def data():
        lookup()
        return [{"id": str(i), "nome_completo": "Pessoa", "email": "p@example.org",
                 "telefone": "00", "cpf": "não expor"} for i in range(3)]
    monkeypatch.setattr(sigma, "fetch_pessoas_sigma", data)
    assert client_for(sigma.router).get("/api/pessoas").status_code == 401
    lookup.assert_not_called()
    response = client_for(sigma.router, "OPERADOR").get("/api/pessoas?page=2&limit=2")
    assert response.status_code == 200 and len(response.json()["data"]) == 1
    assert "cpf" not in response.text


def test_a01_revogacao_http_individual_preserva_outro_destinatario(ambiente, monkeypatch):
    _, active = ambiente
    monkeypatch.setattr(convite_individual_repository, "revogar",
                        lambda _id, email: active.pop(email, None))
    from api.server import app
    client = TestClient(app)
    token = session_service.create_token(session_service.SessionUser(
        "fixture", "", "fixture_gestor", "Fixture", "GESTOR"))
    client.cookies.set(session_service.cookie_name(), token)
    assert client.delete(BASE + f"/ambientes/{ID}/convites/a@example.org").status_code == 204
    assert "a@example.org" not in active and active["b@example.org"] == KEY_B
    external = TestClient(app)
    assert external.post(BASE + "/publico/ambiente-nao-autoriza/acesso",
                         json={"email": "b@example.org", "token_acesso": KEY_B}).status_code == 200


def test_a01_publico_nao_depende_da_sessao_sigma_do_navegador(ambiente, monkeypatch):
    from api.server import app
    client = TestClient(app)
    token = session_service.create_token(session_service.SessionUser(
        "fixture", "", "fixture_gestor", "Fixture", "GESTOR"))
    client.cookies.set(session_service.cookie_name(), token)
    def unavailable(*a):
        raise DatabaseUnavailableError("sintético")
    monkeypatch.setattr(session_repository, "is_active", unavailable)
    response = client.post(BASE + "/publico/ambiente-nao-autoriza/acesso",
                           json={"email": "b@example.org", "token_acesso": KEY_B})
    assert response.status_code == 200
    assert client.get("/restrict/").status_code == 503


def test_a01_emissao_persiste_hash_nao_segredo(monkeypatch):
    import hashlib
    context = MagicMock()
    context.__enter__.return_value.execute.return_value.fetchone.return_value = {"ambiente_id": ID}
    monkeypatch.setattr(convite_individual_repository, "get_connection", lambda: context)
    secret = convite_individual_repository.emitir(ID, "a@example.org", datetime.now(timezone.utc))
    query, params = context.__enter__.return_value.execute.call_args.args
    assert len(secret) == 43 and secret not in params
    assert hashlib.sha256(secret.encode()).hexdigest() in params
    assert "ON CONFLICT" in query and "revogado_em = NULL" in query


def test_a02_projeto_resolve_pai_sem_metadados_administrativos_no_cliente(monkeypatch):
    from api.services import demanda_service
    from api.schemas.demanda import DemandaCreateSchema
    from api.repositories import programa_repository
    monkeypatch.setattr(programa_repository, "get_by_codigo", lambda _: {
        "id": ID, "codigo": "PRO-1", "status": "analise_aprovada", "plano_codigo": "PLA-1", "diretoria_id": "DIR-1",
    })
    monkeypatch.setattr(demanda_service.demanda_repository, "prepare_insert_params", lambda row: row)
    payload = DemandaCreateSchema(
        instituicao_id=ID, pessoa_id=HIER, representante={"nome": "Ana"},
        lat=-23, lng=-46, nome="Projeto", diretoria_id="", plano_id="",
        vinculo_institucional=True, vinculo_tipo="programa", programa_codigo="PRO-1")
    row = demanda_service._build_persist_row(payload, "PRJ-1", ID)
    assert row["plano_id"] == "PLA-1" and row["diretoria_id"] == "DIR-1"
    payload.programa_codigo = None
    with pytest.raises(DemandaValidationError, match="Selecione"):
        demanda_service._build_persist_row(payload, "PRJ-1", ID)


def test_a03_logout_nao_informa_sucesso_sem_revogar(monkeypatch):
    client = client_for(auth.router, "ADMIN")
    def unavailable(*a):
        raise DatabaseUnavailableError("sintético")
    monkeypatch.setattr(session_repository, "revoke", unavailable)
    response = client.post("/api/auth/logout")
    assert response.status_code == 503 and "set-cookie" not in response.headers


def test_a03_sid_obrigatorio_e_revogacao_administrativa(sessoes_sinteticas, monkeypatch):
    client = client_for(auth.router, "ADMIN")
    target = session_service.create_token(session_service.SessionUser(ID, "", "target_gestor", "Alvo", "GESTOR"))
    assert client.delete("/api/auth/sessoes/usuario/" + ID).status_code == 204
    assert session_service.parse_token(target) is None
    token = client.cookies.get(session_service.cookie_name())
    sessoes_sinteticas[0].clear()
    assert session_service.parse_token(token) is None


def test_a04_importador_real_recusa_url_nao_associada_a_pesquisa(monkeypatch):
    from api.routers import geoespacial
    async def source(*args):
        return {"url": "https://stac.example.org"}
    monkeypatch.setattr(geoespacial, "_servico_portal", source)
    request = {"servico_id": "1", "url": "https://asset.example.org/a.tif", "tipo": "image/tiff"}
    with pytest.raises(Exception) as exc:
        geoespacial.importar_asset_stac(request)
    assert exc.value.status_code == 422


def test_a05_fabrica_7z_impede_escrita_acima_do_orcamento():
    class Archive:
        def list(self):
            return [SimpleNamespace(filename="a.geojson", uncompressed=0, is_directory=False, is_file=True)]
        def extractall(self, factory):
            factory.create("a.geojson").write(b"x" * 33)
    budget = archive_budget.ArchiveBudget(32)
    with pytest.raises(ValueError, match="bytes"):
        archive_budget.sevenzip_contents(Archive(), budget)
    assert budget.total == 0


def test_a05_staging_limpo_em_cancelamento(tmp_path, monkeypatch):
    from api.services import geospatial_upload_storage as storage
    monkeypatch.setattr(storage, "project_path", lambda name: tmp_path / name)
    def cancel(*a):
        raise KeyboardInterrupt()
    monkeypatch.setattr(storage, "_extract", cancel)
    with pytest.raises(KeyboardInterrupt):
        storage.prepare_upload("a.zip", zip_bytes([("a.shp", b"x")]))
    assert not list(tmp_path.rglob("*.contents"))
    assert not list(tmp_path.rglob("*.zip"))


def test_a06_fallback_real_tambem_exige_sessao(monkeypatch):
    import httpx
    from api import sigma_proxy
    calls = MagicMock(return_value=[{"id": "1", "nome_completo": "Ana", "email": "a@example.org", "cpf": "interno"}])
    class Offline:
        async def __aenter__(self):
            raise httpx.HTTPError("sintético")
        async def __aexit__(self, *a):
            pass
    monkeypatch.setattr(sigma_proxy.httpx, "AsyncClient", lambda **k: Offline())
    monkeypatch.setattr(sigma_proxy.sigma_cadastro_repository, "list_pessoas_ativas", calls)
    assert client_for(sigma.router).get("/api/pessoas").status_code == 401
    calls.assert_not_called()
    response = client_for(sigma.router, "OPERADOR").get("/api/pessoas")
    assert response.status_code == 200 and "cpf" not in response.text
    calls.assert_called_once()
