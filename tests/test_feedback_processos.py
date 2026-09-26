"""Contratos de integração do feedback (ProcessFeedback do SIGMA-PLI) com
hierarquização, upload e SEI.

O SICARD usa o sistema de feedback do SIGMA-PLI: confirmação, overlay de
progresso com tarefas e modais de sucesso, parcial e erro. A revisão de ações
com consequências é preservada e os desfechos dependem da resposta real do
servidor. Foco, componentes e cancelamento são exercitados no navegador.
"""
from __future__ import annotations

import inspect
from pathlib import Path

from api.services.geoprocessamento_jobs import geoprocessamento_jobs

FEEDBACK_JS = Path("assets/js/process_feedback_unified.js").read_text(encoding="utf-8")
FEEDBACK_CSS = Path("assets/css/process_feedback_system.css").read_text(encoding="utf-8")
NOTIFY_JS = Path("assets/js/notification_system.js").read_text(encoding="utf-8")
MONITOR_JS = Path("assets/js/ahp-process-monitor.js").read_text(encoding="utf-8")
FASE1_JS = Path("hierarquizacao/js/fases.js").read_text(encoding="utf-8")
FASE2_JS = Path("hierarquizacao/js/fase2.js").read_text(encoding="utf-8")
FASE3_JS = Path("hierarquizacao/js/fase3.js").read_text(encoding="utf-8")
UPLOAD_JS = Path("assets/js/paginas/cadastro-upload-camada.js").read_text(encoding="utf-8")
SEI_JS = Path("admin/sei_documentos.js").read_text(encoding="utf-8")
SEI_HTML = Path("templates/paginas/admin/sei_documentos.html").read_text(encoding="utf-8")

TEMPLATES_DAS_CINCO_PAGINAS = [
    "templates/paginas/hierarquizacao/fase1-elegibilidade.html",
    "templates/paginas/hierarquizacao/fase2-favorabilidade.html",
    "templates/paginas/hierarquizacao/fase3-ajuste-fino.html",
    # Serve as duas páginas de cadastro/upload (elegibilidade e favorabilidade).
    "templates/paginas/hierarquizacao/cadastro-upload-camada.html",
]


def test_feedback_expoe_os_tres_estagios():
    """Confirmação, progresso e desfecho, com os globais do SIGMA."""
    for nome in ("window.ProcessFeedback = ", "window.ProcessFeedbackV2 = ", "window.StatusFeedback = "):
        assert nome in FEEDBACK_JS
    for metodo in ("confirmar(opts)", "iniciarCadastro(", "sucesso(data)", "erro(data)", "async processar(fetchFn"):
        assert metodo in FEEDBACK_JS
    assert "window.Notify = new NotificationSystem()" in NOTIFY_JS
    assert not Path("assets/js/feedback.js").exists()
    assert not Path("assets/css/feedback.css").exists()


def test_confirmacao_nao_foca_o_botao_perigoso():
    corpo = FEEDBACK_JS.split("        confirmar(opts) {", 1)[1].split("\n        _dismiss(", 1)[0]
    assert "opts.danger ? this.cancelBtn : this.okBtn" in corpo


def test_processo_pode_ser_recolhido_sem_cancelar():
    """Ocultar o acompanhamento não cancela; CANCELAR só aparece com onCancel."""
    assert "q('#pfsProgressClose')?.addEventListener('click', () => _progressSystem?.fechar())" in FEEDBACK_JS
    assert "this.cancelBtn.hidden = !this.config.onCancel;" in FEEDBACK_JS
    cancelar = FEEDBACK_JS.split("        cancelar() {", 1)[1].split("\n        }", 1)[0]
    assert "this.config.onCancel()" in cancelar


def test_semaforo_tem_as_tres_cores():
    """Cabeçalhos dos modais: verde sucesso, amarelo parcial, vermelho erro."""
    for estado in ("success", "partial", "error"):
        assert f".pfs-header--{estado} {{ background:" in FEEDBACK_CSS
        assert f"pfs-header pfs-header--{estado}" in FEEDBACK_JS


def test_monitor_generico_sai_de_cena_onde_ha_feedback_real():
    """Ele anuncia sucesso por temporizador fixo — sobrescreveria o modal real."""
    assert 'document.body.classList.contains("feedback-proprio")' in MONITOR_JS
    for caminho in TEMPLATES_DAS_CINCO_PAGINAS:
        html = Path(caminho).read_text(encoding="utf-8")
        assert "feedback-proprio" in html, caminho


