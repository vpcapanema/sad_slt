from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.routers import complementacao as router
from api.repositories import solicitacao_complementacao_repository as repo
from api.services import complementacao_atributos_service as notification
from api.services import parecer_complementacao_service as pareceres
from api.services.session_service import SessionUser, cookie_name, create_token
from api.server import app


@pytest.fixture
def central(monkeypatch):
    user = SimpleNamespace(id=uuid4(), nome="Responsável", tipo_usuario="ADMIN")
    pedido = dict(id=uuid4(), demanda_tipo="projeto", demanda_codigo="D",
                  categorias=["dados_cadastrais"], descricao="Motivo público",
                  status="registrada", hierarquizacao_codigo=None, revisao=0,
                  parecer_tecnico="Parecer interno restrito", mensagem_gestor="Mensagem externa",
                  categorias_salvas={}, notificacao={})
    cadastro = dict(codigo="D", nome="Projeto", representante_email="teste@example.org")
    monkeypatch.setattr(router, "atomic_connection", lambda: nullcontext())
    monkeypatch.setattr(repo, "obter", lambda *a, **kw: pedido)
    monkeypatch.setattr(router.demanda_repository, "get_by_codigo", lambda code: cadastro)
    monkeypatch.setattr(router.hierarquizacao_repository, "list_all", lambda: [])
    monkeypatch.setattr(router.dominio_repository, "list_status_demanda", lambda: [
        {"codigo": code, "fase": "hierarquizacao"} for code in (
            "hierarq_em_andamento", "hierarq_aguardando_complementacao", "hierarq_suspensa",
            "hierarq_retirada", "hierarq_finalizada", "hierarq_ranqueada")
    ])
    monkeypatch.setattr(router.dominio_repository, "list_atributos_objeto", lambda: [])
    monkeypatch.setattr(router.analise_demanda_repository, "get_by_codigo", lambda code: None)
    monkeypatch.setattr(router.analise_demanda_repository, "listar_pareceres", lambda codes: [])
    monkeypatch.setattr(pareceres, "estado", lambda pedido: {
        "atualizado": True, "revisado": True, "numero": 1, "pdf_sha256": "a" * 64})
    return SimpleNamespace(user=user, pedido=pedido, cadastro=cadastro)


@pytest.mark.parametrize("profile,categoria,allowed", [
    ("ADMIN", "dados_cadastrais", True), ("ADMIN", "atributos_objeto", True),
    ("ANALISTA", "dados_cadastrais", True), ("ANALISTA", "geometria", True),
    ("ANALISTA", "atributos_objeto", False),
    ("GESTOR", "dados_cadastrais", False), ("GESTOR", "geometria", False),
    ("GESTOR", "atributos_objeto", True),
])
def test_edicao_por_modulo_e_perfil(central, profile, categoria, allowed):
    central.user.tipo_usuario = profile
    central.pedido["categorias"] = [categoria]
    assert router._pode_gerir_pedido(central.pedido, central.user) == allowed
    if not allowed:
        with pytest.raises(HTTPException) as exc:
            router._pedido_central(central.pedido["id"], central.user, editar=True)
        assert exc.value.status_code == 403


def test_operador_nao_acessa_central_nem_parecer(central):
    central.user.tipo_usuario = "OPERADOR"
    with pytest.raises(HTTPException) as exc:
        router.detalhe_solicitacao(central.pedido["id"], central.user)
    assert exc.value.status_code == 403


def test_lista_une_por_tipo_e_codigo_sem_perder_historico(central, monkeypatch):
    pedidos = [{**central.pedido, "demanda_tipo": tipo, "status": status}
               for tipo, status in [("projeto", "registrada"), ("programa", "atendida"), ("plano", "registrada")]]
    for tipo, cadastro in router.CADASTROS.items():
        monkeypatch.setattr(cadastro[0], "list_all", lambda t=tipo: [dict(codigo="D", nome=t)])
    monkeypatch.setattr(repo, "listar", lambda **kw: pedidos if kw == {"abertas": False, "interno": True} else [])
    rows = router.central_solicitacoes(central.user)
    assert [r["demanda_nome"] for r in rows] == ["projeto", "programa", "plano"]
    assert rows[1]["status"] == "atendida"
    assert not rows[1]["pode_editar"]


def body(central, **changes):
    return router.SolicitacaoEdicao(**{
        k: changes.get(k, central.pedido[k])
        for k in ("revisao", "descricao", "categorias", "parecer_tecnico", "mensagem_gestor")
    })


