"""Execução acompanhada por usuário; a camada final permanece no storage."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
import logging
from threading import RLock
from time import monotonic
from uuid import uuid4

from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services.elegibilidade_processamento import executar, nome_saida

_jobs = {}
_lock = RLock()
_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='elegibilidade')
_log = logging.getLogger(__name__)


def _obter(ident, dono):
    job = _jobs.get(ident)
    if not job or job['dono'] != str(dono):
        raise FileNotFoundError('Execução de elegibilidade não encontrada nesta sessão.')
    return job


def consultar(ident, dono):
    with _lock:
        job = _obter(ident, dono)
        return {'id': ident, **job['controle'].snapshot(), 'erro': job.get('erro'),
                'resultado': deepcopy(job.get('resultado'))}


def cancelar(ident, dono):
    with _lock:
        _obter(ident, dono)['controle'].cancelar()
    return consultar(ident, dono)


def iniciar(payload, dono):
    nome_saida(payload['entrada']['nome'])
    ident = uuid4().hex
    lote = str(payload.get('lote_id') or ident)
    with _lock:
        agora = monotonic()
        atividade = {}
        for chave, anterior in _jobs.items():
            grupo = anterior.get('lote_id', chave)
            atividade[grupo] = max(atividade.get(grupo, 0), anterior.get('terminado', agora))
        for chave, anterior in list(_jobs.items()):
            grupo = anterior.get('lote_id', chave)
            if grupo != lote and anterior['controle'].status != 'executando' and agora - atividade[grupo] > 3600:
                del _jobs[chave]
        if any(j['dono'] == str(dono) and j['controle'].status == 'executando' for j in _jobs.values()):
            raise ValueError('Há uma execução em andamento. Aguarde antes de iniciar outra.')
        job = {'dono': str(dono), 'controle': ControleProcessamento(), 'criado': agora, 'lote_id': lote}
        _jobs[ident] = job

    def rodar():
        controle = job['controle']
        try:
            controle.verificar()
            resultado = executar(payload, controle)
            resultado['concluido_em'] = datetime.now(timezone.utc).isoformat()
            resultado['lote_id'] = str(payload.get('lote_id') or ident)
            resultado['total_entradas'] = payload.get('total_entradas', 1)
            with _lock:
                job['resultado'] = resultado
                controle.encerrar('concluido')
        except ProcessamentoCancelado:
            controle.encerrar('cancelado')
        except Exception as exc:
            _log.exception('Falha na execução de elegibilidade %s', ident)
            with _lock:
                job['erro'] = str(exc)
                controle.encerrar('erro')
        finally:
            with _lock:
                job['terminado'] = monotonic()
    _pool.submit(rodar)
    return consultar(ident, dono)
