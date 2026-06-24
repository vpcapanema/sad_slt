(function () {
  const { escapeHtml, formatDate, statusObjetoLabel, grupoComparacaoLabel,
    fillSelect, statusBadgeClass } = SLTAdminLabels;

  let objetos = [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function filteredObjetos() {
    const status = $("#filtro-status").value;
    const q = ($("#filtro-busca").value || "").trim().toLowerCase();
    return objetos.filter((o) => {
      if (status && o.status !== status) return false;
      if (!q) return true;
      const hay = [
        o.codigo, o.nome, o.demanda_codigo, o.instituicao_nome,
        grupoComparacaoLabel(o.grupo_comparacao, o.plano_id),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function renderTable() {
    const rows = filteredObjetos();
    const tbody = $("#tabela-objetos");
    const vazia = $("#lista-vazia");
    if (!rows.length) {
      tbody.innerHTML = "";
      vazia.classList.remove("hidden");
      return;
    }
    vazia.classList.add("hidden");
    tbody.innerHTML = rows.map((o) => `
      <tr data-codigo="${escapeHtml(o.codigo)}">
        <td><code>${escapeHtml(o.codigo)}</code></td>
        <td>${escapeHtml(o.nome)}</td>
        <td>${escapeHtml(o.demanda_codigo)}</td>
        <td>${escapeHtml(o.instituicao_nome || "—")}</td>
        <td>${escapeHtml(grupoComparacaoLabel(o.grupo_comparacao, o.plano_id))}</td>
        <td><span class="${statusBadgeClass(o.status)}">${escapeHtml(statusObjetoLabel(o.status))}</span></td>
        <td>${escapeHtml(formatDate(o.aprovadoEm))}</td>
      </tr>`).join("");
    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        location.href = `objeto.html?id=${encodeURIComponent(tr.dataset.codigo)}`;
      });
    });
  }

  function fillStatusFilter() {
    SLTAdminLabels.statusObjeto.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.codigo;
      opt.textContent = s.nome;
      $("#filtro-status").appendChild(opt);
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    fillStatusFilter();
    objetos = await SLTAdminApi.listObjetosAhp();
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
