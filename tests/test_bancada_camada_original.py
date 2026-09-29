from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.deps.auth import require_geospatial_access
from api.deps.execucao_geoespacial import rastrear_execucao
from api.routers.geoespacial import router
from api.services import bancada_camada_original, storage_geoespacial


def _gpkg(path: Path, feature_count: int = 5) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    dataset = ogr.GetDriverByName("GPKG").CreateDataSource(str(path))
    spatial_ref = osr.SpatialReference()
    spatial_ref.ImportFromEPSG(3857)
    layer = dataset.CreateLayer("areas", spatial_ref, ogr.wkbPolygon)
    layer.CreateField(ogr.FieldDefn("nome", ogr.OFTString))
    layer.CreateField(ogr.FieldDefn("ordem", ogr.OFTInteger))
    for index in range(feature_count):
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetField("nome", f"área-{index}")
        feature.SetField("ordem", index)
        x = index * 1000
        feature.SetGeometry(ogr.CreateGeometryFromWkt(
            f"POLYGON (({x} 0,{x + 500} 0,{x + 500} 500,{x} 500,{x} 0))"
        ))
        layer.CreateFeature(feature)
    dataset = None


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id="teste")
    app.dependency_overrides[rastrear_execucao] = lambda: None
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def storage_file(tmp_path, monkeypatch):
    _gpkg(tmp_path / "base-geoespacial/vetor/original.gpkg")
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: tmp_path)
    return "base-geoespacial/vetor/original.gpkg"


@pytest.fixture
def registered_local_file(tmp_path, monkeypatch):
    relative = "data/geoespacial/outputs/original.gpkg"
    path = tmp_path / relative
    _gpkg(path)
    monkeypatch.setattr(
        bancada_camada_original.path_policy,
        "project_path",
        lambda value, **_: tmp_path / value,
    )
    monkeypatch.setattr(
        "api.services.catalogo_arquivos.camadas_dos_arquivos",
        lambda _: [{
            "id": "camada-local",
            "arquivo": relative,
            "nome": "Camada cadastrada",
            "categoria_catalogo": "processadas",
        }],
    )
    return relative, path


def test_prepara_storage_sem_materializar_geojson(client, storage_file):
    ident = f"storage:{storage_file}::areas"
    response = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": ident, "arquivo": storage_file},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert {
        "id", "nome", "arquivo", "revisao", "campos", "crs_arquivo",
        "feicoes", "geometria_tipo", "bounds", "crs_bounds", "formato", "origem",
        "geometria_tem_z", "geometria_tem_m",
    } <= result.keys()
    assert "geojson" not in result
    assert result["id"] == ident
    assert result["arquivo"] == storage_file
    assert result["nome"] == "original"
    assert result["feicoes"] == 5
    assert result["geometria_tipo"] == "Polygon"
    assert result["geometria_tem_z"] is False
    assert result["geometria_tem_m"] is False
    assert result["formato"] == "GPKG"
    assert result["origem"] == {"tipo": "storage", "camada": "areas"}
    assert [field["nome"] for field in result["campos"]] == ["nome", "ordem"]
    assert result["bounds"][0] == pytest.approx(0)
    assert result["bounds"][2] == pytest.approx(0.04, abs=0.002)
    assert result["bounds"][1] == pytest.approx(0, abs=0.002)
    assert result["bounds"][3] == pytest.approx(0.0045, abs=0.001)


def test_prepara_arquivo_local_so_quando_id_e_caminho_estao_vinculados(
    client, registered_local_file
):
    relative, _ = registered_local_file
    response = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": "camada-local", "arquivo": relative},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["id"] == "camada-local"
    assert result["nome"] == "Camada cadastrada"
    assert result["origem"] == {
        "tipo": "arquivo_registrado",
        "categoria": "processadas",
    }
    assert result["revisao"]
    assert "geojson" not in result

    mismatch = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": "outra-camada", "arquivo": relative},
    )
    assert mismatch.status_code == 422
    escaped = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={
            "id": "camada-local",
            "arquivo": "data/geoespacial/outputs/../../fora.gpkg",
        },
    )
    assert escaped.status_code == 422


