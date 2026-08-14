/**
 * Preenchimento e validação visual dos formulários AHP ao selecionar uma
 * configuração salva no card `.ahp-step-config-selector`.
 *
 * Cada etapa pode expor um hook mais específico em
 * `window.SLTAhpConfigFormFill_<etapa>` (ex.: tipo-analise.js define
 * `SLTAhpConfigFormFill_configuracao`); na ausência dele, este arquivo aplica
 * uma lógica genérica com base nos campos do registro de configuração.
 * Retorna sempre uma lista de avisos (strings) exibida pelo seletor.
 */
(function (global) {
  "use strict";

  function etapaFromPath() {
    var path = (global.location && global.location.pathname) || "";
    if (path.indexOf("/configuracao/") !== -1) return "configuracao";
    if (path.indexOf("/criterios/") !== -1) return "criterios";
    if (path.indexOf("/nomes/") !== -1) return "nomes";
    if (path.indexOf("/metodo/") !== -1) return "metodo";
    if (path.indexOf("/comparacao/") !== -1) return "comparacao";
    if (path.indexOf("/resultados/") !== -1) return "resultados";
    if (path.indexOf("/alternativas/") !== -1) return "alternativas";
    return null;
  }

  function dispatchChange(el) {
    if (el) el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function marcarRadio(nome, valor) {
    var el = global.document.querySelector('input[name="' + nome + '"][value="' + valor + '"]');
    if (el && !el.checked) {
      el.checked = true;
      dispatchChange(el);
    }
    return el;
  }

  function formatarPercentual(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
    return (Number(v) * 100).toFixed(1) + "%";
  }

  // ---- Etapa 2: Critérios (quantidade + método de entrada) ----
  function aplicarCriterios(cfg) {
    var avisos = [];
    var doc = global.document;
    var n = Number(cfg.n_criterios) || (Array.isArray(cfg.criterios) ? cfg.criterios.length : 0);
    if (n > 0) {
      var sel = doc.getElementById("criteria-count");
      if (sel) {
        var opt = sel.querySelector('option[value="' + n + '"]');
        if (opt) {
          sel.value = String(n);
          dispatchChange(sel);
        } else {
          avisos.push("A configuração tem " + n + " critério(s), fora da faixa de opções desta etapa.");
        }
      }
    } else {
      avisos.push("Esta configuração ainda não tem critérios definidos.");
    }
    var metodo = cfg.metodo_entrada;
    if (metodo === "upload_matriz" && !(doc.getElementById("method-hierarquizacao") || {}).disabled) {
      marcarRadio("input-method", "hierarquizacao");
    } else if (metodo === "upload_tabela" || metodo === "upload_matriz" || metodo === "upload") {
      marcarRadio("input-method", "upload");
    } else {
      marcarRadio("input-method", "manual");
    }
    if (typeof global.toggleInputMethod === "function") global.toggleInputMethod();
    return avisos;
  }

  // ---- Etapa 3: Nomes dos critérios (população real fica a cargo de
  // step3-matriz-view.js / step3-nomes.js, que já escutam o mesmo evento) ----
  function aplicarNomes(cfg) {
    var avisos = [];
    var criterios = cfg.criterios || [];
    var semNome = criterios.filter(function (c) { return !(c && (c.criterio || c.nome)); }).length;
    if (semNome > 0) avisos.push(semNome + " critério(s) desta configuração ainda sem nome atribuído.");
    return avisos;
  }

  // ---- Etapa 4: Método de preenchimento (individual/colaborativo) ----
  function aplicarMetodo(cfg) {
    var avisos = [];
    var modo = cfg.modo_preenchimento;
    var alvo = modo === "colaborativo" ? "collaborative" : modo === "individual" ? "individual" : null;
    if (alvo) {
      if (typeof global.selectFillMode === "function") global.selectFillMode(alvo);
      else marcarRadio("fill-mode", alvo);
    } else {
      avisos.push("Esta configuração ainda não tem um modo de preenchimento definido.");
    }
    return avisos;
  }

  // ---- Etapa 5: Comparação pareada ----
  function aplicarComparacao(cfg) {
    var avisos = [];
    if (!Array.isArray(cfg.matriz_comparacao) || !cfg.matriz_comparacao.length) {
      avisos.push("Ainda não há uma matriz de comparação pareada salva para esta configuração.");
    } else if (cfg.consistente === false) {
      avisos.push("A matriz salva está inconsistente (RC = " + formatarPercentual(cfg.razao_consistencia) + "). Revise as comparações.");
    }
    return avisos;
  }

  // ---- Etapa 6: Resultados (pesos e consistência) ----
  function aplicarResultados(cfg) {
    var avisos = [];
    if (!cfg.pesos) {
      avisos.push("Os pesos ainda não foram calculados para esta configuração.");
    } else if (cfg.consistente === false) {
      avisos.push("A matriz utilizada no cálculo está inconsistente (RC = " + formatarPercentual(cfg.razao_consistencia) + ").");
    }
    return avisos;
  }

  // ---- Etapa 7: Alternativas ----
  function aplicarAlternativas(cfg) {
    var avisos = [];
    var objetos = cfg.universo_objetos || [];
    if (!objetos.length) avisos.push("Nenhuma alternativa/objeto no universo desta configuração.");
    return avisos;
  }

  function aplicar(cfg) {
    if (!cfg) return [];
    var etapa = etapaFromPath();
    var hookEspecifico = etapa && global["SLTAhpConfigFormFill_" + etapa];
    if (typeof hookEspecifico === "function") return hookEspecifico(cfg);
    switch (etapa) {
      case "criterios": return aplicarCriterios(cfg);
      case "nomes": return aplicarNomes(cfg);
      case "metodo": return aplicarMetodo(cfg);
      case "comparacao": return aplicarComparacao(cfg);
      case "resultados": return aplicarResultados(cfg);
      case "alternativas": return aplicarAlternativas(cfg);
      default: return [];
    }
  }

  global.SLTAhpConfigFormFill = { aplicar: aplicar };
})(window);
