from contextlib import nullcontext
from datetime import datetime, timedelta, timezone
from threading import Event
from unittest.mock import Mock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.config import EmailSettings
from api.schemas.lembretes_ahp import FrequenciaLembretesSchema
from api.server import app
from api.services import lembretes_ahp as lembretes
from api.services.session_service import SessionUser, cookie_name, create_token


def participante(inicio):
    return {
        "ambiente_id": uuid4(), "email": "ana@example.org", "nome": "Ana",
        "modo_participacao": "publico", "token": "link-publico", "julgamento": "Rodada",
        "status": "ativa", "valido_ate": inicio + timedelta(days=100),
        "resposta_id": uuid4(), "resposta": "em_preenchimento", "iniciado_em": inicio, "enviado_em": None,
        "primeiro_convite": None, "inscrito_em": inicio, "clique_em": None,
        "prazo_alterado_em": inicio, "configurado_em": None, "faixas": None,
        "notificacoes_ativas": True, "notificacoes_alteradas_em": None,
        "ultima_tentativa": None,
    }


def brasilia(ano, mes, dia, hora, minuto=0):
    return datetime(ano, mes, dia, hora, minuto, tzinfo=ZoneInfo("America/Sao_Paulo"))


def test_padrao_distribui_dentro_dos_intervalos_e_preenchimento_tardio_pula_marcos():
    inicio = datetime(2026, 9, 1, tzinfo=timezone.utc)
    pessoa = lembretes._com_periodo(participante(inicio))
    assert lembretes._marco(pessoa, inicio + timedelta(days=50), futuro=False) is None
    agenda = lembretes._proximos(pessoa, inicio, 10)
    assert [item["fatia"] for item in agenda] == [2, 3, 3, 4, 4, 4]
    assert agenda[0]["previsto_em"] == brasilia(2026, 11, 4, 9, 30)
    for item, (de, ate) in zip(agenda, [(50, 80), (80, 95), (80, 95), (95, 100), (95, 100), (95, 100)]):
        assert de <= item["percentual"] < ate
        assert item["previsto_em"].astimezone(ZoneInfo("America/Sao_Paulo")).strftime("%H:%M") in {"09:30", "15:00", "20:00"}

    pessoa = lembretes._com_periodo({**pessoa, "iniciado_em": inicio + timedelta(days=85)})
    assert lembretes._marco(pessoa, inicio + timedelta(days=85.5), futuro=False) is None
    referencia = inicio + timedelta(days=91)
    primeiro, percentual = lembretes._marco(pessoa, referencia, futuro=False)
    assert primeiro > pessoa["iniciado_em"]
    assert (primeiro, percentual) == (agenda[2]["previsto_em"], agenda[2]["percentual"])
    pessoa["ultima_tentativa"] = primeiro
    assert lembretes._marco(pessoa, referencia, futuro=False) is None


@pytest.mark.parametrize("hora_limite,horarios", [(17, [(9, 30), (15, 0)]), (21, [(9, 30), (15, 0), (20, 0)])])
def test_periodo_de_48h_preserva_as_fracoes_e_respeita_o_prazo_na_data_compartilhada(hora_limite, horarios):
    inicio = brasilia(2026, 11, 29, hora_limite)
    prazo = inicio + timedelta(hours=48)
    pessoa = lembretes._com_periodo({**participante(inicio), "valido_ate": prazo})
    intervalos = list(lembretes._intervalos(pessoa))
    assert [f.fim - f.inicio for f in intervalos] == [
        timedelta(hours=14, minutes=24), timedelta(hours=7, minutes=12), timedelta(hours=2, minutes=24),
    ]
    _, agenda = lembretes._resumir_agenda(pessoa, inicio)
    assert agenda[-1] == {"fatia": 4, "horarios": [brasilia(2026, 12, 1, *horario) for horario in horarios],
                          "mais": False, "agendados": len(horarios), "sem_horario": 3 - len(horarios)}


