/* Área do Administrador — navegação por esquemas/tabelas e CRUD real. */
(function () {
  "use strict";
  const API = "/api/admin";
  const POR_PAGINA = 15;

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...filhos) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    });
    filhos.flat().forEach((f) => node.append(f?.nodeType ? f : document.createTextNode(String(f))));
    return node;
  };
  const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function jsonFetch(url, options = {}) {
    const resp = await fetch(url, { credentials: "include", headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(body.detail || `Erro HTTP ${resp.status}`);
    return body;
  }

  // ---------- Aliases amigáveis (pt-BR) ----------
  const ALIAS = {
    id: "Identificador", codigo: "Código", nome: "Nome", descricao: "Descrição",
    status: "Status", ativo: "Ativo", ordem: "Ordem", valor: "Valor", rotulo: "Rótulo",
    tipo: "Tipo", versao: "Versão", finalidade: "Finalidade", observacao: "Observação",
    observacao_metodologica: "Observação metodológica", modulo: "Módulo",
    modulo_consumidor: "Módulo consumidor", nome_publicacao: "Nome de publicação",
    crs: "Sistema de referência (CRS)", metadados: "Metadados", hash_conteudo: "Hash do conteúdo",
    geometria_tipo: "Tipo de geometria", formato: "Formato", envelope: "Envelope espacial",
    tipo_usuario: "Perfil do usuário", email: "E-mail", senha_hash: "Hash da senha",
    data_referencia: "Data de referência", data_homologacao: "Data de homologação",
    configuracao: "Configuração", parametros: "Parâmetros", resultado: "Resultado",
    fase: "Fase", grupo: "Grupo", peso: "Peso", nota: "Nota", ranking: "Classificação resultante",
    latitude: "Latitude", longitude: "Longitude", municipio: "Município",
    uf: "Unidade federativa", data: "Data", inicio: "Início", fim: "Fim", url: "URL",
    ativo_em: "Ativo em", excluido: "Excluído", excluido_em: "Excluído em",
    // Alinhados com os cabeçalhos de "Hierarquizações realizadas" (/restrict/hierarquizacao/)
    config_id: "Identificador da configuração AHP",
    objetos: "Demandas do grupo",
    julgamento_projetos: "Julgamentos dos projetos",
    pesos_projetos: "Pesos dos projetos",
    grupo_id: "Grupo comparável",
    dados_hierarquizacao: "Dados completos da hierarquização",
    relatorio_fase1: "Relatório da Fase 1",
    relatorio_fase2: "Relatório da Fase 2",
    relatorio_fase3: "Relatório da Fase 3",
    relatorio_consolidado: "Relatório consolidado",
  };

  // Aliases que só valem dentro de uma tabela específica (mesmo nome de coluna
  // tem sentidos diferentes em outras tabelas, ex.: "status", "codigo", "criado_em").
  const ALIAS_POR_TABELA = {
    hierarquizacao_portfolio: {
      codigo: "Código da hierarquização",
      status: "Situação",
      arquivo_excel_matriz_criterios_premissas: "Matriz de critérios e premissas",
      homologado_em: "Data da homologação",
      homologado_por: "Responsável pela homologação",
      criado_por: "Responsável pelo cadastro",
      criado_em: "Data de cadastro",
      atualizado_em: "Última atualização",
      tipo_demanda_id: "Tipo de demanda",
    },
  };
  function humanize(nome) {
    const t = String(nome).replace(/_/g, " ").trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function aliasAmigavel(nome, tabela) {
    const doTabela = tabela && ALIAS_POR_TABELA[tabela];
    if (doTabela && doTabela[nome]) return doTabela[nome];
    if (ALIAS[nome]) return ALIAS[nome];
    if (nome.endsWith("_id")) { const b = nome.slice(0, -3); return (ALIAS[b] || humanize(b)) + " (ID)"; }
    if (nome.endsWith("_em")) { const b = nome.slice(0, -3); return humanize(b) + " em"; }
    if (nome.endsWith("_por")) { const b = nome.slice(0, -4); return humanize(b) + " por"; }
    if (nome.endsWith("_at")) { const b = nome.slice(0, -3); return humanize(b) + " em"; }
    return humanize(nome);
  }

  // ---------- Aliases de esquemas e tabelas (Title Case pt-BR) ----------
  const ESQUEMA_ALIAS = {
    ahp: "AHP", auditoria: "Auditoria", demandas: "Demandas", geo: "Geografia",
    geoprocessamento: "Geoprocessamento", hierarquizacao_demandas: "Hierarquização de Demandas",
  };
  const TOKEN = {
    ahp: "AHP", crs: "CRS", comparacao: "Comparação", colaborativa: "Colaborativa",
    ambiente: "Ambiente", resposta: "Resposta", config: "Configuração",
    configuracao: "Configuração", multicriterio: "Multicritério", avulsa: "Avulsa",
    portfolio: "Portfólio", log: "Registro", sistema: "do Sistema", dom: "Domínio",
    status: "Status", demanda: "Demanda", demandas: "Demandas", transicao: "Transição",
    tipo: "Tipo", indicadores: "Indicadores", plano: "Plano", unidade: "Unidade",
    espacial: "Espacial", programa: "Programa", projeto: "Projeto",
    regionalizacao: "Regionalização", usuario: "Usuário", artefato: "Artefato",
    atributo: "Atributo", fase1: "Fase 1", fase2: "Fase 2", fase3: "Fase 3",
    camada: "Camada", feicao: "Feição", raster: "Raster", vetor: "Vetor",
    homologada: "Homologada", importada: "Importada", processada: "Processada",
    fatiamento: "Fatiamento", fluxo: "Fluxo", item: "Item", criterio: "Critério",
    execucao: "Execução", etapa: "Etapa", fonte: "Fonte", homologacao: "Homologação",
    mensagem: "Mensagem", modelo: "Modelo", geoprocessamento: "Geoprocessamento",
    portal: "Portal", favorito: "Favorito", servico: "Serviço", produto: "Produto",
    regra: "Regra", classificacao: "Classificação", rodada: "Rodada",
    validacao: "Validação", hierarquizacao: "Hierarquização", portfolio_: "Portfólio",
  };
  const TABELA_ALIAS = {
    log_sistema: "Registros do Sistema",
    plano_unidade_espacial: "Unidades Espaciais do Plano",
    programa_unidade_espacial: "Unidades Espaciais do Programa",
    unidade_espacial: "Unidades Espaciais", tipo_regionalizacao: "Tipos de Regionalização",
    dom_status_demanda: "Status da Demanda",
    dom_status_demanda_transicao: "Transições de Status da Demanda",
    dom_tipo_demanda: "Tipos de Demanda",
    hierarquizacao_portfolio: "Portfólio de Hierarquização",
    config_multicriterio_portfolio: "Configuração Multicritério do Portfólio",
    config_multicriterio_avulsa: "Configuração Multicritério Avulsa",
    modelo_geoprocessamento: "Modelos de Geoprocessamento",
    regra_classificacao_fase1: "Regras de Classificação (Fase 1)",
    camada_homologada_feicao: "Feições de Camadas Homologadas",
    camada_importada_feicao: "Feições de Camadas Importadas",
    camada_processada_feicao: "Feições de Camadas Processadas",
    camada_homologada_raster: "Rasters de Camadas Homologadas",
    camada_importada_raster: "Rasters de Camadas Importadas",
    camada_processada_raster: "Rasters de Camadas Processadas",
    produto_homologado_fase1: "Produtos Homologados (Fase 1)",
    configuracao_fatiamento_fase1: "Configuração de Fatiamento (Fase 1)",
    configuracao_fluxo_item: "Itens da Configuração de Fluxo",
    configuracao_fluxo: "Configuração de Fluxo", criterio_fase2: "Critérios (Fase 2)",
    produto_criterio_fase2: "Critérios do Produto (Fase 2)",
    atributo_fase3: "Atributos (Fase 3)", rodada_fase3: "Rodadas (Fase 3)",
    fonte_fase1: "Fontes (Fase 1)", portal_favorito_usuario: "Favoritos do Portal por Usuário",
    portal_servico: "Serviços do Portal", ambiente_usuario: "Ambiente por Usuário",
    mensagem_execucao: "Mensagens de Execução", execucao_etapa: "Etapas de Execução",
    produto_fonte: "Fontes do Produto",
  };
  function aliasEsquema(nome) { return ESQUEMA_ALIAS[nome] || humanize(nome); }
  function aliasTabela(nome) {
    if (TABELA_ALIAS[nome]) return TABELA_ALIAS[nome];
    const base = nome.startsWith("dom_") ? nome.slice(4) : nome;
    return base.split("_").map((t) => TOKEN[t] || humanize(t)).join(" ");
  }

  // ---------- Estado ----------
  const state = {
    esquema: null, tabela: null, dominio: false, pagina: 1,
    colunas: [], chavePrimaria: [], linhas: [], total: 0, paginas: 1,
    selecao: new Map(), editando: null,
    ordenar: null, direcao: "asc",
    filtro: { coluna: null, tipo: "valor", valor: null, inverter: false }, valoresCache: {},
    usuariosNomes: {},
  };

  const refs = {
    menu: $("#admin-menu"),
    titulo: $("#admin-table-title"),
    sub: $("#admin-table-sub"),
    host: $("#admin-table-host"),
  };

  function feedback(msg, tipo) {
    let box = $(".admin-feedback", refs.host.parentElement);
    if (!box) { box = el("div", { class: "admin-feedback" }); refs.host.before(box); }
    box.className = `admin-feedback show ${tipo}`;
    box.textContent = msg;
    clearTimeout(feedback.timer);
    feedback.timer = setTimeout(() => box.classList.remove("show"), 5000);
  }

  // ---------- Menu de esquemas ----------
  function renderGrupoMenu({ titulo, chave, tabelas, title, aberto = false }) {
    const lista = el("ul", { class: "admin-tables" });
    tabelas.forEach((t) => {
      const vazia = t.registros === 0;
      const link = el("button", {
        class: `admin-table-link${vazia ? " vazia" : ""}`, type: "button",
        "data-esquema": t.esquema, "data-tabela": t.nome,
        title: `${t.esquema}.${t.nome}${t.registros === null ? "" : ` · ${t.registros} registro(s)`}`,
        onclick: () => selecionarTabela(t.esquema, t.nome, t.dominio, link),
      },
        el("i", { class: t.dominio ? "fa-solid fa-list" : "fa-solid fa-table", "aria-hidden": "true" }),
        el("span", {}, aliasTabela(t.nome)),
        t.dominio ? el("span", { class: "dominio-badge" }, aliasEsquema(t.esquema)) : "",
        el("span", { class: "admin-table-count" }, t.registros === null ? "—" : String(t.registros)));
      lista.append(el("li", {}, link));
    });
    const bloco = el("div", { class: `admin-schema${aberto ? " open" : ""}`, "data-esquema": chave });
    const toggle = el("button", {
      class: "admin-schema-toggle", type: "button", title: title || titulo,
      onclick: () => bloco.classList.toggle("open"),
    },
      el("i", { class: "fa-solid fa-chevron-right chevron", "aria-hidden": "true" }),
      el("span", {}, titulo),
      el("span", { class: "admin-schema-count" }, String(tabelas.length)));
    bloco.append(toggle, lista);
    refs.menu.append(bloco);
  }

  async function carregarMenu() {
    try {
      const { esquemas } = await jsonFetch(`${API}/esquemas`);
      refs.menu.innerHTML = "";
      const dominios = esquemas.flatMap((grupo) =>
        grupo.tabelas.filter((t) => t.dominio).map((t) => ({ ...t, esquema: grupo.esquema }))
      ).sort((a, b) => aliasTabela(a.nome).localeCompare(aliasTabela(b.nome), "pt-BR"));
      if (dominios.length) {
        renderGrupoMenu({
          titulo: "Tabelas de domínio", chave: "__dominios__", tabelas: dominios,
          title: "Tabelas de domínio de todos os esquemas", aberto: true,
        });
      }
      esquemas.forEach((grupo) => {
        const tabelas = grupo.tabelas
          .filter((t) => !t.dominio)
          .map((t) => ({ ...t, esquema: grupo.esquema }));
        if (!tabelas.length) return;
        renderGrupoMenu({
          titulo: aliasEsquema(grupo.esquema), chave: grupo.esquema,
          tabelas, title: grupo.esquema,
        });
      });
    } catch (error) {
      refs.menu.innerHTML = `<p class="admin-menu-loading">${escapeHtml(error.message)}</p>`;
    }
  }

  function selecionarTabela(esquema, tabela, dominio, link) {
    document.querySelectorAll(".admin-table-link.active").forEach((n) => n.classList.remove("active"));
    link?.classList.add("active");
    state.esquema = esquema; state.tabela = tabela; state.dominio = dominio;
    state.pagina = 1; state.selecao.clear(); state.editando = null;
    state.ordenar = null; state.direcao = "asc";
    state.filtro = { coluna: null, tipo: "valor", valor: null, inverter: false };
    state.valoresCache = {};
    carregarTabela();
  }

  async function carregarTabela() {
    refs.titulo.textContent = aliasTabela(state.tabela);
    document.title = `${aliasTabela(state.tabela)} — Administração`;
    refs.host.innerHTML = '<p class="admin-placeholder">Carregando registros…</p>';
    try {
      const q = new URLSearchParams({ pagina: state.pagina, por_pagina: POR_PAGINA });
      if (state.ordenar) { q.set("ordenar", state.ordenar); q.set("direcao", state.direcao); }
      const f = state.filtro;
      if (f.coluna) {
        q.set("filtro_coluna", f.coluna);
        q.set("filtro_tipo", f.tipo);
        if (f.tipo === "valor" && f.valor != null) q.set("filtro_valor", f.valor);
        if (f.inverter) q.set("filtro_inverter", "true");
      }
      const data = await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}?${q}`);
      Object.assign(state, {
        colunas: data.colunas, chavePrimaria: data.chave_primaria,
        linhas: data.linhas, total: data.total, paginas: data.paginas, dominio: data.dominio,
        usuariosNomes: data.usuarios_nomes || {},
      });
      refs.sub.textContent = `${state.esquema}.${state.tabela} · ${data.total} registro(s) · chave primária: ${data.chave_primaria.join(", ") || "—"}`;
      renderTabela();
    } catch (error) {
      refs.host.innerHTML = `<p class="admin-placeholder">${escapeHtml(error.message)}</p>`;
    }
  }

  function ordenarPor(nome) {
    if (state.ordenar !== nome) { state.ordenar = nome; state.direcao = "asc"; }
    else if (state.direcao === "asc") { state.direcao = "desc"; }
    else { state.ordenar = null; state.direcao = "asc"; }
    state.pagina = 1; state.selecao.clear();
    carregarTabela();
  }

  // ---------- Filtro (fora e acima da tabela) ----------
  async function carregarValores(coluna) {
    if (!coluna || state.valoresCache[coluna]) return;
    try {
      const b = await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}/valores?coluna=${encodeURIComponent(coluna)}`);
      state.valoresCache[coluna] = b;
    } catch (_e) {
      state.valoresCache[coluna] = { valores: [], truncado: false };
    }
  }
  function montarFiltro() {
    const filtraveis = state.colunas.filter((c) => c.filtravel);
    const f = state.filtro;
    const colSelect = el("select", { class: "admin-filter-col", "aria-label": "Coluna do filtro" },
      el("option", { value: "" }, "— Coluna —"),
      ...filtraveis.map((c) => el("option", { value: c.nome, ...(c.nome === f.coluna ? { selected: "selected" } : {}) }, aliasAmigavel(c.nome, state.tabela))));
    colSelect.onchange = () => aoSelecionarColuna(colSelect.value);

    const cache = f.coluna ? state.valoresCache[f.coluna] : null;
    const valSelect = el("select", { class: "admin-filter-val", "aria-label": "Valor do filtro" });
    if (!f.coluna) {
      valSelect.append(el("option", { value: "" }, "— selecione a coluna —"));
      valSelect.disabled = true;
    } else {
      valSelect.append(el("option", { value: "" }, "— Valor —"));
      valSelect.append(el("option", { value: "__vazias__", ...(f.tipo === "vazias" ? { selected: "selected" } : {}) }, "(vazias)"));
      (cache?.valores || []).forEach((v) => {
        valSelect.append(el("option", { value: v, ...(f.tipo === "valor" && f.valor === v ? { selected: "selected" } : {}) }, v));
      });
      if (cache?.truncado) valSelect.append(el("option", { value: "", disabled: "disabled" }, "… (mostrando os primeiros 500)"));
    }
    valSelect.onchange = () => aoSelecionarValor(valSelect.value);

    const inverter = el("label", { class: "admin-filter-inv" },
      el("input", { type: "checkbox", ...(f.inverter ? { checked: "checked" } : {}), onchange: (e) => aoInverter(e.target.checked) }),
      el("span", {}, "Inverter seleção"));

    const limpar = el("button", { class: "admin-btn", type: "button", onclick: limparFiltro }, "Limpar");

    return el("div", { class: "admin-filter-bar" },
      el("span", { class: "admin-filter-label" }, "Filtro:"),
      colSelect, valSelect, inverter, f.coluna ? limpar : "");
  }
  async function aoSelecionarColuna(coluna) {
    state.filtro = { coluna: coluna || null, tipo: "valor", valor: null, inverter: state.filtro.inverter };
    if (coluna) await carregarValores(coluna);
    // Recria só a barra (sem recarregar a tabela) até o valor ser escolhido.
    const barra = refs.host.querySelector(".admin-filter-bar");
    if (barra) barra.replaceWith(montarFiltro());
  }
  function aoSelecionarValor(valor) {
    if (!state.filtro.coluna) return;
    if (valor === "__vazias__") { state.filtro.tipo = "vazias"; state.filtro.valor = null; }
    else if (valor === "") { state.filtro.tipo = "valor"; state.filtro.valor = null; }
    else { state.filtro.tipo = "valor"; state.filtro.valor = valor; }
    state.pagina = 1; state.selecao.clear();
    carregarTabela();
  }
  function aoInverter(marcado) {
    state.filtro.inverter = marcado;
    if (state.filtro.coluna && (state.filtro.tipo === "vazias" || state.filtro.valor != null)) {
      state.pagina = 1; state.selecao.clear(); carregarTabela();
    }
  }
  function limparFiltro() {
    state.filtro = { coluna: null, tipo: "valor", valor: null, inverter: false };
    state.pagina = 1; state.selecao.clear();
    carregarTabela();
  }

  function chaveDaLinha(linha) {
    const chave = {};
    state.chavePrimaria.forEach((k) => (chave[k] = linha[k]));
    return chave;
  }
  const chaveId = (chave) => JSON.stringify(chave);

  const UDT_DATA = new Set(["date"]);
  const UDT_HORA = new Set(["time", "timetz"]);
  const UDT_DATA_HORA = new Set(["timestamp", "timestamptz"]);

  function pad2(n) { return String(n).padStart(2, "0"); }

  function formatarDataHora(valor, coluna) {
    const udt = String(coluna.udt || "").toLowerCase();
    if (UDT_HORA.has(udt)) {
      const m = String(valor).match(/^(\d{2}):(\d{2}):(\d{2})/);
      if (!m) return null;
      return { linhas: [`${m[1]}:${m[2]}:${m[3]}`] };
    }
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return null;
    const data = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    if (UDT_DATA.has(udt)) return { linhas: [data] };
    if (UDT_DATA_HORA.has(udt)) {
      const hora = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
      return { linhas: [data, hora] };
    }
    return null;
  }

  function celulaValor(valor, coluna) {
    if (valor === null || valor === undefined) return { texto: "—", classe: "cell-null" };
    const udt = String(coluna.udt || "").toLowerCase();
    if (coluna.usuario && typeof valor === "string") {
      const nome = state.usuariosNomes[valor];
      return { classe: "cell-usuario", duasLinhas: [nome || "—", valor] };
    }
    if (UDT_DATA.has(udt) || UDT_HORA.has(udt) || UDT_DATA_HORA.has(udt)) {
      const formatado = formatarDataHora(valor, coluna);
      if (formatado) return { classe: "cell-datahora", duasLinhas: formatado.linhas };
    }
    if (typeof valor === "boolean") return { texto: valor ? "Sim" : "Não", classe: "" };
    if (typeof valor === "object") { const s = JSON.stringify(valor); return { texto: s, classe: "", json: true }; }
    return { texto: String(valor), classe: "" };
  }

  function renderTabela() {
    if (!state.chavePrimaria.length) {
      // Sem PK: exibe dados, mas sem edição/exclusão.
    }
    const wrap = el("div", { class: "admin-table-wrap" });
    const table = el("table", { class: "admin-data-table" });

    // Cabeçalho: checkbox + colunas (2 linhas)
    const thSelect = el("th", { class: "col-select" }, el("input", {
      type: "checkbox", "aria-label": "Selecionar todas",
      onchange: (e) => alternarTodas(e.target.checked),
    }));
    const headTr = el("tr", {}, thSelect);
    state.colunas.forEach((c) => {
      const ativo = state.ordenar === c.nome;
      const seta = ativo ? (state.direcao === "asc" ? " ▲" : " ▼") : "";
      const th = el("th", { class: c.ordenavel ? "sortable" : "" },
        el("span", { class: "admin-col-alias" }, aliasAmigavel(c.nome, state.tabela) + seta),
        el("span", { class: "admin-col-original" }, c.nome));
      if (c.ordenavel) th.addEventListener("click", () => ordenarPor(c.nome));
      headTr.append(th);
    });
    table.append(el("thead", {}, headTr));

    // Corpo
    const tbody = el("tbody", {});
    if (!state.linhas.length) {
      tbody.append(el("tr", {}, el("td", { colspan: state.colunas.length + 1, class: "cell-null" }, "Nenhum registro nesta página.")));
    }
    state.linhas.forEach((linha) => {
      const chave = chaveDaLinha(linha);
      const kid = chaveId(chave);
      const editando = state.editando === kid;
      const tr = el("tr", { "data-kid": kid, class: editando ? "is-editing" : "" });
      const chk = el("input", {
        type: "checkbox", "aria-label": "Selecionar registro",
        onchange: (e) => alternarLinha(kid, chave, e.target.checked),
      });
      if (state.selecao.has(kid)) chk.checked = true;
      if (!state.chavePrimaria.length) chk.disabled = true;
      tr.append(el("td", { class: "col-select" }, chk));

      state.colunas.forEach((c) => {
        const val = linha[c.nome];
        if (editando && c.editavel && !c.pk) {
          const td = el("td", { class: "cell-editable" }, campoEdicao(c, val));
          tr.append(td);
        } else {
          const info = celulaValor(val, c);
          const td = el("td", { class: info.classe });
          if (info.duasLinhas) {
            td.append(
              el("span", { class: "admin-cell-linha1" }, info.duasLinhas[0]),
              info.duasLinhas[1] != null ? el("span", { class: "admin-cell-linha2" }, info.duasLinhas[1]) : "");
          } else if (info.json) {
            td.append(el("span", { class: "admin-cell-json", title: info.texto }, info.texto));
          } else {
            td.textContent = info.texto;
          }
          tr.append(td);
        }
      });
      tbody.append(tr);
    });
    table.append(tbody);
    wrap.append(table);

    refs.host.innerHTML = "";
    refs.host.append(montarFiltro(), wrap, montarAcoes(), montarPaginacao());
    atualizarBotoes();
  }

  function campoEdicao(coluna, valor) {
    if (coluna.udt === "bool") {
      const sel = el("select", { "data-col": coluna.nome },
        el("option", { value: "" }, "—"),
        el("option", { value: "true" }, "Sim"),
        el("option", { value: "false" }, "Não"));
      sel.value = valor === true ? "true" : valor === false ? "false" : "";
      return sel;
    }
    const input = el("input", { type: "text", "data-col": coluna.nome, value: valor === null || valor === undefined ? "" : (typeof valor === "object" ? JSON.stringify(valor) : String(valor)) });
    return input;
  }

  // ---------- Ações ----------
  function montarAcoes() {
    const acoes = el("div", { class: "admin-actions" });
    if (state.editando) {
      acoes.append(
        botao("save", "fa-check", "Salvar alterações", salvarEdicao),
        botao("cancel", "fa-xmark", "Cancelar", () => { state.editando = null; renderTabela(); }));
      return acoes;
    }
    acoes.append(botao("reload", "fa-rotate-right", "Recarregar", carregarTabela));
    if (state.dominio) acoes.append(botao("add", "fa-plus", "Adicionar registro", abrirModalInsercao));
    acoes.append(
      botao("edit", "fa-pen", "Editar selecionado", iniciarEdicao),
      botao("delete", "fa-trash", "Excluir selecionados", excluirSelecionados));
    return acoes;
  }
  function botao(cls, icon, titulo, onClick) {
    return el("button", { class: `admin-icon-btn ${cls}`, type: "button", title: titulo, "aria-label": titulo, onclick: onClick },
      el("i", { class: `fa-solid ${icon}`, "aria-hidden": "true" }));
  }
  function atualizarBotoes() {
    const btnEdit = $(".admin-icon-btn.edit", refs.host);
    const btnDel = $(".admin-icon-btn.delete", refs.host);
    if (btnEdit) btnEdit.disabled = state.selecao.size !== 1 || !state.chavePrimaria.length;
    if (btnDel) btnDel.disabled = state.selecao.size < 1 || !state.chavePrimaria.length;
  }

  function alternarLinha(kid, chave, marcado) {
    if (marcado) state.selecao.set(kid, chave); else state.selecao.delete(kid);
    atualizarBotoes();
  }
  function alternarTodas(marcado) {
    state.selecao.clear();
    if (marcado) state.linhas.forEach((l) => { const c = chaveDaLinha(l); state.selecao.set(chaveId(c), c); });
    renderTabela();
  }

  function montarPaginacao() {
    const nav = el("div", { class: "admin-pagination" });
    const prev = el("button", { type: "button", title: "Anterior", onclick: () => { if (state.pagina > 1) { state.pagina--; state.selecao.clear(); carregarTabela(); } } }, "‹");
    const next = el("button", { type: "button", title: "Próxima", onclick: () => { if (state.pagina < state.paginas) { state.pagina++; state.selecao.clear(); carregarTabela(); } } }, "›");
    prev.disabled = state.pagina <= 1;
    next.disabled = state.pagina >= state.paginas;
    nav.append(prev, el("span", {}, `Página ${state.pagina} de ${state.paginas} · ${state.total} registro(s)`), next);
    return nav;
  }

  function iniciarEdicao() {
    if (state.selecao.size !== 1) return;
    state.editando = [...state.selecao.keys()][0];
    renderTabela();
  }

  async function salvarEdicao() {
    const kid = state.editando;
    const chave = state.selecao.get(kid) || JSON.parse(kid);
    const valores = {};
    refs.host.querySelectorAll("tr.is-editing [data-col]").forEach((campo) => {
      const col = campo.dataset.col;
      let v = campo.value;
      const coluna = state.colunas.find((c) => c.nome === col);
      if (coluna && coluna.udt === "bool") v = v === "" ? null : v === "true";
      valores[col] = v;
    });
    try {
      await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, valores }),
      });
      state.editando = null; state.selecao.clear();
      await carregarTabela();
      feedback("Registro atualizado com sucesso.", "ok");
    } catch (error) { feedback(error.message, "error"); }
  }

  async function excluirSelecionados() {
    if (!state.selecao.size) return;
    const qtd = state.selecao.size;
    if (!window.confirm(`Excluir definitivamente ${qtd} registro(s) de ${aliasTabela(state.tabela)}?`)) return;
    try {
      const r = await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chaves: [...state.selecao.values()] }),
      });
      state.selecao.clear();
      await carregarTabela();
      const extra = r.arquivos_removidos ? ` e ${r.arquivos_removidos} arquivo(s) em disco` : "";
      feedback(`${r.removidos} registro(s) excluído(s)${extra}.`, "ok");
    } catch (error) { feedback(error.message, "error"); }
  }

  // ---------- Modal de inserção (tabelas de domínio) ----------
  function abrirModalInsercao() {
    const editaveis = state.colunas.filter((c) => c.editavel);
    const corpo = el("div", { class: "admin-modal-body" });
    editaveis.forEach((c) => {
      let campo;
      if (c.udt === "bool") {
        campo = el("select", { "data-col": c.nome }, el("option", { value: "" }, "—"), el("option", { value: "true" }, "Sim"), el("option", { value: "false" }, "Não"));
      } else {
        campo = el("input", { type: "text", "data-col": c.nome, placeholder: c.default ? `padrão: ${c.default}` : "" });
      }
      corpo.append(el("div", { class: "admin-field" },
        el("label", {}, aliasAmigavel(c.nome, state.tabela), el("small", {}, `${c.nome} · ${c.tipo}${c.nulo ? "" : " · obrigatório"}`)),
        campo));
    });
    const backdrop = el("div", { class: "admin-modal-backdrop" });
    const fechar = () => backdrop.remove();
    const modal = el("div", { class: "admin-modal" },
      el("div", { class: "admin-modal-head" },
        el("i", { class: "fa-solid fa-plus", "aria-hidden": "true" }),
        el("h3", {}, `Adicionar em ${aliasTabela(state.tabela)}`),
        el("button", { class: "close", type: "button", "aria-label": "Fechar", onclick: fechar }, "×")),
      corpo,
      el("div", { class: "admin-modal-foot" },
        el("button", { class: "admin-btn", type: "button", onclick: fechar }, "Cancelar"),
        el("button", { class: "admin-btn primary", type: "button", onclick: () => enviarInsercao(corpo, fechar) }, "Inserir")));
    backdrop.append(modal);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) fechar(); });
    document.body.append(backdrop);
  }

  async function enviarInsercao(corpo, fechar) {
    const valores = {};
    corpo.querySelectorAll("[data-col]").forEach((campo) => {
      const col = campo.dataset.col;
      const coluna = state.colunas.find((c) => c.nome === col);
      let v = campo.value;
      if (v === "" ) return; // vazio → usa default/NULL do banco
      if (coluna && coluna.udt === "bool") v = v === "true";
      valores[col] = v;
    });
    if (!Object.keys(valores).length) { feedback("Preencha ao menos um campo.", "error"); return; }
    try {
      await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      fechar();
      state.pagina = 1;
      await carregarTabela();
      feedback("Registro inserido com sucesso.", "ok");
    } catch (error) { feedback(error.message, "error"); }
  }

  document.addEventListener("DOMContentLoaded", carregarMenu);
})();
