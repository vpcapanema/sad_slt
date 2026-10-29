from contextlib import contextmanager, nullcontext
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import Mock, AsyncMock

import pytest

from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO
from api.exceptions import DemandaValidationError
from api.repositories import hierarquizacao_repository as hier_repo
from api.services import atributos_hierarquizacao as atributos
from api.services import complementacao_atributos_service as service
from api.services import hierarquizacao_service
from api.services import solicitacao_complementacao_service as solicitacoes


@pytest.fixture(autouse=True)
def sem_configurador_externo(monkeypatch):
    monkeypatch.setattr(atributos, "_colunas_configuradas", AsyncMock(return_value=[]))


def cadastro():
    return {
        "id": "00000000-0000-0000-0000-000000000001", "codigo": "D",
        "status": "analise_aprovada", "maturidade": "Nível 1",
        "capex_estimado": 0, "base_estimativa_capex": "Nível 2",
        "prazo_referencia_meses": 0, "base_estimativa_prazo": "Nível 3",
        "representante_email": "interessado@example.org",
    }


def hierarquia():
    return {
        "codigo": "H", "nome": "Rodada", "status": "em_julgamento",
        "dados_hierarquizacao": {
            "cabecalho_grupo": {"matriz_premissas_criterios": [
                {"Etapa": "Priorização", "Critério": "Custo", "Métrica": "Custo", "Unidade": "R$"}
            ]},
            "objetos": [{"cabecalho_objeto": {
                "codigo": "D", "nome": "Demanda", "tipo_demanda": "projeto",
                "demanda_id": cadastro()["id"], "atributos_fase3": {"custo": {
                    "valor_bruto": None, "origem": "gestor",
                }},
            }}],
        },
    }


def dominios():
    return [{"codigo": c, "tipos_objeto": ["projeto", "programa", "plano"]}
            for c in sorted(atributos.ATRIBUTOS_CADASTRAIS)]


def test_pendencias_distinguem_vazio_zero_false_e_tipo_de_demanda():
    cab = {"tipo_demanda": "projeto", "atributos_fase3": {
        "zero": {"valor_bruto": 0}, "nao": {"valor_bruto": False}, "vazio": {"valor_bruto": "  "},
        "legado": {"valor_bruto": None, "valor": 0},
    }}
    atributos.atualizar_cadastrais(cab, cadastro())
    assert atributos.pendencias(cab, [
        {"id": "zero"}, {"id": "nao"}, {"id": "vazio", "mandatorio": False}, {"id": "legado"}
    ]) == ["vazio"]
    plano = {"tipo_demanda": "plano"}
    c = cadastro()
    c.pop("capex_estimado")
    c.pop("base_estimativa_capex")
    atributos.atualizar_cadastrais(plano, c)
    assert atributos.pendencias(plano, []) == []


def test_colunas_estao_vinculadas_a_matriz_e_dinamicos_nascem_vazios():
    row = hierarquia()
    row["config_criterios"] = [{"id": "estranho"}]
    cols = atributos.colunas_da_hierarquizacao(row)
    assert [c["id"] for c in cols] == ["custo"]
    slots = hierarquizacao_service._atributos_fase3(cols, cadastro())
    assert slots["custo"]["valor_bruto"] is None
    assert slots["custo"]["origem"] == "gestor"


def test_vinculos_cadastrais_nao_exigem_slots_ocultos_nem_duplicam_coleta():
    cab = {"tipo_demanda": "projeto"}
    colunas = [{"id": codigo} for codigo in atributos.VINCULOS_CADASTRAIS]
    cab["atributos_fase3"] = hierarquizacao_service._atributos_fase3(colunas, {})
    assert atributos.pendencias(cab, colunas) == [
        "cadastro:" + c for c in sorted(atributos.ATRIBUTOS_CADASTRAIS)
    ]
    atributos.atualizar_cadastrais(cab, cadastro())
    assert atributos.pendencias(cab, colunas) == []
    for codigo, nativo in atributos.VINCULOS_CADASTRAIS.items():
        slot = cab["atributos_fase3"][codigo]
        assert slot["origem"] == "cadastro"
        assert slot["valor_bruto"] == cab["atributos"]["atributos_cadastrais"][nativo]


