"""Repositório de PDFs do SEI: armazenamento, leitura de campos e criação.

Os PDFs são gerados no próprio teste com reportlab; nenhum documento real do
SEI é usado. O banco é substituído por um repositório em memória — o objetivo
aqui é o contrato do serviço e das rotas, não o SQL.
"""
import io
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.routers import sei_documentos as rotas
from api.services import sei_processamento as processamento
from api.services import sei_repositorio_service as servico

OFICIO = """GOVERNO DO ESTADO DE SAO PAULO
Processo: 1234.00456789/2026-11
Assunto: Duplicacao da rodovia vicinal de acesso ao distrito industrial
Interessado: Prefeitura Municipal de Aracatuba - CNPJ 12.345.678/0001-90
Representante legal: Maria Aparecida de Souza
E-mail: obras@aracatuba.sp.gov.br
Telefone: (18) 99876-5432
Municipio: Aracatuba
Valor estimado: R$ 12.450.000,00
Prazo de execucao: 24 meses
Vigencia: 01/03/2026 a 28/02/2028
Latitude: -21,2089
Longitude: -50,4328
"""


def pdf(linhas: str) -> bytes:
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pagina = canvas.Canvas(buffer)
    for indice, linha in enumerate(linhas.split("\n")):
        pagina.drawString(40, 800 - indice * 16, linha)
    pagina.save()
    return buffer.getvalue()


class RepositorioFalso:
    """Mesmo contrato de api/repositories/sei_documento_repository."""

    def __init__(self):
        self.registros: dict[str, dict] = {}

    def listar(self):
        return list(self.registros.values())

    def obter(self, documento_id):
        return self.registros.get(str(documento_id))

    def obter_por_sha256(self, sha256):
        return next((r for r in self.registros.values() if r["sha256"] == sha256), None)

    def obter_conteudo(self, documento_id):
        registro = self.registros.get(str(documento_id))
        return {"nome_arquivo": registro["nome_arquivo"], "conteudo": registro["conteudo"]} if registro else None

    def inserir(self, **campos):
        registro = {
            "id": str(uuid4()), "numero_processo": None, "campos_sugeridos": {},
            "evidencias": {}, "analise": {}, "tipo_demanda": "projeto",
            "demanda_id": None, "criado_em": "2026-09-11T10:00:00-03:00",
            "atualizado_em": "2026-09-11T10:00:00-03:00", **campos,
        }
        self.registros[registro["id"]] = registro
        return registro

    def marcar_demanda(self, documento_id, demanda_id):
        registro = self.registros.get(str(documento_id))
        if not registro or registro["demanda_id"]:
            return None
        registro.update(demanda_id=demanda_id, status="demanda_criada")
        return registro

    def excluir(self, documento_id):
        return self.registros.pop(str(documento_id), None) is not None


@pytest.fixture
def repo(monkeypatch):
    falso = RepositorioFalso()
    monkeypatch.setattr(servico, "repo", falso)
    # O identificador é UUID real; a trava por documento não deve vazar entre testes.
    servico._TRAVAS.clear()
    return falso


def enviar(nome="oficio.pdf", texto=OFICIO):
    return servico.receber(conteudo=pdf(texto), nome_arquivo=nome, usuario_id=str(uuid4()), usuario_nome="Analista")


def test_processamento_le_campos_rotulados_com_evidencia():
    leitura = processamento.analisar(pdf(OFICIO), "projeto")
    campos = leitura["campos_sugeridos"]
    assert leitura["numero_processo"] == "1234.00456789/2026-11"
    assert campos["nome"] == "Duplicacao da rodovia vicinal de acesso ao distrito industrial"
    assert campos["instituicao_label"] == "Prefeitura Municipal de Aracatuba"
    assert campos["instituicao_cnpj"] == "12.345.678/0001-90"
    assert campos["representante_email"] == "obras@aracatuba.sp.gov.br"
    assert campos["valor_global"] == 12450000.0
    assert campos["prazo_referencia_meses"] == 24
    assert campos["vigencia_inicio"] == "2026-03-01"
    assert campos["vigencia_fim"] == "2028-02-28"
    assert campos["lat"] == pytest.approx(-21.2089)
    assert campos["lng"] == pytest.approx(-50.4328)
    assert leitura["tipo_demanda"] == "projeto"
    assert leitura["campos"]["valor_global"]["evidencias"][0]["pagina"] == 1


