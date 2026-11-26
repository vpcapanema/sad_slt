from base64 import urlsafe_b64encode
from contextlib import nullcontext
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.config import EmailSettings
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import email_convites_repository as repo
from api.routers.email_convites import router
from api.schemas.email import ConviteEmailEnvioSchema, EmailEnvioResultado
from api.services import email_confirmacoes as recibos, email_convites as service, email_service
from api.services.session_service import SessionUser, create_token

MID = "<sicard.teste@example.com>"
DEST = "destino@example.com"


@pytest.fixture
def ambiente(monkeypatch):
    monkeypatch.setenv("SICARD_CONVITE_ENVELOPE_KEY", urlsafe_b64encode(bytes(32)).decode().rstrip("="))
    monkeypatch.setattr(service.secrets, "token_urlsafe", lambda _: "A" * 43)
    registros_individuais = {}

    def obter(ambiente_id, email, _versao):
        return registros_individuais.get((ambiente_id, email))

    def registrar(ambiente_id, email, _versao, segredo_hash, envelope):
        return registros_individuais.setdefault((ambiente_id, email), {
            "segredo_hash": segredo_hash, "envelope_cifrado": envelope,
            "revogado_em": None,
        })

    monkeypatch.setattr(service.convite_individual_repository, "obter", obter)
    monkeypatch.setattr(service.convite_individual_repository, "registrar", registrar)
    row = {
        "id": str(uuid4()), "atualizado_em": datetime.now(timezone.utc),
        "status": "ativa", "valido_ate": datetime.now(timezone.utc) + timedelta(days=2),
        "convites": [{"email": DEST}], "token": "token-teste", "token_acesso": "012345",
        "criterios": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}],
        "email_remetente_alias": "SICARD-PLI",
        "email_assunto": "Convite para preenchimento colaborativo AHP - PLI - SICARD",
        "email_mensagem": "Olá, colaborador(a)!\nhttps://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-teste/\nEquipe SICARD-PLI",
    }
    monkeypatch.setattr(service.ambientes, "get_ambiente_by_id", lambda _, **kwargs: row)
    return row


@pytest.fixture
def smtp(monkeypatch):
    config = EmailSettings.model_validate({
        "habilitado": True, "host": "smtp.example.com", "usuario": "usuario",
        "senha": "senha-sintetica", "remetente": "sicard@example.com",
        "imap_habilitado": True, "imap_host": "imap.example.com",
    })
    monkeypatch.setattr(email_service, "_config", lambda **_: config)
    monkeypatch.setattr(recibos, "_config", lambda **_: config)
    envio = MagicMock(return_value=EmailEnvioResultado(
        id_mensagem=MID, destinatario=DEST, confirmacao_leitura_solicitada=True,
    ))
    monkeypatch.setattr(email_service, "enviar", envio)
    return envio


@pytest.fixture
def registros(monkeypatch):
    rows = []
    def reservar(ambiente_id, destinatario, resumo, mensagem_id, usuario_id, versao):
        if rows:
            return rows[0], False
        row = dict(id=str(uuid4()), ambiente_id=ambiente_id, destinatario=destinatario,
                   mensagem_id=mensagem_id, conteudo_hash=resumo, envio_status="enviando",
                   eventos=[], entrega_status="sem_confirmacao", leitura_status="sem_confirmacao")
        rows.append(row)
        return row, True
    def finalizar(ident, status, detalhe, *, dsn=False, leitura=False):
        rows[0].update(envio_status=status, detalhe=detalhe, dsn_solicitada=dsn, leitura_solicitada=leitura)
        return rows[0]
    monkeypatch.setattr(repo, "reservar", reservar)
    monkeypatch.setattr(repo, "finalizar", finalizar)
    monkeypatch.setattr(repo, "listar", lambda _: rows)
    return rows


def payload(ambiente, **extras):
    return ConviteEmailEnvioSchema.model_validate({
        "destinatario": DEST, "versao": ambiente["atualizado_em"], **extras,
    })


def test_convite_preserva_mensagem_persistida_sem_recompor_por_dimensao(ambiente, smtp, registros):
    ambiente["convites"] = [{"email": DEST, "nome": "Ana", "dimensoes": ["Social"]}]
    ambiente["criterios"] = [{"criterio": "Custo", "dimensao": "Financeira", "Etapa": "Fase 3"},
                            {"criterio": "Acesso", "dimensao": "Social", "Etapa": "Fase 3"},
                            {"criterio": "Equidade", "dimensao": "Social", "Etapa": "Fase 3"}]
    ambiente["email_mensagem"] += "\nTexto editado pelo usuário."
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    texto = smtp.call_args.args[0].texto
    assert "Texto editado pelo usuário." in texto
    assert "Acesso" not in texto and "Equidade" not in texto and "Financeira" not in texto
    assert "https://example.com/sicard/public/" in texto
    assert "A" * 43 in texto and "012345" not in texto


def test_preserva_texto_acrescenta_token_e_nao_repete_apos_recarga(ambiente, smtp, registros):
    dados = payload(ambiente)
    result = service.enviar(ambiente["id"], dados, "analista")
    assert result["envio_status"] == "aceito_smtp"
    texto = smtp.call_args.args[0].texto
    html = smtp.call_args.args[0].html
    fragmento = "#acesso=" + "A" * 43
    rastreio = "/token-teste/?c=" + service.codigo_link("token-teste", DEST)
    assert texto == ambiente["email_mensagem"].replace("/token-teste/\n", rastreio + fragmento + "\n")
    assert "Chave individual do convite" not in texto and "Chave individual do convite" not in html
    assert "Acessar formulário" in html
    assert rastreio + fragmento in html
    assert "copiar-chave" not in html
    assert "/token-teste/?c=" + service.codigo_link("token-teste", DEST) in html
    assert ">https://example.com/" not in html
    assert registros[0]["conteudo_hash"] == sha256(("SICARD-PLI\n" + service.ASSUNTO + "\n" + texto.replace(fragmento, "")).encode()).hexdigest()
    assert smtp.call_args.kwargs["solicitar_confirmacoes"] is True
    assert smtp.call_args.kwargs["id_mensagem"] == registros[0]["mensagem_id"]
    assert "sicard." in registros[0]["mensagem_id"]
    assert service.enviar(ambiente["id"], dados, "analista")["reutilizado"] is True
    smtp.assert_called_once()


def test_convite_usa_assunto_institucional_pli_sicard(ambiente, smtp, registros):
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    assert smtp.call_args.args[0].assunto == "Convite para preenchimento colaborativo AHP - PLI - SICARD"
    assert smtp.call_args.args[0].alias_remetente == "SICARD-PLI"