def test_edicao_descarta_resultados_calculados_da_fase3_e_sintese():
    dados = hierarquia()["dados_hierarquizacao"]
    dados["objetos"][0]["hierarquizacao"] = {
        "fase_3": {"executada": True, "score_fase3": 0.75},
        "sintese": {"executada": True, "score_final": 0.5},
    }
    dados["cabecalho_grupo"]["relatorios"] = {
        "fase_3": {"objetos_avaliados": 1}, "sintese": {"objetos_ranqueados": 1},
    }
    atributos.remover_resultados_fase3(dados)
    hierarquia_obj = dados["objetos"][0]["hierarquizacao"]
    assert hierarquia_obj["fase_3"]["executada"] is False
    assert hierarquia_obj["fase_3"]["score_fase3"] is None
    assert hierarquia_obj["fase_3"]["ranking_fase3"] is None
    assert hierarquia_obj["sintese"] == {
        "executada": False, "score_final": None, "posicao_final": None,
    }
    assert dados["cabecalho_grupo"]["relatorios"] == {}


@pytest.mark.parametrize("situacao", ["coleta_aberta", "score_desatualizado"])
def test_sintese_bloqueia_coleta_aberta_ou_resultado_obsoleto(monkeypatch, situacao):
    from api.schemas.hierarquizacao import HierarquizacaoSinteseSchema
    row = hierarquia()
    obj = row["dados_hierarquizacao"]["objetos"][0]
    if situacao == "coleta_aberta":
        obj["cabecalho_objeto"]["complementacao_atributos"] = {"concluida": False}
    else:
        obj["hierarquizacao"] = {"fase_3": {"desatualizado": {"por": "atributos_fase3"}}}
    monkeypatch.setattr(hierarquizacao_service, "_carregar", lambda codigo: row)
    with pytest.raises(DemandaValidationError, match="recalcule a Fase 3"):
        hierarquizacao_service.sintetizar("H", HierarquizacaoSinteseSchema())


@pytest.mark.parametrize("dinamico_pendente", [False, True])
def test_cadastro_hierarquia_preserva_nativos_e_define_status_atomicamente(monkeypatch, dinamico_pendente):
    row, oficial = hierarquia(), cadastro()
    cab = row["dados_hierarquizacao"]["objetos"][0]["cabecalho_objeto"]
    cab["atributos_fase3"]["custo"]["valor_bruto"] = None if dinamico_pendente else 0
    cab["atributos"] = {"capex_estimado": 999}
    conn, capturado, atualizacoes = Mock(), {}, []

    def executar(query, params):
        texto = query.as_string()
        if texto.startswith("SELECT *"):
            return SimpleNamespace(fetchall=lambda: [deepcopy(oficial)])
        if texto.startswith("UPDATE"):
            atualizacoes.append(params)
            return Mock()
        assert texto.startswith("INSERT INTO")
        capturado.update(params)
        return SimpleNamespace(fetchone=lambda: {"id": "hierarquia"})

    conn.execute.side_effect = executar
    monkeypatch.setattr(hier_repo, "get_connection", lambda: nullcontext(conn))
    monkeypatch.setattr(hier_repo, "get_by_id", lambda id: row)
    monkeypatch.setattr(service.dominio_repository, "list_atributos_objeto", dominios)
    hier_repo.insert(row, status_transicao={
        "ids": [oficial["id"]], "tabela": ("demandas", "projeto"),
        "de": "analise_aprovada", "para": STATUS_EM_HIERARQUIZACAO,
    })
    gravado = capturado["dados_hierarquizacao"].obj["objetos"][0]["cabecalho_objeto"]
    assert gravado["atributos"]["capex_estimado"] == 0
    assert gravado["atributos"]["atributos_cadastrais"]["maturidade_objeto"] == "Nível 1"
    esperado = STATUS_HIERARQUIZACAO_COMPLEMENTACAO if dinamico_pendente else STATUS_EM_HIERARQUIZACAO
    assert gravado["status"] == esperado
    assert gravado["complementacao_atributos"]["concluida"] is (not dinamico_pendente)
    assert atualizacoes == [(esperado, oficial["id"])]
    conn.commit.assert_called_once()


