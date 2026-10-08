"""Camadas lidas direto do storage: pastas viram grupos, arquivos viram camadas.

O storage é somente leitura para o SICARD; os tiles saem do próprio arquivo,
sem passar pelo banco. Estes testes montam um storage mínimo em disco.
"""
from __future__ import annotations

import os
from pathlib import Path

import mercantile
import pytest
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.server import app
from api.services import storage_geoespacial


def _gpkg(caminho: Path, camadas: tuple[str, ...] = ("uf",)) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    ds = ogr.GetDriverByName("GPKG").CreateDataSource(str(caminho))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4674)
    for nome in camadas:
        lyr = ds.CreateLayer(nome, srs, ogr.wkbPolygon)
        lyr.CreateField(ogr.FieldDefn("nome", ogr.OFTString))
        feicao = ogr.Feature(lyr.GetLayerDefn())
        feicao.SetField("nome", "São Paulo")
        feicao.SetGeometry(ogr.CreateGeometryFromWkt("POLYGON((-50 -24,-45 -24,-45 -20,-50 -20,-50 -24))"))
        lyr.CreateFeature(feicao)
    ds = None


@pytest.fixture
def storage(tmp_path, monkeypatch):
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: tmp_path)
    _gpkg(tmp_path / "base-geoespacial/vetor/uf_sp.gpkg")
    _gpkg(tmp_path / "base-geoespacial/vetor/duas.gpkg", ("rios", "lagos"))
    (tmp_path / "base-geoespacial/raster").mkdir(parents=True)
    (tmp_path / "base-geoespacial/vetor/leia-me.txt").write_text("fora da lista", encoding="utf-8")
    (tmp_path / "superficies-indices/hierarquizacao/elegibilidade").mkdir(parents=True)
    (tmp_path / "base-geodatabase").mkdir()
    return tmp_path


def test_pastas_viram_grupos_e_arquivos_viram_camadas(storage):
    arvore = storage_geoespacial.arvore("base-geoespacial")

    assert [grupo["nome"] for grupo in arvore["grupos"]] == ["raster", "vetor"]
    vetor = arvore["grupos"][1]
    assert [camada["nome"] for camada in vetor["camadas"]] == ["rios", "lagos", "uf_sp"], (
        "arquivo com uma camada leva o nome do arquivo; com várias, o de cada camada"
    )
    uf = vetor["camadas"][2]
    assert uf["arquivo"] == "base-geoespacial/vetor/uf_sp.gpkg"
    assert uf["crs"] == "EPSG:4674" and uf["feicoes"] == 1


def test_pastas_aninhadas_de_superficies_indices(storage):
    arvore = storage_geoespacial.arvore("superficies-indices")
    hierarquizacao = arvore["grupos"][0]
    assert hierarquizacao["nome"] == "hierarquizacao"
    assert [grupo["nome"] for grupo in hierarquizacao["grupos"]] == ["elegibilidade"]


def test_contagens_incluem_camadas_de_subpastas_e_arquivos_multicamadas(storage):
    totais = storage_geoespacial.contagens("base-geoespacial")
    assert totais == {
        "base-geoespacial/raster": 0,
        "base-geoespacial/vetor": 3,
        "base-geoespacial": 3,
    }
    assert storage_geoespacial.contagens("base-geodatabase") == {"base-geodatabase": 0}


def test_contagens_mostram_zero_em_todos_os_niveis_vazios(storage):
    assert storage_geoespacial.contagens("superficies-indices") == {
        "superficies-indices/hierarquizacao/elegibilidade": 0,
        "superficies-indices/hierarquizacao": 0,
        "superficies-indices": 0,
    }
    with pytest.raises(ValueError):
        storage_geoespacial.contagens("../fora")


@pytest.mark.parametrize("raiz", ["..", "outra", "uploads"])
def test_so_as_pastas_publicadas_sao_listadas(storage, raiz):
    with pytest.raises(ValueError):
        storage_geoespacial.arvore(raiz)


