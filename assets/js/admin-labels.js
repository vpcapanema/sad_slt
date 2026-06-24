(function (global) {
  const PLANO_PLI = "PLANO-PLI";
  const PLANO_PEF = "PLANO-PEF";

  const state = {
    statusDemanda: [],
    statusObjeto: [],
    instituicoes: [],
    pessoas: [],
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function labelById(list, id, labelKey) {
    if (!id) return "—";
    const item = (list || []).find((x) => x.id === id);
    if (!item) return "—";
    return item[labelKey || "nome_oficial"] || item.nome || item.sigla || "—";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR");
    } catch {
      return iso;
    }
  }

  function formatCnpj(raw) {
    return global.SLTSigmaRead?.cnpjDisplay?.({ cnpj: raw }) || raw || "—";
  }

  async function init(basePath) {
    basePath = basePath || "../";
    await SLTCatalog.loadCatalog(basePath);
    const sigma = global.SLTSigmaRead;
    const [statusDemanda, statusObjeto, instituicoes, pessoas] = await Promise.all([
      SLTAdminApi.listStatusDemanda(),
      SLTAdminApi.listStatusObjetoAhp(),
      sigma ? sigma.listInstituicoes().catch(() => []) : Promise.resolve([]),
      sigma ? sigma.listPessoas().catch(() => []) : Promise.resolve([]),
    ]);
    state.statusDemanda = statusDemanda;
    state.statusObjeto = statusObjeto;
    state.instituicoes = instituicoes;
    state.pessoas = pessoas;
  }

  function statusDemandaLabel(codigo) {
    const row = state.statusDemanda.find((s) => s.codigo === codigo);
    return row?.nome || codigo || "—";
  }

  function statusObjetoLabel(codigo) {
    const row = state.statusObjeto.find((s) => s.codigo === codigo);
    return row?.nome || codigo || "—";
  }

  function diretoriaLabel(id) {
    return labelById(SLTCatalog.catalog?.diretorias, id, "nome_oficial");
  }

  function planoLabel(id) {
    const p = SLTCatalog.getPlano(id) || SLTCatalog.getItem(SLTCatalog.catalog?.planos, id);
    return p?.sigla || p?.nome_oficial || "—";
  }

  function classificacaoLabel(classificacao, planoId) {
    if (!classificacao) return "—";
    const cat = SLTCatalog.catalog;
    if (classificacao.tipo === "frente_pli" || planoId === PLANO_PLI) {
      return labelById(cat?.frentes_pli, classificacao.frente_id, "nome_oficial");
    }
    if (classificacao.tipo === "eixo_pef" || planoId === PLANO_PEF) {
      const eixo = labelById(cat?.eixos_pef, classificacao.eixo_id, "nome_oficial");
      if (classificacao.corredor_tic_id) {
        const tic = labelById(cat?.corredores_tic, classificacao.corredor_tic_id, "nome_oficial");
        return `${eixo} · ${tic}`;
      }
      return eixo;
    }
    return "—";
  }

  function complementosLabel(complementos) {
    if (!complementos) return "—";
    const cat = SLTCatalog.catalog;
    const parts = [];
    if (complementos.modal_id) {
      parts.push(`Modal: ${labelById(cat?.modais, complementos.modal_id, "nome")}`);
    }
    if (complementos.tipologia_id) {
      parts.push(`Tipologia: ${labelById(cat?.tipologias, complementos.tipologia_id, "nome")}`);
    }
    if (complementos.carteira_id) {
      parts.push(`Carteira: ${labelById(cat?.carteiras, complementos.carteira_id, "nome")}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }

  function instituicaoLabel(demanda) {
    if (demanda.instituicao_label) return demanda.instituicao_label;
    const inst = SLTSigmaRead.findInstituicao(state.instituicoes, demanda.instituicao_id);
    return SLTSigmaRead.labelInstituicao(inst);
  }

  function representanteLabel(demanda) {
    const rep = demanda.representante || {};
    if (rep.nome) return rep.nome;
    const p = SLTSigmaRead.findPessoa(state.pessoas, rep.pessoa_id || demanda.pessoa_id);
    return SLTSigmaRead.labelPessoa(p);
  }

  function grupoComparacaoLabel(grupo, planoIdHint) {
    if (!grupo) return "—";
    const parts = grupo.split("|");
    const planoId = parts[0] || planoIdHint;
    const labels = [planoLabel(planoId)];
    if (parts[1]) {
      if (planoId === PLANO_PLI) {
        labels.push(labelById(SLTCatalog.catalog?.frentes_pli, parts[1], "nome_oficial"));
      } else if (planoId === PLANO_PEF) {
        labels.push(labelById(SLTCatalog.catalog?.eixos_pef, parts[1], "nome_oficial"));
      } else {
        labels.push(parts[1]);
      }
    }
    if (parts[2]) {
      labels.push(labelById(SLTCatalog.catalog?.corredores_tic, parts[2], "nome_oficial"));
    }
    return labels.filter((x) => x && x !== "—").join(" · ") || grupo;
  }

  function geometriaResumo(geometria) {
    if (!geometria?.tipo) return "Ponto (coordenadas)";
    const map = {
      Point: "Ponto",
      LineString: "Linha",
      Polygon: "Polígono",
      MultiPoint: "Multiponto",
      MultiLineString: "Multilinha",
      MultiPolygon: "Multipolígono",
    };
    return map[geometria.tipo] || geometria.tipo;
  }

  function fillSelect(el, items, valueKey, labelFn, placeholder) {
    if (!el) return;
    const opts = [`<option value="">${escapeHtml(placeholder || "— Selecione —")}</option>`];
    (items || []).forEach((item) => {
      opts.push(
        `<option value="${escapeHtml(item[valueKey || "id"])}">${escapeHtml(labelFn(item))}</option>`
      );
    });
    el.innerHTML = opts.join("");
  }

  function statusBadgeClass(codigo) {
    return `badge-status ${escapeHtml(codigo || "")}`;
  }

  global.SLTAdminLabels = {
    PLANO_PLI,
    PLANO_PEF,
    init,
    escapeHtml,
    formatDate,
    formatCnpj,
    statusDemandaLabel,
    statusObjetoLabel,
    diretoriaLabel,
    planoLabel,
    classificacaoLabel,
    complementosLabel,
    instituicaoLabel,
    representanteLabel,
    grupoComparacaoLabel,
    geometriaResumo,
    fillSelect,
    labelById,
    statusBadgeClass,
    get statusDemanda() {
      return state.statusDemanda;
    },
    get statusObjeto() {
      return state.statusObjeto;
    },
  };
})(window);
