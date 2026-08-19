(function () {
  "use strict";
  var julgamentos = [];
  var hierarquizacoes = [];
  var modo = new URLSearchParams(location.search).get("modo") || "julgamentos";
  var prefixMatch = location.pathname.match(/^(.*?)\/restrict\//);
  var appPrefix = prefixMatch ? prefixMatch[1] : "";
  var $ = function (id) { return document.getElementById(id); };
  var escapeHtml = function (value) { var node = document.createElement("span"); node.textContent = value == null ? "" : String(value); return node.innerHTML; };
  function api(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options || {})).then(async function (response) {
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(body.detail && (body.detail.message || body.detail) || "Não foi possível concluir a operação.");
      return body;
    });
  }
  function criteriaOf(h) {
    var dados = h && h.dados_hierarquizacao || {};
    return dados.criterios || (dados.pesos && dados.pesos.criteria) || [];
  }
  function statusLabel(status) { return { ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" }[status] || status; }
  function render() {
    var query = ($("ami-search").value || "").toLowerCase();
    var rows = julgamentos.filter(function (j) {
      var h = hierarquizacoes.find(function (item) { return item.id === j.hierarquizacao_id; });
      return [j.hierarquizacao_codigo, h && h.nome, statusLabel(j.status)].join(" ").toLowerCase().includes(query);
    });
    $("ami-count").textContent = rows.length + (rows.length === 1 ? " julgamento" : " julgamentos");
    window.renderTabelaColaborativa("ami-judgments", rows, function (j) {
      return modo === "formulario"
        ? { href: appPrefix + "/public/analise-multicriterio/" + encodeURIComponent(j.token) + "/", label: "Abrir formulário" }
        : { href: appPrefix + "/restrict/analise-multicriterio/julgamentos/" + encodeURIComponent(j.id) + "/", label: modo === "espaco" ? "Abrir espaço" : "Abrir" };
    });
  }
  function openModal() { $("ami-create-modal").classList.remove("is-hidden"); $("ami-hierarchy").focus(); }
  function closeModal() { $("ami-create-modal").classList.add("is-hidden"); $("ami-create-feedback").textContent = ""; }
  function emails(value) { return Array.from(new Set(value.split(/[\n,;]+/).map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean))); }
  document.addEventListener("DOMContentLoaded", function () {
    if (modo === "espaco") {
      $("ami-page-title").textContent = "Espaço do julgamento";
      $("ami-page-intro").textContent = "Selecione um julgamento para configurar participantes, acompanhar respostas e consolidar os resultados.";
      $("ami-new").classList.add("is-hidden");
    } else if (modo === "formulario") {
      $("ami-page-title").textContent = "Formulário dos especialistas";
      $("ami-page-intro").textContent = "Selecione um julgamento para abrir o formulário público de participação.";
      $("ami-new").classList.add("is-hidden");
    }
    Promise.all([api(appPrefix + "/" + "api/hierarquizacoes"), api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes")]).then(function (values) {
      hierarquizacoes = values[0]; julgamentos = values[1];
      $("ami-hierarchy").insertAdjacentHTML("beforeend", hierarquizacoes.map(function (h) { return '<option value="' + h.id + '">' + escapeHtml(h.codigo + " — " + h.nome) + "</option>"; }).join(""));
      render();
    }).catch(function (err) { $("ami-judgments").innerHTML = '<tr><td colspan="7" class="ami-empty">' + escapeHtml(err.message) + "</td></tr>"; });
    $("ami-search").addEventListener("input", render); $("ami-new").addEventListener("click", openModal);
    $("ami-create-close").addEventListener("click", closeModal); $("ami-create-cancel").addEventListener("click", closeModal);
    $("ami-hierarchy").addEventListener("change", function () { var h = hierarquizacoes.find(function (item) { return item.id === $("ami-hierarchy").value; }); var n = criteriaOf(h).length; $("ami-hierarchy-summary").textContent = h ? (h.descricao || "Sem descrição") + " · " + n + " critérios" : ""; });
    $("ami-create-form").addEventListener("submit", function (event) {
      event.preventDefault(); var convites = emails($("ami-emails").value); var feedback = $("ami-create-feedback");
      if (!convites.length) { feedback.textContent = "Informe ao menos um e-mail."; return; }
      feedback.textContent = "Abrindo julgamento…";
      api(appPrefix + "/" + "api/ahp/comparacao-colaborativa/ambientes", { method: "POST", body: JSON.stringify({ hierarquizacao_id: $("ami-hierarchy").value, convites: convites.map(function (email) { return { email: email }; }), valido_ate: new Date($("ami-deadline").value).toISOString() }) }).then(function (j) {
        location.href = appPrefix + "/restrict/analise-multicriterio/julgamentos/" + encodeURIComponent(j.id) + "/";
      }).catch(function (err) { feedback.textContent = err.message; });
    });
  });
})();