def test_base_geodatabase_e_legivel_mas_nao_publicada_para_escrita(storage):
    """O visualizador lê as fontes brutas; upload e criação de pastas continuam
    restritos às raízes publicadas."""
    assert storage_geoespacial.arvore("base-geodatabase")["disponivel"] is True
    assert "base-geodatabase" not in storage_geoespacial.RAIZES
    assert storage_geoespacial.RAIZES_LEITURA[0] == "base-geodatabase"


@pytest.mark.parametrize("caminho", ["../fora.gpkg", "/etc/passwd", "base-geoespacial/../../x.gpkg", "uploads/a.gpkg"])
def test_caminho_de_camada_nao_sai_do_storage(storage, caminho):
    with pytest.raises(ValueError):
        storage_geoespacial.resolver(caminho)


def test_extensao_e_tile_saem_do_arquivo(storage):
    minx, miny, maxx, maxy = storage_geoespacial.bounds("base-geoespacial/vetor/uf_sp.gpkg", "uf")
    assert (round(minx), round(miny), round(maxx), round(maxy)) == (-50, -24, -45, -20)

    tile = mercantile.tile(-47.5, -22, 6)
    conteudo = storage_geoespacial.tile("base-geoespacial/vetor/uf_sp.gpkg", "uf", 6, tile.x, tile.y)
    assert conteudo, "tile sobre a feição não pode vir vazio"
    longe = mercantile.tile(120, 40, 6)
    assert storage_geoespacial.tile("base-geoespacial/vetor/uf_sp.gpkg", "uf", 6, longe.x, longe.y) == b""


def test_explorador_navega_pastas_e_lista_cada_camada(storage):
    raiz = storage_geoespacial.navegar("")
    assert raiz["caminho"] == "base-geoespacial" and raiz["pai"] is None
    assert [pasta["caminho"] for pasta in raiz["pastas"]] == ["base-geoespacial/raster", "base-geoespacial/vetor"]

    vetor = storage_geoespacial.navegar("base-geoespacial/vetor")
    assert vetor["pai"] == "base-geoespacial"
    assert [c["id"] for c in vetor["arquivos"]] == [
        "storage:base-geoespacial/vetor/duas.gpkg::rios",
        "storage:base-geoespacial/vetor/duas.gpkg::lagos",
        "storage:base-geoespacial/vetor/uf_sp.gpkg::uf",
    ], "o txt fica fora e o GeoPackage com duas camadas vira duas entradas"
    with pytest.raises(ValueError):
        storage_geoespacial.navegar("../fora")


def test_extracao_le_a_camada_do_arquivo_sem_banco(storage):
    frame = storage_geoespacial.carregar_gdf("storage:base-geoespacial/vetor/duas.gpkg::lagos")
    assert len(frame) == 1 and frame.crs.to_epsg() == 4674
    assert frame.iloc[0]["nome"] == "São Paulo"

    mapa = storage_geoespacial.ler_para_mapa("storage:base-geoespacial/vetor/uf_sp.gpkg::uf")
    assert mapa["id"] == "storage:base-geoespacial/vetor/uf_sp.gpkg::uf"
    assert mapa["arquivo"] == "base-geoespacial/vetor/uf_sp.gpkg" and mapa["revisao"]
    assert [campo["nome"] for campo in mapa["campos"]] == ["nome"]
    assert len(mapa["geojson"]["features"]) == 1

    for invalido in ("0f9c2a", "storage:../x.gpkg::a"):
        with pytest.raises(ValueError):
            storage_geoespacial.carregar_gdf(invalido)


def test_pagina_renomeada_e_rota_antiga_redireciona():
    client = TestClient(app)
    antiga = client.get("/restrict/geoespacial/visualizador-insumos-geoespaciais/", follow_redirects=False)
    assert antiga.status_code == 308
    assert antiga.headers["location"] == "/restrict/geoespacial/visualizador-bases-geoespaciais/"

    indice = Path("templates/paginas/geoespacial/index.html").read_text(encoding="utf-8")
    assert "Visualizador de camadas" in indice
    assert 'href="/restrict/geoespacial/visualizador-camadas/"' in indice
    assert "insumos geoespaciais" not in indice.lower()


