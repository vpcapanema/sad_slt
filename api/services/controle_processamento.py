"""Progresso observado e cancelamento cooperativo antes de efeitos persistentes."""
from threading import RLock
from datetime import datetime, timezone
from api.services.progresso_eventos import CanalProgresso
from api.services.feedback_hierarquia import Hierarquia, percentual, FINAIS


class ProcessamentoCancelado(ValueError):
    pass


class ControleProcessamento:
    def __init__(self, total_fases=3, nome="Processamento", workflow_id=None):
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
        self.hierarquia = Hierarquia(nome, workflow_id, total_fases)
        self._phase_operations = {}
        for indice in range(1, total_fases + 1):
            self.hierarquia.task(f"fase-{indice}", f"Fase {indice}")
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
            self.hierarquia.terminar(ident)
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
            task_id = self.hierarquia.task(f"fase-{indice}", mensagem)
            self.hierarquia.tasks[task_id]["nome"] = mensagem
            self._phase_operations[indice] = self.iniciar_operacao(mensagem)

    def mensagem(self, mensagem):
        """Texto de apresentação; nunca descobre trabalho por mudança de texto."""
        with self.lock:
            self.verificar()
            self.etapa = mensagem
            self.descricao = mensagem
            op = self.hierarquia.operations.get(str(self.tarefa_id))
            if op and op["estado"] not in FINAIS:
                op["detalhe"] = mensagem
            self._log(mensagem)
            self._publicar()
            return self.tarefa_id

    def iniciar_operacao(self, mensagem, task_id=None):
        with self.lock:
            self.verificar()
            if self.status in FINAIS:
                return None
            self.percentual_tarefa = None
            self.feitas = self.total = None
            self.descricao = ""
            self.tarefa_id += 1
            parent = task_id or f"fase-{max(1, self.fase_atual)}"
            self.hierarquia.task(parent, "Processamento")
            self.hierarquia.iniciar(parent, mensagem, self.tarefa_id)
            self.etapa = mensagem
            self.tarefa_estado = "running"
            self._log(mensagem, "iniciado")
            self._publicar()
            return self.tarefa_id

    def falhar(self, ident, erro):
        with self.lock:
            self.hierarquia.terminar(ident, "cancelado" if isinstance(erro, ProcessamentoCancelado) else "erro")
            self._publicar()

    def concluir_fase(self, indice=None):
        with self.lock:
            numero = indice or self.fase_atual
            self.hierarquia.terminar(self._phase_operations.get(numero))
            self.hierarquia.terminar_task(f"fase-{numero}")
            self._publicar()

    def medir_operacao(self, ident, feitas, total, unidade="itens"):
        with self.lock:
            self.verificar()
            self.hierarquia.medir(ident, feitas, total, unidade)
            if ident == self.tarefa_id:
                self.feitas, self.total, self.unidade = feitas, total, unidade
                self.percentual_tarefa = percentual(feitas, total)
            self._publicar()

    def detalhe(self, mensagem):
        with self.lock:
            self.verificar()
            self.descricao = mensagem
            op = self.hierarquia.operations.get(str(self.tarefa_id))
            if op and op["estado"] not in FINAIS:
                op["detalhe"] = mensagem
            self._log(mensagem)
            self._publicar()

    def progresso_fase(self, feitas, total):
        with self.lock:
            self.verificar()
            pct = percentual(feitas, total)
            self.fracao_fase = pct / 100 if pct is not None else 0
            task = self.hierarquia.tasks.get(f"fase-{self.fase_atual}")
            if task:
                task["percentual"] = pct
            self._publicar()

    def tarefa(self, feitas, total, unidade='itens'):
        with self.lock:
            self.verificar()
            self.feitas, self.total, self.unidade = feitas, total, unidade
            self.percentual_tarefa = percentual(feitas, total)
            self.hierarquia.medir(self.tarefa_id, feitas, total, unidade)
            self._publicar()

    def encerrar(self, status):
        with self.lock:
            if self.status in FINAIS:
                return
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
            self.hierarquia.encerrar(status)
            self._publicar()

    def snapshot(self, *, com_etapas=True):
        with self.lock:
            return {'workflow': self.hierarquia.snapshot(),
                    'revisao': self.revisao, 'tarefa_estado': self.tarefa_estado,
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
