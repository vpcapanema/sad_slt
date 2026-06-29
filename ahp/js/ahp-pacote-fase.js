/**
 * Identificadores de pacote de parâmetros por fase do fluxo AHP.
 */
(function (global) {
  "use strict";

  var FASE_1 = "fase_1";
  var FASE_2 = "fase_2";

  var ROTULOS = {
    fase_1: "Fase 1 — configuração e objetos",
    fase_2: "Fase 2 — critérios e matriz pareada",
  };

  function resolverPacoteFase(cfg) {
    if (!cfg) return null;
    if (cfg.pacote_fase === FASE_1 || cfg.pacote_fase === FASE_2) return cfg.pacote_fase;
    if (Array.isArray(cfg.matriz_comparacao) && cfg.matriz_comparacao.length > 0) return FASE_2;
    return FASE_1;
  }

  function ehPacote(cfg, faseEsperada) {
    return resolverPacoteFase(cfg) === faseEsperada;
  }

  function rotulo(fase) {
    return ROTULOS[fase] || fase || "—";
  }

  function getPacoteFaseEsperado() {
    var doc = global.document;
    if (!doc) return FASE_1;
    var sel = doc.getElementById("cfg-saved-select");
    if (sel && sel.dataset.pacoteFaseEsperado) return sel.dataset.pacoteFaseEsperado;
    if (doc.getElementById("ctx-fase2-checklist")) return FASE_2;
    return FASE_1;
  }

  function validarArtefato(artefato, faseEsperada) {
    if (!artefato) return { ok: false, mensagem: "Arquivo JSON inválido ou vazio." };
    var pacote = artefato.pacote_fase;
    if (pacote && pacote !== faseEsperada) {
      return {
        ok: false,
        mensagem:
          "Este artefato pertence ao pacote " +
          rotulo(pacote) +
          ". Esta etapa exige " +
          rotulo(faseEsperada) +
          ".",
      };
    }
    if (faseEsperada === FASE_1 && artefato.artefato !== "objetos") {
      return {
        ok: false,
        mensagem: "Importe o artefato de objetos exportado na Fase 1.",
      };
    }
    if (faseEsperada === FASE_2 && artefato.artefato !== "matriz" && artefato.artefato !== "pesos") {
      return {
        ok: false,
        mensagem: "Importe um artefato de matriz ou pesos exportado ao final da Fase 2.",
      };
    }
    return { ok: true };
  }

  global.SLTPacoteFase = {
    FASE_1: FASE_1,
    FASE_2: FASE_2,
    resolverPacoteFase: resolverPacoteFase,
    ehPacote: ehPacote,
    rotulo: rotulo,
    getPacoteFaseEsperado: getPacoteFaseEsperado,
    validarArtefato: validarArtefato,
  };
})(window);
