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
  let universo = [],
    camposUniverso = [],
    selecionados = new Set(),
    confirmados = new Set(),
    selecionadosResumo = new Set(),
    grupoFechado = false,
    paginaDemandas = 1,
    matriz = null,
    universoRequestId = 0;
  let listaCache = [],
    hierEditMode = false,
    matrizAtual = null;
  const selecionadasHier = new Set();
  const STATUS_HIER = ["rascunho", "em_julgamento", "calculada", "homologada", "arquivada"];
  const ITENS_POR_PAGINA = 15;
  // Demandas já vinculadas a outra hierarquização continuam disponíveis para
  // novas rodadas; o painel sinaliza o vínculo pelo status/badge da linha.
  const STATUS_ELEGIVEIS = new Set(["analise_aprovada", "hierarq_em_andamento"]);
  const JSON_COLS = [
    "objetos",
    "julgamento_projetos",
    "pesos_projetos",
    "ranking",
    "dados_hierarquizacao",
  ];
  const ALIAS = {
    versao: "Versão",
    cabecalho_grupo: "Cabeçalho do grupo",
    objetos: "Objetos",
    demanda_id: "Identificador da demanda",
    codigo: "Código",
    nome: "Nome",
    descricao: "Descrição",
    tipo_demanda: "Tipo de demanda",
    quantidade_objetos: "Quantidade de objetos",
    matriz_premissas_criterios: "Matriz de premissas e critérios",
    fases_a_executar: "Fases a executar",
    pacotes: "Pacotes utilizados",
    criado_em: "Data de criação",
    cabecalho_objeto: "Cabeçalho do objeto",
    atributos: "Atributos",
    hierarquizacao: "Hierarquização",
    fase_1: "Fase 1 — Elegibilidade territorial",
    fase_2: "Fase 2 — Favorabilidade territorial",
    fase_3: "Fase 3 — Ajuste fino",
    sintese: "Síntese",
    restricao: "Restrição",
    risco: "Risco",
    intersecoes: "Interseções",
    resultado: "Resultado",
    executada: "Executada",
    status_fase1: "Resultado da Fase 1",
    score_fase2: "Pontuação da Fase 2",
    score_fase3: "Pontuação da Fase 3",
    score_final: "Pontuação final",
    ranking_fase2: "Posição na Fase 2",
    ranking_fase3: "Posição na Fase 3",
    posicao_final: "Posição final",
  };
  const alias = (k) =>
    ALIAS[k] ||
    String(k)
      .replaceAll("_", " ")
      .replace(/^./, (x) => x.toUpperCase());
  function jsonHtml(value) {
    if (value === null || value === undefined)
      return "<span>Não informado</span>";
    if (Array.isArray(value))
      return value.length
        ? value
            .map(
              (v, i) =>
                `<details open><summary><strong>Item ${i + 1}</strong></summary>${jsonHtml(v)}</details>`,
            )
            .join("")
        : "<span>Lista vazia</span>";
    if (typeof value === "object")
      return `<table class="json-tree"><tbody>${Object.entries(value)
        .map(
          ([k, v]) =>
            `<tr><th>${esc(alias(k))}</th><td>${jsonHtml(v)}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    return `<span>${esc(value)}</span>`;
  }
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
  function vazias(n) {
    return Array.from(
      { length: Math.max(0, 3 - n) },
      () =>
        '<tr class="empty-row">' +
        Array.from({ length: 19 }, () => "<td></td>").join("") +
        "</tr>",
    ).join("");
  }
  function jsonButton(h, key, label) {
    const v = h[key];
    return `<button class="json-cell" data-codigo="${esc(h.codigo)}" data-json="${key}">${v == null ? "Não preenchido" : label}</button>`;
  }
  async function carregarLista() {
    try {
      listaCache = await HierApi.listar();
      $("hier-loading").classList.add("hidden");
      renderTabela();
    } catch (e) {
      $("hier-loading").classList.add("hidden");
      $("hier-error").textContent = e.message;
      $("hier-error").classList.remove("hidden");
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
    rascunho: "Rascunho",
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
      `<td>${esc(h.config_id || "—")}</td>` +
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
    const editando = hierEditMode ? selecionadasHier : new Set();
    $("hier-tbody").innerHTML =
      listaCache.map((h) => rowHtml(h, editando.has(h.codigo))).join("") + vazias(listaCache.length);
    ligarEventosTabela();
    atualizarBotoesLote();
    syncSelectAll();
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
    if (sa) sa.checked = listaCache.length > 0 && listaCache.every((h) => selecionadasHier.has(h.codigo));
  }
  function atualizarBotoesLote() {
    const has = selecionadasHier.size > 0;
    const set = (id, dis) => { const el = $(id); if (el) el.disabled = dis; };
    set("hier-bulk-edit", !has || hierEditMode);
    set("hier-bulk-cancel", !hierEditMode);
    set("hier-bulk-save", !hierEditMode || !has);
    set("hier-bulk-delete", !has || hierEditMode);
  }
  // Visualizador de JSON em árvore LAZY: renderiza os filhos só ao expandir,
  // mantendo o DOM leve mesmo com conteúdos grandes (ex.: dados completos).
  // Formata datas ISO (YYYY-MM-DD[THH:MM]) para dd/mm/aaaa [HH:MM].
  function fmtDataSeIso(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
    if (!m) return null;
    const [, y, mo, d, hh, mi] = m;
    return hh != null ? `${d}/${mo}/${y} ${hh}:${mi}` : `${d}/${mo}/${y}`;
  }
  // Rótulo amigável de situação (domínio dom_status_demanda, via SLTStatusColors).
  function rotuloStatus(codigo) {
    if (!codigo) return "—";
    const st = window.SLTStatusColors && window.SLTStatusColors.getStatusDemanda
      ? window.SLTStatusColors.getStatusDemanda(codigo)
      : null;
    return (st && st.nome) || codigo;
  }
  function fmtFolha(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    if (typeof v === "string") {
      const data = fmtDataSeIso(v);
      if (data) return data;
    }
    return String(v);
  }
  // Rótulo de item de lista: usa o nome/código do objeto quando houver.
  function rotuloItem(v, i) {
    if (v && typeof v === "object") {
      const cab = v.cabecalho_objeto || v;
      const nome = cab.nome || v.nome;
      const cod = cab.codigo || v.codigo;
      if (nome) return cod ? `${nome} (${cod})` : String(nome);
      if (cod) return String(cod);
    }
    return `Item ${i + 1}`;
  }
  function jvNo(chave, valor, jaRotulado) {
    const li = document.createElement("li");
    li.className = "jv-item";
    const rotulo = jaRotulado ? String(chave) : alias(String(chave));
    if (valor && typeof valor === "object") {
      const entries = Array.isArray(valor)
        ? valor.map((v, i) => [rotuloItem(v, i), v, true])
        : Object.entries(valor).map(([k, v]) => [k, v, false]);
      const det = document.createElement("details");
      const sum = document.createElement("summary");
      const contagem = Array.isArray(valor) ? `[${entries.length}]` : `{${entries.length}}`;
      sum.innerHTML = `<span class="jv-key">${esc(rotulo)}</span> <span class="jv-count">${contagem}</span>`;
      det.appendChild(sum);
      let carregado = false;
      det.addEventListener("toggle", () => {
        if (!det.open || carregado) return;
        carregado = true;
        const ul = document.createElement("ul");
        ul.className = "jv-list";
        for (const [k, v, jr] of entries) ul.appendChild(jvNo(k, v, jr));
        det.appendChild(ul);
      });
      li.appendChild(det);
    } else {
      li.innerHTML = `<span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">${esc(fmtFolha(valor))}</span>`;
    }
    return li;
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
  function campo(rotulo, valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const d = document.createElement("div");
    d.className = "jv-campo";
    d.innerHTML = `<span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">${esc(fmtFolha(valor))}</span>`;
    return d;
  }
  function grupoEl(titulo) {
    const g = document.createElement("div");
    g.className = "demanda-grupo";
    const t = document.createElement("h4");
    t.className = "demanda-grupo-titulo";
    t.textContent = titulo;
    g.appendChild(t);
    return g;
  }
  function grupoCampos(titulo, itens) {
    const usados = itens.filter(Boolean);
    if (!usados.length) return null;
    const g = grupoEl(titulo);
    const box = document.createElement("div");
    box.className = "demanda-campos";
    usados.forEach((el) => box.appendChild(el));
    g.appendChild(box);
    return g;
  }
  function subArvore(rotulo, valor) {
    const ul = document.createElement("ul");
    ul.className = "jv-list";
    if (valor && typeof valor === "object" && Object.keys(valor).length) {
      ul.appendChild(jvNo(rotulo, valor, false));
    } else {
      ul.innerHTML = `<li class="jv-item"><span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">—</span></li>`;
    }
    return ul;
  }
  function iniciarMapa(div, geometria, lat, lng) {
    if (!window.L) { div.innerHTML = '<p class="jv-mapa-aviso">Mapa indisponível.</p>'; return; }
    const temGeom = geometria && geometria.coordinates;
    if (!temGeom && (lat == null || lng == null)) {
      div.innerHTML = '<p class="jv-mapa-aviso">Geometria não disponível para esta demanda.</p>';
      return;
    }
    const map = L.map(div, { attributionControl: false, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    if (temGeom) {
      const geo = { type: geometria.tipo || geometria.type, coordinates: geometria.coordinates };
      const layer = L.geoJSON(geo, { style: { color: "#003b5a", weight: 2, fillColor: "#3ec26e", fillOpacity: 0.2 } }).addTo(map);
      try {
        const b = layer.getBounds();
        if (b && b.isValid()) map.fitBounds(b, { padding: [12, 12], maxZoom: 15 });
        else map.setView([lat, lng], 13);
      } catch (_) { map.setView([lat ?? -22.5, lng ?? -48.5], 13); }
    } else {
      L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 13);
    }
    setTimeout(() => map.invalidateSize(), 80);
  }
  function corpoObjeto(o) {
    const wrap = document.createElement("div");
    wrap.className = "demanda-corpo";
    const grupos = [
      grupoCampos("Identificação", [
        campo("Código", o.codigo),
        campo("Nome", o.nome),
        campo("Tipo de demanda", o.tipo_demanda),
        campo("Situação", o.status ? rotuloStatus(o.status) : null),
        campo("Descrição", o.descricao),
      ]),
      grupoCampos("Proponente e vínculo institucional", [
        campo("Tipo de demandante", o.tipo_demandante),
        campo("Instituição", o.instituicao_nome || o.instituicao_label),
        campo("CNPJ", o.instituicao_cnpj),
        campo("Representante", o.representante_nome),
        campo("E-mail do representante", o.representante_email),
        campo("Telefone do representante", o.representante_telefone),
        campo("Diretoria", o.diretoria_id),
        campo("Plano", o.plano_id),
        campo("Programa", o.programa_id_alias || o.programa_nome || o.programa_codigo),
        campo("Possui vínculo institucional", o.vinculo_institucional == null ? null : (o.vinculo_institucional ? "Sim" : "Não")),
        campo("Tipo de vínculo", o.vinculo_tipo),
      ]),
    ];
    grupos.filter(Boolean).forEach((g) => wrap.appendChild(g));
    // Classificação e complementos (subárvores)
    const gCls = grupoEl("Classificação e complementos");
    gCls.appendChild(subArvore("Classificação", o.classificacao));
    gCls.appendChild(subArvore("Complementos", o.complementos));
    wrap.appendChild(gCls);
    // Localização + mapa
    const gLoc = grupoEl("Localização");
    const box = document.createElement("div");
    box.className = "demanda-campos";
    [campo("Latitude", o.latitude), campo("Longitude", o.longitude), campo("Tipo de geometria", o.geometria_tipo || o.geometria?.tipo)]
      .filter(Boolean).forEach((el) => box.appendChild(el));
    gLoc.appendChild(box);
    const mapaDiv = document.createElement("div");
    mapaDiv.className = "demanda-mapa";
    gLoc.appendChild(mapaDiv);
    wrap.appendChild(gLoc);
    setTimeout(() => iniciarMapa(mapaDiv, o.geometria, o.latitude, o.longitude), 40);
    // Datas e auditoria
    const gDatas = grupoCampos("Datas e auditoria", [
      campo("Criado em", o.criado_em || o.criadoEm),
      campo("Atualizado em", o.atualizado_em),
      campo("Aprovado em", o.aprovado_em),
      campo("Situação atualizada em", o.status_atualizado_em),
      campo("Motivo da aprovação", o.motivo_aprovacao),
    ]);
    if (gDatas) wrap.appendChild(gDatas);
    return wrap;
  }
  function objetoNo(o) {
    const li = document.createElement("li");
    li.className = "jv-item";
    const det = document.createElement("details");
    const sum = document.createElement("summary");
    const nome = o.nome || o.codigo || "Demanda";
    const cod = o.codigo ? ` <span class="jv-count">(${esc(o.codigo)})</span>` : "";
    sum.innerHTML = `<span class="jv-key">${esc(nome)}</span>${cod}`;
    det.appendChild(sum);
    let carregado = false;
    det.addEventListener("toggle", () => {
      if (!det.open || carregado) return;
      carregado = true;
      det.appendChild(corpoObjeto(o));
    });
    li.appendChild(det);
    return li;
  }
  function renderDemandasGrupo(h) {
    const objs = Array.isArray(h.objetos) ? h.objetos : [];
    const ul = document.createElement("ul");
    ul.className = "jv-list jv-root";
    if (!objs.length) {
      ul.innerHTML = '<li class="jv-item"><span class="jv-val">Nenhuma demanda vinculada a este grupo.</span></li>';
      return ul;
    }
    objs.forEach((o) => ul.appendChild(objetoNo(o)));
    return ul;
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
  function localizacao(o) {
    return (
      o.municipio ||
      o.abrangencia_municipio ||
      o.geometria_tipo ||
      (o.latitude != null && o.longitude != null
        ? `${o.latitude}, ${o.longitude}`
        : "—")
    );
  }
  function filtrados() {
    const q = $("demanda-busca").value.trim().toLowerCase(),
      campo = $("demanda-campo").value,
      v = $("demanda-valor").value;
    return universo.filter(
      (o) =>
        (!q ||
          [o.codigo, o.nome, o.descricao].some((x) =>
            String(x || "")
              .toLowerCase()
              .includes(q),
          )) &&
        (!campo || !v || String(o[campo] ?? "") === v),
    );
  }
  function elegivel(o) {
    return STATUS_ELEGIVEIS.has(o.status);
  }
  function paginaFiltrada() {
    const rows = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(rows.length / ITENS_POR_PAGINA));
    paginaDemandas = Math.min(Math.max(1, paginaDemandas), totalPaginas);
    const inicio = (paginaDemandas - 1) * ITENS_POR_PAGINA;
    return { rows, pagina: rows.slice(inicio, inicio + ITENS_POR_PAGINA), totalPaginas, inicio };
  }
  function formatarData(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("pt-BR");
  }
  function rotuloValor(campo, value, row) {
    if (value === null || value === undefined || value === "") return "—";
    const labels = window.SLTAdminLabels;
    const tipo = $("hier-tipo").value;
    if (campo === "status")
      return labels?.statusDemandaLabel?.(value, tipo) || String(value);
    if (campo === "diretoria_id")
      return labels?.diretoriaLabel?.(value) || String(value);
    if (campo === "plano_id")
      return row?.plano_id_alias || labels?.planoLabel?.(value) || String(value);
    if (campo === "programa_id")
      return row?.programa_id_alias || String(value);
    if (campo === "grupo_id")
      return (
        row?.programa_id_alias ||
        row?.plano_id_alias ||
        labels?.diretoriaLabel?.(value) ||
        String(value)
      );
    const meta = camposUniverso.find((item) => item.campo === campo);
    if (meta?.tipo === "data") return formatarData(value);
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (campo === "valor_global")
      return labels?.formatMoney?.(value) || String(value);
    return String(value);
  }
  function valorHtml(campo, row) {
    if (campo === "status" && window.SLTAdminLabels?.statusBadgeHtml)
      return window.SLTAdminLabels.statusBadgeHtml(
        row.status,
        $("hier-tipo").value,
      );
    return esc(rotuloValor(campo, row[campo], row));
  }
  function colunasTabela() {
    const labels = window.SLTAdminLabels || {};
    const tipo = $("hier-tipo").value;
    const texto = (value) => esc(value || "—");
    const status = (row) =>
      labels.statusBadgeHtml?.(row.status, tipo) ||
      texto(rotuloValor("status", row.status, row));
    const instituicao = (row) =>
      texto(labels.instituicaoLabel?.(row) || row.instituicao_nome);
    const representante = (row) =>
      texto(labels.representanteLabel?.(row) || row.representante_nome);
    const cadastro = (row) =>
      texto(labels.formatDate?.(row.criadoEm || row.criado_em) || formatarData(row.criadoEm || row.criado_em));
    if (tipo === "plano")
      return [
        { label: "Status", value: status },
        { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
        { label: "Plano", value: (row) => texto(row.nome) },
        { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
        { label: "Instituição", value: instituicao },
        { label: "Representante", value: representante },
        { label: "Objetivo estratégico", value: (row) => texto(labels.truncate?.(row.objetivo_estrategico, 80) || row.objetivo_estrategico) },
        { label: "Vigência", value: (row) => texto(labels.formatVigencia?.(row.vigencia_inicio, row.vigencia_fim)) },
        { label: "Valor global", value: (row) => texto(labels.formatMoney?.(row.valor_global)) },
        { label: "Abrangência", value: (row) => texto(labels.abrangenciaLabel?.(row.unidades_espaciais)) },
        { label: "Cadastro", value: cadastro },
      ];
    if (tipo === "programa")
      return [
        { label: "Status", value: status },
        { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
        { label: "Programa", value: (row) => texto(row.nome) },
        { label: "Plano vinculado", value: (row) => texto(labels.planoCadastradoLabel?.(row) || row.plano_id_alias) },
        { label: "Vínculo institucional", value: (row) => texto(labels.vinculoInstitucionalLabel?.(row.vinculo_institucional)) },
        { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
        { label: "Instituição", value: instituicao },
        { label: "Representante", value: representante },
        { label: "Órgão responsável", value: (row) => texto(row.orgao_responsavel) },
        { label: "Objetivo", value: (row) => texto(labels.truncate?.(row.objetivo, 80) || row.objetivo) },
        { label: "Valor global", value: (row) => texto(labels.formatMoney?.(row.valor_global)) },
        { label: "Abrangência", value: (row) => texto(labels.abrangenciaLabel?.(row.unidades_espaciais)) },
        { label: "Cadastro", value: cadastro },
      ];
    return [
      { label: "Status", value: status },
      { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
      { label: "Projeto", value: (row) => texto(row.nome) },
      { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
      { label: "Plano estratégico", value: (row) => texto(labels.planoLabel?.(row.plano_id)) },
      { label: "Vínculo institucional", value: (row) => texto(labels.vinculoInstitucionalLabel?.(row.vinculo_institucional, row.vinculo_tipo)) },
      { label: "Programa vinculado", value: (row) => texto(labels.programaCadastradoLabel?.(row) || row.programa_id_alias) },
      { label: "Instituição", value: instituicao },
      { label: "Representante", value: representante },
      { label: "Classificação", value: (row) => texto(labels.classificacaoLabel?.(row.classificacao, row.plano_id)) },
      { label: "Complementos", value: (row) => texto(labels.complementosLabel?.(row.complementos)) },
      { label: "Geometria", value: (row) => texto(labels.geometriaResumo?.(row.geometria) || row.geometria_tipo) },
      { label: "Cadastro", value: cadastro },
    ];
  }
  function atualizarValoresAtributo() {
    const campo = $("demanda-campo").value;
    const select = $("demanda-valor");
    if (!campo) {
      select.innerHTML =
        '<option value="">Selecione primeiro um atributo</option>';
      select.value = "";
      select.disabled = true;
      return;
    }
    const valores = new Map();
    universo.forEach((row) => {
      const raw = row[campo];
      if (raw === null || raw === undefined || raw === "") return;
      valores.set(String(raw), rotuloValor(campo, raw, row));
    });
    const ordenados = [...valores.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR", { numeric: true }),
    );
    select.disabled = false;
    select.innerHTML =
      '<option value="">Todos os valores</option>' +
      ordenados
        .map(
          ([value, label]) =>
            `<option value="${esc(value)}">${esc(label)}</option>`,
        )
        .join("");
    select.value = "";
  }
  function sincronizarAbas(tipo) {
    document.querySelectorAll("#hier-tipo-tabs [data-tipo]").forEach((aba) => {
      const ativa = aba.dataset.tipo === tipo;
      aba.classList.toggle("is-active", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    });
  }
  function atualizarSelecionarVisiveis(rows) {
    const checkbox = $("demanda-todos");
    const elegiveisVisiveis = rows.filter(elegivel);
    const selecionadasVisiveis = elegiveisVisiveis.filter((o) =>
      selecionados.has(o.id),
    ).length;
    checkbox.disabled = grupoFechado || elegiveisVisiveis.length === 0;
    checkbox.checked =
      elegiveisVisiveis.length > 0 &&
      selecionadasVisiveis === elegiveisVisiveis.length;
    checkbox.indeterminate =
      selecionadasVisiveis > 0 &&
      selecionadasVisiveis < elegiveisVisiveis.length;
  }
  function renderDemandas() {
    const { rows, pagina, totalPaginas, inicio } = paginaFiltrada();
    const colunas = colunasTabela();
    const elegiveisVisiveis = pagina.filter(
      (o) => elegivel(o) && !confirmados.has(o.id),
    );
    $("demanda-head").innerHTML =
      '<th class="col-select" scope="col"><input type="checkbox" id="demanda-todos" aria-label="Selecionar registros visíveis"></th>' +
      colunas
        .map((coluna) => `<th scope="col">${esc(coluna.label)}</th>`)
        .join("");
    $("demanda-tbody").innerHTML = pagina.length
      ? pagina
          .map(
            (o) => {
              const podeSelecionar = elegivel(o) && !grupoFechado;
              const confirmado = confirmados.has(o.id);
              const explicacaoId = `demanda-status-${String(o.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              const indisponivel = podeSelecionar && !confirmado
                ? ""
                : ` disabled aria-describedby="${explicacaoId}" title="${grupoFechado ? "O grupo está fechado para edição" : confirmado ? "Registro já confirmado no grupo" : "Status não permite inclusão na hierarquização"}"`;
              const explicacao = podeSelecionar && !confirmado
                ? ""
                : `<span id="${explicacaoId}" class="sr-only">${grupoFechado ? "O grupo está fechado para edição." : confirmado ? "Registro já confirmado no grupo." : `Status ${esc(o.status)} não permite inclusão na hierarquização.`}</span>`;
              const classe = confirmado
                ? "hier-demanda-confirmada"
                : podeSelecionar
                  ? ""
                  : "hier-demanda-indisponivel";
              return `<tr class="${classe}" data-status="${esc(o.status)}"><td class="col-select"><input type="checkbox" data-id="${esc(o.id)}" aria-label="Selecionar ${esc(o.codigo)}"${selecionados.has(o.id) && podeSelecionar && !confirmado ? " checked" : ""}${indisponivel}>${explicacao}</td>${colunas.map((coluna) => `<td>${coluna.value(o)}</td>`).join("")}</tr>`;
            },
          )
          .join("")
      : `<tr><td colspan="${colunas.length + 1}" class="process-empty-row">Nenhuma demanda encontrada para o tipo e os filtros selecionados.</td></tr>`;
    $("demanda-contagem").textContent =
      `${rows.length} resultado(s) · exibindo ${pagina.length ? inicio + 1 : 0}–${inicio + pagina.length} · ${elegiveisVisiveis.length} elegível(is) nesta página · ${selecionados.size} selecionada(s) · ${confirmados.size} confirmada(s)`;
    $("demanda-pagina-info").textContent = `Página ${paginaDemandas} de ${totalPaginas}`;
    $("demanda-pagina-anterior").disabled = paginaDemandas <= 1;
    $("demanda-pagina-proxima").disabled = paginaDemandas >= totalPaginas;
    atualizarSelecionarVisiveis(pagina.filter((o) => !confirmados.has(o.id)));
    $("demanda-todos").onchange = (e) => {
      paginaFiltrada().pagina
        .filter((o) => elegivel(o) && !confirmados.has(o.id))
        .forEach((o) =>
          e.target.checked
            ? selecionados.add(o.id)
            : selecionados.delete(o.id),
        );
      renderDemandas();
    };
    $("demanda-tbody")
      .querySelectorAll("input[data-id]:not(:disabled)")
      .forEach(
        (x) =>
          (x.onchange = () => {
            const demanda = universo.find((o) => o.id === x.dataset.id);
            if (x.checked && demanda && elegivel(demanda))
              selecionados.add(x.dataset.id);
            else selecionados.delete(x.dataset.id);
            renderDemandas();
          }),
      );
    $("demanda-confirmar").disabled = selecionados.size === 0 || grupoFechado;
    $("demanda-limpar").disabled = selecionados.size === 0 || grupoFechado;
  }
  function renderResumo() {
    const rows = universo.filter(
      (o) => elegivel(o) && confirmados.has(o.id),
    );
    const idsNoGrupo = new Set(rows.map((o) => o.id));
    selecionadosResumo = new Set(
      [...selecionadosResumo].filter((id) => idsNoGrupo.has(id)),
    );
    $("demanda-resumo-contagem").textContent = rows.length
      ? `${rows.length} demanda(s) no grupo · ${grupoFechado ? "grupo fechado para envio" : "grupo aberto para edição"}.`
      : "Nenhuma demanda confirmada.";
    $("demanda-resumo-tbody").innerHTML = rows.length
      ? rows
          .map(
            (o) =>
              `<tr data-status="${esc(o.status)}"><td class="col-select"><input type="checkbox" data-resumo-id="${esc(o.id)}" aria-label="Selecionar ${esc(o.codigo)} no grupo"${selecionadosResumo.has(o.id) ? " checked" : ""}${grupoFechado ? " disabled" : ""}></td><td>${valorHtml("status", o)}</td><td><code>${esc(o.codigo)}</code></td><td>${esc(o.nome)}</td><td>${esc(rotuloValor("grupo_id", o.grupo_id, o))}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="process-empty-row">Confirme uma seleção para formar o grupo.</td></tr>';
    const todos = $("demanda-resumo-todos");
    todos.disabled = grupoFechado || rows.length === 0;
    todos.checked =
      rows.length > 0 && rows.every((o) => selecionadosResumo.has(o.id));
    todos.indeterminate =
      selecionadosResumo.size > 0 && selecionadosResumo.size < rows.length;
    todos.onchange = (e) => {
      rows.forEach((o) =>
        e.target.checked
          ? selecionadosResumo.add(o.id)
          : selecionadosResumo.delete(o.id),
      );
      renderResumo();
    };
    $("demanda-resumo-tbody")
      .querySelectorAll("input[data-resumo-id]:not(:disabled)")
      .forEach(
        (checkbox) =>
          (checkbox.onchange = () => {
            checkbox.checked
              ? selecionadosResumo.add(checkbox.dataset.resumoId)
              : selecionadosResumo.delete(checkbox.dataset.resumoId);
            renderResumo();
          }),
      );
    $("demanda-resumo-excluir").disabled =
      grupoFechado || selecionadosResumo.size === 0;
    $("demanda-resumo-confirmar").disabled =
      grupoFechado || rows.length === 0;
    $("demanda-resumo-editar").disabled = !grupoFechado;
  }
  async function carregarUniverso({ preservarSelecao = false } = {}) {
    const tipo = $("hier-tipo").value;
    const requestId = ++universoRequestId;
    $("universo-objeto-valor").textContent = tipo || "—";
    sincronizarAbas(tipo);
    universo = [];
    camposUniverso = [];
    paginaDemandas = 1;
    if (!preservarSelecao) {
      selecionados.clear();
      confirmados.clear();
      selecionadosResumo.clear();
      grupoFechado = false;
    }
    renderDemandas();
    renderResumo();
    if (!tipo) return;
    try {
      const [itens, campos, detalhes] = await Promise.all([
        HierApi.listarUniverso(tipo, "todas"),
        HierApi.listarCamposUniverso(tipo),
        window.SLTAdminApi
          ?.listDemandasByTipo?.(tipo)
          .catch((e) => {
            console.warn(
              "Detalhes administrativos indisponíveis; exibindo o universo básico.",
              e,
            );
            return [];
          }) || Promise.resolve([]),
      ]);
      if (requestId !== universoRequestId) return;
      const detalhesPorCodigo = new Map(
        detalhes.map((item) => [String(item.id || item.codigo), item]),
      );
      universo = itens.map((item) => ({
        ...(detalhesPorCodigo.get(String(item.codigo)) || {}),
        ...item,
      }));
      camposUniverso = campos;
      const idsValidos = new Set(
        universo.filter(elegivel).map((o) => o.id),
      );
      selecionados = new Set(
        [...selecionados].filter((id) => idsValidos.has(id) && !confirmados.has(id)),
      );
      confirmados = new Set(
        [...confirmados].filter((id) => idsValidos.has(id)),
      );
      $("demanda-campo").innerHTML =
        '<option value="">Todos os atributos</option>' +
        campos
          .map(
            (c) => `<option value="${esc(c.campo)}">${esc(c.rotulo)}</option>`,
          )
          .join("");
      atualizarValoresAtributo();
      renderDemandas();
      renderResumo();
    } catch (e) {
      if (requestId !== universoRequestId) return;
      erro(e.message);
    }
  }
  function erro(msg) {
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
  let matrizArquivoExcelBase64 = null;

  async function arquivoParaBase64(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binario = "";
    const bloco = 0x8000;
    for (let i = 0; i < bytes.length; i += bloco) {
      binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
    }
    return btoa(binario);
  }

  async function lerMatriz(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "json") return JSON.parse(await file.text());
    if (ext === "csv") {
      const text = await file.text(),
        lines = text.split(/\r?\n/).filter(Boolean),
        sep = lines[0].includes(";") ? ";" : ",";
      const heads = lines
        .shift()
        .split(sep)
        .map((x) => x.trim());
      return {
        arquivo: file.name,
        linhas: lines.map((l) =>
          Object.fromEntries(l.split(sep).map((v, i) => [heads[i], v.trim()])),
        ),
      };
    }
    if (ext === "xlsx" && window.XLSX) {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      // Abas auxiliares do modelo oficial (SLT/PLI-SP) que nunca contêm a matriz.
      const ABAS_AUXILIARES = new Set(["instruções", "instrucoes", "_listas", "etapas", "dimensões de critérios", "dimensoes de criterios", "critérios", "criterios"]);
      const normalizar = (s) => String(s || "").trim().toLowerCase();
      const temColunasDaMatriz = (nome) => {
        const primeiraLinha = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: "" })[0] || [];
        const cabecalho = primeiraLinha.map(normalizar);
        return cabecalho.some((c) => c.includes("crit")) && cabecalho.some((c) => c.includes("etapa"));
      };
      // 1) Nome de aba conhecido (versões atuais e anteriores do modelo).
      let abaPrincipal = ["Matriz Crit Premissas v3", "Matriz Crit Premissas v2"].find((n) => wb.SheetNames.includes(n));
      // 2) Qualquer aba, não auxiliar, cujo cabeçalho tenha as colunas Critério e Etapa.
      if (!abaPrincipal) {
        abaPrincipal = wb.SheetNames.find((n) => !ABAS_AUXILIARES.has(normalizar(n)) && temColunasDaMatriz(n));
      }
      // 3) Primeira aba que não seja reconhecidamente auxiliar.
      if (!abaPrincipal) {
        abaPrincipal = wb.SheetNames.find((n) => !ABAS_AUXILIARES.has(normalizar(n))) || wb.SheetNames[0];
      }
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[abaPrincipal], {
        defval: "",
      });
      // Coleta as demais abas do modelo (dimensões, critérios, índice) como contexto auxiliar.
      const abas = {};
      for (const nome of wb.SheetNames) {
        abas[nome] = XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: "" });
      }
      return {
        arquivo: file.name,
        aba: abaPrincipal,
        linhas,
        abas,
      };
    }
    throw new Error("Formato não suportado.");
  }
  $("hier-tipo").onchange = carregarUniverso;
  const abasTipo = [
    ...document.querySelectorAll("#hier-tipo-tabs [data-tipo]"),
  ];
  function ativarAbaTipo(aba) {
    if (!aba) return;
    if ($("hier-tipo").value !== aba.dataset.tipo) {
      $("hier-tipo").value = aba.dataset.tipo;
      carregarUniverso();
    }
    aba.focus();
  }
  abasTipo.forEach((aba, indice) => {
    aba.onclick = () => {
      if ($("hier-tipo").value === aba.dataset.tipo) return;
      $("hier-tipo").value = aba.dataset.tipo;
      carregarUniverso();
    };
    aba.onkeydown = (evento) => {
      let destino = null;
      if (evento.key === "ArrowRight")
        destino = abasTipo[(indice + 1) % abasTipo.length];
      else if (evento.key === "ArrowLeft")
        destino = abasTipo[(indice - 1 + abasTipo.length) % abasTipo.length];
      else if (evento.key === "Home") destino = abasTipo[0];
      else if (evento.key === "End") destino = abasTipo.at(-1);
      if (!destino) return;
      evento.preventDefault();
      ativarAbaTipo(destino);
    };
  });
  ["demanda-busca", "demanda-valor"].forEach(
    (id) =>
      ($(id).oninput = () => {
        paginaDemandas = 1;
        renderDemandas();
      }),
  );
  $("demanda-campo").onchange = () => {
    paginaDemandas = 1;
    atualizarValoresAtributo();
    renderDemandas();
  };
  $("demanda-pagina-anterior").onclick = () => {
    paginaDemandas -= 1;
    renderDemandas();
  };
  $("demanda-pagina-proxima").onclick = () => {
    paginaDemandas += 1;
    renderDemandas();
  };
  $("demanda-confirmar").onclick = () => {
    const validos = [...selecionados].filter((id) => {
      const demanda = universo.find((o) => o.id === id);
      return demanda && elegivel(demanda);
    });
    if (!validos.length) return erro("Selecione ao menos uma demanda apta.");
    validos.forEach((id) => confirmados.add(id));
    selecionados.clear();
    grupoFechado = false;
    renderDemandas();
    renderResumo();
  };
  $("demanda-limpar").onclick = () => {
    selecionados.clear();
    renderDemandas();
  };
  $("demanda-atualizar").onclick = () =>
    carregarUniverso({ preservarSelecao: true });
  function cancelarGrupo() {
    selecionados.clear();
    confirmados.clear();
    selecionadosResumo.clear();
    grupoFechado = false;
    $("demanda-busca").value = "";
    $("demanda-campo").value = "";
    atualizarValoresAtributo();
    $("hier-tipo").value = "projeto";
    carregarUniverso();
  }
  $("demanda-cancelar").onclick = cancelarGrupo;
  $("demanda-resumo-excluir").onclick = () => {
    if (grupoFechado) return;
    selecionadosResumo.forEach((id) => confirmados.delete(id));
    selecionadosResumo.clear();
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-confirmar").onclick = () => {
    if (!confirmados.size) return erro("Adicione demandas ao grupo antes de confirmá-lo.");
    grupoFechado = true;
    selecionados.clear();
    selecionadosResumo.clear();
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-editar").onclick = () => {
    grupoFechado = false;
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-cancelar").onclick = cancelarGrupo;
  $("demanda-resumo-atualizar").onclick = () =>
    carregarUniverso({ preservarSelecao: true });
  $("hier-matriz").onchange = async (e) => {
    try {
      const arquivo = e.target.files[0];
      matriz = await lerMatriz(arquivo);
      matrizArquivoExcelBase64 = /\.xlsx$/i.test(arquivo.name)
        ? await arquivoParaBase64(arquivo)
        : null;
      const n = Array.isArray(matriz)
        ? matriz.length
        : (matriz.linhas || []).length;
      $("matriz-resumo").textContent =
        `${e.target.files[0].name} · ${n} linha(s) carregada(s)`;
      $("matriz-resumo").classList.remove("hidden");
    } catch (err) {
      matriz = null;
      matrizArquivoExcelBase64 = null;
      erro(err.message);
    }
  };
  $("nova-hierarquizacao").onsubmit = async (e) => {
    e.preventDefault();
    const fases = [...document.querySelectorAll("#hier-fases input:checked")].map((x) => Number(x.value));
    if (!fases.length) return erro("Selecione ao menos uma fase da rodada.");
    if (!confirmados.size)
      return erro("Adicione ao menos uma demanda apta ao grupo.");
    if (!grupoFechado)
      return erro("Confirme o grupo antes de enviar a hierarquização.");
    if (fases.some((fase) => fase === 2 || fase === 3) && !matriz)
      return erro("Carregue a matriz de premissas e critérios para as Fases 2 e 3.");
    try {
      await HierApi.criar({
        nome: $("hier-nome").value.trim(),
        descricao: $("hier-descricao").value.trim() || null,
        tipo_demanda: $("hier-tipo").value,
        objetos: universo.filter(
          (o) => elegivel(o) && confirmados.has(o.id),
        ),
        matriz_premissas_criterios: matriz,
        arquivo_excel_matriz_base64: matrizArquivoExcelBase64,
        fases_a_executar: fases,
      });
      location.reload();
    } catch (err) {
      erro(err.message);
    }
  };
  document.querySelectorAll("[data-modal]").forEach((modal) => {
    const closeBtn = modal.querySelector("[data-modal-close]");
    if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add("hidden"); };
  });
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
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-modal]").forEach((m) => m.classList.add("hidden"));
  });
  const bindLote = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  bindLote("hier-bulk-edit", () => { if (!selecionadasHier.size) return; hierEditMode = true; renderTabela(); });
  bindLote("hier-bulk-cancel", () => { hierEditMode = false; renderTabela(); });
  bindLote("hier-bulk-save", async () => {
    const codigos = [...selecionadasHier];
    try {
      for (const cod of codigos) {
        const tr = $("hier-tbody").querySelector(`tr[data-codigo="${cod.replace(/"/g, '\\"')}"]`);
        if (!tr) continue;
        const payload = {};
        tr.querySelectorAll("[data-k]").forEach((el) => { payload[el.dataset.k] = el.value; });
        await HierApi.atualizar(cod, payload);
      }
      hierEditMode = false;
      await carregarLista();
    } catch (e) { $("hier-error").textContent = e.message; $("hier-error").classList.remove("hidden"); }
  });
  bindLote("hier-bulk-delete", async () => {
    const codigos = [...selecionadasHier];
    if (!codigos.length) return;
    if (!window.confirm(`Excluir definitivamente ${codigos.length} hierarquização(ões)? Esta ação não pode ser desfeita.`)) return;
    try {
      for (const cod of codigos) await HierApi.excluir(cod);
      selecionadasHier.clear();
      hierEditMode = false;
      await carregarLista();
    } catch (e) { $("hier-error").textContent = e.message; $("hier-error").classList.remove("hidden"); }
  });
  if ($("hier-select-all")) {
    $("hier-select-all").onchange = () => {
      if ($("hier-select-all").checked) listaCache.forEach((h) => selecionadasHier.add(h.codigo));
      else selecionadasHier.clear();
      renderTabela();
    };
  }
  async function iniciar() {
    carregarLista();
    carregarUniverso();
    try {
      await window.SLTAdminLabels?.init?.("/restrict/");
      renderDemandas();
      renderResumo();
    } catch (e) {
      console.warn("Não foi possível carregar todos os aliases administrativos.", e);
    }
  }
  iniciar();
})();
