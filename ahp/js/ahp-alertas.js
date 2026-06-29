/**
 * Staging e persistência de alertas de coerência conceitual.
 * Etapas 2–4: acumulam em localStorage; Etapa 5: flush no PATCH da config.
 */
(function (global) {
  "use strict";

  var STORAGE_PENDENTES = "slt_ahp_alertas_pendentes";

  function parseList(raw) {
    try {
      var parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function alertKey(a) {
    return [
      a.etapa || "",
      a.codigo || "",
      a.campo || "",
      a.valor_informado || "",
      String(a.linha == null ? "" : a.linha),
    ].join("::");
  }

  function newId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function listarPendentes() {
    return parseList(global.localStorage.getItem(STORAGE_PENDENTES));
  }

  function acumularAlertas(novos, meta) {
    if (!novos || !novos.length) return listarPendentes();
    meta = meta || {};
    var now = new Date().toISOString();
    var map = {};
    listarPendentes().forEach(function (a) {
      map[alertKey(a)] = a;
    });
    novos.forEach(function (a) {
      var item = {
        id: a.id || newId(),
        etapa: a.etapa || meta.etapa || "",
        severidade: a.severidade || "aviso",
        codigo: a.codigo || "DIVERGENCIA",
        mensagem: a.mensagem || "",
        campo: a.campo || "",
        valor_informado: a.valor_informado != null ? String(a.valor_informado) : "",
        valor_esperado: a.valor_esperado != null ? String(a.valor_esperado) : "",
        linha: a.linha != null ? a.linha : null,
        confirmado_em: a.confirmado_em || now,
        config_snapshot: a.config_snapshot || meta.config_snapshot || null,
      };
      map[alertKey(item)] = item;
    });
    var merged = Object.keys(map).map(function (k) {
      return map[k];
    });
    global.localStorage.setItem(STORAGE_PENDENTES, JSON.stringify(merged));
    return merged;
  }

  function limparPendentes() {
    global.localStorage.removeItem(STORAGE_PENDENTES);
  }

  function avisosParaAlertas(avisos, etapa, configSnapshot) {
    return (avisos || []).map(function (av) {
      return {
        etapa: etapa,
        codigo: av.codigo,
        mensagem: av.mensagem,
        campo: av.campo,
        valor_informado: av.valor_informado,
        valor_esperado: av.valor_esperado,
        linha: av.linha,
        config_snapshot: configSnapshot,
      };
    });
  }

  global.SLTAhpAlertas = {
    STORAGE_PENDENTES: STORAGE_PENDENTES,
    listarPendentes: listarPendentes,
    acumularAlertas: acumularAlertas,
    limparPendentes: limparPendentes,
    avisosParaAlertas: avisosParaAlertas,
  };
})(window);