def test_cada_botao_das_fases_confirma_antes_de_chamar_o_servidor():
    for js, chamada in [
        (FASE1_JS, "HierApi.executarFase1"),
        (FASE2_JS, "HierApi.executarFase2"),
        (FASE3_JS, "HierApi.executarFase3"),
        (FASE3_JS, "HierApi.salvarPesosFase3"),
        (FASE3_JS, "HierApi.salvarRiscosFase3"),
        (FASE3_JS, "HierApi.sintetizar"),
    ]:
        antes = js.split(chamada, 1)[0]
        assert "ProcessFeedback.confirmar" in antes or "confirmacao:" in antes, chamada


def test_fases_1_e_2_relatam_o_desfecho_pelo_processo_e_nao_por_toast_solto():
    for js in (FASE1_JS, FASE2_JS):
        assert "ProcessFeedback.iniciarCadastro(" in js
        assert "proc.sucesso({" in js
        assert "proc.erro({" in js


def test_sintetizar_nao_redireciona_sozinho():
    """Navegar na resposta tirava o usuário da tela antes de ele ver o desfecho:
    o modal de sucesso oferece o link "Ver ranking" e OK continua na Fase 3."""
    trecho = FASE3_JS.split("HierApi.sintetizar", 1)[1]
    assert "irRanking: true" in trecho
    assert "window.location" not in trecho
    helper = FASE3_JS.split("async function executarAcao(", 1)[1].split("$(\"executar-fase3\")", 1)[0]
    assert 'action_label: "Ver ranking"' in helper
    assert "/restrict/hierarquizacao/processos/ranking/?codigo=" in helper


def test_upload_usa_as_rotas_com_log_real_do_servidor():
    assert "/importar_camadas/job" in UPLOAD_JS
    assert "/camadas/${camadaId}/homologar-job" in UPLOAD_JS
    assert "/operacoes-jobs/status/${atual.id}" in UPLOAD_JS
    # As rotas síncronas, que não relatam nada durante a execução, saíram.
    assert '`${API}/importar_camadas`' not in UPLOAD_JS
    assert "/homologar`" not in UPLOAD_JS


def test_upload_acompanha_estado_ativo_sem_reexibir_logs_concluidos():
    corpo = UPLOAD_JS.split("async function acompanharJob(", 1)[1].split("\n  }", 1)[0]
    assert "window.ProcessFeedback.acompanhar(atual)" in corpo
    assert "log.mensagem" not in corpo
    assert 'atual.status === "erro"' in corpo


def test_upload_distingue_importado_de_homologado():
    """Importar e não homologar é um desfecho real e parcial — amarelo, não verde nem vermelho."""
    assert '_status: "partial"' in UPLOAD_JS
    assert "Importada, mas não homologada" in UPLOAD_JS
    assert "ainda não publicada" in UPLOAD_JS


def test_upload_promete_disponibilidade_so_no_verde():
    """O produto agrupador é vinculado pela homologação — o sucesso pode afirmar isso."""
    assert "já está disponível no seletor de camadas da ${fase}" in UPLOAD_JS


def test_importacao_por_job_preserva_a_pasta_de_destino():
    """A rota síncrona aceitava `pasta`; sem isto o arquivo cairia fora de RESTRIÇÃO/FAVORABILIDADE."""
    assinatura = inspect.signature(geoprocessamento_jobs.create_validated_import)
    assert "pasta" in assinatura.parameters
    router = Path("api/routers/geoespacial.py").read_text(encoding="utf-8")
    rota = router.split('@router.post("/importar_camadas/job"', 1)[1].split("@router.post", 1)[0]
    assert "pasta: str | None = Form(None)" in rota
    assert "pasta=(pasta or \"\").strip() or None" in rota

def test_botao_e_guardado_antes_da_confirmacao():
    """`currentTarget` só existe durante o disparo do evento: depois do await da
    confirmação ele é null, e desabilitar o botão explodia com TypeError."""
    handler = UPLOAD_JS.split('getElementById("btn-enviar").addEventListener', 1)[1]
    antes_do_await = handler.split("await window.ProcessFeedback.confirmar", 1)[0]
    assert "const alvo = evento.currentTarget;" in antes_do_await
    assert "botao.currentTarget" not in UPLOAD_JS

def test_confirmacao_nomeia_o_arquivo_e_o_que_ele_contem():
    """Publicar o arquivo errado era invisível: o modal só falava do nome de
    publicação, que o usuário digita, e não do arquivo que o servidor leu."""
    trecho = UPLOAD_JS.split("ProcessFeedback.confirmar({", 1)[1].split("});", 1)[0]
    assert "inspecao.arquivo_escolhido" in trecho
    assert "resumoDaInspecao()" in trecho
    resumo = UPLOAD_JS.split("function resumoDaInspecao() {", 1)[1].split("\n  }", 1)[0]
    assert "feições" in resumo


