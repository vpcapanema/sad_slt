from copy import deepcopy
from contextlib import nullcontext
from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4
from unittest.mock import Mock

import pytest
from pypdf import PdfReader
from pypdf.generic import ContentStream

from api.services import analise_demanda_service as service
from api.services import extracao_atributos_relatorios as estilo
from api.services import parecer_complementacao_service as versoes
from api.repositories import analise_demanda_repository as repository


@pytest.fixture
def documento(monkeypatch):
    usuario_id = str(uuid4())
    consultas = []

    def nome(id):
        consultas.append(id)
        return "Ana Silva"

    monkeypatch.setattr(service.sigma_usuario_repository, "nome_pessoa_por_id", nome)
    monkeypatch.setattr(service, "_rotulo_status", lambda _: "Aguardando complementação")
    analise = {
        "avaliador_id": usuario_id,
        "avaliador_nome": "login_analista",
        "analise_realizada_em": datetime(2026, 10, 20, 15, 30, tzinfo=timezone.utc),
        "parecer_texto": "Texto antigo que não deve duplicar o relatório.",
        "parecer_complemento": "Encaminhar o memorial descritivo.\nEncaminhar o memorial descritivo.",
        "solicitacao_complementacao": "Corrigir o nome da demanda.\nEncaminhar o memorial descritivo.",
        "avaliacao_geometria": {
            "adequada": False, "confirmada": False, "encaminhamento": "complementacao",
            "observacao": "Encaminhar o memorial descritivo.",
        },
    }
    return {
        "demanda": {"codigo": "I-PRJ-TESTE", "nome": "Ponte & acesso <norte>",
                    "status": "analise_aguardando_complementacao"},
        "tipo": "projeto",
        "respostas": dict.fromkeys(service._CAMPOS_CRITERIO, True),
        "analise": analise,
        "decisao": "complementacao",
        "status_atual": "analise_aguardando_complementacao",
        "momento": datetime(2026, 10, 29, 19, 30, tzinfo=timezone.utc),
        "_consultas": consultas,
    }


def emitir(documento):
    return PdfReader(BytesIO(service.gerar_pdf(**{k: v for k, v in documento.items() if not k.startswith("_")})))


def texto(leitor):
    return " ".join(" ".join(p.extract_text() for p in leitor.pages).split())


def test_blocos_marca_conteudo_sem_duplicacao_e_autoria_por_id(documento):
    antes = deepcopy(documento)
    leitor = emitir(documento)
    conteudo = texto(leitor)
    titulos = [
        "SICARD", "Parecer técnico de admissibilidade",
        "Identificação da demanda", "Análise e parecer técnico", "CONCLUSÃO DA ANÁLISE",
        "APROVADA NOS CRITÉRIOS", "O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR",
        "Fundamentação — perguntas, respostas e geometria", "Analista responsável:",
    ]
    assert [conteudo.index(t) for t in titulos] == sorted(conteudo.index(t) for t in titulos)
    for criterio in service.CRITERIOS:
        assert conteudo.count(criterio["pergunta"]) == 1
    assert conteudo.count("Encaminhar o memorial descritivo.") == 1
    assert conteudo.count("Corrigir o nome da demanda.") == 1
    assert "COMPLEMENTAÇÃO NECESSÁRIA" in conteudo
    assert "não representa uma decisão final" in conteudo
    assert "Ponte & acesso <norte>" in conteudo
    assert "Analista responsável: Ana Silva" in conteudo
    assert "Responsabilidade pela análise" not in conteudo
    assert "3 —" not in conteudo and "4 —" not in conteudo
    assert "login_analista" not in conteudo and "Texto antigo" not in conteudo
    assert "São Paulo - SP" in conteudo
    assert "20/10/2026 às 12:30" in conteudo
    assert "29/10/2026 16:30:00" in conteudo
    assert documento["_consultas"] == [documento["analise"]["avaliador_id"]]
    assert documento["analise"] == antes["analise"]
    assert sum(len(p.images) for p in leitor.pages) == 1
    for i, pagina in enumerate(leitor.pages, 1):
        assert abs(float(pagina.mediabox.width) - estilo.A4[0]) < .01
        assert abs(float(pagina.mediabox.height) - estilo.A4[1]) < .01
        assert f"Página {i}" in pagina.extract_text()


@pytest.mark.parametrize("adequada,confirmada,esperado", [
    (True, True, "Sim — confirmada"),
    (True, False, "Sim — confirmação pendente"),
    (False, False, "Não — requer ajuste"),
    (None, False, "Não respondido"),
])
def test_geometria_preserva_os_estados(documento, adequada, confirmada, esperado):
    documento["analise"]["avaliacao_geometria"] = {"adequada": adequada, "confirmada": confirmada}
    assert esperado in texto(emitir(documento))


