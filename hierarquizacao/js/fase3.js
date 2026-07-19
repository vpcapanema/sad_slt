(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  const atual = () => hierarquizacoes.find((item) => item.codigo === $("fase-hierarquizacao").value);

  function criterios(hierarquizacao) {
    const primeiro = hierarquizacao?.dados_hierarquizacao?.objetos?.[0];
    const matriz = Object.values(primeiro?.hierarquizacao?.fase_3?.criterios || {});
    const sugeridos = hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.criterios_fase3_sugeridos || [];
    const todos = [...matriz, ...sugeridos];
    return [...new Map(todos.map((item) => [item.atributo_id || item.nome_coluna || item.criterio, item])).values()];
  }

  function render(hierarquizacao) {
    if (!hierarquizacao) return;
    const docs = hierarquizacao.dados_hierarquizacao?.objetos || [];
    const metric = (label, value) => `<div class="fase-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
    $("fase-resumo").innerHTML = `<div class="fase-summary-grid">${metric("Rodada", `${hierarquizacao.codigo} — ${hierarquizacao.nome}`)}${metric("Tipo", hierarquizacao.tipo_demanda || "—")}${metric("Demandas", docs.length)}${metric("Situação", hierarquizacao.status)}</div>`;
    $("fase-resumo").classList.remove("hidden");
    $("fase3-criterios").innerHTML = criterios(hierarquizacao).map((criterio) => {
      const nome = criterio.criterio || criterio.rotulo || criterio.nome_coluna;
      const origem = criterio.origem === "fase1_risco" ? "Risco herdado da Fase 1" : "Matriz da rodada";
      return `<article class="card fase3-criterio">
        <strong>${esc(nome)}</strong><small>${esc(origem)}</small>
        <label>Coluna <input data-k="nome_coluna" value="${esc(criterio.nome_coluna || nome)}"></label>
        <label>Tipo <select data-k="tipo_dado"><option value="numerico">Numérico</option><option value="booleano">Booleano</option><option value="ordinal">Ordinal</option><option value="categorico">Categórico</option></select></label>
        <label>Direção <select data-k="direcao"><option value="maior_melhor">Maior é melhor</option><option value="menor_melhor">Menor é melhor</option></select></label>
        <label>Peso <input data-k="peso" type="number" min="0" max="1" step="0.05" value="${esc(criterio.peso ?? criterio.peso_inicial ?? 1)}"></label>
        <label><input data-k="obrigatorio" type="checkbox" ${criterio.obrigatorio ? "checked" : ""}> Obrigatório</label>
        <input type="hidden" data-k="criterio" value="${esc(nome)}">
      </article>`;
    }).join("");
    [...document.querySelectorAll(".fase3-criterio")].forEach((card, index) => {
      const criterio = criterios(hierarquizacao)[index];
      card.querySelector('[data-k="tipo_dado"]').value = criterio.tipo_dado || "numerico";
      card.querySelector('[data-k="direcao"]').value = criterio.direcao || "maior_melhor";
    });
    const pontuados = docs.filter((objeto) => Number.isFinite(objeto.hierarquizacao?.fase_3?.score_fase3));
    const completos = docs.filter((objeto) => (objeto.hierarquizacao?.fase_3?.grau_completude_fase3 ?? 0) >= Number($("fase3-completude").value));
    $("fase3-indicadores").innerHTML = metric("Demandas da rodada", docs.length) + metric("Com score válido", pontuados.length) + metric("Completude atendida", completos.length) + metric("Bloqueadas/pendentes", docs.length - pontuados.length);
    const rows = docs.map((objeto) => {
      const fase = objeto.hierarquizacao.fase_3;
      const ausencias = [...(fase.atributos_ausentes || []), ...(fase.atributos_invalidos || [])];
      const valid = Number.isFinite(fase.score_fase3);
      return `<tr><td><strong>${esc(objeto.cabecalho_objeto.codigo)}</strong><br><small>${esc(objeto.cabecalho_objeto.nome || "")}</small></td><td>${valid ? Number(fase.score_fase3).toFixed(4) : "—"}</td><td>${esc(fase.ranking_fase3 ?? "—")}</td><td>${fase.grau_completude_fase3 == null ? "—" : `${(Number(fase.grau_completude_fase3) * 100).toFixed(0)}%`}</td><td>${ausencias.length ? esc(ausencias.join(", ")) : "—"}</td><td><span class="fase-status ${valid ? "fase-status--ok" : "fase-status--warn"}">${valid ? "Calculado" : "Pendente"}</span></td></tr>`;
    }).join("");
    $("fase3-resultados").innerHTML = docs.length ? `<table class="fase-table"><thead><tr><th>Demanda</th><th>Score</th><th>Posição</th><th>Completude</th><th>Pendências</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="fase-empty">A rodada não possui demandas.</div>';
    const report = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.fase_3;
    const audit = $("fase3-auditoria");
    if (report) { audit.innerHTML = `<strong>Auditoria da execução</strong><pre>${esc(JSON.stringify(report, null, 2))}</pre>`; audit.classList.remove("hidden"); } else audit.classList.add("hidden");
  }

  function payloadCriterios() {
    return [...document.querySelectorAll(".fase3-criterio")].map((card) => Object.fromEntries(
      [...card.querySelectorAll("[data-k]")].map((input) => [
        input.dataset.k,
        input.type === "checkbox" ? input.checked : input.dataset.k === "peso" ? Number(input.value) : input.value,
      ]),
    ));
  }

  function erro(error) {
    $("fase3-erro").textContent = error.message || error;
    $("fase3-erro").classList.remove("hidden");
  }

  async function init() {
    try {
      hierarquizacoes = await HierApi.listar();
      $("fase-hierarquizacao").innerHTML = '<option value="">Selecione…</option>' + hierarquizacoes
        .filter((item) => (item.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar || [1, 2, 3]).includes(3))
        .map((item) => `<option value="${esc(item.codigo)}">${esc(item.codigo)} — ${esc(item.nome)}</option>`).join("");
      if (queryCode) { $("fase-hierarquizacao").value = queryCode; render(atual()); }
      $("fase-hierarquizacao").onchange = () => render(atual());
      $("executar-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return erro("Selecione a hierarquização.");
        try {
          const updated = await HierApi.executarFase3(hierarquizacao.codigo, {
            criterios: payloadCriterios(),
            modo_pesos: $("fase3-modo-pesos").value,
            completude_minima: Number($("fase3-completude").value),
            regra_ausentes: $("fase3-ausentes").value,
          });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          render(updated);
        } catch (error) { erro(error); }
      };
      $("sintetizar").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return erro("Selecione a hierarquização.");
        try {
          const updated = await HierApi.sintetizar(hierarquizacao.codigo, { peso_fase2: Number($("peso-fase2").value), peso_fase3: Number($("peso-fase3").value), incluir_restritos: false });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          render(updated);
        } catch (error) { erro(error); }
      };
    } catch (error) { erro(error); }
  }
  init();
})();