def test_listagem_rapida_nao_abre_arquivos_nem_pacotes(storage, monkeypatch):
    (storage / 'base-geoespacial/vetor/pacote.zip').write_bytes(b'conteudo-nao-lido')

    def proibido(*args):
        pytest.fail('Navegar não deve abrir ou descompactar arquivos')

    monkeypatch.setattr(storage_geoespacial, '_itens_do_arquivo', proibido)
    lista = storage_geoespacial.navegar('base-geoespacial/vetor', detalhar=False)
    assert len(lista['arquivos']) == 3
    assert all(a['inventariar'] for a in lista['arquivos'])
    assert {a['arquivo'].split('/')[-1] for a in lista['arquivos']} == {'duas.gpkg', 'uf_sp.gpkg', 'pacote.zip'}


def test_inventario_somente_do_arquivo_confirmado(storage):
    result = storage_geoespacial.inventariar_arquivo('base-geoespacial/vetor/duas.gpkg')
    assert [c['camada'] for c in result['camadas']] == ['rios', 'lagos']
    with pytest.raises(ValueError):
        storage_geoespacial.inventariar_arquivo('../segredo.gpkg')


@pytest.fixture
def vm(tmp_path, monkeypatch):
    """Servidor local sem montagem: o storage é o da VM, lido pela API do SFTPGo."""
    monkeypatch.setattr(storage_geoespacial, "diretorio_storage", lambda: tmp_path / "sem-montagem")
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "configurado", lambda: True)
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "preparar_gdal", lambda: None)
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "endereco_vsi",
                        lambda caminho: f"/vsicurl/https://storage.exemplo/user/files?path=/{caminho}")
    return monkeypatch


def _vm_publica(monkeypatch, arquivos: dict[str, bytes], instante: float = 1_700_000_000.0):
    """Faz a API do SFTPGo responder pelo conjunto de arquivos informado."""
    def listar(pasta, estrito=False):
        prefixo = f"{str(pasta).strip('/')}/"
        filhos: dict[str, bool] = {}
        for caminho in arquivos:
            if caminho.startswith(prefixo):
                resto = caminho[len(prefixo):].split("/")
                filhos[resto[0]] = len(resto) > 1
        if not filhos and estrito:
            raise FileNotFoundError(pasta)
        return [{"nome": nome, "pasta": pasta_filha, "modificado": instante,
                 "tamanho": 0 if pasta_filha else len(arquivos[prefixo + nome])}
                for nome, pasta_filha in filhos.items()]

    def baixar(caminho):
        if caminho not in arquivos:
            raise FileNotFoundError(caminho)
        return arquivos[caminho]

    monkeypatch.setattr(storage_geoespacial.storage_remoto, "listar", listar)
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "baixar", baixar)


def test_sem_montagem_a_navegacao_vem_do_storage_da_vm(vm):
    _vm_publica(vm, {"superficies-indices/remoto/sub/x.gpkg": b"x",
                     "superficies-indices/remoto/br.gpkg": b"y",
                     "superficies-indices/remoto/leia-me.txt": b"z"})
    lista = storage_geoespacial.navegar("superficies-indices/remoto", detalhar=False)

    assert not storage_geoespacial.montado(), "no servidor local não há pasta montada"
    assert lista["pai"] == "superficies-indices"
    assert [p["caminho"] for p in lista["pastas"]] == ["superficies-indices/remoto/sub"]
    assert [a["arquivo"] for a in lista["arquivos"]] == ["superficies-indices/remoto/br.gpkg"]
    assert lista["arquivos"][0]["inventariar"], "o arquivo remoto só é aberto quando escolhido"
    with pytest.raises(FileNotFoundError):
        storage_geoespacial.navegar("superficies-indices/vazia")


def test_arquivo_remoto_e_lido_na_origem_sem_copia_local(tmp_path, vm):
    """O norte do desenho: nenhuma pasta de trabalho local, nem dentro nem fora do storage."""
    _gpkg(tmp_path / "origem/uf_sp.gpkg")
    dados = (tmp_path / "origem/uf_sp.gpkg").read_bytes()
    alvo = "base-geoespacial/vetor/uf_sp.gpkg"
    _vm_publica(vm, {alvo: dados})

    arquivo = storage_geoespacial.resolver(alvo)

    assert not isinstance(arquivo, Path), "o arquivo remoto não vira arquivo em disco"
    assert os.fspath(arquivo).startswith("/vsicurl/"), "o GDAL abre o arquivo onde ele está"
    assert arquivo.name == "uf_sp.gpkg" and arquivo.suffix == ".gpkg"
    assert arquivo.stat().st_size == len(dados)
    assert arquivo.read_bytes() == dados
    assert not (tmp_path / "sem-montagem").exists(), "o ponto de montagem continua vazio"
    assert [p.name for p in tmp_path.iterdir()] == ["origem"], "nenhuma pasta de trabalho é criada"


