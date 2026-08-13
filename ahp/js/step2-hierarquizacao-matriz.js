/**
 * Etapa 2 — terceira opção do "Método de cadastro dos critérios": carrega a
 * Tabela de Premissas e Critérios diretamente do registro de hierarquização
 * vinculado (config_codigo) à configuração escolhida em «Selecionar configuração».
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "slt_ahp_config_atual";
  var hierarquizacaoEncontrada = null; // { codigo, nome, linhas }

  function getConfigAtual() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function linhasDaHierarquizacao(h) {
    var matrizGrupo = h.dados_hierarquizacao && h.dados_hierarquizacao.cabecalho_grupo
      ? h.dados_hierarquizacao.cabecalho_grupo.matriz_premissas_criterios
      : null;
    var linhas = Array.isArray(matrizGrupo) ? matrizGrupo : ((matrizGrupo && matrizGrupo.linhas) || []);
    // A matriz da hierarquização vem com os cabeçalhos completos (Dimensão,
    // Critério, Etapa, Fase, ...); normaliza para as colunas canônicas da UI.
    return global.SltMatrizPremissas && global.SltMatrizPremissas.normalizarLinhasMatrizCompleta
      ? global.SltMatrizPremissas.normalizarLinhasMatrizCompleta(linhas)
      : linhas;
  }

  function radio() { return document.getElementById("method-hierarquizacao"); }
  function content() { return document.getElementById("hierarquizacao-method-content"); }

  function renderIndisponivel(mensagem) {
    hierarquizacaoEncontrada = null;
    var r = radio();
    var eraSelecionado = !!(r && r.checked);
    if (r) { r.disabled = true; r.checked = false; }
    var c = content();
    if (c) c.innerHTML = '<p class="form-desc ahp-help-text"><i class="fas fa-circle-info"></i> ' + mensagem + "</p>";
    if (eraSelecionado && typeof global.toggleInputMethod === "function") global.toggleInputMethod();
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderDisponivel(h, linhas) {
    hierarquizacaoEncontrada = { codigo: h.codigo, nome: h.nome, linhas: linhas };
    var r = radio();
    if (r) r.disabled = false;
    var c = content();
    if (!c) return;
    c.innerHTML =
      '<div class="c-form-group">' +
      "<p class=\"form-desc\">Matriz de crit\u00e9rios e premissas encontrada na hierarquiza\u00e7\u00e3o <strong>" +
      escapeHtml(h.codigo) + " \u2014 " + escapeHtml(h.nome) + "</strong>.</p>" +
      '<div class="ahp-recommendation"><div class="ahp-recommendation__head"><i class="fas fa-circle-check"></i><strong>' +
      linhas.length + " crit\u00e9rio(s) prontos para uso</strong></div></div>" +
      "</div>";
  }

  function buscarHierarquizacaoDaConfig() {
    if (!content()) return;
    var cfg = getConfigAtual();
    if (!cfg) {
      renderIndisponivel("Carregue uma configuração em «Selecionar configuração» para localizar a hierarquização vinculada.");
      return;
    }
    fetch("/api/ahp/hierarquizacoes", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Falha ao consultar hierarquizações.");
        return response.json();
      })
      .then(function (lista) {
        var h = (lista || []).find(function (item) { return item.config_codigo === cfg.codigo; });
        if (!h) {
          renderIndisponivel("Nenhuma hierarquização cadastrada está vinculada à configuração «" + escapeHtml(cfg.codigo) + "».");
          return;
        }
        var linhas = linhasDaHierarquizacao(h);
        if (!linhas.length) {
          renderIndisponivel("A hierarquização «" + escapeHtml(h.codigo) + "» vinculada não tem matriz de critérios e premissas registrada.");
          return;
        }
        renderDisponivel(h, linhas);
      })
      .catch(function () {
        renderIndisponivel("Não foi possível consultar a hierarquização vinculada.");
      });
  }

  function persistMatrizNoBanco(rows, fileName) {
    var cfg = getConfigAtual();
    if (!cfg || !global.SLTConfigApi) return Promise.resolve(false);
    if (global.SLTAhpTextoPt && global.SLTAhpTextoPt.normalizarLinhasMatriz) {
      rows = global.SLTAhpTextoPt.normalizarLinhasMatriz(rows);
    }
    return global.SLTConfigApi
      .atualizar(cfg.tipo, cfg.codigo, {
        criterios: rows,
        n_criterios: rows.length,
        metodo_entrada: "upload_tabela",
        arquivo_nome: fileName,
        arquivo_tipo: "json",
      })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function processarMatrizHierarquizacao() {
    if (!hierarquizacaoEncontrada || !hierarquizacaoEncontrada.linhas.length) return;
    var rows = hierarquizacaoEncontrada.linhas;
    var criteria = rows.map(function (r) { return r.criterio || r["Critério"] || r.nome; }).filter(Boolean);
    var fileName = "matriz_hierarquizacao_" + hierarquizacaoEncontrada.codigo + ".json";

    global.SltMatrizPremissas.saveMatrizPremissas(rows, fileName);
    localStorage.setItem("ahp_inputMethod", "upload_matriz");
    localStorage.setItem("ahp_inputMethodOrigem", "hierarquizacao");
    localStorage.setItem("ahp_hierarquizacaoOrigem", JSON.stringify({ codigo: hierarquizacaoEncontrada.codigo, nome: hierarquizacaoEncontrada.nome }));
    localStorage.setItem("ahp_criteriaCount", String(criteria.length));
    localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
    localStorage.removeItem("ahp_uploadedMatrix");
    localStorage.removeItem("ahp_pairwiseMatrix");

    persistMatrizNoBanco(rows, fileName).then(function () {
      if (global.SLTAhpNav && global.SLTAhpNav.irPara) {
        global.SLTAhpNav.irPara("/restrict/ahp/nomes/");
      } else {
        global.location.href = "/restrict/ahp/nomes/";
      }
    });
  }

  global.SLTHierarquizacaoMatriz = {
    atualizar: buscarHierarquizacaoDaConfig,
    processar: processarMatrizHierarquizacao,
  };

  document.addEventListener("DOMContentLoaded", buscarHierarquizacaoDaConfig);
})(window);