OFICIO_SEM_ROTULOS_DO_FORMULARIO = """PREFEITURA MUNICIPAL DE MARÍLIA
Ofício nº 45/2026
Ref.: Recuperação da ponte sobre o Rio do Peixe
1. Descrição do objeto: Recuperação estrutural e alargamento da ponte na estrada vicinal MRL-010.
2. Valor total da obra: R$ 3,2 milhões
3. Prazo previsto para execução: 18 (dezoito) meses
Período de vigência: de 1º de abril de 2026 a 30 de setembro de 2027
Coordenadas geográficas: -22.2139, -49.9458
Contato: (14) 3402-6000
Maria Aparecida de Souza
Prefeita Municipal
"""


def test_sinonimos_e_formatos_de_documento_real():
    campos = processamento.analisar(pdf(OFICIO_SEM_ROTULOS_DO_FORMULARIO), "projeto")["campos_sugeridos"]
    assert campos["nome"] == "Recuperação da ponte sobre o Rio do Peixe"
    assert campos["descricao"].startswith("Recuperação estrutural e alargamento")
    assert campos["valor_global"] == 3200000.0
    assert campos["prazo_referencia_meses"] == 18
    assert campos["vigencia_inicio"] == "2026-04-01"
    assert campos["vigencia_fim"] == "2027-09-30"
    assert campos["lat"] == pytest.approx(-22.2139)
    assert campos["lng"] == pytest.approx(-49.9458)
    assert campos["representante_nome"] == "Maria Aparecida de Souza"
    assert campos["representante_telefone"] == "(14) 3402-6000"
    assert campos["instituicao_label"] == "PREFEITURA MUNICIPAL DE MARÍLIA"
    assert campos["municipio"] == "MARÍLIA"


def test_mencao_em_frase_e_valor_na_linha_seguinte():
    texto = "Objeto:\nImplantação de terminal intermodal de cargas\nO empreendimento tem investimento total estimado de R$ 45.000.000,00 e prazo de execução de 2 anos."
    campos = processamento.analisar(pdf(texto), "projeto")["campos_sugeridos"]
    assert campos["nome"] == "Implantação de terminal intermodal de cargas"
    assert campos["valor_global"] == 45000000.0
    assert campos["prazo_referencia_meses"] == 24


def test_contrapartida_nao_vira_valor_do_empreendimento():
    campos = processamento.analisar(pdf("Valor da contrapartida: R$ 100.000,00"), "projeto")["campos_sugeridos"]
    assert "valor_global" not in campos


def test_valores_concorrentes_nao_sao_sugeridos():
    leitura = processamento.analisar(pdf("Valor total: R$ 100,00\nValor global: R$ 200,00"), "projeto")
    assert "valor_global" not in leitura["campos_sugeridos"]
    assert "valor_global" in leitura["conflitos"]


def test_campo_sem_regra_fica_ausente_e_nao_recebe_zero():
    leitura = processamento.analisar(pdf("Oficio sem rotulos reconheciveis."), "projeto")
    assert "lat" not in leitura["campos_sugeridos"]
    assert "valor_global" not in leitura["campos_sugeridos"]
    assert "lat" in leitura["ausentes"] and "valor_global" in leitura["ausentes"]
    assert leitura["numero_processo"] is None


# O desfecho da análise alimenta o modal de status da tela de contribuições do
# SEI: verde quando tudo que o extrator sabe ler saiu do PDF, amarelo quando
# algo ficou em branco ou em conflito.