def test_convite_usa_alias_assunto_e_mensagem_editados(ambiente, smtp, registros):
    ambiente.update(email_remetente_alias="Equipe PLI", email_assunto="Assunto editado")
    ambiente["email_mensagem"] = ambiente["email_mensagem"].replace("Olá, colaborador(a)!", "Mensagem editada exatamente aqui.")
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    enviado = smtp.call_args.args[0]
    assert enviado.alias_remetente == "Equipe PLI"
    assert enviado.assunto == "Assunto editado"
    assert enviado.texto.startswith("Mensagem editada exatamente aqui.")


@pytest.mark.parametrize("legado", [False, True])
def test_convite_padrao_apresenta_o_pli_e_separa_as_orientacoes_do_acesso(ambiente, smtp, registros, legado):
    from api.services import comparacao_colaborativa_service as julgamentos

    base = "https://example.com/sicard"
    ambiente.update(
        matriz_nome="Matriz_Criterios_Premissas_PLI-SP_2050_D1-D7",
        convites=[{"email": DEST, "nome": "Ana Silva", "dimensoes": ["Capacidade de entrega"]}],
        criterios=[
            {"Critério": "D1 · Eficiência logística", "Dimensão": "Mérito e resultados", "Etapa": "Fase 3"},
            {"Critério": "D6 · Viabilidade institucional e financeira", "Dimensão": "Capacidade de entrega", "Etapa": "Fase 3"},
            {"Critério": "D7 · Riscos", "Dimensão": "Capacidade de entrega", "Etapa": "Fase 3"},
        ],
    )
    ambiente["email_mensagem"] = (
        julgamentos._mensagem_email_legada(ambiente, julgamentos._link_publico(ambiente, base_url=base), "22/11/2026", None)
        if legado else julgamentos._mensagem_email_padrao(ambiente, base_url=base)
    )
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    enviado = smtp.call_args.args[0]
    assert enviado.texto.split("\n\n")[1].startswith("O PLI-SP 2050 orienta o planejamento")
    ordem = [enviado.texto.index(trecho) for trecho in (
        "desenvolvemos uma ferramenta de apoio à tomada de decisão",
        "Método de Análise Hierárquica (AHP)", "Gostaríamos de contar com sua contribuição",
        "Orientações para preenchimento", "O formulário está organizado em cartões",
        "mova a régua para qualquer lado", "Prazo para resposta e acesso ao formulário",
        julgamentos._link_publico(ambiente, base_url=base), "Agradecemos seu tempo",
    )]
    assert ordem == sorted(ordem)
    assert "D6 · Viabilidade" not in enviado.texto
    assert enviado.texto.startswith("Olá, Ana Silva!")
    assert "22/11/2026" not in enviado.texto
    assert "horário de Brasília" in enviado.html


@pytest.mark.parametrize(("nome", "cumprimento"), [
    ("Ana", "Olá, Ana!"),
    ("Maria Clara Souza", "Olá, Maria Clara!"),
    (None, "Olá, colaborador(a)!"),
])
def test_convite_personaliza_cumprimento_com_ate_dois_nomes(
    ambiente, smtp, registros, nome, cumprimento,
):
    ambiente["convites"] = [{"email": DEST, "nome": nome}]
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    enviado = smtp.call_args.args[0]
    assert enviado.texto.startswith(cumprimento)
    assert cumprimento in enviado.html


def test_convite_substitui_assinatura_antiga_antes_do_envio(ambiente, smtp, registros):
    ambiente["email_mensagem"] = ambiente["email_mensagem"].replace(
        "Equipe SICARD-PLI", "Equipe SICARD/SLT",
    )
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    texto = smtp.call_args.args[0].texto
    assert "Equipe SICARD-PLI" in texto
    assert "Equipe SICARD/SLT" not in texto
    assert "Equipe SICARD-PLI" in smtp.call_args.args[0].html


def test_reenvio_explicito_preserva_historico_e_idempotencia(ambiente, smtp, monkeypatch):
    rows = {}
    def reservar(ambiente_id, destinatario, resumo, mensagem_id, usuario_id, versao):
        if resumo in rows:
            return rows[resumo], False
        row = dict(id=str(uuid4()), conteudo_hash=resumo, mensagem_id=mensagem_id)
        rows[resumo] = row
        return row, True
    def finalizar(ident, status, detalhe, **kwargs):
        row = next(r for r in rows.values() if r['id'] == ident)
        row['envio_status'] = status
        return row
    monkeypatch.setattr(repo, 'reservar', reservar)
    monkeypatch.setattr(repo, 'finalizar', finalizar)
    original = service.enviar(ambiente['id'], payload(ambiente), 'analista')
    ambiente["email_assunto"] = "Assunto novo que não vale para reenvio"
    ambiente["email_remetente_alias"] = "Remetente novo"
    ambiente["email_mensagem"] = ""
    prazo = ambiente["valido_ate"]
    resend = payload(ambiente, reenvio_id=str(uuid4()))
    novo = service.enviar(ambiente['id'], resend, 'analista')
    assert original['id'] != novo['id']
    assert ambiente["valido_ate"] == prazo
    assert len(rows) == 2
    assert service.enviar(ambiente['id'], resend, 'analista')['reutilizado']
    assert smtp.call_count == 2
    assert smtp.call_args_list[0].args[0] == smtp.call_args_list[1].args[0]


def test_convite_com_link_antigo_continua_valido(ambiente, smtp, registros):
    ambiente["email_mensagem"] = "https://example.com/sicard/public/analise-multicriterio/token-teste/"
    assert service.enviar(ambiente["id"], payload(ambiente), "analista")["envio_status"] == "aceito_smtp"
    smtp.assert_called_once()


@pytest.mark.parametrize("extras", [{}, {"reenvio_id": uuid4()}, {"somente_nao_enviado": True}])
def test_legado_hash_only_preserva_chave_sem_enviar(ambiente, smtp, registros, monkeypatch, extras):
    original = {"segredo_hash": sha256(("A" * 43).encode()).hexdigest(),
                "envelope_cifrado": None, "revogado_em": None}
    monkeypatch.setattr(service.convite_individual_repository, "obter", MagicMock(return_value=original))
    registrar = MagicMock()
    monkeypatch.setattr(service.convite_individual_repository, "registrar", registrar)
    with pytest.raises(DemandaValidationError, match="Convite antigo"):
        service.enviar(ambiente["id"], payload(ambiente, **extras), "analista")
    registrar.assert_not_called()
    smtp.assert_not_called()
    assert not registros


