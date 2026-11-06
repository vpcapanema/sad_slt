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
    monkeypatch.setattr(service.convite_individual_repository, "emitir", lambda *a: "A" * 43)
    row = {
        "id": str(uuid4()), "atualizado_em": datetime.now(timezone.utc),
        "status": "ativa", "valido_ate": datetime.now(timezone.utc) + timedelta(days=2),
        "convites": [{"email": DEST}], "token": "token-teste", "token_acesso": "012345",
        "criterios": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}],
    }
    monkeypatch.setattr(service.ambientes, "get_ambiente_by_id", lambda _: row)
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
        "destinatario": DEST, "texto": "Olá!\nhttps://example.com/sicard/public/analise-multicriterio/formulario-comparacao-pareada/token-teste/\nEquipe SICARD",
        "versao": ambiente["atualizado_em"], **extras,
    })


def test_convite_individual_inclui_somente_dimensoes_atribuidas(ambiente, smtp, registros):
    ambiente["convites"] = [{"email": DEST, "nome": "Ana", "dimensoes": ["Social"]}]
    ambiente["criterios"] = [{"criterio": "Custo", "dimensao": "Financeira", "Etapa": "Fase 3"},
                            {"criterio": "Acesso", "dimensao": "Social", "Etapa": "Fase 3"},
                            {"criterio": "Equidade", "dimensao": "Social", "Etapa": "Fase 3"}]
    service.enviar(ambiente["id"], payload(ambiente, texto=payload(ambiente).texto + "\nCusto"), "analista")
    texto = smtp.call_args.args[0].texto
    assert "Acesso" in texto and "Equidade" in texto
    assert "Custo" not in texto and "Financeira" not in texto
    assert "https://example.com/sicard/public/" in texto
    assert "A" * 43 in texto and "012345" not in texto


def test_preserva_texto_acrescenta_token_e_nao_repete_apos_recarga(ambiente, smtp, registros):
    dados = payload(ambiente)
    result = service.enviar(ambiente["id"], dados, "analista")
    assert result["envio_status"] == "aceito_smtp"
    texto = smtp.call_args.args[0].texto
    assert texto.startswith(dados.texto + "\n\n")
    assert "Chave individual do convite: " + "A" * 43 in texto
    assert registros[0]["conteudo_hash"] == sha256((service.ASSUNTO + "\n" + dados.texto).encode()).hexdigest()
    assert smtp.call_args.kwargs["solicitar_confirmacoes"] is True
    assert smtp.call_args.kwargs["id_mensagem"] == registros[0]["mensagem_id"]
    assert "sicard." in registros[0]["mensagem_id"]
    assert service.enviar(ambiente["id"], dados, "analista")["reutilizado"] is True
    smtp.assert_called_once()


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
    resend = payload(ambiente, reenvio_id=str(uuid4()))
    novo = service.enviar(ambiente['id'], resend, 'analista')
    assert original['id'] != novo['id']
    assert len(rows) == 2
    assert service.enviar(ambiente['id'], resend, 'analista')['reutilizado']
    assert smtp.call_count == 2
    assert smtp.call_args_list[0].args[0].texto == smtp.call_args_list[1].args[0].texto


def test_convite_com_link_antigo_continua_valido(ambiente, smtp, registros):
    dados = payload(ambiente, texto="https://example.com/sicard/public/analise-multicriterio/token-teste/")
    assert service.enviar(ambiente["id"], dados, "analista")["envio_status"] == "aceito_smtp"
    smtp.assert_called_once()


def test_legado_emite_convite_individual_antes_de_enviar(ambiente, smtp, registros, monkeypatch):
    ambiente["token_acesso"] = None
    garantir = MagicMock(return_value="A" * 43)
    monkeypatch.setattr(service.convite_individual_repository, "emitir", garantir)
    service.enviar(ambiente["id"], payload(ambiente), "analista")
    garantir.assert_called_once()
    assert garantir.call_args.args[1] == DEST
    assert "Chave individual do convite: " + "A" * 43 in smtp.call_args.args[0].texto