def test_storage_id_nao_pode_ser_reapontado_para_outro_arquivo(client, storage_file):
    response = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={
            "id": f"storage:{storage_file}::areas",
            "arquivo": "base-geoespacial/vetor/outro.gpkg",
        },
    )

    assert response.status_code == 422


def test_tabela_le_atributos_em_paginas_e_valida_revisao(
    client, registered_local_file
):
    relative, _ = registered_local_file
    prepared = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": "camada-local", "arquivo": relative},
    ).json()
    first = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={
            "id": "camada-local",
            "arquivo": relative,
            "revisao": prepared["revisao"],
            "offset": 0,
            "limite": 2,
        },
    )

    assert first.status_code == 200, first.text
    page = first.json()
    assert page["total"] == 5
    assert page["offset"] == 0 and page["limite"] == 2
    assert page["has_more"] is True
    assert [row["atributos"]["ordem"] for row in page["linhas"]] == [0, 1]
    assert all("geometria" not in row for row in page["linhas"])
    assert "geojson" not in page

    second = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={
            "id": "camada-local",
            "arquivo": relative,
            "revisao": prepared["revisao"],
            "offset": 4,
            "limite": 2,
        },
    )
    assert second.status_code == 200
    assert [row["atributos"]["ordem"] for row in second.json()["linhas"]] == [4]
    assert second.json()["has_more"] is False

    stale = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={
            "id": "camada-local",
            "arquivo": relative,
            "revisao": "revisao-antiga",
            "offset": 0,
            "limite": 2,
        },
    )
    assert stale.status_code == 422


def test_tabela_impoe_limite_maximo_da_pagina(client, registered_local_file):
    relative, _ = registered_local_file
    response = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={
            "id": "camada-local",
            "arquivo": relative,
            "revisao": "qualquer",
            "offset": 0,
            "limite": 501,
        },
    )
    assert response.status_code == 422


def test_tabela_paginada_tambem_le_storage_com_revisao_compativel(client, storage_file):
    ident = f"storage:{storage_file}::areas"
    prepared = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": ident, "arquivo": storage_file},
    ).json()
    response = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={
            "id": ident,
            "arquivo": storage_file,
            "revisao": prepared["revisao"],
            "offset": 1,
            "limite": 2,
        },
    )

    assert response.status_code == 200, response.text
    assert [row["atributos"]["ordem"] for row in response.json()["linhas"]] == [1, 2]


def test_preparar_e_tabela_exigem_sessao_geoespacial():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as unauthenticated:
        response = unauthenticated.post(
            "/api/geoespacial/bancada-arquivos/preparar",
            json={"id": "storage:base-geoespacial/a.gpkg::layer", "arquivo": "base-geoespacial/a.gpkg"},
        )
    assert response.status_code == 401


def _preparar(client, ident, arquivo):
    response = client.post(
        "/api/geoespacial/bancada-arquivos/preparar",
        json={"id": ident, "arquivo": arquivo},
    )
    assert response.status_code == 200, response.text
    return response.json()["revisao"]


def _geometrias(client, ident, arquivo, revisao, ids):
    return client.post(
        "/api/geoespacial/bancada-arquivos/geometrias",
        json={"id": ident, "arquivo": arquivo, "revisao": revisao, "ids": ids},
    )


