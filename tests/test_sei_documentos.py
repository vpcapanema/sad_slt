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

    def marcar_analisado(self, documento_id, *, numero_processo, tipo_demanda,
                         campos_sugeridos=None, evidencias=None, analise=None):
        registro = self.registros.get(str(documento_id))
        if not registro or registro["demanda_id"]:
            return None
        registro.update(status="analisado", tipo_demanda=tipo_demanda,
                        numero_processo=numero_processo or registro["numero_processo"],
                        campos_sugeridos=campos_sugeridos or {},
                        evidencias=evidencias or {}, analise=analise or {})
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


RELATORIO_QUE_REPETE_O_MUNICIPIO = """PREFEITURA MUNICIPAL DE DOIS CORREGOS
Relatorio sobre a importancia da ferrovia para o desenvolvimento local.
No municipio de Dois Corregos, destaca-se o museu ferroviario da cidade.
"""


def test_arroba_quebrada_pelo_ocr_nao_perde_o_email():
    """Em página digitalizada o OCR entrega "(Q" no lugar do arroba; sem tratar
    isso, o e-mail do proponente simplesmente some."""
    campos = processamento.analisar(
        pdf("E-mail: culturaeturismo(Qdoiscorregos.sp.gov.br"), "projeto")["campos_sugeridos"]
    assert campos["representante_email"] == "culturaeturismo@doiscorregos.sp.gov.br"


def test_parentese_solto_nao_vira_email():
    """Controle negativo: a recomposição não pode inventar endereço."""
    leitura = processamento.analisar(pdf("Reuniao (Q) sobre o tema\nCusto (Q1) de 2025"), "projeto")
    assert "representante_email" not in leitura["campos_sugeridos"]


CABECALHO_COM_RUIDO_DE_BRASAO = """PREFEITURA MUNICIPAL DE DOIS CORREGOS CA
Relatorio sobre a importancia da ferrovia para o desenvolvimento local.
No municipio de Dois Corregos, destaca-se o museu ferroviario da cidade.
"""


def test_letra_solta_do_brasao_nao_entra_no_nome_do_municipio():
    """O OCR cola o brasão como uma ou duas letras no fim do cabeçalho — "CA"
    na VM, "<" aqui. Sem cortar, o documento conflitava consigo mesmo: o nome
    com ruído e o nome do corpo viravam valores diferentes."""
    leitura = processamento.analisar(pdf(CABECALHO_COM_RUIDO_DE_BRASAO), "projeto")
    assert leitura["campos"]["municipio"]["estado"] == "normalizado"
    assert processamento._sem_acento(leitura["campos_sugeridos"]["municipio"]) == "dois corregos"
    assert leitura["campos_sugeridos"]["instituicao_label"].endswith("DOIS CORREGOS")


def test_mesma_grafia_em_caixas_diferentes_nao_vira_conflito():
    """O nome em caixa alta no cabeçalho e normal no corpo virava dois valores
    distintos: empatavam em confiança, davam conflito e o campo ficava vazio —
    o documento cancelava a si mesmo."""
    leitura = processamento.analisar(pdf(RELATORIO_QUE_REPETE_O_MUNICIPIO), "projeto")
    assert leitura["campos"]["municipio"]["estado"] == "normalizado"
    assert processamento._sem_acento(leitura["campos_sugeridos"]["municipio"]) == "dois corregos"


def test_municipios_realmente_diferentes_seguem_em_conflito():
    """Controle negativo: a deduplicação não pode engolir divergência real."""
    leitura = processamento.analisar(pdf("Municipio: Bauru\nMunicipio: Marilia"), "projeto")
    assert leitura["campos"]["municipio"]["estado"] == "conflitante"
    assert "municipio" not in leitura["campos_sugeridos"]


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


# "Nome sobre cargo" descreve tanto quem assina quanto o destinatário no
# cabeçalho. Vinha preenchido o destinatário — o secretário a quem o ofício é
# endereçado — como se fosse quem está pedindo. A forma destes documentos
# reproduz ofícios reais recebidos pelo SEI; o conteúdo é fictício.

