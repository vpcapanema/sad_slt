from __future__ import annotations

from fastapi.testclient import TestClient

from api.exceptions import DatabaseUnavailableError
from api.server import app
from api.services import demanda_service
from api.services.session_service import SessionUser, cookie_name, create_token


def test_all_router_modules_are_exposed_by_openapi() -> None:
    paths = TestClient(app).get("/openapi.json").json()["paths"]

    expected_prefixes = {
        "/api/auth/",
        "/api/complementacao/",
        "/api/demandas",
        "/api/dominios/",
        "/api/geo/",
        "/api/geoespacial/",
        "/api/ahp/configuracoes",
        "/api/ahp/comparacao-colaborativa/",
        "/api/ahp/hierarquizacoes",
        "/api/ahp/objetos",
        "/api/ahp/universo/",
        "/api/painel/",
        "/api/planos",
        "/api/programas",
    }

    for prefix in expected_prefixes:
        assert any(path.startswith(prefix) for path in paths), prefix


def test_canonical_pages_are_available() -> None:
    client = TestClient(app)
    canonical_pages = (
        "/public/",
        "/public/cadastro/",
        "/public/ahp/colaborativa/",
        "/public/analise-multicriterio/token-de-teste/",
        "/restrict/analise-multicriterio/",
        "/restrict/analise-multicriterio/julgamentos/22222222-2222-2222-2222-222222222222/",
        "/restrict/ahp/nomes/",
        "/restrict/hierarquizacao/processos/nova/",
        "/restrict/geoespacial/",
        "/restrict/geoespacial/bancada/",
        "/restrict/complementacao/",
    )

    for path in canonical_pages:
        assert client.get(path).status_code == 200, path


def test_indice_organiza_analise_multicriterio_no_mad_e_recursos_no_geoprocessamento() -> None:
    html = TestClient(app).get("/restrict/").text

    assert "/restrict/analise-multicriterio/?modo=julgamentos" in html
    assert "/restrict/analise-multicriterio/?modo=espaco" in html
    assert "/restrict/analise-multicriterio/?modo=formulario" in html
    trecho_mad = html.split('id="group-mad"', 1)[1].split('id="group-resultados"', 1)[0]
    trecho_geo = html.split('id="group-geoprocessamento"', 1)[1].split('id="group-ahp-restrict"', 1)[0]
    assert "Hierarquização e Ranking" in trecho_geo
    assert "Produtos geoespaciais" in trecho_geo
    assert trecho_geo.index("Hierarquização e Ranking") < trecho_geo.index("Central geoespacial")
    assert trecho_mad.index("/restrict/hierarquizacao/processos/") < trecho_mad.index("?modo=espaco") < trecho_mad.index("?modo=julgamentos")
    assert "Central de julgamentos" in trecho_mad
    assert "Central de respostas" in trecho_mad
    assert "Módulo de apoio à decisão, análise multicritérios interativa e hierarquização colaborativa." in trecho_mad
    assert "/restrict/geoespacial/visualizador-insumos-geoespaciais/" in trecho_geo
    assert "/restrict/geoespacial/gerador-risco-restricao/" in trecho_geo
    assert "/restrict/geoespacial/gerador-favorabilidade/" in trecho_geo
    assert "/restrict/geoespacial/configuracao-risco-restricao/" in trecho_geo
    assert "/restrict/geoespacial/produtos/" in trecho_geo
    assert "/restrict/geoespacial/bancada/" in trecho_geo
    assert "/restrict/geoespacial/configurador-ajuste/" in trecho_geo
    assert "Análise Multicritério Interativa" not in html
    assert html.index('class="restrict-platform-row restrict-platform-row--ahp"') < html.index('id="group-ahp-restrict"') < html.index('id="group-administracao"')
    assert html.count('class="platform-tile ') == html.count('target="_blank" rel="noopener noreferrer"')
    index_css = __import__("pathlib").Path("admin/index.css").read_text(encoding="utf-8")
    bloco_mad = index_css.split(".secao-platform-mad .platform-grid", 1)[1].split("}", 1)[0]
    assert "repeat(2, minmax(0, 1fr))" in bloco_mad
    bloco_geo = index_css.split(".secao-platform-geoprocessamento .platform-grid", 1)[1].split("}", 1)[0]
    assert "repeat(5, minmax(0, 1fr))" in bloco_geo
    assert ".secao-platform-geoprocessamento { grid-column: 1 / -1; }" in index_css
    assert ".secao-platform-ahp-restrict { grid-column: span 4; }" in index_css
    assert ".secao-platform-administracao { grid-column: span 3; }" in index_css