def test_geometrias_le_so_fids_pedidos_em_wgs84_no_storage(client, storage_file):
    ident = f"storage:{storage_file}::areas"
    revisao = _preparar(client, ident, storage_file)
    tabela = client.post(
        "/api/geoespacial/bancada-arquivos/tabela",
        json={"id": ident, "arquivo": storage_file, "revisao": revisao,
              "offset": 0, "limite": 5},
    ).json()
    fids = {row["atributos"]["ordem"]: row["id"] for row in tabela["linhas"]}

    response = _geometrias(client, ident, storage_file, revisao, [fids[3], fids[1]])

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["type"] == "FeatureCollection"
    assert result["crs"] == "EPSG:4326"
    assert result["revisao"] == revisao
    assert [feature["id"] for feature in result["features"]] == [fids[3], fids[1]]
    feature = result["features"][0]
    assert feature["properties"] == {"nome": "área-3", "ordem": 3}
    assert feature["geometry"]["type"] == "Polygon"
    lon, lat = feature["geometry"]["coordinates"][0][0]
    assert lon == pytest.approx(3000 / 111319.49, abs=1e-4)
    assert lat == pytest.approx(0, abs=1e-6)
    assert all(abs(x) <= 180 and abs(y) <= 90
               for x, y in feature["geometry"]["coordinates"][0])


def test_geometrias_em_arquivo_local_registrado(client, registered_local_file):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)
    response = _geometrias(client, "camada-local", relative, revisao, ["1"])
    assert response.status_code == 200, response.text
    assert response.json()["features"][0]["properties"]["ordem"] == 0


def test_geometrias_rejeita_ids_inexistentes_invalidos_e_revisao_antiga(
    client, registered_local_file
):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)

    ausente = _geometrias(client, "camada-local", relative, revisao, ["1", "999"])
    assert ausente.status_code == 422
    assert "999" in ausente.json()["detail"]

    for invalido in (["abc"], ["-1"], ["1.5"], [""]):
        response = _geometrias(client, "camada-local", relative, revisao, invalido)
        assert response.status_code == 422, invalido

    stale = _geometrias(client, "camada-local", relative, "revisao-antiga", ["1"])
    assert stale.status_code == 422

    mismatch = _geometrias(client, "outra-camada", relative, revisao, ["1"])
    assert mismatch.status_code == 422


def test_geometrias_impoe_teto_de_ids_e_exige_lista(client, registered_local_file):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)
    excesso = [str(index) for index in range(1, 102)]
    assert _geometrias(client, "camada-local", relative, revisao, excesso).status_code == 422
    assert _geometrias(client, "camada-local", relative, revisao, []).status_code == 422
    with pytest.raises(ValueError):
        bancada_camada_original.ler_geometrias("camada-local", relative, revisao, excesso)


def test_geometrias_exige_sessao_geoespacial():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as unauthenticated:
        response = unauthenticated.post(
            "/api/geoespacial/bancada-arquivos/geometrias",
            json={"id": "storage:base-geoespacial/a.gpkg::layer",
                  "arquivo": "base-geoespacial/a.gpkg", "revisao": "r", "ids": ["1"]},
        )
    assert response.status_code == 401


def test_geometrias_storage_recusa_revisao_apos_arquivo_reescrito(
    client, storage_file, tmp_path
):
    ident = f"storage:{storage_file}::areas"
    revisao = _preparar(client, ident, storage_file)
    path = tmp_path / storage_file
    path.unlink()
    _gpkg(path, feature_count=3)
    stat = path.stat()
    assert revisao != f"{stat.st_mtime_ns}-{stat.st_size}"

    stale = _geometrias(client, ident, storage_file, revisao, ["1"])
    assert stale.status_code == 422
    assert "mudou" in stale.json()["detail"]

    nova = _preparar(client, ident, storage_file)
    assert nova == f"{stat.st_mtime_ns}-{stat.st_size}"
    assert _geometrias(client, ident, storage_file, nova, ["1"]).status_code == 200


def _consulta(client, ident, arquivo, revisao, expressao, **extra):
    return client.post(
        "/api/geoespacial/bancada-arquivos/consulta",
        json={"id": ident, "arquivo": arquivo, "revisao": revisao,
              "expressao": expressao, **extra},
    )


