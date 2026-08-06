from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from pytest import MonkeyPatch

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


def test_ambientes_geoprocessamento_obtem_configuracao_do_usuario(
    monkeypatch: MonkeyPatch,
) -> None:
    async def obter(usuario_id: str) -> dict:
        assert usuario_id == "00000000-0000-0000-0000-000000000010"
        return {"crs": "EPSG:31983", "resolution": 50, "overwrite": True}

    monkeypatch.setattr(
        "api.routers.geoespacial.geoespacial_repository.obter_ambiente_usuario", obter,
    )

    response = _client().get("/api/geoespacial/ambientes")

    assert response.status_code == 200, response.text
    assert response.json() == {"crs": "EPSG:31983", "resolution": 50.0, "overwrite": True}


def test_ambientes_geoprocessamento_persiste_configuracao_do_usuario(
    monkeypatch: MonkeyPatch,
) -> None:
    async def salvar(usuario_id: str, configuracao: dict) -> dict:
        assert usuario_id == "00000000-0000-0000-0000-000000000010"
        assert configuracao == {"crs": "EPSG:4326", "resolution": 30.0, "overwrite": False}
        return configuracao

    monkeypatch.setattr(
        "api.routers.geoespacial.geoespacial_repository.salvar_ambiente_usuario", salvar,
    )

    response = _client().put(
        "/api/geoespacial/ambientes",
        json={"crs": "EPSG:4326", "resolution": 30, "overwrite": False},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"crs": "EPSG:4326", "resolution": 30.0, "overwrite": False}


def test_catalogo_portal_lista_servicos_configurados(monkeypatch: MonkeyPatch) -> None:
    async def listar() -> list[dict]:
        return [{"id": "servico-1", "nome": "Mapas públicos", "tipo": "WMS", "url": "https://exemplo.test/wms"}]

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.listar_servicos_portal", listar)

    response = _client().get("/api/geoespacial/catalogo/portal/servicos")

    assert response.status_code == 200, response.text
    assert response.json()[0]["tipo"] == "WMS"


def test_catalogo_projeto_expoe_toolbox_com_nomes_de_ferramentas(
    monkeypatch: MonkeyPatch,
) -> None:
    async def listar() -> list[dict]:
        return []

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.listar_servicos_portal", listar)

    response = _client().get("/api/geoespacial/catalogo/projeto")

    assert response.status_code == 200, response.text
    toolbox = response.json()["toolboxes"][0]
    assert toolbox["nome"] == "SIRCADI Toolbox"
    ferramentas = [
        ferramenta["nome"]
        for grupo in toolbox["grupos"]
        for ferramenta in grupo["ferramentas"]
    ]
    assert "Reprojetar Camada" in ferramentas
    assert "OP-36" not in ferramentas


def test_portal_importa_asset_stac_no_catalogo(monkeypatch: MonkeyPatch) -> None:
    async def obter(servico_id: str) -> dict:
        assert servico_id == "servico-stac"
        return {"id": servico_id, "tipo": "STAC", "url": "https://stac.exemplo.test"}

    async def importar(url: str, nome: str, bbox: list[float]) -> dict:
        assert url == "https://dados.exemplo.test/cena.tif"
        assert nome == "Cena de teste"
        assert bbox == [-48.0, -24.0, -47.0, -23.0]
        return {"raster_id": "raster-stac", "nome": nome, "tipo": "raster"}

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.obter_servico_portal", obter)
    monkeypatch.setattr("api.routers.geoespacial.geoespacial_service.importar_raster_url", importar)

    response = _client().post("/api/geoespacial/catalogo/portal/stac/importar", json={
        "servico_id": "servico-stac", "url": "https://dados.exemplo.test/cena.tif",
        "titulo": "Cena de teste", "bbox": [-48, -24, -47, -23],
    })

    assert response.status_code == 200, response.text
    assert response.json()["raster_id"] == "raster-stac"


def test_portal_stac_normaliza_fim_temporal_aberto(monkeypatch: MonkeyPatch) -> None:
    async def obter(servico_id: str) -> dict:
        assert servico_id == "servico-stac"
        return {"id": servico_id, "tipo": "STAC", "url": "https://stac.exemplo.test"}

    class Resposta:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "collections": [{
                    "id": "colecao-aberta",
                    "extent": {"temporal": {"interval": [["2015-06-27T10:25:31Z", None]]}},
                }],
            }

    class Cliente:
        def __init__(self, **_: object) -> None:
            pass

        async def __aenter__(self) -> "Cliente":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def get(self, _: str) -> Resposta:
            return Resposta()

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.obter_servico_portal", obter)
    monkeypatch.setattr("api.routers.geoespacial.httpx.AsyncClient", Cliente)

    response = _client().get("/api/geoespacial/catalogo/portal/servico-stac/colecoes")

    assert response.status_code == 200, response.text
    assert response.json() == [{
        "id": "colecao-aberta", "titulo": "colecao-aberta",
        "inicio": "2015-06-27T10:25:31Z", "fim": "",
    }]


