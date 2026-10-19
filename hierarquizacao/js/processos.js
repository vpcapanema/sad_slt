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
  let listaCache = [],
    agrupamentosCache = [],
    hierEditMode = false,
    matrizAtual = null,
    matrizCadastro = null,
    matrizLeitura = 0;
  const ordenarHier = SLTTable.sorting($('hier-tbody').closest('table'), () => [null,
    h=>rotuloSituacaoHier(h.status), h=>h.codigo, h=>h.julgamento_id, h=>h.nome, h=>h.descricao,
    h=>JSON.stringify(matrizDaHier(h)), ...['objetos','julgamento_projetos','pesos_projetos','ranking'].map(key=>h=>JSON.stringify(h[key])),
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
  // Modais componentizados (templates/componentes/modal/): um por coluna da tabela.
  const MODAIS_COLUNA = {
    objetos: { modal: "modal-objetos", titulo: "Demandas do grupo" },
    julgamento_projetos: { modal: "modal-julgamentos", titulo: "Julgamentos dos projetos" },
    pesos_projetos: { modal: "modal-pesos", titulo: "Pesos dos projetos" },
    ranking: { modal: "modal-ranking", titulo: "Classificação resultante" },
    dados_hierarquizacao: { modal: "modal-completo", titulo: "Dados completos da hierarquização" },
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
      Notify.error("Central de hierarquização", e.message);
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
      `<td>${matrizCell(h)}</td>` +
      `<td>${jsonButton(h, "objetos", "Visualizar demandas")}</td>` +
      `<td>${jsonButton(h, "julgamento_projetos", "Visualizar julgamentos")}</td>` +
      `<td>${jsonButton(h, "pesos_projetos", "Visualizar pesos")}</td>` +
      `<td>${jsonButton(h, "ranking", "Visualizar classificação")}</td>` +
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
    $("nova-hierarquizacao").querySelector('.process-actions').classList.toggle("hidden", readonly);
  }
  function mostrarCadastroNovo() {
    setCadastroReadonly(false); $("nova-hierarquizacao").reset();
    matrizCadastro = null; matrizLeitura++; $("hier-criteria-matrix-summary").textContent = "";
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
  const ordenarAgrupamento = SLTTable.sorting($('hier-agrupamento-demandas').closest('table'), () => ['codigo','origem_sei_processo','nome','status'].map(key=>item=>valorAgrupamento(item,key)), () => { paginaAgrupamento=1; renderDemandasAgrupamento(); });
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
    $('hier-agrupamento-demandas').innerHTML = result.rows.map(item => '<tr>' + ['codigo','origem_sei_processo','nome','status'].map(key => `<td title="${esc(valorAgrupamento(item,key))}">${esc(valorAgrupamento(item,key))}</td>`).join('') + '</tr>').join('') || '<tr><td colspan="4">Nenhuma demanda encontrada.</td></tr>';
    SLTTable.summary('hier-grupo-summary', 0, result.rows.length, demandasAgrupamento.length);
  }
  function renderDemandasRegistradas(objetos, mensagem = "") {
    const resumo = $("hier-agrupamento-resumo");
    if (resumo) { resumo.hidden = true; resumo.textContent = ""; }
    if (mensagem) erro(mensagem);
    demandasAgrupamento = objetos; paginaAgrupamento = 1; atualizarFiltroAgrupamento(); renderDemandasAgrupamento();
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
    matrizCadastro = null; matrizLeitura++;
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
    else conteudo = jvViewer(h[key]);
    preencherModal(cfg.modal, `${cfg.titulo} — ${h.codigo}`, conteudo);
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
  $("hier-criteria-matrix").addEventListener("change", async (event) => {
    const file = event.target.files[0], request = ++matrizLeitura;
    matrizCadastro = null;
    const summary = $("hier-criteria-matrix-summary");
    summary.classList.remove("hidden"); summary.textContent = file ? "Lendo matriz…" : "Selecione uma matriz.";
    if (!file) return;
    try {
      const parsed = await window.SLTMatrizArquivo.ler(file);
      if (request !== matrizLeitura) return;
      const rows = Array.isArray(parsed) ? parsed : (parsed.linhas || parsed.rows || parsed.criterios || parsed.dados || []);
      if (!Array.isArray(rows) || rows.filter(row => row && typeof row === "object" && !Array.isArray(row)).length < 2) throw new Error("A matriz deve conter ao menos dois critérios.");
      matrizCadastro = { ...(Array.isArray(parsed) ? {} : parsed), arquivo: file.name, linhas: rows };
      summary.textContent = `${file.name} · ${rows.length} critérios carregados.`;
    } catch (err) {
      if (request !== matrizLeitura) return;
      event.target.value = ""; summary.textContent = err.message;
      Notify.warning("Matriz de critérios", err.message);
    }
  });
  $("nova-hierarquizacao").onsubmit = async (e) => {
    e.preventDefault();
    if (operando) return;
    if (!$("hier-agrupamento").value)
      return erro("Selecione um agrupamento salvo antes de criar a hierarquização.");
    if (!matrizCadastro) return erro("Anexe e aguarde a leitura da matriz de premissas e critérios.");
    operando = true;
    atualizarBotoesLote();
    const proc = ProcessFeedback.iniciarCadastro({title: "Cadastrar hierarquização", tasks: ["Gravar hierarquização"]});
    proc.tarefaAtual("Gravar hierarquização");
    let gravada = false;
    try {
      await HierApi.criar({
        nome: $("hier-nome").value.trim(),
        descricao: $("hier-descricao").value.trim() || null,
        grupo_demanda_id: $("hier-agrupamento").value,
        matriz_premissas_criterios: matrizCadastro,
      });
      gravada = true;
      proc.concluirTarefa("Gravar hierarquização");
      $("hier-create-section").classList.add("hidden");
      const atualizada = await carregarLista();
      proc.sucesso({title: "Hierarquização cadastrada", message: atualizada
        ? "O cadastro foi registrado e a lista foi atualizada."
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
