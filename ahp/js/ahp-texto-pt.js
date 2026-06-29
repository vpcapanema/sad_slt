/**
 * Normalização de textos do módulo AHP — norma culta do português brasileiro.
 * Usado antes de gravar escopo, objetivo, descrição e cadastro conceitual.
 */
(function (global) {
  "use strict";

  function colapsarEspacos(texto) {
    return String(texto == null ? "" : texto)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function corrigirPontuacao(texto) {
    return colapsarEspacos(
      String(texto || "")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/([,.;:!?])(?=[^\s])/g, "$1 ")
    );
  }

  /** Título / escopo — sem ponto final. */
  function normalizarTitulo(texto) {
    var t = corrigirPontuacao(texto);
    if (!t) return "";
    return t.replace(/[.!?]+$/, "").trim();
  }

  /** Parágrafo (objetivo, descrição, premissa) — com ponto final. */
  function normalizarParagrafo(texto) {
    var t = corrigirPontuacao(texto);
    if (!t) return "";
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }

  /** Campo conceitual curto (área, tema, fenômeno). */
  function normalizarCampo(texto) {
    var t = corrigirPontuacao(texto);
    if (!t) return "";
    return t.replace(/[.!?]+$/, "").trim();
  }

  function normalizarLinhaMatriz(row) {
    row = row || {};
    return {
      dimensao: normalizarCampo(row.dimensao),
      criterio: normalizarCampo(row.criterio),
      premissa: normalizarParagrafo(row.premissa),
      relacao: colapsarEspacos(row.relacao),
      metricas: normalizarCampo(row.metricas),
      fonte: colapsarEspacos(row.fonte),
      mandatorio: colapsarEspacos(row.mandatorio),
    };
  }

  function normalizarLinhasMatriz(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizarLinhaMatriz).filter(function (r) {
      return !!(r.criterio || r.premissa);
    });
  }

  global.SLTAhpTextoPt = {
    colapsarEspacos: colapsarEspacos,
    normalizarTitulo: normalizarTitulo,
    normalizarParagrafo: normalizarParagrafo,
    normalizarCampo: normalizarCampo,
    normalizarLinhaMatriz: normalizarLinhaMatriz,
    normalizarLinhasMatriz: normalizarLinhasMatriz,
  };
})(window);