@pytest.mark.parametrize("alteracao", ["revogado", "corrompido", "outro_destinatario", "hash_incompativel"])
def test_nao_reenvia_envelope_invalido(ambiente, smtp, registros, monkeypatch, alteracao):
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    row = service.convite_individual_repository.obter(ambiente["id"], DEST, ambiente["atualizado_em"])
    if alteracao == "revogado":
        row["revogado_em"] = datetime.now(timezone.utc)
    elif alteracao == "corrompido":
        row["envelope_cifrado"] = row["envelope_cifrado"][:-1]
    elif alteracao == "outro_destinatario":
        outro = "outra@example.com"
        mensagem = service._preparar_convite(ambiente, ambiente["convites"][0], outro, "A" * 43)
        row["envelope_cifrado"] = service.convite_envelope.cifrar(ambiente["id"], outro, mensagem)
    else:
        row["segredo_hash"] = "0" * 64
    with pytest.raises(DemandaValidationError, match="foi revogado|recuperar a mensagem original"):
        service.enviar(ambiente["id"], payload(ambiente, reenvio_id=uuid4()), "analista")
    smtp.assert_called_once()


def test_sem_chave_configurada_nao_envia_nem_reserva(ambiente, smtp, registros, monkeypatch):
    monkeypatch.delenv("SICARD_CONVITE_ENVELOPE_KEY")
    with pytest.raises(DemandaValidationError, match="configuração da proteção"):
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_not_called()
    assert not registros


def test_falha_ao_persistir_token_nao_envia(ambiente, smtp, registros, monkeypatch):
    monkeypatch.setattr(service.convite_individual_repository, "registrar",
                        MagicMock(side_effect=DatabaseUnavailableError("indisponivel")))
    with pytest.raises(DatabaseUnavailableError):
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_not_called()
    assert registros[0]["envio_status"] == "falha"


def test_texto_com_token_acima_do_limite_nao_reserva_envio(ambiente, smtp, registros):
    ambiente["email_mensagem"] += "x" * (50000 - len(ambiente["email_mensagem"]))
    with pytest.raises(DemandaValidationError, match="Reduza a mensagem"):
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_not_called()
    assert registros == []


@pytest.mark.parametrize("alteracao", ["destinatario", "versao", "texto", "encerrado", "expirado"])
def test_nao_envia_convite_invalido(ambiente, smtp, registros, alteracao):
    extras = {}
    if alteracao == "destinatario": extras["destinatario"] = "fora@example.com"
    if alteracao == "versao": extras["versao"] = ambiente["atualizado_em"] - timedelta(seconds=1)
    if alteracao == "texto": ambiente["email_mensagem"] = "sem link do julgamento"
    if alteracao == "encerrado": ambiente["status"] = "encerrada"
    if alteracao == "expirado": ambiente["valido_ate"] = datetime.now(timezone.utc) - timedelta(days=1)
    with pytest.raises(DemandaValidationError):
        service.enviar(ambiente["id"], payload(ambiente, **extras), "analista")
    smtp.assert_not_called()
    assert registros == []


def test_lote_sobrevive_a_respostas_e_protege_configuracao(ambiente, smtp, registros, monkeypatch):
    conn = MagicMock()
    monkeypatch.setattr(service, "get_connection", lambda: nullcontext(conn))
    monkeypatch.setattr(service, "atomic_connection", nullcontext)
    carregar = MagicMock(return_value=ambiente)
    monkeypatch.setattr(service.ambientes, "get_ambiente_by_id", carregar)
    revisao = service.revisao_convites(ambiente)
    dados = payload(ambiente, revisao_convites=revisao)

    ambiente["atualizado_em"] += timedelta(seconds=1)
    ambiente["respostas_em_preenchimento"] = 1
    assert service.enviar(ambiente["id"], dados, "analista")["envio_status"] == "aceito_smtp"
    carregar.assert_called_once_with(ambiente["id"], bloquear=True)

    ambiente["atualizado_em"] += timedelta(seconds=1)
    ambiente["total_respostas"] = 1
    assert service.enviar(ambiente["id"], dados, "analista")["reutilizado"]

    ambiente["email_assunto"] = "Assunto alterado durante o lote"
    with pytest.raises(DemandaValidationError, match="configuração dos convites mudou"):
        service.enviar(ambiente["id"], dados, "analista")
    smtp.assert_called_once()


@pytest.mark.parametrize("codigo,status", [("resultado_indeterminado", "indeterminado"), ("destinatario_recusado", "falha")])
def test_persiste_falha_sem_confundir_com_entrega(ambiente, smtp, registros, codigo, status):
    smtp.side_effect = email_service.FalhaEmail(codigo, "Falha informada")
    row = service.enviar(ambiente["id"], payload(ambiente), "analista")
    assert row["envio_status"] == status
    assert row["entrega_status"] == "sem_confirmacao"


def test_falha_persistencia_apos_smtp_exige_consulta_nao_reenvio(ambiente, smtp, registros, monkeypatch):
    monkeypatch.setattr(repo, "finalizar", MagicMock(side_effect=DatabaseUnavailableError("indisponivel")))
    with pytest.raises(email_service.FalhaEmail, match="Não reenvie") as erro:
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    assert erro.value.codigo == "resultado_indeterminado"
    assert registros[0]["envio_status"] == "enviando"
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_called_once()


def test_falha_na_reserva_impede_envio(ambiente, smtp, registros, monkeypatch):
    monkeypatch.setattr(repo, "reservar", MagicMock(side_effect=DatabaseUnavailableError("sem banco")))
    with pytest.raises(DatabaseUnavailableError):
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_not_called()


@pytest.mark.parametrize("existente", ["aceito_smtp", "indeterminado", "enviando"])
def test_estado_persistido_impede_reenvio_automatico(ambiente, smtp, registros, existente):
    registros.append({"id": str(uuid4()), "envio_status": existente})
    assert service.enviar(ambiente["id"], payload(ambiente), "analista")["reutilizado"]
    smtp.assert_not_called()


def relatorio(tipo="delivery-status", *, mid=MID, destino=DEST, acao="delivered", status="2.0.0", disposicao="displayed"):
    if tipo == "disposition-notification":
        bloco = f"Final-Recipient: rfc822; {destino}\r\nOriginal-Message-ID: {mid}\r\nDisposition: manual-action/MDN-sent-manually; {disposicao}\r\n"
        original = ""
    else:
        bloco = f"Reporting-MTA: dns; mx.example.com\r\n\r\nFinal-Recipient: rfc822; {destino}\r\nAction: {acao}\r\nStatus: {status}\r\n"
        original = f"\r\n--parte\r\nContent-Type: message/rfc822\r\n\r\nMessage-ID: {mid}\r\nTo: {destino}\r\n\r\nMensagem original\r\n"
    return (
        f"MIME-Version: 1.0\r\nContent-Type: multipart/report; report-type={tipo}; boundary=parte\r\n\r\n"
        f"--parte\r\nContent-Type: text/plain\r\n\r\nRetorno\r\n--parte\r\nContent-Type: message/{tipo}\r\n\r\n"
        f"{bloco}{original}\r\n--parte--\r\n"
    ).encode()


