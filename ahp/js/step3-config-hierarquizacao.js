/**
 * Etapa 2 (Nomear Critérios) — seletor de configuração na seção "Cadastro dos
 * Nomes", como reforço para garantir que a matriz de critérios e premissas da
 * hierarquização vinculada à configuração seja carregada nesta página.
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "slt_ahp_config_atual";
  var configsPorChave = {};

  function getConfigAtual() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function setConfigAtual(tipo, codigo) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ tipo: tipo, codigo: codigo }));
    } catch (_e) {
      /* best-effort */
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function optionLabel(cfg) {
    var partes = [cfg.codigo];
    if (cfg.denominacao) partes.push("[" + cfg.denominacao + "]");
    if (cfg.nome) partes.push(cfg.nome);
    return partes.join(" — ") + " (" + cfg.tipo + ")";
  }

  function setHelp(mensagem, tipo) {
    var help = el("nomes-config-help");
    if (!help) return;
    var icone = tipo === "error" ? "triangle-exclamation" : tipo === "success" ? "circle-check" : "info-circle";
    help.innerHTML = '<i class="fas fa-' + icone + '"></i> ' + mensagem;
  }

  function preencherConfigs() {
    var sel = el("nomes-config-select");
    if (!sel || !global.SLTConfigApi) return;
    function listarTipo(tipo) {
      return global.SLTConfigApi.listar(tipo, {}).catch(function () {
        return [];
      });
    }
    Promise.all([listarTipo("portfolio"), listarTipo("avulsa")]).then(function (res) {
      var todas = (res[0] || []).concat(res[1] || []);
      configsPorChave = {};
      sel.innerHTML = '<option value="">Selecione a configuração…</option>';
      todas.forEach(function (cfg) {
        var chave = cfg.tipo + "::" + cfg.codigo;
        configsPorChave[chave] = cfg;
        var opt = document.createElement("option");
        opt.value = chave;
        opt.textContent = optionLabel(cfg);
        sel.appendChild(opt);
      });
      var atual = getConfigAtual();
      if (atual) {
        var chaveAtual = atual.tipo + "::" + atual.codigo;
        if (configsPorChave[chaveAtual]) {
          sel.value = chaveAtual;
          setHelp("Configuração atual: «" + escapeHtml(atual.codigo) + "». Troque aqui se precisar carregar outra matriz.");
        }
      }
      if (global.SLTFieldFilled) global.SLTFieldFilled.sync(sel);
    });
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

  function recarregarPagina(rows, fileName, cfg) {
    var criteria = rows.map(function (r) { return r.criterio || r["Critério"] || r.nome; }).filter(Boolean);
    if (global.SltMatrizPremissas) global.SltMatrizPremissas.saveMatrizPremissas(rows, fileName);
    localStorage.setItem("ahp_inputMethod", "upload_matriz");
    localStorage.setItem("ahp_inputMethodOrigem", "hierarquizacao");
    localStorage.setItem("ahp_criteriaCount", String(criteria.length));
    localStorage.setItem("ahp_criteria", JSON.stringify(criteria));
    localStorage.removeItem("ahp_uploadedMatrix");
    localStorage.removeItem("ahp_pairwiseMatrix");

    if (global.SLTStep3Nomes && global.SLTStep3Nomes.boot) global.SLTStep3Nomes.boot();

    var panel = el("matriz-premissas-panel");
    if (panel && global.SLTStep3Matriz) global.SLTStep3Matriz.renderEditor(panel, rows, fileName, cfg);
  }

  function persistMatrizNoBanco(cfg, rows, fileName) {
    if (!cfg || !global.SLTConfigApi) return Promise.resolve(false);
    var rowsNorm = rows;
    if (global.SLTAhpTextoPt && global.SLTAhpTextoPt.normalizarLinhasMatriz) {
      rowsNorm = global.SLTAhpTextoPt.normalizarLinhasMatriz(rows);
    }
    return global.SLTConfigApi
      .atualizar(cfg.tipo, cfg.codigo, {
        criterios: rowsNorm,
        n_criterios: rowsNorm.length,
        metodo_entrada: "upload_tabela",
        arquivo_nome: fileName,
        arquivo_tipo: "json",
      })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function aoSelecionarConfig() {
    var sel = el("nomes-config-select");
    if (!sel) return;
    var chave = sel.value;
    if (!chave || !configsPorChave[chave]) {
      setHelp("Selecione uma configuração para localizar a hierarquização vinculada.");
      return;
    }
    var cfg = configsPorChave[chave];
    setConfigAtual(cfg.tipo, cfg.codigo);
    setHelp("Consultando a hierarquização vinculada a «" + escapeHtml(cfg.codigo) + "»…");

    fetch("/api/ahp/hierarquizacoes", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Falha ao consultar hierarquizações.");
        return response.json();
      })
      .then(function (lista) {
        var h = (lista || []).find(function (item) { return item.config_codigo === cfg.codigo; });
        if (!h) {
          setHelp("Nenhuma hierarquização cadastrada está vinculada à configuração «" + escapeHtml(cfg.codigo) + "».", "error");
          return;
        }
        var linhas = linhasDaHierarquizacao(h);
        if (!linhas.length) {
          setHelp("A hierarquização «" + escapeHtml(h.codigo) + "» vinculada não tem matriz de critérios e premissas registrada.", "error");
          return;
        }
        var fileName = "matriz_hierarquizacao_" + h.codigo + ".json";
        recarregarPagina(linhas, fileName, cfg);
        persistMatrizNoBanco(cfg, linhas, fileName);
        setHelp(linhas.length + " critério(s) carregados da hierarquização «" + escapeHtml(h.codigo) + " — " + escapeHtml(h.nome) + "».", "success");
      })
      .catch(function () {
        setHelp("Não foi possível consultar a hierarquização vinculada.", "error");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    preencherConfigs();
    var sel = el("nomes-config-select");
    if (sel) sel.addEventListener("change", aoSelecionarConfig);
  });
})(window);
