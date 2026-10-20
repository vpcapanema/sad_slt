from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from urllib.parse import quote
import json
import os
import zipfile

import pytest

from api import storage_policy
from scripts import migrar_destinos_storage as migracao


ANTIGO = 'saidas-geoespaciais/execucoes/abc/camadas/camada.gpkg'
NOVO = 'saidas-geoespaciais/analises-avulsas/ferramenta/analise_abc/camada.gpkg'


@pytest.mark.parametrize('prefixo,seguro', [('', None), ('storage:', None), ('storage:', ''), ('', '/'), ('/', '')])
def test_remapeia_caminho_id_e_url_sem_substituir_prefixo_semelhante(prefixo, seguro):
    remap = migracao.Remapeamento({ANTIGO: NOVO})
    antes, depois = prefixo + ANTIGO, prefixo + NOVO
    if seguro is not None:
        antes, depois = quote(antes, safe=seguro), quote(depois, safe=seguro)
    assert remap.texto(antes) == depois
    assert remap.texto('https://sicard/api?arquivo=' + antes + '&x=1') == 'https://sicard/api?arquivo=' + depois + '&x=1'
    assert remap.texto(antes + '.backup') == antes + '.backup'


def test_remapeia_chaves_sem_alterar_auditoria_e_nomes_da_analise_original():
    remap = migracao.Remapeamento({ANTIGO: NOVO})
    doc = {'arquivo': ANTIGO, 'nomes': {ANTIGO: 'Camada'}, 'logs': [ANTIGO],
           'elegibilidade': {'entrada': {'id': 'storage:' + ANTIGO}}}
    resultado = remap.valor(doc, revisao=True)
    assert resultado['arquivo'] == NOVO
    assert resultado['nomes'] == doc['nomes']
    assert resultado['logs'] == doc['logs']
    assert resultado['elegibilidade'] == doc['elegibilidade']
    assert remap.valor({ANTIGO: 'Camada'}) == {NOVO: 'Camada'}


def test_dependencias_de_hash_tamanho_e_revisao_sao_atualizadas():
    a = ANTIGO + '.json'
    b = ANTIGO + '.manifesto.json'
    primeiro = json.dumps({'arquivo': ANTIGO}).encode()
    segundo = json.dumps({'arquivo': a, 'sha256': migracao.assinatura(primeiro),
                          'tamanho_bytes': len(primeiro), 'revisao': '123-1'}).encode()
    originais = {a: primeiro, b: segundo, ANTIGO: b'gpkg-original'}
    mapa = {a: NOVO + '.json', b: NOVO + '.manifesto.json', ANTIGO: NOVO}
    arquivos, remap = migracao.transformar_jsons(originais, mapa)
    manifesto = json.loads(arquivos[b])
    assert manifesto['sha256'] == migracao.assinatura(arquivos[a])
    assert manifesto['tamanho_bytes'] == len(arquivos[a])
    assert manifesto['revisao'] == '123-' + str(len(arquivos[a]))
    assert remap.texto(migracao.assinatura(segundo)) == migracao.assinatura(arquivos[b])
    assert arquivos[ANTIGO] == originais[ANTIGO]


@pytest.mark.parametrize('caminho', ['../fora.json', '/absoluto.json', 'a\\b.json', 'a/../b.json'])
def test_recusa_caminhos_fora_da_montagem(tmp_path, caminho):
    with pytest.raises(ValueError):
        migracao.caminho_fisico(tmp_path, caminho)


def test_publicacao_define_grupo_e_permissoes_antes_do_replace(tmp_path, monkeypatch):
    origem, destino = tmp_path / 'temp', tmp_path / 'destino.json'
    origem.write_bytes(b'novo')
    destino.write_bytes(b'antigo')
    chown, chmod = Mock(), Mock()
    valores = dict(vars(os), name='posix', chown=chown, chmod=chmod)
    monkeypatch.setattr(storage_policy, 'os', SimpleNamespace(**valores))
    storage_policy.publicar_arquivo(origem, destino)
    chown.assert_called_once_with(origem, -1, tmp_path.stat().st_gid)
    chmod.assert_called_once_with(origem, 0o660)
    assert destino.read_bytes() == b'novo' and not origem.exists()


def test_falha_de_permissao_nao_substitui_configuracao(tmp_path, monkeypatch):
    origem, destino = tmp_path / 'temp', tmp_path / 'destino.json'
    origem.write_bytes(b'novo')
    destino.write_bytes(b'antigo')
    valores = dict(vars(os), name='posix', chown=Mock(side_effect=PermissionError('grupo')),
                   chmod=Mock(), replace=Mock())
    monkeypatch.setattr(storage_policy, 'os', SimpleNamespace(**valores))
    with pytest.raises(PermissionError, match='grupo'):
        storage_policy.publicar_arquivo(origem, destino)
    storage_policy.os.replace.assert_not_called()
    assert destino.read_bytes() == b'antigo' and origem.read_bytes() == b'novo'


def test_pastas_novas_recebem_escrita_do_grupo_mesmo_com_setgid_herdado(tmp_path, monkeypatch):
    chown, chmod = Mock(), Mock()
    monkeypatch.setattr(migracao, 'os', SimpleNamespace(**dict(vars(os), chown=chown, chmod=chmod)))
    migracao.gravar(tmp_path, 'analises/execucao/arquivo.json', b'{}', mtime_ns=123000000000)
    assert (tmp_path / 'analises/execucao/arquivo.json').read_bytes() == b'{}'
    assert {call.args for call in chmod.call_args_list} == {
        (tmp_path / 'analises', 0o2770), (tmp_path / 'analises/execucao', 0o2770)}
    assert {call.args for call in chown.call_args_list} == {
        (tmp_path / 'analises', -1, 1000), (tmp_path / 'analises/execucao', -1, 1000)}


def test_zip_de_geopackages_identicos_usa_vinculo_do_job(tmp_path, monkeypatch):
    root = tmp_path
    saidas = root / 'saidas-geoespaciais'
    caminhos = []
    for indice in (1, 2):
        p = saidas / ('elegibilidade-' + str(indice) * 32) / 'analise.gpkg'
        p.parent.mkdir(parents=True)
        p.write_bytes(b'geopackages-identicos')
        relativo = p.relative_to(root).as_posix()
        caminhos.append(relativo)
        job = saidas / 'elegibilidade-execucoes' / 'usuario' / f'job-{indice}.json'
        job.parent.mkdir(parents=True, exist_ok=True)
        job.write_text(json.dumps({'id': f'job-{indice}', 'status': 'concluido',
                                   'resultado': {'arquivo': relativo, 'lote_id': str(indice)}}))
    pacote = saidas / 'relatorios-elegibilidade' / 'pacote' / 'relatorio.zip'
    pacote.parent.mkdir(parents=True)
    with zipfile.ZipFile(pacote, 'w') as z:
        z.writestr('camadas/analise.gpkg', b'geopackages-identicos')
        z.writestr('metadados.json', json.dumps({'entradas': [{'id': 'job-2'}]}))
    monkeypatch.setattr(migracao, 'metadados_gpkg', lambda *a: {})
    conn = Mock()
    conn.execute.return_value = []
    mapa, _ = migracao.destinos(root, conn)
    destino_pacote = mapa[pacote.relative_to(root).as_posix()]
    assert str(Path(destino_pacote).parent) == str(Path(mapa[caminhos[1]]).parent)
    assert str(Path(mapa[caminhos[0]]).parent) != str(Path(mapa[caminhos[1]]).parent)