def test_eliminacao_nao_inventa_pontuacao_nem_parecer_geometrico(documento):
    documento["respostas"] = {"criterio_competencia": False}
    documento["decisao"] = "reprovada"
    documento["analise"]["parecer_complemento"] = "Fora da competência da SLT."
    conteudo = texto(emitir(documento))
    assert "REPROVADA" in conteudo and "Não há apuração de pontuação" in conteudo
    assert "0% favoráveis" not in conteudo and "insuficientemente adequada" not in conteudo
    assert "Não se aplica nesta etapa" in conteudo
    assert "O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR" not in conteudo
    assert "JUSTIFICATIVA DA DECISÃO" in conteudo
    assert "Fora da competência da SLT." in conteudo


def test_identificacao_e_data_ausentes_sao_explicitas_sem_usar_emissao(documento):
    documento["analise"].pop("avaliador_id")
    documento["analise"].pop("analise_realizada_em")
    conteudo = texto(emitir(documento))
    assert "análise sem usuário vinculado" in conteudo
    assert "Data e hora da análise não registradas" in conteudo
    assert "login_analista" not in conteudo and not documento["_consultas"]


def test_usuario_sem_pessoa_nao_e_substituido_por_login(documento, monkeypatch):
    monkeypatch.setattr(service.sigma_usuario_repository, "nome_pessoa_por_id", lambda _: None)
    conteudo = texto(emitir(documento))
    assert "usuário sem nome de pessoa registrado" in conteudo
    assert "login_analista" not in conteudo


def test_falha_sigma_nao_e_ocultada(documento, monkeypatch):
    def indisponivel(_):
        raise RuntimeError("SIGMA indisponível")
    monkeypatch.setattr(service.sigma_usuario_repository, "nome_pessoa_por_id", indisponivel)
    with pytest.raises(RuntimeError, match="SIGMA indisponível"):
        emitir(documento)


def test_textos_longos_escapados_e_paginados_sem_perda(documento):
    frase = "Orientação técnica para o interessado & comprovação <documental>."
    documento["analise"]["parecer_complemento"] = "\n".join(f"{i}: {frase}" for i in range(120))
    leitor = emitir(documento)
    conteudo = texto(leitor)
    assert len(leitor.pages) > 2
    assert f"119: {frase}" in conteudo
    assert conteudo.index(f"119: {frase}") < conteudo.index("Analista responsável:")


@pytest.mark.parametrize("valores,rotulo,motivo", [
    ({}, "ANÁLISE PENDENTE", "Faltam respostas"),
    ({"criterio_competencia": False}, "REPROVADA NOS CRITÉRIOS", "O objeto da demanda NÃO está dentro das atribuições da SLT."),
    (dict.fromkeys(service._CAMPOS_CRITERIO, True) | {"criterio_relevancia_setorial": False},
     "REPROVADA NOS CRITÉRIOS", "A demanda NÃO contribui para melhorar o transporte ou a logística no Estado."),
])
def test_resultado_e_motivo_antes_das_providencias_e_dos_detalhes(documento, valores, rotulo, motivo):
    documento["respostas"] = valores
    conteudo = texto(emitir(documento))
    assert conteudo.index(rotulo) < conteudo.index(motivo)
    assert conteudo.index(motivo) < conteudo.index("O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR")
    assert conteudo.index("Encaminhar o memorial descritivo.") < conteudo.index("Fundamentação")


def test_resultado_tem_hierarquia_tipografica_maior_que_o_corpo(documento):
    leitor = emitir(documento)
    trechos = []
    for pagina in leitor.pages:
        pagina.extract_text(visitor_text=lambda texto, cm, tm, fonte, tamanho: trechos.append((texto, tamanho)))
    assert any("APROVADA NOS CRITÉRIOS" in texto and tamanho >= 18 for texto, tamanho in trechos)
    assert any("Encaminhar o memorial" in texto and tamanho >= 10 for texto, tamanho in trechos)


@pytest.mark.parametrize("criterio", service.CRITERIOS)
def test_parecer_declara_exatamente_o_que_nao_foi_atendido(documento, criterio):
    respostas = dict.fromkeys(service._CAMPOS_CRITERIO, True)
    respostas[criterio["campo"]] = False
    documento["respostas"] = respostas
    conteudo = texto(emitir(documento))
    assert criterio["parecer_nao"] in conteudo
    assert conteudo.index(criterio["parecer_nao"]) < conteudo.index("Fundamentação")
    parecer_texto = service.gerar_parecer_texto(
        codigo="D", nome="Teste", tipo="projeto", respostas=respostas, avaliador_nome="Analista")
    assert criterio["parecer_nao"] in parecer_texto


def test_reprovacao_explicita_e_geometria_em_frases_declarativas(documento):
    documento["respostas"]["criterio_relevancia_setorial"] = False
    conteudo = texto(emitir(documento))
    assert "REPROVADA NOS CRITÉRIOS, POIS:" in conteudo
    assert "A demanda NÃO contribui para melhorar o transporte ou a logística no Estado." in conteudo
    frase = "A geometria NÃO representa adequadamente o objeto da demanda. REQUER AJUSTE."
    assert conteudo.count(frase) == 1
    assert conteudo.index(frase) < conteudo.index("O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR")
    assert frase in service._parecer_com_geometria(documento["analise"])


