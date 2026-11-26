from contextlib import nullcontext
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.exceptions import DemandaValidationError
from api.schemas.email import (
    DivulgacaoEmailEnvioSchema, EmailEnvioResultado, ExclusaoDestinatariosDivulgacaoSchema,
    ListaDivulgacaoSchema, MensagemDivulgacaoSchema, SalvamentoListaDivulgacaoSchema,
)
from api.server import app
from api.services import divulgacao_ahp


@pytest.fixture
def rodada(monkeypatch):
    ambiente = {
        "token": "link-da-rodada", "modo_participacao": "publico", "status": "ativa",
        "atualizado_em": datetime.now(timezone.utc), "matriz_integral": True,
        "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}],
    }
    contatos = {}
    mensagens_salvas = {}
    registros = []
    mensagens = []
    ambiente["inscricoes_teste"] = []
    monkeypatch.setattr(divulgacao_ahp, "atomic_connection", lambda: nullcontext(None))
    monkeypatch.setattr(divulgacao_ahp.ambientes, "get_ambiente_by_id", lambda *args, **kwargs: ambiente)
    monkeypatch.setattr(divulgacao_ahp.ambientes, "list_inscricoes", lambda _: ambiente["inscricoes_teste"])

    def adicionar(_conn, _ident, lista):
        inscritos = {item["email"].lower() for item in ambiente["inscricoes_teste"]}
        resultado = {"adicionados": 0, "ja_inscritos": [], "ja_convidados": []}
        for email, (nome, instituicao) in lista.items():
            if email in inscritos:
                resultado["ja_inscritos"].append(email)
            elif email in contatos:
                resultado["ja_convidados"].append(email)
            else:
                contatos[email] = {"email": email, "nome": nome, "inscrito_em": None, "instituicao": instituicao}
                resultado["adicionados"] += 1
        return resultado

    monkeypatch.setattr(divulgacao_ahp.destinatarios, "adicionar", adicionar)
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "bloquear_lista", lambda *_: None)
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "listar_catalogo", lambda: [])
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "listar", lambda ident, email=None: [
        contato for contato in contatos.values() if email is None or contato["email"] == email
    ])
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "obter_mensagem", mensagens_salvas.get)

    def salvar_mensagem(conn, ident, assunto, texto):
        mensagens_salvas[ident] = {"assunto": assunto, "texto": texto}
        return mensagens_salvas[ident]

    monkeypatch.setattr(divulgacao_ahp.destinatarios, "salvar_mensagem", salvar_mensagem)
    monkeypatch.setattr(divulgacao_ahp.emails, "bloquear_envio", lambda *args: None)
    monkeypatch.setattr(divulgacao_ahp.emails, "listar", lambda ident, *, natureza, destinatario=None: [
        registro for registro in registros if destinatario is None or registro["destinatario"] == destinatario
    ])

    def reservar(ident, email, resumo, mensagem_id, usuario, versao, *, natureza):
        item = dict(id=str(uuid4()), destinatario=email, conteudo_hash=resumo, mensagem_id=mensagem_id,
                    natureza=natureza, envio_status="enviando", entrega_status="sem_confirmacao", leitura_status="sem_confirmacao")
        registros.append(item)
        return item, True

    def finalizar(ident, status, detalhe, **kwargs):
        registro = next(item for item in registros if item["id"] == ident)
        registro.update(envio_status=status, detalhe=detalhe)
        return registro

    def smtp(mensagem, *, id_mensagem, solicitar_confirmacoes, usuario_id):
        mensagens.append(mensagem)
        assert solicitar_confirmacoes is True
        return EmailEnvioResultado(id_mensagem=id_mensagem, destinatario=mensagem.destinatario)

    monkeypatch.setattr(divulgacao_ahp.emails, "reservar", reservar)
    monkeypatch.setattr(divulgacao_ahp.emails, "finalizar", finalizar)
    monkeypatch.setattr(divulgacao_ahp.email_service, "_config", lambda: SimpleNamespace(remetente="sicard@example.org"))
    monkeypatch.setattr(divulgacao_ahp.email_service, "enviar", smtp)
    monkeypatch.setattr(divulgacao_ahp.ambientes, "insert_inscricao", lambda *args: pytest.fail("Divulgar não inscreve."))
    return ambiente, contatos, mensagens