def test_data_compartilhada_prioriza_o_ultimo_intervalo_sem_acumular_lembretes_no_dia_anterior():
    inicio = brasilia(2026, 11, 24, 17, 32)
    prazo = brasilia(2026, 12, 1, 23, 59)
    pessoa = lembretes._com_periodo({**participante(inicio), "valido_ate": prazo})
    esperados = [
        (2, brasilia(2026, 11, 29, 9, 30)),
        (3, brasilia(2026, 11, 30, 15)),
        (4, brasilia(2026, 12, 1, 9, 30)),
        (4, brasilia(2026, 12, 1, 15)),
        (4, brasilia(2026, 12, 1, 20)),
    ]
    agenda = lembretes._proximos(pessoa, inicio, 10)
    assert [(item["fatia"], item["previsto_em"]) for item in agenda] == esperados
    _, resumo = lembretes._resumir_agenda(pessoa, inicio)
    assert [(grupo["fatia"], grupo["agendados"], grupo["sem_horario"]) for grupo in resumo] == [
        (2, 1, 0), (3, 1, 1), (4, 3, 0),
    ]
    for item in agenda:
        horario = item["previsto_em"]
        assert lembretes._marco(pessoa, horario, futuro=False) == (horario, item["percentual"])
        pessoa["ultima_tentativa"] = horario

    pessoa["configurado_em"] = brasilia(2026, 12, 1, 12)
    assert lembretes._marco(pessoa, pessoa["configurado_em"], futuro=False) is None
    assert [item["previsto_em"] for item in lembretes._proximos(pessoa, inicio, 10)] == [horario for _, horario in esperados[-2:]]


@pytest.mark.parametrize("hora_inicio,hora_fim,esperados", [
    (8, 21, [(9, 30), (15, 0), (20, 0)]),
    (10, 21, [(15, 0), (20, 0)]),
    (16, 21, [(20, 0)]),
    (16, 20, []),
])
def test_periodo_curto_usa_horarios_distintos_e_exclui_o_horario_do_prazo(hora_inicio, hora_fim, esperados):
    inicio = brasilia(2026, 11, 26, hora_inicio)
    pessoa = lembretes._com_periodo({**participante(inicio), "valido_ate": brasilia(2026, 11, 26, hora_fim),
                                    "faixas": [{"ate": 100, "quantidade": 3}]})
    _, agenda = lembretes._resumir_agenda(pessoa, inicio)
    assert agenda[0]["horarios"] == [brasilia(2026, 11, 26, *horario) for horario in esperados]
    assert agenda[0]["sem_horario"] == 3 - len(esperados)


def test_editar_prazo_recalcula_os_proximos_sem_reemitir_lembretes_anteriores():
    inicio = datetime(2026, 9, 1, tzinfo=timezone.utc)
    pessoa = lembretes._com_periodo(participante(inicio))
    pessoa.update(valido_ate=inicio + timedelta(days=110), prazo_alterado_em=inicio + timedelta(days=90))
    agora = inicio + timedelta(days=90)
    assert lembretes._marco(pessoa, agora, futuro=False) is None
    hora, percentual = lembretes._marco(pessoa, agora, futuro=True)
    assert 80 <= percentual < 95 and hora > agora
    pessoa["configurado_em"] = hora + timedelta(minutes=1)
    assert lembretes._marco(pessoa, pessoa["configurado_em"], futuro=False) is None


@pytest.mark.parametrize("modo,etapa,codigo,esperado", [
    ("publico", "sem_resposta", "inscrito", False),
    ("publico", "em_preenchimento", "em_preenchimento", True),
    ("publico", "enviada", "resposta_enviada", False),
    ("convite", "sem_clique", "convite_enviado", False),
    ("convite", "sem_resposta", "link_acessado", True),
    ("convite", "em_preenchimento", "em_preenchimento", False),
    ("convite", "enviada", "resposta_enviada", False),
])
def test_elegibilidade_usa_etapa_do_monitoramento(modo, etapa, codigo, esperado):
    inicio = datetime(2026, 9, 1, tzinfo=timezone.utc)
    registro = participante(inicio)
    if modo == "convite":
        registro.update(modo_participacao=modo, inscrito_em=None, clique_em=inicio,
                        primeiro_convite=inicio - timedelta(days=2))
    if etapa in ("sem_clique", "sem_resposta"):
        registro.update(resposta_id=None, resposta=None, iniciado_em=None)
    else:
        registro["resposta"] = etapa
    if etapa == "sem_clique":
        registro["clique_em"] = None

    pessoa = lembretes._com_periodo(registro)
    assert pessoa["etapa_codigo"] == codigo
    assert (lembretes._bloqueio(pessoa, inicio) is None) is esperado