def test_leitura_remota_nao_encurta_a_listagem_do_storage(tmp_path, vm):
    """A regressão que motivou o desenho: nada local pode virar fonte da lista."""
    _gpkg(tmp_path / "origem/uf_sp.gpkg")
    dados = (tmp_path / "origem/uf_sp.gpkg").read_bytes()
    _vm_publica(vm, {"base-geoespacial/vetor/uf_sp.gpkg": dados,
                     "base-geoespacial/vetor/rios.gpkg": dados,
                     "base-geoespacial/vetor/lagos.gpkg": dados})

    storage_geoespacial.resolver("base-geoespacial/vetor/uf_sp.gpkg")
    lista = storage_geoespacial.navegar("base-geoespacial/vetor", detalhar=False)

    assert len(lista["arquivos"]) == 3, "a lista continua vindo do storage"


def test_a_revisao_acompanha_a_origem(tmp_path, vm):
    """A revisão vem do storage: é ela que invalida cache e barra gravação desatualizada."""
    _gpkg(tmp_path / "origem/uf_sp.gpkg")
    antes = (tmp_path / "origem/uf_sp.gpkg").read_bytes()
    alvo = "base-geoespacial/vetor/uf_sp.gpkg"
    _vm_publica(vm, {alvo: antes})
    primeira = storage_geoespacial.resolver(alvo).stat()

    _gpkg(tmp_path / "origem/duas.gpkg", ("rios", "lagos"))
    depois = (tmp_path / "origem/duas.gpkg").read_bytes()
    _vm_publica(vm, {alvo: depois}, instante=1_800_000_000.0)
    segunda = storage_geoespacial.resolver(alvo).stat()

    assert storage_geoespacial.resolver(alvo).read_bytes() == depois
    assert (segunda.st_mtime_ns, segunda.st_size) != (primeira.st_mtime_ns, primeira.st_size)


def test_shapefile_aponta_para_o_proprio_arquivo_no_storage(vm):
    """O GDAL pede sozinho os acompanhantes trocando a extensão do endereço."""
    _vm_publica(vm, {"base-geoespacial/vetor/limite.shp": b"x",
                     "base-geoespacial/vetor/limite.shx": b"y",
                     "base-geoespacial/vetor/limite.dbf": b"z"})
    alvo = storage_geoespacial.resolver("base-geoespacial/vetor/limite.shp")

    assert os.fspath(alvo).endswith("/base-geoespacial/vetor/limite.shp")
    assert alvo.with_suffix(".shx").exists()
    assert not alvo.with_suffix(".prj").exists()


def test_sem_montagem_e_sem_credenciais_o_storage_responde_404(vm):
    vm.setattr(storage_geoespacial.storage_remoto, "configurado", lambda: False)
    with pytest.raises(FileNotFoundError):
        storage_geoespacial.resolver("base-geoespacial/vetor/ausente.gpkg")
    with pytest.raises(FileNotFoundError):
        storage_geoespacial.navegar("base-geoespacial/ausente")


def test_com_montagem_o_storage_e_lido_do_disco(storage, monkeypatch):
    def proibido(*_args, **_kwargs):
        raise AssertionError("com storage montado nada deve ser pedido à API")

    monkeypatch.setattr(storage_geoespacial.storage_remoto, "configurado", lambda: True)
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "listar", proibido)
    monkeypatch.setattr(storage_geoespacial.storage_remoto, "baixar", proibido)

    assert storage_geoespacial.montado()
    assert storage_geoespacial.resolver("base-geoespacial/vetor/uf_sp.gpkg").is_file()
    assert storage_geoespacial.navegar("base-geoespacial")["pastas"]