def test_edicao_somente_campos_negocio_e_auditoria_servidor(central, monkeypatch):
    editar = Mock(return_value=central.pedido)
    monkeypatch.setattr(repo, "editar", editar)
    result = router.editar_solicitacao(central.pedido["id"], body(central, descricao=" Corrigir cadastro "), central.user)
    campos = editar.call_args.args[1]
    assert campos["descricao"] == "Corrigir cadastro"
    assert set(campos) == {"descricao", "categorias", "parecer_tecnico", "mensagem_gestor"}
    assert editar.call_args.args[2] is central.user
    assert result["parecer_tecnico"] == central.pedido["parecer_tecnico"]


@pytest.mark.parametrize("field,value", [
    ("status", "atendida"), ("solicitado_por", str(uuid4())), ("atendido_em", "2026-10-29"),
    ("demanda_tipo", "plano"), ("hierarquizacao_codigo", "H"), ("origem", "manual"),
    ("notificacao", {}), ("historico_edicoes", []),
])
def test_auditoria_e_contexto_nao_aceitam_edicao_arbitraria(central, field, value):
    with pytest.raises(ValidationError):
        router.SolicitacaoEdicao(**body(central).model_dump(), **{field: value})


@pytest.mark.parametrize("change,status", [
    ({"revisao": 2}, 409), ({"descricao": " "}, 422),
    ({"categorias": ["atributos_demanda"]}, 422),
    ({"categorias": ["atributos_objeto"]}, 422),
])
def test_edicao_rejeita_contexto_invalido_e_concorrencia(central, change, status):
    with pytest.raises(HTTPException) as exc:
        router.editar_solicitacao(central.pedido["id"], body(central, **change), central.user)
    assert exc.value.status_code == status


def test_atendimento_preservado_e_categorias_salvas_nao_retiradas(central):
    central.pedido["categorias_salvas"] = {"dados_cadastrais": {"por": "U"}}
    with pytest.raises(HTTPException) as exc:
        router.editar_solicitacao(central.pedido["id"], body(central, categorias=["geometria"]), central.user)
    assert exc.value.status_code == 409
    central.pedido["status"] = "atendida"
    with pytest.raises(HTTPException) as exc:
        router.editar_solicitacao(central.pedido["id"], body(central), central.user)
    assert exc.value.status_code == 409


def test_respostas_atendimento_omitem_parecer_e_historico_interno(central):
    row = {**central.pedido, "historico_edicoes": [{"valores": {"parecer_tecnico": "interno"}}]}
    public = repo._publica(row)
    assert "parecer_tecnico" not in public
    assert "historico_edicoes" not in public
    assert public["descricao"] == row["descricao"]
    assert "parecer_tecnico" in row


@pytest.mark.parametrize("categoria", ["dados_cadastrais", "geometria", "atributos_objeto"])
def test_email_usa_mensagem_externa_sem_parecer_tecnico(central, monkeypatch, categoria):
    central.pedido.update(categorias=[categoria], hierarquizacao_codigo="H" if categoria == "atributos_objeto" else None)
    monkeypatch.setattr(repo, "reservar_notificacao", lambda *a: central.pedido)
    registrado = Mock()
    monkeypatch.setattr(repo, "registrar_notificacao", registrado)
    enviar = Mock(return_value=SimpleNamespace(status="aceito_smtp", mensagem="Aceito",
                  confirmacao_entrega_solicitada=True, confirmacao_leitura_solicitada=True))
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    result = notification._notificar(central.pedido, "teste@example.org", "Hierarquia", central.user)
    email = enviar.call_args.args[0]
    assert "Mensagem externa" in email.texto
    assert central.pedido["parecer_tecnico"] not in email.texto
    assert central.pedido["descricao"] not in email.texto
    assert result["status"] == "aceito_smtp"
    assert registrado.call_args.args[1]["mensagem_enviada"] == "Mensagem externa"


def test_notificar_exige_mensagem_salva(central):
    central.pedido["categorias"] = ["atributos_objeto"]
    central.pedido["mensagem_gestor"] = " "
    with pytest.raises(HTTPException) as exc:
        router.notificar_solicitacao(central.pedido["id"], central.user)
    assert exc.value.status_code == 422