def test_falha_ao_persistir_token_nao_envia(ambiente, smtp, registros, monkeypatch):
    ambiente["token_acesso"] = None
    monkeypatch.setattr(service.convite_individual_repository, "emitir",
                        MagicMock(side_effect=DatabaseUnavailableError("indisponivel")))
    with pytest.raises(DatabaseUnavailableError):
        service.enviar(ambiente["id"], payload(ambiente), "analista")
    smtp.assert_not_called()
    assert registros[0]["envio_status"] == "falha"


def test_texto_com_token_acima_do_limite_nao_reserva_envio(ambiente, smtp, registros):
    dados = payload(ambiente)
    texto = dados.texto + "x" * (50000 - len(dados.texto))
    with pytest.raises(DemandaValidationError, match="Reduza a mensagem"):
        service.enviar(ambiente["id"], payload(ambiente, texto=texto), "analista")
    smtp.assert_not_called()
    assert registros == []


@pytest.mark.parametrize("alteracao", ["destinatario", "versao", "texto", "encerrado", "expirado"])
def test_nao_envia_convite_invalido(ambiente, smtp, registros, alteracao):
    extras = {}
    if alteracao == "destinatario": extras["destinatario"] = "fora@example.com"
    if alteracao == "versao": extras["versao"] = ambiente["atualizado_em"] - timedelta(seconds=1)
    if alteracao == "texto": extras["texto"] = "sem link do julgamento"
    if alteracao == "encerrado": ambiente["status"] = "encerrada"
    if alteracao == "expirado": ambiente["valido_ate"] = datetime.now(timezone.utc) - timedelta(days=1)
    with pytest.raises(DemandaValidationError):
        service.enviar(ambiente["id"], payload(ambiente, **extras), "analista")
    smtp.assert_not_called()
    assert registros == []


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
            assert args[0] == b"42"
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
            return "OK", [(b"1 (UID " + args[0] + b" BODY[])", relatorios[args[0]]), b")"]
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
        return "OK", [(b"1 (UID " + args[0] + b" BODY[])", conteudo), b")"]
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
    reservar = MagicMock(side_effect=repo.reservar)
    monkeypatch.setattr(repo, "reservar_monitorado", reservar)
    service.enviar(ambiente["id"], payload(ambiente, somente_nao_enviado=True), "analista")
    reservar.assert_called_once()
    smtp.assert_called_once()


def test_monitoramento_inclui_nomes_e_disponibilidade_da_resposta(ambiente, registros, monkeypatch):
    ambiente["convites"] = [{"nome": "Ana", "email": DEST}, {"nome": "Bia", "email": "bia@example.com"}]
    monkeypatch.setattr(service.ambientes, "list_respostas", lambda _: [
        {"email": DEST, "status": "enviada"}, {"email": "bia@example.com", "status": "em_preenchimento"}])
    from api.routers.email_convites import monitoramento
    result = monitoramento(ambiente["id"])
    assert result["registros"] == registros
    assert result["colaboradores"] == [
        {"nome": "Ana", "email": DEST, "resposta_recebida": True},
        {"nome": "Bia", "email": "bia@example.com", "resposta_recebida": False},
    ]


@pytest.mark.parametrize("perfil,status", [(None, 401), ("VISUALIZADOR", 403), ("OPERADOR", 403), ("ANALISTA", 200), ("GESTOR", 200), ("ADMIN", 200)])
def test_permissoes_rotas_de_convites(ambiente, smtp, registros, perfil, status):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    headers = {}
    if perfil:
        user = SessionUser("id", "", f"teste_{perfil}", "Teste", perfil)
        headers = {"Authorization": f"Bearer {create_token(user)}"}
    with TestClient(app) as client:
        base = f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente['id']}/emails"
        assert client.get(base, headers=headers).status_code == status
        response = client.post(base + "/enviar", headers=headers, json=payload(ambiente).model_dump(mode="json"))
        assert response.status_code == status
        if perfil not in {"ANALISTA", "GESTOR", "ADMIN"}:
            assert client.post(base + "/confirmacoes", headers=headers).status_code == status
            assert client.get(base + "/monitoramento", headers=headers).status_code == status
            assert client.post(base + "/resposta/enviar", headers=headers, json={"destinatario": DEST}).status_code == status
            smtp.assert_not_called()