def test_consulta_devolve_pagina_de_fids_sem_geometria(client, registered_local_file):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)

    first = _consulta(client, "camada-local", relative, revisao, "ordem >= 1", limite=2)
    assert first.status_code == 200, first.text
    page = first.json()
    assert page["total"] == 4
    assert page["total_feicoes"] == 5
    assert page["ids"] == ["2", "3"]
    assert page["has_more"] is True
    assert "geojson" not in page and "features" not in page

    last = _consulta(
        client, "camada-local", relative, revisao, "ordem >= 1", offset=2, limite=2
    ).json()
    assert last["ids"] == ["4", "5"] and last["has_more"] is False

    texto = _consulta(client, "camada-local", relative, revisao, "nome == 'área-2'").json()
    assert texto["ids"] == ["3"] and texto["total"] == 1


def test_consulta_inverte_sobre_todos_os_registros_e_lotes(
    client, registered_local_file, monkeypatch
):
    relative, _ = registered_local_file
    monkeypatch.setattr(bancada_camada_original, "_LOTE_CONSULTA", 2)
    revisao = _preparar(client, "camada-local", relative)

    response = _consulta(
        client, "camada-local", relative, revisao,
        "ordem in [1, 3]", inverter_selecao=True, limite=10,
    )
    assert response.status_code == 200, response.text
    assert response.json()["ids"] == ["1", "3", "5"]
    assert response.json()["total"] == 3

    todos = _consulta(client, "camada-local", relative, revisao, "True").json()
    assert todos["total"] == 5
    nenhum = _consulta(client, "camada-local", relative, revisao, "False").json()
    assert nenhum["total"] == 0 and nenhum["ids"] == []


def test_consulta_no_storage_trata_nulos(client, tmp_path, monkeypatch):
    path = tmp_path / "base-geoespacial/vetor/nulos.gpkg"
    _gpkg(path, feature_count=3)
    dataset = ogr.Open(str(path), 1)
    layer = dataset.GetLayer(0)
    feature = layer.GetFeature(2)
    feature.SetFieldNull("ordem")
    layer.SetFeature(feature)
    dataset = None
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: tmp_path)
    arquivo = "base-geoespacial/vetor/nulos.gpkg"
    ident = f"storage:{arquivo}::areas"
    revisao = _preparar(client, ident, arquivo)

    nulos = _consulta(client, ident, arquivo, revisao, "ordem is None").json()
    assert nulos["ids"] == ["2"]
    maiores = _consulta(client, ident, arquivo, revisao, "ordem > 0").json()
    assert maiores["ids"] == ["3"]


def test_consulta_rejeita_expressao_insegura_revisao_e_limites(
    client, registered_local_file
):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)

    for expressao in ("__import__('os')", "campo_inexistente == 1", "ordem ==", "len(nome) > 1"):
        response = _consulta(client, "camada-local", relative, revisao, expressao)
        assert response.status_code == 422, expressao

    stale = _consulta(client, "camada-local", relative, "revisao-antiga", "ordem > 1")
    assert stale.status_code == 422 and "mudou" in stale.json()["detail"]
    assert _consulta(
        client, "camada-local", relative, revisao, "ordem > 1", limite=1001
    ).status_code == 422
    assert _consulta(client, "camada-local", relative, revisao, "").status_code == 422


def test_consulta_nao_le_geometrias(client, registered_local_file, monkeypatch):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)

    def proibido(*_args, **_kwargs):
        raise AssertionError("a consulta não deve ler geometrias")

    monkeypatch.setattr(ogr.Feature, "GetGeometryRef", proibido)
    response = _consulta(client, "camada-local", relative, revisao, "ordem < 2")
    assert response.status_code == 200, response.text
    assert response.json()["ids"] == ["1", "2"]


def _tile(client, z, x, y, **params):
    return client.get(
        f"/api/geoespacial/bancada-arquivos/tiles/{z}/{x}/{y}.pbf", params=params
    )


def _tile_layers(content: bytes, z: int, x: int, y: int) -> dict:
    from osgeo import gdal

    path = f"/vsimem/teste_tile_{id(content)}.pbf"
    gdal.FileFromMemBuffer(path, content)
    try:
        dataset = gdal.OpenEx(path, gdal.OF_VECTOR, open_options=[f"X={x}", f"Y={y}", f"Z={z}"])
        layer = dataset.GetLayer(0)
        return {"nome": layer.GetName(), "feicoes": layer.GetFeatureCount()}
    finally:
        gdal.Unlink(path)


