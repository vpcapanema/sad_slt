"""Arquivo com mais de um registro no catálogo, e shapefile sem .cpg."""
import glob
import os

import pytest

from api.services.catalogo_arquivos import camadas_dos_arquivos
from api.services.visualizacao_arquivo import ler_arquivo

BASE = 'data/geoespacial/uploads/datastorage/vetor'


def empacotados():
    for pasta in sorted(glob.glob(BASE + '/*/*.zip.contents')):
        shapes = glob.glob(pasta + '/*.shp')
        if len(shapes) == 1:
            yield os.path.basename(pasta), shapes[0].replace(os.sep, '/')


def test_arquivo_com_varios_vinculos_usa_o_registro_mais_recente():
    alvos = [(nome, caminho) for nome, caminho in empacotados()
             if len(camadas_dos_arquivos({caminho})) > 1]
    if not alvos:
        pytest.skip('Nenhum arquivo com registro duplicado neste ambiente.')
    for nome, caminho in alvos:
        vinculos = camadas_dos_arquivos({caminho})
        lido = ler_arquivo(caminho)
        recente = max(vinculos, key=lambda row: row['criado_em'])
        assert lido['id'] == recente['id'], nome
        assert lido['vinculos'] == len(vinculos)
        assert lido['geojson']['features']


def test_shapefile_sem_cpg_le_como_latin1():
    alvos = [(nome, caminho) for nome, caminho in empacotados()
             if not glob.glob(os.path.dirname(caminho) + '/*.cpg')
             and len(camadas_dos_arquivos({caminho})) == 1]
    if not alvos:
        pytest.skip('Nenhum shapefile sem .cpg neste ambiente.')
    latinos = [ler_arquivo(caminho) for _, caminho in alvos]
    assert any(lido['codificacao'] == 'ISO-8859-1' for lido in latinos)
    for lido in latinos:
        for feature in lido['geojson']['features']:
            for valor in (feature['properties'] or {}).values():
                assert not isinstance(valor, bytes)


def test_arquivo_sem_vinculo_continua_recusado(tmp_path):
    with pytest.raises((ValueError, FileNotFoundError)):
        ler_arquivo(BASE + '/RISCO/nao_existe.shp')
