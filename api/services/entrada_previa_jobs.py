"""Validação cancelável em processo isolado; originais e resultados só em RAM."""
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import get_context
from threading import RLock
from time import monotonic
from uuid import uuid4

_jobs = {}
_lock = RLock()
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix='previa')
_TTL = 900


def _validar(canal, conteudo, nome):
    from api.services.extracao_entrada_local import previa
    try:
        def progresso(feitas, total, mensagem, tarefa=None):
            canal.send(('progresso', feitas, total, mensagem, tarefa))
        canal.send(('resultado', previa(conteudo, nome, progresso=progresso)))
    except Exception:
        canal.send(('erro', 'Não foi possível validar o arquivo. Confira o formato, a integridade e o sistema de coordenadas.'))
    finally:
        canal.close()


def _obter(ident, dono):
    job = _jobs.get(ident)
    if not job or job['dono'] != str(dono):
        raise FileNotFoundError('Validação não encontrada ou expirada. Envie o arquivo novamente.')
    return job


def _snapshot(job):
    return {k: v for k, v in job.items() if k not in ('dono', 'criado', 'solicitado')}


def obter(ident, dono):
    with _lock:
        return _snapshot(_obter(ident, dono))


def cancelar(ident, dono):
    with _lock:
        job = _obter(ident, dono)
        if job['status'] == 'cancelado':
            return _snapshot(job)
        if job['status'] not in ('pendente', 'executando'):
            raise ValueError('A validação já terminou.')
        job['solicitado'] = True
        return {'id': ident, 'status': 'cancelando'}


def iniciar(conteudo, nome, dono):
    from api.services.extracao_entrada_local import MAX_ARQUIVO, _nome
    nome = _nome(nome)
    if not conteudo or len(conteudo) > MAX_ARQUIVO:
        raise ValueError('Envie um arquivo não vazio de até 16 MB.')
    with _lock:
        for ident, job in list(_jobs.items()):
            if job['status'] not in ('executando', 'pendente') and monotonic()-job['criado'] > _TTL:
                del _jobs[ident]
        if len(_jobs) >= 24:
            terminados = sorted((j for j in _jobs.values() if j['status'] not in ('executando', 'pendente')), key=lambda j: j['criado'])
            for antigo in terminados[:max(0, len(_jobs)-23)]:
                del _jobs[antigo['id']]
        if len(_jobs) >= 24 or sum(j['dono'] == str(dono) and j['status'] in ('pendente', 'executando') for j in _jobs.values()) >= 2:
            raise ValueError('Há validações em andamento. Aguarde a conclusão antes de enviar outro arquivo.')
        ident = uuid4().hex
        job = dict(id=ident, dono=str(dono), criado=monotonic(), solicitado=False,
                   status='pendente', cancelavel=True, percentual=None, progresso_tarefa=None,
                   etapas=[], etapa='Aguardando validação do arquivo')
        _jobs[ident] = job
        _pool.submit(_executar, ident, conteudo, nome)
        return _snapshot(job)


def _executar(ident, conteudo, nome):
    contexto = get_context('spawn')
    receber, enviar = contexto.Pipe(duplex=False)
    processo = contexto.Process(target=_validar, args=(enviar, conteudo, nome), daemon=True)
    iniciado = False
    try:
        with _lock:
            job = _jobs[ident]
            if job['solicitado']:
                job.update(status='cancelado', cancelavel=False)
                return
            job['status'] = 'executando'
        processo.start(); iniciado = True; enviar.close()
        limite = monotonic()+180
        while True:
            with _lock:
                if job['solicitado']:
                    processo.terminate(); processo.join()
                    job.update(status='cancelado', cancelavel=False, etapa='Validação interrompida. A prévia anterior foi mantida.')
                    return
            if receber.poll(.1):
                evento = receber.recv()
                with _lock:
                    if job['solicitado']:
                        continue
                    if evento[0] == 'progresso':
                        _, feitas, total, mensagem, tarefa = evento
                        job.update(percentual=round(feitas/total*100) if total else None,
                                   progresso_tarefa=tarefa, etapa=mensagem)
                        job['etapas'].append(dict(sequencia=len(job['etapas'])+1, mensagem=mensagem, nivel='info'))
                    elif evento[0] == 'resultado':
                        job.update(status='concluido', cancelavel=False, percentual=100, progresso_tarefa=100, resultado=evento[1])
                        return
                    else:
                        job.update(status='erro', cancelavel=False, erro=evento[1]); return
            if monotonic() > limite:
                raise TimeoutError()
            if not processo.is_alive() and not receber.poll():
                raise RuntimeError()
    except Exception:
        with _lock:
            _jobs[ident].update(status='erro', cancelavel=False, erro='A validação foi interrompida pelo servidor. Envie o arquivo novamente.')
    finally:
        if iniciado:
            if processo.is_alive(): processo.terminate()
            processo.join()
            processo.close()
        enviar.close(); receber.close()
