/**
 * Etapa 6 — Priorização das alternativas/projetos.
 *
 * Fecha o ciclo AHP: usa os pesos dos critérios (etapas 1–4), julga as
 * alternativas par-a-par em cada critério (Saaty) e sintetiza o ranking
 * global. Persiste a análise via /api/ahp/analises.
 */
(function (global) {
  "use strict";

  const SAATY_VALUES = [
    { v: 1 / 9, label: "1/9" },
    { v: 1 / 7, label: "1/7" },
    { v: 1 / 5, label: "1/5" },
    { v: 1 / 3, label: "1/3" },
    { v: 1, label: "1" },
    { v: 3, label: "3" },
    { v: 5, label: "5" },
    { v: 7, label: "7" },
    { v: 9, label: "9" },
  ];

  const state = {
    tipo: "avulsa",
    criteria: [],
    criteriaWeights: [],
    criteriaCR: 0,
    alternatives: [],
    codigo: null,
    judged: false,
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function toast(msg, isError) {
    const el = $("#a6-toast");
    el.textContent = msg;
    el.className = "a6-toast show" + (isError ? " a6-toast--error" : "");
    setTimeout(() => (el.className = "a6-toast"), 4000);
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  function init() {
    state.tipo = localStorage.getItem("slt_ahp_tipo") || "avulsa";
    state.criteria = JSON.parse(localStorage.getItem("ahp_criteria") || "[]");
    const matrix = JSON.parse(localStorage.getItem("ahp_pairwiseMatrix") || "[]");
    if (!state.criteria.length || !matrix.length) {
      alert("Dados das etapas anteriores incompletos. Redirecionando...");
      window.location.href = "step2-criterios.html";
      return;
    }
    const r = global.SLTAhp.analyzeMatrix(matrix);
    state.criteriaWeights = r.weights;
    state.criteriaCR = r.CR;

    $("#a6-tipo-label").textContent =
      state.tipo === "portfolio" ? "Portfólio SLT (objetos AHP)" : "Avulsa (alternativas manuais)";
    renderCriteriaWeights();
    renderAlternativesSection();
    wireActions();
  }

  function renderCriteriaWeights() {
    const rows = state.criteria
      .map((c, i) => {
        const pct = (state.criteriaWeights[i] * 100).toFixed(2);
        return `<tr><td>${esc(c)}</td><td style="text-align:right;font-weight:700;">${pct}%</td>
          <td><div class="a6-bar"><div class="a6-bar__fill" style="width:${pct}%"></div></div></td></tr>`;
      })
      .join("");
    $("#a6-criterios").innerHTML =
      `<table class="ahp-matrix-table"><thead><tr><th>Critério</th><th>Peso</th><th>Gráfico</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<p class="field-help">Consistência dos critérios (CR): <strong>${(state.criteriaCR * 100).toFixed(1)}%</strong> ${
        state.criteriaCR < 0.1 ? "✓ aceitável" : "⚠ revise a Etapa 4"
      }</p>`;
  }

  // -------------------------------------------------------------------------
  // Fase 2 — origem das alternativas
  // -------------------------------------------------------------------------
  function renderAlternativesSection() {
    const host = $("#a6-alternativas");
    if (state.tipo === "portfolio") {
      host.innerHTML = `
        <p class="field-help">Carregue os projetos já aprovados (objetos AHP) e selecione os que entram nesta rodada. Requer login de gestor no Admin.</p>
        <div class="a6-row">
          <input type="text" id="a6-grupo" placeholder="Grupo de comparação (ex.: PLANO-PLI|FRENTE-01) — deixe vazio para listar todos">
          <button type="button" class="btn btn-secondary" id="a6-load-objetos"><i class="fas fa-download"></i> Carregar projetos</button>
        </div>
        <div id="a6-objetos-list" class="a6-objetos"></div>`;
      $("#a6-load-objetos").addEventListener("click", carregarObjetos);
    } else {
      host.innerHTML = `
        <p class="field-help">Cadastre as alternativas (fenômenos/projetos) que serão comparadas.</p>
        <div class="a6-row">
          <input type="text" id="a6-alt-nome" placeholder="Nome da alternativa">
          <button type="button" class="btn btn-secondary" id="a6-add-alt"><i class="fas fa-plus"></i> Adicionar</button>
        </div>
        <ul id="a6-alt-list" class="a6-alt-list"></ul>`;
      $("#a6-add-alt").addEventListener("click", addAlternativaManual);
      $("#a6-alt-nome").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addAlternativaManual();
        }
      });
    }
    renderAlternativeList();
  }

  function addAlternativaManual() {
    const input = $("#a6-alt-nome");
    const nome = input.value.trim();
    if (nome.length < 2) {
      toast("Informe um nome com ao menos 2 caracteres.", true);
      return;
    }
    if (state.alternatives.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) {
      toast("Alternativa já adicionada.", true);
      return;
    }
    state.alternatives.push({ nome });
    input.value = "";
    state.judged = false;
    renderAlternativeList();
  }

  async function carregarObjetos() {
    const grupo = $("#a6-grupo").value.trim();
    const listHost = $("#a6-objetos-list");
    listHost.innerHTML = '<p class="field-help">Carregando…</p>';
    try {
      const params = { status: "hierarq_apta" };
      if (grupo) params.grupo = grupo;
      const objetos = await global.SLTAnaliseApi.listarObjetos(params);
      if (!objetos.length) {
        listHost.innerHTML = '<p class="field-help">Nenhum objeto AHP elegível encontrado para o filtro.</p>';
        return;
      }
      listHost.innerHTML = objetos
        .map(
          (o) => `<label class="a6-objeto"><input type="checkbox" value="${esc(o.codigo)}"
            data-nome="${esc(o.nome)}" data-id="${esc(o.id)}" data-grupo="${esc(o.grupo_comparacao)}">
            <span><strong>${esc(o.codigo)}</strong> — ${esc(o.nome)}<br>
            <small class="field-help">${esc(o.grupo_comparacao)}</small></span></label>`
        )
        .join("");
      listHost.querySelectorAll('input[type="checkbox"]').forEach((cb) =>
        cb.addEventListener("change", syncObjetosSelecionados)
      );
    } catch (err) {
      if (err.status === 401) {
        listHost.innerHTML =
          '<p class="a6-warn">É necessário estar autenticado como gestor para carregar projetos do portfólio. Faça login em <a href="../admin/">Admin</a> e volte.</p>';
      } else {
        listHost.innerHTML = `<p class="a6-warn">${esc(err.message)}</p>`;
      }
    }
  }

  function syncObjetosSelecionados() {
    const checks = Array.from(document.querySelectorAll('#a6-objetos-list input:checked'));
    state.alternatives = checks.map((c) => ({
      nome: c.dataset.nome,
      codigo: c.value,
      objeto_ahp_id: c.dataset.id,
      grupo_comparacao: c.dataset.grupo,
    }));
    state.judged = false;
    renderAlternativeList();
  }

  function renderAlternativeList() {
    const host = $("#a6-alt-list");
    if (host) {
      host.innerHTML = state.alternatives
        .map(
          (a, i) =>
            `<li><span>${esc(a.nome)}</span><button type="button" class="a6-del" data-i="${i}" title="Remover"><i class="fas fa-times"></i></button></li>`
        )
        .join("");
      host.querySelectorAll(".a6-del").forEach((b) =>
        b.addEventListener("click", () => {
          state.alternatives.splice(Number(b.dataset.i), 1);
          state.judged = false;
          renderAlternativeList();
        })
      );
    }
    $("#a6-alt-count").textContent = state.alternatives.length;
    $("#a6-judge-btn").disabled = state.alternatives.length < 2;
  }

  // -------------------------------------------------------------------------
  // Fase 3 — julgamento das alternativas por critério (Saaty)
  // -------------------------------------------------------------------------
  function buildJudgment() {
    if (state.alternatives.length < 2) {
      toast("Adicione ao menos 2 alternativas.", true);
      return;
    }
    const host = $("#a6-julgamento");
    let html = `<p class="field-help">Para cada critério, compare as alternativas par a par. As células recíprocas são preenchidas automaticamente.</p>`;
    state.criteria.forEach((crit, c) => {
      html += `<div class="a6-crit-block">
        <h4><span class="a6-crit-badge">${(state.criteriaWeights[c] * 100).toFixed(1)}%</span> ${esc(crit)}</h4>
        ${matrixHtml(c)}
        <p class="a6-cr" id="a6-cr-${c}"></p>
      </div>`;
    });
    host.innerHTML = html;
    host.querySelectorAll("select").forEach((sel) =>
      sel.addEventListener("change", onJudgeChange)
    );
    state.criteria.forEach((_, c) => updateCriterionCR(c));
    state.judged = true;
    $("#a6-calc-btn").disabled = false;
    host.scrollIntoView({ behavior: "smooth" });
  }

  function optionsHtml() {
    return SAATY_VALUES.map(
      (o) => `<option value="${o.v}"${o.v === 1 ? " selected" : ""}>${o.label}</option>`
    ).join("");
  }

  function matrixHtml(c) {
    const alts = state.alternatives;
    let h = '<div style="overflow-x:auto;"><table class="ahp-matrix-table"><thead><tr><th></th>';
    alts.forEach((a) => (h += `<th>${esc(a.nome)}</th>`));
    h += "</tr></thead><tbody>";
    for (let i = 0; i < alts.length; i++) {
      h += `<tr><th>${esc(alts[i].nome)}</th>`;
      for (let j = 0; j < alts.length; j++) {
        if (i === j) h += "<td><strong>1</strong></td>";
        else if (i < j)
          h += `<td><select data-c="${c}" data-i="${i}" data-j="${j}">${optionsHtml()}</select></td>`;
        else h += `<td id="a6r_${c}_${i}_${j}" class="a6-recip">1.0000</td>`;
      }
      h += "</tr>";
    }
    h += "</tbody></table></div>";
    return h;
  }

  function onJudgeChange(e) {
    const s = e.target;
    const c = s.dataset.c,
      i = s.dataset.i,
      j = s.dataset.j;
    const val = parseFloat(s.value);
    const cell = document.getElementById(`a6r_${c}_${j}_${i}`);
    if (cell) cell.textContent = (1 / val).toFixed(4);
    updateCriterionCR(Number(c));
  }

  function readMatrix(c) {
    const n = state.alternatives.length;
    return global.SLTAhp.matrixFromUpper(n, (i, j) => {
      const sel = document.querySelector(`select[data-c="${c}"][data-i="${i}"][data-j="${j}"]`);
      return sel ? parseFloat(sel.value) : 1;
    });
  }

  function updateCriterionCR(c) {
    const m = readMatrix(c);
    const r = global.SLTAhp.analyzeMatrix(m);
    const el = document.getElementById(`a6-cr-${c}`);
    if (!el) return;
    const ok = r.CR < 0.1;
    el.innerHTML = `Consistência (CR): <strong>${(r.CR * 100).toFixed(1)}%</strong> ${
      ok ? "✓" : "⚠ revise"
    }`;
    el.className = "a6-cr " + (ok ? "a6-cr--ok" : "a6-cr--bad");
  }

  // -------------------------------------------------------------------------
  // Fase 4 — cálculo, ranking e persistência
  // -------------------------------------------------------------------------
  function localByCriterion() {
    return state.criteria.map((_, c) => global.SLTAhp.priorityVector(readMatrix(c)));
  }

  function previewRanking() {
    const local = localByCriterion();
    const { scores, order } = global.SLTAhp.synthesize(state.criteriaWeights, local);
    renderRanking(
      order.map((idx, pos) => ({
        posicao: pos + 1,
        nome: state.alternatives[idx].nome,
        codigo: state.alternatives[idx].codigo,
        score: scores[idx],
      }))
    );
  }

  function renderRanking(ranking) {
    const host = $("#a6-ranking");
    const max = Math.max(...ranking.map((r) => r.score), 0.0001);
    const rows = ranking
      .map((r) => {
        const pct = (r.score * 100).toFixed(2);
        const w = ((r.score / max) * 100).toFixed(1);
        const medal = r.posicao === 1 ? "a6-rank--gold" : r.posicao <= 3 ? "a6-rank--top" : "";
        return `<tr class="${medal}"><td style="text-align:center;font-weight:800;">${r.posicao}º</td>
          <td><strong>${esc(r.nome)}</strong>${r.codigo ? ` <small class="field-help">${esc(r.codigo)}</small>` : ""}</td>
          <td style="text-align:right;font-weight:700;">${pct}%</td>
          <td><div class="a6-bar"><div class="a6-bar__fill" style="width:${w}%"></div></div></td></tr>`;
      })
      .join("");
    host.innerHTML = `<table class="ahp-matrix-table"><thead><tr><th>#</th><th>Alternativa</th><th>Score</th><th>Gráfico</th></tr></thead><tbody>${rows}</tbody></table>`;
    $("#a6-ranking-card").classList.remove("hidden");
    $("#a6-save-btn").disabled = false;
    host.scrollIntoView({ behavior: "smooth" });
  }

  function buildPayloadJulgamentos() {
    const itemNames = state.alternatives.map((a) => a.nome);
    return {
      criterios: state.criteria.map((c) => ({ criterio: c })),
      criterios_selecionados: state.criteria,
      julgamento_criterios: {
        criteria: state.criteria,
        matrix: JSON.parse(localStorage.getItem("ahp_pairwiseMatrix") || "[]"),
      },
      itens: state.alternatives,
      julgamento_itens: state.criteria.map((crit, c) => ({
        criterio: crit,
        criteria: itemNames,
        matrix: readMatrix(c),
      })),
    };
  }

  async function saveAndCalculate() {
    try {
      $("#a6-save-btn").disabled = true;
      if (!state.codigo) {
        const titulo =
          $("#a6-titulo").value.trim() ||
          `Análise ${state.tipo} ${new Date().toLocaleDateString("pt-BR")}`;
        const createPayload = { tipo: state.tipo, titulo };
        if (state.tipo === "portfolio") {
          createPayload.grupo_comparacao =
            state.alternatives[0]?.grupo_comparacao || $("#a6-grupo")?.value.trim() || "GERAL";
        }
        const created = await global.SLTAnaliseApi.criar(createPayload);
        state.codigo = created.codigo;
      }
      await global.SLTAnaliseApi.atualizar(state.tipo, state.codigo, buildPayloadJulgamentos());
      const calc = await global.SLTAnaliseApi.calcular(state.tipo, state.codigo);
      if (calc.ranking) renderRanking(calc.ranking);
      $("#a6-homolog-btn").disabled = false;
      $("#a6-codigo-label").textContent = state.codigo;
      $("#a6-saved-info").classList.remove("hidden");
      toast("Análise salva e calculada no servidor: " + state.codigo);
    } catch (err) {
      if (err.status === 503) {
        toast("Banco SLT indisponível. Cálculo local exibido; salve quando o banco voltar.", true);
        previewRanking();
      } else {
        toast(err.message || "Falha ao salvar.", true);
      }
      $("#a6-save-btn").disabled = false;
    }
  }

  async function homologar() {
    if (!state.codigo) return;
    try {
      $("#a6-homolog-btn").disabled = true;
      await global.SLTAnaliseApi.homologar(state.tipo, state.codigo);
      toast("Análise homologada com sucesso.");
      $("#a6-homolog-status").textContent = "HOMOLOGADA";
      $("#a6-homolog-status").classList.remove("hidden");
    } catch (err) {
      if (err.status === 401) {
        toast("Homologação exige login de gestor (Admin).", true);
      } else {
        toast(err.message || "Falha ao homologar.", true);
      }
      $("#a6-homolog-btn").disabled = false;
    }
  }

  function wireActions() {
    $("#a6-judge-btn").addEventListener("click", buildJudgment);
    $("#a6-calc-btn").addEventListener("click", previewRanking);
    $("#a6-save-btn").addEventListener("click", saveAndCalculate);
    $("#a6-homolog-btn").addEventListener("click", homologar);
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
