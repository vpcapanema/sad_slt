const root = document.getElementById("sc-app");
const $ = id => document.getElementById(`sc-${id}`);
const endpoint = "/api/ahp/superficies-criterios";
let catalog = [], dimensions = [], selection = [], saved = null, hierarchies = [], maps = [];
let busy = false, catalogRequest = 0;
let viewerObserver = null, resultMap = null;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(window.SicardApiErro ? window.SicardApiErro.formatar(body, { status: response.status, method: options.method || "GET", url }) : (typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail || body)));
  return body;
}
function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("sc-error", error);
}
async function operation(message, action) {
  if (busy) return;
  busy = true;
  root.setAttribute("aria-busy", "true");
  for (const b of root.querySelectorAll("button")) b.disabled = true;
  status(message);
  try { await action(); }
  catch (error) { status(error.message, true); }
  finally {
    busy = false; root.removeAttribute("aria-busy");
    for (const b of root.querySelectorAll("button")) b.disabled = false;
    syncPreparation();
    syncCalculation();
  }
}
function options(node, values, first) {
  const current = node.value;
  node.innerHTML = `<option value="">${first}</option>` + values.map(v => `<option value="${escape(v)}">${escape(v)}</option>`).join("");
  if (values.includes(current)) node.value = current;
}
function filtered(level = 4) {
  return catalog.filter(i =>
    (!$("type").value || i.origin === $("type").value) &&
    (level < 1 || !$("source").value || i.source === $("source").value) &&
    (level < 2 || !$("year").value || String(i.year) === $("year").value) &&
    (level < 3 || !$("theme").value || i.theme === $("theme").value) &&
    (level < 4 || !$("search").value || `${i.label} ${i.unit || ""}`.toLocaleLowerCase().includes($("search").value.toLocaleLowerCase())));
}
function filterVariables() {
  options($("source"), [...new Set(filtered(0).map(i => i.source))].sort(), "Todas");
  options($("year"), [...new Set(filtered(1).map(i => String(i.year)))].sort().reverse(), "Todos");
  options($("theme"), [...new Set(filtered(2).map(i => i.theme))].sort(), "Todos");
  const rows = filtered().filter(i => !selection.some(c => c.atributo_id === i.id));
  $("variable").innerHTML = rows.map(i => `<option value="${escape(i.id)}">${escape(i.label)} · ${escape(i.unit || "")} · ${escape(i.year)}</option>`).join("");
  $("catalog-count").textContent = `${rows.length} variáveis disponíveis; ${selection.length} selecionadas.`;
  syncPreparation();
}
async function loadCatalog() {
  const request = ++catalogRequest;
  const result = await api(`${endpoint}/catalogo?territorialidade=${$("scale").value}`);
  if (request !== catalogRequest) return;
  catalog = result.attributes; dimensions = result.dimensoes;
  filterVariables();
  status(`${catalog.length} variáveis com levantamento integral comprovado.`);
}
function premise(label, relation) {
  return relation ? `Quanto maior o valor de ${label}, ${relation === "positiva" ? "maior" : "menor"} a favorabilidade territorial.` : "Informe a relação para gerar a premissa.";
}
function renderCriteria() {
  $("criteria").innerHTML = selection.map((c, i) => `<tr>
    <td>${escape(c.variavel)}<br><small>Critério: ${escape(c.criterio || c.variavel)}</small></td>
    <td><select data-index="${i}" data-field="dimensao" aria-label="Dimensão de ${escape(c.variavel)}" ${saved ? "disabled" : ""}><option value="">Selecione</option>${dimensions.map(d => `<option ${d === c.dimensao ? "selected" : ""}>${escape(d)}</option>`).join("")}</select></td>
    <td><select data-index="${i}" data-field="relacao" aria-label="Relação de ${escape(c.variavel)}" ${saved ? "disabled" : ""}><option value="">Selecione</option><option value="positiva" ${c.relacao === "positiva" ? "selected" : ""}>Positiva</option><option value="negativa" ${c.relacao === "negativa" ? "selected" : ""}>Negativa</option></select></td>
    <td>${escape(c.premissa || premise(c.variavel, c.relacao))}</td>
    <td><button type="button" class="btn btn-secondary" data-remove="${i}" ${saved ? "disabled" : ""}>Remover</button></td></tr>`).join("") ||
    '<tr><td colspan="5" class="sc-empty">Adicione variáveis para configurar os critérios.</td></tr>';
  filterVariables();
  syncPreparation();
}
function syncPreparation() {
  $("save").disabled = busy || Boolean(saved) || !selection.length;
  $("add").disabled = busy || Boolean(saved) || !$("variable").options.length;
  $("load").disabled = busy || !$("saved").value;
  for (const button of $("criteria").querySelectorAll("[data-remove]")) button.disabled = busy || Boolean(saved);
}
async function listSaved() {
  const hierarchy = $("hier").value;
  $("saved").innerHTML = '<option value="">Nova superfície</option>';
  if (!hierarchy) return;
  const rows = await api(`${endpoint}?hierarquizacao_id=${encodeURIComponent(hierarchy)}`);
  $("saved").innerHTML += rows.map(r => `<option value="${r.id}">${escape(r.nome)} · ${escape(r.territorialidade)}</option>`).join("");
  if (saved && rows.some(r => r.id === saved.id)) $("saved").value = saved.id;
  syncPreparation();
}
function reset() {
  viewerObserver?.disconnect();
  saved = null; selection = [];
  for (const map of maps) map.remove();
  maps = [];
  resultMap = null;
  $("judgment").innerHTML = '<option value="">Selecione um julgamento consolidado</option>';
  $("viewer").innerHTML = "<p>Salve ou carregue uma superfície para visualizar seus critérios.</p>";
  $("layer-download").hidden = $("index-download").hidden = $("result-map").hidden = true;
  $("result-info").textContent = "O índice ainda não foi calculado.";
  $("result-table").replaceChildren();
  $("saved").value = "";
  $("scale").disabled = $("name").disabled = false;
  $("have").value = $("mode").value = "";
  renderCriteria(); renderWeightControls();
}
function color(value, min, max) {
  if (value === null || !Number.isFinite(Number(value))) return "#cbd5e1";
  const t = max === min ? 0 : Math.max(0, Math.min(1, (Number(value) - min) / (max - min)));
  return `hsl(${45 + t * 110}, 65%, ${75 - t * 38}%)`;
}
function drawMap(node, data, field, legend) {
  const values = data.features.map(f => f.properties[field]).filter(v => v !== null && Number.isFinite(Number(v))).map(Number);
  const min = values.length ? values.reduce((a,b) => Math.min(a,b), Infinity) : 0;
  const max = values.length ? values.reduce((a,b) => Math.max(a,b), -Infinity) : 0;
  const map = L.map(node, { preferCanvas: true, scrollWheelZoom: false });
  maps.push(map);
  const layer = L.geoJSON(data, { style: f => ({ color: "#64748b", weight: .3, fillOpacity: .8, fillColor: color(f.properties[field], min, max) }),
    onEachFeature: (f,l) => l.bindTooltip(f.properties[field] === null ? "Sem valor informado / sigilo" : String(f.properties[field])) }).addTo(map);
  if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
  if (legend) legend.textContent = `Mínimo: ${min.toLocaleString("pt-BR")} · Máximo: ${max.toLocaleString("pt-BR")} · Cinza: sem valor`;
  return map;
}
async function showViewer() {
  viewerObserver?.disconnect();
  for (const map of maps) map.remove();
  maps = [];
  resultMap = null;
  const current = saved.id;
  $("viewer").innerHTML = saved.criterios.map(c => `<article class="sc-criterion"><h3>${escape(c.criterio)}</h3><p>${escape(c.dimensao)}</p><p>${escape(c.premissa)}</p><strong>Valor original</strong><div class="sc-map" id="sc-map-${c.id}-original"></div><p class="sc-legend" id="sc-legend-${c.id}-original"></p><strong>Valor reescalonado</strong><div class="sc-map" id="sc-map-${c.id}-scaled"></div><p class="sc-legend" id="sc-legend-${c.id}-scaled"></p></article>`).join("");
  viewerObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      viewerObserver.unobserve(entry.target);
      const c = saved?.criterios.find(c => entry.target.id === `sc-map-${c.id}-original`);
      if (!c) continue;
      Promise.all([c.campo_original, c.campo_reescalonado].map(field =>
        api(`${endpoint}/${current}/mapa?campo=${encodeURIComponent(field)}`))).then(([original, scaled]) => {
          if (saved?.id !== current) return;
          drawMap(entry.target, original, c.campo_original, document.getElementById(`sc-legend-${c.id}-original`));
          drawMap(document.getElementById(`sc-map-${c.id}-scaled`), scaled, c.campo_reescalonado, document.getElementById(`sc-legend-${c.id}-scaled`));
        }).catch(error => { if (saved?.id === current) { entry.target.textContent = error.message; status(error.message, true); } });
    }
  });
  for (const c of saved.criterios) viewerObserver.observe(document.getElementById(`sc-map-${c.id}-original`));
}
async function activate(row) {
  saved = row; selection = row.criterios;
  $("weights").replaceChildren();
  $("individual").replaceChildren();
  $("judgment").innerHTML = '<option value="">Selecione um julgamento consolidado</option>';
  $("hier").value = row.hierarquizacao_id;
  $("scale").value = row.territorialidade; $("name").value = row.nome;
  $("scale").disabled = $("name").disabled = true;
  $("have").value = $("mode").value = "";
  $("weights").replaceChildren();
  $("individual").replaceChildren();
  $("judgment").innerHTML = '<option value="">Selecione um julgamento consolidado</option>';
  renderCriteria(); renderWeightControls();
  $("layer-download").href = `${endpoint}/${saved.id}/camada.gpkg`; $("layer-download").hidden = false;
  $("matrix-download").href = `${endpoint}/${saved.id}/matriz.xlsx`;
  await showViewer();
  if (row.calculo) await showResult();
  else { $("result-map").hidden = $("index-download").hidden = true; $("result-info").textContent = "Camada preparada salva; índice ainda não calculado."; $("result-table").replaceChildren(); }
  syncCalculation();
}
function renderWeightControls() {
  const ahp = $("operator").value === "ahp";
  const has = $("have").value, mode = $("mode").value;
  $("have-wrap").hidden = !ahp;
  $("mode-wrap").hidden = !ahp || has !== "nao";
  $("weights").hidden = !ahp || has !== "sim";
  $("individual").hidden = !ahp || has !== "nao" || mode !== "individual";
  $("collaborative").hidden = !ahp || has !== "nao" || mode !== "colaborativo";
  if (saved) {
    const previousWeights = new Map([...$("weights").querySelectorAll("[data-weight]")].map(node => [node.dataset.weight, node.value]));
    const previousPairs = new Map([...$("individual").querySelectorAll("[data-pair]")].map(node => [node.dataset.pair, node.value]));
    $("weights").innerHTML = saved.criterios.map(c => `<label>${escape(c.criterio)} — peso normalizado<input type="number" min="0" max="1" step="any" data-weight="${c.id}" required></label>`).join("");
    let html = "<p>Selecione a importância do critério da linha em relação ao da coluna: valores acima de 1 favorecem a linha; frações favorecem a coluna. A parte inversa é preenchida automaticamente. RC deve ser ≤ 0,10.</p><table class='fase-table'><thead><tr><th>Critério</th>" + saved.criterios.map(c => `<th>${escape(c.criterio)}</th>`).join("") + "</tr></thead><tbody>";
    const choices = [1/9,1/8,1/7,1/6,1/5,1/4,1/3,1/2,1,2,3,4,5,6,7,8,9];
    html += saved.criterios.map((c,i) => `<tr><th>${escape(c.criterio)}</th>${saved.criterios.map((_,j) => `<td>${i < j ? `<select class="sc-pair" data-pair="${i},${j}" aria-label="Comparação ${i+1} com ${j+1}"><option value="">Selecione</option>${choices.map(v=>`<option value="${v}">${v<1 ? `1/${Math.round(1/v)}` : v}</option>`).join("")}</select>` : `<span id="sc-inverse-${i}-${j}">${i===j ? "1" : "—"}</span>`}</td>`).join("")}</tr>`).join("");
    $("individual").innerHTML = html + "</tbody></table>";
    for (const node of $("weights").querySelectorAll("[data-weight]")) node.value = previousWeights.get(node.dataset.weight) || "";
    for (const node of $("individual").querySelectorAll("[data-pair]")) {
      node.value = previousPairs.get(node.dataset.pair) || "";
      const [i,j] = node.dataset.pair.split(",");
      $(`inverse-${j}-${i}`).textContent = node.value ? (1/Number(node.value)).toLocaleString("pt-BR", {maximumFractionDigits:4}) : "—";
    }
  } else {
    $("weights").replaceChildren();
    $("individual").replaceChildren();
  }
  syncCalculation();
}
function syncCalculation() {
  const ahp = $("operator").value === "ahp";
  const modeReady = !ahp || $("have").value === "sim" || ($("have").value === "nao" &&
    ($("mode").value === "individual" || ($("mode").value === "colaborativo" && $("judgment").value)));
  $("calculate").disabled = busy || !saved || !modeReady;
}
async function judgments() {
  if (!saved) throw new Error("Salve ou carregue a superfície antes de consultar julgamentos.");
  const rows = await api(`/api/ahp/comparacao-colaborativa/hierarquizacoes/${saved.hierarquizacao_id}/ambientes`);
  const matching = rows.filter(r => r.superficie_id === saved.id);
  $("judgment").innerHTML = '<option value="">Selecione um julgamento consolidado</option>' + matching.map(r =>
    `<option value="${r.id}" ${r.status !== "consolidada" ? "disabled" : ""}>${escape(r.id)} · ${escape(r.status)}</option>`).join("");
  status(matching.length ? "Selecione um julgamento consolidado para aplicar os pesos." : "Ainda não há julgamentos para esta superfície.");
  return matching;
}
async function showResult() {
  const id = saved.id;
  const data = await api(`${endpoint}/${id}/mapa?campo=indice_favorabilidade`);
  if (saved?.id !== id) return;
  $("result-map").hidden = false;
  if (resultMap) {
    resultMap.remove();
    maps = maps.filter(map => map !== resultMap);
  }
  resultMap = drawMap($("result-map"), data, "indice_favorabilidade");
  const audit = saved.calculo;
  $("result-info").textContent = `Índice salvo · ${audit.operador} · ${audit.sem_indice} territórios sem índice. Critérios: ${saved.criterios.length}.`;
  $("index-download").href = `${endpoint}/${id}/camada.gpkg?indice=true`; $("index-download").hidden = false;
  $("result-table").innerHTML = "<table class='fase-table'><thead><tr><th>Critério</th><th>Peso utilizado</th></tr></thead><tbody>" +
    saved.criterios.map(c=>`<tr><td>${escape(c.criterio)}</td><td>${escape(audit.pesos[c.id])}</td></tr>`).join("") + "</tbody></table>";
}
$("criteria").addEventListener("change", event => {
  if (saved || !event.target.dataset.field) return;
  const c = selection[Number(event.target.dataset.index)];
  c[event.target.dataset.field] = event.target.value; c.premissa = premise(c.variavel, c.relacao); renderCriteria();
});
$("criteria").addEventListener("click", event => {
  if (saved || event.target.dataset.remove === undefined) return;
  selection.splice(Number(event.target.dataset.remove), 1); renderCriteria();
});
for (const [i, name] of ["type","source","year","theme"].entries()) $(name).onchange = () => {
  for (const child of ["type","source","year","theme"].slice(i+1)) $(child).value = "";
  filterVariables();
};
$("search").oninput = filterVariables;
$("saved").onchange = syncPreparation;
$("add").onclick = () => {
  if (saved) return status("Inicie uma nova superfície para alterar os critérios.", true);
  const item = catalog.find(i => i.id === $("variable").value);
  if (!item) return status("Selecione uma variável.", true);
  selection.push({ atributo_id: item.id, variavel: item.label, criterio: `${item.label} (favorabilidade territorial)`, dimensao: "", relacao: "" });
  renderCriteria();
};
$("new").onclick = () => operation("Preparando nova configuração…", async () => { reset(); await loadCatalog(); });
$("scale").onchange = () => operation("Carregando catálogo territorial…", async () => { reset(); await loadCatalog(); });
$("hier").onchange = () => operation("Carregando superfícies da hierarquização…", async () => { reset(); await listSaved(); status("Selecione ou prepare uma superfície."); });
$("load").onclick = () => operation("Carregando a camada salva…", async () => {
  if (!$("saved").value) throw new Error("Selecione uma superfície salva.");
  await activate(await api(`${endpoint}/${$("saved").value}`)); status("Superfície carregada.");
});
$("save").onclick = () => operation("Preparando e salvando a camada no Storage. Aguarde a confirmação…", async () => {
  if (saved) throw new Error("Esta superfície já está salva. Inicie uma nova para alterar critérios.");
  if (!$("hier").value || !$("name").value.trim() || !selection.length) throw new Error("Informe a hierarquização, o nome e ao menos uma variável.");
  if (selection.some(c => !c.dimensao || !c.relacao)) throw new Error("Defina a dimensão e a relação de todas as variáveis.");
  const row = await api(endpoint, { method: "POST", body: JSON.stringify({
    hierarquizacao_id: $("hier").value, nome: $("name").value.trim(), territorialidade: $("scale").value,
    criterios: selection.map(c => ({ atributo_id: c.atributo_id, dimensao: c.dimensao, relacao: c.relacao }))
  }) });
  await activate(row); await listSaved(); status("Camada de critérios salva, ainda sem o índice de favorabilidade.");
});
for (const name of ["operator","have"]) $(name).onchange = renderWeightControls;
$("mode").onchange = async () => {
  renderWeightControls();
  if ($("mode").value !== "colaborativo") return;
  let matching;
  await operation("Consultando julgamentos desta superfície…", async () => {
    matching = await judgments();
    syncCalculation();
  });
  if (matching && !matching.length) await startJudgment();
};
$("judgment").onchange = syncCalculation;
$("judgment-refresh").onclick = () => operation("Consultando julgamentos…", judgments);
async function startJudgment() {
  if (!saved) return status("Salve ou carregue a superfície primeiro.", true);
  await operation("Exportando a matriz específica da Fase 2 e abrindo novo julgamento…", async () => {
    const response = await fetch(`${endpoint}/${saved.id}/matriz.xlsx`, {credentials:"same-origin"});
    if (!response.ok) throw new Error("Não foi possível exportar a matriz desta superfície.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url; link.download = "matriz_fase2.xlsx"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    location.assign(`/restrict/analise-multicriterio/central-julgamentos?novo=1&superficie_id=${saved.id}&hierarquizacao_id=${saved.hierarquizacao_id}`);
  });
}
$("judgment-new").onclick = startJudgment;
$("individual").onchange = event => {
  if (!event.target.dataset.pair) return;
  const [i,j] = event.target.dataset.pair.split(",");
  $(`inverse-${j}-${i}`).textContent = event.target.value ? (1/Number(event.target.value)).toLocaleString("pt-BR", {maximumFractionDigits:4}) : "—";
};
$("calculate").onclick = () => operation("Calculando e salvando o índice a partir da camada persistida…", async () => {
  const payload = { operador: $("operator").value };
  if (payload.operador === "ahp") {
    if ($("have").value === "sim") payload.pesos = Object.fromEntries([...$("weights").querySelectorAll("[data-weight]")].map(node => {
      if (!node.value) throw new Error("Informe todos os pesos.");
      return [node.dataset.weight, Number(node.value)];
    }));
    else if ($("mode").value === "individual") {
      const n = saved.criterios.length;
      payload.matriz = Array.from({length:n},()=>Array(n).fill(1));
      for (const node of $("individual").querySelectorAll("[data-pair]")) {
        if (!node.value) throw new Error("Preencha todas as comparações pareadas.");
        const [i,j] = node.dataset.pair.split(",").map(Number);
        payload.matriz[i][j] = Number(node.value); payload.matriz[j][i] = 1/Number(node.value);
      }
    } else {
      if (!$("judgment").value) throw new Error("Aguarde e selecione um julgamento consolidado desta superfície.");
      payload.ambiente_id = $("judgment").value;
    }
  }
  saved = await api(`${endpoint}/${saved.id}/calcular`, {method:"POST", body:JSON.stringify(payload)});
  await showResult(); status("Índice calculado e salvo. A superfície não é homologada automaticamente.");
});
async function init() {
  hierarchies = await api("/api/ahp/hierarquizacoes/portfolio");
  $("hier").innerHTML += hierarchies.map(h => `<option value="${h.id}">${escape(h.codigo)} · ${escape(h.nome)}</option>`).join("");
  const query = new URLSearchParams(location.search);
  const hierarchy = hierarchies.find(h => h.codigo === query.get("codigo") || h.id === query.get("hierarquizacao_id"));
  if (hierarchy) $("hier").value = hierarchy.id;
  await loadCatalog(); await listSaved();
  if (query.get("superficie_id")) {
    await activate(await api(`${endpoint}/${encodeURIComponent(query.get("superficie_id"))}`));
    await listSaved();
  }
}
operation("Carregando preparação de critérios…", init);