def test_divulgacao_consulta_inscritos_mesmo_sem_convite_e_ignora_duplicatas(rodada):
    ambiente, contatos, _ = rodada
    ambiente["inscricoes_teste"] = [{"email": "Direto@example.org"}]
    divulgacao_ahp.adicionar("rodada", ListaDivulgacaoSchema(destinatarios=[{"nome": "Ana", "destinatario": "ana@example.org"}]))
    resultado = divulgacao_ahp.adicionar("rodada", ListaDivulgacaoSchema(destinatarios=[
        {"nome": "Já inscrito", "destinatario": "DIRETO@EXAMPLE.ORG"},
        {"nome": "Nome alternativo", "destinatario": "ANA@example.org"},
        {"nome": "Nova convidada", "destinatario": "bia@example.org"},
    ]))
    assert resultado == {"adicionados": 1, "ja_inscritos": ["direto@example.org"], "ja_convidados": ["ana@example.org"]}
    assert set(contatos) == {"ana@example.org", "bia@example.org"}
    assert contatos["ana@example.org"]["nome"] == "Ana"
    assert divulgacao_ahp.listar("rodada")["emails_inscritos"] == ["direto@example.org"]


def test_divulgacao_envia_link_comum_e_mantem_historico_separado(rodada):
    _, contatos, mensagens = rodada
    base = "https://sicard.example.org/sicard"
    dados = DivulgacaoEmailEnvioSchema(destinatario="ana@example.org", assunto="Convite", texto="Participe <hoje>", operacao_id=uuid4())
    with pytest.raises(DemandaValidationError, match="Confirme este contato"):
        divulgacao_ahp.enviar("rodada", dados, "gestor", base_url=base)

    divulgacao_ahp.adicionar("rodada", ListaDivulgacaoSchema(destinatarios=[{"nome": "Ana", "destinatario": "ANA@example.org"}]))
    assert divulgacao_ahp.listar("rodada")["registros"] == []
    assert contatos["ana@example.org"]["inscrito_em"] is None
    primeiro = divulgacao_ahp.enviar("rodada", dados, "gestor", base_url=base)
    assert divulgacao_ahp.enviar("rodada", dados, "gestor", base_url=base)["id"] == primeiro["id"]
    with pytest.raises(DemandaValidationError, match="Reenviar"):
        divulgacao_ahp.enviar("rodada", dados.model_copy(update={"operacao_id": uuid4()}), "gestor", base_url=base)
    reenvio = dados.model_copy(update={"operacao_id": uuid4(), "reenvio": True})
    divulgacao_ahp.enviar("rodada", reenvio, "gestor", base_url=base)
    assert len(mensagens) == 2
    link = base + "/public/analise-multicriterio/participar/link-da-rodada/"
    assert all(m.texto.endswith(link) and f'href="{link}"' in m.html for m in mensagens)
    assert all("chave" not in m.texto.lower() and "Participe &lt;hoje&gt;" in m.html for m in mensagens)
    assert all(item["natureza"] == "divulgacao" for item in divulgacao_ahp.listar("rodada")["registros"])
    contatos["ana@example.org"]["inscrito_em"] = datetime.now(timezone.utc)
    with pytest.raises(DemandaValidationError, match="já está inscrito"):
        divulgacao_ahp.enviar("rodada", reenvio.model_copy(update={"operacao_id": uuid4()}), "gestor", base_url=base)


def test_divulgacao_recusa_modo_convite_e_requer_sessao(rodada):
    ambiente, _, _ = rodada
    ambiente["modo_participacao"] = "convite"
    with pytest.raises(DemandaValidationError, match="link público"):
        divulgacao_ahp.listar("rodada")
    resposta = TestClient(app).get(f"/api/ahp/comparacao-colaborativa/ambientes/{uuid4()}/emails/divulgacao")
    assert resposta.status_code == 401


