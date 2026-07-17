(function () {
  "use strict";

  const urlParams = new URLSearchParams(location.search);
  const hierCodigo = urlParams.get("codigo") || localStorage.getItem("hier_codigo");

  async function init() {
    if (!hierCodigo) { window.location.href = "/restrict/hierarquizacao/processos/nova/"; return; }

    document.getElementById("link-step2").href = `/restrict/hierarquizacao/processos/objetos/?codigo=${hierCodigo}`;
    document.getElementById("link-step3").href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
    document.getElementById("link-step4").href = `/restrict/hierarquizacao/processos/ranking/?codigo=${hierCodigo}`;
    document.getElementById("btn-voltar").href = `/restrict/hierarquizacao/processos/ranking/?codigo=${hierCodigo}`;

    try {
      const hier = await HierApi.obter(hierCodigo);
      document.getElementById("hom-loading").classList.add("hidden");

      if (!hier.ranking || !hier.ranking.length) {
        window.location.href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
        return;
      }

      renderMeta(hier);
      renderTop10(hier.ranking);
      document.getElementById("hom-section").classList.remove("hidden");
      document.getElementById("hom-actions").classList.remove("hidden");

      if (hier.status === "homologada") {
        marcarHomologada();
      } else {
        document.getElementById("btn-homologar").addEventListener("click", homologar);
      }
    } catch (err) {
      document.getElementById("hom-loading").classList.add("hidden");
      document.getElementById("hom-error").classList.remove("hidden");
      document.getElementById("hom-error-msg").textContent = err.message;
    }
  }

  function renderMeta(hier) {
    document.getElementById("hom-meta").innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:16px;">
        <div><span class="ahp-label">Código</span><br><code>${hier.codigo}</code></div>
        <div><span class="ahp-label">Nome</span><br>${hier.nome}</div>
        <div><span class="ahp-label">Config. multicritério</span><br><code>${hier.config_codigo || hier.config_id}</code></div>
        <div><span class="ahp-label">Objetos ranqueados</span><br>${(hier.ranking || []).length}</div>
        <div><span class="ahp-label">Status atual</span><br><span class="badge">${hier.status}</span></div>
      </div>
    `;
  }

  function renderTop10(ranking) {
    const top = ranking.slice(0, 10);
    let html = `<table class="ahp-table" style="width:100%;"><thead><tr>
      <th>Posição</th><th>Nome</th><th>Código</th><th>Score</th>
    </tr></thead><tbody>`;
    top.forEach((item) => {
      html += `<tr>
        <td><strong>${item.posicao}°</strong></td>
        <td>${item.nome}</td>
        <td><code>${item.codigo || "—"}</code></td>
        <td>${item.score.toFixed(4)}</td>
      </tr>`;
    });
    if (ranking.length > 10) {
      html += `<tr><td colspan="4" style="text-align:center; font-size:0.85em; color:var(--color-text-secondary,#666);">
        … e mais ${ranking.length - 10} objeto(s). Ver ranking completo na etapa 4.
      </td></tr>`;
    }
    html += "</tbody></table>";
    document.getElementById("hom-top10").innerHTML = html;
  }

  function marcarHomologada() {
    document.getElementById("hom-sucesso").classList.remove("hidden");
    const btn = document.getElementById("btn-homologar");
    btn.disabled = true;
    btn.textContent = "Já homologada";
    btn.classList.remove("btn--primary");
    btn.classList.add("btn--outline");
  }

  async function homologar() {
    const btn = document.getElementById("btn-homologar");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Homologando…';
    document.getElementById("submit-error").style.display = "none";

    try {
      await HierApi.homologar(hierCodigo);
      localStorage.removeItem("hier_codigo");
      localStorage.removeItem("hier_config_codigo");
      marcarHomologada();
    } catch (err) {
      document.getElementById("submit-error").classList.remove("hidden");
      document.getElementById("submit-error-msg").textContent = err.message;
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-stamp"></i> Confirmar homologação';
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
