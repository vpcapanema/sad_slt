"""Recarga pontual e inventário remoto sem relistagem redundante."""
from contextlib import contextmanager
from datetime import datetime
from api.repositories import cadastro_geometria_repository as repo
from api.services import storage_geoespacial as storage


def test_recarga_pontual_parametrizada_preserva_geometria(monkeypatch):
    geometry = {"type": "Polygon", "coordinates": [[[-47,-23],[-46,-23],[-46,-22],[-47,-23]]]}
    row = dict(codigo="projeto-1", nome="Projeto", status="Em análise", criado_em=datetime(2026,10,9),
               posicao=[-47,-23], geometria=geometry, geometria_tipo="ST_Polygon", bounds=[-47,-23,-46,-22])
    calls = []
    class Connection:
        def execute(self, query, params):
            calls.append((query, params))
            return self
        def fetchall(self): return [row]
    @contextmanager
    def connection(): yield Connection()
    monkeypatch.setattr(repo, "get_connection", connection)
    all_rows = repo.listar("projeto")
    selected = repo.listar("projeto", "projeto-1")
    assert selected == all_rows
    assert selected[0]["geojson"]["features"][0]["geometry"] is geometry
    assert calls[0][1] == ()
    assert calls[1][1] == ("projeto-1",)
    assert "AND t.codigo = %s" in calls[1][0]
    assert calls[1][0].count("ST_Transform(") == 1


def test_inventario_reutiliza_metadados_remotos_e_conta_multicamadas(monkeypatch):
    calls = []
    def listar(path):
        calls.append(path)
        if path == "base-geoespacial":
            return [{"nome":"vetor", "pasta":True}]
        return [{"nome":f"arquivo-{index}.gpkg", "pasta":False,
                 "tamanho":100+index, "modificado":1234.0} for index in range(29)]
    monkeypatch.setattr(storage, "_via_api", lambda: True)
    monkeypatch.setattr(storage, "_listar", listar)
    def resolver_inutil(path): raise AssertionError("Não relistar pasta por arquivo")
    monkeypatch.setattr(storage, "resolver", resolver_inutil)
    def itens(file, relative):
        assert isinstance(file, storage.ArquivoStorage)
        assert file.stat().st_size >= 100
        return [{"tipo":"vetor", "id":relative+"::rios"}, {"tipo":"vetor", "id":relative+"::lagos"}]
    monkeypatch.setattr(storage, "_itens_do_arquivo", itens)
    assert storage.contagens("base-geoespacial") == {
        "base-geoespacial/vetor":58, "base-geoespacial":58}
    assert calls == ["base-geoespacial", "base-geoespacial/vetor"]


def test_novos_endpoints_exigem_sessao_e_recarga_passa_codigo(monkeypatch):
    from fastapi.testclient import TestClient
    from api.server import app
    from api.repositories import painel_repository
    from api.services.session_service import SessionUser, cookie_name, create_token
    assert TestClient(app).get("/api/geoespacial/cadastro-filtros").status_code == 401
    expected = [{"id":"projeto-1", "tipo":"projeto", "nome":"Projeto", "status":"em_analise", "abrangencia":[]}]
    monkeypatch.setattr(painel_repository, "list_filter_metadata", lambda: expected)
    calls=[]
    def listar(tipo, codigo=None):
        calls.append((tipo,codigo))
        return []
    monkeypatch.setattr(repo, "listar", listar)
    client=TestClient(app)
    client.cookies.set(cookie_name(),create_token(SessionUser(id="00000000-0000-0000-0000-000000000021",email="teste@example.org",username="teste_admin",nome="Teste",tipo_usuario="ADMIN")))
    response=client.get("/api/geoespacial/cadastro-filtros")
    assert response.status_code == 200
    assert response.json() == expected
    response=client.get("/api/geoespacial/cadastro-geometrias/projeto", params={"codigo":"projeto-1"})
    assert response.status_code == 200
    assert calls == [("projeto","projeto-1")]
    assert client.get("/api/geoespacial/cadastro-geometrias/desconhecido").status_code == 404
