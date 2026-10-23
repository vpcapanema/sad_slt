"""Preparação da favorabilidade V2: fontes originais, papéis e bancada atual."""
from pathlib import Path
from types import SimpleNamespace
import re

import pytest
from fastapi.testclient import TestClient
from osgeo import gdal, osr

from api.server import app
from api.services import configuracao_bancada, extracao_atributos, storage_geoespacial
from api.services.session_service import SessionUser, cookie_name, create_token


@pytest.fixture
def cliente():
    client = TestClient(app)
    client.cookies.set(cookie_name(), create_token(SessionUser(
        id="00000000-0000-0000-0000-000000000010", email="gestor@example.org",
        username="teste_gestor", nome="Gestor de teste", tipo_usuario="GESTOR",
    )))
    return client


def test_mesma_rota_serve_v2_sem_bancada_ou_executor_legados(cliente):
    response = cliente.get("/restrict/hierarquizacao/fase-2/")
    assert response.status_code == 200
    html = response.text
    for item in ("favorabilidade-app", "fv-entrada-browse", "fv-hierarquizacao",
                 "fv-grade-browse", "fv-rede-browse", "ea-input-preview",
                 "ea-layer-information", "fase2-favorabilidade-v2.js"):
        assert item in html
    assert html.count("<iframe ") == 1
    assert 'src="/restrict/geoespacial/bancada/"' in html
    assert "slt-geoprocessamento" not in html
    assert "geoprocessamento-slt.js" not in html
    assert "/js/fase2.js" not in html
    assert "executar-fase2" not in html
    assert "data-requer-autenticacao=\"true\"" in html
    assert "Superfícies de favorabilidade" in html
    assert "Índices e Classes Agregados por Demanda" in html
    assert "Resultados registrados na hierarquização" not in html
    assert "Resultados da Favorabilidade Territorial" in html
    assert 'id="fv-sobreposicoes-title"' not in html
    assert 'class="ahp-subsection-num">6<' not in html
    resultados = html.split('id="ev-resultados"', 1)[1]
    ids = re.findall(r'\bid="([^"]+)"', html)
    assert len(ids) == len(set(ids)), 'Os controles não podem ter identificadores duplicados.'
    assert resultados.index('id="ev-resultados-tabela"') < resultados.index('id="fv-resultados-title"') < resultados.index('id="ev-resultados-download"')
    for id_ in ('ev-resultados-aliases', 'ev-resultados-entrada', 'ev-resultados-base',
                'ev-resultados-mapa', 'ev-resultados-tabela', 'ev-resultados-indices-grafico',
                'ev-resultados-vazias', 'ev-resultados-anterior', 'ev-resultados-proxima',
                'ev-resultados-abrir', 'ev-resultados-tentar', 'ev-resultados-download',
                'ev-resultados-tendencia', 'ev-resultados-dispersao', 'ev-resultados-posicao',
                'ev-resultados-percentil', 'ev-resultados-agregados'):
        assert f'id="{id_}"' in resultados
    assert 'id="ev-resultados-rosca"' not in html
    assert 'Consulte os valores originais de' not in resultados
    assert 'id="ev-resultados-status"' not in resultados
    assert 'id="ev-resultados-qualidade"' not in resultados
    assert 'id="ev-resultados-mapa-origem"' not in resultados
    for controle in ('mapa-superficie', 'mapa-representacao', 'mapa-legenda'):
        assert f'id="ev-resultados-{controle}"' in resultados


def test_v1_permanece_preservada_com_seu_executor():
    template = Path("templates/paginas/hierarquizacao/fase2-favorabilidade.html").read_text(encoding="utf-8")
    executor = Path("hierarquizacao/js/fase2.js").read_text(encoding="utf-8")
    assert "<slt-geoprocessamento" in template
    assert "/js/fase2.js" in template
    assert "HierApi.executarFase2" in executor


