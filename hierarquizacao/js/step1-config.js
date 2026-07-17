(function () {
  "use strict";

  let configs = [];
  let selectedConfig = null;

  // --- Renderização da lista de configs ---
  function renderLista(cfgs) {
    const wrap = document.getElementById("cfg-lista");
    wrap.innerHTML = "";
    cfgs.forEach((cfg) => {
      const card = document.createElement("label");
      card.className = "ahp-selectable-card";
      card.dataset.codigo = cfg.codigo;
      const nCrit = (cfg.criterios || []).length;
      const rc = cfg.razao_consistencia != null ? (cfg.razao_consistencia * 100).toFixed(1) + "%" : "—";
      card.innerHTML = `
        <input type="radio" name="cfg-radio" value="${cfg.codigo}" style="margin-right:8px;">
        <div>
          <strong>${cfg.nome}</strong>
          <span class="badge badge--success" style="margin-left:8px;">Homologada</span>
          <div style="font-size:0.85em; color:var(--color-text-secondary, #666); margin-top:4px;">
            Código: <code>${cfg.codigo}</code> &nbsp;·&nbsp; ${nCrit} critério${nCrit !== 1 ? "s" : ""} &nbsp;·&nbsp; RC = ${rc}
          </div>
          ${cfg.descricao ? `<div style="font-size:0.85em; margin-top:2px;">${cfg.descricao}</div>` : ""}
        </div>
      `;
      card.addEventListener("change", () => selecionarConfig(cfg.codigo));
      wrap.appendChild(card);
    });
  }

  function selecionarConfig(codigo) {
    selectedConfig = configs.find((c) => c.codigo === codigo) || null;
    document.querySelectorAll(".ahp-selectable-card").forEach((el) => {
      el.classList.toggle("ahp-selectable-card--selected", el.dataset.codigo === codigo);
    });
    renderDetalhe(selectedConfig);
    atualizarBotao();
  }

  function renderDetalhe(cfg) {
    const wrap = document.getElementById("cfg-detalhe");
    if (!cfg) { wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");

    const pesos = cfg.pesos || {};
    const criteria = pesos.criteria || [];
    const weights = pesos.weights || [];
    const criterios = cfg.criterios || [];

    document.getElementById("cfg-detalhe-meta").textContent =
      `RC = ${cfg.razao_consistencia != null ? (cfg.razao_consistencia * 100).toFixed(2) + "%" : "—"} · λmax = ${cfg.lambda_max != null ? Number(cfg.lambda_max).toFixed(4) : "—"} · ${criterios.length} critério(s)`;

    const tbl = document.getElementById("cfg-criterios-table");
    if (!criteria.length) {
      tbl.innerHTML = "<p class='ahp-help-text'>Pesos não calculados para esta configuração.</p>";
      return;
    }
    let html = `<table class="ahp-table" style="width:100%;"><thead><tr><th>#</th><th>Critério</th><th>Dimensão</th><th>Peso</th><th>Peso (%)</th></tr></thead><tbody>`;
    criteria.forEach((crit, i) => {
      const w = weights[i] || 0;
      const meta = criterios.find((c) => (c.criterio || c.nome) === crit) || {};
      html += `<tr>
        <td>${i + 1}</td>
        <td>${crit}</td>
        <td>${meta.dimensao || "—"}</td>
        <td>${w.toFixed(4)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="background:var(--color-primary,#1a6aab); height:8px; border-radius:4px; width:${Math.round(w * 200)}px; min-width:2px;"></div>
            ${(w * 100).toFixed(1)}%
          </div>
        </td>
      </tr>`;
    });
    html += "</tbody></table>";
    tbl.innerHTML = html;
  }

  function atualizarBotao() {
    const nome = document.getElementById("inp-nome").value.trim();
    document.getElementById("btn-proximo").disabled = !selectedConfig || !nome;
  }

  // --- Submit ---
  async function criarEProsseguir() {
    const nome = document.getElementById("inp-nome").value.trim();
    const descricao = document.getElementById("inp-descricao").value.trim() || null;
    if (!nome || !selectedConfig) return;

    const btn = document.getElementById("btn-proximo");
    btn.disabled = true;
    btn.textContent = "Criando…";
    document.getElementById("submit-error").classList.add("hidden");

    try {
      const hier = await HierApi.criar({
        config_codigo: selectedConfig.codigo,
        nome,
        descricao,
        grupo_id: selectedConfig.grupo_comparacao || null,
      });
      localStorage.setItem("hier_codigo", hier.codigo);
      localStorage.setItem("hier_config_codigo", selectedConfig.codigo);
      window.location.href = `/restrict/hierarquizacao/processos/objetos/?codigo=${hier.codigo}`;
    } catch (err) {
      document.getElementById("submit-error").classList.remove("hidden");
      document.getElementById("submit-error-msg").textContent = err.message;
      btn.disabled = false;
      btn.innerHTML = 'Criar hierarquização e prosseguir <i class="fas fa-arrow-right" aria-hidden="true"></i>';
    }
  }

  // --- Init ---
  async function init() {
    document.getElementById("inp-nome").addEventListener("input", atualizarBotao);
    document.getElementById("btn-proximo").addEventListener("click", criarEProsseguir);

    try {
      const lista = await HierApi.listarConfigs({ status: "homologada" });
      document.getElementById("cfg-loading").classList.add("hidden");
      if (!lista || lista.length === 0) {
        document.getElementById("cfg-empty").classList.remove("hidden");
        return;
      }
      configs = lista;
      document.getElementById("cfg-lista").classList.remove("hidden");
      renderLista(lista);
    } catch (err) {
      document.getElementById("cfg-loading").classList.add("hidden");
      document.getElementById("cfg-error").classList.remove("hidden");
      document.getElementById("cfg-error-msg").textContent = err.message;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