def test_notificacao_reservada_nao_reenvia(central, monkeypatch):
    central.pedido["notificacao"] = {"status": "aceito_smtp"}
    monkeypatch.setattr(repo, "reservar_notificacao", lambda *a: None)
    enviar = Mock()
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    result = notification._notificar(central.pedido, "teste@example.org", "", central.user)
    assert result["status"] == "aceito_smtp"
    enviar.assert_not_called()


@pytest.mark.parametrize("profile,expected", [
    ("ADMIN", 200), ("ANALISTA", 200), ("GESTOR", 200),
    ("OPERADOR", 403), ("VISUALIZADOR", 403),
])
def test_paginas_e_api_exigem_perfil_da_central(central, profile, expected):
    user = SessionUser(str(central.user.id), "teste@example.org", f"teste_{profile}", "Teste", profile)
    with TestClient(app) as client:
        client.cookies.set(cookie_name(), create_token(user))
        for path in ("/restrict/central-pendencias/", "/restrict/solicitacao-complementacao/?id=" + str(central.pedido["id"])):
            response = client.get(path, follow_redirects=False)
            assert response.status_code == expected
        response = client.get("/api/complementacao/solicitacoes/" + str(central.pedido["id"]))
        assert response.status_code == expected
        if expected == 200:
            assert response.json()["parecer_tecnico"] == central.pedido["parecer_tecnico"]


def test_paginas_anonimas_redirecionam_e_api_exige_login():
    with TestClient(app) as client:
        assert client.get("/restrict/central-pendencias/", follow_redirects=False).status_code == 303
        assert client.get("/api/complementacao/solicitacoes").status_code == 401


def test_migracao_registrada_no_aplicador():
    from pathlib import Path
    script = Path("scripts/apply-database.ps1").read_text(encoding="utf-8")
    assert script.count('"153_central_pendencias.sql"') >= 3


def test_notificacao_concorrente_rejeita_snapshot_desatualizado(central, monkeypatch):
    monkeypatch.setattr(repo, "reservar_notificacao", lambda *a: None)
    enviar = Mock()
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    from api.exceptions import DemandaValidationError
    with pytest.raises(DemandaValidationError):
        notification._notificar(central.pedido, "teste@example.org", "", central.user)
    enviar.assert_not_called()


@pytest.fixture
def automaticos(central, monkeypatch):
    cadastros = []
    objetos = []
    hierarquia = {"codigo": "H", "status": "em_julgamento",
                  "dados_hierarquizacao": {"objetos": objetos}}
    for tipo, cadastro in router.CADASTROS.items():
        monkeypatch.setattr(cadastro[0], "list_all", lambda t=tipo: [d for d in cadastros if d["tipo"] == t])
    monkeypatch.setattr(router.hierarquizacao_repository, "list_all", lambda: [hierarquia])
    monkeypatch.setattr(router, "colunas_da_hierarquizacao", lambda h: [{"id": "custo"}, {"id": "beneficio"}])
    monkeypatch.setattr(repo, "listar", lambda **kw: [])
    return SimpleNamespace(central=central, cadastros=cadastros, objetos=objetos, hierarquia=hierarquia)


def adicionar(automaticos, codigo="D", status="hierarq_em_andamento", tipo="projeto",
              custo=None, beneficio=None, contexto=True):
    cadastro = {"codigo": codigo, "tipo": tipo, "nome": codigo, "status": status}
    automaticos.cadastros.append(cadastro)
    if contexto:
        automaticos.objetos.append({"cabecalho_objeto": {
            "codigo": codigo, "tipo_demanda": tipo,
            "atributos_fase3": {"custo": {"valor_bruto": custo}, "beneficio": {"valor_bruto": beneficio}},
        }})
    return cadastro


@pytest.mark.parametrize("tipo", ["projeto", "programa", "plano"])
def test_fase2_sem_pedido_aparece_automaticamente(automaticos, tipo):
    adicionar(automaticos, tipo=tipo)
    rows = router.central_solicitacoes(automaticos.central.user)
    assert len(rows) == 1
    assert rows[0]["id"] is None
    assert rows[0]["status"] == "nao_solicitada"
    assert rows[0]["pendencias_atributos"] == ["custo", "beneficio"]
    assert rows[0]["pode_editar"]
    assert rows[0]["demanda_tipo"] == tipo


