/**
 * Formatação de datas/horas para resumos de configuração AHP.
 */
(function (global) {
  "use strict";

  function formatDataHoraPt(value) {
    if (value == null || value === "") return "—";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    var ss = String(d.getSeconds()).padStart(2, "0");
    return "data: " + dd + "/" + mm + "/" + yyyy + " e hora " + hh + ":" + mi + ":" + ss;
  }

  function linhasTimestampsConfig(cfg) {
    cfg = cfg || {};
    return [
      ["Criado em", formatDataHoraPt(cfg.criadoEm || cfg.criado_em)],
      ["Atualizado em", formatDataHoraPt(cfg.atualizadoEm || cfg.atualizado_em)],
    ];
  }

  global.SLTAhpFormatoData = {
    formatDataHoraPt: formatDataHoraPt,
    linhasTimestampsConfig: linhasTimestampsConfig,
  };
})(window);