def test_agenda_calcula_prazos_individuais_pelas_datas_de_inscricao_ou_clique():
    inicio = datetime(2026, 9, 1, tzinfo=timezone.utc)
    outro_inicio = inicio + timedelta(days=20)
    inscrito = participante(inicio)
    convidado = {**inscrito, "modo_participacao": "convite", "inscrito_em": None, "clique_em": outro_inicio,
                "primeiro_convite": inicio, "resposta_id": None, "resposta": None, "iniciado_em": None}
    previsto_inscrito, _ = lembretes._marco(lembretes._com_periodo(inscrito), outro_inicio, futuro=True)
    previsto_convidado, _ = lembretes._marco(lembretes._com_periodo(convidado), outro_inicio, futuro=True)
    assert previsto_inscrito == brasilia(2026, 11, 4, 9, 30)
    assert previsto_convidado == brasilia(2026, 11, 11, 9, 30)


def test_notificacoes_retomam_apenas_horarios_futuros():
    inicio = datetime(2026, 9, 1, tzinfo=timezone.utc)
    retomada = inicio + timedelta(days=90)
    pessoa = lembretes._com_periodo(participante(inicio))
    pessoa["notificacoes_ativas"] = False
    assert lembretes._bloqueio(pessoa, retomada)[0] == "notificacoes_desativadas"
    pessoa.update(notificacoes_ativas=True, notificacoes_alteradas_em=retomada)
    assert lembretes._marco(pessoa, retomada, futuro=False) is None
    assert lembretes._marco(pessoa, retomada, futuro=True)[0] == brasilia(2026, 12, 6, 9, 30)


def test_rotina_nao_reserva_lembrete_com_notificacoes_desativadas(monkeypatch):
    pessoa = participante(datetime.now(timezone.utc) - timedelta(days=66))
    pessoa["notificacoes_ativas"] = False
    reservar = Mock()
    monkeypatch.setattr(lembretes.email_convites_repository, "bloquear_coleta", lambda _: nullcontext(True))
    monkeypatch.setattr(lembretes.repo, "recuperar_interrompidos", lambda: None)
    monkeypatch.setattr(lembretes.repo, "participantes", lambda **_: [pessoa])
    monkeypatch.setattr(lembretes.repo, "reservar", reservar)
    lembretes.processar(Event(), "https://sicard.example.org", "example.org")
    reservar.assert_not_called()


@pytest.mark.parametrize("faixas", [
    [{"ate": 50, "quantidade": 1}, {"ate": 100, "quantidade": 1}],
    [{"ate": 50, "quantidade": 2}, {"ate": 100, "quantidade": 1}],
    [{"ate": 100, "quantidade": 0}, {"ate": 100, "quantidade": 1}],
    [{"ate": 90, "quantidade": 1}],
    [{"ate": 100, "quantidade": 1.5}],
    [{"ate": 40, "quantidade": 0}, {"ate": 100, "quantidade": 1}],
    [{"ate": 60, "quantidade": 0}, {"ate": 75, "quantidade": 1}, {"ate": 100, "quantidade": 2}],
])
def test_frequencia_rejeita_repeticao_reducao_e_intervalos_invalidos(faixas):
    with pytest.raises(ValidationError):
        FrequenciaLembretesSchema(faixas=faixas)


@pytest.mark.parametrize("primeiro_limite", [50, 64.5])
def test_frequencia_aceita_intervalos_iguais_ou_decrescentes(primeiro_limite):
    configuracao = FrequenciaLembretesSchema(faixas=[
        {"ate": primeiro_limite, "quantidade": 1}, {"ate": 100, "quantidade": 4},
    ])
    assert [faixa.quantidade for faixa in configuracao.faixas] == [1, 4]


