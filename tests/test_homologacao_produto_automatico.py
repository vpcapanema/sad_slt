"""As rotas antigas de homologação de camadas permanecem descontinuadas."""
from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token


@pytest.fixture()
def cliente():
    client = TestClient(app)
    client.cookies.set(
        cookie_name(),
        create_token(
            SessionUser(
                id="00000000-0000-0000-0000-000000000010",
                email="gestor@example.org",
                username="teste_gestor",
                nome="Gestor de teste",
                tipo_usuario="GESTOR",
            )
        ),
    )
    return client


@pytest.mark.parametrize("acao", ["homologar", "homologar-job"])
def test_rotas_antigas_de_homologacao_indicam_storage(cliente, acao):
    resposta = cliente.post(
        f"/api/geoespacial/camadas/{uuid4()}/{acao}",
        json={
            "modulo_consumidor": "fase1",
            "nome_publicacao": "Teste de endpoint descontinuado",
            "versao": "v1",
            "metadados": {},
        },
    )

    assert resposta.status_code == 410, resposta.text
    detalhe = resposta.json()["detail"]
    assert "descontinuada" in detalhe
    assert "Sicard Storage" in detalhe
