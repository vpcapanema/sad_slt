(function () {
  "use strict";

  const urlParams = new URLSearchParams(location.search);
  const hierCodigo = urlParams.get("codigo") || localStorage.getItem("hier_codigo");

  let hierData = null;
  let configData = null;
  let criteria = [];    // [{key, nome, dimensao, peso}]
  let objetos = [];     // [{codigo, nome, ...}]
  let scores = {};      // {criterio_key: {obj_idx: value}}
  let tabAtiva = 0;

  const storageKey = () => `hier_scores_${hierCodigo}`;

  // --- Persistência local ---
  function salvarLocal() {
    localStorage.setItem(storageKey(), JSON.stringify(scores));
  }

  function carregarLocal() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) scores = JSON.parse(raw);
    } catch (_) { scores = {}; }
  }

  // --- Progressão ---
  function criterioPronto(key) {
    const s = scores[key] || {};
    return objetos.every((_, i) => s[String(i)] !== undefined && s[String(i)] !== "");
  }

  function atualizarProgresso() {
    const prontos = criteria.filter((c) => criterioPronto(c.key)).length;
    document.getElementById("aval-progresso-badge").textContent =
      `${prontos} / ${criteria.length} critérios preenchidos`;
    document.getElementById("btn-calcular").disabled = prontos < criteria.length;

    // Atualiza badge dos tabs
    criteria.forEach((c, i) => {
      const btn = document.getElementById(`tab-btn-${i}`);
      if (!btn) return;
      btn.classList.toggle("done", criterioPronto(c.key));
    });
  }

  // --- Tabs ---
  function ativarTab(idx) {
    tabAtiva = idx;
    document.querySelectorAll(".aval-tab-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
    document.querySelectorAll(".aval-panel").forEach((p, i) => p.classList.toggle("active", i === idx));
  }

  // --- Renderização ---
  function renderUI() {
    const tabsEl = document.getElementById("aval-tabs");
    const panelsEl = document.getElementById("aval-panels");
    tabsEl.innerHTML = "";
    panelsEl.innerHTML = "";

    criteria.forEach((crit, ci) => {
      // Tab button
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "aval-tab-btn" + (ci === 0 ? " active" : "");
      btn.id = `tab-btn-${ci}`;
      btn.title = crit.dimensao || "";
      btn.textContent = crit.nome;
      btn.addEventListener("click", () => ativarTab(ci));
      tabsEl.appendChild(btn);

      // Panel
      const panel = document.createElement("div");
      panel.className = "aval-panel" + (ci === 0 ? " active" : "");
      panel.id = `panel-${ci}`;

      const header = document.createElement("div");
      header.style.cssText = "margin-bottom:10px;";
      header.innerHTML = `
        <strong>${crit.nome}</strong>
        ${crit.dimensao ? `<span class="badge" style="margin-left:6px;">${crit.dimensao}</span>` : ""}
        <span style="margin-left:10px; font-size:0.85em; color:var(--color-text-secondary,#666);">
          Peso: <strong>${(crit.peso * 100).toFixed(1)}%</strong>
        </span>
        <div style="font-size:0.82em; color:var(--color-text-secondary,#888); margin-top:3px;">
          Pontuação de 0 a 10. Valores maiores = melhor desempenho neste critério.
        </div>
      `;
      panel.appendChild(header);

      objetos.forEach((obj, oi) => {
        const row = document.createElement("div");
        row.className = "aval-score-row";
        const currentVal = (scores[crit.key] || {})[String(oi)] ?? "";
        row.innerHTML = `
          <span class="aval-score-nome" title="${obj.nome}">${obj.nome}</span>
          <input type="number" class="aval-score-input" min="0" max="10" step="0.1"
            value="${currentVal}" placeholder="0–10"
            data-crit="${crit.key}" data-obj="${oi}">
          <div class="aval-score-bar-wrap">
            <div class="aval-score-bar" id="bar-${ci}-${oi}"
              style="width:${currentVal !== "" ? Math.max(0, Math.min(10, Number(currentVal))) * 10 : 0}%"></div>
          </div>
          <span style="font-size:0.82em; width:30px; text-align:right;" id="lbl-${ci}-${oi}">${currentVal !== "" ? currentVal : "—"}</span>
        `;
        panel.appendChild(row);
      });

      panelsEl.appendChild(panel);
    });

    // Listeners dos inputs
    panelsEl.querySelectorAll(".aval-score-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const key = e.target.dataset.crit;
        const oi = e.target.dataset.obj;
        const ci = criteria.findIndex((c) => c.key === key);
        let val = e.target.value;
        if (val !== "") {
          val = Math.max(0, Math.min(10, parseFloat(val) || 0));
          e.target.value = val;
        }
        if (!scores[key]) scores[key] = {};
        scores[key][String(oi)] = val === "" ? "" : val;
        const pct = val !== "" ? val * 10 : 0;
        document.getElementById(`bar-${ci}-${oi}`).style.width = pct + "%";
        document.getElementById(`lbl-${ci}-${oi}`).textContent = val !== "" ? val : "—";
        salvarLocal();
        atualizarProgresso();
      });
    });

    document.getElementById("aval-section").classList.remove("hidden");
    document.getElementById("aval-actions").classList.remove("hidden");
    atualizarProgresso();
  }

  // --- Construir julgamentos ---
  function buildJulgamentos() {
    return criteria.map((crit) => ({
      criterio: crit.key,
      criterio_nome: crit.nome,
      scores: scores[crit.key] || {},
    }));
  }

  // --- Salvar rascunho ---
  async function salvarRascunho() {
    const btn = document.getElementById("btn-salvar");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando…';
    try {
      await HierApi.atualizar(hierCodigo, { julgamento_projetos: buildJulgamentos() });
      btn.textContent = "Salvo!";
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar rascunho';
      }, 1500);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar rascunho';
      document.getElementById("submit-error").classList.remove("hidden");
      document.getElementById("submit-error-msg").textContent = err.message;
    }
  }

  // --- Calcular ranking ---
  async function calcularRanking() {
    const btn = document.getElementById("btn-calcular");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando…';
    document.getElementById("submit-error").style.display = "none";
    try {
      // Salva julgamentos primeiro
      await HierApi.atualizar(hierCodigo, { julgamento_projetos: buildJulgamentos() });
      // Dispara cálculo
      await HierApi.calcular(hierCodigo);
      localStorage.removeItem(storageKey());
      window.location.href = `step4-ranking.html?codigo=${hierCodigo}`;
    } catch (err) {
      document.getElementById("submit-error").classList.remove("hidden");
      document.getElementById("submit-error-msg").textContent = err.message;
      btn.disabled = false;
      btn.innerHTML = 'Calcular ranking <i class="fas fa-arrow-right"></i>';
    }
  }

  // --- Init ---
  async function init() {
    if (!hierCodigo) { window.location.href = "step1-config.html"; return; }

    carregarLocal();

    document.getElementById("btn-salvar").addEventListener("click", salvarRascunho);
    document.getElementById("btn-calcular").addEventListener("click", calcularRanking);
    document.getElementById("btn-voltar").href = `step2-objetos.html?codigo=${hierCodigo}`;
    document.getElementById("link-step2").href = `step2-objetos.html?codigo=${hierCodigo}`;

    try {
      hierData = await HierApi.obter(hierCodigo);
      objetos = hierData.objetos || [];

      configData = await HierApi.obterConfig(hierData.config_codigo);
      const pesos = configData.pesos || {};
      const criteriaKeys = pesos.criteria || [];
      const weights = pesos.weights || [];
      const metaCriterios = configData.criterios || [];

      criteria = criteriaKeys.map((key, i) => {
        const meta = metaCriterios.find((c) => (c.criterio || c.nome) === key) || {};
        return { key, nome: key, dimensao: meta.dimensao || "", peso: weights[i] || 0 };
      });

      // Se já há julgamentos salvos na API, preenche scores
      if (hierData.julgamento_projetos && hierData.julgamento_projetos.length && !Object.keys(scores).length) {
        hierData.julgamento_projetos.forEach((j) => {
          if (j.scores) scores[j.criterio] = j.scores;
        });
      }

      document.getElementById("aval-loading").classList.add("hidden");
      renderUI();
    } catch (err) {
      document.getElementById("aval-loading").classList.add("hidden");
      document.getElementById("aval-error").classList.remove("hidden");
      document.getElementById("aval-error-msg").textContent = err.message;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
