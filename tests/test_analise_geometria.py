from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from psycopg.types.json import Jsonb

from api.schemas.analise_demanda import AvaliacaoGeometriaSchema
from api.services import analise_demanda_service as service

ADMIN_DEMANDA_JS = Path("admin/demanda.js").read_text(encoding="utf-8")


def test_nao_se_aplica_so_e_permitido_para_area_de_influencia():
    with pytest.raises(ValidationError):
        AvaliacaoGeometriaSchema(delimitacao_intervencao="nao_se_aplica")

    payload = AvaliacaoGeometriaSchema(area_influencia_direta="nao_se_aplica")
    assert payload.area_influencia_direta == "nao_se_aplica"


def test_avaliacao_geometrica_nao_e_incluida_no_placar_da_interface():
    assert 'document.querySelectorAll("#criterios-grid .analise-criterio")' in ADMIN_DEMANDA_JS


def test_salvar_avaliacao_geometrica_nao_altera_os_cinco_criterios(monkeypatch):
    demanda = {
        "id": "demanda-1",
        "codigo": "I-PRJ-1",
        "nome": "Intervenção",
        "status": "analise_em_avaliacao",
    }
    respostas = {
        "criterio_competencia": True,
        "criterio_clareza": True,
        "criterio_finalidade_publica": True,
        "criterio_relevancia_setorial": True,
        "criterio_nao_duplicidade": True,
    }
    persisted = {**respostas, "avaliacao_geometria": None}
    calls = []

    monkeypatch.setattr(service, "_localizar_demanda", lambda codigo: ("projeto", demanda))

    def upsert(**kwargs):
        calls.append(kwargs)
        assessment = kwargs["campos"]["avaliacao_geometria"]
        persisted["avaliacao_geometria"] = assessment.obj
        return persisted

    monkeypatch.setattr(service.analise_demanda_repository, "upsert", upsert)
    payload = AvaliacaoGeometriaSchema(
        delimitacao_intervencao="atende",
        correspondencia_local_dimensoes="ajuste",
        area_influencia_direta="nao_se_aplica",
        precisao_localizacao="atende",
        observacao="  Conferir o limite da faixa.  ",
    )
    user = SimpleNamespace(id="00000000-0000-0000-0000-000000000010", nome="Analista")

    result = service.salvar_avaliacao_geometria("I-PRJ-1", payload, user=user)

    assert calls[0]["campos"].keys() == {"avaliacao_geometria"}
    saved = calls[0]["campos"]["avaliacao_geometria"]
    assert isinstance(saved, Jsonb)
    assert saved.obj["observacao"] == "Conferir o limite da faixa."
    assert saved.obj["avaliada_por"] == "Analista"
    assert result.total_criterios == 5
    assert result.sim == 5
    assert result.resultado == "aprovado"
    assert result.avaliacao_geometria.area_influencia_direta == "nao_se_aplica"


def test_historico_mantem_origem_e_estado_de_vigencia(monkeypatch):
    monkeypatch.setattr(service, "_localizar_demanda", lambda codigo: ("projeto", {"id": "id"}))
    monkeypatch.setattr(
        service.geometria_historico_repository,
        "listar",
        lambda tipo, alvo_id: [
            {
                "id": "versao-atual",
                "origem": "upload",
                "geometria_tipo": "MultiPolygon",
                "nome_arquivo": "atual.geojson",
                "criado_em": datetime(2026, 4, 20, tzinfo=timezone.utc),
                "criado_por": "00000000-0000-0000-0000-000000000010",
                "substituido_em": None,
                "substituido_por": None,
                "motivo_substituicao": None,
            },
            {
                "id": "versao-legada",
                "origem": "nao_identificada",
                "geometria_tipo": "Point",
                "nome_arquivo": None,
                "criado_em": datetime(2025, 4, 20, tzinfo=timezone.utc),
                "criado_por": None,
                "substituido_em": datetime(2026, 4, 20, tzinfo=timezone.utc),
                "substituido_por": "00000000-0000-0000-0000-000000000020",
                "motivo_substituicao": None,
            },
            {
                "id": "versao-sem-encerramento",
                "origem": "upload",
                "geometria_tipo": "Point",
                "nome_arquivo": "antiga.geojson",
                "criado_em": datetime(2025, 3, 20, tzinfo=timezone.utc),
                "criado_por": None,
                "substituido_em": None,
                "substituido_por": None,
                "motivo_substituicao": None,
                "processamento": {"substituicao_nao_registrada": True},
            },
        ],
    )

    history = service.obter_historico_geometria("I-PRJ-1")

    assert history.tem_historico
    assert history.itens[0].vigente
    assert history.itens[1].origem == "nao_identificada"
    assert not history.itens[1].vigente
    assert history.itens[1].motivo_substituicao is None
    assert history.itens[2].substituicao_nao_registrada
    assert not history.itens[2].vigente
    assert history.aviso_historico_incompleto


def test_parecer_distingue_intencao_de_envio_e_substituicao_efetiva():
    analise = {"parecer_texto": "Parecer base.", "avaliacao_geometria": {
        "adequada": False, "encaminhamento": "substituicao"}}
    assert "Uma nova geometria foi inserida" not in service._parecer_com_geometria(analise)
    analise["avaliacao_geometria"]["substituicoes"] = [
        {"em": "2026-10-14", "por": "analista-1", "arquivo": "nova.geojson"}]
    texto = service._parecer_com_geometria(analise)
    assert "Uma nova geometria foi inserida" in texto
    assert "nova.geojson" in texto and "analista-1" in texto
    assert "preservados no histórico" in texto


def test_sim_so_aprova_geometria_depois_de_confirmar():
    analise = {"avaliacao_geometria": {"adequada": True, "confirmada": False}}
    assert "CONFIRMAÇÃO PENDENTE" in service._parecer_com_geometria(analise)
    assert "AVALIAÇÃO CONFIRMADA" not in service._parecer_com_geometria(analise)
    analise["avaliacao_geometria"]["confirmada"] = True
    assert "AVALIAÇÃO CONFIRMADA" in service._parecer_com_geometria(analise)


@pytest.mark.parametrize("adequada,encaminhamento,tipo_esperado", [
    (False, "complementacao", "ajuste_geometria"),
    (False, "substituicao", None),
    (True, "complementacao", None),
])
def test_encaminhamento_de_geometria_define_tipo_de_complementacao(monkeypatch, adequada, encaminhamento, tipo_esperado):
    monkeypatch.setattr(service, "_localizar_demanda", lambda codigo: ("projeto", {"codigo": codigo}))
    saved = {}
    def upsert(**kwargs):
        saved.update(kwargs["campos"]["avaliacao_geometria"].obj)
        return {"avaliacao_geometria": saved}
    monkeypatch.setattr(service.analise_demanda_repository, "upsert", upsert)
    result = service.salvar_avaliacao_geometria("COD", AvaliacaoGeometriaSchema(
        adequada=adequada, encaminhamento=encaminhamento))
    assert saved["tipo_complementacao"] == tipo_esperado
    if adequada:
        assert saved["encaminhamento"] is None
    if tipo_esperado:
        assert "Tipo: Ajuste de geometria" in result.parecer_texto