@pytest.mark.parametrize("modo,mudanca", [
    ("publico", "resposta"), ("publico", "prazo"), ("publico", "inscricao"), ("publico", None),
    ("convite", "preenchimento"), ("convite", None), ("convite", "notificacoes"),
])
def test_worker_confere_elegibilidade_depois_da_cadencia_e_so_reserva_uma_vez(monkeypatch, modo, mudanca):
    inicio = brasilia(2026, 9, 1, 8)
    pessoa = participante(inicio)
    if modo == "convite":
        pessoa.update(modo_participacao=modo, clique_em=pessoa["inscrito_em"], inscrito_em=None,
                      resposta_id=None, resposta=None, iniciado_em=None)
    repositorio = lembretes.repo
    previsto = lembretes._proximos(lembretes._com_periodo(pessoa), inicio, 1)[0]["previsto_em"]
    agora = previsto + timedelta(minutes=1)

    class Relogio(datetime):
        @classmethod
        def now(cls, tz=None):
            return agora.astimezone(tz)

    monkeypatch.setattr(lembretes, "datetime", Relogio)
    finalizados, reservados = [], set()
    conn = Mock()
    conn.send_message.return_value = {}
    config = EmailSettings(habilitado=True, remetente="sicard@example.org")
    monkeypatch.setattr(lembretes.email_convites_repository, "bloquear_coleta", lambda chave: nullcontext(True))
    monkeypatch.setattr(repositorio, "recuperar_interrompidos", lambda: None)
    monkeypatch.setattr(repositorio, "participantes", lambda *args, **kwargs: [pessoa])
    monkeypatch.setattr(repositorio, "finalizar", lambda *args: finalizados.append(args))
    monkeypatch.setattr(lembretes.email_service, "_config", lambda: config)
    monkeypatch.setattr(lembretes.email_service, "_conexao", lambda configuracao: nullcontext(conn))

    def reservar(ambiente, email, previsto, percentual, identificador):
        if previsto in reservados:
            return False
        reservados.add(previsto)
        pessoa["ultima_tentativa"] = previsto
        return True

    def esperar(_config):
        if mudanca == "resposta":
            pessoa["resposta"] = "enviada"
        if mudanca == "prazo":
            pessoa["valido_ate"] = agora
        if mudanca == "inscricao":
            pessoa["inscrito_em"] = None
        if mudanca == "preenchimento":
            pessoa.update(resposta_id=uuid4(), resposta="em_preenchimento", iniciado_em=agora)
        if mudanca == "notificacoes":
            pessoa["notificacoes_ativas"] = False

    monkeypatch.setattr(repositorio, "reservar", reservar)
    monkeypatch.setattr(lembretes.email_service, "_aguardar_cadencia", esperar)
    lembretes.processar(Event(), "https://sicard.example.org/sicard", "example.org")
    assert not reservados
    agora = previsto + timedelta(seconds=29)
    lembretes.processar(Event(), "https://sicard.example.org/sicard", "example.org")
    if mudanca is None:
        lembretes.processar(Event(), "https://sicard.example.org/sicard", "example.org")
        conn.send_message.assert_called_once()
        conteudo = conn.send_message.call_args.args[0].get_content()
        if modo == "publico":
            assert "/sicard/public/analise-multicriterio/participar/link-publico/" in conteudo
        else:
            assert "/sicard/public/analise-multicriterio/formulario-comparacao-pareada/link-publico/?c=" in conteudo
            assert "chave individual recebida no convite original" in conteudo
        assert finalizados[0][1] == "aceito_smtp"
    else:
        conn.send_message.assert_not_called()
        assert finalizados[0][1] == "cancelado"
    assert len(reservados) == len(finalizados) == 1