def test_pagina_volta_ao_inicio_depois_de_publicar():
    """O bilhete da inspeção é consumido no servidor; manter a prévia na tela
    convidava a reenviar uma seleção que já não vale."""
    depois = UPLOAD_JS.split('title: "Camada enviada e homologada."', 1)[1]
    assert "voltarAoInicio();" in depois.split("catch", 1)[0]

def test_pasta_do_acervo_segue_o_tipo_da_camada():
    """A pasta vinha da página: um risco enviado pela tela de elegibilidade era
    arquivado em RESTRIÇÃO, junto do que ele não é."""
    assert 'const pasta = pastaDoTipo(dados.get("tipo_camada"));' in UPLOAD_JS
    tabela = UPLOAD_JS.split("const PASTA_POR_TIPO = {", 1)[1].split("};", 1)[0]
    for tipo, pasta in (("restricao", "RESTRIÇÃO"), ("risco", "RISCO"),
                        ("area_estudo", "AREA_ESTUDO"), ("grade", "FAVORABILIDADE")):
        assert f'{tipo}: "{pasta}"' in tabela, tipo


def test_finalidade_publicada_vem_do_tipo_e_nao_do_texto_livre():
    """É por `finalidade` que a Fase 1 separa restrição de risco; com o texto
    livre (ou vazio) a classificação passava a depender do nome de publicação."""
    corpo = UPLOAD_JS.split("homologar-job`", 1)[1].split("});", 1)[0]
    assert 'finalidade: String(dados.get("tipo_camada") || "").trim() || null,' in corpo
    assert 'descricao: String(dados.get("finalidade") || "").trim() || null,' in corpo


def test_sei_documentos_relata_pelo_feedback_e_nao_por_tabela_na_pagina():
    """A leitura do PDF era despejada numa `admin-table sei-leitura-tabela` na
    própria página; quem dá esse resultado é o modal de desfecho."""
    assert "feedback-proprio" in SEI_HTML
    assert "sei-leitura" not in SEI_HTML
    assert "sei-leitura" not in SEI_JS
    assert "admin-table sei-leitura-tabela" not in SEI_JS


def test_sei_enviar_e_reanalisar_confirmam_antes_de_disparar():
    for funcao, chamada in [
        ("async function enviar(", "method: 'POST', body: dados"),
        ("async function reanalisar(", "adicionarNaFila(doc, tipo)"),
    ]:
        antes = SEI_JS.split(funcao, 1)[1].split(chamada, 1)[0]
        assert "ProcessFeedback.confirmar" in antes, funcao


def test_sei_tem_os_tres_desfechos_e_o_codigo_do_erro():
    # O semáforo vem do resumo da leitura (verde ou amarelo) e do erro (vermelho);
    # o cabeçalho fica com o título da ação, então o status não é mais título.
    corpo = SEI_JS.split("function desfechoDaLeitura(", 1)[1].split("async function confirmar(", 1)[0]
    assert "'success' : 'warning'" in corpo
    assert "proc.erro({" in SEI_JS
    # O código do erro é o status HTTP devolvido pela rota, numa linha do corpo.
    assert "erro.status = res.status;" in SEI_JS
    assert "`Erro ${e.status" in SEI_JS


def test_modal_mantem_o_titulo_da_acao_e_lista_uma_linha_por_resultado():
    """Cabeçalho do modal de resultado = título da ação; corpo = título do
    desfecho, mensagem, resumo e subprocessos (um por linha)."""
    assert "_statusSystem.mostrarSucesso({ actionTitle: this._actionTitle" in FEEDBACK_JS
    assert "_statusSystem.mostrarErro({ actionTitle: this._actionTitle" in FEEDBACK_JS
    for alvo in ("pfsSuccessSummary", "pfsSuccessSubprocesses", "pfsPartialSubprocesses", "pfsErrorLog"):
        assert f'id="{alvo}"' in FEEDBACK_JS
    assert ".pfs-sp-item" in FEEDBACK_CSS


def test_enter_nao_confirma_acao_perigosa_com_foco_em_cancelar():
    """Enter só confirma no campo de entrada; nos botões vale o botão focado."""
    corpo = FEEDBACK_JS.split("        confirmar(opts) {", 1)[1].split("\n        _dismiss(", 1)[0]
    assert "e.key === 'Enter' && this._inputMode && document.activeElement === this._inputEl" in corpo