def test_tile_local_registrado_gera_mvt_com_source_layer_camada(
    client, registered_local_file
):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)

    response = _tile(client, 10, 512, 511, id="camada-local", arquivo=relative, revisao=revisao)

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/vnd.mapbox-vector-tile"
    assert response.content
    assert _tile_layers(response.content, 10, 512, 511) == {"nome": "camada", "feicoes": 5}

    vazio = _tile(client, 10, 0, 0, id="camada-local", arquivo=relative, revisao=revisao)
    assert vazio.status_code == 200 and vazio.content == b""


def test_tile_local_valida_grade_revisao_vinculo_e_origem(
    client, registered_local_file, storage_file
):
    relative, _ = registered_local_file
    revisao = _preparar(client, "camada-local", relative)
    base = {"id": "camada-local", "arquivo": relative, "revisao": revisao}

    for z, x, y in ((0, 1, 0), (2, 0, 4), (23, 0, 0), (-1, 0, 0)):
        assert _tile(client, z, x, y, **base).status_code == 422, (z, x, y)
    stale = _tile(client, 0, 0, 0, **{**base, "revisao": "antiga"})
    assert stale.status_code == 422 and "mudou" in stale.json()["detail"]
    assert _tile(client, 0, 0, 0, **{**base, "id": "outra-camada"}).status_code == 422
    assert _tile(client, 0, 0, 0, id="camada-local", arquivo=relative).status_code == 422

    ident = f"storage:{storage_file}::areas"
    storage_revisao = _preparar(client, ident, storage_file)
    storage = _tile(client, 0, 0, 0, id=ident, arquivo=storage_file, revisao=storage_revisao)
    assert storage.status_code == 422


def test_tile_local_arquivo_ausente_retorna_404(client, registered_local_file):
    relative, path = registered_local_file
    revisao = _preparar(client, "camada-local", relative)
    path.unlink()
    response = _tile(client, 0, 0, 0, id="camada-local", arquivo=relative, revisao=revisao)
    assert response.status_code == 404


def test_tile_local_shapefile_invalida_por_componente_lateral(
    client, tmp_path, monkeypatch
):
    relative = "data/geoespacial/outputs/linhas.shp"
    path = tmp_path / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    spatial_ref = osr.SpatialReference()
    spatial_ref.ImportFromEPSG(4326)
    dataset = ogr.GetDriverByName("ESRI Shapefile").CreateDataSource(str(path))
    layer = dataset.CreateLayer("linhas", spatial_ref, ogr.wkbPoint)
    layer.CreateField(ogr.FieldDefn("nome", ogr.OFTString))
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetField("nome", "a")
    feature.SetGeometry(ogr.CreateGeometryFromWkt("POINT (1 1)"))
    layer.CreateFeature(feature)
    dataset = None
    monkeypatch.setattr(
        bancada_camada_original.path_policy, "project_path", lambda value, **_: tmp_path / value
    )
    monkeypatch.setattr(
        "api.services.catalogo_arquivos.camadas_dos_arquivos",
        lambda _: [{"id": "shp-local", "arquivo": relative, "nome": "Linhas"}],
    )
    capturadas = []
    original = bancada_camada_original._assinatura_local
    monkeypatch.setattr(
        bancada_camada_original, "_assinatura_local",
        lambda value: capturadas.append(original(value)) or capturadas[-1],
    )
    revisao = _preparar(client, "shp-local", relative)

    response = _tile(client, 4, 8, 7, id="shp-local", arquivo=relative, revisao=revisao)

    assert response.status_code == 200, response.text
    assert _tile_layers(response.content, 4, 8, 7) == {"nome": "camada", "feicoes": 1}
    assert {nome.rsplit(".", 1)[1] for nome, _, _ in capturadas[-1]} >= {"shp", "shx", "dbf", "prj"}
