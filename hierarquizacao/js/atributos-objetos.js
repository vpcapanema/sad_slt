/* Componente "Atributos dos objetos de demanda" (Fase 3).
   Popula a tabela a partir de uma hierarquização: colunas estáticas (cadastro) +
   colunas dinâmicas (Etapa 3 da matriz, via endpoint) e uma linha por objeto. */
(function (global) {
  "use strict";

  const API_COLUNAS = (codigo) =>
    `/api/ahp/atributos-objetos/hierarquizacoes/${encodeURIComponent(codigo)}/colunas`;

  const fmtMoeda = (v) =>
    v == null ? null : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtData = (v) => {
    if (!v) return null;
    const d = String(v).slice(0, 10).split("-");
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(v);
  };
  function prazoMeses(ini, fim) {
    if (!ini || !fim) return null;
    const a = new Date(ini), b = new Date(fim);
    if (isNaN(a) || isNaN(b)) return null;
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  // Colunas ESTÁTICAS (etapa cadastral: "Vigência e recursos"). Somente leitura.
  const ESTATICAS = [
    { id: "vigencia_inicio", grupo: "estatica", alias: "Vigência início", unidade: "data", relacao_simbolo: "", valor: (a) => fmtData(a.vigencia_inicio) },
    { id: "vigencia_fim", grupo: "estatica", alias: "Vigência fim", unidade: "data", relacao_simbolo: "", valor: (a) => fmtData(a.vigencia_fim) },
    { id: "prazo_meses", grupo: "estatica", alias: "Prazo de vigência", unidade: "meses", relacao_simbolo: "↓", valor: (a) => { const m = prazoMeses(a.vigencia_inicio, a.vigencia_fim); return m == null ? null : String(m); } },
    { id: "valor_global", grupo: "estatica", alias: "Valor global", unidade: "R$", relacao_simbolo: "", valor: (a) => fmtMoeda(a.valor_global ?? a.complementos?.valor_estimado) },
  ];

  // Lê um valor numérico herdado da Fase 1 do objeto (estrutura tolerante).
  function fase1Valor(obj, chave) {
    const f1 = obj?.hierarquizacao?.fase_1 || {};
    const src = f1.atributos || f1.riscos || {};
    const v = src[chave];
    return typeof v === "number" ? v : null;
  }

  // ---------------------------------------------------------------------------
  // Preenchimento híbrido por atributo (CONJUNTO MUTÁVEL — edite só este mapa).
  //   origem "cadastro" -> valor intrínseco do cadastro (read-only)
  //   origem "fase1"    -> herdado da Fase 1 (sugestão editável, quando houver)
  //   ausente/"gestor"  -> preenchido manualmente pelo gestor (default)
  // Chave = id (slug) da coluna dinâmica.
  // ---------------------------------------------------------------------------
  const PREENCHIMENTO = {
    capex_custo_de_investimento: { origem: "cadastro", valor: (a) => a.valor_global ?? a.complementos?.valor_estimado ?? null },
    prazo_de_implantacao: { origem: "cadastro", valor: (a) => prazoMeses(a.vigencia_inicio, a.vigencia_fim) },
    risco_de_execucao: { origem: "fase1", valor: (a, o) => fase1Valor(o, "risco_execucao") },
    risco_de_demanda: { origem: "fase1", valor: (a, o) => fase1Valor(o, "risco_demanda") },
    desapropriacoes_e_interferencias: { origem: "fase1", valor: (a, o) => fase1Valor(o, "desapropriacao") },
    interdependencia_pre_requisitos: { origem: "fase1", valor: (a, o) => fase1Valor(o, "interdependencia") },
  };

  function el(sel) { return document.querySelector(sel); }

  async function getColunas(codigo) {
    const res = await fetch(API_COLUNAS(codigo), { credentials: "same-origin" });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && (body.detail || body.message)) || `HTTP ${res.status}`);
    return body.colunas || [];
  }

  function limpar(root) {
    const theadRow = root.querySelector("[data-atributos-thead] tr");
    [...theadRow.querySelectorAll("th.col-atributo")].forEach((th) => th.remove());
    root.querySelector("[data-atributos-tbody]").innerHTML = "";
    root.querySelector("[data-atributos-sem-colunas]").hidden = true;
    root.querySelector("[data-atributos-sem-linhas]").hidden = true;
    root.querySelector("[data-atributos-erro]").hidden = true;
  }

  function montarColunas(root, colunas) {
    const theadRow = root.querySelector("[data-atributos-thead] tr");
    const tpl = root.querySelector("#tpl-atributo-coluna");
    for (const col of colunas) {
      const estatica = col.grupo === "estatica";
      const th = tpl.content.firstElementChild.cloneNode(true);
      th.classList.add(estatica ? "col-estatica" : "col-dinamica");
      th.dataset.colId = col.id;
      th.dataset.tipo = col.tipo || "texto";
      th.dataset.unidade = col.unidade || "";
      th.dataset.relacao = col.relacao || "";
      th.dataset.mandatorio = col.mandatorio ? "1" : "";
      th.querySelector(".col-atributo-grupo").textContent = estatica ? "Cadastro" : "Matriz · Etapa 3";
      const alias = th.querySelector(".col-atributo-alias");
      alias.textContent = col.alias || col.variavel || "Atributo";
      alias.title = col.variavel || col.criterio || col.alias || "";
      th.querySelector(".col-atributo-unidade").textContent = col.unidade ? `(${col.unidade})` : "";
      th.querySelector(".col-atributo-relacao").textContent = col.relacao_simbolo || "";
      th.querySelector(".col-atributo-mandatorio").hidden = !col.mandatorio;
      theadRow.appendChild(th);
    }
  }

  function montarLinhas(root, objetos, colunas) {
    const tbody = root.querySelector("[data-atributos-tbody]");
    const tplLin = root.querySelector("#tpl-atributo-linha");
    const tplCel = root.querySelector("#tpl-atributo-celula");
    for (const obj of objetos) {
      const cab = obj.cabecalho_objeto || obj;
      const tr = tplLin.content.firstElementChild.cloneNode(true);
      tr.dataset.objetoId = cab.codigo || "";
      tr.querySelector(".objeto-codigo").textContent = cab.codigo || "—";
      tr.querySelector(".objeto-nome").textContent = cab.nome || "";
      const t = tr.querySelector(".objeto-tipo");
      if (cab.tipo_demanda) { t.textContent = cab.tipo_demanda; t.hidden = false; }
      const atributos = cab.atributos || {};
      for (const col of colunas) {
        if (col.grupo === "estatica") {
          const td = document.createElement("td");
          td.className = "col-estatica-valor";
          td.dataset.colId = col.id;
          const v = col.valor(atributos);
          if (v == null || v === "") { td.textContent = "—"; td.classList.add("is-vazio"); }
          else td.textContent = v;
          tr.appendChild(td);
          continue;
        }
        const td = tplCel.content.firstElementChild.cloneNode(true);
        td.dataset.colId = col.id;
        let input = td.querySelector(`.atributo-input--${col.tipo}`);
        if (!input) input = td.querySelector(".atributo-input--texto");
        input.hidden = false;

        // valor e origem: prioriza os slots criados na criação (atributos_fase3);
        // fallback à config de preenchimento (hierarquizações antigas sem slots).
        const af3 = cab.atributos_fase3 || {};
        const slot = af3[col.id];
        let valor = null;
        let origem = "gestor";
        if (slot && typeof slot === "object") {
          valor = slot.valor;
          origem = slot.origem || "gestor";
        } else {
          const cfg = PREENCHIMENTO[col.id] || { origem: "gestor" };
          try { valor = cfg.valor ? cfg.valor(atributos, obj) : null; } catch (_) { valor = null; }
          origem = cfg.origem || "gestor";
        }
        if (valor != null && valor !== "") {
          input.value = String(valor);
          if (origem === "cadastro") { input.readOnly = true; input.classList.add("atributo-input--sistema"); td.classList.add("is-sistema"); }
          else { input.classList.add("atributo-input--sugerido"); td.classList.add("is-sugerido"); }
          td.classList.add("is-preenchido");
        } else {
          td.classList.add("is-pendente");
          if (col.mandatorio) td.classList.add("is-obrigatorio");
        }

        // captura: grava a edição de volta no slot em memória do objeto
        if (!input.readOnly) {
          input.addEventListener("change", () => {
            const store = cab.atributos_fase3 || (cab.atributos_fase3 = {});
            const s = store[col.id] || (store[col.id] = {
              origem: "gestor", criterio: col.criterio, unidade: col.unidade,
              tipo: col.tipo, relacao: col.relacao, mandatorio: col.mandatorio,
            });
            s.valor = input.value === "" ? null : input.value;
            const preenchido = input.value !== "";
            td.classList.toggle("is-preenchido", preenchido);
            td.classList.toggle("is-pendente", !preenchido);
          });
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  async function render(hierarquizacao) {
    const root = el("[data-atributos-objetos]");
    if (!root) return;
    limpar(root);
    if (!hierarquizacao || !hierarquizacao.codigo) return;
    try {
      const dinamicas = await getColunas(hierarquizacao.codigo);
      const objetos = hierarquizacao.dados_hierarquizacao?.objetos || [];
      const todas = [...ESTATICAS, ...dinamicas];
      montarColunas(root, todas);
      if (!dinamicas.length) root.querySelector("[data-atributos-sem-colunas]").hidden = false;
      if (!objetos.length) root.querySelector("[data-atributos-sem-linhas]").hidden = false;
      else montarLinhas(root, objetos, todas);
    } catch (err) {
      const erroEl = root.querySelector("[data-atributos-erro]");
      erroEl.textContent = `Não foi possível carregar os atributos: ${err.message}`;
      erroEl.hidden = false;
    }
  }

  // Coleta os valores atuais dos slots (em memória) no formato do endpoint de persistência.
  function coletar(hierarquizacao) {
    const objetos = hierarquizacao?.dados_hierarquizacao?.objetos || [];
    const valores = {};
    for (const obj of objetos) {
      const cab = obj.cabecalho_objeto || {};
      const cod = cab.codigo;
      const af3 = cab.atributos_fase3 || {};
      if (!cod) continue;
      const mapa = {};
      for (const [colId, slot] of Object.entries(af3)) {
        if (slot && typeof slot === "object") mapa[colId] = slot.valor ?? null;
      }
      valores[cod] = mapa;
    }
    return { valores };
  }

  global.AtributosObjetos = { render, coletar };
})(window);