def test_falha_no_insert_nao_persiste_mudanca_do_status(monkeypatch):
    oficial, conn = cadastro(), Mock()
    anterior = deepcopy(oficial)

    def executar(query, params):
        texto = query.as_string()
        if texto.startswith("SELECT *"):
            return SimpleNamespace(fetchall=lambda: [deepcopy(oficial)])
        if texto.startswith("UPDATE"):
            oficial["status"] = params[0]
            return Mock()
        raise RuntimeError("insert recusado")

    @contextmanager
    def conexao():
        try:
            yield conn
        except RuntimeError:
            oficial.update(anterior)
            conn.rollback()
            raise

    conn.execute.side_effect = executar
    monkeypatch.setattr(hier_repo, "get_connection", conexao)
    monkeypatch.setattr(service.dominio_repository, "list_atributos_objeto", dominios)
    with pytest.raises(RuntimeError, match="insert recusado"):
        hier_repo.insert(hierarquia(), status_transicao={
            "ids": [oficial["id"]], "tabela": ("demandas", "projeto"),
            "de": "analise_aprovada", "para": STATUS_EM_HIERARQUIZACAO,
        })
    assert oficial == anterior
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()


@pytest.fixture
def notificacao(monkeypatch):
    row, oficial, pedidos, emails = hierarquia(), cadastro(), [], []
    oficial["status"] = STATUS_HIERARQUIZACAO_COMPLEMENTACAO
    usuario = SimpleNamespace(id="usuario", nome="Analista", tipo_usuario="ANALISTA")
    monkeypatch.setattr(service, "atomic_connection", lambda: nullcontext(Mock()))
    monkeypatch.setattr(service, "bloquear", lambda *args: oficial)
    monkeypatch.setattr(service.hierarquizacao_repository, "get_by_codigo", lambda *a, **kw: row)
    monkeypatch.setattr(service.hierarquizacao_repository, "update", lambda codigo, data: row.update(data))
    monkeypatch.setattr(service.dominio_repository, "list_atributos_objeto", dominios)
    monkeypatch.setattr(service.pedidos, "listar", lambda **kw: pedidos)
    monkeypatch.setattr(service.pedidos, "obter", lambda id: pedidos[0])

    def criar(codigo, **kw):
        p = {"id": "pedido", "demanda_codigo": codigo, "hierarquizacao_codigo": "H",
             "descricao": kw["descricao"], "notificacao": {}, "status": "registrada"}
        pedidos.append(p)
        return p

    def reservar(id, dados):
        if pedidos[0]["notificacao"].get("status") in {"aceito_smtp", "indeterminado", "enviando"}:
            return None
        pedidos[0]["notificacao"] = deepcopy(dados)
        return pedidos[0]

    def enviar(dados, **kw):
        emails.append((dados, kw))
        return SimpleNamespace(status="aceito_smtp", mensagem="Aceita no SMTP, entrega não confirmada.",
                               confirmacao_entrega_solicitada=False, confirmacao_leitura_solicitada=True)

    monkeypatch.setattr(service, "solicitar", criar)
    monkeypatch.setattr(service.pedidos, "reservar_notificacao", reservar)
    monkeypatch.setattr(service.pedidos, "registrar_notificacao", lambda id, dados: pedidos[0].update(notificacao=deepcopy(dados)))
    monkeypatch.setattr(service.email_service, "enviar", enviar)
    return SimpleNamespace(row=row, cadastro=oficial, user=usuario, pedidos=pedidos, emails=emails)


def test_solicitar_agora_envia_ao_representante_oficial_e_nao_duplica(notificacao):
    n = notificacao
    resultado = service.solicitar_hierarquizacao("H", descricao="Preencher atributos", user=n.user)
    assert len(n.pedidos) == len(n.emails) == 1
    assert str(n.emails[0][0].destinatario) == n.cadastro["representante_email"]
    assert "não reabre" in n.emails[0][0].texto
    assert resultado["envios"][0]["status"] == "aceito_smtp"
    assert "não confirma entrega" in resultado["mensagem"]
    service.solicitar_hierarquizacao("H", descricao="Outra tentativa", user=n.user)
    assert len(n.pedidos) == len(n.emails) == 1


