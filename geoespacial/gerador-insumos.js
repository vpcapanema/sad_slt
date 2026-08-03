(function () {
  "use strict";
  const API = "/api/geoespacial";
  const modulo =
    document.body.dataset.geradorModulo ||
    document.querySelector("[data-gerador-modulo]")?.dataset.geradorModulo ||
    "fase1";
  const state = { produto: null };
  const host = document.querySelector("[data-shared-containers]");
  const sectionNumbers = { indice: 2, gp: 3, detalhes: 4 };
  const indiceSection =
    modulo === "fase1"
      ? `
    <section class="gerador-section" id="indice-riscos-restricoes">
      <header class="gerador-section__header"><span class="gerador-section__number">${sectionNumbers.indice}</span><div class="gerador-section__heading"><h2>Índice de riscos e restrições</h2><p>Fundamentos, critérios canônicos e limiares metodológicos usados por este fluxo.</p></div></header>
      <div class="gerador-section__body">
        <div class="fase1-methodology-link">
          <div><strong>Biblioteca e índices de risco e restrição</strong><p>Consulte os fundamentos, os 23 critérios canônicos e configure os limiares usados por este fluxo.</p><span id="metodologia-status" class="fase1-version">Configuração não validada</span></div>
          <a class="btn btn-secondary" href="/restrict/geoespacial/configuracao-risco-restricao/">Abrir configuração metodológica</a>
        </div>
      </div>
    </section>`
      : "";

  host.innerHTML = `
    ${indiceSection}
    <section class="gerador-section gerador-section--gp" id="bancada-geoprocessamento">
      <header class="gerador-section__header"><span class="gerador-section__number">${sectionNumbers.gp}</span><div class="gerador-section__heading"><h2>Geoprocessamento</h2><p>Configure e execute o fluxo diretamente no componente. Gera a camada de saída no tipo selecionado no cadastro.</p></div></header>
      <div class="gerador-section__body"><iframe id="gp-frame" class="gerador-gp-frame" title="Componente de geoprocessamento" src="/restrict/geoespacial/bancada/?modulo=${modulo}&embutido=1"></iframe></div>
    </section>
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
    const tipo = value("tipo-saida");
    const nome = value("nome");
    const versao = value("versao") || "v1";
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
  function conectarComponente() {
    const frame = $("#gp-frame");
    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      ["pronto", "recurso-importado", "resultado"].forEach(name => doc?.addEventListener(`slt:geoprocessamento:${name}`, event => {
        $("#estado-processamento").textContent = name === "resultado" ? "Resultado produzido" : "Bancada ativa";
        registrarEvento(`Geoprocessamento: ${name}`, event.detail);
      }));
    });
  }
  $("#salvar-produto").addEventListener("click", salvarProduto);
  $("#limpar-eventos").addEventListener("click", () => $("#eventos-processamento").innerHTML = "");
  ["tipo-saida", "nome", "versao"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      const codigo = gerarCodigo();
      document.getElementById("codigo").value = codigo;
    });
  });
  if (modulo === "fase1") {
    const metodologia = fase1Metodologia();
    const status = $("#metodologia-status");
    if (status && metodologia?.validada_em) {
      status.textContent = `Validada · versão ${metodologia.versao}`;
      status.classList.add("is-valid");
    }
  }
  conectarComponente();
})();
