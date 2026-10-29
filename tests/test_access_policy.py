"""Regressões HTTP sem banco: perfis, módulos e propriedade da complementação."""
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.deps.access_policy import module_for_path
from api.routers import complementacao
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token


def user(profile):
    return SessionUser("autor", "", f"teste_{profile.lower()}", "Teste", profile)


def client(profile):
    result = TestClient(app)
    result.cookies.set(cookie_name(), create_token(user(profile)))
    return result


@pytest.mark.parametrize("profile,path", [
    ("GESTOR", "/api/demandas"),
    ("GESTOR", "/api/planos"),
    ("GESTOR", "/api/programas"),
    ("GESTOR", "/api/sei/documentos"),
    ("GESTOR", "/api/analise/D/decidir"),
    ("GESTOR", "/api/geometria/substituir/projeto/D"),
    ("GESTOR", "/api/complementacao/demandas/projeto/D/geometria/substituir"),
    ("ANALISTA", "/api/ahp/hierarquizacoes"),
    ("ANALISTA", "/api/ahp/configuracoes"),
    ("ANALISTA", "/api/ahp/comparacao-colaborativa/ambientes"),
    ("ANALISTA", "/api/agrupamentos-demandas"),
    ("ANALISTA", "/api/complementacao/hierarquizacoes/H/solicitar"),
    ("OPERADOR", "/api/sei/documentos"),
    ("OPERADOR", "/api/analise/D/decidir"),
    ("OPERADOR", "/api/geometria/substituir/projeto/D"),
    ("OPERADOR", "/api/ahp/hierarquizacoes"),
    ("OPERADOR", "/api/geoespacial/catalogo/conciliacao/retencao/executar"),
])
def test_write_denied_before_validation_or_services(profile, path):
    assert client(profile).post(path, json={}).status_code == 403


@pytest.mark.parametrize("profile", ["OPERADOR", "ANALISTA", "GESTOR"])
def test_admin_block_has_server_guard(profile):
    session = client(profile)
    assert session.get("/restrict/admin/").status_code == 403
    assert session.get("/api/admin/esquemas").status_code == 403


@pytest.mark.parametrize("path", [
    "/restrict/demandas/", "/restrict/demanda/", "/restrict/geoespacial/",
    "/restrict/hierarquizacao/processos/", "/restrict/revisao-status/",
    "/api/demandas/internas", "/api/painel/demandas/internas", "/api/complementacao/objetos",
])
def test_operator_cannot_browse_other_internal_modules(path):
    assert client("OPERADOR").get(path).status_code == 403


@pytest.mark.parametrize("profile,path", [
    ("GESTOR", "/restrict/demandas/"),
    ("GESTOR", "/restrict/demanda/"),
    ("GESTOR", "/restrict/sei-documentos/"),
    ("GESTOR", "/public/cadastro/nova-demanda/"),
    ("ANALISTA", "/restrict/hierarquizacao/processos/"),
    ("ANALISTA", "/restrict/analise-multicriterio/central-julgamentos"),
])
def test_read_only_page_has_context_and_accessible_control_script(profile, path):
    response = client(profile).get(path)
    assert response.status_code == 200
    assert 'id="access-mode-notice"' in response.text
    assert "Somente visualização" in response.text
    assert 'src="/assets/js/access-mode.js"' in response.text


@pytest.mark.parametrize("profile,path", [
    ("ADMIN", "/restrict/demandas/"),
    ("GESTOR", "/restrict/hierarquizacao/processos/"),
    ("ANALISTA", "/restrict/demandas/"),
    ("ANALISTA", "/restrict/geoespacial/"),
])
def test_writable_modules_have_no_page_wide_read_only_notice(profile, path):
    response = client(profile).get(path)
    assert response.status_code == 200
    assert 'id="access-mode-notice"' not in response.text


def test_anonymous_direct_page_access_redirects_to_login():
    response = TestClient(app).get("/restrict/hierarquizacao/processos/", follow_redirects=False)
    assert response.status_code == 303
    assert "/public/login/" in response.headers["location"]


def test_restricted_login_redirect_preserves_proxy_prefix():
    response = TestClient(app).get(
        "/restrict/demandas/?tipo=plano", headers={"x-forwarded-prefix": "/sicard"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"].startswith("/sicard/public/login/")
    assert "%2Fsicard%2Frestrict%2Fdemandas%2F" in response.headers["location"]


@pytest.mark.parametrize("owner,person,allowed", [
    ("autor", None, True), ("outro", None, False),
    ("outro", "pessoa", True), ("outro", "outra", False),
])
def test_operator_complement_requires_current_ownership_and_open_request(monkeypatch, owner, person, allowed):
    record = {"codigo": "D", "criado_por": owner, "sigma_pessoa_id": "pessoa",
              "status": complementacao.STATUS_COMPLEMENTACAO}
    monkeypatch.setattr(complementacao.demanda_repository, "get_by_codigo", lambda code: record)
    monkeypatch.setattr(complementacao, "_pessoa_id", lambda session: person)
    monkeypatch.setattr(complementacao.solicitacoes, "listar", lambda **kw: [
        {"hierarquizacao_codigo": None, "categorias": ["dados_cadastrais"]},
    ])
    if allowed:
        assert complementacao._demanda_autorizada("projeto", "D", user("OPERADOR"), "dados_cadastrais") is record
        with pytest.raises(HTTPException):
            complementacao._demanda_autorizada("projeto", "D", user("OPERADOR"), "geometria")
    else:
        with pytest.raises(HTTPException) as exc:
            complementacao._demanda_autorizada("projeto", "D", user("OPERADOR"), "dados_cadastrais")
        assert exc.value.status_code == 403


@pytest.mark.parametrize("profile,categories", [
    ("OPERADOR", ["atributos_objeto"]),
    ("ANALISTA", ["atributos_objeto"]),
    ("GESTOR", ["geometria"]),
])
def test_conclusion_dispatch_cannot_bypass_module_policy(monkeypatch, profile, categories):
    monkeypatch.setattr(complementacao.solicitacoes, "obter", lambda *a, **kw: {
        "categorias": categories, "hierarquizacao_codigo": "H", "demanda_codigo": "D",
    })
    response = client(profile).post(f"/api/complementacao/solicitacoes/{uuid4()}/concluir")
    assert response.status_code == 403


@pytest.mark.parametrize("profile", ["GESTOR", "ADMIN"])
def test_mad_control_allowed_to_managers_and_admin_before_body_validation(profile):
    assert client(profile).post("/api/agrupamentos-demandas", json={}).status_code == 422


def test_public_token_flow_keeps_its_own_validation():
    # Token de formato inválido é validado pelo fluxo público, não pela sessão MAD.
    response = client("ANALISTA").post("/api/ahp/comparacao-colaborativa/publico/token/respostas", json={})
    assert response.status_code == 422


def test_tools_are_not_confused_with_mad_prefix():
    assert module_for_path("/api/ahp/superficies-criterios") == "ferramentas"


@pytest.mark.parametrize("profile", ["ANALISTA", "GESTOR", "ADMIN"])
def test_tools_accept_normal_control_for_internal_profiles(profile):
    assert client(profile).post("/api/ahp/superficies-criterios", json={}).status_code == 422


@pytest.mark.parametrize("profile", ["ANALISTA", "GESTOR", "OPERADOR"])
def test_storage_admin_redirect_requires_admin_before_remote_config(profile):
    assert client(profile).get("/sicard/storage/web/admin/login", follow_redirects=False).status_code == 403
