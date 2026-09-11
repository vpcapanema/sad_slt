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
from api.services import sei_documentos_service as servico
from api.services import sei_extracao_campos as extracao

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
            "evidencias": {}, "demanda_id": None, "criado_em": "2026-09-11T10:00:00-03:00",
            "atualizado_em": "2026-09-11T10:00:00-03:00", **campos,
        }
        self.registros[registro["id"]] = registro
        return registro

    def salvar_analise(self, *, documento_id, status, numero_processo, campos_sugeridos, evidencias):
        registro = self.registros.get(str(documento_id))
        if not registro:
            return None
        registro.update(status=status, numero_processo=numero_processo,
                        campos_sugeridos=campos_sugeridos, evidencias=evidencias)
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


def test_extracao_le_os_campos_rotulados():
    leitura = extracao.extrair_campos(OFICIO)
    campos = leitura["campos"]
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
    assert leitura["ausentes"] == []


def test_campo_sem_regra_fica_ausente_e_nao_recebe_zero():
    leitura = extracao.extrair_campos("Oficio sem rotulos reconheciveis.")
    assert "lat" not in leitura["campos"]
    assert "valor_global" not in leitura["campos"]
    assert "lat" in leitura["ausentes"] and "valor_global" in leitura["ausentes"]
    assert leitura["numero_processo"] is None


def test_coordenada_fora_de_faixa_e_descartada():
    leitura = extracao.extrair_campos("Latitude: -991,5\nLongitude: -50,4")
    assert "lat" not in leitura["campos"]
    assert leitura["campos"]["lng"] == pytest.approx(-50.4)


def test_coordenada_em_grau_minuto_segundo():
    leitura = extracao.extrair_campos("Latitude: 21°12'32\"S\nLongitude: 50°25'58\"O")
    assert leitura["campos"]["lat"] == pytest.approx(-21.2089, abs=1e-3)
    assert leitura["campos"]["lng"] == pytest.approx(-50.4328, abs=1e-3)


def test_cada_campo_sugerido_tem_trecho_de_origem():
    leitura = extracao.extrair_campos(OFICIO)
    assert set(leitura["campos"]) - {"descricao"} <= set(leitura["evidencias"])
    assert "R$ 12.450.000,00" in leitura["evidencias"]["valor_global"]


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


def test_pdf_sem_texto_nao_sugere_campos(repo):
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pagina = canvas.Canvas(buffer)
    pagina.rect(40, 40, 200, 200, fill=0)
    pagina.save()
    documento = servico.receber(conteudo=buffer.getvalue(), nome_arquivo="digitalizado.pdf",
                                usuario_id=str(uuid4()), usuario_nome="Analista")
    assert documento["status"] == "sem_texto"
    assert documento["aviso"]
    with pytest.raises(DemandaValidationError):
        servico.analisar(documento["id"])


def test_analise_guarda_campos_e_numero_do_processo(repo):
    documento = servico.analisar(enviar()["id"])
    assert documento["status"] == "analisado"
    assert documento["numero_processo"] == "1234.00456789/2026-11"
    assert documento["campos_sugeridos"]["nome"].startswith("Duplicacao")


def test_lote_ignora_o_que_nao_pode_ser_lido(repo):
    enviar()
    enviar(nome="outro.pdf", texto="Oficio sem numero de processo mas com texto.")
    resultado = servico.analisar_pendentes()
    assert len(resultado["analisados"]) == 2
    assert servico.analisar_pendentes()["analisados"] == []


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


def test_lote_acima_do_limite_de_corpo_tem_erro_proprio(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    volumoso = b"%PDF-" + b"0" * (servico.LIMITE_BYTES - 5)
    arquivos = [("arquivos", (f"parte{i}.pdf", volumoso, "application/pdf")) for i in range(4)]
    resposta = client.post("/sei/documentos", files=arquivos)
    assert resposta.status_code == 413
    assert "60 MB" in resposta.json()["detail"]


def test_envio_exige_sessao():
    app = FastAPI()
    app.include_router(rotas.router)
    resposta = TestClient(app).post("/sei/documentos", files=[("arquivos", ("a.pdf", b"%PDF-1.4", "application/pdf"))])
    assert resposta.status_code == 401


def test_criacao_valida_payload_e_nao_duplica(repo, monkeypatch):
    client = aplicacao(repo, monkeypatch)
    documento = servico.analisar(enviar()["id"])
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
    documento = servico.analisar(enviar(nome="solicitacao.pdf", texto="Oficio sem numero de processo.")["id"])
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