def test_central_requer_sessao_e_restringe_salvamento_ao_operador_mad(monkeypatch):
    cliente = TestClient(app)
    url = f"/api/ahp/comparacao-colaborativa/ambientes/{uuid4()}/lembretes"
    dados = {"faixas": [{"ate": 100, "quantidade": 1}]}
    assert cliente.get(url).status_code == 401
    assert cliente.get("/restrict/analise-multicriterio/central-lembretes", follow_redirects=False).status_code == 303
    salvar = Mock(return_value={"padrao": False})
    monkeypatch.setattr(lembretes, "configurar", salvar)
    for perfil, esperado in [("ANALISTA", 403), ("GESTOR", 200)]:
        token = create_token(SessionUser(str(uuid4()), "teste@example.org", f"teste_{perfil}", "Teste", perfil))
        assert cliente.put(url, json=dados, headers={"Authorization": f"Bearer {token}"}).status_code == esperado
    salvar.assert_called_once()
    cliente.cookies.set(cookie_name(), token)
    pagina = cliente.get("/restrict/analise-multicriterio/central-lembretes", headers={"X-Forwarded-Prefix": "/sicard"})
    assert pagina.status_code == 200
    assert 'href="/sicard/restrict/analise-multicriterio/central-julgamentos"' in pagina.text
    assert 'src="/sicard/assets/js/paginas/ami-lembretes.js' in pagina.text


def test_lista_inclui_julgamento_com_frequencia_padrao_sem_registro(monkeypatch):
    quando = datetime(2026, 11, 25, tzinfo=timezone.utc)
    monkeypatch.setattr(lembretes.repo, "configuracoes", lambda: [
        {"id": uuid4(), "nome": "Padrão", "modo_participacao": "publico", "faixas": None,
         "configurado_em": None, "notificacoes_ativas": True},
        {"id": uuid4(), "nome": "Personalizado", "modo_participacao": "convite",
         "faixas": [{"ate": 100, "quantidade": 3}], "configurado_em": quando, "notificacoes_ativas": False},
    ])
    cliente = TestClient(app)
    url = "/api/ahp/comparacao-colaborativa/lembretes"
    assert cliente.get(url).status_code == 401
    token = create_token(SessionUser(str(uuid4()), "teste@example.org", "teste_ANALISTA", "Teste", "ANALISTA"))
    resposta = cliente.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resposta.status_code == 200
    padrao, personalizado = resposta.json()
    assert [padrao["notificacoes_ativas"], personalizado["notificacoes_ativas"]] == [True, False]
    assert [padrao["modo_participacao"], personalizado["modo_participacao"]] == ["publico", "convite"]
    assert (padrao["padrao"], padrao["total_faixas"], padrao["total_lembretes"], padrao["configurado_em"]) == (True, 4, 6, None)
    assert (personalizado["padrao"], personalizado["total_faixas"], personalizado["total_lembretes"]) == (False, 1, 3)


def test_notificacoes_exigem_gestor_e_booleano_estrito(monkeypatch):
    cliente = TestClient(app)
    ident = str(uuid4())
    url = f"/api/ahp/comparacao-colaborativa/ambientes/{ident}/lembretes/notificacoes"
    definir = Mock(return_value={"configuracao": {"notificacoes_ativas": False}})
    monkeypatch.setattr(lembretes, "definir_notificacoes", definir)
    for perfil, esperado in [("ANALISTA", 403), ("GESTOR", 200)]:
        token = create_token(SessionUser(str(uuid4()), "teste@example.org", f"teste_{perfil}", "Teste", perfil))
        resposta = cliente.put(url, json={"notificacoes_ativas": False}, headers={"Authorization": f"Bearer {token}"})
        assert resposta.status_code == esperado
    assert resposta.json()["configuracao"]["notificacoes_ativas"] is False
    definir.assert_called_once_with(ident, False)
    invalida = cliente.put(url, json={"notificacoes_ativas": "false"}, headers={"Authorization": f"Bearer {token}"})
    assert invalida.status_code == 422


