from __future__ import annotations

import asyncio
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient
from fastapi import HTTPException

from api.deps.auth import require_analyst, require_operator
from api.server import app
from api.services import auth_service
from api.services.session_service import SessionUser, cookie_name, create_token


def test_public_session_probe_does_not_return_401() -> None:
    response = TestClient(app).get("/api/auth/session")

    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "user": None}


def test_public_session_probe_accepts_analista_session() -> None:
    token = create_token(
        SessionUser(
            id="analista-1",
            email="analista@example.org",
            username="maria_analista",
            nome="Pessoa Analista",
            tipo_usuario="ANALISTA",
        )
    )

    with TestClient(app) as client:
        client.cookies.set(cookie_name(), token)
        response = client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.json()["authenticated"] is True
    assert response.json()["user"]["tipo_usuario"] == "ANALISTA"


def test_public_session_probe_accepts_gestor_session() -> None:
    token = create_token(
        SessionUser(
            id="gestor-1",
            email="gestor@example.org",
            username="joao_gestor",
            nome="Pessoa Gestora",
            tipo_usuario="GESTOR",
        )
    )

    with TestClient(app) as client:
        client.cookies.set(cookie_name(), token)
        response = client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.json()["authenticated"] is True
    assert response.json()["user"]["tipo_usuario"] == "GESTOR"


def test_sigma_login_reposts_payload_after_safe_https_redirect(monkeypatch) -> None:
    calls: list[tuple[str, dict[str, str]]] = []
    responses = [
        httpx.Response(
            301,
            headers={"location": "https://56.125.163.194/api/auth/login"},
            request=httpx.Request(
                "POST", "http://56.125.163.194/api/auth/login"
            ),
        ),
        httpx.Response(
            200,
            json={
                "user": {
                    "id": "gestor-1",
                    "username": "joao_gestor",
                    "email_institucional": "gestor@example.org",
                    "nome_completo": "Pessoa Gestora",
                    "tipo_usuario": "GESTOR",
                }
            },
            request=httpx.Request(
                "POST", "https://56.125.163.194/api/auth/login"
            ),
        ),
    ]

    class FakeAsyncClient:
        def __init__(self, **_kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args) -> None:
            return None

        async def post(self, url: str, json: dict[str, str]):
            calls.append((url, json))
            return responses.pop(0)

    monkeypatch.setattr(
        auth_service,
        "get_settings",
        lambda: SimpleNamespace(sigma_api_base="http://56.125.163.194"),
    )
    monkeypatch.setattr(auth_service.httpx, "AsyncClient", FakeAsyncClient)

    user = asyncio.run(auth_service._authenticate_via_api("joao_gestor", "senha-segura"))

    assert user is not None
    assert user.username == "joao_gestor"
    assert [url for url, _payload in calls] == [
        "http://56.125.163.194/api/auth/login",
        "https://56.125.163.194/api/auth/login",
    ]
    assert calls[0][1] == calls[1][1]
    assert calls[0][1]["identifier"] == "joao_gestor"
    assert calls[0][1]["tipo_usuario"] == "GESTOR"


def test_profile_is_derived_from_username_suffix() -> None:
    assert auth_service.profile_from_username("maria_visualizador") == "VISUALIZADOR"
    assert auth_service.profile_from_username("maria_operador") == "OPERADOR"
    assert auth_service.profile_from_username("maria_analista") == "ANALISTA"
    assert auth_service.profile_from_username("maria_gestor") == "GESTOR"
    assert auth_service.profile_from_username("maria_admin") == "ADMIN"


def test_email_is_rejected_as_login() -> None:
    try:
        asyncio.run(auth_service.login_usuario("maria@example.org", "senha-segura"))
    except Exception as exc:
        assert "username SIGMA válido" in str(exc)
    else:
        raise AssertionError("Login por e-mail deveria ser rejeitado")


def test_token_profile_comes_from_username_not_payload() -> None:
    token = create_token(
        SessionUser(
            id="operador-1",
            email="operador@example.org",
            username="carlos_operador",
            nome="Carlos",
            tipo_usuario="GESTOR",
        )
    )
    with TestClient(app) as client:
        client.cookies.set(cookie_name(), token)
        response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["tipo_usuario"] == "OPERADOR"


def _user(profile: str) -> SessionUser:
    return SessionUser(
        id=f"id-{profile.lower()}",
        email="",
        username=f"teste_{profile.lower()}",
        nome="Teste",
        tipo_usuario=profile,
    )


def test_operator_permission_matrix() -> None:
    for profile in ("OPERADOR", "ANALISTA", "GESTOR", "ADMIN"):
        assert require_operator(_user(profile)).tipo_usuario == profile
    try:
        require_operator(_user("VISUALIZADOR"))
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("Visualizador não deve executar operações")


def test_analyst_permission_matrix() -> None:
    for profile in ("ANALISTA", "GESTOR"):
        assert require_analyst(_user(profile)).tipo_usuario == profile
    for profile in ("VISUALIZADOR", "OPERADOR", "ADMIN"):
        try:
            require_analyst(_user(profile))
        except HTTPException as exc:
            assert exc.status_code == 403
        else:
            raise AssertionError(f"{profile} não deve aprovar demandas")


def test_anonymous_user_cannot_access_internal_hierarchy_api() -> None:
    response = TestClient(app).get("/api/ahp/hierarquizacoes")
    assert response.status_code == 401


def test_anonymous_user_cannot_access_geospatial_api() -> None:
    response = TestClient(app).get("/api/geoespacial/algoritmos")
    assert response.status_code == 401


def test_auth_redirect_rejects_different_host() -> None:
    try:
        auth_service._safe_auth_redirect(
            "http://56.125.163.194/api/auth/login",
            "https://example.org/collect",
        )
    except Exception as exc:
        assert "inseguro" in str(exc)
    else:
        raise AssertionError("Redirecionamento externo deveria ser rejeitado")
