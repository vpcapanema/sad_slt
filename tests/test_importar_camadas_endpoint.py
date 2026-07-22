from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from api.repositories import camada_geoespacial_repository as repository
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token


def _client() -> TestClient:
    client = TestClient(app)
    token = create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010",
        email="gestor@example.org", username="teste_gestor",
        nome="Gestor de teste", tipo_usuario="GESTOR",
    ))
    client.cookies.set(cookie_name(), token)
    return client


def test_importar_camadas_endpoint_persists_validated_point() -> None:
    name = "teste_endpoint_novo.geojson"
    path = Path("data/geoespacial/uploads/datastorage/vetor") / name
    payload = json.dumps({
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": [{
            "type": "Feature", "properties": {"NOME CAMPO": "teste"},
            "geometry": {"type": "Point", "coordinates": [-46.63, -23.55]},
        }],
    }).encode()
    resource_id = None
    try:
        client = _client()
        inspection = client.post(
            "/api/geoespacial/importar_camadas/inspecionar",
            files={"arquivo": (name, payload, "application/geo+json")},
        )
        assert inspection.status_code == 200
        assert inspection.json()["crs_atual"] == "EPSG:4326"
        assert inspection.json()["token_importacao"]

        response = client.post(
            "/api/geoespacial/importar_camadas",
            data={
                "token_importacao": inspection.json()["token_importacao"],
                "reprojetar_crs": "EPSG:4674",
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        resource_id = body["camada_id"]
        assert body["categoria"] == "vetor"
        assert path.exists()

        frame, _ = repository.carregar_vetor(resource_id)
        assert str(frame.crs) == "EPSG:4674"
        assert {"nome_campo", "lat", "long"} <= set(frame.columns)
        assert len(frame) == 1
    finally:
        if resource_id:
            repository.excluir(resource_id)
        path.unlink(missing_ok=True)


def test_imported_layer_uses_normalized_storage_name_and_friendly_alias() -> None:
    original_name = "PontosPrioritários 2026.GEOJSON"
    normalized_path = Path("data/geoespacial/uploads/datastorage/vetor/pontos_prioritarios_2026.geojson")
    payload = json.dumps({
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": [{
            "type": "Feature", "properties": {},
            "geometry": {"type": "Point", "coordinates": [-46.63, -23.55]},
        }],
    }).encode()
    resource_id = None
    try:
        response = _client().post(
            "/api/geoespacial/importar_camadas",
            files={"arquivo": (original_name, payload, "application/geo+json")},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        resource_id = body["camada_id"]
        assert normalized_path.exists()
        assert body["recursos"][0]["nome"] == "Pontos Prioritários 2026"
    finally:
        if resource_id:
            repository.excluir(resource_id)
        normalized_path.unlink(missing_ok=True)


def test_importar_camadas_endpoint_persists_and_marks_invalid_geometry() -> None:
    name = "teste_endpoint_geometria_invalida.geojson"
    path = Path("data/geoespacial/uploads/datastorage/vetor") / name
    payload = json.dumps({
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": [{
            "type": "Feature", "properties": {"id": "area-7"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-46.7, -23.6], [-46.6, -23.5], [-46.6, -23.6], [-46.7, -23.5], [-46.7, -23.6]]],
            },
        }],
    }).encode()
    resource_id = None
    try:
        client = _client()
        inspection = client.post(
            "/api/geoespacial/importar_camadas/inspecionar",
            files={"arquivo": (name, payload, "application/geo+json")},
        )
        assert inspection.status_code == 200, inspection.text
        inspected = inspection.json()
        assert inspected["camadas"][0]["geometrias_invalidas"] == 1

        response = client.post(
            "/api/geoespacial/importar_camadas",
            data={"token_importacao": inspected["token_importacao"]},
        )
        assert response.status_code == 200, response.text
        resource_id = response.json()["camada_id"]
        frame, _ = repository.carregar_vetor(resource_id)
        assert frame.iloc[0]["slt_geometria_valida"] == False
        assert "Auto-interseção" in frame.iloc[0]["slt_diagnostico_geometria"]
    finally:
        if resource_id:
            repository.excluir(resource_id)
        path.unlink(missing_ok=True)