OFICIO_COMPLETO = """PREFEITURA MUNICIPAL DE BAURU
Assunto: Implantacao do contorno viario norte
Descricao do objeto: Implantacao de contorno viario com 8 km de extensao, incluindo terraplenagem, pavimentacao e sinalizacao.
Interessado: Prefeitura Municipal de Bauru - CNPJ 12.345.678/0001-90
Representante legal: Joao Carlos Ferreira
E-mail: obras@bauru.sp.gov.br
Telefone: (14) 3235-1000
Municipio: Bauru
Valor total: R$ 25.000.000,00
Prazo de execucao: 30 meses
Vigencia: 01/02/2026 a 31/07/2028
Latitude: -22,3147
Longitude: -49,0606
O projeto executivo concluido permite a licitacao imediata.
"""


def test_desfecho_verde_quando_tudo_que_o_extrator_le_veio_do_pdf():
    resumo = processamento.analisar(pdf(OFICIO_COMPLETO), "projeto")["resumo"]
    assert resumo["desfecho"] == "sucesso"
    assert resumo["campos_faltando"] == []
    assert resumo["campos_conflitantes"] == []
    assert resumo["campos_lidos"] == resumo["campos_avaliados"]


def test_desfecho_amarelo_nomeia_o_que_ficou_em_branco():
    resumo = processamento.analisar(pdf(OFICIO), "projeto")["resumo"]
    assert resumo["desfecho"] == "ressalvas"
    # O ofício é uma lista de linhas rotuladas, sem descrição em prosa.
    assert "descricao" in resumo["campos_faltando"]
    assert "nome" in resumo["campos_lidos"]


def test_desfecho_amarelo_separa_conflito_de_ausencia():
    leitura = processamento.analisar(pdf("Valor total: R$ 100,00\nValor global: R$ 200,00"), "projeto")
    resumo = leitura["resumo"]
    assert resumo["desfecho"] == "ressalvas"
    assert resumo["campos_conflitantes"] == ["valor_global"]
    assert "valor_global" not in resumo["campos_faltando"]


# Rótulos como o documento real escreve. O valor é neutro de propósito: com
# "Prefeitura Municipal de X" a regra de ente municipal pesca o valor sozinha,
# sem olhar o rótulo, e o teste passaria sem testar o que diz testar.
INSTITUICAO = "Companhia Paulista de Obras e Servicos"


def instituicao(texto: str) -> str | None:
    return processamento.analisar(pdf(texto), "projeto")["campos_sugeridos"].get("instituicao_label")


def test_rotulo_no_plural_e_lido():
    """"Interessados:" é a forma da autuação do SEI; o `s` derrubava o casamento."""
    assert instituicao(f"Interessado: {INSTITUICAO}") == INSTITUICAO
    assert instituicao(f"Interessados: {INSTITUICAO}") == INSTITUICAO
    assert instituicao(f"Requerentes: {INSTITUICAO}") == INSTITUICAO


def test_rotulo_no_meio_da_linha_e_lido():
    """Cabeçalho que junta processo e interessado na mesma linha."""
    assert instituicao(f"Processo 123.456/2026 - Interessado: {INSTITUICAO}") == INSTITUICAO


def test_rotulo_com_espacamento_entre_caracteres_e_lido():
    assert instituicao(f"I n t e r e s s a d o: {INSTITUICAO}") == INSTITUICAO
    assert instituicao(f"Inte r essado: {INSTITUICAO}") == INSTITUICAO
    campos = processamento.analisar(pdf("V a l o r  t o t a l: R$ 25.000.000,00"), "projeto")["campos_sugeridos"]
    assert campos["valor_global"] == 25000000.0


def test_rotulo_desconhecido_nao_vira_instituicao():
    """Controle negativo. Sem ele, uma regra que pesca o valor solto faz
    qualquer rótulo — até um inventado — parecer reconhecido."""
    assert instituicao(INSTITUICAO) is None
    assert instituicao(f"Nivel de Acesso: {INSTITUICAO}") is None
    assert instituicao(f"O documento cita a {INSTITUICAO} no anexo.") is None


