from contextlib import nullcontext
import json
from types import SimpleNamespace

import pytest

from api.services import elegibilidade_jobs as jobs


@pytest.fixture
def ambiente(monkeypatch):
    arquivos, tarefas = {}, []

    def baixar(caminho):
        if caminho not in arquivos:
            raise FileNotFoundError(caminho)
        return arquivos[caminho]

    monkeypatch.setattr(jobs, '_jobs', {})
    monkeypatch.setattr(jobs, '_pool', SimpleNamespace(submit=tarefas.append))
    monkeypatch.setattr(jobs, 'executar', lambda *args: {'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original'})
    monkeypatch.setattr(jobs, 'bloquear_arquivo', lambda caminho: nullcontext())
    monkeypatch.setattr(jobs.storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(jobs.storage_remoto, 'enviar_bytes', arquivos.__setitem__)
    monkeypatch.setattr(jobs.storage_remoto, 'mover', lambda a, b: arquivos.__setitem__(b, arquivos.pop(a)))
    monkeypatch.setattr(jobs.storage_remoto, 'listar', lambda pasta: [
        {'nome': caminho[len(pasta) + 1:], 'pasta': False}
        for caminho in arquivos if caminho.startswith(pasta + '/') and '/' not in caminho[len(pasta) + 1:]
    ])
    return arquivos, tarefas


def iniciar():
    return jobs.iniciar({'entrada': {'id': 'entrada', 'nome': 'Demandas'}, 'lote_id': 'rodada'}, 'autor')


def test_status_e_resultado_persistem_sem_memoria_do_worker(ambiente, monkeypatch):
    arquivos, tarefas = ambiente
    inicial = iniciar()
    memoria = jobs._jobs
    monkeypatch.setattr(jobs, '_jobs', {})
    assert jobs.consultar(inicial['id'], 'autor')['status'] == 'executando'
    tarefas.pop()()
    final = jobs.consultar(inicial['id'], 'autor')
    assert final['status'] == 'concluido'
    assert final['resultado']['sha256'] == 'original'
    assert final['resultado']['lote_id'] == 'rodada'
    assert len(arquivos) == 1 and not any('.tmp' in caminho for caminho in arquivos)
    assert 'dono' not in final
    assert memoria[inicial['id']]['controle'].status == 'concluido'
    with pytest.raises(FileNotFoundError):
        jobs.consultar(inicial['id'], 'outro')
    with pytest.raises(ValueError, match='terminou'):
        jobs.cancelar(inicial['id'], 'autor')


def test_cancelamento_recebido_por_outro_worker(ambiente, monkeypatch):
    inicial = iniciar()
    controle = jobs._jobs[inicial['id']]['controle']
    monkeypatch.setattr(jobs, '_jobs', {})
    assert jobs.cancelar(inicial['id'], 'autor')['cancelamento_solicitado']
    controle.ultimo_cancelamento -= 2
    ambiente[1].pop()()
    assert jobs.consultar(inicial['id'], 'autor')['status'] == 'cancelado'
    assert jobs.consultar(inicial['id'], 'autor')['resultado'] is None


def test_falha_preservada_para_outro_worker(ambiente, monkeypatch):
    inicial = iniciar()
    def falhar(*args):
        raise ValueError('Geometria inválida.')
    monkeypatch.setattr(jobs, 'executar', falhar)
    ambiente[1].pop()()
    monkeypatch.setattr(jobs, '_jobs', {})
    estado = jobs.consultar(inicial['id'], 'autor')
    assert estado['status'] == 'erro' and estado['erro'] == 'Geometria inválida.'


def test_registro_nao_pode_trocar_proprietario_ou_execucao(ambiente, monkeypatch):
    inicial = iniciar()
    caminho = jobs._caminho(inicial['id'], 'autor')
    registro = json.loads(ambiente[0][caminho])
    registro['dono'] = 'outro'
    ambiente[0][caminho] = json.dumps(registro).encode()
    monkeypatch.setattr(jobs, '_jobs', {})
    with pytest.raises(FileNotFoundError):
        jobs.consultar(inicial['id'], 'autor')
    with pytest.raises(FileNotFoundError):
        jobs.consultar('../arquivo', 'autor')


def test_storage_indisponivel_nao_retorna_sucesso(ambiente, monkeypatch):
    def falhar(*args):
        raise RuntimeError('Storage indisponível.')
    monkeypatch.setattr(jobs.storage_remoto, 'enviar_bytes', falhar)
    with pytest.raises(RuntimeError, match='Storage indisponível'):
        iniciar()
    assert not ambiente[1] and not jobs._jobs


def test_referencia_de_arquivo_validado_persiste_sem_historico_ou_worker(ambiente, monkeypatch):
    resultado = {'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original'}
    ident = jobs.registrar_saida(resultado, 'outro')
    monkeypatch.setattr(jobs, '_jobs', {})
    registro = jobs.consultar(ident, 'outro')
    assert registro['status'] == 'concluido' and registro['cancelavel'] is False
    assert registro['resultado']['arquivo'] == resultado['arquivo']
    assert registro['resultado']['sha256'] == 'original'
    assert registro['resultado']['origem'] == 'arquivo'
    assert registro['resultado']['total_entradas'] == 1
    assert 'concluido_em' not in registro['resultado']
    assert not ambiente[1] and not jobs._jobs
    with pytest.raises(FileNotFoundError):
        jobs.consultar(ident, 'autor')
    assert jobs.registrar_saida(resultado, 'autor') == ident
    assert jobs.consultar(ident, 'autor')['resultado']['arquivo'] == resultado['arquivo']
    assert len(ambiente[0]) == 2


def test_referencia_preserva_assinatura_de_cada_versao_do_arquivo(ambiente):
    resultado = {'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original'}
    original = jobs.registrar_saida(resultado, 'autor')
    atualizado = jobs.registrar_saida({**resultado, 'sha256': 'nova assinatura'}, 'autor')
    assert original != atualizado
    assert jobs.consultar(original, 'autor')['resultado']['sha256'] == 'original'
    assert jobs.consultar(atualizado, 'autor')['resultado']['sha256'] == 'nova assinatura'


def test_registrar_saida_nao_oculta_storage_indisponivel(ambiente, monkeypatch):
    def falhar(*args):
        raise RuntimeError('Storage indisponível.')
    monkeypatch.setattr(jobs.storage_remoto, 'enviar_bytes', falhar)
    with pytest.raises(RuntimeError, match='Storage indisponível'):
        jobs.registrar_saida({'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original'}, 'autor')


@pytest.mark.parametrize('codigo', [None, 'HIER-TESTE'])
def test_conclusao_vincula_somente_entradas_de_hierarquizacao(ambiente, monkeypatch, codigo):
    from api.services import hierarquizacao_service
    chamadas = []
    resultado = {'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original',
                 'elegibilidade': {'entrada': {}, 'campos': [], **({'hierarquizacao': codigo} if codigo else {})}}
    monkeypatch.setattr(jobs, 'executar', lambda *args: resultado)
    monkeypatch.setattr(hierarquizacao_service, 'registrar_saida_geoespacial_fase1',
                        lambda *args: chamadas.append(args))
    inicial = iniciar()
    ambiente[1].pop()()
    assert jobs.consultar(inicial['id'], 'autor')['status'] == 'concluido'
    assert len(chamadas) == (1 if codigo else 0)
    if codigo:
        assert chamadas[0] == (codigo, resultado, 'autor')


def test_falha_ao_vincular_nao_oculta_saida_ja_gravada(ambiente, monkeypatch):
    from api.services import hierarquizacao_service
    resultado = {'arquivo': 'saidas-geoespaciais/resultado.gpkg', 'sha256': 'original',
                 'elegibilidade': {'hierarquizacao': 'HIER-TESTE'}}
    monkeypatch.setattr(jobs, 'executar', lambda *args: resultado)
    def falhar(*args):
        raise RuntimeError('Banco indisponível para registrar a saída.')
    monkeypatch.setattr(hierarquizacao_service, 'registrar_saida_geoespacial_fase1', falhar)
    inicial = iniciar()
    ambiente[1].pop()()
    final = jobs.consultar(inicial['id'], 'autor')
    assert final['status'] == 'erro' and final['resultado']['arquivo'] == resultado['arquivo']
    assert 'Banco indisponível' in final['erro'] and resultado['arquivo'] in final['erro']
    assert 'sem repetir o cálculo' in final['erro']