@pytest.mark.parametrize("acao,status,esperado", [
    ("delivered", "2.0.0", ["confirmada"]), ("failed", "5.1.1", ["falha"]),
    ("delayed", "4.2.0", ["adiada"]), ("relayed", "2.0.0", []),
    ("expanded", "2.0.0", []), ("delivered", "5.0.0", []),
])
def test_interpreta_dsn_sem_confundir_relay_com_entrega(acao, status, esperado):
    assert recibos.interpretar(relatorio(acao=acao, status=status), MID, DEST) == esperado


def test_interpreta_mdn_apenas_displayed():
    assert recibos.interpretar(relatorio("disposition-notification"), MID, DEST) == ["leitura", "confirmada"]
    assert recibos.interpretar(relatorio("disposition-notification", disposicao="deleted"), MID, DEST) == []
    assert recibos.interpretar(relatorio("disposition-notification", disposicao="denied"), MID, DEST) == []
    conteudo = relatorio("disposition-notification").replace(
        b"MIME-Version: 1.0", b"Date: Thu, 05 Nov 2026 15:10:00 -0300\r\nMIME-Version: 1.0")
    evento = recibos.interpretar_confirmacoes(conteudo, MID, DEST)[0]
    assert evento.tipo == "leitura"
    assert evento.ocorrido_em == "2026-11-05T18:10:00+00:00"
    assert evento.origem_data == "Date do relatório MDN"
    assert recibos.interpretar_confirmacoes(relatorio("disposition-notification"), MID, DEST)[0].ocorrido_em is None


def test_dsn_com_envelope_original_sem_message_id_anexo():
    conteudo = relatorio(mid="<nao-usado@example.com>").replace(
        b"Reporting-MTA: dns; mx.example.com",
        ("Reporting-MTA: dns; mx.example.com\r\nOriginal-Envelope-Id: " + sha256(MID.encode()).hexdigest()).encode(),
    )
    assert recibos.interpretar(conteudo, MID, DEST) == ["confirmada"]
    datado = conteudo.replace(b"Status: 2.0.0", b"Status: 2.0.0\r\nLast-Attempt-Date: Thu, 05 Nov 2026 15:00:00 -0300\r\nDiagnostic-Code: smtp; 250 delivered")
    evento = recibos.interpretar_confirmacoes(datado, MID, DEST)[0]
    assert evento.ocorrido_em == "2026-11-05T18:00:00+00:00"
    assert evento.origem_data == "Last-Attempt-Date do relatório DSN"
    assert "250 delivered" in evento.detalhe
    for data in (b"invalida", b"Thu, 05 Nov 2026 15:00:00"):
        invalido = datado.replace(b"Thu, 05 Nov 2026 15:00:00 -0300", data)
        assert recibos.interpretar_confirmacoes(invalido, MID, DEST)[0].ocorrido_em is None


@pytest.mark.parametrize("tipo", ["delivery-status", "disposition-notification"])
def test_retorno_precisa_message_id_e_destinatario_exatos(tipo):
    assert recibos.interpretar(relatorio(tipo, mid="<outro@example.com>"), MID, DEST) == []
    assert recibos.interpretar(relatorio(tipo, destino="outro@example.com"), MID, DEST) == []
    assert recibos.interpretar(b"Content-Type: text/plain\r\n\r\nEu li " + MID.encode(), MID, DEST) == []


CABECALHO_RELATORIO = b"Content-Type: multipart/report; report-type=delivery-status; boundary=parte\r\n\r\n"


def resposta_cabecalhos(*itens):
    """Simula FETCH (UID RFC822.SIZE BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE)]) para vários uids."""
    saida = []
    for uid, tamanho, cabecalho in itens:
        saida.append((f"1 (UID {uid} RFC822.SIZE {tamanho} BODY[HEADER.FIELDS (CONTENT-TYPE)] {{{len(cabecalho)}}}".encode(), cabecalho))
        saida.append(b")")
    return saida


@pytest.fixture
def caixa(monkeypatch, smtp, registros):
    registro = {"id": str(uuid4()), "mensagem_id": MID, "destinatario": DEST, "envio_status": "aceito_smtp",
                "criado_em": "2026-11-05T12:00:00+00:00"}
    registros.append(registro)
    imap = MagicMock()
    imap.login.return_value = ("OK", [])
    imap.select.return_value = ("OK", [b"1"])
    imap.response.return_value = ("UIDVALIDITY", [])
    conteudo = relatorio()
    def uid(comando, *args):
        if comando == "search": return "OK", [b"42"]
        if args[1].startswith("(UID RFC822.SIZE"): return "OK", resposta_cabecalhos((42, len(conteudo), CABECALHO_RELATORIO))
        if args[1] == "(BODY.PEEK[])": return "OK", [(b"1 (UID 42 BODY[])", conteudo), b")"]
        raise AssertionError("Operação IMAP não autorizada")
    imap.uid.side_effect = uid
    fabrica = MagicMock(return_value=imap)
    monkeypatch.setattr(recibos.imaplib, "IMAP4_SSL", fabrica)
    gravar = MagicMock()
    monkeypatch.setattr(repo, "registrar_evento", gravar)
    return imap, fabrica, gravar


def test_coleta_so_relatorios_correlacionados_sem_marcar_lida(caixa):
    imap, fabrica, gravar = caixa
    result = recibos.coletar(str(uuid4()), usuario_id="analista")
    assert result["relatorios_consultados"] == 1
    imap.select.assert_called_once_with('"INBOX"', readonly=True)
    assert fabrica.call_args.kwargs["ssl_context"].check_hostname
    # Gmail não filtra Content-Type nem texto literal no SEARCH: a janela é por data e o filtro é local.
    assert imap.uid.call_args_list[0].args == ("search", "SINCE", "04-Nov-2026")
    assert [c.args[0] for c in imap.uid.call_args_list] == ["search", "fetch", "fetch"]
    assert imap.uid.call_args_list[1].args[1:] == ("42", "(UID RFC822.SIZE BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE)])")
    assert imap.uid.call_args_list[-1].args[-1] == "(BODY.PEEK[])"
    assert gravar.call_args.args[1] == "confirmada"
    assert gravar.call_args.kwargs["ocorrido_em"] is None
    assert gravar.call_args.kwargs["origem_data"] == "Last-Attempt-Date do relatório DSN"
    imap.store.assert_not_called()
    imap.expunge.assert_not_called()
    imap.close.assert_not_called()
    imap.logout.assert_called_once()


def test_coleta_sem_data_de_envio_varre_a_caixa_inteira(caixa, registros):
    registros[0].pop("criado_em")
    recibos.coletar(str(uuid4()), usuario_id="analista")
    assert caixa[0].uid.call_args_list[0].args == ("search", "ALL")


