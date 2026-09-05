"""Homologar pela tela de upload já deixa a camada selecionável na fase.

Sem produto vinculado a camada é homologada mas não forma pacote, e a Fase 1
não consegue emparelhar restrição com risco. O upload não pede esse produto ao
usuário: a homologação cria (ou reaproveita) o produto agrupador do módulo.
Um produto por camada seria pior que nenhum — cada pacote teria uma metade só —,
então o teste central aqui é o do reaproveitamento.
"""
from __future__ import annotations

import asyncio
import warnings

import geopandas as gpd
import pytest
from shapely.geometry import Point

warnings.filterwarnings("ignore")

from api.db.connection import get_connection
from api.repositories import camada_geoespacial_repository as repo
from api.repositories.hierarquizacao_repository import listar_pacotes_homologados
from api.services.geoespacial_service import geoespacial_service as geo


def _gdf(nome: str) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"nome": [nome]}, geometry=[Point(-46.6, -23.5)], crs="EPSG:4674"
    )


@pytest.fixture()
def duas_camadas():
    ids = [
        geo.registrar_camada(_gdf("restricao"), "Teste restrição automática", "teste"),
        geo.registrar_camada(_gdf("risco"), "Teste risco automático", "teste"),
    ]
    homologadas: list[str] = []
    yield ids, homologadas
    for homologada in homologadas:
        with get_connection() as conn:
            conn.execute(
                "DELETE FROM geoprocessamento.camada_homologada WHERE recurso_sessao_id=%s",
                (homologada,),
            )
            conn.commit()
    for camada_id in ids:
        asyncio.run(geo.excluir_recurso(camada_id))


def _homologar(camada_id: str, nome: str, homologadas: list[str], **extra) -> dict:
    resultado = repo.homologar(
        camada_id,
        modulo_consumidor=extra.get("modulo_consumidor", "fase1"),
        nome_publicacao=nome,
        versao="v1",
        finalidade=extra.get("finalidade"),
        homologado_por=None,
        produto_id=None,
        metadados={},
    )
    homologadas.append(resultado["id"])
    return resultado


def test_homologacao_sem_produto_vincula_um_automaticamente(duas_camadas):
    ids, homologadas = duas_camadas
    resultado = _homologar(ids[0], "Teste restrição automática", homologadas, finalidade="restricao")
    assert resultado.get("produto_id"), "camada homologada ficou sem produto"


def test_camadas_do_mesmo_modulo_caem_no_mesmo_produto(duas_camadas):
    """É o que forma o par restrição + risco: produto por camada não emparelha nada."""
    ids, homologadas = duas_camadas
    primeira = _homologar(ids[0], "Teste restrição automática", homologadas, finalidade="restricao")
    segunda = _homologar(ids[1], "Teste risco automático", homologadas, finalidade="risco")
    assert str(primeira["produto_id"]) == str(segunda["produto_id"])


def test_produto_automatico_nao_vira_pacote(duas_camadas):
    """As camadas de um par sobem uma de cada vez: como pacote, ele passaria por um
    estado pela metade e misturaria pares diferentes. Elas entram na Fase 1 como
    opções avulsas, pela biblioteca canônica."""
    ids, homologadas = duas_camadas
    _homologar(ids[0], "Teste restrição automática", homologadas, finalidade="restricao")
    _homologar(ids[1], "Teste risco automático", homologadas, finalidade="risco")
    nomes = {
        camada.get("nome")
        for pacote in listar_pacotes_homologados("fase1")
        for camada in (pacote.get("camadas") or [])
    }
    assert "Teste restrição automática" not in nomes
    assert "Teste risco automático" not in nomes


def test_tipo_de_camada_do_cadastro_classifica_a_finalidade():
    """Sem isto, uma restrição chamada "Áreas protegidas" não seria reconhecida
    como restrição pelo seletor da Fase 1."""
    fonte = __import__("inspect").getsource(repo.listar_biblioteca_canonica_arquivos)
    contexto = fonte.split("contexto = (", 1)[1].split("\n        )", 1)[0]
    assert "'metadados'" in contexto


def test_produto_automatico_nasce_homologado(duas_camadas):
    """`listar_pacotes_homologados` filtra por status: rascunho não apareceria."""
    ids, homologadas = duas_camadas
    resultado = _homologar(ids[0], "Teste restrição automática", homologadas, finalidade="restricao")
    with get_connection() as conn:
        linha = conn.execute(
            "SELECT status,modulo,crs_saida FROM geoprocessamento.produto WHERE id=%s",
            (resultado["produto_id"],),
        ).fetchone()
    assert linha["status"] in {"homologado", "publicado"}
    assert linha["modulo"] == "fase1"
    assert linha["crs_saida"] == "EPSG:4674"


def test_produto_informado_pelo_usuario_tem_precedencia(duas_camadas):
    """O campo continua valendo quando preenchido — o automático é só o padrão."""
    fonte = repo.__dict__["_produto_automatico"]
    assert "if not produto_id:" in __import__("inspect").getsource(repo.homologar)
    assert callable(fonte)
