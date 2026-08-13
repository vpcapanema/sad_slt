(function () {
  "use strict";
  const API = "/api/geoespacial";
  const modulo =
    document.body.dataset.geradorModulo ||
    document.querySelector("[data-gerador-modulo]")?.dataset.geradorModulo ||
    "fase1";
  const state = { produto: null };
  // fase2 tem uma seção extra (Análise Multicritério) entre Cadastro e Geoprocessamento.
  const sectionNumbers = modulo === "fase2" ? { gp: 3, detalhes: 4 } : { gp: 2, detalhes: 3 };
  const detalhesHost = document.querySelector("[data-shared-detalhes]");
  if (detalhesHost) detalhesHost.innerHTML = `
    <section class="gerador-section" id="detalhes-processamento">
      <header class="gerador-section__header"><span class="gerador-section__number">${sectionNumbers.detalhes}</span><div class="gerador-section__heading"><h2>Detalhes e interação do processamento</h2><p>Acompanhe eventos, resultados, alertas e decisões da execução.</p></div></header>
      <div class="gerador-section__body gerador-details"><div class="gerador-status-card"><div class="gerador-status-label">Camada de saída</div><div id="produto-atual" class="gerador-status-value">Não cadastrada</div><hr><div class="gerador-status-label">Estado</div><div id="estado-processamento" class="gerador-status-value">Aguardando configuração</div></div><div><div id="eventos-processamento" class="gerador-events"><div class="gerador-event">Os eventos da bancada aparecerão aqui.</div></div><div class="gerador-actions"><button class="btn btn-secondary" id="limpar-eventos" type="button">Limpar mensagens</button></div></div></div>
    </section>`;

  const $ = (selector) => document.querySelector(selector);
  function feedback(selector, message, type) {
    const node = $(selector); node.textContent = message; node.className = `gerador-feedback${type ? ` is-${type}` : ""}`;
  }
  function value(id) { return document.getElementById(id)?.value?.trim() || null; }
  function slug(text) {
    return String(text || "")
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "").slice(0, 48) || "camada";
  }
  function gerarCodigo() {
    const nome = value("nome");
    const versao = value("versao") || "v1";
    if (modulo === "fase2") {
      if (!nome) return "";
      return `fase2_favorabilidade_${slug(nome)}_${versao}`;
    }
    const tipo = value("tipo-saida");
    if (!tipo || !nome) return "";
    return `fase1_${tipo}_${slug(nome)}_${versao}`;
  }
  function fase1Metodologia() {
    try { return JSON.parse(localStorage.getItem("sicard:fase1:metodologia") || "null"); }
    catch (_error) { return null; }
  }
  async function jsonFetch(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `Erro HTTP ${response.status}`);
    return payload;
  }
  function produtoPayload() {
    const tipo = value("tipo-saida");
    const configuracao = modulo === "fase1" ? {
      tipo_saida: tipo,
      restricao_prevalece: tipo === "restricao",
      metodologia_risco_restricao: {
        biblioteca: { codigo: "biblioteca_fase1_risco_restricao", versao: fase1Metodologia()?.biblioteca_versao || null },
        indices: { formula_impacto: "media_ponderada_componentes_aplicaveis", formula_risco: "probabilidade_ativacao_x_impacto_x_100", formula_restricao: "ato_vigente_x_intersecao_validada_x_aplicabilidade", sem_dado: "nao_avaliado", configuracao: fase1Metodologia() }
      }
    } : {};
    const codigo = gerarCodigo();
    document.getElementById("codigo").value = codigo;
    return { modulo, codigo, nome: value("nome"), descricao: value("descricao"), versao: value("versao"), data_referencia: value("data-referencia"), observacao_metodologica: value("observacao"), configuracao };
  }
  async function salvarProduto() {
    if (modulo === "fase1" && !fase1Metodologia()?.validada_em) {
      feedback("#produto-feedback", "Valide primeiro a metodologia e os limiares da Fase 1.", "error");
      document.getElementById("bancada-geoprocessamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const form = $("#produto-form"); if (!form.reportValidity()) return;
    feedback("#produto-feedback", "Salvando…");
    try {
      state.produto = await jsonFetch(`${API}/produtos-geradores`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(produtoPayload()) });
      feedback("#produto-feedback", `Camada ${state.produto.codigo} cadastrada.`, "success");
      $("#produto-atual").textContent = `${state.produto.nome} · ${state.produto.versao}`;
      $("#estado-processamento").textContent = "Rascunho";
      registrarEvento("Camada de saída persistida", state.produto);
    } catch (error) { feedback("#produto-feedback", error.message, "error"); }
  }
  function registrarEvento(label, detail) {
    const container = $("#eventos-processamento");
    if (container.children.length === 1 && container.textContent.includes("aparecerão")) container.innerHTML = "";
    const event = document.createElement("div"); event.className = "gerador-event";
    event.innerHTML = `<time>${new Date().toLocaleTimeString("pt-BR")}</time><strong>${label}</strong>${detail ? ` — ${detail.nome || detail.camada_id || detail.raster_id || detail.id || "concluído"}` : ""}`;
    container.prepend(event);
  }
  const CORES_TIPO_SAIDA = { restricao: "#dc2626", risco: "#f2c200" };
  function corDaSaida() {
    const tipo = value("tipo-saida") || state.produto?.configuracao?.tipo_saida;
    return CORES_TIPO_SAIDA[tipo] || null;
  }
  function idDoEvento(detail) {
    if (!detail) return null;
    return detail.resultado?.camada_id || detail.resultado?.raster_id || detail.camada_id || detail.raster_id || detail.id || detail.recursos?.[0]?.id || null;
  }
  function aplicarCorSaida(id) {
    const cor = corDaSaida();
    if (cor && id) window.gpApp?.aplicarCorPadraoCamada?.(id, cor);
  }
  function conectarComponente() {
    ["pronto", "recurso-importado", "resultado"].forEach(name => document.addEventListener(`slt:geoprocessamento:${name}`, event => {
      $("#estado-processamento").textContent = name === "resultado" ? "Resultado produzido" : "Bancada ativa";
      registrarEvento(`Geoprocessamento: ${name}`, event.detail);
      if (name !== "pronto") aplicarCorSaida(idDoEvento(event.detail));
    }));
  }
  // ------------------------------------------------------------------
  // Seção 1 (seletor de hierarquização) e Seção 2 (análise multicritério) — só na fase2.
  // ------------------------------------------------------------------
  async function carregarHierarquizacoes() {
    const select = $("#gerador-hierarquizacao");
    if (!select || !window.HierApi) return;
    try {
      const lista = await window.HierApi.listar();
      select.innerHTML = '<option value="">Selecione a hierarquização…</option>' +
        (lista || []).map((h) => `<option value="${h.codigo}">${h.codigo} — ${h.nome}</option>`).join("");
    } catch (_error) {
      select.innerHTML = '<option value="">Não foi possível carregar as hierarquizações</option>';
    }
  }
  const COLUNAS_MATRIZ = ["dimensão", "dimensao", "critério", "criterio", "etapa", "classificação", "classificacao", "fase", "relação", "relacao", "mandatório", "mandatorio"];
  function renderMatrizCriterios(hier) {
    const host = $("#gerador-matriz-criterios");
    if (!host) return;
    const matriz = hier?.dados_hierarquizacao?.matriz_premissas_criterios;
    const linhas = Array.isArray(matriz) ? matriz : (matriz?.linhas || []);
    if (!linhas.length) { host.hidden = true; host.innerHTML = ""; return; }
    const todasColunas = Object.keys(linhas[0]);
    const colunas = todasColunas.filter((c) => COLUNAS_MATRIZ.includes(c.toLowerCase())).length
      ? todasColunas.filter((c) => COLUNAS_MATRIZ.includes(c.toLowerCase()))
      : todasColunas.slice(0, 6);
    host.hidden = false;
    host.innerHTML = `<label>Matriz de critérios e premissas (${linhas.length} critérios)</label>` +
      `<div class="gerador-tabela-scroll"><table class="gerador-tabela-matriz">` +
      `<thead><tr>${colunas.map((c) => `<th>${c}</th>`).join("")}</tr></thead>` +
      `<tbody>${linhas.map((linha) => `<tr>${colunas.map((c) => `<td>${linha[c] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>` +
      `</table></div>`;
  }
  async function atualizarSecaoAhp(hier) {
    const vazio = $("#ahp-config-vazio"), atual = $("#ahp-config-atual"), atualValor = $("#ahp-config-atual-valor");
    const selecionar = $("#ahp-config-selecionar"), select = $("#ahp-config-select"), novaLink = $("#ahp-config-nova");
    if (!vazio) return;
    if (!hier) {
      vazio.hidden = false; atual.hidden = true; selecionar.hidden = true;
      if (novaLink) novaLink.href = "/restrict/ahp/";
      return;
    }
    vazio.hidden = true;
    if (hier.config_id || hier.config_codigo) {
      atual.hidden = false; selecionar.hidden = true;
      atualValor.textContent = hier.config_codigo || hier.config_id;
    } else {
      atual.hidden = true; selecionar.hidden = false;
      try {
        const configs = await window.HierApi.listarConfigs();
        select.innerHTML = (configs || []).length
          ? '<option value="">Selecione uma configuração…</option>' + configs.map((c) => `<option value="${c.codigo}">${c.codigo} — ${c.nome}</option>`).join("")
          : '<option value="">Nenhuma configuração encontrada</option>';
      } catch (_error) {
        select.innerHTML = '<option value="">Não foi possível carregar as configurações</option>';
      }
    }
    if (novaLink) novaLink.href = `/restrict/ahp/?hierarquizacao=${encodeURIComponent(hier.codigo)}`;
  }
  async function selecionarHierarquizacao() {
    const codigo = $("#gerador-hierarquizacao")?.value;
    if (!codigo) { renderMatrizCriterios(null); atualizarSecaoAhp(null); return; }
    try {
      const hier = await window.HierApi.obter(codigo);
      state.hierarquizacao = hier;
      renderMatrizCriterios(hier);
      atualizarSecaoAhp(hier);
    } catch (error) {
      feedback("#produto-feedback", `Não foi possível carregar a hierarquização: ${error.message}`, "error");
    }
  }
  async function vincularConfigSelecionada() {
    const hierCodigo = $("#gerador-hierarquizacao")?.value;
    const configCodigo = $("#ahp-config-select")?.value;
    if (!hierCodigo || !configCodigo) return;
    try {
      const atualizado = await window.HierApi.atualizar(hierCodigo, { config_codigo: configCodigo });
      state.hierarquizacao = atualizado;
      feedback("#ahp-config-feedback", "Configuração vinculada com sucesso.", "success");
      atualizarSecaoAhp(atualizado);
    } catch (error) {
      feedback("#ahp-config-feedback", error.message, "error");
    }
  }
  $("#salvar-produto").addEventListener("click", salvarProduto);
  $("#limpar-eventos").addEventListener("click", () => $("#eventos-processamento").innerHTML = "");
  ["tipo-saida", "nome", "versao"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      const codigo = gerarCodigo();
      document.getElementById("codigo").value = codigo;
    });
  });
  conectarComponente();
  if (modulo === "fase2") {
    carregarHierarquizacoes();
    $("#gerador-hierarquizacao")?.addEventListener("change", selecionarHierarquizacao);
    $("#ahp-config-vincular")?.addEventListener("click", vincularConfigSelecionada);
  }
})();
