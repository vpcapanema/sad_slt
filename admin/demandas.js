(function () {
  const { escapeHtml, formatDate, statusDemandaLabel, instituicaoLabel, planoLabel,
    classificacaoLabel, fillSelect, statusBadgeClass } = SLTAdminLabels;

  let demandas = [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function filteredDemandas() {
    const status = $("#filtro-status").value;
    const q = ($("#filtro-busca").value || "").trim().toLowerCase();
    return demandas.filter((d) => {
      if (status && d.status !== status) return false;
      if (!q) return true;
      const hay = [
        d.id, d.nome, instituicaoLabel(d), planoLabel(d.plano_id),
        classificacaoLabel(d.classificacao, d.plano_id),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function renderTable() {
    const rows = filteredDemandas();
    const tbody = $("#tabela-demandas");
    const vazia = $("#lista-vazia");
    if (!rows.length) {
      tbody.innerHTML = "";
      vazia.classList.remove("hidden");
      return;
    }
    vazia.classList.add("hidden");
    tbody.innerHTML = rows.map((d) => `
      <tr data-codigo="${escapeHtml(d.id)}">
        <td><code>${escapeHtml(d.id)}</code></td>
        <td>${escapeHtml(d.nome)}</td>
        <td>${escapeHtml(instituicaoLabel(d))}</td>
        <td>${escapeHtml(planoLabel(d.plano_id))}</td>
        <td>${escapeHtml(classificacaoLabel(d.classificacao, d.plano_id))}</td>
        <td><span class="${statusBadgeClass(d.status)}">${escapeHtml(statusDemandaLabel(d.status))}</span></td>
        <td>${escapeHtml(formatDate(d.criadoEm))}</td>
      </tr>`).join("");
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        location.href = `demanda.html?id=${encodeURIComponent(tr.dataset.codigo)}`;
      });
    });
  }

  function fillStatusFilter() {
    const sel = $("#filtro-status");
    SLTAdminLabels.statusDemanda.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.nome;
      sel.appendChild(opt);
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    fillStatusFilter();
    demandas = await SLTAdminApi.listDemandas();
    $("#filtro-status").addEventListener("change", renderTable);
    $("#filtro-busca").addEventListener("input", renderTable);
    renderTable();
  }

  init().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    SLTAdminUi.showToast(err.message, true);
  });
})();
