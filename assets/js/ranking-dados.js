(function (global) {
  "use strict";
  const tipos = { plano: "plano", programa: "programa", projeto: "projeto", 1: "plano", 2: "programa", 3: "projeto" };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  function tipo(item) {
    return tipos[item.tipo_demanda ?? item.tipo_demanda_id ?? item.dados_hierarquizacao?.cabecalho_grupo?.tipo_demanda] || null;
  }

  function finalizada(item) {
    const dados = item.dados_hierarquizacao || {};
    const relatorios = dados.cabecalho_grupo?.relatorios || {};
    return ["calculada", "homologada"].includes(item.status) && Array.isArray(item.ranking) && item.ranking.length > 0
      && ![item.relatorio_consolidado, item.relatorio_fase3, relatorios.sintese, relatorios.fase_3].some(r => r?.desatualizado)
      && !(dados.objetos || []).some(o => o.hierarquizacao?.fase_3?.desatualizado || o.hierarquizacao?.sintese?.desatualizado);
  }

  function objetoPorRanking(item, ranking) {
    return (item.dados_hierarquizacao?.objetos || []).find(objeto => {
      const cab = objeto.cabecalho_objeto || {};
      return (ranking.demanda_id != null && cab.demanda_id != null && String(cab.demanda_id) === String(ranking.demanda_id))
        || (ranking.codigo && cab.codigo && cab.codigo === ranking.codigo);
    });
  }

  function dadosRanking(item) {
    return [...(item.ranking || [])].sort((a, b) => a.posicao - b.posicao).map(ranking => {
      const objeto = objetoPorRanking(item, ranking);
      const cab = objeto?.cabecalho_objeto || {};
      const h = objeto?.hierarquizacao || {};
      const c = h.sintese?.contribuicoes;
      return {
        ...ranking, nome: ranking.nome || cab.nome || "Nome não informado", codigo: ranking.codigo || cab.codigo || "",
        tipo: tipo(item), status: cab.status, objeto,
        geometria: cab.geometria || cab.atributos?.geometria || null,
        indiceRede: c ? c.favorabilidade_rede : h.fase_2?.indice_favorabilidade_rede ?? h.fase_2?.valor_por_dimensao?.rede,
        indiceGrade: c ? c.favorabilidade_grade : h.fase_2?.indice_favorabilidade_grade ?? h.fase_2?.valor_por_dimensao?.grade,
        indicePrioridade: c ? c.prioridade : h.fase_3?.score_fase3,
      };
    });
  }

  const indice = value => typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";
  global.SLTRankingDados = { esc, tipo, finalizada, dadosRanking, objetoPorRanking, indice };
})(window);
