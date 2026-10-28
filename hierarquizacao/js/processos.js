(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const RELATORIOS = {
    relatorio_fase1: "Relatório da Fase 1",
    relatorio_fase2: "Relatório da Fase 2",
    relatorio_fase3: "Relatório da Fase 3",
    relatorio_consolidado: "Relatório consolidado",
  };
  let listaCache = [],
    agrupamentosCache = [],
    hierEditMode = false,
    matrizAtual = null;
  const matrixEditors = new Map();
  const cadastroMatrixPicker = window.SLTMatrizesCriterios.mount($("hier-matrix-picker"));
  const ordenarHier = SLTTable.sorting($('hier-tbody').closest('table'), () => [null,
    h=>rotuloSituacaoHier(h.status), h=>h.codigo, h=>h.julgamento_id, h=>h.nome, h=>h.descricao,
    h=>JSON.stringify(matrizDaHier(h)), ...['objetos','julgamento_projetos','pesos_projetos','ranking'].map(key=>h=>JSON.stringify(h[key])),
    ...Object.keys(RELATORIOS).map(key=>h=>JSON.stringify(h[key])),
    h=>h.homologadoEm, h=>h.homologadoPorNome||h.homologadoPor, h=>h.criadoPorNome||h.criadoPor,
    h=>h.criadoEm, h=>h.atualizadoEm, h=>rotuloTipoDemanda(h.tipo_demanda||h.tipo_demanda_id), h=>h.grupo_id, h=>JSON.stringify(h.dados_hierarquizacao)
  ], () => { paginaHier=1; selecionadasHier.clear(); renderTabela(); }, () => !hierEditMode);
  let paginaHier = 1;
  let operando = false;
  const selecionadasHier = new Set();
  const HIER_FILTER_COLUMNS = [
    ["status", "Situação"], ["codigo", "Código da hierarquização"], ["julgamento_id", "ID Julgamento"],
    ["nome", "Nome"], ["descricao", "Descrição"], ["tipo_demanda", "Tipo de demanda"], ["grupo_id", "Grupo comparável"],
    ["homologadoPorNome", "Responsável pela homologação"], ["criadoPorNome", "Responsável pelo cadastro"],
    ["criadoEm", "Data de cadastro"], ["atualizadoEm", "Última atualização"]
  ];
  const STATUS_HIER = ["em_julgamento", "calculada", "homologada", "arquivada"];
  // Os quatro relatórios compartilham o visualizador de arquivos e metadados.
  const MODAIS_COLUNA = {
    objetos: { modal: "modal-objetos", titulo: "Demandas do grupo" },
    julgamento_projetos: { modal: "modal-julgamentos", titulo: "Julgamentos dos projetos" },
    pesos_projetos: { modal: "modal-pesos", titulo: "Pesos dos projetos" },
    ranking: { modal: "modal-ranking", titulo: "Classificação resultante" },
    dados_hierarquizacao: { modal: "modal-completo", titulo: "Dados completos da hierarquização" },
    ...Object.fromEntries(Object.entries(RELATORIOS).map(([key, titulo]) => [key, {modal:"modal-relatorios", titulo}])),
  };
  function preencherModal(id, titulo, conteudo) {
    const m = $(id);
    if (!m) return;
    const t = m.querySelector("[data-modal-title]");
    const b = m.querySelector("[data-modal-body]");
    if (t) t.textContent = titulo;
    if (b) {
      b.innerHTML = "";
      if (typeof conteudo === "string") b.innerHTML = conteudo;
      else if (conteudo instanceof Node) b.appendChild(conteudo);
    }
    m.classList.remove("hidden");
  }
  function jsonButton(h, key, label) {
    const v = h[key];
    return `<button class="json-cell" data-codigo="${esc(h.codigo)}" data-json="${key}">${v == null ? "Não preenchido" : label}</button>`;
  }
  async function carregarLista() {
    try {
      listaCache = await HierApi.listar();
      $("hier-loading").classList.add("hidden");
      atualizarOpcoesFiltroHier();
      renderTabela();
      $("hier-error").classList.add("hidden");
      return true;
    } catch (e) {
      $("hier-loading").classList.add("hidden");
      $("hier-error").textContent = e.message;
      $("hier-error").classList.remove("hidden");
      Notify.error("Gestão das hierarquizações", e.message);
      return false;
    }
  }
  function matrizDaHier(h) {
    return h?.dados_hierarquizacao?.cabecalho_grupo?.matriz_premissas_criterios;
  }
  function matrizCell(h) {
    const m = matrizDaHier(h);
    const tem = m && (Array.isArray(m) ? m.length : Object.keys(m).length);
    if (!tem) return "<span>Não enviada</span>";
    return `<button class="matriz-link" data-codigo="${esc(h.codigo)}" title="Ver e baixar a matriz"><i class="fas fa-file-lines"></i> Ver matriz</button>`;
  }
  // Formata valores de data da tabela: "03/08/2026 às 14:40".
  // Meio-dia (12:00) → "ao meio-dia"; meia-noite (00:00) → "à meia-noite".
  function fmtDataCelula(v) {
    if (v == null || v === "") return "—";
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
    if (!m) return String(v);
    const [, y, mo, d, hh, mi] = m;
    const dataStr = `${d}/${mo}/${y}`;
    if (hh == null) return dataStr;
    const H = Number(hh), M = Number(mi);
    if (H === 12 && M === 0) return `${dataStr} ao meio-dia`;
    if (H === 0 && M === 0) return `${dataStr} à meia-noite`;
    return `${dataStr} às ${hh}:${mi}`;
  }
  // Rótulos amigáveis da situação da hierarquização (domínio dom_status_hierarquizacao).
  const STATUS_HIER_LABEL = {
    em_julgamento: "Em julgamento",
    calculada: "Calculada",
    homologada: "Homologada",
    arquivada: "Arquivada",
  };
  function rotuloSituacaoHier(s) {
    if (!s) return "—";
    return STATUS_HIER_LABEL[s] || s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
  // Rótulos amigáveis do tipo de demanda (domínio plano | programa | projeto).
  const TIPO_DEMANDA_LABEL = { plano: "Plano", programa: "Programa", projeto: "Projeto" };
  function rotuloTipoDemanda(t) {
    if (t == null || t === "") return "—";
    return TIPO_DEMANDA_LABEL[t] || String(t).replace(/^./, (c) => c.toUpperCase());
  }
  function rowHtml(h, editing) {
    const marcada = selecionadasHier.has(h.codigo);
    const nome = editing ? `<input class="cell-edit" data-k="nome" value="${esc(h.nome)}">` : esc(h.nome);
    const desc = editing ? `<input class="cell-edit" data-k="descricao" value="${esc(h.descricao || "")}">` : esc(h.descricao || "—");
    const sit = editing
      ? `<select class="cell-edit" data-k="status">${STATUS_HIER.map((s) => `<option value="${s}"${s === h.status ? " selected" : ""}>${esc(rotuloSituacaoHier(s))}</option>`).join("")}</select>`
      : esc(rotuloSituacaoHier(h.status));
    return `<tr data-codigo="${esc(h.codigo)}"${editing ? ' class="is-editing"' : ""}>` +
      `<td class="col-select"><input type="checkbox" class="hier-row-select" data-codigo="${esc(h.codigo)}"${marcada ? " checked" : ""}></td>` +
      `<td>${sit}</td>` +
      `<td><code>${esc(h.codigo)}</code></td>` +
      `<td>${esc(h.julgamento_id || "—")}</td>` +
      `<td>${nome}</td>` +
      `<td>${desc}</td>` +
      `<td>${editing ? '<div data-hier-matrix-editor></div>' : matrizCell(h)}</td>` +
      `<td>${jsonButton(h, "objetos", "Visualizar demandas")}</td>` +
      `<td>${jsonButton(h, "julgamento_projetos", "Visualizar julgamentos")}</td>` +
      `<td>${jsonButton(h, "pesos_projetos", "Visualizar pesos")}</td>` +
      `<td>${jsonButton(h, "ranking", "Visualizar classificação")}</td>` +
      Object.keys(RELATORIOS).map(key => `<td>${h[key] && Object.keys(h[key]).length
        ? jsonButton(h, key, "Visualizar relatório") : "Não produzido"}</td>`).join("") +
      `<td>${esc(fmtDataCelula(h.homologadoEm))}</td>` +
      `<td>${esc(h.homologadoPorNome || h.homologadoPor || "—")}</td>` +
      `<td>${esc(h.criadoPorNome || h.criadoPor || "—")}</td>` +
      `<td>${esc(fmtDataCelula(h.criadoEm))}</td>` +
      `<td>${esc(fmtDataCelula(h.atualizadoEm))}</td>` +
      `<td>${esc(rotuloTipoDemanda(h.tipo_demanda || h.tipo_demanda_id))}</td>` +
      `<td>${esc(h.grupo_id || "—")}</td>` +
      `<td>${jsonButton(h, "dados_hierarquizacao", "Visualizar arquivo completo")}</td>` +
      `</tr>`;
  }
  function renderTabela() {
    const result = SLTTable.paginate('hier-pagination', hierarquizacoesFiltradas(), paginaHier, page => { paginaHier = page; selecionadasHier.clear(); hierEditMode = false; renderTabela(); });
    paginaHier = result.page;
    const rows = result.rows;
    const editando = hierEditMode ? selecionadasHier : new Set();
    $("hier-tbody").innerHTML =
      rows.map((h) => rowHtml(h, editando.has(h.codigo))).join("");

    ligarEventosTabela();
    atualizarBotoesLote();
    syncSelectAll();
  }
  function valorFiltro(h, coluna) {
    if (coluna === "status") return rotuloSituacaoHier(h.status);
    if (coluna === "tipo_demanda") return rotuloTipoDemanda(h.tipo_demanda || h.tipo_demanda_id);
    return h[coluna] ?? "";
  }
  function hierarquizacoesFiltradas() {
    const column = $("hier-filter-coluna").value, value = $("hier-filter-valor").value;
    return ordenarHier(listaCache.filter(h => SLTTable.matches('hier-filter', String(valorFiltro(h, column)) === (value === '__empty__' ? '' : value), Boolean(column && value))));
  }
  function atualizarOpcoesFiltroHier() {
    const column = $("hier-filter-coluna").value;
    SLTTable.values($("hier-filter-valor"), listaCache, h => valorFiltro(h, column));
    $("hier-filter-valor").disabled = !column;
  }
  function ligarEventosTabela() {
    const tbody = $("hier-tbody");
    matrixEditors.clear();
    tbody.querySelectorAll("[data-hier-matrix-editor]").forEach(root => {
      const codigo = root.closest("tr").dataset.codigo, h = listaCache.find(item => item.codigo === codigo);
      root.appendChild($("hier-matrix-editor-template").content.cloneNode(true));
      const reuseLabel = document.createElement("label"), reuse = document.createElement("input");
      reuse.type = "checkbox"; reuse.disabled = true;
      reuseLabel.append(reuse, " Reutilizar pesos existentes (somente matriz equivalente)");
      root.appendChild(reuseLabel);
      let original = null;
      const picker = window.SLTMatrizesCriterios.mount(root, { onChange(record) {
        if (record && String(record.id) === String(h.matriz_id)) original = record;
        const equivalent = Boolean(original?.assinatura && record?.assinatura === original.assinatura);
        reuse.checked = false;
        reuse.disabled = !equivalent || !temPesos(h) || String(record?.id) === String(h.matriz_id);
      } });
      matrixEditors.set(codigo, { picker, reuse, original: () => original });
      picker.ready.then(() => { if (h.matriz_id && root.isConnected) picker.choose(h.matriz_id); });
    });
    tbody.querySelectorAll(".json-cell").forEach((b) => {
      b.onclick = () => {
        const h = listaCache.find((x) => x.codigo === b.dataset.codigo);
        abrirColuna(b.dataset.json, h);
      };
    });
    tbody.querySelectorAll(".matriz-link").forEach((b) => {
      b.onclick = () => abrirMatriz(b.dataset.codigo);
    });
    tbody.querySelectorAll(".hier-row-select").forEach((cb) => {
      cb.onchange = () => {
        if (cb.checked) selecionadasHier.add(cb.dataset.codigo);
        else selecionadasHier.delete(cb.dataset.codigo);
        atualizarBotoesLote();
        syncSelectAll();
      };
    });
  }
  function syncSelectAll() {
    const sa = $("hier-select-all");
    const rows = hierarquizacoesFiltradas().slice((paginaHier - 1) * 15, paginaHier * 15);
    if (sa) sa.checked = rows.length > 0 && rows.every((h) => selecionadasHier.has(h.codigo));
  }
  function atualizarBotoesLote() {
    document.querySelectorAll('#hier-filter-coluna, #hier-filter-valor, #hier-filter-inverter, #hier-filter-limpar, #hier-select-all, .hier-row-select').forEach(el => { el.disabled = hierEditMode || operando; });
    if (hierEditMode || operando) document.querySelectorAll('#hier-pagination button').forEach(el => { el.disabled = true; });
    SLTTable.summary("hier-filter-count", selecionadasHier.size, hierarquizacoesFiltradas().slice((paginaHier - 1) * 15, paginaHier * 15).length, listaCache.length);
    const has = selecionadasHier.size > 0;
    const set = (id, dis) => { const el = $(id); if (el) el.disabled = dis || operando; };
    set("hier-new", false);
    set("hier-bulk-edit", !has || hierEditMode);
    set("hier-bulk-view", selecionadasHier.size !== 1 || hierEditMode);
    set("hier-bulk-cancel", !hierEditMode);
    set("hier-bulk-save", !hierEditMode || !has);
    set("hier-bulk-delete", !has || hierEditMode);
  }
  function setCadastroReadonly(readonly) {
    $("hier-create-section").classList.toggle("is-readonly", readonly);
    $("nova-hierarquizacao").querySelectorAll("input, select, textarea, button").forEach((control) => {
      if (!control.closest('.admin-filter-bar, .admin-pagination')) control.disabled = readonly;
    });
    cadastroMatrixPicker.setDisabled(readonly);
    $("nova-hierarquizacao").querySelector('.process-actions').classList.toggle("hidden", readonly);
  }
  function mostrarCadastroNovo() {
    setCadastroReadonly(false); $("nova-hierarquizacao").reset();
    cadastroMatrixPicker.reset(); $("hier-criteria-matrix-summary").textContent = "";
    carregarAgrupamentos();
    $("hier-create-section").classList.remove("hidden");
    $("hier-create-section").scrollIntoView({ behavior: "smooth", block: "start" }); $("hier-nome").focus();
  }

  async function carregarAgrupamentos(selecionado = "", objetosRegistrados = null) {
    const select = $("hier-agrupamento");
    if (!select) return;
    $("hier-agrupamento-resumo").hidden = true;
    try {
      agrupamentosCache = await HierApi.listarAgrupamentos();
      select.innerHTML = '<option value="">Selecione um agrupamento salvo</option>' + agrupamentosCache
        .map((grupo) => `<option value="${esc(grupo.id)}">${esc(grupo.nome)} — ${esc(grupo.codigo)}</option>`)
        .join("");
      select.value = selecionado || "";
      if (objetosRegistrados !== null && selecionado) {
        renderDemandasRegistradas(objetosRegistrados);
        const grupo = agrupamentosCache.find(item => String(item.id) === String(selecionado));
        if (grupo) mostrarResumoAgrupamento({...grupo, quantidade_demandas: objetosRegistrados.length});
      }
      else if (select.value) await renderResumoAgrupamento(select.value);
      else if (objetosRegistrados?.length) renderDemandasRegistradas(objetosRegistrados);
      else renderDemandasRegistradas([]);
    } catch (error) {
      select.innerHTML = '<option value="">Não foi possível carregar agrupamentos</option>';
      renderDemandasRegistradas(objetosRegistrados || [], error.message);
      Notify.error("Agrupamentos da hierarquização", error.message);
    }
  }

  let demandasAgrupamento = [], paginaAgrupamento = 1;
  const demandasSelecionadas = new Set();
  let demandasFiltradas = [];
  const chaveDemanda = item => String(item.id || item.codigo);
  const ordenarAgrupamento = SLTTable.sorting($('hier-agrupamento-demandas').closest('table'), () => [null,...['codigo','origem_sei_processo','nome','status'].map(key=>item=>valorAgrupamento(item,key))], () => { paginaAgrupamento=1; renderDemandasAgrupamento(); });
  function valorAgrupamento(item, key) { return String(key === 'codigo' ? item.codigo || item.id || '—' : item[key] || '—'); }
  function atualizarFiltroAgrupamento() {
    const column = $('hier-grupo-coluna').value;
    SLTTable.values($('hier-grupo-valor'), demandasAgrupamento, item => valorAgrupamento(item, column));
    $('hier-grupo-valor').disabled = !column;
  }
  function renderDemandasAgrupamento() {
    const column = $('hier-grupo-coluna').value, value = $('hier-grupo-valor').value;
    const filtered = ordenarAgrupamento(demandasAgrupamento.filter(item => SLTTable.matches('hier-grupo', valorAgrupamento(item, column) === value, Boolean(column && value))));
    const result = SLTTable.paginate('hier-grupo-pagination', filtered, paginaAgrupamento, page => { paginaAgrupamento = page; renderDemandasAgrupamento(); });
    paginaAgrupamento = result.page;
    demandasFiltradas = filtered;
    $('hier-agrupamento-demandas').innerHTML = result.rows.map(item => '<tr><td class="col-select"><input type="checkbox" data-grupo-select="' + esc(chaveDemanda(item)) + '" aria-label="Selecionar demanda ' + esc(item.codigo || item.nome) + '" ' + (demandasSelecionadas.has(chaveDemanda(item)) ? 'checked' : '') + '></td>' + ['codigo','origem_sei_processo','nome','status'].map(key => `<td title="${esc(valorAgrupamento(item,key))}">${esc(valorAgrupamento(item,key))}</td>`).join('') + '</tr>').join('') || '<tr><td colspan="5">Nenhuma demanda encontrada.</td></tr>';
    $('hier-agrupamento-demandas').querySelectorAll('[data-grupo-select]').forEach(box=>box.onchange=()=>{if(box.checked)demandasSelecionadas.add(box.dataset.grupoSelect);else demandasSelecionadas.delete(box.dataset.grupoSelect);renderDemandasAgrupamento();});
    const count=filtered.filter(item=>demandasSelecionadas.has(chaveDemanda(item))).length;
    $('hier-grupo-select-all').disabled=!filtered.length;
    $('hier-grupo-select-all').checked=count>0&&count===filtered.length;
    $('hier-grupo-select-all').indeterminate=count>0&&count<filtered.length;
    $('hier-grupo-export').disabled=$('hier-grupo-clear').disabled=!demandasSelecionadas.size;
    SLTTable.summary('hier-grupo-summary', demandasSelecionadas.size, result.rows.length, demandasAgrupamento.length);
  }
  function renderDemandasRegistradas(objetos, mensagem = "") {
    const resumo = $("hier-agrupamento-resumo");
    if (resumo) { resumo.hidden = true; resumo.textContent = ""; }
    if (mensagem) erro(mensagem);
    demandasAgrupamento = objetos; demandasSelecionadas.clear(); paginaAgrupamento = 1; atualizarFiltroAgrupamento(); renderDemandasAgrupamento();
  }

  async function renderResumoAgrupamento(id) {
    $("hier-agrupamento-resumo").hidden = true;
    const grupo = await HierApi.obterAgrupamento(id);
    if ($("hier-agrupamento").value !== String(id)) return;
    mostrarResumoAgrupamento(grupo);
    demandasAgrupamento = grupo.objetos || []; paginaAgrupamento = 1; atualizarFiltroAgrupamento(); renderDemandasAgrupamento();
  }

  function mostrarResumoAgrupamento(grupo) {
    const tipo = { plano: "Plano", programa: "Programa", projeto: "Projeto" }[grupo.tipo_demanda] || grupo.tipo_demanda;
    const resumo = $("hier-agrupamento-resumo");
    if (resumo) resumo.innerHTML = '<dl>' + [
      ['Nome do grupo', grupo.nome],
      ['Código do grupo', grupo.codigo],
      ['Tipo das demandas', tipo],
      ['Número de objetos do grupo', grupo.quantidade_demandas ?? grupo.objetos?.length ?? 0],
    ].map(([rotulo, valor]) => `<div><dt>${rotulo}:</dt><dd>${esc(valor ?? '—')}</dd></div>`).join('') + '</dl>';
    if (resumo) resumo.hidden = false;
  }

  async function visualizarHierarquizacaoSelecionada() {
    if (selecionadasHier.size !== 1) return;
    const codigo = [...selecionadasHier][0], h = listaCache.find((item) => item.codigo === codigo); if (!h) return;
    $("nova-hierarquizacao").reset(); $("hier-nome").value = h.nome || ""; $("hier-descricao").value = h.descricao || "";
    cadastroMatrixPicker.reset();
    if (h.matriz_id) cadastroMatrixPicker.choose(h.matriz_id);
    const matrix = matrizDaHier(h);
    $("hier-criteria-matrix-summary").classList.remove("hidden");
    $("hier-criteria-matrix-summary").textContent = matrix ? "Matriz cadastrada nesta hierarquização. Consulte e baixe pelo botão Ver matriz na tabela." : "Esta hierarquização não possui matriz cadastrada.";
    await carregarAgrupamentos(h.grupo_demanda_id || "", h.objetos || []);
    setCadastroReadonly(true); $("hier-create-section").classList.remove("hidden");
    $("hier-create-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // Visualizador de JSON em árvore LAZY: renderiza os filhos só ao expandir,
  // mantendo o DOM leve mesmo com conteúdos grandes (ex.: dados completos).
  // Formata datas ISO (YYYY-MM-DD[THH:MM]) para dd/mm/aaaa [HH:MM].
  function rotuloItem(v, i) {
    return window.SLTDemandasGrupo.itemLabel(v, i);
  }
  function jvNo(chave, valor, jaRotulado) {
    return window.SLTDemandasGrupo.jsonNode(chave, valor, jaRotulado);
  }
  function jvViewer(valor) {
    const ul = document.createElement("ul");
    ul.className = "jv-list jv-root";
    const entries = valor && typeof valor === "object"
      ? (Array.isArray(valor) ? valor.map((v, i) => [rotuloItem(v, i), v, true]) : Object.entries(valor).map(([k, v]) => [k, v, false]))
      : [["Valor", valor, true]];
    if (!entries.length) ul.innerHTML = '<li class="jv-item"><span class="jv-val">Nenhum conteúdo disponível.</span></li>';
    for (const [k, v, jr] of entries) ul.appendChild(jvNo(k, v, jr));
    return ul;
  }

  // ---- Modal "Dados completos": ordena o cabeçalho do grupo antes dos objetos ----
  function renderCompleto(h) {
    const d = h.dados_hierarquizacao || {};
    const ordem = ["versao", "cabecalho_grupo", "objetos"];
    const chaves = [
      ...ordem.filter((k) => k in d),
      ...Object.keys(d).filter((k) => !ordem.includes(k)),
    ];
    const ul = document.createElement("ul");
    ul.className = "jv-list jv-root";
    for (const k of chaves) ul.appendChild(jvNo(k, d[k], false));
    return ul;
  }

  // ---- Modal "Demandas do grupo": um objeto por bloco, campos agrupados + mapa ----
  function renderDemandasGrupo(h) {
    return window.SLTDemandasGrupo.render(h.objetos);
  }
  function abrirColuna(key, h) {
    const cfg = MODAIS_COLUNA[key];
    if (!cfg) return;
    let conteudo;
    if (key === "objetos") conteudo = renderDemandasGrupo(h);
    else if (key === "dados_hierarquizacao") conteudo = renderCompleto(h);
    else if (key in RELATORIOS) conteudo = renderRelatorio(h, key);
    else conteudo = jvViewer(h[key]);
    preencherModal(cfg.modal, `${cfg.titulo} — ${h.codigo}`, conteudo);
  }
  function renderRelatorio(h, key) {
    const wrapper = document.createElement("div");
    for (const analise of h[key]?.analises_geoespaciais || []) {
      const lista = document.createElement("ul");
      if (key === "relatorio_fase1") {
        const resumo = analise.relatorio?.resumo_elegibilidade;
        const linha = document.createElement("li");
        if (Array.isArray(resumo?.linhas)) {
          const link = document.createElement("a");
          link.href = "#modal-resumo-elegibilidade";
          link.textContent = "Visualizar tabela-resumo de elegibilidade";
          link.setAttribute("aria-haspopup", "dialog");
          link.onclick = (event) => {
            event.preventDefault();
            abrirResumoElegibilidade(h, resumo, link);
          };
          linha.appendChild(link);
        } else {
          linha.textContent = "Tabela-resumo de elegibilidade não registrada nesta análise.";
        }
        lista.appendChild(linha);
      }
      for (const [item, rotulo] of [[analise, "Baixar camada GeoPackage"], [analise.relatorio, "Baixar relatório PDF"], [analise.relatorio?.tabela_resumo, "Baixar Resumo da Elegibilidade (Excel)"]]) {
        if (!item?.arquivo) continue;
        const linha = document.createElement("li"), link = document.createElement("a");
        const prefix = location.pathname.includes("/sicard/") ? "/sicard" : "";
        const tipo = key.replace("relatorio_", "");
        link.href = `${prefix}/api/ahp/hierarquizacoes/${encodeURIComponent(h.codigo)}/relatorios/${tipo}/arquivo?${new URLSearchParams({arquivo:item.arquivo})}`;
        link.textContent = `${rotulo} — ${item.arquivo.split("/").pop()}`;
        linha.appendChild(link); lista.appendChild(linha);
      }
      wrapper.appendChild(lista);
      if (!analise.relatorio?.arquivo) {
        const aviso = document.createElement("p");
        aviso.textContent = "Camada registrada. Confirme os nomes nos resultados da Elegibilidade territorial para gerar e associar o PDF.";
        wrapper.appendChild(aviso);
      }
    }
    wrapper.appendChild(jvViewer(h[key]));
    return wrapper;
  }
  function abrirResumoElegibilidade(h, resumo, origem) {
    const colunas = [
      ["conjunto_de_demandas", "Conjunto de demandas"],
      ["objeto_de_demanda", "Objeto de demanda"],
      ["camadas_de_risco", "Camadas de risco"],
      ["area_de_sobreposicao_ha", "Área de sobreposição (ha)"],
      ["porcentagem_sobreposta", "Porcentagem sobreposta"],
      ["indice_de_risco_ambiental_e_territorial", "Índice de risco ambiental e territorial"],
    ];
    const numero = (valor, casas) => typeof valor === "number" && Number.isFinite(valor)
      ? valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) : "—";
    const celula = (linha, campo) => {
      const valor = linha[campo];
      if (campo === "camadas_de_risco") return Array.isArray(valor) && valor.length
        ? valor.map(nome => `<div>${esc(nome)}</div>`).join("") : "Nenhuma camada de risco atingida";
      if (campo === "porcentagem_sobreposta") return valor == null ? "—" : `${numero(valor, 2)}%`;
      if (campo === "area_de_sobreposicao_ha" || campo === "indice_de_risco_ambiental_e_territorial") return numero(valor, 4);
      return esc(valor ?? "—");
    };
    const linhas = resumo.linhas.map(linha => `<tr>${colunas.map(([campo]) => `<td>${celula(linha, campo)}</td>`).join("")}</tr>`).join("");
    preencherModal("modal-resumo-elegibilidade", `Resumo da Elegibilidade — ${h.codigo}`,
      `<p>${resumo.linhas.length} demanda(s) sem restrição registrada(s) nesta análise.</p>` +
      `<div class="matriz-table-wrap"><table class="admin-table"><caption class="sr-only">Resumo da Elegibilidade</caption>` +
      `<thead><tr>${colunas.map(([, titulo]) => `<th scope="col">${esc(titulo)}</th>`).join("")}</tr></thead>` +
      `<tbody>${linhas || `<tr><td colspan="${colunas.length}">Nenhuma demanda sem restrição neste conjunto.</td></tr>`}</tbody></table></div>` +
      (resumo.nota ? `<p>${esc(resumo.nota)}</p>` : ""));
    const modal = $("modal-resumo-elegibilidade");
    const fechar = () => {
      modal.classList.add("hidden");
      $("modal-relatorios").classList.remove("hidden");
      origem.focus();
    };
    $("modal-relatorios").classList.add("hidden");
    const botaoFechar = modal.querySelector("[data-modal-close]");
    botaoFechar.onclick = fechar;
    modal.onclick = event => { if (event.target === modal) fechar(); };
    modal.onkeydown = event => {
      if (event.key === "Escape") {
        event.stopPropagation();
        fechar();
      } else if (event.key === "Tab") {
        const focaveis = [...modal.querySelectorAll('button, a[href], [tabindex="0"]')];
        const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
        if (event.shiftKey && document.activeElement === primeiro) {
          event.preventDefault();
          ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault();
          primeiro.focus();
        }
      }
    };
    botaoFechar.focus();
  }
  function matrizHtml(m) {
    const linhas = Array.isArray(m) ? m : (m && Array.isArray(m.linhas) ? m.linhas : []);
    if (!linhas.length) return "<p>Matriz não enviada ou vazia.</p>";
    const cols = [];
    linhas.forEach((r) => Object.keys(r || {}).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
    const head = cols.map((c) => `<th>${esc(c)}</th>`).join("");
    const body = linhas.map((r) => `<tr>${cols.map((c) => `<td title="${esc(r?.[c] ?? "")}">${esc(r?.[c] ?? "")}</td>`).join("")}</tr>`).join("");
    return `<div class="matriz-table-wrap"><table class="admin-table matriz-view-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function abrirMatriz(codigo) {
    const h = listaCache.find((x) => x.codigo === codigo);
    matrizAtual = { codigo, matriz: matrizDaHier(h) };
    preencherModal("modal-matriz", `Matriz de critérios e premissas — ${codigo}`, matrizHtml(matrizAtual.matriz));
  }
  function erro(msg) {
    Notify.warning("Cadastro da hierarquização", msg);
    const container = $("form-error");
    const texto = String(msg || "Erro na requisição.");
    const linhas = texto.split(/\r?\n/);
    const titulo = linhas.shift() || "Não foi possível cadastrar a hierarquização";
    const partes = [`<div class="ahp-error-title"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(titulo)}</div>`];
    let listaAberta = false;
    for (const linha of linhas) {
      const t = linha.trim();
      if (!t) { if (listaAberta) { partes.push("</ul>"); listaAberta = false; } continue; }
      const bullet = t.match(/^([•\-\*]|\d+\))\s+(.*)$/);
      if (bullet) {
        if (!listaAberta) { partes.push('<ul class="ahp-error-list">'); listaAberta = true; }
        partes.push(`<li>${escapeHtml(bullet[2])}</li>`);
      } else {
        if (listaAberta) { partes.push("</ul>"); listaAberta = false; }
        partes.push(`<p class="ahp-error-line">${escapeHtml(t)}</p>`);
      }
    }
    if (listaAberta) partes.push("</ul>");
    container.innerHTML = partes.join("");
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  $("nova-hierarquizacao").onsubmit = async (e) => {
    e.preventDefault();
    if (operando) return;
    if (!$("hier-agrupamento").value)
      return erro("Selecione um agrupamento salvo antes de criar a hierarquização.");
    if (cadastroMatrixPicker.pending() || !cadastroMatrixPicker.selected()) return erro("Selecione uma matriz cadastrada ou conclua o cadastro do arquivo.");
    operando = true;
    atualizarBotoesLote();
    const proc = ProcessFeedback.iniciarCadastro({title: "Cadastrar hierarquização", tasks: ["Gravar hierarquização"]});
    proc.tarefaAtual("Gravar hierarquização");
    let gravada = false;
    try {
      const cadastrada = await HierApi.criar({
        nome: $("hier-nome").value.trim(),
        descricao: $("hier-descricao").value.trim() || null,
        grupo_demanda_id: $("hier-agrupamento").value,
        matriz_id: cadastroMatrixPicker.selected().id,
      });
      gravada = true;
      const posCadastro = $("hier-complementacao-pos-cadastro");
      const resultadoComplementacao = $("hier-complementacao-resultado");
      posCadastro.hidden = false;
      resultadoComplementacao.textContent = `Hierarquização ${cadastrada.codigo} cadastrada. Solicitar a complementação agora?`;
      $("hier-complementacao-agora").disabled = false;
      $("hier-complementacao-depois").disabled = false;
      $("hier-complementacao-agora").onclick = async () => {
        $("hier-complementacao-agora").disabled = $("hier-complementacao-depois").disabled = true;
        const concluida = await SLTComplementacaoHierarquizacao.solicitar(cadastrada.codigo, resultadoComplementacao,
          "Complemente os atributos cadastrais aplicáveis e os atributos da matriz para prosseguir com a hierarquização.");
        $("hier-complementacao-agora").disabled = concluida;
        $("hier-complementacao-depois").disabled = concluida;
      };
      $("hier-complementacao-depois").onclick = () => {
        $("hier-complementacao-agora").disabled = $("hier-complementacao-depois").disabled = true;
        resultadoComplementacao.textContent = `Cadastro da hierarquização ${cadastrada.codigo} finalizado. Esta opção não criou pedido nem enviou e-mail; eventuais pedidos anteriores permanecem preservados. Os atributos faltantes continuam pendentes. Use “Solicitar complementação de atributos” na Fase 3 quando desejar.`;
      };
      proc.concluirTarefa("Gravar hierarquização");
      $("hier-create-section").classList.add("hidden");
      const atualizada = await carregarLista();
      proc.sucesso({title: "Hierarquização cadastrada", message: atualizada
        ? "O cadastro foi registrado e a lista foi atualizada. Na página, escolha solicitar a complementação agora ou depois, na Fase 3."
        : "O cadastro foi registrado, mas a lista não foi atualizada. Recarregue-a antes de continuar.",
        _status: atualizada ? undefined : "partial"});
    } catch (err) {
      proc.erro({message: gravada ? `Cadastro registrado, mas a tela não foi atualizada: ${err.message}` : err.message});
    } finally {
      operando = false;
      atualizarBotoesLote();
    }
  };
  window.SLTDemandasGrupo.bindModalClosures();
  const matrizDownloadBtn = document.querySelector("#modal-matriz [data-modal-download]");
  if (matrizDownloadBtn) {
    matrizDownloadBtn.onclick = () => {
      if (!matrizAtual) return;
      const blob = new Blob([JSON.stringify(matrizAtual.matriz, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `matriz-${matrizAtual.codigo}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }
  const bindLote = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  function temPesos(h) {
    const official = h.dados_hierarquizacao?.comparacao_colaborativa;
    return Boolean((h.pesos_projetos && Object.keys(h.pesos_projetos).length) ||
      official?.pesos_consolidados?.length || h.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3);
  }
  bindLote("hier-bulk-edit", () => { if (!selecionadasHier.size) return; hierEditMode = true; renderTabela(); });
  bindLote("hier-bulk-view", visualizarHierarquizacaoSelecionada);
  bindLote("hier-bulk-cancel", () => { hierEditMode = false; renderTabela(); });
  async function executarLote(excluir) {
    if (operando) return;
    const codigos = [...selecionadasHier];
    if (!codigos.length) return;
    operando = true;
    atualizarBotoesLote();
    let proc, concluidas = 0;
    try {
      if (excluir && !(await ProcessFeedback.confirmar({
        title: "Excluir hierarquizações", message: `Excluir ${codigos.length} hierarquização(ões)?`,
        warning: `${codigos.join("\n")}\nEsta ação não pode ser desfeita.`, confirmLabel: "Excluir", danger: true,
      }))) return;
      const tarefa = excluir ? "Excluir registros selecionados" : "Salvar alterações";
      proc = ProcessFeedback.iniciarCadastro({title: excluir ? "Excluir hierarquizações" : "Salvar hierarquizações", tasks: [tarefa]});
      proc.tarefaAtual(tarefa);
      for (const cod of codigos) {
        if (excluir) await HierApi.excluir(cod);
        else {
          const tr = $("hier-tbody").querySelector(`tr[data-codigo="${CSS.escape(cod)}"]`);
          if (!tr) throw new Error(`Registro ${cod} não está disponível para edição.`);
          const payload = {};
          tr.querySelectorAll("[data-k]").forEach(el => { payload[el.dataset.k] = el.value; });
          const editor = matrixEditors.get(cod), h = listaCache.find(item => item.codigo === cod);
          if (editor?.picker.pending()) throw new Error(`Conclua o carregamento ou cadastro da matriz de ${cod}.`);
          const matrix = editor?.picker.selected();
          if (matrix && String(matrix.id) !== String(h.matriz_id)) {
            payload.matriz_id = matrix.id;
            payload.confirmar_reuso_pesos = !editor.reuse.disabled && editor.reuse.checked;
            if (!(await ProcessFeedback.confirmar({
              title: "Alterar matriz da hierarquização",
              message: `${cod}: associar a matriz "${matrix.nome}"?`,
              warning: payload.confirmar_reuso_pesos
                ? "O reaproveitamento dos pesos da matriz equivalente será registrado. Resultados dependentes deverão ser recalculados."
                : temPesos(h) ? "Os pesos e resultados dependentes serão invalidados. Para matriz equivalente, marque Reutilizar pesos antes de salvar caso deseje preservá-los."
                  : "Resultados dependentes da matriz serão invalidados.",
              confirmLabel: "Alterar matriz",
            }))) throw new Error(`Alteração da matriz de ${cod} cancelada. Nenhuma alteração deste registro foi enviada.`);
          } else if (h.matriz_id && !matrix) throw new Error(`Selecione uma matriz para ${cod}.`);
          await HierApi.atualizar(cod, payload);
        }
        concluidas++;
        selecionadasHier.delete(cod);
      }
      proc.concluirTarefa(tarefa);
      selecionadasHier.clear();
      hierEditMode = false;
      const atualizada = await carregarLista();
      proc.sucesso({message: `${concluidas} registro(s) ${excluir ? "excluído(s)" : "atualizado(s)"}.${atualizada ? "" : " Não foi possível atualizar a lista; recarregue-a."}`,
        _status: atualizada ? undefined : "partial"});
    } catch (e) {
      if (concluidas) proc.sucesso({_status: "partial", title: "Operação parcialmente realizada",
        message: `${concluidas} de ${codigos.length} registros confirmados. ${e.message} Confira a lista antes de tentar novamente.`});
      else if (proc) proc.erro({message: e.message});
      else StatusFeedback.erro({message: e.message});
    } finally {
      operando = false;
      atualizarBotoesLote();
    }
  }
  bindLote("hier-bulk-save", () => executarLote(false));
  bindLote("hier-bulk-delete", () => executarLote(true));
  if ($("hier-select-all")) {
    $("hier-select-all").onchange = () => {
      if ($("hier-select-all").checked) hierarquizacoesFiltradas().slice((paginaHier - 1) * 15, paginaHier * 15).forEach((h) => selecionadasHier.add(h.codigo));
      else selecionadasHier.clear();
      renderTabela();
    };
  }
  if ($("hier-new")) $("hier-new").onclick = mostrarCadastroNovo;
  if ($("hier-agrupamento")) {
    $("hier-agrupamento").onchange = () => {
      const id = $("hier-agrupamento").value;
      if (id) renderResumoAgrupamento(id).catch((error) => { if ($("hier-agrupamento").value === id) renderDemandasRegistradas([], error.message); });
      else renderDemandasRegistradas([]);
    };
  }
  if ($("hier-filter-coluna")) {
    $("hier-filter-coluna").insertAdjacentHTML("beforeend", HIER_FILTER_COLUMNS.map(([value, label]) => `<option value="${value}">${label}</option>`).join(""));
    const change = () => { paginaHier = 1; selecionadasHier.clear(); hierEditMode = false; renderTabela(); };
    SLTTable.bindFilter('hier-filter', change, () => { $("hier-filter-coluna").value = ''; $("hier-filter-valor").value = ''; atualizarOpcoesFiltroHier(); });
    $("hier-filter-coluna").onchange = () => { $("hier-filter-valor").value = ""; atualizarOpcoesFiltroHier(); change(); };
    $("hier-filter-valor").onchange = change;
  }
  async function iniciar() {
    [['codigo','Código'],['origem_sei_processo','Processo SEI'],['nome','Nome'],['status','Status']].forEach(([key,label]) => $('hier-grupo-coluna').add(new Option(label,key)));
    const changeGrupo = () => { paginaAgrupamento = 1; renderDemandasAgrupamento(); };
    $('hier-grupo-coluna').onchange = () => { $('hier-grupo-valor').value = ''; atualizarFiltroAgrupamento(); changeGrupo(); };
    $('hier-grupo-valor').onchange = changeGrupo;
    $('hier-grupo-select-all').onchange = event => {demandasFiltradas.forEach(item=>{if(event.target.checked)demandasSelecionadas.add(chaveDemanda(item));else demandasSelecionadas.delete(chaveDemanda(item));});renderDemandasAgrupamento();};
    $('hier-grupo-clear').onclick = () => {demandasSelecionadas.clear();renderDemandasAgrupamento();};
    $('hier-grupo-export').onclick = () => SicardTableExport('demandas-do-agrupamento.csv',['Código','Processo SEI','Nome','Situação'],demandasAgrupamento.filter(item=>demandasSelecionadas.has(chaveDemanda(item))).map(item=>['codigo','origem_sei_processo','nome','status'].map(key=>valorAgrupamento(item,key))));
    SLTTable.bindFilter('hier-grupo', changeGrupo, () => { $('hier-grupo-coluna').value = ''; $('hier-grupo-valor').value = ''; atualizarFiltroAgrupamento(); });
    carregarLista();
    carregarAgrupamentos();
    try {
      await window.SLTAdminLabels?.init?.("/restrict/");
    } catch (e) {
      console.warn("Não foi possível carregar todos os aliases administrativos.", e);
    }
  }
  iniciar();
})();