def test_contexto_apresenta_alias_e_nome_do_status(automaticos, monkeypatch):
    adicionar(automaticos)
    automaticos.hierarquia["nome"] = "Carteira de investimentos"
    monkeypatch.setattr(router, "colunas_da_hierarquizacao", lambda h: [
        {"id": "custo", "alias": "Custo estimado", "unidade": "R$", "variavel": "Investimento necessário"}])
    monkeypatch.setattr(router.dominio_repository, "list_status_demanda", lambda: [
        {"codigo": "hierarq_em_andamento", "fase": "hierarquizacao", "nome": "Em hierarquização"}])
    row = router.preparar_solicitacao("projeto", "D", "H", automaticos.central.user)
    assert row["demanda_status_nome"] == "Em hierarquização"
    assert row["hierarquizacao_nome"] == "Carteira de investimentos"
    assert row["pendencias_detalhadas"] == [{"codigo": "custo", "nome": "Custo estimado",
        "unidade": "R$", "descricao": "Investimento necessário", "grupo": "Atributos da demanda"}]


@pytest.mark.parametrize("status", ["analise_em_avaliacao", "analise_aprovada", "analise_reprovada",
                                  "execucao_em_andamento", "execucao_concluida"])
def test_outras_fases_nunca_entram_no_bloco2(automaticos, monkeypatch, status):
    adicionar(automaticos, status=status)
    pedido = {**automaticos.central.pedido, "categorias": ["atributos_objeto"], "hierarquizacao_codigo": "H"}
    monkeypatch.setattr(repo, "listar", lambda **kw: [pedido])
    rows = router.central_solicitacoes(automaticos.central.user)
    assert all("atributos_objeto" not in row["categorias"] for row in rows)


@pytest.mark.parametrize("status", ["hierarq_em_andamento", "hierarq_aguardando_complementacao",
                                  "hierarq_finalizada", "hierarq_ranqueada", "hierarq_suspensa", "hierarq_retirada"])
def test_status_do_dominio_fase2_aparece_se_incompleto(automaticos, status):
    adicionar(automaticos, status=status)
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["demanda_status"] == status
    assert row["pode_criar"] == (status in {"hierarq_em_andamento", "hierarq_aguardando_complementacao"})


def test_atributos_completos_inclusive_zero_e_falso_saem_do_bloco2(automaticos, monkeypatch):
    adicionar(automaticos, custo=0, beneficio=False)
    pedido = {**automaticos.central.pedido, "categorias": ["atributos_objeto"], "hierarquizacao_codigo": "H"}
    monkeypatch.setattr(repo, "listar", lambda **kw: [pedido])
    assert router.central_solicitacoes(automaticos.central.user) == []


def test_espacos_contam_como_ausencia_e_pedido_aberto_nao_duplica(automaticos, monkeypatch):
    adicionar(automaticos, custo=" ", beneficio=0)
    pedido = {**automaticos.central.pedido, "categorias": ["atributos_objeto"], "hierarquizacao_codigo": "H"}
    monkeypatch.setattr(repo, "listar", lambda **kw: [pedido])
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["id"] == pedido["id"]
    assert row["pendencias_atributos"] == ["custo"]


def test_contexto_e_tipo_nao_misturam_demandas_com_mesmo_codigo(automaticos, monkeypatch):
    adicionar(automaticos, tipo="projeto")
    adicionar(automaticos, tipo="plano", custo=10, beneficio=20)
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["demanda_tipo"] == "projeto"
    segunda = {**automaticos.hierarquia, "codigo": "H2"}
    monkeypatch.setattr(router.hierarquizacao_repository, "list_all", lambda: [automaticos.hierarquia, segunda])
    rows = router._candidatos_central({(d["tipo"], d["codigo"]): d for d in automaticos.cadastros})
    assert ("projeto", "D", "H") in rows
    assert ("projeto", "D", "H2") in rows
    assert ("plano", "D", "H") not in rows


def test_sem_hierarquia_mostra_pendencia_e_impedimento(automaticos):
    adicionar(automaticos, contexto=False)
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["status"] == "nao_solicitada"
    assert not row["pode_criar"]
    assert "Vincule" in row["impedimento"]


def test_atributo_cadastral_oficial_faltante_tambem_gera_pendencia(automaticos, monkeypatch):
    cadastro = adicionar(automaticos, custo=1, beneficio=1)
    monkeypatch.setattr(router.dominio_repository, "list_atributos_objeto", lambda: [
        {"codigo": "prazo_referencia_meses", "tipos_objeto": ["projeto"]}
    ])
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["pendencias_atributos"] == ["cadastro:prazo_referencia_meses"]
    cadastro["prazo_referencia_meses"] = 0
    assert router.central_solicitacoes(automaticos.central.user) == []


