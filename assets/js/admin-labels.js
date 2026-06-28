(function (global) {
  const PLANO_PLI = "PLANO-PLI";
  const PLANO_PEF = "PLANO-PEF";
  const CODIGO_PLANO_OUTROS = "PLANO-OUTROS";
  const CODIGO_PROGRAMA_OUTROS = "PROG-OUTROS";
  const NOME_PLANO_OUTROS = "Outros planos";
  const NOME_PROGRAMA_OUTROS = "Outros programas";

  const state = {
    statusDemanda: [],
    statusObjeto: [],
    transicoesStatus: {},
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

  function formatMoney(value) {
    if (value == null || value === "") return "—";
    const n = Number(value);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatVigencia(inicio, fim) {
    if (!inicio && !fim) return "—";
    const fmt = (iso) => {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleDateString("pt-BR");
      } catch {
        return iso;
      }
    };
    if (inicio && fim) return `${fmt(inicio)} – ${fmt(fim)}`;
    return fmt(inicio || fim);
  }

  function truncate(text, maxLen) {
    const s = String(text ?? "").trim();
    if (!s) return "—";
    const limit = maxLen || 72;
    return s.length <= limit ? s : `${s.slice(0, limit - 1)}…`;
  }

  function vinculoInstitucionalLabel(flag, tipo) {
    if (!flag) return "Não";
    if (tipo === "programa") return "Sim · programa";
    if (tipo === "plano") return "Sim · plano";
    return "Sim";
  }

  function abrangenciaLabel(unidades) {
    const n = (unidades || []).length;
    if (!n) return "—";
    return `${n} unidade${n > 1 ? "s" : ""}`;
  }

  function instituicaoRowLabel(row) {
    return instituicaoLabel(row);
  }

  async function init(basePath) {
    basePath = basePath || "../";
    await SLTCatalog.loadCatalog(basePath);
    const sigma = global.SLTSigmaRead;
    const [statusDemanda, statusObjeto, transicoesResp, instituicoes, pessoas] = await Promise.all([
      SLTAdminApi.listStatusDemanda(),
      SLTAdminApi.listStatusObjetoAhp(),
      SLTAdminApi.listTransicoesStatusDemanda().catch(() => ({ transicoes: {} })),
      sigma ? sigma.listInstituicoes().catch(() => []) : Promise.resolve([]),
      sigma ? sigma.listPessoas().catch(() => []) : Promise.resolve([]),
    ]);
    state.statusDemanda = statusDemanda;
    state.statusObjeto = statusObjeto;
    state.transicoesStatus = transicoesResp?.transicoes || {};
    state.instituicoes = instituicoes;
    state.pessoas = pessoas;
  }

  function findStatus(codigo) {
    return state.statusDemanda.find((s) => s.codigo === codigo);
  }

  function statusDemandaLabel(codigo, tipoDemanda) {
    const row = findStatus(codigo);
    if (!row) return codigo || "—";
    const tipo = tipoDemanda && String(tipoDemanda).trim();
    if (tipo && row.rotulos_por_tipo?.[tipo]) return row.rotulos_por_tipo[tipo];
    return row.nome || codigo || "—";
  }

  function statusObjetoLabel(codigo) {
    return statusDemandaLabel(codigo, "projeto");
  }

  function statusBadgeClass(codigo) {
    const base = global.SLTStatusColors?.badgeClass?.(codigo);
    if (base) return base;
    return `badge-status ${String(codigo || "").replace(/\s+/g, "")}`;
  }

  function statusBadgeHtml(codigo, tipoDemanda) {
    const label = statusDemandaLabel(codigo, tipoDemanda);
    const acao = global.SLTStatusColors?.actionClass?.(codigo) || "";
    return `<span class="${statusBadgeClass(codigo)}${acao}">${escapeHtml(label)}</span>`;
  }

  function statusDestinosPermitidos(codigoAtual) {
    const destinos = state.transicoesStatus[codigoAtual];
    if (Array.isArray(destinos) && destinos.length) return destinos;
    return codigoAtual ? [codigoAtual] : [];
  }

  function diretoriaLabel(id) {
    return labelById(SLTCatalog.catalog?.diretorias, id, "nome_oficial");
  }

  function planoLabel(id) {
    if (id === CODIGO_PLANO_OUTROS) return NOME_PLANO_OUTROS;
    const p = SLTCatalog.getPlano(id) || SLTCatalog.getItem(SLTCatalog.catalog?.planos, id);
    return p?.sigla || p?.nome_oficial || id || "—";
  }

  function planoCadastradoLabel(row) {
    const codigo = row?.plano_codigo || row?.id;
    if (codigo === CODIGO_PLANO_OUTROS) return NOME_PLANO_OUTROS;
    if (row?.plano_nome && row?.plano_codigo) {
      return `${row.plano_codigo} — ${row.plano_nome}`;
    }
    if (row?.plano_nome) return row.plano_nome;
    if (row?.plano_codigo) return row.plano_codigo;
    return "—";
  }

  function programaCadastradoLabel(row) {
    if (row?.programa_codigo === CODIGO_PROGRAMA_OUTROS) return NOME_PROGRAMA_OUTROS;
    if (row?.programa_codigo) {
      return row.programa_nome
        ? `${row.programa_codigo} — ${row.programa_nome}`
        : row.programa_codigo;
    }
    if (!row?.vinculo_institucional) return NOME_PROGRAMA_OUTROS;
    return "—";
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

  global.SLTAdminLabels = {
    PLANO_PLI,
    PLANO_PEF,
    CODIGO_PLANO_OUTROS,
    CODIGO_PROGRAMA_OUTROS,
    NOME_PLANO_OUTROS,
    NOME_PROGRAMA_OUTROS,
    init,
    escapeHtml,
    formatDate,
    formatCnpj,
    statusDemandaLabel,
    statusObjetoLabel,
    statusBadgeHtml,
    statusDestinosPermitidos,
    diretoriaLabel,
    planoLabel,
    planoCadastradoLabel,
    programaCadastradoLabel,
    classificacaoLabel,
    complementosLabel,
    instituicaoLabel,
    representanteLabel,
    grupoComparacaoLabel,
    geometriaResumo,
    fillSelect,
    labelById,
    statusBadgeClass,
    formatMoney,
    formatVigencia,
    truncate,
    vinculoInstitucionalLabel,
    abrangenciaLabel,
    instituicaoRowLabel,
    get statusDemanda() {
      return state.statusDemanda;
    },
    get statusObjeto() {
      return state.statusObjeto;
    },
    get instituicoes() {
      return state.instituicoes;
    },
    get pessoas() {
      return state.pessoas;
    },
  };
})(window);