def test_respostas_positivas_ou_ausentes_nao_viram_justificativa_negativa(documento):
    documento["respostas"] = dict.fromkeys(service._CAMPOS_CRITERIO, None)
    conteudo = texto(emitir(documento))
    for criterio in service.CRITERIOS:
        assert criterio["parecer_nao"] not in conteudo
    assert "A geometria NÃO representa" not in conteudo


@pytest.mark.parametrize("status,bg,foreground", [
    ("analise_reprovada", "#ffebee", "#c62828"),
    ("analise_aprovada", "#e8f5e9", "#2e7d32"),
    ("analise_aguardando_complementacao", "#f3e8fd", "#4a148c"),
])
def test_bloco_usa_cor_do_status_real_nao_do_resultado_calculado(documento, status, bg, foreground):
    documento["status_atual"] = status
    documento["respostas"]["criterio_relevancia_setorial"] = False
    assert service._cores_status_parecer(status) == {"bg": bg, "text": foreground}
    leitor = emitir(documento)
    cores = []
    for pagina in leitor.pages:
        for valores, operador in ContentStream(pagina.get_contents(), leitor).operations:
            if operador == b"rg":
                cores.append(tuple(float(v) for v in valores))
    for hex in (bg, foreground):
        rgb = tuple(int(hex[i:i + 2], 16) / 255 for i in (1, 3, 5))
        assert any(all(abs(a - b) < .00001 for a, b in zip(cor, rgb)) for cor in cores)


def test_status_desconhecido_nao_recebe_cor_inventada():
    from api.exceptions import DemandaValidationError
    with pytest.raises(DemandaValidationError, match="cor oficial"):
        service._cores_status_parecer("inexistente")


def test_decisao_final_reprovada_nao_e_confundida_com_resultado_automatico(documento):
    documento["decisao"] = "reprovada"
    documento["analise"]["parecer_complemento"] = "Justificativa específica do analista."
    conteudo = texto(emitir(documento))
    assert "CONCLUSÃO DA ANÁLISE REPROVADA" in conteudo
    assert "Os critérios foram atendidos, mas o analista decidiu reprovar" in conteudo
    assert "Justificativa específica do analista." in conteudo
    assert "COMPLEMENTAÇÃO NECESSÁRIA" not in conteudo


@pytest.mark.parametrize("decisao,rotulo", [
    ("aprovada", "APROVADA"), ("ressalvas", "APROVADA COM RESSALVAS"),
])
def test_decisoes_finais_em_destaque_sem_pedido_de_complementacao(documento, decisao, rotulo):
    documento["decisao"] = decisao
    conteudo = texto(emitir(documento))
    assert "CONCLUSÃO DA ANÁLISE " + rotulo in conteudo
    assert "O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR" not in conteudo
    assert "não representa uma decisão final" not in conteudo


def test_fontes_incluem_autoria_data_local_e_solicitacao(documento, monkeypatch):
    pedido = {"demanda_tipo": "projeto", "categorias": ["geometria"], "descricao": "Memorial atualizado"}
    fonte = versoes._fonte(pedido, documento["demanda"], documento["analise"])
    assert fonte["avaliador"] == "Ana Silva"
    assert fonte["avaliador_id"] == documento["analise"]["avaliador_id"]
    assert fonte["analise_realizada_em"] == "2026-10-20T15:30:00+00:00"
    assert fonte["local_analise"] == "São Paulo - SP"
    assert fonte["solicitacao_complementacao"] == "Memorial atualizado"
    antes = versoes._hash(fonte)
    pedido["descricao"] = "Outra orientação"
    assert versoes._hash(versoes._fonte(pedido, documento["demanda"], documento["analise"])) != antes


def test_salvar_analise_persiste_data_sem_vincular_a_emissao(monkeypatch):
    conn = Mock()
    conn.execute.return_value.rowcount = 1
    monkeypatch.setattr(repository, "get_connection", lambda: nullcontext(conn))
    monkeypatch.setattr(repository, "get_by_codigo", lambda _: {"demanda_codigo": "D"})
    repository.upsert(demanda_codigo="D", demanda_tipo="projeto", campos={"criterio_competencia": True})
    query = conn.execute.call_args.args[0].as_string()
    assert "analise_realizada_em) VALUES" in query
    assert "analise_realizada_em = CURRENT_TIMESTAMP" in query
    conn.execute.reset_mock()
    repository.salvar_pdf(demanda_codigo="D", pdf=b"%PDF-teste")
    assert "analise_realizada_em" not in conn.execute.call_args.args[0]


def test_leitura_da_analise_nao_troca_data_pela_reemissao(documento):
    analise = {**documento["analise"], **documento["respostas"],
               "atualizado_em": documento["momento"]}
    resposta = service._montar_resposta(
        codigo="I-PRJ-TESTE", tipo="projeto", demanda=documento["demanda"], analise=analise)
    assert "Data da análise: 20/10/2026 às 12:30." in resposta.parecer_texto
    assert "Data da análise: 29/10/2026" not in resposta.parecer_texto