def test_agenda_agrupa_horarios_por_intervalo_e_simula_sem_gravar(monkeypatch):
    agora = datetime.now(timezone.utc)
    pessoa = participante(agora - timedelta(days=60))
    pessoa.update(ultimo_envio=None, estado_ultima_tentativa=None)
    ambiente = {"id": pessoa["ambiente_id"], "nome": "Rodada", "modo_participacao": "publico", "valido_ate": pessoa["valido_ate"],
                "faixas": None, "configurado_em": None, "notificacoes_ativas": True}
    monkeypatch.setattr(lembretes.repo, "ambiente", lambda _: ambiente)
    monkeypatch.setattr(lembretes.repo, "participantes", lambda *_args, **_kw: [pessoa])
    monkeypatch.setattr(lembretes.repo, "historico", lambda *_: [])
    gravar = Mock()
    monkeypatch.setattr(lembretes.repo, "configurar", gravar)
    id_rodada = str(ambiente["id"])
    dados = lembretes.listar(id_rodada)
    assert dados["horarios_oficiais"] == ["09:30", "15:00", "20:00"]
    assert [intervalo["ate"] for intervalo in dados["faixas_padrao"]] == [50, 80, 95, 100]
    agenda = dados["participantes"][0]["agenda_fatias"]
    assert [(grupo["fatia"], len(grupo["horarios"])) for grupo in agenda] == [(2, 1), (3, 2), (4, 3)]
    data_esperada = (pessoa["inscrito_em"] + timedelta(days=65)).astimezone(ZoneInfo("America/Sao_Paulo"))
    assert agenda[0]["horarios"] == [data_esperada.replace(hour=9, minute=30, second=0, microsecond=0)]

    rascunho = FrequenciaLembretesSchema(faixas=[{"ate": 60, "quantidade": 0}, {"ate": 100, "quantidade": 1}])
    previa = lembretes.listar(id_rodada, rascunho)["participantes"][0]["agenda_fatias"]
    assert previa[0]["fatia"] == 2
    assert previa[0]["horarios"] == [data_esperada.replace(hour=9, minute=30, second=0, microsecond=0) + timedelta(days=15)]
    detalhe = lembretes.historico(id_rodada, pessoa["email"], simulacao=rascunho)
    assert detalhe["agenda"][0]["fatia"] == 2
    assert detalhe["agenda"][0]["previsto_em"] == previa[0]["horarios"][0]
    assert detalhe["agenda_fatias"] == previa
    cliente = TestClient(app)
    url = f"/api/ahp/comparacao-colaborativa/ambientes/{id_rodada}/lembretes/previa"
    for perfil, esperado in [("ANALISTA", 403), ("GESTOR", 200)]:
        token = create_token(SessionUser(str(uuid4()), "teste@example.org", f"teste_{perfil}", "Teste", perfil))
        resposta = cliente.post(url, json=rascunho.model_dump(), headers={"Authorization": f"Bearer {token}"})
        assert resposta.status_code == esperado
        if esperado == 200:
            assert resposta.json()["participantes"][0]["agenda_fatias"][0]["fatia"] == 2
    assert pessoa["faixas"] is None
    gravar.assert_not_called()


def test_status_de_notificacao_distingue_resposta_entregue_da_etapa(monkeypatch):
    agora = datetime.now(timezone.utc)
    pessoa = participante(agora - timedelta(days=10))
    pessoa.update(resposta="enviada", enviado_em=agora - timedelta(days=2), instituicao="Instituto Alfa",
                 ultimo_envio=None, estado_ultima_tentativa=None)
    ambiente = {"id": pessoa["ambiente_id"], "nome": pessoa["julgamento"], "modo_participacao": "publico",
                "valido_ate": pessoa["valido_ate"], "faixas": None, "configurado_em": agora, "notificacoes_ativas": True}
    monkeypatch.setattr(lembretes.repo, "ambiente", lambda _: ambiente)
    monkeypatch.setattr(lembretes.repo, "participantes", lambda *_args, **_kwargs: [pessoa])
    registro = lembretes.listar(str(ambiente["id"]))["participantes"][0]
    assert registro["etapa_rotulo"] == "Resposta enviada"
    assert registro["codigo"] == "respondida"
    assert registro["situacao"] == "Não se aplica"
    assert registro["instituicao"] == "Instituto Alfa"
    assert registro["resposta_enviada_em"] == pessoa["enviado_em"]
    assert registro["agenda_fatias"] == []