def test_julgamentos_reusam_tabela_padrao_e_origem_das_hierarquizacoes() -> None:
    html = TestClient(app).get("/restrict/analise-multicriterio/?modo=espaco").text
    central_html = TestClient(app).get("/restrict/analise-multicriterio/?modo=julgamentos").text
    julgamentos_js = (
        __import__("pathlib").Path("assets/js/paginas/analise-multicriterio-julgamentos.js")
        .read_text(encoding="utf-8")
    )

    assert 'class="admin-table hier-register-table ami-table--database"' in html
    assert 'data-source-table="ahp.comparacao_colaborativa_ambiente"' in html
    assert 'id="ami-filter-column"' in html
    assert 'id="ami-filter-value"' in html
    assert 'class="ami-composite-filter mad-filter mad-filter--composite"' in html
    assert '/assets/css/mad-filter-standard.css?v=20260820-1' in html
    assert '<div class="ami-toolbar ami-panel">' not in html
    assert html.index('class="standard-section-action-row"') < html.index('id="ami-new"')
    assert html.index('id="ami-new"') < html.index("Dados do ambiente colaborativo")
    assert html.index('id="ami-new"') < html.index('class="secao-dados-tabelas-colaborativas')
    assert "Central de julgamentos" in html
    assert 'class="col-select"' in html
    assert 'id="ami-select-all-rows"' in html
    assert 'Selecionar todos os registros filtrados' in html
    assert "var selectedIds = new Set()" in julgamentos_js
    assert "checkbox.indeterminate" in julgamentos_js
    assert '"/api/ahp/hierarquizacoes/portfolio"' in julgamentos_js
    assert 'ambientesSourceUrl = "/api/ahp/comparacao-colaborativa/ambientes"' in julgamentos_js
    # O prefixo de subpath e responsabilidade do SubpathRewriteMiddleware: o
    # JavaScript nao pode recalcula-lo, sob pena de prefixo duplicado
    # (/sicard/sicard/api/...) quando a aplicacao e servida sob /sicard/.
    assert "appPrefix" not in julgamentos_js
    assert "prefixMatch" not in julgamentos_js
    assert "api(ambientesSourceUrl).then" in julgamentos_js
    assert "environmentFilterColumns" in julgamentos_js
    assert "syncEnvironmentFilterOptions" in julgamentos_js
    assert "Promise.all([api(hierarquizacoesSourceUrl)" not in julgamentos_js
    assert 'dataset.source = hierarquizacoesSourceUrl' in julgamentos_js
    assert '(h.nome || "Sem nome") + " — " + (h.codigo || "Sem código")' in julgamentos_js
    assert "hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId" in julgamentos_js
    assert 'id="ami-interactive-analysis-component"' in html
    assert 'id="ami-criteria-matrix"' in html
    assert "matriz_premissas_criterios: criteriaMatrix" in julgamentos_js
    assert 'id="ami-pairwise-matrix-component"' in html
    assert 'id="ami-pairwise-form-component"' in html
    assert 'h.descricao || "Sem descrição"' not in julgamentos_js
    assert "hierarquizacao_demandas.hierarquizacao_portfolio" in html
    assert "var PAGE_SIZE = 15" in julgamentos_js
    assert "<th>Ações</th>" not in html
    assert 'id="ami-judgments-edit-action"' in html
    assert 'id="ami-judgments-save-action"' in html
    assert 'id="ami-judgments-cancel-action"' in html
    assert 'id="ami-judgments-delete-action"' in html
    assert 'id="ami-judgments-public-action"' in html
    assert 'id="ami-judgments-matrix-action"' in html
    assert 'id="ami-judgments-form-action"' in html
    assert "Dados do ambiente colaborativo" in html
    assert "Dados das tabelas colaborativas" not in html
    assert 'id = "ami-judgments-view-action"' in julgamentos_js
    assert "viewSelectedEnvironment" in julgamentos_js
    assert "setEnvironmentMode(\"view\")" in julgamentos_js
    assert 'id="ami-environment-edit"' in html
    assert 'id="ami-environment-save"' in html
    assert "function editSelectedEnvironment()" in julgamentos_js
    assert "function saveSelectedEnvironment()" in julgamentos_js
    assert 'method: "PATCH"' in julgamentos_js
    assert "Alterações salvas no banco com sucesso." in julgamentos_js
    assert "hierarquizacao_id: selectedHierarchy.dataset.hierarquizacaoId" in julgamentos_js
    assert '$("ami-hierarchy").disabled = readonly' in julgamentos_js
    assert 'counter.id = "ami-pair-counter"' in julgamentos_js
    assert 'current + "/" + maximum' in julgamentos_js
    assert "markPairConfigured(judgment, row, column)" in julgamentos_js
    assert "applyConfiguredVisuals(judgment, host)" in julgamentos_js
    assert "Par e valor oposto validados automaticamente" in julgamentos_js
    assert "if (row !== column)" in julgamentos_js
    assert "oppositePair._applySaaty(nearestFormStep(reciprocal))" in julgamentos_js
    assert "Card oposto configurado e validado automaticamente" in julgamentos_js
    assert "pair._applySaaty = function" in julgamentos_js
    assert 'class="admin-bulk-actions ami-table-actions"' in html
    assert html.index('</table></div><div class="admin-bulk-actions ami-table-actions"') > html.index('class="admin-table hier-register-table ami-table--database"')
    assert 'id="ami-pairwise-panel"' in html
    assert 'id="ami-live-metrics"' in html
    for metric_id in ("ami-metric-lambda", "ami-metric-ic", "ami-metric-ia", "ami-metric-rc"):
        assert f'id="{metric_id}"' in html
    assert 'id="ami-matrix-zoom"' in html
    assert 'data-zoom-out' in html and 'data-zoom-reset' in html and 'data-zoom-in' in html
    assert "function ahpMetrics(matrix)" in julgamentos_js
    assert "updateLiveMetrics(judgment)" in julgamentos_js
    assert "table.style.zoom" in julgamentos_js
    assert "Matriz de comparação pareada" in html
    assert "Formulário de comparação pareada" in html
    assert 'judgment.criterios || []' in julgamentos_js
    assert 'querySelector("#saaty-scale-subcard")' in julgamentos_js
    assert 'data-pair-row' in julgamentos_js and 'data-pair-column' in julgamentos_js
    assert 'class="saaty-form ami-saaty-form"' in julgamentos_js
    assert 'class="saaty-scale"' in julgamentos_js
    assert 'class="saaty-reciprocal"' in julgamentos_js
    assert 'class="saaty-controller-title"' in julgamentos_js
    assert 'handle.style.backgroundColor = colors[index]' in julgamentos_js
    assert 'readout.className = "saaty-readout saaty-readout--"' in julgamentos_js
    assert 'class="saaty-auto-status"' in julgamentos_js
    assert "scheduleVisualValidation" in julgamentos_js
    assert "is-auto-validated" in julgamentos_js
    assert "}, 700);" in julgamentos_js
    assert "wireSaatyFormPair" in julgamentos_js
    assert 'class="ami-pairwise-form-row"' not in julgamentos_js
    assert 'id="ami-email-draft-card"' in html
    assert "Sugestão de mensagem de e-mail" in html
    assert 'id="ami-email-form-link"' in html
    assert "judgment.url_publica" in julgamentos_js
    assert "renderEmailDraft(j);" in julgamentos_js
    assert 'api/ahp/comparacao-colaborativa/ambientes' in julgamentos_js
    assert 'renderAnalysisRounds' in julgamentos_js
    assert 'openAnalysisWorkspace' in julgamentos_js
    assert '/espaco-analitico' in julgamentos_js
    assert '/analises/' in julgamentos_js
    assert '"Central de respostas"' in julgamentos_js
    assert "Central de respostas" in central_html
    assert "Julgamentos com respostas colaborativas" in central_html
    assert "Enviadas" in central_html
    assert "Recebidas" in central_html
    assert "Em preenchimento" in central_html
    assert "Finalizadas" in central_html
    assert "Finalizadas com consistência" in central_html
    assert "Cenários homologados/calculados" not in central_html
    assert 'id="ami-analysis-workspace"' in central_html
    assert 'id="ami-analysis-responses"' in central_html
    assert 'id="ami-analysis-criteria"' in central_html
    assert 'id="ami-analysis-pairs"' in central_html
    assert 'id="ami-analysis-consolidations"' in central_html
    assert 'id="ami-analysis-criteria-chart"' in central_html
    assert 'id="ami-analysis-pairs-chart"' in central_html
    assert 'id="ami-analysis-judges"' in central_html
    assert 'id="ami-analysis-matrix"' in central_html
    assert 'id="ami-analysis-metrics"' in central_html
    # A matriz, as metricas e os pesos seguem o julgador selecionado; com todos,
    # a medida de tendencia central e do usuario.
    assert 'id="ami-analysis-measure"' in central_html
    # A consolidacao acompanha o processo num modal e fecha com o semaforo.
    assert 'id="ami-process-modal"' in central_html
    assert 'id="ami-process-steps"' in central_html
    assert 'id="ami-result-modal"' in central_html
    assert 'class="ami-semaforo"' in central_html
    assert "consolidarRespostas" in julgamentos_js
    assert "mostrarResultado" in julgamentos_js
    assert "matrizEmFoco" in julgamentos_js
    assert "analisarMatriz" in julgamentos_js
    assert 'id="ami-analysis-pairs-list"' not in central_html
    assert 'id="ami-analysis-participation-chart"' not in central_html
    assert 'id="ami-analysis-heatmap"' not in central_html
    assert central_html.index('id="ami-analysis-criteria"') < central_html.index('id="ami-analysis-criteria-chart"')
    assert central_html.index('id="ami-analysis-pairs"') < central_html.index('id="ami-analysis-pairs-chart"')
    # O fio analitico vai do julgador ao peso: cada secao e insumo da seguinte,
    # e a consolidacao (que refaz o percurso) fica depois delas.
    for anterior, seguinte in [
        ('id="ami-analysis-judges"', 'id="ami-analysis-pairs"'),
        ('id="ami-analysis-pairs"', 'id="ami-analysis-matrix"'),
        ('id="ami-analysis-matrix"', 'id="ami-analysis-metrics"'),
        ('id="ami-analysis-metrics"', 'id="ami-analysis-criteria"'),
        ('id="ami-analysis-criteria"', 'id="ami-analysis-responses"'),
        ('id="ami-analysis-responses"', 'id="ami-analysis-consolidations"'),
    ]:
        assert central_html.index(anterior) < central_html.index(seguinte), (anterior, seguinte)
    assert "central-respostas-layout.css" in central_html
    assert "ratioLabel" in julgamentos_js
    assert "analysisPairBars" in julgamentos_js
    assert "analysisRangeBars" in julgamentos_js
    assert "desvioIntensidade" in julgamentos_js
    assert "renderPairsSection" in julgamentos_js
    assert 'id="ami-judgments-edit-action"' in central_html
    assert 'id="ami-judgments-save-action"' in central_html
    assert 'id="ami-judgments-cancel-action"' in central_html
    assert 'id="ami-judgments-delete-action"' in central_html
    assert 'id="ami-judgments-public-action"' in central_html
    assert 'method: "PATCH"' in julgamentos_js
    assert 'method: "DELETE"' in julgamentos_js
    assert "startInlineEdit" in julgamentos_js
    headers = [
        "Situação",
        "ID Julgamento",
        "ID Hierarquização",
        "Hierarquização",
        "Participação",
        "Prazo para respostas",
        "Criado em",
        "Atualizado em",
        "Critérios",
        "Token de acesso",
        "Lambda máximo (λmax)",
        "Índice de consistência (IC)",
        "Índice aleatório (IA)",
        "Razão de consistência (RC)",
        "Matriz de comparação pareada consolidada",
        "Pesos consolidados",
    ]
    positions = [html.index(f"<th>{header}</th>") for header in headers]
    assert positions == sorted(positions)
    assert "<th>Auditoria</th>" not in html
    tabela_js = (
        __import__("pathlib").Path("assets/js/paginas/analise-multicriterio-tabela.js")
        .read_text(encoding="utf-8")
    )
    assert 'class="ami-cell-id"' in tabela_js
    assert 'class="ami-cell-token"' in tabela_js
    assert 'data-modal-kind="matrix"' in tabela_js
    assert 'data-modal-kind="weights"' in tabela_js
    assert 'data-modal-kind="collaborators"' in tabela_js
    assert 'class="admin-table matriz-view-table ami-collaborators"' in tabela_js
    assert "j.convites || []" in tabela_js
    assert 'type="checkbox" class="ami-row-select"' in tabela_js
    assert 'type="radio"' not in tabela_js
    assert 'class="json-modal-backdrop ami-data-modal is-hidden"' in html
    assert 'class="json-modal ami-data-modal__card"' in html
    assert 'class="json-modal-head ami-data-modal__head"' in html
    assert 'class="json-modal-body ami-data-modal__content"' in html
    assert 'class="matriz-table-wrap"' in tabela_js
    assert 'class="admin-table matriz-view-table ami-matrix"' in tabela_js
    assert "Matriz de comparação pareada agregada por média geométrica" in tabela_js
    assert "Autovetor principal normalizado" in tabela_js
    assert 'id="ami-judgments-pagination"' in html
    assert html.index('id="ami-deadline"') < html.index('id="ami-hierarchy"')
    assert 'id="ami-deadline" class="c-form-control" type="date"' in html
    assert "23, 59, 59, 0" in julgamentos_js
    assert "valido_ate: deadlineEndOfDay()" in julgamentos_js
    assert 'type="datetime-local"' not in html
    assert 'type="datetime-local"' not in tabela_js
    assert 'id="ami-create-section"' in html
    assert ">1</span>" in html and "Dados do ambiente colaborativo" in html
    assert ">2</span><span>Preenchimento da Matriz de Comparação Pareada" in html
    assert 'scaleIndex.textContent = "2.1"' in julgamentos_js
    assert ">2.2</span><span>Indicadores instantâneos" in html
    assert '>2.3</span><span>Matriz de comparação pareada' in html
    assert '>2.3</span><span>Formulário de comparação pareada' in html
    assert ">3</span><span>Ambiente colaborativo" in html
    assert ">3.1</span><span>Análise Multicritério Interativa" in html
    assert ">3.1.1</span><span>Configuração do preenchimento" in html
    assert ">3.1.2</span><span>Matriz de premissas e critérios" in html
    assert ">3.2</span><span>Status do ambiente colaborativo" in html
    assert ">3.3</span><span>Sugestão de mensagem de e-mail" in html
    assert html.count("ami-config-field") == 3
    for field_id in ("ami-deadline", "ami-hierarchy", "ami-emails"):
        field = html.split(f'for="{field_id}"', 1)[1].split("</div>", 1)[0]
        assert field.index("form-help") < field.index(f'id="{field_id}"')
    assert html.count('class="ami-config-control') == 3
    assert 'id="ami-emails" class="c-form-control" type="text"' in html
    assert 'class="c-form-group ami-config-list"' in html
    collaborator_card = html.split('class="c-form-group ami-config-field ami-collaborator-entry"', 1)[1]
    assert collaborator_card.index('for="ami-emails"') < collaborator_card.index('class="c-form-group ami-config-list"')
    assert html.index('id="ami-hierarchy"') < html.index('class="c-form-group ami-config-field ami-collaborator-entry"')
    css = __import__("pathlib").Path("assets/css/analise-multicriterio.css").read_text(encoding="utf-8")
    create_grid = css.split(".ami-create-grid", 1)[1].split("}", 1)[0]
    assert "repeat(2,minmax(0,1fr))" in create_grid


