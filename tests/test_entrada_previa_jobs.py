import json
from time import monotonic, sleep
import pytest
from api.services import entrada_previa_jobs as jobs


def esperar(ident, dono):
    limite = monotonic()+45
    while monotonic()<limite:
        job=jobs.obter(ident,dono)
        if job['status'] not in ('executando','pendente'):
            return job
        sleep(.05)
    pytest.fail('Validação não terminou')


def test_validacao_real_sem_persistencia_e_isolamento():
    payload=json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'id':1},'geometry':{'type':'Point','coordinates':[-46.6,-23.5]}}]}).encode()
    job=jobs.iniciar(payload,'pontos.geojson','autor')
    with pytest.raises(FileNotFoundError):jobs.obter(job['id'],'outro')
    with pytest.raises(FileNotFoundError):jobs.cancelar(job['id'],'outro')
    final=esperar(job['id'],'autor')
    assert final['status']=='concluido', final.get('erro')
    assert final['resultado']['resumo']['validas']==1
    assert final['percentual']==100
    assert len(final['etapas'])>=2
    assert 'dono' not in final and 'conteudo_base64' not in json.dumps(final)


def test_cancelamento_confirmado_no_servidor():
    job=jobs.iniciar(b'invalido','teste.zip','autor')
    jobs.cancelar(job['id'],'autor')
    final=esperar(job['id'],'autor')
    assert final['status']=='cancelado'
    assert 'resultado' not in final
    assert not final['cancelavel']