def test_ente_municipal_enderecado_nao_vira_o_proponente():
    """A pesca de "Prefeitura Municipal de X" não distingue quem pede de quem
    recebe: na linha de endereçamento ela preenchia a instituição errada."""
    assert instituicao("Ao Senhor Prefeito da Prefeitura Municipal de Bauru") is None
    # Sem endereçamento, o cabeçalho sem rótulo continua valendo.
    assert instituicao("PREFEITURA MUNICIPAL DE MARILIA\nOficio nr 45/2026") == "PREFEITURA MUNICIPAL DE MARILIA"


def test_nome_do_municipio_nao_absorve_a_prosa_seguinte():
    """A captura terminava numa lista fixa de verbos. Fora dela o nome engolia
    o resto da frase, e o erro chegava preenchido ao formulário."""
    campos = processamento.analisar(
        pdf("Aos interessados, a Prefeitura Municipal de Bauru informa o seguinte."), "projeto"
    )["campos_sugeridos"]
    assert campos["instituicao_label"] == "Prefeitura Municipal de Bauru"
    assert campos["municipio"] == "Bauru"


def test_nome_composto_de_municipio_e_lido_inteiro():
    """O corte pela caixa não pode partir "Sao Jose do Rio Preto" no conector."""
    campos = processamento.analisar(
        pdf("A Prefeitura Municipal de Sao Jose do Rio Preto solicita apoio."), "projeto"
    )["campos_sugeridos"]
    assert campos["municipio"] == "Sao Jose do Rio Preto"


def test_desfecho_ignora_campo_que_nenhuma_regra_sabe_ler():
    """Cobrar campo sem regra faria de toda análise uma ressalva por limite do
    próprio extrator; identificadores resolvidos no SIGMA também ficam fora."""
    resumo = processamento.analisar(pdf(OFICIO_COMPLETO), "projeto")["resumo"]
    avaliados = set(resumo["campos_avaliados"])
    assert "capex_estimado" in resumo["campos_sem_regra"]
    assert not avaliados & set(resumo["campos_sem_regra"])
    assert not avaliados & processamento.CAMPOS_NAO_EXTRAIVEIS


def test_coordenada_fora_de_faixa_e_descartada():
    leitura = processamento.analisar(pdf("Latitude: -991,5\nLongitude: -50,4"), "projeto")
    assert "lat" not in leitura["campos_sugeridos"]
    assert leitura["campos_sugeridos"]["lng"] == pytest.approx(-50.4)


def test_coordenada_em_grau_minuto_segundo():
    leitura = processamento.analisar(pdf("Latitude: 21°12'32\"S\nLongitude: 50°25'58\"O"), "projeto")
    assert leitura["campos_sugeridos"]["lat"] == pytest.approx(-21.2089, abs=1e-3)
    assert leitura["campos_sugeridos"]["lng"] == pytest.approx(-50.4328, abs=1e-3)


def test_cada_campo_sugerido_tem_trecho_de_origem():
    leitura = processamento.analisar(pdf(OFICIO), "projeto")
    sugeridos = set(leitura["campos_sugeridos"])
    assert all(leitura["campos"][campo]["evidencias"] for campo in sugeridos)
    assert "R$ 12.450.000,00" in leitura["campos"]["valor_global"]["evidencias"][0]["trecho"]


def test_tipo_e_escolhido_antes_da_analise():
    leitura = processamento.analisar(pdf(OFICIO), "programa")
    assert leitura["tipo_demanda"] == "programa"
    assert "publico_alvo" in leitura["campos"]
    assert "vigencia_inicio" not in leitura["campos"]


def test_paginas_nao_duplicam_texto_integral_no_json():
    leitura = processamento.analisar(pdf(OFICIO), "projeto")
    assert leitura["paginas"][0]["caracteres"] > 0
    assert "texto" not in leitura["paginas"][0]


def test_arquivo_que_nao_e_pdf_e_recusado(repo):
    with pytest.raises(DemandaValidationError):
        servico.receber(conteudo=b"texto qualquer", nome_arquivo="oficio.pdf", usuario_id=str(uuid4()), usuario_nome="Analista")
    assert not repo.registros


