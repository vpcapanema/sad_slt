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
        self.tarefa_estado = "running"
        self.revisao = 0
        self.descricao = ""
        self.feitas = self.total = None
        self.fracao_fase = 0
        self.unidade = "itens"
        self.eventos = CanalProgresso()
        self._publicar()

    def _publicar(self):
        self.revisao += 1
        self.eventos.publicar(self.snapshot(com_etapas=False))

    def _log(self, mensagem, tipo="detalhe", nivel="info", tarefa_id=None):
        self.sequencia += 1
        self.logs.append({"sequencia": self.sequencia, "em": datetime.now(timezone.utc).isoformat(),
                          "mensagem": mensagem, "nivel": nivel, "tipo": tipo,
                          "tarefa_id": self.tarefa_id if tarefa_id is None else tarefa_id})
        self.logs = self.logs[-2000:]

    def concluir(self, tarefa_id=None, mensagem=None):
        """Término explícito, chamado somente depois da operação retornar."""
        with self.lock:
            ident = self.tarefa_id if tarefa_id is None else tarefa_id
            if ident == self.tarefa_id and self.tarefa_estado == "concluido":
                return
            if ident == self.tarefa_id:
                self.tarefa_estado = "concluido"
                self.percentual_tarefa = 100
            self._log(mensagem or getattr(self, "etapa", "Operação concluída"), "concluido", "sucesso", ident)
            self._publicar()

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
            self._log("Cancelamento solicitado; aguardando ponto seguro da operação atual.", "cancelamento_solicitado", "aviso")
            self._publicar()

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
            self.tarefa_estado = "running"
            self._log(mensagem, "iniciado")
            self._publicar()
            return self.tarefa_id

    def detalhe(self, mensagem):
        with self.lock:
            self.verificar()
            self.descricao = mensagem
            self._log(mensagem)
            self._publicar()

    def progresso_fase(self, feitas, total):
        with self.lock:
            self.verificar()
            self.fracao_fase = min(1, max(0, feitas / total)) if total else 0
            self._publicar()

    def tarefa(self, feitas, total, unidade='itens'):
        with self.lock:
            self.verificar()
            self.feitas, self.total, self.unidade = feitas, total, unidade
            self.percentual_tarefa = min(100, max(0, feitas / total * 100)) if total else None
            self._publicar()

    def encerrar(self, status):
        with self.lock:
            self.status = status
            self.cancelavel = False
            if status == 'concluido':
                self.concluir()
            elif status in ('cancelado', 'erro'):
                self.tarefa_estado = status
                self._log(
                    'Operação cancelada.' if status == 'cancelado' else 'Operação interrompida por erro.',
                    status,
                    'aviso' if status == 'cancelado' else 'erro',
                )
            self._publicar()

    def snapshot(self, *, com_etapas=True):
        with self.lock:
            return {'revisao': self.revisao, 'tarefa_estado': self.tarefa_estado,
                    'historico_inicio': self.logs[-250]['sequencia'] if len(self.logs) >= 250 else (self.logs[0]['sequencia'] if self.logs else 1),
                    'status': self.status, 'etapas': list(self.logs) if com_etapas else [],
                    'percentual': 100 if self.status == 'concluido' else round((max(0, self.fase_atual-1) + self.fracao_fase) / self.total_fases * 100),
                    'logs': list(self.logs[-250:]), 'detalhe': self.descricao,
                    'tarefa_concluidas': self.feitas, 'tarefa_total': self.total, 'unidade_tarefa': self.unidade,
                    'progresso_tarefa': self.percentual_tarefa, 'tarefa_id': self.tarefa_id, 'cancelavel': self.cancelavel,
                    'cancelamento_solicitado': self.solicitado,
                    'etapa': getattr(self, 'etapa', 'Aguardando processamento'),
                    'fases_concluidas': self.total_fases if self.status == 'concluido' else max(0,self.fase_atual-1),
                    'total_fases': self.total_fases}
