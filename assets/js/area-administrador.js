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
    const body = await resp.json();
    if (!resp.ok) throw new Error(body.detail || `Erro HTTP ${resp.status}`);
    return body;
  }

  // ---------- Aliases amigáveis (pt-BR) ----------
  const ALIAS = {
    origem_sei_processo: "Processo SEI", numero_processo: "Processo SEI",
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
    nome_arquivo: "Nome do arquivo", tipo_mime: "Tipo MIME", tamanho_bytes: "Tamanho (bytes)",
    sha256: "Hash SHA-256", conteudo_binario: "Arquivo original",
    origem: "Origem", regionalidades: "Regionalidades", motivo_substituicao: "Motivo da substituição",
    substituido_em: "Substituído em", substituido_por: "Substituído por",
    uf: "Unidade federativa", data: "Data", inicio: "Início", fim: "Fim", url: "URL",
    ativo_em: "Ativo em", excluido: "Excluído", excluido_em: "Excluído em",
    // Alinhados com os cabeçalhos de "Hierarquizações realizadas" (/restrict/hierarquizacao/)
    config_id: "Identificador da configuração AHP",
    objetos: "Demandas do grupo",
    julgamento_projetos: "Julgamentos dos projetos",
    pesos_projetos: "Pesos dos projetos",
    grupo_id: "Grupo comparável",
    dados_hierarquizacao: "Dados completos da hierarquização",
    relatorio_fase1: "Relatório da Elegibilidade territorial",
    relatorio_fase2: "Relatório da Favorabilidade territorial — município e rede rodoviária",
    relatorio_fase3: "Relatório da Priorização de demandas por atributos",
    relatorio_consolidado: "Relatório consolidado",
  };

  // Aliases que só valem dentro de uma tabela específica (mesmo nome de coluna
  // tem sentidos diferentes em outras tabelas, ex.: "status", "codigo", "criado_em").
  const ALIAS_POR_TABELA = {
    categoria_extracao_atributos: {
      nome: "Categoria", conceito: "Conceito", criado_em: "Data de criação",
    },
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
    dominios: "Domínios",
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
    atributo: "Atributo", fase1: "Elegibilidade territorial", fase2: "Favorabilidade territorial — município e rede rodoviária", fase3: "Priorização de demandas por atributos",
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
    categoria_extracao_atributos: "Categorias de Extração de Atributos",
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
    regra_classificacao_fase1: "Regras de Classificação (Elegibilidade territorial)",
    camada_homologada_feicao: "Feições de Camadas Homologadas",
    camada_importada_feicao: "Feições de Camadas Importadas",
    camada_processada_feicao: "Feições de Camadas Processadas",
    camada_homologada_raster: "Rasters de Camadas Homologadas",
    camada_importada_raster: "Rasters de Camadas Importadas",
    camada_processada_raster: "Rasters de Camadas Processadas",
    produto_homologado_fase1: "Produtos Homologados (Elegibilidade territorial)",
    configuracao_fatiamento_fase1: "Configuração de Fatiamento (Elegibilidade territorial)",
    configuracao_fluxo_item: "Itens da Configuração de Fluxo",
    configuracao_fluxo: "Configuração de Fluxo", criterio_fase2: "Critérios (Favorabilidade territorial — município e rede rodoviária)",
    produto_criterio_fase2: "Critérios do Produto (Favorabilidade territorial — município e rede rodoviária)",
    atributo_fase3: "Atributos (Priorização de demandas por atributos)", rodada_fase3: "Rodadas (Priorização de demandas por atributos)",
    fonte_fase1: "Fontes (Elegibilidade territorial)", portal_favorito_usuario: "Favoritos do Portal por Usuário",
    portal_servico: "Serviços do Portal", ambiente_usuario: "Ambiente por Usuário",
    mensagem_execucao: "Mensagens de Execução", execucao_etapa: "Etapas de Execução",
    produto_fonte: "Fontes do Produto",
    dom_atributo_objeto: "Atributos do Objeto",
    dom_status_hierarquizacao: "Status da Hierarquização",
    dom_status_hierarquizacao_transicao: "Transições de Status da Hierarquização",
    projeto_geometria_historico: "Histórico de geometrias das demandas",
  };
  // Rótulo curto do esquema para a etiqueta ao lado do nome, no grupo de domínios.
  const ESQUEMA_BADGE = { hierarquizacao_demandas: "Hierarquização" };
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
    usuariosNomes: {}, ocupado: false,
  };
  let revisaoTabela = 0;

  const refs = {
    menu: $("#admin-menu"),
    titulo: $("#admin-table-title"),
    sub: $("#admin-table-sub"),
    host: $("#admin-table-host"),
  };

  function feedback(msg, tipo) {
    const semResposta = msg instanceof TypeError || msg instanceof SyntaxError;
    if (semResposta) console.error("Falha de comunicação na administração de dados.", msg);
    const message = semResposta
      ? "Não foi possível confirmar o resultado da solicitação. Verifique a conexão e recarregue os dados antes de tentar novamente."
      : msg instanceof Error ? msg.message : String(msg);
    const data = {title: "Administração de Dados", message};
    if (tipo === "ok") window.StatusFeedback.sucesso(data);
    else if (tipo === "partial") window.StatusFeedback.parcial(data);
    else if (tipo === "warning") window.Notify.warning(data.title, message);
    else window.StatusFeedback.erro(data);
  }

  function ocupar(ativo) {
    state.ocupado = ativo;
    refs.host.inert = ativo;
    refs.menu.inert = ativo;
    refs.host.setAttribute("aria-busy", String(ativo));
    atualizarBotoes();
  }

  async function atualizarAposEscrita(mensagem, parcial = false) {
    state.valoresCache = {};
    if (state.filtro.coluna) await carregarValores(state.filtro.coluna);
    const atualizada = await carregarTabela(false);
    feedback(atualizada ? mensagem : `${mensagem} Não foi possível atualizar a lista. Recarregue-a antes de continuar.`,
      parcial || !atualizada ? "partial" : "ok");
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
        t.dominio ? el("span", { class: "dominio-badge", title: aliasEsquema(t.esquema) },
          ESQUEMA_BADGE[t.esquema] || aliasEsquema(t.esquema)) : "",
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

  function abrirDestinoDaUrl() {
    const params = new URLSearchParams(window.location.search);
    const menu = params.get("menu");
    const esquema = params.get("esquema");
    const tabela = params.get("tabela");
    const destino = menu || esquema;
    const alvo = destino === "dominios" ? "__dominios__" : destino;
    if (!alvo) return;

    const grupo = [...refs.menu.querySelectorAll(".admin-schema")]
      .find((item) => item.dataset.esquema === alvo);
    if (!grupo) return;

    grupo.classList.add("open", "is-targeted");
    grupo.querySelector(".admin-schema-toggle")?.setAttribute("aria-expanded", "true");

    if (esquema && tabela) {
      const link = [...grupo.querySelectorAll(".admin-table-link")].find(
        (item) => item.dataset.esquema === esquema && item.dataset.tabela === tabela,
      );
      link?.click();
    }

    requestAnimationFrame(() => grupo.scrollIntoView({ block: "nearest" }));
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
      abrirDestinoDaUrl();
    } catch (error) {
      refs.menu.innerHTML = `<p class="admin-menu-loading">${escapeHtml(error.message)}</p>`;
      feedback(error, "error");
    }
  }

  function selecionarTabela(esquema, tabela, dominio, link) {
    if (state.ocupado) return;
    document.querySelectorAll(".admin-table-link.active").forEach((n) => n.classList.remove("active"));
    link?.classList.add("active");
    state.esquema = esquema; state.tabela = tabela; state.dominio = dominio;
    state.pagina = 1; state.selecao.clear(); state.editando = null;
    state.ordenar = null; state.direcao = "asc";
    state.filtro = { coluna: null, tipo: "valor", valor: null, inverter: false };
    state.valoresCache = {};
    const destino = new URL(window.location.href);
    destino.search = new URLSearchParams({ menu: dominio ? "__dominios__" : esquema, esquema, tabela }).toString();
    history.replaceState(null, "", destino);
    carregarTabela();
  }

  async function carregarTabela(notificar = true) {
    const revisao = ++revisaoTabela;
    refs.titulo.textContent = aliasTabela(state.tabela);
    document.title = `${aliasTabela(state.tabela)} — Administração`;
    refs.host.innerHTML = '<p class="admin-placeholder">Carregando registros…</p>';
    try {
      const q = new URLSearchParams({ pagina: state.pagina, por_pagina: POR_PAGINA });
      if (state.ordenar) { q.set("ordenar", state.ordenar); q.set("direcao", state.direcao); }
      const f = state.filtro;
      if (f.coluna && (f.tipo === "vazias" || f.valor != null)) {
        q.set("filtro_coluna", f.coluna);
        q.set("filtro_tipo", f.tipo);
        if (f.tipo !== "vazias" && f.valor != null) q.set("filtro_valor", f.valor);
        if (f.inverter) q.set("filtro_inverter", "true");
      }
      const data = await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}?${q}`);
      if (revisao !== revisaoTabela) return false;
      if (state.pagina > data.paginas) { state.pagina = data.paginas; return carregarTabela(notificar); }
      Object.assign(state, {
        colunas: data.colunas, chavePrimaria: data.chave_primaria,
        linhas: data.linhas, total: data.total, paginas: data.paginas, dominio: data.dominio,
        totalTabela: data.total_tabela ?? data.total,
        usuariosNomes: data.usuarios_nomes || {},
      });
      refs.sub.textContent = `${state.esquema}.${state.tabela} · ${data.total} registro(s) · chave primária: ${data.chave_primaria.join(", ") || "—"}`;
      renderTabela();
      return true;
    } catch (error) {
      if (revisao !== revisaoTabela) return false;
      refs.host.innerHTML = `<p class="admin-placeholder">${escapeHtml(error.message)}</p>`;
      if (notificar) feedback(error, "error");
      return false;
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
    const destino = `${state.esquema}/${state.tabela}`;
    try {
      const b = await jsonFetch(`${API}/tabelas/${destino}/valores?coluna=${encodeURIComponent(coluna)}`);
      if (destino === `${state.esquema}/${state.tabela}`) state.valoresCache[coluna] = b;
    } catch (error) {
      console.error("Falha ao carregar sugestões do filtro.", error);
      if (destino === `${state.esquema}/${state.tabela}`) {
        feedback("Não foi possível carregar as sugestões. Você pode digitar o valor, ou parte dele, para filtrar.", "warning");
      }
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
    const valInput = el("input", { type: "text", class: "admin-filter-val", "aria-label": "Valor do filtro",
      list: "admin-filter-suggestions", value: f.valor ?? "", autocomplete: "off",
      placeholder: f.coluna ? "Digite um valor ou parte dele" : "Selecione a coluna",
      title: "Busca por parte do valor, sem diferenciar maiúsculas de minúsculas. Pressione Enter ou saia do campo para aplicar.",
    });
    valInput.disabled = !f.coluna || f.tipo === "vazias";
    valInput.onchange = () => aoSelecionarValor(valInput.value);
    valInput.onkeydown = event => {
      if (event.key === "Enter") { event.preventDefault(); aoSelecionarValor(valInput.value); }
    };
    const sugestoes = el("datalist", {id: "admin-filter-suggestions"},
      ...(cache?.valores || []).map(valor => el("option", {value: valor})));
    const vazias = el("input", {type: "checkbox", class: "admin-filter-empty"});
    vazias.checked = f.tipo === "vazias";
    vazias.disabled = !f.coluna;
    vazias.onchange = () => {
      state.filtro.tipo = vazias.checked ? "vazias" : "contem";
      state.pagina = 1; state.selecao.clear(); carregarTabela();
    };

    const inverter = el("button", {
      class: "admin-icon-btn admin-filter-inv", type: "button", "aria-label": "Inverter seleção",
      "aria-pressed": String(f.inverter),
      title: f.inverter ? "Seleção invertida — clique para desativar" : "Inverter seleção",
      onclick: () => {
        const ativo = !state.filtro.inverter;
        inverter.setAttribute('aria-pressed', String(ativo));
        inverter.title = ativo ? 'Seleção invertida — clique para desativar' : 'Inverter seleção';
        aoInverter(ativo);
      },
    }, el("i", {class: "fa-solid fa-right-left", "aria-hidden": "true"}));

    const limpar = el("button", { class: "admin-icon-btn", type: "button", title: "Limpar filtros", "aria-label": "Limpar", onclick: limparFiltro }, el("i", {class: "fa-solid fa-filter-circle-xmark", "aria-hidden": "true"}));

    return el("div", { class: "admin-filter-bar" },
      el("span", { class: "admin-filter-label" }, "Filtro:"),
      colSelect, valInput, sugestoes,
      el("label", {class: "admin-filter-empty-label"}, vazias, "Vazias"),
      inverter, limpar,
      cache?.truncado ? el("span", {class: "admin-filter-hint"}, "Até 500 sugestões; a busca considera todos os registros.") : "");
  }
  async function aoSelecionarColuna(coluna) {
    const destino = `${state.esquema}/${state.tabela}`;
    state.filtro = { coluna: coluna || null, tipo: "contem", valor: null, inverter: state.filtro.inverter };
    if (coluna) await carregarValores(coluna);
    if (destino !== `${state.esquema}/${state.tabela}` || state.filtro.coluna !== (coluna || null)) return;
    state.pagina = 1; state.selecao.clear();
    await carregarTabela();
  }
  function aoSelecionarValor(valor) {
    if (!state.filtro.coluna) return;
    const novoValor = valor === "" ? null : valor;
    if (state.filtro.tipo === "contem" && state.filtro.valor === novoValor) return;
    state.filtro.tipo = "contem"; state.filtro.valor = novoValor;
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
    const table = el("table", { class: "admin-data-table", "data-tabela": state.tabela });

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
            if (
              state.esquema === "demandas" &&
              state.tabela === "projeto_geometria_historico" &&
              c.nome === "conteudo_binario" &&
              linha.id &&
              linha.conteudo_binario != null
            ) {
              td.append(
                el("a", {
                  class: "admin-download-file",
                  href: `${API}/tabelas/demandas/projeto_geometria_historico/${encodeURIComponent(linha.id)}/download`,
                  title: "Baixar arquivo vetorial original",
                  download: "",
                }, el("i", { class: "fa-solid fa-download", "aria-hidden": "true" }), "Baixar original"),
                el("span", { class: "admin-cell-binary-size" }, info.texto)
              );
            } else {
              if (state.tabela === "categoria_extracao_atributos" && c.nome === "conceito") {
                td.append(el("span", { class: "admin-cell-conceito", title: info.texto }, info.texto));
              } else {
                td.textContent = info.texto;
              }
            }
          }
          tr.append(td);
        }
      });
      tbody.append(tr);
    });
    table.append(tbody);
    wrap.append(table);

    refs.host.innerHTML = "";
    refs.host.append(montarFiltro(), wrap, montarAcoes(), el("div", {class: "admin-table-footer"}, montarPaginacao(), el("p", {class: "admin-table-summary", "aria-live": "polite"})));
    atualizarBotoes();
  }

  function campoEdicao(coluna, valor) {
    if (state.esquema === "dominios" && state.tabela === "categoria_extracao_atributos" && coluna.nome === "conceito") {
      return el("textarea", { "data-col": coluna.nome, rows: 5, "aria-label": "Conceito" }, valor ?? "");
    }
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
    const resumo = $(".admin-table-summary", refs.host);
    if (resumo) resumo.textContent = `${state.selecao.size} selecionados / ${state.linhas.length} na página / ${state.totalTabela} no total`;
    const btnEdit = $(".admin-icon-btn.edit", refs.host);
    const btnDel = $(".admin-icon-btn.delete", refs.host);
    if (btnEdit) btnEdit.disabled = state.ocupado || state.selecao.size !== 1 || !state.chavePrimaria.length;
    if (btnDel) btnDel.disabled = state.ocupado || state.selecao.size < 1 || !state.chavePrimaria.length;
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
    const prev = el("button", { type: "button", title: "Anterior", onclick: () => { if (state.pagina > 1) { state.pagina--; state.selecao.clear(); carregarTabela(); } } }, "<");
    const next = el("button", { type: "button", title: "Próxima", onclick: () => { if (state.pagina < state.paginas) { state.pagina++; state.selecao.clear(); carregarTabela(); } } }, ">");
    prev.disabled = state.pagina <= 1;
    next.disabled = state.pagina >= state.paginas;
    const first = el("button", { type: "button", title: "Primeira página", "aria-label": "Primeira página", onclick: () => { state.pagina = 1; state.selecao.clear(); carregarTabela(); } }, "<<");
    const last = el("button", { type: "button", title: "Última página", "aria-label": "Última página", onclick: () => { state.pagina = state.paginas; state.selecao.clear(); carregarTabela(); } }, ">>");
    first.disabled = prev.disabled;
    last.disabled = next.disabled;
    nav.append(first, prev, el("span", {}, `Página ${state.pagina} de ${state.paginas}`), next, last);
    return nav;
  }

  function iniciarEdicao() {
    if (state.selecao.size !== 1) return;
    state.editando = [...state.selecao.keys()][0];
    renderTabela();
  }

  async function salvarEdicao() {
    if (state.ocupado) return;
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
    ocupar(true);
    try {
      await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, valores }),
      });
      state.editando = null; state.selecao.clear();
      await atualizarAposEscrita("Registro atualizado com sucesso.");
    } catch (error) { feedback(error, "error"); }
    finally { ocupar(false); }
  }

  async function excluirSelecionados() {
    if (state.ocupado || !state.selecao.size) return;
    const qtd = state.selecao.size;
    const chaves = [...state.selecao.values()].map(chave => ({...chave}));
    const destino = `${API}/tabelas/${state.esquema}/${state.tabela}`;
    ocupar(true);
    try {
      if (!(await window.ProcessFeedback.confirmar({
        title: "Excluir Registros",
        message: `Excluir definitivamente ${qtd} registro(s) de ${aliasTabela(state.tabela)}?`,
        warning: "Esta ação não pode ser desfeita. Somente os registros selecionados serão enviados para exclusão; arquivos vinculados também poderão ser removidos.\n\n" +
          chaves.map(chave => Object.entries(chave).map(([nome, valor]) => `${aliasAmigavel(nome, state.tabela)}: ${valor}`).join(" · ")).join("\n"),
        confirmLabel: "Excluir", danger: true,
      }))) return;
      const r = await jsonFetch(destino, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chaves }),
      });
      if (!Number.isInteger(r.removidos) || r.removidos < 0 || r.removidos > qtd) {
        throw new Error("O servidor não confirmou quantos registros foram excluídos. Recarregue a lista antes de tentar novamente.");
      }
      state.selecao.clear();
      const extra = r.arquivos_removidos ? ` e ${r.arquivos_removidos} arquivo(s) em disco` : "";
      await atualizarAposEscrita(`${r.removidos} registro(s) excluído(s)${extra}.` +
        (r.removidos !== qtd ? " Alguns registros selecionados já não estavam disponíveis." : ""), r.removidos !== qtd);
    } catch (error) { feedback(error, "error"); }
    finally { ocupar(false); }
  }

  // ---------- Modal de inserção (tabelas de domínio) ----------
  function abrirModalInsercao() {
    if (state.ocupado) return;
    const editaveis = state.colunas.filter((c) => c.editavel);
    const corpo = el("div", { class: "admin-modal-body" });
    editaveis.forEach((c) => {
      let campo;
      if (state.esquema === "dominios" && state.tabela === "categoria_extracao_atributos" && c.nome === "conceito") {
        campo = campoEdicao(c, "");
      } else if (c.udt === "bool") {
        campo = el("select", { "data-col": c.nome }, el("option", { value: "" }, "—"), el("option", { value: "true" }, "Sim"), el("option", { value: "false" }, "Não"));
      } else {
        campo = el("input", { type: "text", "data-col": c.nome, placeholder: c.default ? `padrão: ${c.default}` : "" });
      }
      corpo.append(el("div", { class: "admin-field" },
        el("label", {}, aliasAmigavel(c.nome, state.tabela), el("small", {}, `${c.nome} · ${c.tipo}${c.nulo ? "" : " · obrigatório"}`)),
        campo));
    });
    const backdrop = el("div", { class: "admin-modal-backdrop" });
    const fechar = () => { if (!state.ocupado) backdrop.remove(); };
    const modal = el("div", { class: "admin-modal" },
      el("div", { class: "admin-modal-head" },
        el("i", { class: "fa-solid fa-plus", "aria-hidden": "true" }),
        el("h3", {}, `Adicionar em ${aliasTabela(state.tabela)}`),
        el("button", { class: "close", type: "button", "aria-label": "Fechar", onclick: fechar }, "×")),
      corpo,
      el("div", { class: "admin-modal-foot" },
        el("button", { class: "admin-btn", type: "button", onclick: fechar }, "Cancelar"),
        el("button", { class: "admin-btn primary", type: "button", onclick: () => enviarInsercao(corpo) }, "Inserir")));
    backdrop.append(modal);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) fechar(); });
    document.body.append(backdrop);
  }

  async function enviarInsercao(corpo) {
    if (state.ocupado) return;
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
    ocupar(true);
    const formulario = corpo.closest(".admin-modal-backdrop");
    formulario.inert = true;
    try {
      await jsonFetch(`${API}/tabelas/${state.esquema}/${state.tabela}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      formulario.remove();
      state.pagina = 1;
      state.selecao.clear();
      await atualizarAposEscrita("Registro inserido com sucesso.");
    } catch (error) { feedback(error, "error"); }
    finally { formulario.inert = false; ocupar(false); }
  }

  document.addEventListener("DOMContentLoaded", carregarMenu);
})();