def test_legacy_page_redirect_preserves_query_string() -> None:
    response = TestClient(app).get(
        "/geoespacial/bancada?modulo=fase1&embutido=1",
        follow_redirects=False,
    )

    assert response.status_code == 308
    assert response.headers["location"] == (
        "/restrict/geoespacial/bancada/?modulo=fase1&embutido=1"
    )


def test_unhandled_database_error_is_returned_as_service_unavailable(monkeypatch) -> None:
    def unavailable():
        raise DatabaseUnavailableError("Banco temporariamente indisponível.")

    monkeypatch.setattr(demanda_service, "listar_demandas", unavailable)
    client = TestClient(app)
    user = SessionUser(
        id="11111111-1111-1111-1111-111111111111",
        email="auditoria@local",
        username="auditoria_GESTOR",
        nome="Auditoria",
        tipo_usuario="GESTOR",
    )
    client.cookies.set(cookie_name(), create_token(user))

    response = client.get("/api/demandas/internas")

    assert response.status_code == 503
    assert response.json() == {"detail": "Banco temporariamente indisponível."}


def test_gestao_hierarquizacoes_adota_tabela_inicial_filtro_novo_e_visualizar() -> None:
    html = TestClient(app).get("/restrict/hierarquizacao/processos/").text
    processos_js = __import__("pathlib").Path("hierarquizacao/js/processos.js").read_text(encoding="utf-8")

    assert 'id="hier-new"' in html
    assert 'class="btn btn-primary" id="hier-new"' in html
    assert html.index('class="standard-section-action-row"') < html.index('id="hier-new"')
    assert html.index('id="hier-new"') < html.index("Hierarquizações realizadas")
    assert html.index('id="hier-new"') < html.index('class="card-hier-loading')
    assert 'id="hier-filter-column"' in html
    assert 'id="hier-filter-value"' in html
    assert 'class="hier-composite-filter mad-filter mad-filter--composite"' in html
    assert 'class="admin-toolbar hier-tipo-toolbar mad-filter mad-filter--single"' in html
    assert 'class="admin-toolbar hier-universo-filtros mad-filter mad-filter--fields"' in html
    assert '/assets/css/mad-filter-standard.css?v=20260820-1' in html
    assert 'id="hier-bulk-view"' in html
    assert 'id="hier-create-section"' in html and 'ahp-step-section hidden' in html
    assert "function hierarquizacoesFiltradas()" in processos_js
    assert "function visualizarHierarquizacaoSelecionada()" in processos_js
    assert "selecionadasHier.size !== 1" in processos_js
    assert "setCadastroReadonly(true)" in processos_js


def test_tema_publico_diferencia_acompanhamento_sem_alterar_painel_restrito() -> None:
    client = TestClient(app)
    painel_publico = client.get("/public/painel/").text
    transparencia = client.get("/public/transparencia/").text
    painel_restrito = client.get("/restrict/painel/").text

    assert "public-results-theme public-tracking-theme" in painel_publico
    assert "/assets/css/public-results-theme.css?v=20260820-1" in painel_publico
    assert "transparencia-home public-results-theme" in transparencia
    assert "/assets/css/public-results-theme.css?v=20260820-1" in transparencia
    assert "public-results-theme" not in painel_restrito