def test_v2_mantem_classes_semanticas_de_secoes_e_cards():
    html = Path("templates/paginas/hierarquizacao/fase2-favorabilidade-v2.html").read_text(encoding="utf-8")
    for tag in re.findall(r"<(?:main|section)\b[^>]*>", html):
        classes = re.search(r'class="([^"]*)"', tag).group(1).split()
        assert any(c.startswith("secao-") for c in classes) or "conteudo-principal" in classes
        if "card" in classes:
            assert any(c.startswith("card-") for c in classes)


def test_preparacao_v2_nao_executa_fase1_ou_fase2():
    js = Path("hierarquizacao/js/fase2-favorabilidade-v2.js").read_text(encoding="utf-8")
    assert "superficies-indices/hierarquizacao/favorabilidade" in js
    assert "pastaInicial:PASTA_SUPERFICIES, incluirRasters:true" in js
    for legado in ("executarFase2", "/elegibilidade/", "buffer_ponto_m"):
        assert legado not in js
    envio = js[js.index('async function enviarBancada()'):js.index('async function salvarLista(')]
    assert '/favorabilidade/' not in envio
    assert "/cadastro-geometrias/" in js
    assert "objeto_hierarquizacao:objeto" in js
    assert "mapa.sync(itens(candidato))" in js


@pytest.fixture
def superficie(tmp_path, monkeypatch):
    root = tmp_path / "storage"
    pasta = root / "superficies-indices" / "hierarquizacao" / "favorabilidade"
    pasta.mkdir(parents=True)
    arquivo = pasta / "grade.tif"
    ds = gdal.GetDriverByName("GTiff").Create(str(arquivo), 4, 4, 1, gdal.GDT_Float32)
    ds.SetGeoTransform([-47, 0.01, 0, -23, 0, -0.01])
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    ds.SetProjection(srs.ExportToWkt())
    ds.GetRasterBand(1).Fill(0.5)
    ds = None
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: root)
    monkeypatch.setattr(storage_geoespacial, "montado", lambda: True)
    return "superficies-indices/hierarquizacao/favorabilidade/grade.tif", arquivo


def test_rasters_sao_listados_somente_com_opcao_explicita(superficie):
    caminho, arquivo = superficie
    pasta = caminho.rsplit("/", 1)[0]
    original = arquivo.read_bytes()
    assert storage_geoespacial.navegar(pasta, detalhar=False)["arquivos"] == []
    lista = storage_geoespacial.navegar(pasta, detalhar=False, incluir_rasters=True)["arquivos"]
    assert len(lista) == 1 and lista[0]["tipo"] == "raster"
    assert lista[0]["id"] == f"storage:{caminho}"
    with pytest.raises(ValueError):
        storage_geoespacial.inventariar_arquivo(caminho)
    inventario = storage_geoespacial.inventariar_arquivo(caminho, incluir_rasters=True)
    assert inventario["camadas"][0]["tipo"] == "raster"
    assert arquivo.read_bytes() == original


def test_api_explorador_e_previa_raster_nao_alteram_a_fonte(cliente, superficie):
    caminho, arquivo = superficie
    original = arquivo.read_bytes()
    pasta = caminho.rsplit("/", 1)[0]
    response = cliente.get("/api/geoespacial/storage/navegar", params={
        "caminho": pasta, "detalhar": False, "incluir_rasters": True,
    })
    assert response.status_code == 200
    assert response.json()["arquivos"][0]["tipo"] == "raster"
    response = cliente.get("/api/geoespacial/storage/camadas-arquivo",
                           params={"arquivo": caminho, "incluir_rasters": True})
    assert response.status_code == 200
    assert response.json()["camadas"][0]["id"] == f"storage:{caminho}"
    response = cliente.get("/api/geoespacial/storage/camada/raster-preview", params={"caminho": caminho})
    assert response.status_code == 200
    preview = response.json()
    assert preview["image"].startswith("data:image/png;base64,")
    assert len(preview["bounds"]) == len(preview["coordinates"]) == 4
    assert preview["min"] == preview["max"] == 0.5
    assert arquivo.read_bytes() == original


