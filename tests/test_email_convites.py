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
    assert recibos.interpretar(relatorio("disposition-notification"), MID, DEST) == ["leitura"]
    assert recibos.interpretar(relatorio("disposition-notification", disposicao="deleted"), MID, DEST) == []
    assert recibos.interpretar(relatorio("disposition-notification", disposicao="denied"), MID, DEST) == []


def test_dsn_com_envelope_original_sem_message_id_anexo():
    conteudo = relatorio(mid="<nao-usado@example.com>").replace(
        b"Reporting-MTA: dns; mx.example.com",
        ("Reporting-MTA: dns; mx.example.com\r\nOriginal-Envelope-Id: " + sha256(MID.encode()).hexdigest()).encode(),
    )
    assert recibos.interpretar(conteudo, MID, DEST) == ["confirmada"]


@pytest.mark.parametrize("tipo", ["delivery-status", "disposition-notification"])
def test_retorno_precisa_message_id_e_destinatario_exatos(tipo):
    assert recibos.interpretar(relatorio(tipo, mid="<outro@example.com>"), MID, DEST) == []
    assert recibos.interpretar(relatorio(tipo, destino="outro@example.com"), MID, DEST) == []
    assert recibos.interpretar(b"Content-Type: text/plain\r\n\r\nEu li " + MID.encode(), MID, DEST) == []


@pytest.fixture
def caixa(monkeypatch, smtp, registros):
    registro = {"id": str(uuid4()), "mensagem_id": MID, "destinatario": DEST, "envio_status": "aceito_smtp"}
    registros.append(registro)
    imap = MagicMock()
    imap.login.return_value = ("OK", [])
    imap.select.return_value = ("OK", [b"1"])
    conteudo = relatorio()
    def uid(comando, *args):
        if comando == "search": return "OK", [b"42"]
        if args[1] == "(RFC822.SIZE)": return "OK", [f"1 (UID 42 RFC822.SIZE {len(conteudo)})".encode()]
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
    search = imap.uid.call_args_list[0].args
    assert search[0] == "search" and '"multipart/report"' in search and f'"{MID}"' in search
    assert [c.args[0] for c in imap.uid.call_args_list] == ["search", "fetch", "fetch"]
    assert imap.uid.call_args_list[-1].args[-1] == "(BODY.PEEK[])"
    assert gravar.call_args.args[1] == "confirmada"
    imap.store.assert_not_called()
    imap.expunge.assert_not_called()
    imap.close.assert_not_called()
    imap.logout.assert_called_once()


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
    caixa[0].uid.side_effect = [("OK", [b"42"]), ("OK", [b"1 (RFC822.SIZE 999999)"])]
    with pytest.raises(email_service.FalhaEmail, match="256 KiB"):
        recibos.coletar(str(uuid4()), usuario_id="analista")
    assert caixa[0].uid.call_count == 2
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
    assert "FOR SHARE" in consultas[0] and "atualizado_em=%s" in consultas[0]
    assert "ON CONFLICT (ambiente_id,destinatario,conteudo_hash) DO NOTHING" in consultas[1]
    if cenario != "novo":
        assert "envio_status='falha'" in consultas[2]


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
            smtp.assert_not_called()
