(function () {
  "use strict";

  const urlParams = new URLSearchParams(location.search);
  const hierCodigo = urlParams.get("codigo") || localStorage.getItem("hier_codigo");

  async function init() {
    if (!hierCodigo) { window.location.href = "/restrict/hierarquizacao/processos/nova/"; return; }

    document.getElementById("link-step2").href = `/restrict/hierarquizacao/processos/objetos/?codigo=${hierCodigo}`;
    document.getElementById("link-step3").href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
    document.getElementById("btn-voltar").href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
    document.getElementById("btn-homologar").href = `/restrict/hierarquizacao/processos/homologacao/?codigo=${hierCodigo}`;

    try {
      const hier = await HierApi.obter(hierCodigo);

      document.getElementById("rank-loading").classList.add("hidden");

      // Se não calculada ainda, voltar
      if (!hier.ranking || !hier.ranking.length) {
        window.location.href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
        return;
      }

      renderMeta(hier);
      renderRanking(hier.ranking);
      renderPesos(hier);

      document.getElementById("rank-section").classList.remove("hidden");
      document.getElementById("rank-result-section").classList.remove("hidden");
      document.getElementById("rank-pesos-section").classList.remove("hidden");
      document.getElementById("rank-actions").classList.remove("hidden");

      // Se homologada, desabilita botão de homologar
      if (hier.status === "homologada") {
        const btn = document.getElementById("btn-homologar");
        btn.textContent = "Já homologada";
        btn.classList.remove("btn--primary");
        btn.classList.add("btn--outline");
        btn.removeAttribute("href");
      }
    } catch (err) {
      document.getElementById("rank-loading").classList.add("hidden");
      document.getElementById("rank-error").classList.remove("hidden");
      document.getElementById("rank-error-msg").textContent = err.message;
    }
  }

  function renderMeta(hier) {
    const homologadoEm = hier.homologadoEm
      ? new Date(hier.homologadoEm).toLocaleDateString("pt-BR") : null;
    document.getElementById("rank-meta").innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:16px;">
        <div><span class="ahp-label">Código</span><br><code>${hier.codigo}</code></div>
        <div><span class="ahp-label">Nome</span><br>${hier.nome}</div>
        <div><span class="ahp-label">Config. multicritério</span><br><code>${hier.config_codigo || hier.config_id}</code></div>
        <div><span class="ahp-label">Objetos ranqueados</span><br>${(hier.ranking || []).length}</div>
        <div><span class="ahp-label">Status</span><br><span class="badge">${hier.status}</span></div>
        ${homologadoEm ? `<div><span class="ahp-label">Homologado em</span><br>${homologadoEm}</div>` : ""}
      </div>
    `;
  }

  function renderRanking(ranking) {
    const maxScore = ranking.length ? ranking[0].score : 1;
    const wrap = document.getElementById("rank-list");
    wrap.innerHTML = "";

    ranking.forEach((item) => {
      const pct = maxScore > 0 ? (item.score / maxScore) * 100 : 0;
      const posClass = item.posicao <= 3 ? ` rank-pos--${item.posicao}` : "";
      const barClass = item.posicao <= 3 ? ` rank-bar--${item.posicao}` : "";
      const div = document.createElement("div");
      div.className = "rank-row";
      div.innerHTML = `
        <div class="rank-pos${posClass}">${item.posicao}°</div>
        <div class="rank-nome">
          <strong>${item.nome}</strong>
          ${item.codigo ? `<small>${item.codigo}</small>` : ""}
        </div>
        <div class="rank-bar-wrap">
          <div class="rank-bar${barClass}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="rank-score">
          <strong>${item.score.toFixed(4)}</strong>
        </div>
      `;
      wrap.appendChild(div);
    });
  }

  function renderPesos(hier) {
    const pesos = hier.pesos_projetos || {};
    const porCriterio = pesos.por_criterio || {};
    const itens = pesos.itens || [];
    const criterios = Object.keys(porCriterio);
    if (!criterios.length) return;

    let html = `<table class="ahp-table" style="width:100%;">
      <thead><tr>
        <th>Critério</th>
        ${itens.map((n) => `<th style="font-size:0.8em;">${n}</th>`).join("")}
      </tr></thead><tbody>`;

    criterios.forEach((crit) => {
      const ws = porCriterio[crit] || [];
      html += `<tr><td><strong>${crit}</strong></td>${ws.map((w) => `<td>${(w * 100).toFixed(1)}%</td>`).join("")}</tr>`;
    });

    html += "</tbody></table>";
    document.getElementById("rank-pesos-table").innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