def test_cadastro_em_avaliacao_sem_pedido_permite_iniciar(automaticos):
    adicionar(automaticos, status="analise_em_avaliacao")
    row, = router.central_solicitacoes(automaticos.central.user)
    assert row["categorias"] == ["dados_cadastrais", "geometria"]
    assert row["pode_criar"]


def criacao(automaticos, **changes):
    return router.SolicitacaoCriacao(
        **{"demanda_tipo": "projeto", "demanda_codigo": "D", "hierarquizacao_codigo": "H",
           "categorias": ["atributos_objeto"], "descricao": "Preencher atributos",
           "parecer_tecnico": "Uso interno", "mensagem_gestor": "Mensagem externa", **changes})


def test_criar_pedido_pela_central_sem_envio_automatico(automaticos, monkeypatch):
    cadastro = adicionar(automaticos)
    monkeypatch.setattr(router.hierarquizacao_repository, "get_by_codigo", lambda *a, **kw: automaticos.hierarquia)
    monkeypatch.setattr(router, "bloquear", lambda *a: cadastro)
    solicitar = Mock(return_value=automaticos.central.pedido)
    monkeypatch.setattr(router, "solicitar", solicitar)
    editar = Mock(return_value=automaticos.central.pedido)
    monkeypatch.setattr(repo, "editar", editar)
    enviar = Mock()
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    router.criar_solicitacao(criacao(automaticos), automaticos.central.user)
    assert solicitar.call_args.kwargs["demanda_tipo"] == "projeto"
    assert solicitar.call_args.kwargs["hierarquizacao_codigo"] == "H"
    assert editar.call_args.args[1]["mensagem_gestor"] == "Mensagem externa"
    enviar.assert_not_called()


@pytest.mark.parametrize("profile,categorias,h", [
    ("ANALISTA", ["atributos_objeto"], "H"), ("GESTOR", ["geometria"], None),
    ("OPERADOR", ["atributos_objeto"], "H"),
])
def test_criacao_respeita_perfil_e_modulo(automaticos, profile, categorias, h):
    automaticos.central.user.tipo_usuario = profile
    with pytest.raises(HTTPException) as exc:
        router.criar_solicitacao(criacao(automaticos, categorias=categorias, hierarquizacao_codigo=h),
                                 automaticos.central.user)
    assert exc.value.status_code == 403


def test_criar_revalida_pendencias_e_rejeita_pedido_existente(automaticos, monkeypatch):
    cadastro = adicionar(automaticos)
    monkeypatch.setattr(router.hierarquizacao_repository, "get_by_codigo", lambda *a, **kw: automaticos.hierarquia)
    monkeypatch.setattr(router, "bloquear", lambda *a: cadastro)
    criar = Mock()
    monkeypatch.setattr(router, "solicitar", criar)
    pedido = {**automaticos.central.pedido, "categorias": ["atributos_objeto"], "hierarquizacao_codigo": "H"}
    monkeypatch.setattr(repo, "listar", lambda **kw: [pedido])
    with pytest.raises(HTTPException) as exc:
        router.criar_solicitacao(criacao(automaticos), automaticos.central.user)
    assert exc.value.status_code == 409
    monkeypatch.setattr(repo, "listar", lambda **kw: [])
    automaticos.objetos[0]["cabecalho_objeto"]["atributos_fase3"] = {
        "custo": {"valor_bruto": 0}, "beneficio": {"valor_bruto": False}}
    with pytest.raises(HTTPException) as exc:
        router.criar_solicitacao(criacao(automaticos), automaticos.central.user)
    assert exc.value.status_code == 404
    criar.assert_not_called()


def test_preparar_contexto_por_http_e_nao_como_uuid(automaticos):
    adicionar(automaticos)
    user = SessionUser(str(automaticos.central.user.id), "teste@example.org", "teste_ADMIN", "Teste", "ADMIN")
    with TestClient(app) as client:
        client.cookies.set(cookie_name(), create_token(user))
        response = client.get("/api/complementacao/solicitacoes/contexto",
                              params={"tipo": "projeto", "codigo": "D", "hierarquizacao_codigo": "H"})
        assert response.status_code == 200
        assert response.json()["id"] is None