def test_rodada_existente_permite_preparar_divulgacao_e_enviar_edicao_atual(rodada):
    ambiente, contatos, mensagens = rodada
    ambiente.update(status="encerrada", criado_em=datetime(2025, 1, 1, tzinfo=timezone.utc))
    ambiente_id = "rodada-existente"
    base = "https://sicard.example.org"
    texto_salvo = "  Olá, equipe!\n\nSegue o convite.\n"
    assunto = "Consulta aos especialistas"
    divulgacao_ahp.adicionar(ambiente_id, ListaDivulgacaoSchema(destinatarios=[{"nome": "Ana", "destinatario": "ana@example.org"}]))
    divulgacao_ahp.salvar_mensagem(ambiente_id, MensagemDivulgacaoSchema(assunto=assunto, texto=texto_salvo))
    assert divulgacao_ahp.listar(ambiente_id)["mensagem"] == {"assunto": assunto, "texto": texto_salvo}
    assert contatos["ana@example.org"]["inscrito_em"] is None

    texto_enviado = "  Oi, pessoal.\n\nMensagem revisada & pronta.\n "
    dados = DivulgacaoEmailEnvioSchema(destinatario="ana@example.org", assunto=assunto, texto=texto_enviado, operacao_id=uuid4())
    with pytest.raises(DemandaValidationError, match="não está mais ativo"):
        divulgacao_ahp.enviar(ambiente_id, dados, "gestor", base_url=base)
    assert not mensagens

    ambiente["status"] = "ativa"
    divulgacao_ahp.enviar(ambiente_id, dados, "gestor", base_url=base)
    assert mensagens[0].assunto == assunto
    assert mensagens[0].texto == texto_enviado + "\n\nInscrição pública no SICARD\n" + base + "/public/analise-multicriterio/participar/link-da-rodada/"
    assert "  Oi, pessoal.<br><br>Mensagem revisada &amp; pronta.<br> " in mensagens[0].html


def test_listas_existentes_podem_ser_consultadas_para_previa_sem_incluir_contatos(monkeypatch, rodada):
    atual, contatos, _ = rodada
    ambientes = {
        "atual": atual,
        "convite": {"id": "convite", "nome": "Rodada por convite", "modo_participacao": "convite",
                    "convites": [{"nome": "Ana", "email": "ANA@example.org"}]},
        "publico": {"id": "publico", "nome": "Rodada pública", "modo_participacao": "publico"},
    }
    monkeypatch.setattr(divulgacao_ahp.ambientes, "get_ambiente_by_id", lambda ident, **kwargs: ambientes.get(ident))
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "origens", lambda _: [ambientes["convite"], ambientes["publico"]])
    monkeypatch.setattr(divulgacao_ahp.destinatarios, "listar", lambda ident: [{"nome": "Bia", "email": "bia@example.org"}])

    assert [item["id"] for item in divulgacao_ahp.listas_existentes("atual")["listas"]] == ["convite", "publico"]
    assert divulgacao_ahp.listas_existentes("atual", "convite")["destinatarios"] == [{"nome": "Ana", "email": "ana@example.org"}]
    assert divulgacao_ahp.listas_existentes("atual", "publico")["destinatarios"] == [{"nome": "Bia", "email": "bia@example.org"}]
    assert contatos == {}