OFICIO_COM_DESTINATARIO = """Ofício GAB n° 579/2025
Bauru, 29 de outubro de 2025.
Excelentíssima Senhora
Marina Álvares Pinto
Secretária de Meio Ambiente, Infraestrutura e Logística
Assunto: Solicitação de apoio para o Projeto Rota dos Trilhos.
Prezada Secretária,
Cumprimentando-a cordialmente, venho apresentar o projeto e solicitar apoio.
Atenciosamente,
Prof.ª Dra. Telma Goncalves Carneiro Spera
Prefeita do Municipio de Bauru
"""


def test_destinatario_do_oficio_nao_vira_o_representante():
    campos = processamento.analisar(pdf(OFICIO_COM_DESTINATARIO), "projeto")["campos_sugeridos"]
    # O tratamento ("Prof.ª Dra.") acompanha o nome na linha da assinatura.
    assert campos["representante_nome"] == "Telma Goncalves Carneiro Spera"


OFICIO_COM_DESTINATARIO_NO_RODAPE = """ASSEMBLEIA LEGISLATIVA
Assunto: Implantacao de Ponte sobre o Rio Paranapanema.
Senhora Secretaria,
Solicitamos a insercao da contratacao do EVTEA no cronograma de investimentos.
Atenciosamente,
DEPUTADO ESTADUAL - RICARDO MADALENA
Presidente da Comissao de Transportes e Comunicacoes
Excelentissima Senhora
Marina Alvares Pinto
Secretaria de Meio Ambiente, Infraestrutura e Logistica
"""


def test_destinatario_no_rodape_nao_vence_quem_assinou():
    """Aqui o destinatário aparece depois da assinatura: posição na página não
    resolve, quem decide é o fecho de cortesia."""
    campos = processamento.analisar(pdf(OFICIO_COM_DESTINATARIO_NO_RODAPE), "projeto")["campos_sugeridos"]
    # O cargo acompanha o nome na mesma linha, separado por travessão.
    assert campos["representante_nome"] == "RICARDO MADALENA"


# O nome do arquivo que o SEI entrega carrega o número do processo e, num anexo
# sem rótulo interno, o único título de projeto que existe.

def test_numero_do_processo_sai_do_nome_do_arquivo():
    assert processamento.numero_no_nome(
        "SEI nº 020 00016588 2025 13 - 02___Terminal_Urbano.pdf") == "020.00016588/2025-13"
    # Espaço dentro do bloco do meio e zero sobrando: o mesmo processo.
    assert processamento.numero_no_nome("SEI nº 020 000 16588 2025 13 - x.pdf") == "020.00016588/2025-13"
    assert processamento.numero_no_nome("SEI nº 020 000016588 2025 13 - x.pdf") == "020.00016588/2025-13"
    assert processamento.numero_no_nome("documento_sem_processo.pdf") is None


def test_analise_usa_o_processo_do_nome_quando_o_texto_nao_traz():
    leitura = processamento.analisar(
        pdf("Anexo tecnico sem numero de processo no corpo."), "projeto",
        "SEI nº 020 00016588 2025 13 - 02___Terminal_Urbano.pdf")
    assert leitura["numero_processo"] == "020.00016588/2025-13"


def test_nome_do_projeto_sai_do_nome_do_arquivo_quando_o_pdf_nao_diz():
    """Anexo sem rótulo nenhum: sem isto o formulário abria totalmente vazio."""
    leitura = processamento.analisar(
        pdf("Planta do terminal, sem rotulos."), "projeto",
        "SEI nº 020 00016588 2025 13 - 02___Terminal_Urbano.pdf")
    assert leitura["campos_sugeridos"]["nome"] == "Terminal Urbano"


def test_rotulo_do_documento_vence_o_nome_do_arquivo():
    """O "Assunto:" do ofício descreve melhor que o nome do arquivo, e a folga
    entre os dois precisa passar de CONFIANCA_CONFLITO — senão empatam e o
    campo some em vez de escolher."""
    leitura = processamento.analisar(
        pdf("Assunto: Revitalizacao do Eixo FEPASA e Tunel Historico"), "projeto",
        "SEI nº 020 00016588 2025 13 - Oficio_GAB_579_2025___SEMIL.pdf")
    assert leitura["campos"]["nome"]["estado"] == "normalizado"
    assert leitura["campos_sugeridos"]["nome"] == "Revitalizacao do Eixo FEPASA e Tunel Historico"