def test_coleta_ignora_mensagens_que_nao_sao_relatorios(caixa):
    imap, _, gravar = caixa
    conteudo = relatorio()
    def uid(comando, *args):
        if comando == "search": return "OK", [b"7 42 99"]
        if args[1].startswith("(UID RFC822.SIZE"):
            assert args[0] == "7,42,99"
            return "OK", resposta_cabecalhos(
                (7, 100, b"Content-Type: text/plain; charset=utf-8\r\n\r\n"),
                (42, len(conteudo), CABECALHO_RELATORIO),
                (99, 999999, CABECALHO_RELATORIO))
        if args[1] == "(BODY.PEEK[])":
            assert args[0] == "42"
            return "OK", [(b"1 (UID 42 BODY[])", conteudo), b")"]
        raise AssertionError("Operação IMAP não autorizada")
    imap.uid.side_effect = uid
    assert recibos.coletar(str(uuid4()), usuario_id="analista")["relatorios_consultados"] == 1
    assert gravar.call_count == 1
    assert imap.uid.call_count == 3


def test_relatorio_do_gmail_correlaciona_por_in_reply_to_e_x_original_message_id():
    base = relatorio().replace(f"Message-ID: {MID}".encode(), b"Message-ID: <outro@example.com>")
    assert recibos.interpretar(base, MID, DEST) == []
    por_cabecalho = base.replace(b"MIME-Version: 1.0", f"In-Reply-To: {MID}\r\nMIME-Version: 1.0".encode())
    assert recibos.interpretar(por_cabecalho, MID, DEST) == ["confirmada"]
    por_bloco = base.replace(b"Reporting-MTA: dns; mx.example.com\r\n",
                             f"Reporting-MTA: dns; mx.example.com\r\nX-Original-Message-ID: {MID}\r\n".encode())
    assert recibos.interpretar(por_bloco, MID, DEST) == ["confirmada"]


def test_coleta_automatica_correlaciona_convite_e_resposta(caixa, registros, monkeypatch, smtp):
    registros[0]["natureza"] = "convite"
    registros.append({
        **registros[0], "id": "resposta", "natureza": "resposta",
        "mensagem_id": "<sicard.resposta@example.com>",
    })
    monkeypatch.setattr(repo, "listar_para_confirmacao", lambda: registros)
    # Um único relatório contendo os dois retornos; cada registro correlaciona só o seu.
    relatorios = {
        b"1": relatorio(mid=registros[0]["mensagem_id"]),
        b"2": relatorio(mid="<sicard.resposta@example.com>"),
    }
    relatorios = {k: v.replace(b"Status: 2.0.0", b"Status: 2.0.0\r\nLast-Attempt-Date: Thu, 05 Nov 2026 15:00:00 -0300")
                  for k, v in relatorios.items()}

    def uid(comando, *args):
        if comando == "search":
            return "OK", [b"1 2"]
        if args[1].startswith("(UID RFC822.SIZE"):
            return "OK", resposta_cabecalhos(*((k.decode(), len(v), CABECALHO_RELATORIO) for k, v in relatorios.items()))
        if args[1] == "(BODY.PEEK[])":
            uid_bytes = args[0].encode("ascii")
            return "OK", [(b"1 (UID " + uid_bytes + b" BODY[])", relatorios[uid_bytes]), b")"]
        raise AssertionError("Operação IMAP não autorizada")

    caixa[0].uid.side_effect = uid
    assert recibos.coletar_automaticamente(lambda: False) == 2
    assert caixa[2].call_count == 2
    assert {c.args[0] for c in caixa[2].call_args_list} == {registros[0]["id"], "resposta"}
    assert all(c.kwargs["ocorrido_em"] == "2026-11-05T18:00:00+00:00"
               for c in caixa[2].call_args_list)
    caixa[0].store.assert_not_called()
    caixa[0].expunge.assert_not_called()
    smtp.assert_not_called()


def test_coleta_automatica_interrompe_entre_registros(caixa, registros, monkeypatch, smtp):
    monkeypatch.setattr(repo, "listar_para_confirmacao", lambda: registros)
    conteudo = relatorio()
    def uid(comando, *args):
        if comando == "search": return "OK", [b"1 2"]
        if args[1].startswith("(UID RFC822.SIZE"):
            return "OK", resposta_cabecalhos((1, len(conteudo), CABECALHO_RELATORIO), (2, len(conteudo), CABECALHO_RELATORIO))
        return "OK", [(b"1 (UID " + args[0].encode("ascii") + b" BODY[])", conteudo), b")"]
    caixa[0].uid.side_effect = uid
    assert recibos.coletar_automaticamente(lambda: caixa[2].call_count > 0) == 1
    assert caixa[2].call_count == 1
    caixa[0].logout.assert_called_once()
    smtp.assert_not_called()


def test_mesma_coleta_imap_correlaciona_notificacao_de_pendencia(caixa, monkeypatch, smtp):
    from api.repositories import solicitacao_complementacao_repository as pendencias
    pedido = {"id": "pedido", "notificacao": {"id_mensagem": MID, "destinatario": DEST}}
    registrar = MagicMock()
    monkeypatch.setattr(pendencias, "registrar_confirmacao", registrar)
    monkeypatch.setattr(pendencias, "obter", lambda *a, **kw: pedido)
    resultado = recibos.coletar_pendencia(pedido, usuario_id="analista")
    assert resultado["relatorios_consultados"] == 1
    assert registrar.call_args.args[:3] == ("pedido", MID, "confirmada")
    caixa[0].select.assert_called_once_with('"INBOX"', readonly=True)
    smtp.assert_not_called()


def test_coleta_expoe_erro_sem_reenviar(caixa, smtp, caplog):
    caixa[0].login.side_effect = recibos.imaplib.IMAP4.error("resposta-privada")
    with pytest.raises(email_service.FalhaEmail, match="não será repetido"):
        recibos.coletar(str(uuid4()), usuario_id="analista")
    assert "resposta-privada" not in caplog.text
    smtp.assert_not_called()
    caixa[2].assert_not_called()


def test_relatorio_grande_nao_e_baixado(caixa):
    caixa[0].uid.side_effect = [("OK", [b"42"]), ("OK", resposta_cabecalhos((42, 999999, CABECALHO_RELATORIO)))]
    assert recibos.coletar(str(uuid4()), usuario_id="analista")["relatorios_consultados"] == 0
    assert caixa[0].uid.call_count == 2
    caixa[2].assert_not_called()


def test_relatorio_truncado_pelo_servidor_e_recusado(caixa):
    caixa[0].uid.side_effect = [
        ("OK", [b"42"]), ("OK", resposta_cabecalhos((42, 100, CABECALHO_RELATORIO))),
        ("OK", [(b"1 (UID 42 BODY[])", b"x" * (recibos.MAX_RELATORIO + 1)), b")"]),
    ]
    with pytest.raises(email_service.FalhaEmail, match="incompleto ou maior"):
        recibos.coletar(str(uuid4()), usuario_id="analista")
    caixa[2].assert_not_called()