def test_arquivo_acima_do_limite_e_recusado(repo):
    grande = b"%PDF-" + b"0" * servico.LIMITE_BYTES
    with pytest.raises(DemandaValidationError):
        servico.receber(conteudo=grande, nome_arquivo="grande.pdf", usuario_id=str(uuid4()), usuario_nome="Analista")
    assert not repo.registros


def test_mesmo_pdf_nao_entra_duas_vezes(repo):
    # A duplicata é o mesmo arquivo, byte a byte; reportlab carimba a data de
    # criação, então dois PDFs do mesmo texto são arquivos diferentes.
    conteudo = pdf(OFICIO)
    servico.receber(conteudo=conteudo, nome_arquivo="oficio.pdf", usuario_id=str(uuid4()), usuario_nome="Analista")
    with pytest.raises(DemandaValidationError):
        servico.receber(conteudo=conteudo, nome_arquivo="copia.pdf", usuario_id=str(uuid4()), usuario_nome="Analista")
    assert len(repo.registros) == 1


def test_pdf_sem_texto_e_aceito_para_ocr(repo, monkeypatch):
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pagina = canvas.Canvas(buffer)
    pagina.rect(40, 40, 200, 200, fill=0)
    pagina.save()
    documento = servico.receber(conteudo=buffer.getvalue(), nome_arquivo="digitalizado.pdf",
                                usuario_id=str(uuid4()), usuario_nome="Analista")
    assert documento["status"] == "recebido"
    monkeypatch.setattr(processamento, "_ocr", lambda pagina: ("Assunto: Terminal intermodal", None))
    analisado = servico.analisar(documento["id"], "projeto")
    assert analisado["campos_sugeridos"]["nome"] == "Terminal intermodal"


def test_analise_devolve_leitura_sem_gravar(repo):
    enviado = enviar()
    documento = servico.analisar(enviado["id"], "projeto")
    assert documento["numero_processo"] == "1234.00456789/2026-11"
    assert documento["campos_sugeridos"]["nome"].startswith("Duplicacao")
    gravado = repo.obter(enviado["id"])
    assert gravado["status"] == "recebido"
    assert gravado["campos_sugeridos"] == {} and gravado["numero_processo"] is None


def test_reanalise_le_o_pdf_de_novo_com_outro_tipo(repo):
    enviado = enviar()
    assert servico.analisar(enviado["id"], "projeto")["tipo_demanda"] == "projeto"
    assert servico.analisar(enviado["id"], "plano")["tipo_demanda"] == "plano"
    assert repo.obter(enviado["id"])["tipo_demanda"] == "projeto"


def test_identificador_invalido_nao_chega_ao_banco(repo):
    with pytest.raises(DemandaValidationError):
        servico.obter("nao-e-uuid")


def test_documento_inexistente(repo):
    with pytest.raises(DemandaNotFoundError):
        servico.obter(str(uuid4()))


def aplicacao(repo, monkeypatch, perfil="OPERADOR"):
    app = FastAPI()
    app.include_router(rotas.router)
    usuario = SimpleNamespace(id=str(uuid4()), nome="Analista", tipo_usuario=perfil)
    app.dependency_overrides[rotas.require_operator] = lambda: usuario
    app.dependency_overrides[rotas.require_authenticated] = lambda: usuario
    monkeypatch.setattr(rotas.documentos, "repo", repo)
    return TestClient(app)


