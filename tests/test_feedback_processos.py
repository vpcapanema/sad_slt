"""Feedback de ações e processos nas cinco páginas de hierarquização.

Cada ação que grava ou calcula passa por três estágios visíveis: confirmação
antes de sair do navegador, acompanhamento enquanto roda (com o log real do
servidor, quando existe) e desfecho em semáforo. Estes testes travam esse
contrato — o que voltar a disparar direto no clique, ou a anunciar sucesso sem
o servidor ter respondido, quebra aqui.
"""
from __future__ import annotations

import inspect
from pathlib import Path

from api.services.geoprocessamento_jobs import geoprocessamento_jobs

FEEDBACK_JS = Path("assets/js/feedback.js").read_text(encoding="utf-8")
FEEDBACK_CSS = Path("assets/css/feedback.css").read_text(encoding="utf-8")
MONITOR_JS = Path("assets/js/ahp-process-monitor.js").read_text(encoding="utf-8")
FASE1_JS = Path("hierarquizacao/js/fases.js").read_text(encoding="utf-8")
FASE2_JS = Path("hierarquizacao/js/fase2.js").read_text(encoding="utf-8")
FASE3_JS = Path("hierarquizacao/js/fase3.js").read_text(encoding="utf-8")
UPLOAD_JS = Path("assets/js/paginas/cadastro-upload-camada.js").read_text(encoding="utf-8")

TEMPLATES_DAS_CINCO_PAGINAS = [
    "templates/paginas/hierarquizacao/fase1-elegibilidade.html",
    "templates/paginas/hierarquizacao/fase2-favorabilidade.html",
    "templates/paginas/hierarquizacao/fase3-ajuste-fino.html",
    # Serve as duas páginas de cadastro/upload (elegibilidade e favorabilidade).
    "templates/paginas/hierarquizacao/cadastro-upload-camada.html",
]


def test_feedback_expoe_os_tres_estagios():
    assert "confirmar," in FEEDBACK_JS
    assert "processo," in FEEDBACK_JS
    assert "acao," in FEEDBACK_JS


def test_confirmacao_nao_foca_o_botao_perigoso():
    corpo = FEEDBACK_JS.split("function confirmar(options) {", 1)[1].split("\n  }", 1)[0]
    assert 'bd.querySelector(danger ? "[data-fb-cancelar]" : "[data-fb-confirmar]")?.focus()' in corpo


def test_modal_de_processo_nao_fecha_enquanto_roda():
    """Sem cancelamento real no servidor, fechar só esconderia o que continua rodando."""
    assert "if (travado) return;" in FEEDBACK_JS
    assert 'if (e.key === "Escape" && !travado)' in FEEDBACK_JS
    processo = FEEDBACK_JS.split("function processo(title,", 1)[1]
    assert "travado = true;" in processo.split("return {", 1)[0]
    assert "travado = false;" in processo.split("concluir({", 1)[1].split("\n      }", 1)[0]
    assert ".slt-fb-modal--progress .slt-fb-close{display:none}" in FEEDBACK_CSS


def test_semaforo_tem_as_tres_cores():
    for cor in ("success", "warning", "error"):
        assert f".slt-fb-modal--{cor}{{border-top-color:" in FEEDBACK_CSS


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
        assert "SLTFeedback.confirmar" in antes or "confirmacao:" in antes, chamada


def test_fases_1_e_2_relatam_o_desfecho_pelo_processo_e_nao_por_toast_solto():
    for js in (FASE1_JS, FASE2_JS):
        assert "SLTFeedback.processo(" in js
        assert 'proc.concluir({\n        type: "error"' in js or 'type: "error"' in js


def test_sintetizar_nao_redireciona_sozinho():
    """Navegar na resposta tirava o usuário da tela antes de ele ver o desfecho."""
    trecho = FASE3_JS.split("HierApi.sintetizar", 1)[1]
    assert "data-ir-ranking" in trecho
    assert "Ver ranking" in trecho


def test_upload_usa_as_rotas_com_log_real_do_servidor():
    assert "/importar_camadas/job" in UPLOAD_JS
    assert "/camadas/${camadaId}/homologar-job" in UPLOAD_JS
    assert "/operacoes-jobs/status/${atual.id}" in UPLOAD_JS
    # As rotas síncronas, que não relatam nada durante a execução, saíram.
    assert '`${API}/importar_camadas`' not in UPLOAD_JS
    assert "/homologar`" not in UPLOAD_JS


def test_upload_desenha_cada_log_do_servidor_como_passo():
    corpo = UPLOAD_JS.split("async function acompanharJob(", 1)[1].split("\n  }", 1)[0]
    assert "proc.passo(log.mensagem" in corpo
    assert "proc.progresso(atual.percentual, atual.etapa_atual)" in corpo
    assert 'atual.status === "erro"' in corpo


def test_upload_distingue_importado_de_homologado():
    """Importar e não homologar é um desfecho real e parcial — amarelo, não verde nem vermelho."""
    assert 'type: "warning"' in UPLOAD_JS
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
    antes_do_await = handler.split("await window.SLTFeedback.confirmar", 1)[0]
    assert "const alvo = evento.currentTarget;" in antes_do_await
    assert "botao.currentTarget" not in UPLOAD_JS

def test_confirmacao_nomeia_o_arquivo_e_o_que_ele_contem():
    """Publicar o arquivo errado era invisível: o modal só falava do nome de
    publicação, que o usuário digita, e não do arquivo que o servidor leu."""
    trecho = UPLOAD_JS.split("SLTFeedback.confirmar({", 1)[1].split("});", 1)[0]
    assert "inspecao.arquivo_escolhido" in trecho
    assert "resumoDaInspecao()" in trecho
    resumo = UPLOAD_JS.split("function resumoDaInspecao() {", 1)[1].split("\n  }", 1)[0]
    assert "feições" in resumo


def test_pagina_volta_ao_inicio_depois_de_publicar():
    """O bilhete da inspeção é consumido no servidor; manter a prévia na tela
    convidava a reenviar uma seleção que já não vale."""
    depois = UPLOAD_JS.split('type: "success",', 1)[1]
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
