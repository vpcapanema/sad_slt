(function () {
  "use strict";

  const TIPO_KEY = "slt_ahp_tipo";
  const DRAFT_KEY = "slt_ahp_config_draft";
  const CONFIG_KEY = "slt_ahp_config_atual";
  const API = "/api";

  const form = document.getElementById("form-tipo-analise");
  const cards = document.querySelectorAll(".ahp-tipo-card");
  const nomeInput = document.getElementById("config-nome");
  const descInput = document.getElementById("config-descricao");
  // Comboboxes (select + campo "Outro") criados na inicialização.
  let areaCombo, temaCombo, fenomenoCombo;
  const portfolioSection = document.getElementById("portfolio-section");
  const tipoDemandaSel = document.getElementById("config-tipo-demanda");
  const filtrosWrap = document.getElementById("portfolio-filtros");
  const addFiltroBtn = document.getElementById("add-filtro");
  const logicosWrap = document.getElementById("filtros-logicos");
  const addLogicoBtn = document.getElementById("add-logico");
  const resumoWrap = document.getElementById("amostra-resumo");
  const previewText = document.getElementById("portfolio-preview-text");

  // Biblioteca de sugestões para orientar a construção do escopo, do geral ao
  // específico: área do conhecimento -> tema -> fenômeno -> objetivo.
  // São apenas pontos de partida — o usuário pode digitar livremente.
  const SUGESTOES_AREA = [
    "Logística e transporte",
    "Mobilidade urbana",
    "Infraestrutura",
    "Planejamento territorial",
    "Meio ambiente e sustentabilidade",
    "Saneamento",
    "Gestão de riscos e desastres",
  ];

  // Tema = aspecto sob o qual as alternativas são avaliadas (entra após "à").
  const SUGESTOES_TEMA = [
    "Execução",
    "Implantação",
    "Operação",
    "Manutenção",
    "Planejamento",
    "Priorização",
    "Investimento",
  ];

  const SUGESTOES_FENOMENO = [
    "Favorabilidade",
    "Aptidão",
    "Viabilidade",
    "Vulnerabilidade",
    "Suscetibilidade",
    "Prioridade",
    "Risco",
    "Impacto",
  ];

  function preencherSelect(sel, valores) {
    if (!sel) return;
    sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
    valores.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  // Combobox: lista suspensa que já serve os valores da biblioteca + "Outro (digitar)".
  function makeCombo(selectId, customId, valores) {
    const sel = document.getElementById(selectId);
    const cust = document.getElementById(customId);
    preencherSelect(sel, valores);
    const outro = document.createElement("option");
    outro.value = "__outro__";
    outro.textContent = "Outro (digitar)…";
    sel.appendChild(outro);

    function sync() {
      cust.classList.toggle("is-hidden", sel.value !== "__outro__");
    }
    sel.addEventListener("change", function () {
      sync();
      if (sel.value === "__outro__") cust.focus();
      onEscopoChange();
    });
    cust.addEventListener("input", onEscopoChange);

    return {
      get() {
        return (sel.value === "__outro__" ? cust.value : sel.value).trim();
      },
      set(v) {
        v = v || "";
        const has = Array.prototype.some.call(
          sel.options,
          (o) => o.value === v && o.value !== "__outro__"
        );
        if (v && has) {
          sel.value = v;
          cust.value = "";
        } else if (v) {
          sel.value = "__outro__";
          cust.value = v;
        } else {
          sel.value = "";
          cust.value = "";
        }
        sync();
      },
      focus() {
        sel.focus();
      },
    };
  }

  function lcFirst(s) {
    return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }

  function ucFirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // Nome (plural simples) da alternativa, vindo do tipo de demanda do portfólio.
  // Ex.: "Projeto" -> "Projetos". É o objeto hierarquizado.
  function alternativaNome() {
    const found = state.tiposDemanda.find(
      (t) => String(t.id) === String(tipoDemandaSel.value)
    );
    if (!found || !found.nome) return "";
    const n = found.nome.trim();
    return /s$/i.test(n) ? n : n + "s";
  }

  // O escopo é uma frase DESCRITIVA, liderada pelo fenômeno (a vedete): mede-se a
  // favorabilidade DOS PROJETOS (alternativas) à execução (tema/aspecto), dentro
  // de uma área. Padrão: {Fenômeno} de {Alternativas} de {Área} à {Tema}.
  // Ex.: "Favorabilidade de Projetos de Logística e transporte à execução."
  // O objetivo (verbo + objeto + contexto) é o goal e será definido depois.
  function comporTitulo() {
    const fen = fenomenoCombo ? fenomenoCombo.get() : "";
    const tema = temaCombo ? temaCombo.get() : "";
    const area = areaCombo ? areaCombo.get() : "";
    const alt = tipoSelecionado() === "portfolio" ? alternativaNome() : "";

    let titulo = fen || "";
    if (alt) titulo += (titulo ? " de " : "") + alt;
    if (area) titulo += (titulo ? " de " : "") + area;
    if (tema) titulo += (titulo ? " à " : "") + lcFirst(tema);

    nomeInput.value = ucFirst(titulo.trim());
  }

  const state = {
    tiposDemanda: [], // [{id, codigo, nome}]
    diretorias: [], // [{id, nome}]
    planos: [], // [{id, nome, diretoria_id}]
    programas: [], // [{id, nome, plano_id}]
    demandas: [], // universo do tipo atual (colunas ricas)
    campos: [], // metadados dos campos: [{campo, rotulo, tipo:'data'|'texto'}]
    subconjunto: [], // filtro simples: [{campo, valor}] ou {campo, de, ate} (data)
    logicos: [], // filtros lógicos: [{conector, campo, operador, valor}] ou data com de/ate
  };

  const OPERADORES = [
    { value: "eq", label: "igual a" },
    { value: "ne", label: "diferente de" },
    { value: "contains", label: "contém" },
  ];

  function tipoSelecionado() {
    const sel = form.querySelector('input[name="tipo_analise"]:checked');
    return sel ? sel.value : null;
  }

  function tipoDemandaCodigo() {
    const id = tipoDemandaSel.value;
    const found = state.tiposDemanda.find((t) => String(t.id) === String(id));
    return found ? found.codigo : null;
  }

  async function apiGet(path) {
    const res = await fetch(API + path, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Falha ao carregar " + path + " (" + res.status + ")");
    return res.json();
  }

  function syncCards() {
    cards.forEach((card) => {
      const input = card.querySelector('input[type="radio"]');
      card.classList.toggle("selected", input.checked);
    });
  }

  function saveDraft() {
    const draft = {
      nome: nomeInput.value,
      area_conhecimento: areaCombo ? areaCombo.get() : "",
      tema: temaCombo ? temaCombo.get() : "",
      fenomeno: fenomenoCombo ? fenomenoCombo.get() : "",
      descricao: descInput.value,
      tipo: tipoSelecionado(),
      tipo_demanda_id: tipoDemandaSel.value || null,
      subconjunto: state.subconjunto,
      logicos: state.logicos,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      /* ignore */
    }
  }

  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function togglePortfolio() {
    const isPortfolio = tipoSelecionado() === "portfolio";
    portfolioSection.classList.toggle("is-hidden", !isPortfolio);
  }

  // Campos disponíveis para estratificar (ricos, vindos do backend).
  function camposDisponiveis() {
    return state.campos;
  }

  function campoTipo(campo) {
    const c = state.campos.find((x) => x.campo === campo);
    return c ? c.tipo : "texto";
  }

  function rotuloValor(campo, val) {
    if (campo === "diretoria_id") {
      const d = state.diretorias.find((x) => String(x.id) === String(val));
      return d ? d.nome : val;
    }
    if (campo === "plano_id") {
      const p = state.planos.find((x) => String(x.id) === String(val));
      return p ? p.nome : val;
    }
    if (campo === "programa_id") {
      const p = state.programas.find((x) => String(x.id) === String(val));
      return p ? p.nome : val;
    }
    return val;
  }

  // Valores distintos presentes no universo carregado para um dado campo.
  function valoresDe(campo) {
    const set = new Set();
    state.demandas.forEach((d) => {
      const v = d[campo];
      if (v !== null && v !== undefined && v !== "") set.add(String(v));
    });
    return Array.from(set)
      .map((v) => ({ value: v, label: String(rotuloValor(campo, v)) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }

  function makeOption(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  // Célula de valor: select único, ou dois date inputs (período) para campo data.
  function valorCell(cond, onChange) {
    const cell = document.createElement("div");
    cell.className = "ahp-valor-cell";
    if (cond.campo && campoTipo(cond.campo) === "data") {
      const de = document.createElement("input");
      de.type = "date";
      de.className = "c-form-control";
      de.value = cond.de || "";
      de.title = "De";
      const ate = document.createElement("input");
      ate.type = "date";
      ate.className = "c-form-control";
      ate.value = cond.ate || "";
      ate.title = "Até";
      de.addEventListener("change", function () {
        cond.de = de.value || "";
        onChange();
      });
      ate.addEventListener("change", function () {
        cond.ate = ate.value || "";
        onChange();
      });
      cell.classList.add("ahp-valor-cell--data");
      cell.appendChild(de);
      cell.appendChild(ate);
    } else {
      const sel = document.createElement("select");
      sel.className = "c-form-control";
      sel.appendChild(makeOption("", "Selecione o valor correspondente ao campo…"));
      let conhecido = false;
      if (cond.campo) {
        valoresDe(cond.campo).forEach((v) => {
          sel.appendChild(makeOption(v.value, v.label));
          if (String(v.value) === String(cond.valor)) conhecido = true;
        });
      }
      sel.appendChild(makeOption("__outro__", "Outro (digitar)…"));
      sel.disabled = !cond.campo;

      const custom = document.createElement("input");
      custom.type = "text";
      custom.className = "c-form-control";
      custom.placeholder = "Digite o valor";
      const ehOutro = !!cond.valor && !conhecido;
      custom.classList.toggle("is-hidden", !ehOutro);
      if (ehOutro) custom.value = cond.valor;
      sel.value = ehOutro ? "__outro__" : cond.valor || "";

      sel.addEventListener("change", function () {
        if (sel.value === "__outro__") {
          custom.classList.remove("is-hidden");
          cond.valor = custom.value || "";
          custom.focus();
        } else {
          custom.classList.add("is-hidden");
          cond.valor = sel.value || "";
        }
        onChange();
      });
      custom.addEventListener("input", function () {
        cond.valor = custom.value || "";
        onChange();
      });
      cell.appendChild(sel);
      cell.appendChild(custom);
    }
    return cell;
  }

  function tipoDemandaNome() {
    const f = state.tiposDemanda.find((t) => String(t.id) === String(tipoDemandaSel.value));
    return f ? f.nome.toLowerCase() : "demanda";
  }

  function campoSelect(valorAtual) {
    const sel = document.createElement("select");
    sel.className = "c-form-control";
    sel.appendChild(
      makeOption("", "Selecione o atributo de " + tipoDemandaNome() + " que deseja filtrar…")
    );
    camposDisponiveis().forEach((c) => sel.appendChild(makeOption(c.campo, c.rotulo)));
    sel.value = valorAtual || "";
    return sel;
  }

  // Cabeçalho de colunas (rótulos) para uma grade de filtros.
  function headerRow(rotulos, classe) {
    const head = document.createElement("div");
    head.className = classe + " ahp-filtro-head";
    rotulos.forEach((r) => {
      const span = document.createElement("span");
      span.textContent = r;
      head.appendChild(span);
    });
    return head;
  }

  function removeButton(titulo, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-icon ahp-filtro-remove";
    btn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
    btn.title = titulo;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderFiltros() {
    filtrosWrap.innerHTML = "";
    if (!tipoDemandaCodigo()) return;
    if (state.subconjunto.length === 0) state.subconjunto.push({ campo: "" });

    filtrosWrap.appendChild(headerRow(["Campo", "Valor", ""], "ahp-filtro-row"));

    state.subconjunto.forEach((filtro, idx) => {
      const row = document.createElement("div");
      row.className = "ahp-filtro-row";

      const campoSel = campoSelect(filtro.campo);
      campoSel.addEventListener("change", function () {
        state.subconjunto[idx] = { campo: campoSel.value || "" };
        renderFiltros();
        saveDraft();
        atualizarPreview();
      });

      const cell = valorCell(filtro, function () {
        saveDraft();
        atualizarPreview();
      });

      const removeBtn = removeButton("Remover filtro", function () {
        state.subconjunto.splice(idx, 1);
        renderFiltros();
        saveDraft();
        atualizarPreview();
      });

      row.appendChild(campoSel);
      row.appendChild(cell);
      row.appendChild(removeBtn);
      filtrosWrap.appendChild(row);
    });
  }

  // ---- Filtros lógicos (operadores booleanos E/OU + operador por condição) ----
  function renderLogicos() {
    logicosWrap.innerHTML = "";
    if (!tipoDemandaCodigo()) return;
    if (state.logicos.length > 0) {
      logicosWrap.appendChild(
        headerRow(["", "Campo", "Operador", "Valor", ""], "ahp-logico-row")
      );
    }

    state.logicos.forEach((cond, idx) => {
      const row = document.createElement("div");
      row.className = "ahp-logico-row";

      if (idx > 0) {
        const conSel = document.createElement("select");
        conSel.className = "c-form-control ahp-conector";
        conSel.appendChild(makeOption("and", "E"));
        conSel.appendChild(makeOption("or", "OU"));
        conSel.value = cond.conector || "and";
        conSel.addEventListener("change", function () {
          state.logicos[idx].conector = conSel.value;
          saveDraft();
          atualizarPreview();
        });
        row.appendChild(conSel);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "ahp-conector ahp-conector-fixo";
        spacer.textContent = "Onde";
        row.appendChild(spacer);
      }

      const campoSel = campoSelect(cond.campo);

      const isData = cond.campo && campoTipo(cond.campo) === "data";
      const opSel = document.createElement("select");
      opSel.className = "c-form-control";
      OPERADORES.forEach((o) => opSel.appendChild(makeOption(o.value, o.label)));
      opSel.value = cond.operador || "eq";
      if (isData) {
        opSel.disabled = true; // data usa período (de/até)
      }

      const cell = valorCell(cond, function () {
        saveDraft();
        atualizarPreview();
      });

      campoSel.addEventListener("change", function () {
        state.logicos[idx] = {
          conector: cond.conector || "and",
          campo: campoSel.value || "",
          operador: "eq",
        };
        renderLogicos();
        saveDraft();
        atualizarPreview();
      });
      opSel.addEventListener("change", function () {
        state.logicos[idx].operador = opSel.value;
        saveDraft();
        atualizarPreview();
      });
      const removeBtn = removeButton("Remover condição", function () {
        state.logicos.splice(idx, 1);
        renderLogicos();
        saveDraft();
        atualizarPreview();
      });

      row.appendChild(campoSel);
      row.appendChild(opSel);
      row.appendChild(cell);
      row.appendChild(removeBtn);
      logicosWrap.appendChild(row);
    });
  }

  function _toDate(v) {
    if (!v) return null;
    const d = new Date(String(v).slice(0, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function matchData(value, de, ate) {
    if (!de && !ate) return true;
    const v = _toDate(value);
    if (!v) return false;
    if (de) {
      const dd = _toDate(de);
      if (dd && v < dd) return false;
    }
    if (ate) {
      const da = _toDate(ate);
      if (da && v > da) return false;
    }
    return true;
  }

  // Avalia uma condição (com operador) — usada nos filtros lógicos.
  function matchCondicao(d, cond) {
    if (!cond.campo) return true;
    if (campoTipo(cond.campo) === "data") return matchData(d[cond.campo], cond.de, cond.ate);
    if (!cond.valor) return true;
    const v = d[cond.campo];
    if (cond.operador === "ne") return String(v) !== String(cond.valor);
    if (cond.operador === "contains") {
      return String(v == null ? "" : v).toLowerCase().includes(String(cond.valor).toLowerCase());
    }
    return String(v) === String(cond.valor); // eq (padrão)
  }

  function matchLogicos(d) {
    if (state.logicos.length === 0) return true;
    let acc = null;
    state.logicos.forEach((cond, i) => {
      const r = matchCondicao(d, cond);
      if (i === 0) acc = r;
      else acc = cond.conector === "or" ? acc || r : acc && r;
    });
    return acc === null ? true : acc;
  }

  // Filtro simples: igualdade (texto) ou período (data), combinados por E.
  function matchSimples(d) {
    return state.subconjunto.every((f) => {
      if (!f.campo) return true;
      if (campoTipo(f.campo) === "data") return matchData(d[f.campo], f.de, f.ate);
      return !f.valor || String(d[f.campo]) === String(f.valor);
    });
  }

  // Amostra final = filtro simples (E) combinado com filtros lógicos.
  function amostraFiltrada() {
    return state.demandas.filter((d) => matchSimples(d) && matchLogicos(d));
  }

  // ---- Resumo: tabela com os registros filtrados ----
  const RESUMO_MAX = 50;

  function colunasResumo() {
    const cols = [
      { campo: "codigo", rotulo: "Código" },
      { campo: "nome", rotulo: "Nome" },
      { campo: "status", rotulo: "Status" },
    ];
    camposDisponiveis().forEach((c) => {
      if (c.campo !== "status") cols.push(c);
    });
    return cols;
  }

  function renderResumo() {
    if (!resumoWrap) return;
    resumoWrap.innerHTML = "";
    const codigo = tipoDemandaCodigo();
    if (!codigo) return;
    const linhas = amostraFiltrada();
    if (linhas.length === 0) {
      resumoWrap.innerHTML = '<p class="ahp-page-desc">Nenhum registro com os filtros atuais.</p>';
      return;
    }
    const cols = colunasResumo();
    const table = document.createElement("table");
    table.className = "ahp-resumo-table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c.rotulo;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    linhas.slice(0, RESUMO_MAX).forEach((d) => {
      const tr = document.createElement("tr");
      cols.forEach((c) => {
        const td = document.createElement("td");
        const raw = d[c.campo];
        td.textContent =
          raw == null || raw === "" ? "—" : String(rotuloValor(c.campo, raw));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resumoWrap.appendChild(table);

    if (linhas.length > RESUMO_MAX) {
      const more = document.createElement("p");
      more.className = "ahp-page-desc";
      more.textContent =
        "Exibindo " + RESUMO_MAX + " de " + linhas.length + " registros.";
      resumoWrap.appendChild(more);
    }
  }

  function atualizarPreview() {
    const codigo = tipoDemandaCodigo();
    if (!codigo) {
      previewText.textContent = "Selecione o tipo de demanda para ver o universo.";
      if (resumoWrap) resumoWrap.innerHTML = "";
      return;
    }
    const n = amostraFiltrada().length;
    previewText.textContent =
      n + " demanda(s) elegível(is) no universo com os filtros atuais.";
    renderResumo();
  }

  // Carrega o universo (população) real do tipo selecionado para servir os
  // valores dos filtros e calcular a amostra localmente.
  async function carregarDemandas() {
    const codigo = tipoDemandaCodigo();
    if (!codigo) {
      state.demandas = [];
      state.campos = [];
      return;
    }
    try {
      const [itens, campos] = await Promise.all([
        apiGet("/ahp/universo/" + codigo),
        apiGet("/ahp/universo/" + codigo + "/campos"),
      ]);
      state.demandas = Array.isArray(itens) ? itens : [];
      state.campos = Array.isArray(campos) ? campos : [];
    } catch (e) {
      state.demandas = [];
      state.campos = [];
    }
    // Fallback: se os metadados não vierem, deriva os campos do próprio universo.
    if (state.campos.length === 0 && state.demandas.length > 0) {
      state.campos = Object.keys(state.demandas[0])
        .filter((k) => k !== "id" && k !== "grupo_id" && k !== "tipo_demanda")
        .map((k) => ({
          campo: k,
          rotulo: k,
          tipo: /(_em|_inicio|_fim|data|vigencia)/.test(k) ? "data" : "texto",
        }));
    }
  }

  async function carregarDominios() {
    try {
      state.tiposDemanda = await apiGet("/dominios/tipo-demanda");
      tipoDemandaSel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
      state.tiposDemanda.forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.nome;
        o.dataset.codigo = t.codigo;
        tipoDemandaSel.appendChild(o);
      });
    } catch (e) {
      /* mantém apenas o placeholder */
    }
  }

  async function carregarFontesPortfolio() {
    try {
      await window.SLTCatalog.loadCatalog("../");
      const cat = window.SLTCatalog.catalog || {};
      state.diretorias = window.SLTCatalog.ativos(cat.diretorias).map((d) => ({
        id: d.id,
        nome: d.nome || d.sigla || d.id,
      }));
    } catch (e) {
      state.diretorias = [];
    }
    try {
      const planos = await apiGet("/planos");
      state.planos = (planos || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        diretoria_id: p.diretoria_id || null,
      }));
    } catch (e) {
      state.planos = [];
    }
    try {
      const programas = await apiGet("/programas");
      state.programas = (programas || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        plano_id: p.plano_id || null,
      }));
    } catch (e) {
      state.programas = [];
    }
  }

  async function prefill() {
    const draft = loadDraft();
    if (draft.nome) nomeInput.value = draft.nome;
    if (areaCombo) areaCombo.set(draft.area_conhecimento);
    if (temaCombo) temaCombo.set(draft.tema);
    if (fenomenoCombo) fenomenoCombo.set(draft.fenomeno);
    if (draft.descricao) descInput.value = draft.descricao;
    const tipo = draft.tipo || localStorage.getItem(TIPO_KEY);
    if (tipo === "avulsa" || tipo === "portfolio") {
      const input = form.querySelector('input[value="' + tipo + '"]');
      if (input) input.checked = true;
    }
    if (Array.isArray(draft.subconjunto)) {
      state.subconjunto = draft.subconjunto;
    }
    if (Array.isArray(draft.logicos)) {
      state.logicos = draft.logicos;
    }
    syncCards();
    togglePortfolio();
    if (draft.tipo_demanda_id) {
      tipoDemandaSel.value = draft.tipo_demanda_id;
      await carregarDemandas();
    }
    renderFiltros();
    renderLogicos();
    if (tipoSelecionado() === "portfolio") atualizarPreview();
  }

  cards.forEach((card) => {
    card.addEventListener("click", function () {
      const input = card.querySelector('input[type="radio"]');
      input.checked = true;
      syncCards();
      togglePortfolio();
      comporTitulo();
      saveDraft();
      if (tipoSelecionado() === "portfolio") atualizarPreview();
    });
  });

  tipoDemandaSel.addEventListener("change", async function () {
    // Trocar o nível reinicia a amostra (campos/valores mudam por tipo).
    state.subconjunto = [];
    state.logicos = [];
    comporTitulo();
    saveDraft();
    await carregarDemandas();
    renderFiltros();
    renderLogicos();
    atualizarPreview();
  });

  if (addFiltroBtn) {
    addFiltroBtn.addEventListener("click", function () {
      state.subconjunto.push({ campo: "", valor: "" });
      renderFiltros();
      saveDraft();
    });
  }

  if (addLogicoBtn) {
    addLogicoBtn.addEventListener("click", function () {
      state.logicos.push({ conector: "and", campo: "", operador: "eq", valor: "" });
      renderLogicos();
      saveDraft();
    });
  }

  function onEscopoChange() {
    comporTitulo();
    saveDraft();
  }
  descInput.addEventListener("input", saveDraft);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const tipo = tipoSelecionado();
    if (!tipo) {
      alert("Selecione o tipo de análise para continuar.");
      return;
    }
    comporTitulo();
    const nome = nomeInput.value.trim();
    if (!nome) {
      alert("Preencha os campos do escopo (área, tema e/ou fenômeno) para gerar o título.");
      if (areaCombo) areaCombo.focus();
      return;
    }

    const payload = {
      tipo: tipo,
      nome: nome,
      area_conhecimento: (areaCombo ? areaCombo.get() : "") || null,
      tema: (temaCombo ? temaCombo.get() : "") || null,
      fenomeno: (fenomenoCombo ? fenomenoCombo.get() : "") || null,
      descricao: descInput.value.trim() || null,
    };

    if (tipo === "portfolio") {
      const codigo = tipoDemandaCodigo();
      if (!codigo) {
        alert("Selecione o tipo de demanda do portfólio.");
        tipoDemandaSel.focus();
        return;
      }
      payload.tipo_demanda = codigo;

      // Filtros válidos (campo e valor preenchidos).
      const filtros = state.subconjunto.filter((f) => f.campo && f.valor);
      const logicos = state.logicos.filter((f) => f.campo && f.valor);
      if (filtros.length === 0 && logicos.length === 0) {
        alert("Adicione ao menos um filtro (campo e valor) no universo amostral.");
        return;
      }

      // Recorte do universo gravado como JSON único (configuração dos campos).
      payload.subconjunto = {
        tipo_demanda: codigo,
        filtros: filtros,
        logicos: logicos,
      };
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const created = await window.SLTConfigApi.criar(payload);
      localStorage.setItem(TIPO_KEY, tipo);
      localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({ tipo: created.tipo, codigo: created.codigo })
      );
      saveDraft();
      window.location.href = "step1-criterios.html";
    } catch (err) {
      alert("Não foi possível criar a configuração: " + (err && err.message ? err.message : err));
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Inicialização
  (async function init() {
    areaCombo = makeCombo("config-area", "config-area-custom", SUGESTOES_AREA);
    temaCombo = makeCombo("config-tema", "config-tema-custom", SUGESTOES_TEMA);
    fenomenoCombo = makeCombo("config-fenomeno", "config-fenomeno-custom", SUGESTOES_FENOMENO);
    await Promise.all([carregarDominios(), carregarFontesPortfolio()]);
    await prefill();
    comporTitulo();
  })();
})();