@pytest.fixture
def listas(tmp_path, monkeypatch, storage_sintetico):
    monkeypatch.setattr(configuracao_bancada, "raiz", lambda: tmp_path)
    layers = {
        "storage:superficies-indices/grade.tif": {
            "id": "storage:superficies-indices/grade.tif", "nome": "Grade",
            "arquivo": "superficies-indices/grade.tif", "tipo": "raster",
        },
        "storage:superficies-indices/rede.gpkg::rede": {
            "id": "storage:superficies-indices/rede.gpkg::rede", "nome": "Rede",
            "arquivo": "superficies-indices/rede.gpkg", "tipo": "vetor",
        },
    }

    def inventario(caminho, *, incluir_rasters=False):
        assert incluir_rasters
        encontrados = [c for c in layers.values() if c["arquivo"] == caminho]
        if not encontrados:
            raise FileNotFoundError("Superfície não encontrada.")
        return {"camadas": encontrados}

    def sem_catalogo():
        pytest.fail("Listas de superfícies não podem depender do catálogo vetorial do banco.")

    monkeypatch.setattr(storage_geoespacial, "inventariar_arquivo", inventario)
    monkeypatch.setattr(extracao_atributos, "catalogo", sem_catalogo)
    return layers


@pytest.mark.parametrize("papel", ["grade", "rede"])
def test_lista_de_superficies_persiste_em_escopo_proprio(listas, papel):
    ident = next(c["id"] for c in listas.values() if c["nome"].lower() == papel)
    escopo = f"favorabilidade-{papel}"
    salvo = configuracao_bancada.salvar("Superfícies", [{"id": papel, "camadas": [ident]}],
                                      SimpleNamespace(id="teste"), escopo=escopo)
    carregado = configuracao_bancada.carregar(salvo["chave"], referencias=True, escopo=escopo)
    assert carregado["escopo"] == escopo
    assert carregado["categorias"][0]["camadas"][0]["tipo"] == listas[ident]["tipo"]
    assert configuracao_bancada.carregar(salvo["chave"], escopo=escopo)["ausentes"] == []
    assert configuracao_bancada.listar("bases") == []
    listas.pop(ident)
    carregado = configuracao_bancada.carregar(salvo["chave"], escopo=escopo)
    assert carregado["categorias"] == []
    assert carregado["ausentes"] == [papel.capitalize()]


def test_listas_nao_misturam_grade_rede_ou_papeis_da_elegibilidade(listas):
    user = SimpleNamespace(id="teste")
    ident = next(iter(listas))
    for papel in ("rede", "restricao", "risco"):
        with pytest.raises(ValueError, match="Categoria inexistente"):
            configuracao_bancada.salvar("Inválida", [{"id": papel, "camadas": [ident]}],
                                       user, escopo="favorabilidade-grade")
    with pytest.raises(ValueError, match="Storage"):
        configuracao_bancada.salvar("Inválida", [{"id": "grade", "camadas": ["camada-banco"]}],
                                   user, escopo="favorabilidade-grade")
    with pytest.raises(ValueError, match="ao menos uma"):
        configuracao_bancada.salvar("Vazia", [], user, escopo="favorabilidade-grade")


@pytest.mark.parametrize("papel", ["grade", "rede"])
def test_api_aceita_escopos_de_lista_da_favorabilidade(cliente, listas, papel):
    ident = next(c["id"] for c in listas.values() if c["nome"].lower() == papel)
    escopo = f"favorabilidade-{papel}"
    response = cliente.post("/api/geoespacial/extracao-atributos/configuracoes", json={
        "nome": "Superfícies", "escopo": escopo, "categorias": [{"id": papel, "camadas": [ident]}],
    })
    assert response.status_code == 201
    chave = response.json()["chave"]
    response = cliente.get(f"/api/geoespacial/extracao-atributos/configuracoes/{chave}",
                           params={"escopo": escopo, "lista": True})
    assert response.status_code == 200
    assert response.json()["escopo"] == escopo
    assert response.json()["categorias"][0]["camadas"][0]["tipo"] == listas[ident]["tipo"]
