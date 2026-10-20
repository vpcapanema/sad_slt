"""Estado estrutural do feedback, independente da retenção de logs.

Pesos iguais entre fases planejadas. Uma medida explícita da task prevalece;
sem medida, a média das operações conhecidas só existe se todas forem medidas.
Descoberta de trabalho pode reduzir o percentual: nunca aplicamos um máximo
histórico. 100% medido não confirma término; somente um término explícito o faz.
O chamador serializa mutações usando o lock do job/controle.
"""
from copy import deepcopy
from math import isfinite
from uuid import uuid4

FINAIS = {"concluido", "parcial", "erro", "cancelado", "interrompido", "nao_executado"}


def percentual(feitas, total):
    if (isinstance(feitas, (int, float)) and not isinstance(feitas, bool)
            and isinstance(total, (int, float)) and not isinstance(total, bool)
            and isfinite(feitas) and isfinite(total) and feitas >= 0 and total > 0):
        return min(100, feitas / total * 100)
    return None


class Hierarquia:
    def __init__(self, nome="Processamento", ident=None, total_tasks=None):
        self.id = ident or uuid4().hex
        self.nome = nome
        self.status = "executando"
        self.total_tasks = total_tasks
        self.tasks = {}
        self.operations = {}
        self.sequencia = 0

    def task(self, ident, nome):
        ident = str(ident)
        if ident not in self.tasks:
            self.tasks[ident] = dict(id=ident, workflow_id=self.id, nome=nome,
                                    estado="pendente", percentual=None, operations=[])
        return ident

    def iniciar(self, task_id, nome, ident=None):
        if self.status in FINAIS:
            return None
        task = self.tasks[str(task_id)]
        self.sequencia += 1
        ident = str(ident if ident is not None else f"op-{self.sequencia}")
        if ident in self.operations:
            raise ValueError("Identificador de operação já utilizado")
        task["estado"] = "executando"
        op = dict(id=ident, task_id=task["id"], nome=nome, detalhe="",
                  estado="executando", percentual=None, feitas=None, total=None, unidade="itens")
        task["operations"].append(op)
        self.operations[ident] = op
        return ident

    def medir(self, ident, feitas, total, unidade="itens"):
        op = self.operations.get(str(ident))
        if op and op["estado"] not in FINAIS:
            pct = percentual(feitas, total)
            op.update(percentual=pct, feitas=feitas if pct is not None else None,
                      total=total if pct is not None else None, unidade=unidade)

    def terminar(self, ident, estado="concluido"):
        op = self.operations.get(str(ident))
        if op and op["estado"] not in FINAIS:
            op["estado"] = estado
            if estado == "concluido":
                op["percentual"] = 100

    def terminar_task(self, ident, estado="concluido"):
        task = self.tasks.get(str(ident))
        if task and task["estado"] not in FINAIS:
            for op in task["operations"]:
                if op["estado"] not in FINAIS:
                    self.terminar(op["id"], "interrompido" if estado == "concluido" else estado)
            task["estado"] = estado
            if estado == "concluido":
                task["percentual"] = 100

    def encerrar(self, estado):
        if self.status in FINAIS:
            return
        self.status = estado
        for task in self.tasks.values():
            if task["estado"] == "pendente":
                task["estado"] = "nao_executado"
            elif task["estado"] not in FINAIS:
                self.terminar_task(task["id"], estado if estado != "concluido" else "interrompido")

    def snapshot(self):
        tasks = deepcopy(list(self.tasks.values()))
        for task in tasks:
            ops = task["operations"]
            if task["estado"] == "pendente":
                task["percentual"] = 0
            if task["percentual"] is None and ops and all(o["percentual"] is not None for o in ops):
                task["percentual"] = sum(o["percentual"] for o in ops) / len(ops)
        total = self.total_tasks or len(tasks)
        pct = None
        if total and len(tasks) == total and all(t["percentual"] is not None for t in tasks):
            pct = sum(t["percentual"] for t in tasks) / total
        if self.status == "concluido":
            pct = 100
        return dict(id=self.id, nome=self.nome, estado=self.status, percentual=pct, tasks=tasks)
