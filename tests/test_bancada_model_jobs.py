"""Model cancellation with synthetic executors: no catalog/database writes."""
import asyncio
from unittest.mock import patch

import pytest

from api.services.geoprocessamento_engine import geoprocessamento_engine as engine
from api.services.geoprocessamento_jobs import GeoprocessamentoJobs, OperacaoCancelada
from api.services import ciclo_vida_arquivos as ciclo


@pytest.fixture(autouse=True)
def no_lifecycle_writes():
    with patch.object(ciclo, "finalizar") as finish:
        yield finish


def test_cancel_between_model_steps_preserves_completed_output():
    jobs = GeoprocessamentoJobs()
    steps = [{"algoritmo_id": "OP-37", "parametros": {"camada_id": "synthetic"}}] * 2
    job_id = jobs._new("modelo", ["Executar", "Finalizar"])
    jobs._jobs[job_id].update(responsavel="tester", cancelavel=True, execucao_id="synthetic-execution", resultados_parciais=[])
    calls = []

    async def execute(op, params):
        calls.append(op)
        jobs.cancel(job_id, "tester")
        return {"camada_id": "synthetic-completed"}

    try:
        with patch.object(engine, "execute", side_effect=execute), patch(
            "api.services.geoprocessamento_jobs.geoprocessamento_relatorio.salvar", return_value=[]
        ):
            jobs._run_model(job_id, {"passos": steps}, "funcao", {})
        result = jobs.get(job_id)
        assert calls == ["OP-37"]
        assert result["status"] == "cancelado"
        assert result["resultados_parciais"] == [{"camada_id": "synthetic-completed"}]
        with pytest.raises(KeyError):
            jobs.cancel(job_id, "another-user")
    finally:
        jobs._executor.shutdown(wait=True)


def test_checkpoint_reaches_nested_iterator():
    calls = []

    async def execute(op, params):
        calls.append(params["camada_id"])
        return {"camada_id": "synthetic-result"}

    def checkpoint():
        if calls:
            raise OperacaoCancelada("stop")

    steps = [{"iterador": "vector_layers", "parametros": {"fonte": "$sources", "variavel": "item"}},
             {"algoritmo_id": "OP-37", "parametros": {"camada_id": "$item"}}]
    with patch.object(engine, "execute", side_effect=execute), pytest.raises(OperacaoCancelada):
        asyncio.run(engine.run_steps(steps, {"sources": ["a", "b"]}, checkpoint=checkpoint))
    assert calls == ["a"]


def test_model_job_uses_inputs_and_finishes(no_lifecycle_writes):
    jobs = GeoprocessamentoJobs()
    job_id = jobs._new("modelo", ["Executar", "Finalizar"])
    jobs._jobs[job_id].update(responsavel="tester", cancelavel=True, execucao_id="synthetic-execution", resultados_parciais=[])
    received = []

    async def execute(op, params):
        assert ciclo.execucao_atual.get() == "synthetic-execution"
        received.append(params["camada_id"])
        return {"camada_id": "synthetic-result"}

    definition = {"parametros_expostos": [{"chave": "entrada", "valor": "default"}],
                  "itens": [{"algoritmo_id": "OP-37", "parametros": {"camada_id": "$entrada"}}]}
    try:
        with patch.object(engine, "execute", side_effect=execute), patch(
            "api.services.geoprocessamento_jobs.geoprocessamento_relatorio.salvar", return_value=[]
        ):
            jobs._run_model(job_id, definition, "fluxo", {"entrada": "override"})
        assert ciclo.execucao_atual.get() is None
        no_lifecycle_writes.assert_called_once_with("synthetic-execution")
        result = jobs.get(job_id)
        assert received == ["override"]
        assert result["status"] == "concluido"
        assert result["resultado"]["resultados"] == [{"camada_id": "synthetic-result"}]
    finally:
        jobs._executor.shutdown(wait=True)


def test_model_creation_records_owner_and_does_not_leak_context():
    jobs = GeoprocessamentoJobs()
    parent_token = ciclo.execucao_atual.set("unrelated-request")
    try:
        with patch.object(ciclo, "iniciar", return_value="model-execution") as begin, patch.object(jobs._executor, "submit"):
            job = jobs.create_model({"id": "model", "passos": []}, "funcao", {"entrada": "synthetic"}, "owner")
        begin.assert_called_once_with("modelo_funcao", {"modelo_id": "model", "entradas": {"entrada": "synthetic"}}, "owner")
        assert job["responsavel"] == "owner"
        assert job["execucao_id"] == "model-execution"
        assert ciclo.execucao_atual.get() == "unrelated-request"
        with patch("api.services.geoprocessamento_jobs.geoprocessamento_relatorio.salvar", return_value=[]):
            jobs._run_model(job["id"], {"passos": []}, "funcao", {})
        assert ciclo.execucao_atual.get() == "unrelated-request"
    finally:
        ciclo.execucao_atual.reset(parent_token)
        jobs._executor.shutdown(wait=True)