def test_envio_em_lote_separa_aceito_de_recusado(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    resposta = client.post("/sei/documentos", files=[
        ("arquivos", ("oficio.pdf", pdf(OFICIO), "application/pdf")),
        ("arquivos", ("planilha.xlsx", b"PK\x03\x04nao-e-pdf", "application/vnd.ms-excel")),
    ])
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert len(corpo["recebidos"]) == 1
    assert corpo["erros"][0]["arquivo"] == "planilha.xlsx"


def test_rota_de_analise_recebe_tipo(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = enviar()
    resposta = client.post(f"/sei/documentos/{documento['id']}/analisar", json={"tipo_demanda": "plano"})
    assert resposta.status_code == 200
    assert resposta.json()["tipo_demanda"] == "plano"


def test_lote_acima_do_limite_de_corpo_tem_erro_proprio(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    volumoso = b"%PDF-" + b"0" * (servico.LIMITE_BYTES - 5)
    arquivos = [("arquivos", (f"parte{i}.pdf", volumoso, "application/pdf")) for i in range(4)]
    resposta = client.post("/sei/documentos", files=arquivos)
    assert resposta.status_code == 413
    assert "160 MB" in resposta.json()["detail"]


def test_envio_exige_sessao():
    app = FastAPI()
    app.include_router(rotas.router)
    resposta = TestClient(app).post("/sei/documentos", files=[("arquivos", ("a.pdf", b"%PDF-1.4", "application/pdf"))])
    assert resposta.status_code == 401


def test_criacao_valida_payload_e_nao_duplica(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = servico.analisar(enviar()["id"], "projeto")
    chamadas = []

    def criar(payload, **kwargs):
        chamadas.append(payload)
        return {"id": "I-PRJ-SEI-12345678"}

    monkeypatch.setattr(rotas.demanda_service, "criar_demanda", criar)
    caminho = f"/sei/documentos/{documento['id']}/criar-demanda"

    assert client.post(caminho, json={"campos": {}}).status_code == 422
    assert not chamadas

    campos = dict(nome="Simulacao", instituicao_id="teste", lat=-21.2, lng=-50.4,
                  representante={"nome": "Teste"}, diretoria_id="", plano_id="")
    primeira = client.post(caminho, json={"campos": campos})
    segunda = client.post(caminho, json={"campos": campos})
    assert primeira.status_code == 200 and segunda.status_code == 200
    assert len(chamadas) == 1
    assert segunda.json() == {"id": "I-PRJ-SEI-12345678", "ja_existia": True}
    assert f"Processo SEI: {documento['numero_processo']}" in chamadas[0].descricao
    assert repo.obter(documento["id"])["status"] == "demanda_criada"


def test_status_do_payload_e_ignorado(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = enviar()
    chamadas = []
    monkeypatch.setattr(rotas.demanda_service, "criar_demanda",
                        lambda payload, **kwargs: (chamadas.append(payload), {"id": "I-PRJ-SEI-000000AA"})[1])
    campos = dict(nome="Simulacao", instituicao_id="teste", lat=-21.2, lng=-50.4,
                  representante={"nome": "Teste"}, diretoria_id="", plano_id="", status="aprovada")
    assert client.post(f"/sei/documentos/{documento['id']}/criar-demanda", json={"campos": campos}).status_code == 200
    assert chamadas[0].status != "aprovada"


def test_documento_sem_numero_usa_o_arquivo_como_origem(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = servico.analisar(enviar(nome="solicitacao.pdf", texto="Oficio sem numero de processo.")["id"], "projeto")
    chamadas = []
    monkeypatch.setattr(rotas.demanda_service, "criar_demanda",
                        lambda payload, **kwargs: (chamadas.append(payload), {"id": "I-PRJ-SEI-000000BB"})[1])
    campos = dict(nome="Simulacao", instituicao_id="teste", lat=-21.2, lng=-50.4,
                  representante={"nome": "Teste"}, diretoria_id="", plano_id="")
    client.post(f"/sei/documentos/{documento['id']}/criar-demanda", json={"campos": campos})
    assert "Documento SEI: solicitacao.pdf" in chamadas[0].descricao


def test_documento_com_demanda_nao_e_excluido(repo, monkeypatch):
    documento = enviar()
    repo.marcar_demanda(documento["id"], "I-PRJ-SEI-12345678")
    with pytest.raises(DemandaValidationError):
        servico.excluir(documento["id"])
    assert repo.obter(documento["id"])


def test_download_devolve_o_pdf_armazenado(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = enviar()
    resposta = client.get(f"/sei/documentos/{documento['id']}/arquivo")
    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "application/pdf"
    assert resposta.content.startswith(b"%PDF-")