def test_solicitante_e_data_sao_do_cadastro_nao_da_pendencia(central):
    central.cadastro.update(representante_nome="Solicitante original", criado_em="2026-09-10T10:00:00Z")
    central.pedido.update(solicitado_nome="Autoria original não registrada", solicitado_por=None,
                          solicitado_em="2026-10-29T10:00:00Z")
    row = router._enriquecer_pedido(central.pedido, central.user, central.cadastro)
    assert row["demanda_solicitante"] == "Solicitante original"
    assert row["demanda_solicitado_em"] == "2026-09-10T10:00:00Z"
    assert row["notificacao"] == {}
    assert row["solicitado_nome"] == "Autoria original não registrada"


@pytest.mark.parametrize("salvas,status,expected,total", [
    ({}, "registrada", "nao_iniciada", 0),
    ({"geometria": {}}, "registrada", "em_atendimento", 1),
    ({"dados_cadastrais": {}, "geometria": {}}, "atendida", "cumprida", 2),
])
def test_acompanhamento_usa_atendimento_real(central, salvas, status, expected, total):
    central.pedido.update(categorias=["dados_cadastrais", "geometria"], categorias_salvas=salvas, status=status)
    row = router._enriquecer_pedido(central.pedido, central.user, central.cadastro)
    assert row["cumprimento_status"] == expected
    assert row["categorias_atendidas"] == total


def test_pdf_e_da_analise_e_nao_das_anotacoes_internas(central, monkeypatch):
    pdf = b"%PDF-1.7\nParecer existente da analise"
    monkeypatch.setattr(notification.analise_demanda_repository, "get_by_codigo",
                        lambda code: {"demanda_tipo": "projeto", "tem_parecer_pdf": True,
                                      "parecer_texto": "Texto do parecer da análise", "parecer_complemento": "Correção necessária"})
    monkeypatch.setattr(notification.analise_demanda_repository, "get_pdf", lambda code: pdf)
    monkeypatch.setattr(repo, "reservar_notificacao", lambda *a: central.pedido)
    registrado = Mock()
    monkeypatch.setattr(repo, "registrar_notificacao", registrado)
    from api.schemas.email import EmailEnvioResultado
    enviar = Mock(return_value=EmailEnvioResultado(
        id_mensagem="MID", destinatario="teste@example.org", confirmacao_leitura_solicitada=True))
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    result = notification._notificar(central.pedido, "teste@example.org", "", central.user, anexar_parecer=True)
    assert enviar.call_args.kwargs["anexo_pdf"] == ("parecer-analise-D.pdf", pdf)
    assert enviar.call_args.kwargs["solicitar_confirmacoes"] is True
    assert central.pedido["parecer_tecnico"] not in enviar.call_args.args[0].texto
    assert enviar.call_args.args[0].texto == "Texto do parecer da análise\n\nCorreção necessária"
    assert result["texto_enviado"] == enviar.call_args.args[0].texto
    assert result["assunto"] == enviar.call_args.args[0].assunto
    assert result["por_nome"] == central.user.nome
    assert result["enviado_em"]
    assert len(result["parecer_anexo"]["sha256"]) == 64
    assert result["parecer_anexo"]["tamanho"] == len(pdf)
    assert result["leitura_status"] == "sem_confirmacao"


def test_previa_nao_envia_e_revalida_conteudo(central, monkeypatch):
    analise = {"demanda_tipo": "projeto", "parecer_texto": "Parecer da análise"}
    monkeypatch.setattr(notification.analise_demanda_repository, "get_by_codigo", lambda code: analise)
    monkeypatch.setattr(notification.analise_demanda_repository, "get_pdf", lambda code: b"%PDF-1.7\nExistente")
    reservar, enviar = Mock(), Mock()
    monkeypatch.setattr(repo, "reservar_notificacao", reservar)
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    previa = router.previsualizar_notificacao(central.pedido["id"], central.user)
    assert previa["texto"] == "Parecer da análise"
    assert previa["destinatario"] == central.cadastro["representante_email"]
    reservar.assert_not_called()
    enviar.assert_not_called()
    for destino, texto in [("outro@example.org", "Parecer da análise"),
                           (central.cadastro["representante_email"], "Parecer alterado")]:
        analise["parecer_texto"] = texto
        with pytest.raises(notification.DemandaValidationError, match="mudou"):
            notification._notificar(central.pedido, destino, "", central.user,
                                    anexar_parecer=True, assinatura_previa=previa["assinatura"])
    reservar.assert_not_called()
    enviar.assert_not_called()


