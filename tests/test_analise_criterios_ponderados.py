from itertools import product
import pytest
from api.services import analise_demanda_service as service
from api.schemas.analise_demanda import CriteriosAnaliseSchema
from api.exceptions import DemandaValidationError

@pytest.mark.parametrize("valores", list(product([False, True], repeat=5)))
def test_todas_combinacoes(valores):
    respostas = dict(zip(service._CAMPOS_CRITERIO, valores))
    eliminada = any(respostas[c] is False for c in service.ELIMINATORIOS)
    pontos = (20 * respostas["criterio_clareza"] + 30 * respostas["criterio_finalidade_publica"] + 50 * respostas["criterio_relevancia_setorial"])
    assert service.calcular_resultado(respostas) == ("reprovado" if eliminada or pontos <= 50 else "aprovado")

def test_pendente_e_eliminacao_antecipada():
    assert service.calcular_resultado({}) is None
    assert service.calcular_resultado({"criterio_competencia": False}) == "reprovado"
    assert service.calcular_resultado({"criterio_nao_duplicidade": False}) == "reprovado"
    assert service.calcular_resultado(dict.fromkeys(service.ELIMINATORIOS, True)) is None

@pytest.fixture
def memoria(monkeypatch):
    data = {}
    monkeypatch.setattr(service, "_localizar_demanda", lambda c: ("projeto", {"codigo": c, "nome": "Teste", "status": "analise_em_avaliacao"}))
    monkeypatch.setattr(service.analise_demanda_repository, "upsert", lambda **kw: (data.update(kw["campos"]) or data))
    monkeypatch.setattr(service.analise_demanda_repository, "get_by_codigo", lambda c: data)
    return data

def test_salva_vinculo_limpa_ocultos_e_remove_vinculo_ao_marcar_sim(memoria):
    payload = CriteriosAnaliseSchema(criterio_competencia=True, criterio_nao_duplicidade=False, demanda_duplicada_codigo="OUTRA", criterio_clareza=True)
    result = service.salvar_criterios("ATUAL", payload)
    assert result.completo and result.resultado == "reprovado"
    assert memoria["criterio_clareza"] is None
    assert memoria["demanda_duplicada_codigo"] == "OUTRA"
    assert "OUTRA — Teste" in memoria["parecer_texto"]
    payload.criterio_nao_duplicidade = True
    service.salvar_criterios("ATUAL", payload)
    assert memoria["demanda_duplicada_codigo"] is None

def test_nao_permite_autorreferencia(memoria):
    with pytest.raises(DemandaValidationError):
        service.salvar_criterios("ATUAL", CriteriosAnaliseSchema(criterio_nao_duplicidade=False, demanda_duplicada_codigo="ATUAL"))

def test_decisao_exige_vinculo_e_bloqueia_aprovacao_eliminada(memoria):
    memoria.update(criterio_nao_duplicidade=False)
    with pytest.raises(DemandaValidationError, match="Selecione"):
        service.decidir("ATUAL", "reprovada")
    memoria["demanda_duplicada_codigo"] = "OUTRA"
    with pytest.raises(DemandaValidationError, match="não permitem"):
        service.decidir("ATUAL", "aprovada")


def test_parecer_distingue_eliminacao_pendencia_e_pontuacao():
    def parecer(respostas):
        return service.gerar_parecer_texto(codigo="TESTE", nome="Teste", tipo="projeto", respostas=respostas, avaliador_nome="Teste")
    texto = parecer({"criterio_competencia": False})
    assert "REPROVADA" in texto and "Competência" in texto
    assert "Não há apuração" in texto
    assert "0% favoráveis" not in texto
    assert "pendente" in parecer({})
    respostas = dict.fromkeys(service._CAMPOS_CRITERIO, True)
    assert "100% favoráveis" in parecer(respostas)
    respostas["criterio_relevancia_setorial"] = False
    texto = parecer(respostas)
    assert "50% favoráveis" in texto and "REPROVADA" in texto


@pytest.mark.parametrize("texto", [None, "", "   ", "\n\t"])
def test_reprovacao_exige_justificativa_mesmo_por_eliminatorio(memoria, texto):
    memoria.update(criterio_competencia=False, parecer_complemento=texto)
    with pytest.raises(DemandaValidationError, match="justificativa"):
        service.decidir("ATUAL", "reprovada")


def test_reprovacao_com_justificativa_chega_a_transicao(memoria, monkeypatch):
    memoria.update(criterio_competencia=False, parecer_complemento="Fora da competência da SLT.")
    def transicao(**kwargs):
        raise RuntimeError("transicao_validada")
    monkeypatch.setattr(service, "_aplicar_transicao", transicao)
    with pytest.raises(RuntimeError, match="transicao_validada"):
        service.decidir("ATUAL", "reprovada")