ASSUNTO_QUE_QUEBRA = """Oficio n 1.145/2025
Assunto: Implantacao de Ponte sobre o Rio Paranapanema -
Interligando duas Rodovias do Estado de Sao Paulo.
Solicitacao: Contratacao de EVTEA.
"""

ASSUNTO_SEGUIDO_DE_SAUDACAO = """Assunto: Encaminha demanda da Prefeitura de Bauru
Prezados, bom dia!
Segue para protocolar e informar o numero SEI.
"""


def test_assunto_que_quebra_a_linha_e_lido_inteiro():
    """O rótulo termina em travessão e o valor segue abaixo; sem emendar, o
    nome do objeto parava em "Paranapanema -"."""
    campos = processamento.analisar(pdf(ASSUNTO_QUE_QUEBRA), "projeto")["campos_sugeridos"]
    assert campos["nome"] == (
        "Implantacao de Ponte sobre o Rio Paranapanema - "
        "Interligando duas Rodovias do Estado de Sao Paulo."
    )


def test_valor_rotulado_nao_engole_a_saudacao_seguinte():
    """Controle negativo da emenda: sem sinal de quebra, a linha de baixo é
    outra coisa."""
    campos = processamento.analisar(pdf(ASSUNTO_SEGUIDO_DE_SAUDACAO), "projeto")["campos_sugeridos"]
    assert campos["nome"] == "Encaminha demanda da Prefeitura de Bauru"


OFICIO_COM_CORPO_LONGO = """Oficio GAB n 579/2025
Excelentissima Senhora
Marina Alvares Pinto
Secretaria de Meio Ambiente, Infraestrutura e Logistica
Prezada Secretaria, o Municipio solicita apoio para a revitalizacao do eixo
ferroviario e do tunel historico, obra que resolve o alagamento cronico da
regiao central e devolve a area degradada ao uso publico da cidade inteira.
"""


def test_descricao_nao_pega_o_bloco_de_enderecamento():
    """O cabeçalho não tem ponto final, então o endereçamento inteiro virava um
    parágrafo e era descrito como se fosse o objeto."""
    campos = processamento.analisar(pdf(OFICIO_COM_CORPO_LONGO), "projeto")["campos_sugeridos"]
    assert not str(campos.get("descricao", "")).startswith("Excelentissima")
    assert "solicita apoio" in campos["descricao"]


def test_escala_abreviada_do_valor_e_reconhecida():
    """Documento real escreve "R$ 11 bi"; sem a abreviação virava onze reais."""
    assert processamento._valor_monetario("R$ 11 bi") == 11_000_000_000
    assert processamento._valor_monetario("R$ 25 mi") == 25_000_000
    # As formas por extenso continuam valendo.
    assert processamento._valor_monetario("R$ 3,2 milhões") == 3_200_000


def test_nome_de_arquivo_sem_titulo_nao_vira_nome_de_projeto():
    """Controle negativo: digitalização, canal de entrega e número solto não
    nomeiam projeto."""
    for arquivo in ("SEI nº 028 00000036 2025 60 - Xerox_Scan_06182025163457001.PDF",
                    "SEI nº 002 00005157 2025 31 - Untitled_16102025_114628.pdf",
                    "SEI nº 020 000017519 2025 19 - Oficio_n__1.145_2025.pdf",
                    "SEI nº 020 00016588 2025 13 - Email___PM_Assis.pdf"):
        assert processamento.titulo_no_nome(arquivo) is None, arquivo


