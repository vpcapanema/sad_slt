(function () {
  "use strict";
  var root, id, julgamento, respostas = [], hierarquia;
  var $ = function (name) { return document.getElementById(name); };
  var esc = function (value) { var n = document.createElement("span"); n.textContent = value == null ? "" : String(value); return n.innerHTML; };
  function api(url, options) { return fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, options || {})).then(async function (r) { var b = await r.json().catch(function () { return {}; }); if (!r.ok) throw new Error(b.detail && (b.detail.message || b.detail) || "Operação não concluída."); return b; }); }
  function names() { return (julgamento.criterios || []).map(function (c) { return typeof c === "string" ? c : c.nome || c.name || c.codigo; }); }
  function localInput(iso) { var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function weights(matrix) { var sums = matrix.map(function (row) { return Math.pow(row.reduce(function (a, b) { return a * Number(b); }, 1), 1 / row.length); }); var total = sums.reduce(function (a, b) { return a + b; }, 0); return sums.map(function (v) { return v / total; }); }
  function bars(values) { return '<div class="ami-bars">' + values.map(function (v, i) { return '<div><span>' + esc(names()[i] || "Critério " + (i + 1)) + '</span><progress max="1" value="' + Number(v) + '"></progress><strong>' + (Number(v) * 100).toFixed(1) + "%</strong></div>"; }).join("") + "</div>"; }
  function render() {
    var labels = { ativa: "Aberto", consolidada: "Consolidado", encerrada: "Encerrado" };
    $("ami-title").textContent = hierarquia && hierarquia.nome || julgamento.hierarquizacao_codigo;
    $("ami-subtitle").textContent = julgamento.hierarquizacao_codigo + " · criado em " + new Date(julgamento.criadoEm).toLocaleDateString("pt-BR");
    $("ami-status").textContent = labels[julgamento.status] || julgamento.status; $("ami-status").className = "ami-status ami-status--" + julgamento.status;
    $("ami-config-details").innerHTML = "<div><span>Prazo</span><strong>" + new Date(julgamento.valido_ate).toLocaleString("pt-BR") + "</strong></div><div><span>Especialistas</span><strong>" + julgamento.convites.length + "</strong></div><div><span>Respostas</span><strong>" + respostas.length + "</strong></div>";
    $("ami-criteria").innerHTML = names().map(function (n) { return "<span>" + esc(n) + "</span>"; }).join("");
    $("ami-edit-emails").value = julgamento.convites.map(function (c) { return c.email; }).join("\n"); $("ami-edit-deadline").value = localInput(julgamento.valido_ate);
    var consistent = respostas.filter(function (r) { return r.consistente; }).length;
    $("ami-kpis").innerHTML = "<div><strong>" + respostas.length + "</strong><span>recebidas</span></div><div><strong>" + consistent + "</strong><span>consistentes</span></div><div><strong>" + (julgamento.convites.length - respostas.length) + "</strong><span>pendentes</span></div>";
    $("ami-responses").innerHTML = respostas.length ? respostas.map(function (r) { return "<tr><td>" + esc(r.nome_completo) + "</td><td>" + esc(r.instituicao) + "</td><td>" + (r.razao_consistencia == null ? "—" : Number(r.razao_consistencia).toFixed(3)) + "</td><td>" + (r.consistente ? "Sim" : "Não") + "</td><td>" + new Date(r.enviadoEm).toLocaleString("pt-BR") + "</td></tr>"; }).join("") : '<tr><td colspan="5" class="ami-empty">Ainda não há respostas.</td></tr>';
    $("ami-priorities").innerHTML = respostas.map(function (r) { return '<article class="ami-priority"><h4>' + esc(r.nome_completo) + "</h4>" + bars(weights(r.matriz_comparacao)) + "</article>"; }).join("");
    $("ami-consolidation").innerHTML = julgamento.consolidacao ? '<div class="ami-kpis"><div><strong>' + julgamento.consolidacao.respostas_consolidadas + '</strong><span>respostas usadas</span></div><div><strong>' + Number(julgamento.consolidacao.razao_consistencia).toFixed(3) + '</strong><span>RC do grupo</span></div></div>' + bars(julgamento.consolidacao.pesos_consolidados) : '<p class="ami-empty">A consolidação ainda não foi executada.</p>';
    $("ami-consolidate").disabled = !consistent || julgamento.status === "consolidada";
  }
  function load() { return Promise.all([api("/api/ahp/comparacao-colaborativa/ambientes/" + id), api("/api/ahp/comparacao-colaborativa/ambientes/" + id + "/respostas"), api("/api/hierarquizacoes")]).then(function (v) { julgamento = v[0]; respostas = v[1]; hierarquia = v[2].find(function (h) { return h.id === julgamento.hierarquizacao_id; }); render(); }); }
  document.addEventListener("DOMContentLoaded", function () {
    root = $("ami-workspace"); id = root.dataset.julgamentoId;
    document.querySelectorAll(".ami-tabs button").forEach(function (button) { button.addEventListener("click", function () { document.querySelectorAll(".ami-tabs button").forEach(function (b) { b.classList.toggle("is-active", b === button); }); document.querySelectorAll(".ami-tab").forEach(function (tab) { tab.classList.toggle("is-hidden", tab.id !== "tab-" + button.dataset.tab); }); }); });
    $("ami-edit-form").addEventListener("submit", function (e) { e.preventDefault(); var convites = Array.from(new Set($("ami-edit-emails").value.split(/[\n,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean))); api("/api/ahp/comparacao-colaborativa/ambientes/" + id, { method: "PATCH", body: JSON.stringify({ convites: convites.map(function (email) { return { email: email }; }), valido_ate: new Date($("ami-edit-deadline").value).toISOString() }) }).then(function (j) { julgamento = j; $("ami-edit-feedback").textContent = "Alterações salvas."; render(); }).catch(function (err) { $("ami-edit-feedback").textContent = err.message; }); });
    $("ami-copy-link").addEventListener("click", function () { var link = location.origin + "/public/analise-multicriterio/" + julgamento.token + "/"; navigator.clipboard.writeText(link).then(function () { $("ami-edit-feedback").textContent = "Link público copiado."; }); });
    $("ami-consolidate").addEventListener("click", function () { $("ami-consolidation-feedback").textContent = "Consolidando…"; api("/api/ahp/comparacao-colaborativa/ambientes/" + id + "/consolidar", { method: "POST" }).then(function (j) { julgamento = j; $("ami-consolidation-feedback").textContent = "Julgamento consolidado e aplicado à hierarquização."; render(); }).catch(function (err) { $("ami-consolidation-feedback").textContent = err.message; }); });
    load().catch(function (err) { $("ami-title").textContent = err.message; });
  });
})();