def test_retorno_sem_relatorio_nao_confirma_entrega(caixa):
    caixa[0].uid.side_effect = [("OK", [b""])]
    result = recibos.coletar(str(uuid4()), usuario_id="analista")
    assert result["relatorios_consultados"] == 0
    caixa[2].assert_not_called()


@pytest.mark.parametrize("resposta", [("NO", [b"falha"]), ("OK", None), ("BAD", [])])
def test_resposta_imap_invalida_explicita(caixa, resposta):
    caixa[0].uid.side_effect = [resposta]
    with pytest.raises(email_service.FalhaEmail, match="não concluiu"):
        recibos.coletar(str(uuid4()), usuario_id="analista")
    caixa[2].assert_not_called()


@pytest.mark.parametrize("cenario,adquirido", [("novo", True), ("retry", True), ("duplicado", False)])
def test_reserva_sql_usando_versao_e_exclusividade(monkeypatch, cenario, adquirido):
    from contextlib import contextmanager
    row = {"id": "email", "envio_status": "enviando"}
    retornos = [{"id": "ambiente"}, row if cenario == "novo" else None]
    if cenario != "novo":
        retornos.append(row if cenario == "retry" else None)
    if cenario == "duplicado":
        retornos.append(row)
    conn = MagicMock()
    conn.execute.return_value.fetchone.side_effect = retornos
    @contextmanager
    def connection():
        yield conn
    monkeypatch.setattr(repo, "get_connection", connection)
    resultado, novo = repo.reservar("ambiente", DEST, "hash", MID, "usuario", datetime.now(timezone.utc))
    assert novo is adquirido and resultado == row
    consultas = [call.args[0] for call in conn.execute.call_args_list]
    assert "pg_advisory_xact_lock" in consultas[0]
    assert "FOR SHARE" in consultas[1] and "atualizado_em=%s" in consultas[1]
    assert "ON CONFLICT (ambiente_id,destinatario,conteudo_hash) DO NOTHING" in consultas[2]
    if cenario != "novo":
        assert "envio_status='falha'" in consultas[3]
        assert "'tentativa'" in consultas[3]
        assert "UPDATE ahp.comparacao_colaborativa_email AS email" in consultas[3]
        assert "to_jsonb(email) - 'eventos'" in consultas[3]
        assert "to_jsonb(ahp." not in consultas[3]


def test_evento_repetido_nao_duplica_e_atraso_nao_regride_entrega(monkeypatch):
    from contextlib import contextmanager
    row = {"eventos": [{"tipo": "confirmada", "fonte": "hash"}],
           "entrega_status": "confirmada", "leitura_status": "sem_confirmacao"}
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = row
    @contextmanager
    def connection():
        yield conn
    monkeypatch.setattr(repo, "get_connection", connection)
    repo.registrar_evento("id", "confirmada", "hash")
    assert conn.execute.call_count == 1
    repo.registrar_evento("id", "adiada", "outro")
    params = conn.execute.call_args.args[1]
    assert params[0] == "confirmada"
    assert len(params[2].obj) == 2
    repo.registrar_evento("id", "confirmada", "hash", ocorrido_em="2026-11-05T18:00:00+00:00",
                         detalhe="smtp; 250 delivered", origem_data="Last-Attempt-Date do relatório DSN")
    eventos = conn.execute.call_args.args[1][2].obj
    assert len(eventos) == 1
    assert eventos[0]["ocorrido_em"] == "2026-11-05T18:00:00+00:00"
    assert eventos[0]["detalhe"] == "smtp; 250 delivered"
    conn.reset_mock()
    repo.registrar_evento("id", "confirmada", "hash", ocorrido_em="2026-11-05T18:00:00+00:00",
                         detalhe="smtp; 250 delivered", origem_data="Last-Attempt-Date do relatório DSN")
    assert conn.execute.call_count == 1


@pytest.mark.parametrize("natureza", ["convite", "resposta"])
@pytest.mark.parametrize("status", ["aceito_smtp", "enviando", "indeterminado"])
def test_monitoramento_rejeita_envio_que_nao_esta_nao_enviado(monkeypatch, natureza, status):
    from contextlib import contextmanager
    conn = MagicMock()
    conn.execute.return_value.fetchone.return_value = {"id": "enviado", "envio_status": status}
    @contextmanager
    def connection():
        yield conn
    monkeypatch.setattr(repo, "get_connection", connection)
    reserva = MagicMock()
    monkeypatch.setattr(repo, "reservar", reserva)
    with pytest.raises(DemandaValidationError, match="Não enviado"):
        repo.reservar_monitorado("ambiente", DEST, "hash", MID, "usuario",
                                datetime.now(timezone.utc), natureza=natureza)
    reserva.assert_not_called()
    assert "pg_advisory_xact_lock" in conn.execute.call_args_list[0].args[0]
    assert "coalesce(entrega_status, '') <> 'falha'" in conn.execute.call_args.args[0]
    assert conn.execute.call_args.args[1] == ("ambiente", DEST, natureza)


def test_monitoramento_reutiliza_comunicacao_fracassada(monkeypatch):
    from contextlib import contextmanager
    conn = MagicMock()
    conn.execute.return_value.fetchone.side_effect = [None, {"conteudo_hash": "hash-anterior"}]
    @contextmanager
    def connection():
        yield conn
    monkeypatch.setattr(repo, "get_connection", connection)
    reserva = MagicMock(return_value=({"id": "mesmo-email"}, True))
    monkeypatch.setattr(repo, "reservar", reserva)
    row, novo = repo.reservar_monitorado("ambiente", DEST, "novo-hash", MID, "usuario", datetime.now(timezone.utc))
    assert novo and row["id"] == "mesmo-email"
    assert reserva.call_args.args[2] == "hash-anterior"


def test_automatico_nao_repete_confirmacao_aceita(monkeypatch):
    from contextlib import contextmanager
    conn = MagicMock()
    row = {"id": "enviado", "envio_status": "aceito_smtp"}
    conn.execute.return_value.fetchone.return_value = row
    @contextmanager
    def connection():
        yield conn
    monkeypatch.setattr(repo, "get_connection", connection)
    reserva = MagicMock()
    monkeypatch.setattr(repo, "reservar", reserva)
    assert repo.reservar_monitorado("ambiente", DEST, "hash", MID, "sistema",
                                   datetime.now(timezone.utc), natureza="resposta", rejeitar_enviado=False) == (row, False)
    reserva.assert_not_called()


