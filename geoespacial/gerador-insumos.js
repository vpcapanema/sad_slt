(function () {
  "use strict";
  const API = "/api/geoespacial";
  const modulo = document.body.dataset.geradorModulo;
  const state = { produto: null, itens: [], algoritmos: [], funcoes: [] };
  const host = document.querySelector("[data-shared-containers]");

  host.innerHTML = `
    <section class="gerador-section" id="configuracao-fluxo">
      <header class="gerador-section__header"><span class="gerador-section__number">2</span><div class="gerador-section__heading"><h2>Configuração do fluxo</h2><p>Monte a sequência com funções reutilizáveis e algoritmos atômicos.</p></div></header>
      <div class="gerador-section__body">
        <div class="gerador-flow-toolbar">
          <div class="gerador-field"><label for="tipo-item">Tipo da etapa</label><select id="tipo-item"><option value="funcao">Função</option><option value="algoritmo">Algoritmo</option></select></div>
          <div class="gerador-field"><label for="referencia-item">Função ou algoritmo</label><select id="referencia-item"></select></div>
          <button class="btn btn-primary" id="adicionar-item" type="button">Adicionar etapa</button>
        </div>
        <div id="fluxo-lista" class="gerador-flow-list"><div class="gerador-flow-empty">Nenhuma etapa configurada.</div></div>
        <div class="gerador-actions"><span id="fluxo-feedback" class="gerador-feedback">Salve primeiro o cadastro da saída.</span><button class="btn btn-secondary" id="atualizar-catalogo" type="button">Atualizar catálogo</button><button class="btn btn-primary" id="salvar-fluxo" type="button" disabled>Salvar configuração do fluxo</button></div>
      </div>
    </section>
    <section class="gerador-section gerador-section--gp" id="bancada-geoprocessamento">
      <header class="gerador-section__header"><span class="gerador-section__number">3</span><div class="gerador-section__heading"><h2>Geoprocessamento</h2><p>Execute algoritmos, construa funções e produza os recursos espaciais.</p></div></header>
      <div class="gerador-section__body"><iframe id="gp-frame" class="gerador-gp-frame" title="Componente de geoprocessamento" src="_geoprocessamento.html?modulo=${modulo}&embutido=1"></iframe></div>
    </section>
    <section class="gerador-section" id="detalhes-processamento">
      <header class="gerador-section__header"><span class="gerador-section__number">4</span><div class="gerador-section__heading"><h2>Detalhes e interação do processamento</h2><p>Acompanhe eventos, resultados, alertas e decisões da execução.</p></div></header>
      <div class="gerador-section__body gerador-details"><div class="gerador-status-card"><div class="gerador-status-label">Produto atual</div><div id="produto-atual" class="gerador-status-value">Não cadastrado</div><hr><div class="gerador-status-label">Estado</div><div id="estado-processamento" class="gerador-status-value">Aguardando configuração</div></div><div><div id="eventos-processamento" class="gerador-events"><div class="gerador-event">Os eventos da bancada aparecerão aqui.</div></div><div class="gerador-actions"><button class="btn btn-secondary" id="limpar-eventos" type="button">Limpar mensagens</button></div></div></div>
    </section>`;

  const $ = (selector) => document.querySelector(selector);
  function feedback(selector, message, type) {
    const node = $(selector); node.textContent = message; node.className = `gerador-feedback${type ? ` is-${type}` : ""}`;
  }
  function value(id) { return document.getElementById(id)?.value?.trim() || null; }
  async function jsonFetch(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `Erro HTTP ${response.status}`);
    return payload;
  }
  function produtoPayload() {
    const configuracao = modulo === "fase1" ? {
      regra_sobreposicao: value("regra-overlay"), regra_conflito_atributos: value("conflitos"), restricao_prevalece: true
    } : {
      resolucao: Number(value("resolucao")), unidade_resolucao: value("unidade-resolucao"), regra_nodata: value("regra-nodata"), metodo_combinacao: value("metodo-combinacao")
    };
    return { modulo, codigo: value("codigo"), nome: value("nome"), descricao: value("descricao"), versao: value("versao"), responsavel_tecnico: value("responsavel"), crs_saida: value("crs"), formato_saida: value("formato"), data_referencia: value("data-referencia"), observacao_metodologica: value("observacao"), configuracao };
  }
  async function salvarProduto() {
    const form = $("#produto-form"); if (!form.reportValidity()) return;
    feedback("#produto-feedback", "Salvando…");
    try {
      state.produto = await jsonFetch(`${API}/produtos-geradores`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(produtoPayload()) });
      feedback("#produto-feedback", `Produto ${state.produto.codigo} cadastrado.`, "success");
      $("#produto-atual").textContent = `${state.produto.nome} · ${state.produto.versao}`;
      $("#estado-processamento").textContent = "Rascunho";
      $("#salvar-fluxo").disabled = false;
      feedback("#fluxo-feedback", "Configure e salve a receita deste produto.");
      registrarEvento("Produto persistido", state.produto);
    } catch (error) { feedback("#produto-feedback", error.message, "error"); }
  }
  async function carregarCatalogo() {
    try {
      const [algoritmos, funcoes] = await Promise.all([jsonFetch(`${API}/algoritmos`), jsonFetch(`${API}/funcoes`)]);
      state.algoritmos = algoritmos; state.funcoes = funcoes; renderReferencias();
    } catch (error) { feedback("#fluxo-feedback", `Catálogo indisponível: ${error.message}`, "error"); }
  }
  function renderReferencias() {
    const tipo = value("tipo-item") || "funcao";
    const lista = tipo === "algoritmo" ? state.algoritmos : state.funcoes;
    $("#referencia-item").innerHTML = lista.length ? lista.map(item => `<option value="${item.id}">${item.nome}</option>`).join("") : `<option value="">Nenhum ${tipo} disponível</option>`;
  }
  function adicionarItem() {
    const tipo = value("tipo-item"), id = value("referencia-item"); if (!id) return;
    const source = (tipo === "algoritmo" ? state.algoritmos : state.funcoes).find(item => item.id === id);
    state.itens.push({ tipo, referencia_id: id, nome: source?.nome || id, ordem: state.itens.length + 1, parametros: {}, entrada: {}, saida: {} }); renderItens();
  }
  function renderItens() {
    $("#fluxo-lista").innerHTML = state.itens.length ? state.itens.map((item, index) => `<div class="gerador-flow-item"><span class="gerador-flow-order">${index + 1}</span><span class="gerador-flow-type">${item.tipo}</span><strong>${item.nome}</strong><button type="button" class="btn btn-secondary" data-remover-item="${index}">Remover</button></div>`).join("") : '<div class="gerador-flow-empty">Nenhuma etapa configurada.</div>';
  }
  async function salvarFluxo() {
    if (!state.produto) return; if (!state.itens.length) return feedback("#fluxo-feedback", "Adicione ao menos uma etapa.", "error");
    feedback("#fluxo-feedback", "Salvando fluxo…");
    try {
      const fluxo = await jsonFetch(`${API}/produtos-geradores/${state.produto.id}/fluxos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: `Fluxo ${state.produto.nome}`, descricao: `Receita de processamento ${modulo}`, itens: state.itens }) });
      feedback("#fluxo-feedback", `Fluxo versão ${fluxo.versao} salvo.`, "success"); registrarEvento("Configuração do fluxo persistida", fluxo);
    } catch (error) { feedback("#fluxo-feedback", error.message, "error"); }
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
  $("#tipo-item").addEventListener("change", renderReferencias);
  $("#adicionar-item").addEventListener("click", adicionarItem);
  $("#atualizar-catalogo").addEventListener("click", carregarCatalogo);
  $("#salvar-fluxo").addEventListener("click", salvarFluxo);
  $("#fluxo-lista").addEventListener("click", event => { const index = event.target.dataset.removerItem; if (index !== undefined) { state.itens.splice(Number(index), 1); state.itens.forEach((item, i) => item.ordem = i + 1); renderItens(); } });
  $("#limpar-eventos").addEventListener("click", () => $("#eventos-processamento").innerHTML = "");
  conectarComponente(); carregarCatalogo();
})();
