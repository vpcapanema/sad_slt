"""Progresso observado e cancelamento cooperativo antes de efeitos persistentes."""
from threading import RLock
from datetime import datetime, timezone


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

    def fase(self, indice, mensagem, cancelavel=True):
        with self.lock:
            self.verificar()
            self.fase_atual = indice
            self.percentual_tarefa = None
            self.cancelavel = cancelavel
            self.mensagem(mensagem)

    def mensagem(self, mensagem):
        with self.lock:
            self.verificar()
            self.sequencia += 1
            self.logs.append({'sequencia': self.sequencia, 'em': datetime.now(timezone.utc).isoformat(),
                              'mensagem': mensagem, 'nivel': 'info'})
            self.logs = self.logs[-2000:]

    def tarefa(self, feitas, total):
        with self.lock:
            self.verificar()
            self.percentual_tarefa = min(100, max(0, feitas / total * 100)) if total else None

    def encerrar(self, status):
        with self.lock:
            self.status = status
            self.cancelavel = False
            if status == 'concluido':
                self.percentual_tarefa = 100

    def snapshot(self):
        with self.lock:
            return {'status': self.status, 'etapas': list(self.logs),
                    'percentual': 100 if self.status == 'concluido' else round(max(0, self.fase_atual-1) / self.total_fases * 100),
                    'progresso_tarefa': self.percentual_tarefa, 'cancelavel': self.cancelavel,
                    'cancelamento_solicitado': self.solicitado,
                    'etapa': self.logs[-1]['mensagem'] if self.logs else 'Aguardando processamento',
                    'fases_concluidas': self.total_fases if self.status == 'concluido' else max(0,self.fase_atual-1),
                    'total_fases': self.total_fases}