def test_envio_seletivo_usa_reserva_monitorada(ambiente, smtp, registros, monkeypatch):
    reservar = MagicMock(side_effect=lambda *args, **kwargs: repo.reservar(*args))
    monkeypatch.setattr(repo, "reservar_monitorado", reservar)
    service.enviar(ambiente["id"], payload(ambiente, somente_nao_enviado=True), "analista")
    reservar.assert_called_once()
    assert reservar.call_args.kwargs == {"rejeitar_enviado": False}
    smtp.assert_called_once()


@pytest.mark.parametrize("status", ["aceito_smtp", "enviando", "indeterminado"])
def test_retomada_de_convite_preserva_envio_registrado(ambiente, smtp, registros, monkeypatch, status):
    registro = {"id": "existente", "envio_status": status}
    reservar = MagicMock(return_value=(registro, False))
    monkeypatch.setattr(repo, "reservar_monitorado", reservar)
    resposta = service.enviar(ambiente["id"], payload(ambiente, somente_nao_enviado=True), "analista")
    assert resposta == {**registro, "reutilizado": True}
    smtp.assert_not_called()


def test_reenvio_monitorado_apos_recusa_preserva_chave_e_envelope(ambiente, smtp, registros, monkeypatch):
    def reservar_monitorado(*args, **kwargs):
        # Simula reserva de uma nova tentativa para o mesmo registro que falhou.
        assert registros[0]["envio_status"] == "falha"
        registros[0]["envio_status"] = "enviando"
        return registros[0], True

    monkeypatch.setattr(repo, "reservar_monitorado", reservar_monitorado)
    smtp.side_effect = [
        email_service.FalhaEmail("destinatario_recusado", "Falha informada"),
        smtp.return_value,
    ]
    primeiro = service.enviar(ambiente["id"], payload(ambiente), "analista")
    assert primeiro["envio_status"] == "falha"
    antes = service.convite_individual_repository.obter(ambiente["id"], DEST, ambiente["atualizado_em"]).copy()
    assert ("A" * 43).encode() not in antes["envelope_cifrado"]
    monkeypatch.setattr(service.secrets, "token_urlsafe", lambda _: pytest.fail("reenvio gerou nova chave"))
    ambiente["email_mensagem"] = "mudou desde a primeira tentativa"
    segundo = service.enviar(ambiente["id"], payload(ambiente, somente_nao_enviado=True), "analista")
    assert segundo["envio_status"] == "aceito_smtp"
    assert service.convite_individual_repository.obter(ambiente["id"], DEST, ambiente["atualizado_em"]) == antes
    assert smtp.call_args_list[0].args[0] == smtp.call_args_list[1].args[0]


def test_rota_distingue_legado_indisponivel_de_configuracao_global(ambiente, smtp, registros, monkeypatch):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    user = SessionUser("id", "", "teste_gestor", "Teste", "GESTOR")
    headers = {"Authorization": f"Bearer {create_token(user)}"}
    legado = {"segredo_hash": "0" * 64, "envelope_cifrado": None, "revogado_em": None}
    ambiente["convites"].append({"email": "nova@example.com"})
    obter = service.convite_individual_repository.obter
    monkeypatch.setattr(service.convite_individual_repository, "obter",
                        lambda a, email, v: legado if email == DEST else obter(a, email, v))
    with TestClient(app) as client:
        endpoint = f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente['id']}/emails/enviar"
        dados = payload(ambiente).model_dump(mode="json")
        response = client.post(endpoint, headers=headers, json=dados)
        assert response.status_code == 422
        assert response.headers["X-SICARD-Email-Error"] == "convite_original_indisponivel"
        assert "Convite antigo" in response.json()["detail"]
        response = client.post(endpoint, headers=headers, json={**dados, "destinatario": "nova@example.com"})
        assert response.status_code == 200
    assert smtp.call_count == 1


def test_monitoramento_inclui_nomes_e_disponibilidade_da_resposta(ambiente, registros, monkeypatch):
    ambiente["convites"] = [{"nome": "Ana", "email": DEST}, {"nome": "Bia", "email": "bia@example.com"}]
    enviado = datetime(2026, 11, 6, 20, 1, 12, tzinfo=timezone.utc)
    monkeypatch.setattr(service.ambientes, "list_respostas", lambda _: [
        {"email": DEST, "status": "enviada", "iniciado_em": None, "enviado_em": enviado},
        {"email": "bia@example.com", "status": "em_preenchimento", "iniciado_em": datetime(2026, 11, 6, 19, 51, 11, tzinfo=timezone.utc)}])
    from api.routers.email_convites import monitoramento
    result = monitoramento(ambiente["id"])
    assert result["registros"] == registros
    assert result["colaboradores"] == [
        {"nome": "Ana", "email": DEST, "instituicao": None, "resposta_recebida": True, "acesso_formulario_em": None,
         "resposta_enviada_em": "2026-11-06T20:01:12+00:00", "clique_link_em": None,
         "etapa_codigo": "resposta_enviada", "etapa_rotulo": "Resposta enviada",
         "etapa_atualizada_em": "2026-11-06T20:01:12+00:00"},
        {"nome": "Bia", "email": "bia@example.com", "instituicao": None, "resposta_recebida": False,
         "acesso_formulario_em": "2026-11-06T19:51:11+00:00", "resposta_enviada_em": None,
         "clique_link_em": None, "etapa_codigo": "em_preenchimento", "etapa_rotulo": "Em preenchimento",
         "etapa_atualizada_em": "2026-11-06T19:51:11+00:00"},
    ]


def test_monitoramento_publico_le_inscricoes_e_respostas_vinculadas(ambiente, registros, monkeypatch):
    from api.routers.email_convites import monitoramento
    from fastapi import HTTPException

    ambiente.update(modo_participacao="publico", convites=[{"nome": "Convite fora da coleta", "email": DEST}])
    quando = datetime(2026, 11, 24, 16, 30, tzinfo=timezone.utc)
    inscritos = [
        {"id": str(i), "nome": nome, "email": f"pessoa-{i}@example.com", "criado_em": quando}
        for i, nome in enumerate(["Lia", "Ana", "Bia"], start=1)
    ]
    buscar_inscritos = MagicMock(return_value=inscritos)
    monkeypatch.setattr(service.ambientes, "list_inscricoes", buscar_inscritos)
    monkeypatch.setattr(service.ambientes, "list_respostas", lambda _: [
        {"inscricao_id": None, "email": inscritos[0]["email"], "status": "enviada"},
        {"inscricao_id": "2", "email": inscritos[1]["email"], "status": "em_preenchimento", "iniciado_em": quando},
        {"inscricao_id": "3", "email": inscritos[2]["email"], "status": "enviada", "enviado_em": quando},
    ])
    comprovante = {"natureza": "resposta", "destinatario": inscritos[2]["email"], "envio_status": "aceito_smtp"}
    registros.extend([{"natureza": "convite", "destinatario": DEST}, comprovante])
    with pytest.raises(HTTPException) as sem_permissao:
        monitoramento(ambiente["id"], SessionUser("id", "", "leitura", "Leitura", "VISUALIZADOR", permissoes={}))
    assert sem_permissao.value.status_code == 403
    buscar_inscritos.assert_not_called()

    gestor = SessionUser("id", "", "gestor", "Gestor", "GESTOR", permissoes={"mad.operar": True})
    result = monitoramento(ambiente["id"], gestor)
    buscar_inscritos.assert_called_once_with(str(ambiente["id"]))
    assert result["registros"] == [comprovante]
    assert [row["nome"] for row in result["colaboradores"]] == ["Lia", "Ana", "Bia"]
    assert [row["inscricao_id"] for row in result["colaboradores"]] == ["1", "2", "3"]
    assert [row["etapa_codigo"] for row in result["colaboradores"]] == ["inscrito", "em_preenchimento", "resposta_enviada"]
    assert [row["resposta_recebida"] for row in result["colaboradores"]] == [False, False, True]
    assert all(row["registrado_em"] == quando.isoformat() for row in result["colaboradores"])


