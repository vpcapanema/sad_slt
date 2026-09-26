"""Progresso observado e cancelamento cooperativo antes de efeitos persistentes."""
from threading import RLock
from datetime import datetime, timezone
from api.services.progresso_eventos import CanalProgresso


class ProcessamentoCancelado(ValueError):
    pass


class ControleProcessamento:
    def __init__(self, total_fases=3):
        self.lock = RLock()
        self.total_fases = total_fases
        self.fase_atual = 0
        self.percentual_tarefa = None
        self.cancelavel = True
        self.solicitado = False
        self.status = 'executando'
        self.logs = []
        self.sequencia = 0
        self.tarefa_id = 0
        self.descricao = ""
        self.feitas = self.total = None
        self.fracao_fase = 0
        self.unidade = "itens"
        self.eventos = CanalProgresso()
        self.eventos.publicar(self.snapshot(com_etapas=False))

    def verificar(self):
        with self.lock:
            if self.solicitado:
                raise ProcessamentoCancelado('Processamento cancelado pelo usuário antes da gravação das saídas.')

    def cancelar(self):
        with self.lock:
            if self.status == 'cancelado':
                return
            if not self.cancelavel or self.status != 'executando':
                raise ValueError('A gravação final já começou ou o processo terminou. Não é seguro interromper esta etapa.')
            self.solicitado = True
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def fase(self, indice, mensagem, cancelavel=True):
        with self.lock:
            self.verificar()
            self.fase_atual = indice
            self.fracao_fase = 0
            self.percentual_tarefa = None
            self.cancelavel = cancelavel
            self.mensagem(mensagem)

    def mensagem(self, mensagem):
        with self.lock:
            self.verificar()
            self.percentual_tarefa = None
            self.feitas = self.total = None
            self.descricao = ""
            self.tarefa_id += 1
            self.etapa = mensagem
            self.sequencia += 1
            self.logs.append({'sequencia': self.sequencia, 'em': datetime.now(timezone.utc).isoformat(),
                              'mensagem': mensagem, 'nivel': 'info'})
            self.logs = self.logs[-2000:]
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def detalhe(self, mensagem):
        with self.lock:
            self.verificar()
            self.descricao = mensagem
            self.sequencia += 1
            self.logs.append({'sequencia': self.sequencia, 'em': datetime.now(timezone.utc).isoformat(),
                              'mensagem': mensagem, 'nivel': 'info'})
            self.logs = self.logs[-2000:]
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def progresso_fase(self, feitas, total):
        with self.lock:
            self.verificar()
            self.fracao_fase = min(1, max(0, feitas / total)) if total else 0
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def tarefa(self, feitas, total, unidade='itens'):
        with self.lock:
            self.verificar()
            self.feitas, self.total, self.unidade = feitas, total, unidade
            self.percentual_tarefa = min(100, max(0, feitas / total * 100)) if total else None
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def encerrar(self, status):
        with self.lock:
            self.status = status
            self.cancelavel = False
            if status == 'concluido':
                self.percentual_tarefa = 100
            self.eventos.publicar(self.snapshot(com_etapas=False))

    def snapshot(self, *, com_etapas=True):
        with self.lock:
            return {'status': self.status, 'etapas': list(self.logs) if com_etapas else [],
                    'percentual': 100 if self.status == 'concluido' else round((max(0, self.fase_atual-1) + self.fracao_fase) / self.total_fases * 100),
                    'logs': list(self.logs[-250:]), 'detalhe': self.descricao,
                    'tarefa_concluidas': self.feitas, 'tarefa_total': self.total, 'unidade_tarefa': self.unidade,
                    'progresso_tarefa': self.percentual_tarefa, 'tarefa_id': self.tarefa_id, 'cancelavel': self.cancelavel,
                    'cancelamento_solicitado': self.solicitado,
                    'etapa': getattr(self, 'etapa', 'Aguardando processamento'),
                    'fases_concluidas': self.total_fases if self.status == 'concluido' else max(0,self.fase_atual-1),
                    'total_fases': self.total_fases}
