"""Todo geoprocesso deve deixar relatório de execução persistido.

O log de nanotarefas vivia só em memória, e por isso não foi possível
reconstruir a proveniência dos produtos `identity_*.gpkg` de agosto/2026.
Estes testes impedem a regressão.
"""
from __future__ import annotations

import json

import pytest

from api.path_policy import PROJECT_ROOT
from api.services import geoprocessamento_relatorio as rel


@pytest.fixture(autouse=True)
def storage_relatorio(monkeypatch, tmp_path):
    from api.services import storage_remoto, ciclo_vida_arquivos as ciclo
    from api.repositories import saidas_geoespaciais_repository as catalogo
    from uuid import uuid4
    monkeypatch.setattr(ciclo,'iniciar',lambda *args:str(uuid4()))
    monkeypatch.setattr(ciclo,'finalizar',lambda *args:None)
    monkeypatch.setattr(catalogo,'registrar_documento',lambda *args,**kwargs:None)
    def enviar(caminho,path):
        target=tmp_path/caminho
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(path.read_bytes())
    monkeypatch.setattr(storage_remoto,'enviar',enviar)
    monkeypatch.setattr(storage_remoto,'baixar',lambda caminho:(tmp_path/caminho).read_bytes())


@pytest.fixture()
def job_concluido() -> dict:
    return {
        "id": "job_teste", "tipo": "operacao", "status": "concluido",
        "algoritmo_id": "OP-13", "algoritmo": "Identity",
        "iniciado_em": "2026-09-02T10:00:00+00:00",
        "parametros": {"camada_id_1": "a", "camada_id_2": "b", "tipo_overlay": "identity"},
        "entradas": ["a", "b"], "concluidas": 5, "total": 5, "percentual": 100,
        "logs": [{"sequencia": 1, "mensagem": "Solicitação registrada", "detalhes": {}}],
        "resultado": {"camada_id": "c"}, "erro": None,
    }


def test_relatorio_registra_proveniencia_completa(job_concluido):
    r = rel.construir(job_concluido)
    assert r["job"]["algoritmo_id"] == "OP-13"
    assert r["parametros"]["tipo_overlay"] == "identity"
    assert r["entradas"] == ["a", "b"]
    assert r["etapas"], "as etapas executadas devem constar do relatório"
    assert r["tempo"]["duracao_s"] is not None


def test_relatorio_fixa_versoes_que_determinam_a_geometria(job_concluido):
    ambiente = rel.construir(job_concluido)["ambiente"]
    for chave in ("gdal", "geopandas", "shapely", "python"):
        assert ambiente.get(chave), f"o relatório deve fixar a versão de {chave}"


def test_relatorio_e_gravado_e_relegivel(job_concluido, tmp_path, monkeypatch):
    monkeypatch.setattr(rel, "PROJECT_ROOT", tmp_path)
    gravados = rel.salvar(job_concluido)
    assert gravados, "salvar deve gravar ao menos o relatório canônico"
    conteudo = json.loads((tmp_path / gravados[0]).read_text(encoding="utf-8"))
    assert conteudo["job"]["id"] == "job_teste"


def test_relatorio_no_storage_preserva_proveniencia_sem_sidecar_local(job_concluido, tmp_path, monkeypatch):
    monkeypatch.setattr(rel, "PROJECT_ROOT", tmp_path)
    produto = tmp_path / "data" / "geoespacial" / "outputs" / "vetor" / "saida.gpkg"
    produto.parent.mkdir(parents=True, exist_ok=True)
    produto.write_bytes(b"conteudo do produto")
    job_concluido["resultado"] = {"caminho": "data/geoespacial/outputs/vetor/saida.gpkg"}

    gravados = rel.salvar(job_concluido)

    sidecar = produto.with_name(produto.name + rel.SIDECAR_SUFFIX)
    assert not sidecar.exists(), "não deve criar outra cópia permanente na aplicação"
    assert len(gravados)==1 and gravados[0].startswith('saidas-geoespaciais/execucoes/')
    conteudo = json.loads((tmp_path/gravados[0]).read_text(encoding="utf-8"))
    assert conteudo["saidas"][0]["sha256"], "a saída deve ser identificada por hash"
    assert conteudo["saidas"][0]["bytes"] == len(b"conteudo do produto")


def test_falha_tambem_gera_relatorio(job_concluido, tmp_path, monkeypatch):
    monkeypatch.setattr(rel, "PROJECT_ROOT", tmp_path)
    job_concluido.update(status="erro", erro="geometria inválida", resultado=None)
    gravados = rel.salvar(job_concluido)
    conteudo = json.loads((tmp_path / gravados[0]).read_text(encoding="utf-8"))
    assert conteudo["erro"] == "geometria inválida"
    assert conteudo["job"]["status"] == "erro"


def test_relatorio_nunca_derruba_o_geoprocesso(monkeypatch):
    monkeypatch.setattr(rel, "construir", lambda job: (_ for _ in ()).throw(RuntimeError("falhou")))
    job={'id':'x'}
    assert rel.salvar(job) == []
    assert job['erro_relatorio']=='falhou'


def test_jobs_gravam_relatorio_ao_concluir_e_ao_falhar():
    from api.services import geoprocessamento_jobs as gj

    fonte = __import__("inspect").getsource(gj.GeoprocessamentoJobs)
    assert fonte.count("geoprocessamento_relatorio.salvar") >= 2, (
        "tanto _complete quanto _fail devem persistir o relatório"
    )