def test_previa_atributos_usa_mensagem_gestor(central, monkeypatch):
    central.pedido.update(categorias=["atributos_objeto"], hierarquizacao_codigo="H")
    monkeypatch.setattr(notification.analise_demanda_repository, "get_by_codigo",
                        lambda code: {"demanda_tipo": "projeto", "parecer_texto": "Parecer cadastral"})
    monkeypatch.setattr(notification.analise_demanda_repository, "get_pdf", lambda code: b"%PDF-1.7\nExistente")
    previa, _ = notification.preparar_notificacao(central.pedido, "teste@example.org", "Hierarquia")
    assert central.pedido["mensagem_gestor"] in previa["texto"]
    assert "Parecer cadastral" not in previa["texto"]


def test_sem_pdf_nao_reserva_nem_envia(central, monkeypatch):
    from api.exceptions import DemandaValidationError
    reservar, enviar = Mock(), Mock()
    monkeypatch.setattr(repo, "reservar_notificacao", reservar)
    monkeypatch.setattr(notification.email_service, "enviar", enviar)
    with pytest.raises(DemandaValidationError, match="Gere o parecer PDF"):
        notification._notificar(central.pedido, "teste@example.org", "", central.user, anexar_parecer=True)
    reservar.assert_not_called()
    enviar.assert_not_called()


def test_acao_da_central_exige_anexar_pdf(central, monkeypatch):
    notificar = Mock(return_value={"status": "aceito_smtp"})
    monkeypatch.setattr(notification, "_notificar", notificar)
    router.notificar_solicitacao(central.pedido["id"], central.user)
    assert notificar.call_args.kwargs["anexar_parecer"] is True


def test_envio_cadastral_exige_revisao_vigente(central, monkeypatch):
    notificar = Mock()
    monkeypatch.setattr(notification, "_notificar", notificar)
    monkeypatch.setattr(pareceres, "estado", lambda pedido: {"atualizado": True, "revisado": False})
    with pytest.raises(HTTPException) as exc:
        router.notificar_solicitacao(central.pedido["id"], central.user)
    assert exc.value.status_code == 409
    notificar.assert_not_called()


def test_regeneracao_preserva_original_e_nao_altera_respostas_ou_decisao(central, monkeypatch):
    original = {"demanda_tipo": "projeto", "parecer_pdf": b"%PDF-antigo",
                "parecer_texto": "Texto anterior", "decisao": None, "avaliador_nome": "Avaliador"}
    conn = Mock()
    conn.execute.return_value.fetchone.return_value = original
    monkeypatch.setattr(pareceres, "atomic_connection", lambda: nullcontext(conn))
    monkeypatch.setattr(pareceres, "bloquear", lambda *args: {**central.cadastro, "status": "analise_aguardando_complementacao"})
    monkeypatch.setattr(pareceres, "_ultima", lambda *args: None)
    pdf = Mock(return_value=b"%PDF-atual")
    monkeypatch.setattr(pareceres.analise_service, "gerar_pdf", pdf)
    pareceres.atualizar(central.pedido, central.user)
    statements = [call.args for call in conn.execute.call_args_list]
    legacy = next(args for args in statements if "'legado'" in args[0])
    assert legacy[1][3] == b"%PDF-antigo"
    update = next(args for args in statements if "UPDATE demandas.analise_demanda" in args[0])
    assert "decisao=" not in update[0] and "criterio_" not in update[0]
    assert update[1][1] == b"%PDF-atual"
    assert pdf.call_args.kwargs["decisao"] == "complementacao"
    assert str(pdf.call_args.kwargs["momento"].tzinfo) == "America/Sao_Paulo"