def test_portal_stac_expoe_apenas_assets_geotiff(monkeypatch: MonkeyPatch) -> None:
    async def obter(servico_id: str) -> dict:
        assert servico_id == "servico-stac"
        return {"id": servico_id, "tipo": "STAC", "url": "https://stac.exemplo.test"}

    class Resposta:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"features": [{"id": "cena-1", "assets": {
                "visual": {"href": "https://dados.exemplo.test/cena.tif", "type": "image/tiff; application=geotiff"},
                "metadata": {"href": "https://dados.exemplo.test/cena.json", "type": "application/json"},
            }}]}

    class Cliente:
        def __init__(self, **_: object) -> None:
            pass

        async def __aenter__(self) -> "Cliente":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, _: str, json: dict) -> Resposta:
            assert json["collections"] == ["colecao"]
            return Resposta()

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.obter_servico_portal", obter)
    monkeypatch.setattr("api.routers.geoespacial.httpx.AsyncClient", Cliente)

    response = _client().post("/api/geoespacial/catalogo/portal/stac/buscar", json={
        "servico_id": "servico-stac", "colecao": "colecao",
    })

    assert response.status_code == 200, response.text
    assert response.json()[0]["assets"] == [{
        "chave": "visual", "titulo": "visual", "url": "https://dados.exemplo.test/cena.tif",
        "tipo": "image/tiff; application=geotiff",
    }]


def test_portal_mapbiomas_lista_series_anuais(monkeypatch: MonkeyPatch) -> None:
    async def obter(servico_id: str) -> dict:
        assert servico_id == "mapbiomas"
        return {"id": servico_id, "tipo": "MAPBIOMAS", "url": "https://brasil.mapbiomas.org/colecoes-mapbiomas/"}

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.obter_servico_portal", obter)

    response = _client().get("/api/geoespacial/catalogo/portal/mapbiomas/mapbiomas/colecoes")

    assert response.status_code == 200, response.text
    assert response.json() == [
        {"id": "cobertura-10-1-30m", "titulo": "Cobertura e uso da terra - Coleção 10.1 (30 m)", "inicio": 1985, "fim": 2024, "url": "https://brasil.mapbiomas.org/colecoes-mapbiomas/", "descricao": "Série anual nacional revisada pelo MapBiomas."},
        {"id": "cobertura-3-10m", "titulo": "Cobertura e uso da terra - Coleção 3 beta (10 m)", "inicio": 2017, "fim": 2024, "url": "https://brasil.mapbiomas.org/mapbiomas-cobertura-10m/", "descricao": "Série anual de maior resolução, baseada em Sentinel-2."},
    ]


def test_catalogo_favoritos_usa_usuario_autenticado(monkeypatch: MonkeyPatch) -> None:
    async def listar(usuario_id: str) -> list[dict]:
        assert usuario_id == "00000000-0000-0000-0000-000000000010"
        return [{"servico_id": "servico-1", "camada": "limites", "titulo": "Limites", "tipo": "WFS"}]

    monkeypatch.setattr("api.routers.geoespacial.geoespacial_repository.listar_favoritos_portal", listar)

    response = _client().get("/api/geoespacial/catalogo/favoritos")

    assert response.status_code == 200, response.text
    assert response.json()[0]["camada"] == "limites"


def test_inspecionar_camadas_returns_internal_error_for_unexpected_failure(
    monkeypatch: MonkeyPatch,
) -> None:
    def fail_inspection(_filename: str, _content: bytes) -> dict:
        raise OSError("storage indisponível")

    monkeypatch.setattr("api.routers.geoespacial.inspecionar_camadas", fail_inspection)

    response = _client().post(
        "/api/geoespacial/importar_camadas/inspecionar",
        files={"arquivo": ("teste.geojson", b"{}", "application/geo+json")},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Não foi possível inspecionar o arquivo. Consulte o log do servidor."


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
        assert inspection.json()["crs_identificado"] == "EPSG:4326"
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
        assert not frame.iloc[0]["slt_geometria_valida"]
        assert "Auto-interseção" in frame.iloc[0]["slt_diagnostico_geometria"]
    finally:
        if resource_id:
            repository.excluir(resource_id)
        path.unlink(missing_ok=True)