def test_sei_continua_fila_sem_exigir_dispensar_resultados():
    corpo = SEI_JS.split("async function processarFila()", 1)[1]
    assert "aguardarFechamento" not in corpo
    assert "proc.sucesso(desfechoDaLeitura(leitura))" in corpo


def test_sei_mostra_o_proponente_lido_que_nao_cabe_no_formulario():
    """Instituição, CNPJ, município e representante são escolhidos no SIGMA e
    não têm campo de texto no formulário. Sem nomeá-los no desfecho, o modal
    contava valores que a tela nunca preencheria — 4 lidos, 1 exibido."""
    assert "SO_NO_SIGMA" in SEI_JS
    corpo = SEI_JS.split("function linhasDaLeitura(", 1)[1].split("function desfechoDaLeitura(", 1)[0]
    # Todo valor lido vira uma linha — os do proponente inclusive — e uma linha
    # a mais diz que eles se escolhem ou cadastram no SIGMA.
    assert "Object.entries(campos)" in corpo
    assert "lidosSoNoSigma(leitura).length" in corpo


def test_sei_envia_o_tipo_e_aproveita_a_leitura_que_voltou():
    """A leitura é gravada já no envio. Reprocessar depois leria o mesmo PDF
    duas vezes e mostraria dois desfechos para o mesmo documento."""
    corpo = SEI_JS.split("async function enviar(", 1)[1].split("async function init(", 1)[0]
    assert "dados.append('tipo_demanda', tipo)" in corpo
    assert "item.detalhe = doc" in corpo
    assert "processarFila()" not in corpo


def test_overlay_de_progresso_segue_o_sigma():
    """Card da tarefa com passo, tarefas concluídas, log com hora, segmentos e barra."""
    for alvo in ('id="pfsTaskCard"', 'id="pfsCompletedList"', 'id="pfsLog"', 'id="pfsSegments"', 'id="pfsProgressFill"', 'data-pfs="task-step-num"'):
        assert alvo in FEEDBACK_JS
    assert '<span class="pfs-log-time">${now()}</span>' in FEEDBACK_JS
    for classe in ("pfs-segment--completed", "pfs-segment--active", "pfs-segment--error"):
        assert f".{classe}" in FEEDBACK_CSS


def test_log_do_servidor_entra_uma_vez_por_sequencia():
    corpo = FEEDBACK_JS.split("_aplicarJob(p, st, job) {", 1)[1].split("\n        }\n", 1)[0]
    assert "if (seq <= st.seq || !msg) return;" in corpo
    assert "p.concluirTarefa(msg, 'Concluído')" in corpo


def test_captura_do_sigma_para_respostas_do_servidor():
    """processar(fetch): stream vai ao roteador; JSON ok → sucesso; erro → modal de erro."""
    corpo = FEEDBACK_JS.split("async processar(fetchFn, onSuccess, onError) {", 1)[1].split("\n        get atual()", 1)[0]
    assert "ct.includes('text/event-stream') || ct.includes('application/x-ndjson')" in corpo
    assert "if (resp.ok) { if (_progressSystem) _progressSystem.sucesso(result)" in corpo
    assert "else { if (_progressSystem) _progressSystem.erro(result)" in corpo
    for evento in ("case 'task':", "case 'task_complete':", "case 'partial':", "case 'done': case 'success':", "case 'error':"):
        assert evento in FEEDBACK_JS
    # Erros do FastAPI (detail com loc/msg) viram linhas legíveis.
    assert "e.msg && e.loc" in FEEDBACK_JS
    assert "Aguardando resposta do servidor..." in FEEDBACK_JS



def test_nenhuma_tela_usa_o_feedback_antigo():
    """O sistema anterior (SLTFeedback) foi removido; as telas usam o SIGMA."""
    raizes = ["admin", "assets/js", "hierarquizacao", "geoespacial", "ahp", "templates", "plugins/municipal-layer/sicard"]
    restantes = []
    for raiz in raizes:
        for arquivo in Path(raiz).rglob("*"):
            if arquivo.suffix not in {".js", ".jsx", ".html"} or "node_modules" in arquivo.parts:
                continue
            texto = arquivo.read_text(encoding="utf-8", errors="ignore")
            if "SLTFeedback" in texto or "feedback.js" in texto or "/assets/css/feedback.css" in texto:
                restantes.append(str(arquivo))
    assert restantes == []


def test_notify_nao_interpreta_html_de_mensagem_do_servidor():
    """O Notify do SIGMA usava innerHTML; mensagens do servidor entram como texto."""
    assert "if (html) messageEl.innerHTML = message;" in NOTIFY_JS
    assert "else messageEl.textContent = message;" in NOTIFY_JS