def test_configuracao_expoe_somente_conta_de_autenticacao_real_do_servico(ambiente, registros, monkeypatch):
    from api.routers import email_convites as router_service
    monkeypatch.setattr(router_service, "get_email_settings", lambda: EmailSettings(
        habilitado=True, usuario="conta-autenticacao@example.com",
        remetente="endereco-from-diferente@example.com",
    ))
    resultado = router_service.configuracao_remetente(ambiente["id"])
    assert resultado == {"conta_autenticacao": "conta-autenticacao@example.com"}
    assert "senha" not in resultado and "remetente" not in resultado


def test_monitoramento_informa_primeiro_clique_no_link(ambiente, registros, monkeypatch):
    ambiente["convites"] = [{"nome": "Ana", "email": DEST}]
    monkeypatch.setattr(service.ambientes, "list_respostas", lambda _: [])
    registros.append({"natureza": "convite", "destinatario": DEST, "link_acessado_em": datetime(2026, 11, 6, 16, 51, tzinfo=timezone.utc)})
    registros.append({"natureza": "convite", "destinatario": DEST, "link_acessado_em": None})
    from api.routers.email_convites import monitoramento
    colaborador = monitoramento(ambiente["id"])["colaboradores"][0]
    assert colaborador["clique_link_em"] == "2026-11-06T16:51:00+00:00"
    assert colaborador["etapa_codigo"] == "link_acessado"
    assert colaborador["etapa_rotulo"] == "Link acessado"


def test_monitoramento_avanca_convite_clique_preenchimento_e_resposta():
    from api.routers.email_convites import _monitorar_colaborador
    convite = {"nome": "Ana", "email": DEST}
    enviado = datetime(2026, 11, 6, 16, 40, tzinfo=timezone.utc)
    clique = datetime(2026, 11, 6, 16, 51, tzinfo=timezone.utc)
    registros = [{"natureza": "convite", "destinatario": DEST,
                  "envio_status": "aceito_smtp", "criado_em": enviado}]
    assert _monitorar_colaborador(convite, {}, {}, [])["etapa_codigo"] == "convite_nao_enviado"
    assert _monitorar_colaborador(convite, {}, {}, registros)["etapa_codigo"] == "convite_enviado"
    assert _monitorar_colaborador(convite, {}, {DEST: clique}, registros)["etapa_codigo"] == "link_acessado"
    preenchimento = {DEST: {"status": "em_preenchimento", "iniciado_em": clique}}
    assert _monitorar_colaborador(convite, preenchimento, {DEST: clique}, registros)["etapa_codigo"] == "em_preenchimento"
    preenchimento[DEST].update(status="enviada", enviado_em=enviado)
    assert _monitorar_colaborador(convite, preenchimento, {DEST: clique}, registros)["etapa_codigo"] == "resposta_enviada"


def test_confirmacoes_desativadas_nao_retornam_502(ambiente, registros, monkeypatch):
    from api.routers import email_convites as router_service
    monkeypatch.setattr(router_service, "get_email_settings", lambda: EmailSettings())
    resultado = router_service.coletar(
        ambiente["id"], SessionUser("id", "", "analista", "Analista", "ANALISTA")
    )
    assert resultado["configurado"] is False
    assert resultado["relatorios_consultados"] == 0
    assert resultado["registros"] == registros


def test_link_do_convite_recebe_codigo_sem_expor_o_email(ambiente, smtp, registros):
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    codigo = service.codigo_link("token-teste", DEST)
    texto = smtp.call_args.args[0].texto
    assert f"/formulario-comparacao-pareada/token-teste/?c={codigo}#acesso=" in texto
    assert DEST not in texto
    assert codigo != service.codigo_link("token-teste", "bia@example.com")


def test_clique_registra_somente_codigo_do_destinatario(ambiente, monkeypatch):
    ambiente["convites"] = [{"email": DEST}]
    monkeypatch.setattr(service.ambientes, "get_ambiente_by_token", lambda _: ambiente)
    registrar = MagicMock()
    monkeypatch.setattr(service.repo, "registrar_clique", registrar)
    service.registrar_clique_link("token-teste", "0" * 32)
    service.registrar_clique_link("token-teste", "nao-hexadecimal")
    registrar.assert_not_called()
    service.registrar_clique_link("token-teste", service.codigo_link("token-teste", DEST))
    registrar.assert_called_once_with(str(ambiente["id"]), DEST)



@pytest.mark.parametrize("perfil,leitura,escrita", [(None,401,401), ("VISUALIZADOR",200,403), ("OPERADOR",403,403), ("ANALISTA",200,403), ("GESTOR",200,200), ("ADMIN",200,403)])
def test_permissoes_rotas_de_convites(ambiente, smtp, registros, monkeypatch, perfil, leitura, escrita):
    monkeypatch.setattr(service.ambientes, "list_respostas", lambda _: [])
    app = FastAPI()
    app.include_router(router, prefix="/api")
    headers = {}
    if perfil:
        user = SessionUser("id", "", f"teste_{perfil}", "Teste", perfil)
        headers = {"Authorization": f"Bearer {create_token(user)}"}
    with TestClient(app) as client:
        base = f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente['id']}/emails"
        assert client.get(base, headers=headers).status_code == leitura
        response = client.post(base + "/enviar", headers=headers, json=payload(ambiente).model_dump(mode="json"))
        assert response.status_code == escrita
        if escrita != 200:
            assert client.post(base + "/confirmacoes", headers=headers).status_code == escrita
            assert client.get(base + "/monitoramento", headers=headers).status_code == leitura
            assert client.post(base + "/resposta/enviar", headers=headers, json={"destinatario": DEST}).status_code == escrita
            smtp.assert_not_called()
