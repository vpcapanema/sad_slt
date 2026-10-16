import hashlib
import json

import httpx
import pytest
from fastapi import HTTPException

from api.services import referencias_territoriais as referencias
from api.services.documentacao_limite_maritimo import montar_contexto


def conteudo():
    raw = json.dumps({'features': [{'geometry': {'type': 'Point', 'coordinates': [0, 0]},
                                   'properties': {'area_km2': 1234.5}}]}).encode()
    fontes = {'sha256': hashlib.sha256(raw).hexdigest(), 'pontos_azimutes': [1, 2]}
    return raw, fontes


def test_contexto_le_somente_storage(monkeypatch):
    raw, fontes = conteudo()
    chamadas = []
    def baixar(path):
        chamadas.append(path)
        return json.dumps(fontes).encode() if path.endswith('-fontes.json') else raw
    monkeypatch.setattr(referencias.storage_remoto, 'baixar', baixar)
    resultado = montar_contexto()
    assert resultado['integridade_marinha'] is True
    assert resultado['area_marinha'] == '1.234,5'
    assert resultado['limites_marinha'] == [1, 2]
    assert chamadas == ['referencias-territoriais/abrangencia-marinha-sp.geojson',
                        'referencias-territoriais/abrangencia-marinha-sp-fontes.json']


@pytest.mark.parametrize('erro', [FileNotFoundError(), httpx.ConnectError('sem conexão'),
                                referencias.storage_remoto.StorageIndisponivel('indisponível')])
def test_indisponibilidade_recusada_sem_fallback_local(monkeypatch, erro):
    def baixar(path):
        raise erro
    monkeypatch.setattr(referencias.storage_remoto, 'baixar', baixar)
    with pytest.raises(HTTPException) as caught:
        referencias.carregar_marinha()
    assert caught.value.status_code == 503


@pytest.mark.parametrize('corromper', ['hash', 'json', 'geometria'])
def test_referencia_corrompida_recusada(monkeypatch, corromper):
    raw, fontes = conteudo()
    if corromper == 'hash':
        fontes['sha256'] = 'incorreto'
    else:
        raw = b'invalido' if corromper == 'json' else b'{"features": []}'
        fontes['sha256'] = hashlib.sha256(raw).hexdigest()
    monkeypatch.setattr(referencias.storage_remoto, 'baixar',
                        lambda path: json.dumps(fontes).encode() if path.endswith('-fontes.json') else raw)
    with pytest.raises(HTTPException) as caught:
        referencias.carregar_marinha()
    assert caught.value.status_code == 503
