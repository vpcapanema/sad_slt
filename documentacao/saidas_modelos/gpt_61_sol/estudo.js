(function () {
  "use strict";
  const data = window.ESTUDO;
  if (!data) return;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const number = (value, digits = 3) => value === null || value === undefined ? "Sem dado" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
  const keys = { criterion: "Crit\u00e9rio", metric: "M\u00e9trica (o que \u00e9 medido)", unit: "Unidade de medida" };
  const tomtom = data.auditoria.tomtom;
  document.getElementById("summary").innerHTML = [["645", "munic\u00edpios de S\u00e3o Paulo"], ["4 / 50", "crit\u00e9rios calculados / retificados"], [number(data.resultados.rede.validos, 0), "trechos DER com \u00edndice de rede"], ["TomTom bloqueado", `amostras v\u00e1lidas: ${number(100 * tomtom.pontos, 2)}% / m\u00ednimo: 95%`]].map(([value, label]) => `<div><strong>${escape(value)}</strong><span>${escape(label)}</span></div>`).join("");
  document.getElementById("tomtom-status").textContent = `Chave validada; ${number(tomtom.consultados, 0)} consultas DER, ${number(tomtom.validos, 0)} amostras v\u00e1lidas de ${number(tomtom.esperados, 0)} previstas. Cobertura de pontos: ${number(100 * tomtom.pontos, 2)}%; extens\u00e3o representada: ${number(100 * tomtom.extensao, 2)}%. Requisito de 95% n\u00e3o atingido: componente exclu\u00eddo do \u00edndice. A coleta desta tentativa foi interrompida quando a cobertura-alvo se tornou inating\u00edvel mantendo as respostas obtidas.`;
  const renderMatrix = () => {
    const query = document.getElementById("search").value.toLocaleLowerCase("pt-BR");
    const phase = document.getElementById("phase").value;
    const status = document.getElementById("status").value;
    const rows = data.matriz.filter((row) => (!phase || row.Fase === phase) && (!status || row.Situacao.startsWith(status)) && JSON.stringify(row).toLocaleLowerCase("pt-BR").includes(query));
    document.getElementById("matrix-body").innerHTML = rows.map((row) => `<tr><td><strong>${escape(row.Codigo)}</strong><small>${escape(row.Fase)}<br>${escape(row["Dimens\u00e3o"])}</small></td><td><strong>${escape(row[keys.criterion])}</strong><p>${escape(row.Premissa)}</p></td><td>${escape(row[keys.metric])}<small>${escape(row[keys.unit])}</small></td><td>${escape(row.Operador)}<small>${escape(row.Fonte)}</small></td><td class="state ${row.Situacao.startsWith("Calculado") ? "calculated" : ""}">${escape(row.Situacao)}</td></tr>`).join("");
    document.getElementById("count").textContent = `${rows.length} de ${data.matriz.length}`;
  };
  ["search", "phase", "status"].forEach((id) => document.getElementById(id).addEventListener(id === "search" ? "input" : "change", renderMatrix));
  renderMatrix();
  document.getElementById("variable-maps").innerHTML = data.variaveis.map((variable) => `<figure><a href="mapas/variavel_${escape(variable.campo)}.png" target="_blank" rel="noopener"><img src="mapas/variavel_${escape(variable.campo)}.png" alt="Mapa: ${escape(variable.nome)}" loading="lazy"></a><figcaption><h3>${escape(variable.nome)}</h3><p>${escape(variable.unidade)}</p></figcaption></figure>`).join("");
  const equations = {
    G01: '<math display="block"><mrow><msub><mi>x</mi><mi>m</mi></msub><mo>=</mo><msub><mi>PIB</mi><mi>m</mi></msub><mo>;</mo><mspace width="1em"></mspace><msub><mi>G</mi><mn>01,m</mn></msub><mo>=</mo><mi>N</mi><mo>(</mo><msub><mi>x</mi><mi>m</mi></msub><mo>)</mo></mrow></math>',
    G02: '<math display="block"><mrow><msub><mi>G</mi><mn>02,m</mn></msub><mo>=</mo><mfrac><mrow><mi>N</mi><mo>(</mo><msub><mi>a</mi><mi>m</mi></msub><mo>)</mo><mo>+</mo><mi>N</mi><mo>(</mo><msub><mi>d</mi><mi>m</mi></msub><mo>)</mo></mrow><mn>2</mn></mfrac></mrow></math>',
    R01: '<math display="block"><mrow><msub><mi>R</mi><mi>01,t</mi></msub><mo>=</mo><mi>N</mi><mo>(</mo><msub><mi>VDM</mi><mi>t</mi></msub><mo>)</mo></mrow></math>', R02: '<math display="block"><mrow><msub><mi>R</mi><mi>02,t</mi></msub><mo>=</mo><mi>N</mi><mo>(</mo><msub><mi>VC</mi><mi>t</mi></msub><mo>)</mo></mrow></math>',
  };
  document.getElementById("criterion-details").innerHTML = data.criterios.map((criterion) => `<article class="criterion" id="criterio-${escape(criterion.codigo)}"><header><span>${escape(criterion.codigo)}</span><h3>${escape(criterion.nome)}</h3></header><p><strong>Premissa.</strong> ${escape(criterion.premissa)}</p><p><strong>Espacializa\u00e7\u00e3o.</strong> ${escape(criterion.metodo)}</p><div class="equation">${equations[criterion.codigo]}</div><p><strong>C\u00e1lculo.</strong> <code>${escape(criterion.equacao)}</code></p><p><strong>Universo.</strong> ${criterion.cobertura}/${criterion.universo} ${escape(criterion.unidade_espacial)}; faixa bruta ${number(criterion.minimo)} a ${number(criterion.maximo)} ${escape(criterion.unidade)}.</p><p><strong>Limite cient\u00edfico.</strong> ${escape(criterion.limite)}</p><figure><a href="mapas/criterio_${criterion.codigo}.png" target="_blank" rel="noopener"><img src="mapas/criterio_${criterion.codigo}.png" alt="Crit\u00e9rio normalizado: ${escape(criterion.nome)}" loading="lazy"></a><figcaption>${escape(criterion.fonte)} &middot; 0&ndash;1</figcaption></figure></article>`).join("");
  document.getElementById("pending-details").innerHTML = data.matriz.filter((row) => !row.Situacao.startsWith("Calculado")).map((row) => `<article><h3>${escape(row.Codigo)} &middot; ${escape(row[keys.criterion])}</h3><p>${escape(row.Premissa)}</p><p><strong>Opera\u00e7\u00e3o exigida:</strong> ${escape(row.Operador)}</p><p class="state">${escape(row.Situacao)}. Nenhum mapa ou valor foi simulado.</p></article>`).join("");
  document.getElementById("territorial-result").textContent = `${data.resultados.territorial.validos}/645 munic\u00edpios; m\u00e9dia estadual dos \u00edndices municipais: ${number(data.resultados.territorial.media)}. Cen\u00e1rio igualmente ponderado, n\u00e3o homologado.`;
  document.getElementById("road-result").textContent = `${number(data.resultados.rede.validos, 0)}/${number(data.resultados.rede.total, 0)} trechos DER; m\u00e9dia dos \u00edndices v\u00e1lidos: ${number(data.resultados.rede.media)}. Trechos incompletos permanecem sem nota. A geometria e a quilometragem DER s\u00e3o preservadas; n\u00e3o h\u00e1 agrega\u00e7\u00e3o municipal.`;
  let roadPage = 0;
  const renderRoad = () => {
    const query = document.getElementById("trecho-search").value.toLocaleLowerCase("pt-BR");
    const sort = document.getElementById("trecho-sort").value;
    const rows = data.trechos.filter((row) => `${row.Rodovia} ${row.Subtrecho} ${row.trecho_id}`.toLocaleLowerCase("pt-BR").includes(query));
    rows.sort((first, second) => sort === "rodovia" ? first.Rodovia.localeCompare(second.Rodovia) || first.KmInicial - second.KmInicial : first.fav_rede === null ? (second.fav_rede === null ? 0 : 1) : second.fav_rede === null ? -1 : (sort === "asc" ? 1 : -1) * (first.fav_rede - second.fav_rede));
    roadPage = Math.min(roadPage, Math.max(0, Math.ceil(rows.length / 50) - 1));
    document.getElementById("trechos-body").innerHTML = rows.slice(roadPage * 50, (roadPage + 1) * 50).map((row) => `<tr><td>${escape(row.Rodovia)}</td><td>${escape(row.Subtrecho)}<small>ID ${escape(row.trecho_id)}</small></td><td>${number(row.KmInicial)}</td><td>${number(row.KmFinal)}</td><td>${number(row.extensao_km)}</td><td>${number(row.vdm, 0)}</td><td>${number(row.vc)}</td><td><strong>${row.fav_rede === null ? "Sem \u00edndice" : number(row.fav_rede)}</strong></td></tr>`).join("");
    document.getElementById("trecho-count").textContent = rows.length ? `${roadPage * 50 + 1}-${Math.min((roadPage + 1) * 50, rows.length)} de ${number(rows.length, 0)}` : "Nenhum trecho";
    document.getElementById("trecho-prev").disabled = roadPage === 0;
    document.getElementById("trecho-next").disabled = (roadPage + 1) * 50 >= rows.length;
  };
  ["trecho-search", "trecho-sort"].forEach((id) => document.getElementById(id).addEventListener(id === "trecho-search" ? "input" : "change", () => { roadPage = 0; renderRoad(); }));
  document.getElementById("trecho-prev").addEventListener("click", () => { roadPage -= 1; renderRoad(); });
  document.getElementById("trecho-next").addEventListener("click", () => { roadPage += 1; renderRoad(); });
  renderRoad();
  const rhoRoad = data.correlacao_rede.n_vdm.n_vc;
  const rhoTerritory = data.correlacao.n_pib.vulnerabilidade;
  const rhoComponents = data.correlacao.n_nao_alfabetizados.n_sem_coleta;
  document.getElementById("correlation").innerHTML = `<div class="correlation-list"><p><strong>VDM \u00d7 V/C: ${number(rhoRoad)}.</strong> Spearman, ${data.resultados.rede.validos} trechos DER. Depend\u00eancia forte; V/C acrescenta capacidade, mas a m\u00e9dia pode refor\u00e7ar o mesmo fator de demanda. Testar composi\u00e7\u00e3o por dimens\u00e3o e ranking com/sem cada crit\u00e9rio.</p><p><strong>PIB \u00d7 priva\u00e7\u00e3o: ${number(rhoTerritory)}.</strong> Spearman, 645 munic\u00edpios. Conflito distributivo importante; a m\u00e9dia simples pode diluir escolhas entre intensidade econ\u00f4mica e necessidade social.</p><p><strong>N\u00e3o alfabetiza\u00e7\u00e3o \u00d7 falta de coleta: ${number(rhoComponents)}.</strong> Spearman, 645 munic\u00edpios. Os componentes compartilham priva\u00e7\u00e3o territorial, mas medem servi\u00e7os distintos. Validar externamente antes de ampliar o \u00edndice.</p></div>`;
  document.getElementById("sources").innerHTML = data.fontes.map((source) => `<article class="source"><strong>${escape(source.arquivo)}</strong>${source.url ? `<p><a href="${escape(source.url)}" target="_blank" rel="noopener">${escape(source.url)}</a></p>` : '<p>Acervo fornecido; fonte institucional e calibra\u00e7\u00e3o pendentes de comprova\u00e7\u00e3o.</p>'}<p>${escape(source.nota || "IBGE / API oficial; resposta integral preservada.")}</p><code>SHA256 ${escape(source.sha256)}</code></article>`).join("");
  document.getElementById("date").textContent = new Date(data.data).toLocaleDateString("pt-BR");
  if (window.lucide) window.lucide.createIcons();
})();