def test_tipo_de_conteudo_permanece_no_nome_do_objeto():
    """"Planilha orçamentária do terminal" descreve o documento; reduzir a
    "TERMINAL" sugeria que o objeto era o terminal, e não o orçamento dele."""
    assert processamento.titulo_no_nome(
        "SEI nº 020 00016588 2025 13 - PLANILHA_ORCAMENTARIA_TERMINAL.pdf"
    ) == "PLANILHA ORCAMENTARIA TERMINAL"
    assert processamento.titulo_no_nome(
        "SEI nº 020 00007603 2025 24 - ESTUDO_CRIACAO_ZPE__PERUIBE____AENBIO.pdf"
    ).startswith("ESTUDO")


def test_palavra_do_proprio_nome_nao_corta_o_titulo():
    """"Projeto" e "criação" fazem parte do nome; cortar ali reduzia o título a
    uma palavra genérica, que era então descartada — perdendo o nome inteiro."""
    assert processamento.titulo_no_nome(
        "SEI nº 020 00016588 2025 13 - 04__Praca_Terminal_Urbano_de_Passageiros___Projeto.pdf"
    ) == "Praca Terminal Urbano de Passageiros - Projeto"
    # "Solicitacao" continua abrindo o nome, que é para o que a regra serve.
    assert processamento.titulo_no_nome(
        "SEI nº 020 000 13968 2025 98 - Oficio_Bracell_n__043___2025___Solicitacao_Porto_Presidente_Epitacio___SP.pdf"
    ) == "Solicitacao Porto Presidente Epitacio - SP"


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
    # Já entra analisado; sem OCR disponível a leitura do envio não achou nada.
    assert documento["status"] == "analisado"
    assert documento["campos_sugeridos"] == {}
    monkeypatch.setattr(processamento, "_ocr", lambda pagina: ("Assunto: Terminal intermodal", None))
    analisado = servico.analisar(documento["id"], "projeto")
    assert analisado["campos_sugeridos"]["nome"] == "Terminal intermodal"


def test_processo_do_nome_e_gravado_no_recebimento(repo):
    """A coluna Processo da tabela ficava vazia porque nada a preenchia. O
    número é propriedade do arquivo, conhecida antes de qualquer análise."""
    enviar(nome="SEI nº 020 00016588 2025 13 - 02___Terminal_Urbano.pdf",
           texto="Planta do terminal, sem rotulos internos.")
    assert repo.listar()[0]["numero_processo"] == "020.00016588/2025-13"
    assert servico.listar()[0]["numero_processo"] == "020.00016588/2025-13"


def test_lista_sem_processo_no_nome_continua_vazia(repo):
    enviar(nome="anexo_sem_processo.pdf", texto="Documento qualquer.")
    assert servico.listar()[0]["numero_processo"] is None


def test_leitura_e_gravada_junto_com_o_arquivo_no_envio(repo):
    """O envio lê o PDF e grava arquivo e leitura na mesma linha. Antes a
    leitura só existia na tela e o registro ficava vazio."""
    enviado = enviar()
    gravado = repo.obter(enviado["id"])
    assert gravado["status"] == "analisado"
    assert gravado["numero_processo"] == "1234.00456789/2026-11"
    assert gravado["campos_sugeridos"]["nome"].startswith("Duplicacao")
    # A evidência de cada campo vai junto: é o que sustenta a sugestão.
    assert gravado["evidencias"]["valor_global"]
    assert gravado["analise"]["resumo"]["desfecho"] in {"sucesso", "ressalvas"}


def test_reanalise_le_o_pdf_de_novo_com_outro_tipo(repo):
    enviado = enviar()
    assert servico.analisar(enviado["id"], "projeto")["tipo_demanda"] == "projeto"
    assert servico.analisar(enviado["id"], "plano")["tipo_demanda"] == "plano"
    # O registro segue a última análise, leitura inclusive: reanalisar substitui
    # o que estava gravado, em vez de acumular duas leituras divergentes.
    gravado = repo.obter(enviado["id"])
    assert gravado["tipo_demanda"] == "plano"
    assert gravado["analise"]["tipo_demanda"] == "plano"
    assert gravado["campos_sugeridos"]


def test_identificador_invalido_nao_chega_ao_banco(repo):
    with pytest.raises(DemandaValidationError):
        servico.obter("nao-e-uuid")


def test_documento_inexistente(repo):
    with pytest.raises(DemandaNotFoundError):
        servico.obter(str(uuid4()))