def test_revisao_invalida_se_resposta_ou_pdf_mudar(monkeypatch):
    pedido = {"id": uuid4(), "demanda_codigo": "D", "demanda_tipo": "projeto", "categorias": ["geometria"]}
    cadastro = {"codigo": "D", "nome": "Demanda", "status": "analise_aguardando_complementacao"}
    analise = {"criterio_competencia": True}
    pdf = b"%PDF-1.7\nVigente"
    from hashlib import sha256
    versao = {"numero": 1, "origem": "analise_vigente", "revisado_em": "2026-10-29",
              "pdf_sha256": sha256(pdf).hexdigest(),
              "fonte_sha256": pareceres._hash(pareceres._fonte(pedido, cadastro, analise))}
    monkeypatch.setattr(pareceres, "get_connection", lambda: nullcontext(Mock()))
    monkeypatch.setattr(pareceres, "_ultima", lambda *args: versao)
    monkeypatch.setattr(pareceres.analises, "get_by_codigo", lambda code: analise)
    monkeypatch.setattr(pareceres.analises, "get_pdf", lambda code: pdf)
    monkeypatch.setattr(pareceres.analise_service, "_localizar_demanda", lambda code: ("projeto", cadastro))
    assert pareceres.estado(pedido)["revisado"]
    analise["criterio_competencia"] = False
    assert not pareceres.estado(pedido)["revisado"]
    analise["criterio_competencia"] = True
    monkeypatch.setattr(pareceres.analises, "get_pdf", lambda code: b"%PDF-outro")
    assert not pareceres.estado(pedido)["revisado"]
    monkeypatch.setattr(pareceres.analises, "get_pdf", lambda code: pdf)
    monkeypatch.setattr(pareceres, "MODELO_PARECER", "modelo-novo")
    assert not pareceres.estado(pedido)["revisado"]


def test_consulta_de_confirmacoes_sem_envio_explicita(central):
    with pytest.raises(HTTPException) as exc:
        router.confirmar_notificacao(central.pedido["id"], central.user)
    assert exc.value.status_code == 409


def test_falha_imap_nao_vira_confirmacao_de_leitura(central, monkeypatch):
    from api.services import email_confirmacoes
    central.pedido["notificacao"] = {"status": "aceito_smtp"}
    monkeypatch.setattr(email_confirmacoes, "coletar_pendencia",
                        Mock(side_effect=notification.email_service.FalhaEmail("imap", "IMAP não configurado")))
    with pytest.raises(HTTPException) as exc:
        router.confirmar_notificacao(central.pedido["id"], central.user)
    assert exc.value.status_code == 502
    assert central.pedido["notificacao"] == {"status": "aceito_smtp"}


def test_confirmacoes_persistidas_sao_idempotentes_e_nao_regridem(central, monkeypatch):
    n = {"id_mensagem": "MID", "entrega_status": "confirmada", "leitura_status": "sem_confirmacao",
         "eventos": [{"tipo": "confirmada", "fonte": "hash"}]}
    conn = Mock()
    conn.execute.return_value.fetchone.return_value = {"notificacao": n}
    monkeypatch.setattr(repo, "get_connection", lambda: nullcontext(conn))
    repo.registrar_confirmacao(central.pedido["id"], "MID", "confirmada", "hash")
    assert conn.execute.call_count == 1
    repo.registrar_confirmacao(central.pedido["id"], "MID", "adiada", "outro")
    atualizado = conn.execute.call_args.args[1][0].obj
    assert atualizado["entrega_status"] == "confirmada"
    assert atualizado["leitura_status"] == "sem_confirmacao"
    repo.registrar_confirmacao(central.pedido["id"], "MID", "leitura", "mdn")
    assert conn.execute.call_args.args[1][0].obj["leitura_status"] == "confirmada"
    from api.exceptions import DemandaValidationError
    with pytest.raises(DemandaValidationError, match="notificação mudou"):
        repo.registrar_confirmacao(central.pedido["id"], "OUTRA", "leitura", "errado")


def test_finalizacao_smtp_preserva_confirmacoes_concorrentes(central, monkeypatch):
    atual = {"id_mensagem": "MID", "eventos": [{"tipo": "leitura", "fonte": "mdn"}],
             "entrega_status": "confirmada", "leitura_status": "confirmada",
             "tentativas_anteriores": [{"status": "erro", "id_mensagem": "MID-ANTERIOR"}]}
    conn = Mock()
    conn.execute.return_value.fetchone.return_value = {"notificacao": atual}
    monkeypatch.setattr(repo, "get_connection", lambda: nullcontext(conn))
    repo.registrar_notificacao(central.pedido["id"], {"id_mensagem": "MID", "status": "aceito_smtp", "eventos": []})
    atualizado = conn.execute.call_args.args[1][0].obj
    assert atualizado["eventos"] == atual["eventos"]
    assert atualizado["leitura_status"] == "confirmada"
    assert atualizado["tentativas_anteriores"] == atual["tentativas_anteriores"]