@pytest.mark.parametrize("falha,status", [("conexao", "erro"), ("resultado_indeterminado", "indeterminado")])
def test_falhas_smtp_sao_explicitas_sem_perder_pedido(notificacao, monkeypatch, falha, status):
    n = notificacao
    def falhar(*args, **kw):
        raise service.email_service.FalhaEmail(falha, "Falha comprovada no teste")
    monkeypatch.setattr(service.email_service, "enviar", falhar)
    resultado = service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert len(n.pedidos) == 1
    assert resultado["envios"][0]["status"] == status
    assert resultado["envios"][0]["detalhe"] == "Falha comprovada no teste"
    if status == "indeterminado":
        service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
        assert n.pedidos[0]["notificacao"]["status"] == "indeterminado"


def test_email_ausente_registra_pedido_sem_falso_sucesso(notificacao):
    n = notificacao
    n.cadastro["representante_email"] = None
    resultado = service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert len(n.pedidos) == 1 and not n.emails
    assert resultado["envios"][0]["status"] == "sem_destinatario"


def test_smtp_so_comeca_depois_da_confirmacao_do_pedido(notificacao, monkeypatch):
    n = notificacao
    estado = {"em_transacao": False, "confirmada": False}

    @contextmanager
    def atomic():
        estado["em_transacao"] = True
        yield Mock()
        estado.update(em_transacao=False, confirmada=True)

    enviar = service.email_service.enviar
    def conferir(*args, **kwargs):
        assert estado == {"em_transacao": False, "confirmada": True}
        assert n.pedidos
        return enviar(*args, **kwargs)

    monkeypatch.setattr(service, "atomic_connection", atomic)
    monkeypatch.setattr(service.email_service, "enviar", conferir)
    service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert len(n.emails) == 1


def test_interrupcao_apos_reserva_nao_reenvia_automaticamente(notificacao, monkeypatch):
    n = notificacao
    def interromper(*args, **kwargs):
        raise RuntimeError("interrupcao depois da reserva")
    monkeypatch.setattr(service.email_service, "enviar", interromper)
    with pytest.raises(RuntimeError, match="interrupcao"):
        service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    enviar = Mock()
    monkeypatch.setattr(service.email_service, "enviar", enviar)
    resposta = service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert resposta["envios"][0]["status"] == "enviando"
    enviar.assert_not_called()


def test_sem_pendencias_nao_cria_pedido_nem_envia_email(notificacao):
    n = notificacao
    n.row["dados_hierarquizacao"]["objetos"][0]["cabecalho_objeto"]["atributos_fase3"]["custo"]["valor_bruto"] = 0
    resultado = service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert resultado["envios"] == resultado["solicitacoes"] == []
    assert not n.emails and not n.pedidos


def test_operador_nao_pode_disparar_solicitacoes(notificacao):
    n = notificacao
    n.user.tipo_usuario = "OPERADOR"
    with pytest.raises(DemandaValidationError):
        service.solicitar_hierarquizacao("H", descricao="Preencher", user=n.user)
    assert not n.pedidos and not n.emails


def test_status_pendente_nao_pode_ser_forcado_no_patch():
    for origem, destino in [
        (STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO),
        (STATUS_HIERARQUIZACAO_COMPLEMENTACAO, STATUS_EM_HIERARQUIZACAO),
    ]:
        with pytest.raises(DemandaValidationError, match="fluxo de complementação"):
            solicitacoes.validar_mudanca_status("projeto", "D", origem, destino)


def test_migracao_status_e_notificacao_estao_ligadas_ao_aplicador():
    from pathlib import Path
    sql = Path("database/146_dom_status_demanda_complementacao_hierarquizacao.sql").read_text(encoding="utf-8")
    aplicador = Path("scripts/apply-database.ps1").read_text(encoding="utf-8")
    assert '"146_dom_status_demanda_complementacao_hierarquizacao.sql"' in aplicador
    assert "Migration 146 pendente" in aplicador
    assert "ADD COLUMN IF NOT EXISTS notificacao" in sql
    assert "status_origem, status_destino, via_aprovar" in sql
    assert "'hierarq_aguardando_complementacao','hierarq_em_andamento',TRUE" in sql
