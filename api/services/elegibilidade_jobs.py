"""Execução acompanhada por usuário; a camada final permanece no storage."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
import logging
import re
from threading import RLock
from time import monotonic
from uuid import uuid4

from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services.elegibilidade_processamento import executar, nome_saida
from api.services import storage_remoto
from api.services.edicao_storage import bloquear_arquivo

_jobs = {}
_lock = RLock()
_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='elegibilidade')
_log = logging.getLogger(__name__)


def _pasta(dono, analise='elegibilidade'):
    usuario = sha256(str(dono).encode()).hexdigest()
    return f'aplicacao/data/geoespacial/configuracoes/extracao-atributos/execucoes-{analise}/{usuario}'


def _caminho(ident, dono, analise='elegibilidade'):
    if not re.fullmatch(r'[a-f0-9]{32}', ident):
        raise FileNotFoundError('Execução não encontrada nesta sessão.')
    return f'{_pasta(dono, analise)}/{ident}.json'


def _registro(ident, dono, analise='elegibilidade'):
    caminho = _caminho(ident, dono, analise)
    try:
        dados = storage_remoto.baixar(caminho)
    except FileNotFoundError:
        if analise != 'elegibilidade':
            raise
        usuario = sha256(str(dono).encode()).hexdigest()
        caminho = f'saidas-geoespaciais/elegibilidade-execucoes/{usuario}/{ident}.json'
        dados = storage_remoto.baixar(caminho)
    return caminho, json.loads(dados)


def _publicar(job, estado, *, forcar=False):
    job['estado'] = estado
    agora = monotonic()
    if not forcar and estado['status'] == 'executando' and agora - job.get('publicado', float('-inf')) < 1:
        return
    dados = {'id': job['id'], 'dono': job['dono'], **estado,
             'erro': job.get('erro'), 'resultado': job.get('resultado')}
    caminho = _caminho(job['id'], job['dono'], job.get('analise', 'elegibilidade'))
    temporario = f'{caminho}.{uuid4().hex}.tmp'
    try:
        storage_remoto.enviar_bytes(temporario, json.dumps(dados, ensure_ascii=False, allow_nan=False).encode('utf-8'))
        storage_remoto.mover(temporario, caminho)
    except Exception:
        _log.exception('Não foi possível publicar o estado da execução %s', job['id'])
        raise
    job['publicado'] = agora


class _ControleCompartilhado(ControleProcessamento):
    def __init__(self, job):
        self.job = job
        self.ultimo_cancelamento = float('-inf')
        super().__init__()

    def _publicar(self):
        super()._publicar()
        _publicar(self.job, self.snapshot())

    def verificar(self):
        agora = monotonic()
        if not self.solicitado and agora - self.ultimo_cancelamento >= 1:
            self.ultimo_cancelamento = agora
            try:
                storage_remoto.baixar(_caminho(self.job['id'], self.job['dono'], self.job.get('analise', 'elegibilidade')) + '.cancelar')
            except FileNotFoundError:
                pass
            else:
                super().cancelar()
        super().verificar()


def _obter(ident, dono, analise='elegibilidade'):
    job = _jobs.get(ident)
    if not job or job['dono'] != str(dono) or job.get('analise', 'elegibilidade') != analise:
        raise FileNotFoundError('Execução não encontrada nesta sessão.')
    return job


def consultar(ident, dono, *, analise='elegibilidade'):
    with _lock:
        job = _jobs.get(ident)
        if job:
            _obter(ident, dono, analise)
            return {'id': ident, **deepcopy(job['estado']), 'erro': job.get('erro'),
                    'resultado': deepcopy(job.get('resultado'))}
    _, registro = _registro(ident, dono, analise)
    if registro.get('id') != ident or registro.get('dono') != str(dono):
        raise FileNotFoundError('Execução de elegibilidade não encontrada nesta sessão.')
    if registro.get('status') not in {'executando', 'concluido', 'erro', 'cancelado'}:
        raise ValueError('O registro persistido da execução possui estado inválido.')
    return {k: v for k, v in registro.items() if k != 'dono'}


def registrar_saida(resultado: dict, dono) -> str:
    """Referencia uma saída já validada, sem exigir o histórico de quem a produziu."""
    ident = sha256(f'arquivo:{resultado["arquivo"]}:{resultado["sha256"]}'.encode()).hexdigest()[:32]
    registro = {'id': ident, 'dono': str(dono),
                'resultado': {**resultado, 'origem': 'arquivo', 'lote_id': ident, 'total_entradas': 1,
                              'registrado_em': datetime.now(timezone.utc).isoformat()}}
    _publicar(registro, {'status': 'concluido', 'cancelavel': False}, forcar=True)
    return ident


def cancelar(ident, dono, *, analise='elegibilidade'):
    with _lock:
        job = _jobs.get(ident)
        if job:
            _obter(ident, dono, analise)['controle'].cancelar()
            return consultar(ident, dono, analise=analise)
    estado = consultar(ident, dono, analise=analise)
    if estado['status'] == 'cancelado':
        return estado
    if not estado.get('cancelavel') or estado['status'] != 'executando':
        raise ValueError('A gravação final já começou ou o processo terminou. Não é seguro interromper esta etapa.')
    caminho, _ = _registro(ident, dono, analise)
    storage_remoto.enviar_bytes(caminho + '.cancelar', b'cancelar')
    return {**estado, 'cancelamento_solicitado': True}


def iniciar(payload, dono, *, analise='elegibilidade'):
    if analise not in {'elegibilidade', 'favorabilidade'}:
        raise ValueError('Tipo de análise não reconhecido.')
    nome_saida(payload['entrada']['nome'], analise=analise)
    ident = uuid4().hex
    lote = str(payload.get('lote_id') or ident)
    payload = {**payload, 'lote_id': lote}
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
        job = {'id': ident, 'dono': str(dono), 'criado': agora, 'lote_id': lote, 'analise': analise}
        job['controle'] = _ControleCompartilhado(job)
        _jobs[ident] = job

    def rodar():
        controle = job['controle']
        try:
            with bloquear_arquivo(f'elegibilidade-usuario:{dono}'):
                controle.verificar()
                resultado = executar(payload, controle) if analise == 'elegibilidade' else executar(payload, controle, analise=analise)
            resultado['concluido_em'] = datetime.now(timezone.utc).isoformat()
            resultado['lote_id'] = str(payload.get('lote_id') or ident)
            resultado['total_entradas'] = payload.get('total_entradas', 1)
            with _lock:
                job['resultado'] = resultado
            codigo = resultado.get('elegibilidade', {}).get('hierarquizacao') if analise == 'elegibilidade' else None
            if codigo:
                from api.services.hierarquizacao_service import registrar_saida_geoespacial_fase1
                registrar_saida_geoespacial_fase1(codigo, resultado, dono)
            with _lock:
                controle.encerrar('concluido')
        except ProcessamentoCancelado:
            controle.encerrar('cancelado')
        except Exception as exc:
            _log.exception('Falha na execução de %s %s', analise, ident)
            with _lock:
                job['erro'] = str(exc)
                if job.get('resultado', {}).get('arquivo'):
                    job['erro'] += f' A saída já foi gravada em {job["resultado"]["arquivo"]}. Abra o GeoPackage pelos resultados para recuperar a análise sem repetir o cálculo.'
                controle.encerrar('erro')
        finally:
            with _lock:
                job['terminado'] = monotonic()
    _pool.submit(rodar)
    return consultar(ident, dono, analise=analise)
