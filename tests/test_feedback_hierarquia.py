import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

import pytest

from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services.feedback_hierarquia import Hierarquia
from api.services.feedback_operacao import operacao, contexto


def callback(c):
    def emitir(texto):
        return c.mensagem(texto)
    for name in ("iniciar_operacao", "medir_operacao", "concluir", "falhar", "verificar", "detalhe"):
        setattr(emitir, name, getattr(c, name))
    return emitir


def test_vinculos_nomes_repetidos_detalhes_e_conclusao_explicita():
    c = ControleProcessamento(total_fases=1)
    c.fase(1, "Analisar")
    p = contexto(callback(c), "Base")
    with operacao(p, "Ler") as medir:
        medir(2, 4, forcar=True)
        primeira = c.tarefa_id
        c.mensagem("Detalhe novo")
        assert c.tarefa_id == primeira
        assert c.snapshot()["workflow"]["tasks"][0]["operations"][-1]["percentual"] == 50
        with operacao(p, "Ler") as medir_outra:
            segunda = c.tarefa_id
            medir_outra(1, 1)
            medir(3, 4, forcar=True)
            assert c.hierarquia.operations[str(primeira)]["percentual"] == 75
            assert c.hierarquia.operations[str(segunda)]["estado"] == "executando"
        assert c.hierarquia.operations[str(primeira)]["estado"] == "executando"
    assert primeira != segunda
    c.concluir_fase()
    c.encerrar("concluido")
    w = c.snapshot()["workflow"]
    assert w["percentual"] == 100
    for task in w["tasks"]:
        assert task["workflow_id"] == w["id"]
        assert task["estado"] == "concluido"
        assert all(o["task_id"] == task["id"] and o["estado"] == "concluido" for o in task["operations"])


def test_agregacao_descoberta_denominador_e_medida_invalida():
    tree = Hierarquia(total_tasks=2)
    tree.task("a", "Mesmo nome")
    tree.task("b", "Mesmo nome")
    a = tree.iniciar("a", "Ler")
    b = tree.iniciar("b", "Ler")
    tree.medir(a, 1, 2)
    tree.medir(b, 3, 4)
    assert tree.snapshot()["percentual"] == 62.5
    tree.medir(a, 1, 4)
    assert tree.snapshot()["percentual"] == 50
    novo = tree.iniciar("a", "Ler")
    assert tree.snapshot()["percentual"] is None
    for feitas, total in [(1, 0), (float("nan"), 10), (1, float("inf")), (-1, 10), (True, 2)]:
        tree.medir(novo, feitas, total)
        assert tree.operations[novo]["percentual"] is None
        json.dumps(tree.snapshot(), allow_nan=False)
    tree.terminar(novo)
    assert tree.snapshot()["percentual"] == 68.75


@pytest.mark.parametrize("estado", ["erro", "parcial", "cancelado", "interrompido"])
def test_finalizacao_nao_conclui_trabalho_nao_executado(estado):
    c = ControleProcessamento()
    c.fase(1, "Ler")
    c.tarefa(1, 4)
    c.encerrar(estado)
    tree = c.snapshot()["workflow"]
    assert tree["estado"] == estado
    assert tree["percentual"] != 100
    assert tree["tasks"][1]["estado"] == "nao_executado"
    assert tree["tasks"][0]["operations"][0]["estado"] == estado
    c.encerrar("concluido")
    assert c.snapshot()["status"] == estado


def test_excecao_operacao_e_cancelamento_solicitado_confirmado():
    c = ControleProcessamento(total_fases=1)
    c.fase(1, "Ler")
    with pytest.raises(RuntimeError):
        with operacao(callback(c), "Falhar"):
            raise RuntimeError("fixture")
    assert c.snapshot()["workflow"]["tasks"][0]["operations"][-1]["estado"] == "erro"
    c.cancelar()
    assert c.snapshot()["status"] == "executando"
    with pytest.raises(ProcessamentoCancelado):
        c.verificar()
    c.encerrar("cancelado")
    assert c.snapshot()["status"] == "cancelado"


def test_snapshot_independente_de_logs_reconexao_e_isolamento():
    async def run():
        c = ControleProcessamento(total_fases=1)
        c.fase(1, "Ler")
        for i in range(2005):
            c.detalhe(str(i))
        w = c.snapshot()["workflow"]
        assert len(w["tasks"][0]["operations"]) == 1
        assert w["id"] != ControleProcessamento().snapshot()["workflow"]["id"]
        stream = c.eventos.eventos("job")
        await anext(stream)
        event = json.loads((await anext(stream)).split("data: ", 1)[1])
        assert event["workflow"] == w
        await stream.aclose()
        assert not c.eventos.ouvintes
        # O snapshot publicado não deve compartilhar referências mutáveis.
        w["tasks"].clear()
        assert c.eventos.atual["workflow"]["tasks"]
    asyncio.run(run())


def test_operacoes_concorrentes_medidas_por_id():
    c = ControleProcessamento(total_fases=1)
    c.fase(1, "Paralelo")
    def run(_):
        with operacao(callback(c), "Repetido") as medir:
            medir(1, 2, forcar=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(run, range(20)))
    ops = c.snapshot()["workflow"]["tasks"][0]["operations"][1:]
    assert len({op["id"] for op in ops}) == 20
    assert all(op["estado"] == "concluido" for op in ops)


def test_terminal_publicado_atomicamente_e_imune_a_callbacks_atrasados():
    c = ControleProcessamento(total_fases=1)
    c.fase(1, "Ler")
    c.tarefa(float("nan"), 10)
    json.dumps(c.snapshot(), allow_nan=False)
    c.encerrar("erro")
    antes = c.snapshot()
    c.mensagem("atrasado")
    c.tarefa(10, 10)
    c.concluir()
    assert c.snapshot() == antes
    assert c.eventos.atual["workflow"]["estado"] == "erro"
    assert c.eventos.atual["status"] == "erro"


def test_job_generico_parcial_nao_vira_sucesso(monkeypatch):
    from api.services.geoprocessamento_jobs import GeoprocessamentoJobs
    monkeypatch.setattr("api.services.geoprocessamento_jobs.geoprocessamento_relatorio.salvar", lambda _: [])
    jobs = GeoprocessamentoJobs()
    try:
        ident = jobs._new("teste", ["Processar", "Finalizar"])
        jobs._start(ident, "Processar")
        jobs._complete(ident, {"status": "parcial", "resultado": "fixture"})
        job = jobs.get(ident)
        assert job["status"] == job["workflow"]["estado"] == "parcial"
        assert job["workflow"]["percentual"] != 100
        assert all(o["estado"] != "executando" for t in job["workflow"]["tasks"] for o in t["operations"])
        jobs._start(ident, "Evento tardio")
        assert jobs.get(ident) == job
    finally:
        jobs._executor.shutdown(wait=True)
