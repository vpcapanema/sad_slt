(function () {
  "use strict";

  var PAGE_SIZE = 15;
  var julgamentos = [];
  var hierarquizacoes = [];
  var draftEmails = [];
  var currentPage = 1;
  var selectedId = null;
  var modo = new URLSearchParams(location.search).get("modo") || "julgamentos";
  var prefixMatch = location.pathname.match(/^(.*?)\/restrict\//);
  var appPrefix = prefixMatch ? prefixMatch[1] : "";
  var hierarquizacoesSourceUrl = appPrefix + "/" + "api/ahp/hierarquizacoes";
  var $ = function (id) { return document.getElementById(id); };

  function appUrl(area, path) { return appPrefix + "/" + area + path; }
  function escapeHtml(value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; }
  function api(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options || {})).then(async function (response) {
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.detail && (body.detail.message || body.detail) || "Não foi possível concluir a operação.");
      return body;
    });
  }
  function criteriaOf(h) { var dados = h && h.dados_hierarquizacao || {}; return dados.criterios || (dados.pesos && dados.pesos.criteria) || []; }
  function statusLabel(status) { return { ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[status] || status; }
  function actionLinks(j) { return { workspace: appUrl("restrict", "/analise-multicriterio/julgamentos/" + encodeURIComponent(j.id) + "/"), public: appUrl("public", "/analise-multicriterio/" + encodeURIComponent(j.token) + "/") }; }
  function filteredRows() {
    var query = ($("ami-search").value || "").toLowerCase();
    return julgamentos.filter(function (j) {
      var h = hierarquizacoes.find(function (item) { return item.id === j.hierarquizacao_id; });
      return [j.hierarquizacao_codigo, h && h.nome, statusLabel(j.status)].join(" ").toLowerCase().includes(query);
    });
  }
  function render() {
    var rows = filteredRows();
    var pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    var pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    if (!pageRows.some(function (j) { return j.id === selectedId; })) selectedId = null;
    $("ami-count").textContent = rows.length + (rows.length === 1 ? " julgamento" : " julgamentos");
    window.renderTabelaColaborativa("ami-judgments", pageRows, { selectedId: selectedId, paginated: true, linksFor: actionLinks, onSelectionChange: function (id) { selectedId = id; } });
    var pagination = $("ami-judgments-pagination");
    pagination.querySelector("[data-page-label]").textContent = "Página " + currentPage + " de " + pageCount;
    pagination.querySelector("[data-page-prev]").disabled = currentPage <= 1;
    pagination.querySelector("[data-page-next]").disabled = currentPage >= pageCount;
  }
  function showCreateSection() { $("ami-create-section").classList.remove("is-hidden"); $("ami-deadline").focus(); $("ami-create-section").scrollIntoView({ behavior: "smooth", block: "start" }); }
  function hideCreateSection() { $("ami-create-section").classList.add("is-hidden"); $("ami-create-feedback").textContent = ""; }
  function parseEmails(value) { return Array.from(new Set(value.split(/[\n,;]+/).map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean))); }
  function formatDeadline() { var value = $("ami-deadline").value; return value ? new Date(value).toLocaleString("pt-BR") : "Defina a data limite"; }
  function renderDraftEmails() {
    $("ami-email-list").innerHTML = draftEmails.length ? draftEmails.map(function (email, index) { return '<tr><td class="ahp-collab-chk-col"><input type="checkbox" data-draft-index="' + index + '" aria-label="Selecionar ' + escapeHtml(email) + '"></td><td>Colaborador ' + (index + 1) + '</td><td>' + escapeHtml(email) + '</td><td>' + escapeHtml(formatDeadline()) + '</td></tr>'; }).join("") : '<tr><td colspan="4" class="ami-empty">Nenhum colaborador adicionado.</td></tr>';
    $("ami-select-all").checked = false;
    $("ami-delete-emails").disabled = true;
    $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.addEventListener("change", updateDraftControls); });
  }
  function updateDraftControls() { $("ami-delete-emails").disabled = !$("ami-email-list").querySelector("[data-draft-index]:checked"); }
  function addDraftEmails() {
    var incoming = parseEmails($("ami-emails").value);
    incoming.forEach(function (email) { if (!draftEmails.includes(email)) draftEmails.push(email); });
    $("ami-emails").value = "";
    $("ami-create-feedback").textContent = incoming.length ? "Colaboradores adicionados à lista." : "Informe ao menos um e-mail.";
    renderDraftEmails();
  }
  function setupMode() {
    if (modo === "espaco") {
      $("ami-page-title").textContent = "Julgamento - Configurações";
      $("ami-page-intro").textContent = "Configure participantes, prazo de coleta e acesso ao ambiente colaborativo.";
      $("ami-new").classList.remove("is-hidden");
    } else if (modo === "formulario") {
      $("ami-page-title").textContent = "Formulário dos especialistas";
      $("ami-page-intro").textContent = "Selecione um julgamento e use o botão acima da tabela para abrir o formulário público.";
    } else {
      $("ami-page-title").textContent = "Julgamentos";
      $("ami-page-intro").textContent = "Consulte os julgamentos colaborativos cadastrados.";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMode();
    Promise.all([api(hierarquizacoesSourceUrl), api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes")]).then(function (values) {
      hierarquizacoes = values[0]; julgamentos = values[1];
      $("ami-hierarchy").dataset.source = hierarquizacoesSourceUrl;
      $("ami-hierarchy").insertAdjacentHTML("beforeend", hierarquizacoes.map(function (h) { return '<option value="' + h.id + '">' + escapeHtml(h.codigo + " — " + h.nome + " (" + (h.status || "sem situação") + ")") + "</option>"; }).join(""));
      render();
    }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="10" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });

    $("ami-search").addEventListener("input", function () { currentPage = 1; render(); });
    $("ami-judgments-pagination").querySelector("[data-page-prev]").addEventListener("click", function () { if (currentPage > 1) { currentPage -= 1; render(); } });
    $("ami-judgments-pagination").querySelector("[data-page-next]").addEventListener("click", function () { currentPage += 1; render(); });
    $("ami-new").addEventListener("click", showCreateSection);
    $("ami-create-cancel").addEventListener("click", hideCreateSection);
    $("ami-add-emails").addEventListener("click", addDraftEmails);
    $("ami-deadline").addEventListener("change", renderDraftEmails);
    $("ami-select-all").addEventListener("change", function () { var checked = this.checked; $("ami-email-list").querySelectorAll("[data-draft-index]").forEach(function (checkbox) { checkbox.checked = checked; }); updateDraftControls(); });
    $("ami-delete-emails").addEventListener("click", function () { var selected = Array.from($("ami-email-list").querySelectorAll("[data-draft-index]:checked")).map(function (checkbox) { return Number(checkbox.dataset.draftIndex); }); draftEmails = draftEmails.filter(function (_email, index) { return !selected.includes(index); }); renderDraftEmails(); });
    $("ami-hierarchy").addEventListener("change", function () { var h = hierarquizacoes.find(function (item) { return item.id === $("ami-hierarchy").value; }); var n = criteriaOf(h).length; $("ami-hierarchy-summary").textContent = h ? (h.descricao || "Sem descrição") + " · " + n + " critérios" : ""; });
    $("ami-create-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var feedback = $("ami-create-feedback");
      if (!draftEmails.length) { feedback.textContent = "Adicione ao menos um colaborador à lista."; return; }
      if (!$("ami-deadline").value) { feedback.textContent = "Informe a data limite da coleta."; return; }
      feedback.textContent = "Criando ambiente colaborativo…";
      api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes", { method: "POST", body: JSON.stringify({ hierarquizacao_id: $("ami-hierarchy").value, convites: draftEmails.map(function (email) { return { email: email }; }), valido_ate: new Date($("ami-deadline").value).toISOString() }) }).then(function (j) {
        julgamentos.unshift(j); currentPage = 1; selectedId = j.id; render();
        var links = actionLinks(j);
        $("ami-create-status").className = "ami-create-success";
        $("ami-create-status").innerHTML = '<strong>Ambiente colaborativo criado.</strong><span>Situação: ' + escapeHtml(statusLabel(j.status)) + '</span><span>Data limite: ' + escapeHtml(new Date(j.valido_ate).toLocaleString("pt-BR")) + '</span><div class="ami-actions"><a class="btn btn-primary" href="' + escapeHtml(links.workspace) + '">Abrir espaço do julgamento</a><a class="btn btn-secondary" href="' + escapeHtml(links.public) + '">Abrir formulário público</a></div>';
        feedback.textContent = "Colaboradores confirmados e ambiente criado.";
      }).catch(function (err) { feedback.textContent = err.message; });
    });
    renderDraftEmails();
  });
})();