def test_salvar_rascunho_e_catalogo_reutiliza_convidados_validos(monkeypatch, rodada):
    ambiente, contatos, mensagens = rodada
    ambiente["inscricoes_teste"] = [{"email": "inscrito@example.org"}]
    contatos.update({
        "caio@example.org": {"nome": "Caio", "email": "caio@example.org"},
        "ana@example.org": {"nome": "Ana", "email": "ana@example.org"},
    })
    repo = divulgacao_ahp.destinatarios
    listas = {}
    lista_id = uuid4()

    def gravar(_conn, _ambiente, alterados):
        for email, (nome, instituicao, informada) in alterados.items():
            if email != "inscrito@example.org":
                contato = contatos.get(email, {"email": email})
                contatos[email] = {**contato, "nome": nome, **({"instituicao": instituicao} if informada else {})}

    def salvar_lista(_conn, pessoas, *, nome, ident):
        lista = listas.setdefault(str(ident or lista_id), {"id": lista_id, "nome": nome})
        lista["destinatarios"] = pessoas
        return {"id": lista["id"], "nome": lista["nome"]}

    monkeypatch.setattr(repo, "excluir", lambda _conn, _ambiente, emails: sum(contatos.pop(email, None) is not None for email in emails))
    monkeypatch.setattr(repo, "gravar_contatos", gravar)
    monkeypatch.setattr(repo, "salvar_lista", salvar_lista)
    monkeypatch.setattr(repo, "obter_lista", listas.get)
    salvo = divulgacao_ahp.salvar_destinatarios("rodada", SalvamentoListaDivulgacaoSchema(
        removidos=["caio@example.org"], nova_lista="Equipe",
        alterados=[{"nome": "Ana Lima", "destinatario": "ANA@example.org", "instituicao": "Instituto Alfa"},
                   {"nome": "Inscrito", "destinatario": "inscrito@example.org"}],
    ))
    assert salvo["ja_inscritos"] == ["inscrito@example.org"]
    assert salvo["lista"]["id"] == lista_id
    assert salvo["destinatarios"] == [{"email": "ana@example.org", "nome": "Ana Lima", "instituicao": "Instituto Alfa"}]
    assert divulgacao_ahp.listas_existentes("rodada", str(lista_id), catalogo=True)["destinatarios"] == salvo["destinatarios"]
    atualizado = divulgacao_ahp.salvar_destinatarios("rodada", SalvamentoListaDivulgacaoSchema(
        removidos=["ana@example.org"], lista_id=lista_id,
        alterados=[{"nome": "Bia", "destinatario": "bia@example.org"}],
    ))
    assert atualizado["lista"]["nome"] == "Equipe"
    assert atualizado["destinatarios"] == [{"email": "bia@example.org", "nome": "Bia"}]
    assert mensagens == []


def test_excluir_selecionados_remove_contatos_e_mantem_o_historico(monkeypatch, rodada):
    _, contatos, mensagens = rodada
    divulgacao_ahp.adicionar("rodada", ListaDivulgacaoSchema(destinatarios=[
        {"nome": "Ana", "destinatario": "ana@example.org"},
        {"nome": "Bia", "destinatario": "bia@example.org"},
    ]))
    envio = DivulgacaoEmailEnvioSchema(destinatario="ana@example.org", assunto="Convite", texto="Participe", operacao_id=uuid4())
    primeiro = divulgacao_ahp.enviar("rodada", envio, "gestor", base_url="https://sicard.example.org")
    travas = []
    monkeypatch.setattr(divulgacao_ahp.emails, "bloquear_envio", lambda conn, ident, email, natureza: travas.append((ident, email, natureza)))

    def excluir(conn, ident, selecionados):
        assert ident == "rodada"
        return sum(contatos.pop(email, None) is not None for email in selecionados)

    monkeypatch.setattr(divulgacao_ahp.destinatarios, "excluir", excluir)
    selecionados = ExclusaoDestinatariosDivulgacaoSchema(destinatarios=["ANA@example.org", "ana@example.org"])
    assert divulgacao_ahp.excluir("rodada", selecionados) == 1
    assert travas == [("rodada", "ana@example.org", "divulgacao")]
    atual = divulgacao_ahp.listar("rodada")
    assert [item["email"] for item in atual["destinatarios"]] == ["bia@example.org"]
    assert [item["id"] for item in atual["registros"]] == [primeiro["id"]]
    with pytest.raises(DemandaValidationError, match="Confirme este contato"):
        divulgacao_ahp.enviar("rodada", envio.model_copy(update={"operacao_id": uuid4(), "reenvio": True}), "gestor", base_url="https://sicard.example.org")
    assert len(mensagens) == 1