def aguardar_job(client, job, limite=30.0):
    """Consulta o job da leitura até ele terminar, como a página faz."""
    import time

    fim = time.monotonic() + limite
    while job["status"] == "executando" and time.monotonic() < fim:
        time.sleep(0.05)
        job = client.get(f"/sei/documentos/jobs/{job['id']}").json()
    return job


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
    assert resposta.status_code == 202
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "concluido", job
    corpo = job["resultado"]
    assert len(corpo["recebidos"]) == 1
    assert corpo["erros"][0]["arquivo"] == "planilha.xlsx"
    mensagens = [log["mensagem"] for log in job["logs"]]
    assert any(m.startswith("planilha.xlsx: recusado") for m in mensagens)


def test_job_de_leitura_relata_paginas_e_campos_em_ordem(repo, monkeypatch):
    """Cada passo real do extrator vira uma linha que a página mostra."""
    client = aplicacao(repo, monkeypatch)
    resposta = client.post("/sei/documentos", files=[("arquivos", ("oficio.pdf", pdf(OFICIO), "application/pdf"))])
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "concluido", job
    mensagens = [log["mensagem"] for log in job["logs"]]
    assert mensagens[0] == "Arquivo 1 de 1: oficio.pdf"
    assert "PDF aberto: 1 página(s)" in mensagens
    assert any(m.startswith("Página 1: texto nativo") for m in mensagens)
    assert any(m.startswith("Número do processo: 1234.00456789/2026-11") for m in mensagens)
    assert mensagens[-1] == "oficio.pdf: arquivo e leitura gravados no repositório"


def test_job_com_todos_recusados_termina_em_erro_422(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    resposta = client.post("/sei/documentos", files=[("arquivos", ("a.xlsx", b"PK\x03\x04", "application/vnd.ms-excel"))])
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "erro" and job["erro_status"] == 422


def test_envio_devolve_a_leitura_ja_gravada(repo, monkeypatch):
    """O formulário é preenchido com o que voltou do envio; não há segunda
    chamada de análise no caminho do Enviar."""
    client = aplicacao(repo, monkeypatch)
    resposta = client.post("/sei/documentos", data={"tipo_demanda": "projeto"}, files=[
        ("arquivos", ("SEI nº 020 00016588 2025 13 - oficio.pdf", pdf(OFICIO), "application/pdf")),
    ])
    assert resposta.status_code == 202
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "concluido", job
    documento = job["resultado"]["recebidos"][0]
    assert documento["status"] == "analisado"
    assert documento["numero_processo"] == "020.00016588/2025-13"
    assert documento["campos_sugeridos"]["nome"].startswith("Duplicacao")
    assert documento["evidencias"]["valor_global"]
    assert documento["analise"]["resumo"]["desfecho"] in {"sucesso", "ressalvas"}


def test_pdf_ilegivel_e_recusado_sem_derrubar_o_lote(repo, monkeypatch):
    """PDF corrompido levanta erro do pymupdf, não ValueError. Sem tratar isso,
    ler no envio transformava o lote inteiro em 500 em vez de recusar o arquivo."""
    client = aplicacao(repo, monkeypatch)
    resposta = client.post("/sei/documentos", data={"tipo_demanda": "projeto"}, files=[
        ("arquivos", ("bom.pdf", pdf(OFICIO), "application/pdf")),
        ("arquivos", ("corrompido.pdf", b"%PDF-lixo que nao abre", "application/pdf")),
    ])
    assert resposta.status_code == 202
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "concluido", job
    assert [e["arquivo"] for e in job["resultado"]["erros"]] == ["corrompido.pdf"]
    # O recusado não deixa registro: a leitura vem antes do INSERT.
    assert len(repo.registros) == 1


def test_rota_de_analise_recebe_tipo(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = enviar()
    resposta = client.post(f"/sei/documentos/{documento['id']}/analisar", json={"tipo_demanda": "plano"})
    assert resposta.status_code == 202
    job = aguardar_job(client, resposta.json())
    assert job["status"] == "concluido", job
    assert job["resultado"]["tipo_demanda"] == "plano"


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
