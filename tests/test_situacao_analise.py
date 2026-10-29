from pathlib import Path
from types import SimpleNamespace

import pytest

from api.exceptions import DemandaValidationError
from api.services import analise_demanda_service as service

ADMIN_DEMANDA_JS = Path("admin/demanda.js").read_text(encoding="utf-8")
ANALISE_HTML = Path("templates/paginas/admin/analise_demanda.html").read_text(encoding="utf-8")
STATUS_COLORS_JS = Path("assets/js/status-colors.js").read_text(encoding="utf-8")
APPLY_SCRIPT = Path("scripts/apply-database.ps1").read_text(encoding="utf-8")
MIGRATION = Path("database/132_solicitacao_complementacao_demanda.sql").read_text(encoding="utf-8")


def test_botoes_de_situacao_usam_o_bloco_de_acoes_e_o_feedback():
    assert 'data-situacao="${acao.id}"' in ADMIN_DEMANDA_JS
    assert "Suspender análise" in ADMIN_DEMANDA_JS
    assert "Solicitar complementação" in ADMIN_DEMANDA_JS
    assert "Retomar análise" in ADMIN_DEMANDA_JS
    assert "StatusFeedback.sucesso" in ADMIN_DEMANDA_JS
    assert "StatusFeedback.erro" in ADMIN_DEMANDA_JS


def test_botoes_de_acao_repetem_o_preenchimento_da_legenda():
    assert 'class="btn btn-status"' in ADMIN_DEMANDA_JS
    assert 'data-status="${escapeHtml(acao.status)}"' in ADMIN_DEMANDA_JS
    assert 'data-status="${escapeHtml(dec.status)}"' in ADMIN_DEMANDA_JS
    assert 'background:${legendStrongFill(c)}' in STATUS_COLORS_JS
    assert '.btn.btn-status[data-status="${codigo}"]' in STATUS_COLORS_JS


def test_campos_da_analise_tem_id_nome_e_rotulo():
    assert 'id="painel-layer-filter-field" name="campo_filtro"' in ANALISE_HTML
    assert 'for="painel-layer-filter-field"' in ANALISE_HTML
    assert 'id="painel-layer-filter-value" name="valor_filtro"' in ANALISE_HTML
    assert 'for="toggle-records-visibility"' in ANALISE_HTML
    assert 'name="exibir_demandas"' in ANALISE_HTML
    assert 'name="arquivo-nova-geometria"' in ADMIN_DEMANDA_JS
    assert 'for="arquivo-nova-geometria"' in ADMIN_DEMANDA_JS
    assert 'id="${nome}-sim" name="${nome}"' in ADMIN_DEMANDA_JS
    assert 'for="${nome}-sim"' in ADMIN_DEMANDA_JS


def test_complementacao_tem_cor_propria_na_fase_de_analise():
    assert '"analise_aguardando_complementacao": {' in STATUS_COLORS_JS
    assert '"analise_aguardando_complementacao"' in STATUS_COLORS_JS


def test_migration_132_registra_status_retorno_e_aplicador():
    assert "analise_aguardando_complementacao" in MIGRATION
    assert "('analise_aguardando_complementacao', 'analise_em_avaliacao', FALSE)" in MIGRATION
    assert '"132_solicitacao_complementacao_demanda.sql"' in APPLY_SCRIPT
    assert "Migração 132 pendente" in APPLY_SCRIPT


def test_solicitar_complementacao_nao_exige_criterios_nem_grava_parecer(monkeypatch):
    demanda = {"codigo": "I-PRJ-1", "status": "analise_em_avaliacao", "nome": "Intervenção"}
    calls = []
    monkeypatch.setattr(service, "_localizar_demanda", lambda codigo: ("projeto", demanda))
    monkeypatch.setattr(
        service,
        "destinos_permitidos_com_handoff",
        lambda status: frozenset({"analise_aguardando_complementacao"}),
    )
    monkeypatch.setattr(
        service.demanda_service,
        "atualizar_demanda",
        lambda codigo, payload, *, usuario_id: calls.append((codigo, payload.status, usuario_id)),
    )
    monkeypatch.setattr(
        service.analise_demanda_repository,
        "upsert",
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("não deve gravar a análise")),
    )
    monkeypatch.setattr(service, "_rotulo_status", lambda codigo: "Aguardando complementação")
    user = SimpleNamespace(id="00000000-0000-0000-0000-000000000010", nome="Analista")

    from api.services import solicitacao_complementacao_service as pedidos
    from contextlib import nullcontext
    monkeypatch.setattr(pedidos, 'atomic_connection', lambda: nullcontext(None))
    monkeypatch.setattr(pedidos, 'bloquear', lambda *args: demanda)
    monkeypatch.setattr(pedidos.repo, 'listar', lambda **kw: [])
    gravados = []
    monkeypatch.setattr(pedidos.repo, 'criar', lambda *args: gravados.append(args))
    anterior, atual, rotulo = service.alterar_situacao("I-PRJ-1", "complementar", user=user,
        categorias=['dados_cadastrais'], descricao='Corrigir o nome')
    assert gravados[0][2:4] == (['dados_cadastrais'], 'Corrigir o nome')

    assert anterior == "analise_em_avaliacao"
    assert atual == "analise_aguardando_complementacao"
    assert rotulo == "Aguardando complementação"
    assert calls == [("I-PRJ-1", "analise_aguardando_complementacao", user.id)]


def test_suspender_e_retomar_usam_os_status_correspondentes(monkeypatch):
    from api.repositories import solicitacao_complementacao_repository
    monkeypatch.setattr(solicitacao_complementacao_repository, 'listar', lambda **kw: [])
    estados = {"status": "analise_em_avaliacao"}

    def localizar(codigo):
        return "programa", {"codigo": codigo, "status": estados["status"]}

    def atualizar(codigo, payload, *, usuario_id):
        estados["status"] = payload.status

    monkeypatch.setattr(service, "_localizar_demanda", localizar)
    monkeypatch.setattr(
        service,
        "destinos_permitidos_com_handoff",
        lambda status: frozenset(
            {
                "analise_suspensa",
                "analise_em_avaliacao",
                "analise_aguardando_complementacao",
            }
        ),
    )
    monkeypatch.setattr(service.programa_service, "atualizar_programa", atualizar)
    monkeypatch.setattr(service, "_rotulo_status", lambda codigo: codigo)

    service.alterar_situacao("I-PRO-1", "suspender", user=None)
    assert estados["status"] == "analise_suspensa"
    service.alterar_situacao("I-PRO-1", "retomar", user=None)
    assert estados["status"] == "analise_em_avaliacao"


def test_acao_recusada_fora_do_status_de_origem(monkeypatch):
    monkeypatch.setattr(
        service,
        "_localizar_demanda",
        lambda codigo: ("projeto", {"codigo": codigo, "status": "analise_aprovada"}),
    )
    monkeypatch.setattr(
        service.demanda_service,
        "atualizar_demanda",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("não deve alterar o status")),
    )

    with pytest.raises(DemandaValidationError):
        service.alterar_situacao("I-PRJ-1", "suspender", user=None)
