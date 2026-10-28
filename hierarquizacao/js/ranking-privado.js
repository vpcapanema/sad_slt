(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const D = SLTRankingDados, esc = D.esc, indice = D.indice;
  const plurais = { plano: "planos", programa: "programas", projeto: "projetos" };
  const nomesTipo = { plano: "Plano", programa: "Programa", projeto: "Projeto" };
  let hierarquizacoes = [];
  let mapa;
  let codigoSelecionado;
  let acionadorModal;

  function dataPt(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }
  function padronizarTabela(table, ranking = false) {
    SLTAnalysisTable(table);
    if (ranking) {
      table.analysisControls.sort = rows => [...rows].sort((a, b) => Number(a.dataset.posicao || Infinity) - Number(b.dataset.posicao || Infinity));
      table.analysisControls.draw();
    }
    return table.analysisControls;
  }
  function perfil() {
    return String(window.SLTAdminAuth?.currentUser?.tipo_usuario || "").toUpperCase();
  }
  function gestor() {
    return ["ADMIN", "GESTOR"].includes(perfil());
  }
  function podeReverter(item) {
    const usuario = window.SLTAdminAuth?.currentUser;
    if (perfil() === "ADMIN") return true;
    return perfil() === "GESTOR" && (!item.homologadoPor || String(item.homologadoPor) !== String(usuario?.id));
  }
  async function alterarHomologacao(item, homologar) {
    if (!item) return;
    const confirmado = await window.ProcessFeedback.confirmar(homologar
      ? { title: "Homologar hierarquização", message: `Homologar “${item.nome}”? As demandas do grupo passarão a Hierarquização concluída e nenhuma fase poderá ser recalculada. A reversão exige outro gestor ou um administrador.`, confirmLabel: "Homologar" }
      : { title: "Reverter homologação", message: `Reverter a homologação de “${item.nome}”? As demandas voltarão a Em hierarquização e o recálculo das fases será liberado.`, confirmLabel: "Reverter" });
    if (!confirmado) return;
    const erro = $("ranking-hier-error");
    try {
      await (homologar ? HierApi.homologar(item.codigo) : HierApi.reverterHomologacao(item.codigo));
      erro.classList.add("hidden");
      window.location.reload();
    } catch (error) {
      erro.textContent = error.message || String(error);
      erro.classList.remove("hidden");
    }
  }
  function renderHierarquizacoes() {
    const body = $("ranking-hier-tbody");
    body.innerHTML = hierarquizacoes.map(item => `<tr data-row-codigo="${esc(item.codigo)}">
      <td><span class="ranking-finalizado">${item.status === "homologada" ? "Finalizada e homologada" : "Ranking calculado — aguardando homologação"}</span></td>
      <td><button type="button" class="ami-cell-link" data-visualizar="${esc(item.codigo)}">${esc(item.codigo)}</button></td>
      <td>${item.config_codigo || item.config_id ? `<button type="button" class="ami-cell-link" data-visualizar="${esc(item.codigo)}">${esc(item.config_codigo || item.config_id)}</button>` : "—"}</td>
      <td><button type="button" class="ami-cell-link" data-detalhes="${esc(item.codigo)}">${esc(item.nome)}</button></td>
      <td>${esc(item.descricao || "—")}</td>
      <td>${item.dados_hierarquizacao?.cabecalho_grupo?.matriz_premissas_criterios ? "Disponível" : "—"}</td>
      <td>${item.dados_hierarquizacao?.objetos?.length || 0} demanda(s)</td>
      <td>${item.julgamento_projetos?.length || "—"}</td>
      <td>${item.pesos_projetos ? "Disponível" : "—"}</td>
      <td>${item.ranking.length} objeto(s)</td>
      <td>${esc(dataPt(item.homologadoEm))}</td><td>${esc(item.homologadoPorNome || item.homologadoPor || "—")}</td>
      <td>${esc(item.criadoPorNome || item.criadoPor || "—")}</td><td>${esc(dataPt(item.criadoEm))}</td>
      <td>${esc(dataPt(item.atualizadoEm))}</td><td>${esc(nomesTipo[D.tipo(item)] || "Não informado")}</td>
      <td>${esc(item.grupo_demanda_codigo || item.grupo_id || "—")}</td>
      <td><button type="button" class="ami-cell-link" data-detalhes="${esc(item.codigo)}">Visualizar detalhes</button></td>
    </tr>`).join("");
    const table = body.closest("table");
    const state = padronizarTabela(table);
    const controls = table.closest(".ami-report-table").querySelector(".admin-actions");
    controls.innerHTML = '<button type="button" class="admin-icon-btn view" aria-label="Visualizar" title="Visualizar ranking e informações do grupo selecionado"><i class="fas fa-eye" aria-hidden="true"></i></button><button type="button" class="admin-icon-btn edit-group" aria-label="Visualizar no painel restrito" title="Abrir painel restrito existente"><i class="fas fa-lock" aria-hidden="true"></i></button><button type="button" class="admin-icon-btn reload" aria-label="Visualizar no painel público" title="Abrir painel público existente"><i class="fas fa-globe" aria-hidden="true"></i></button>'
      + '<button type="button" class="admin-icon-btn save" data-acao="homologar" aria-label="Homologar" title="Homologar: conclui as demandas do grupo e trava o recálculo"><i class="fas fa-circle-check" aria-hidden="true"></i></button>'
      + '<button type="button" class="admin-icon-btn delete" data-acao="reverter" aria-label="Reverter homologação" title="Reverter homologação (outro gestor ou administrador)"><i class="fas fa-rotate-left" aria-hidden="true"></i></button>';
    const selecionados = () => state.rows.filter(row => row.querySelector('input[type="checkbox"]:checked'));
    const itemSelecionado = () => hierarquizacoes.find(h => h.codigo === selecionados()[0]?.dataset.rowCodigo);
    const draw = state.draw;
    state.draw = () => {
      draw();
      const unica = selecionados().length === 1;
      const item = unica ? itemSelecionado() : null;
      controls.querySelectorAll("button").forEach(button => { button.disabled = !unica; });
      controls.querySelector('[data-acao="homologar"]').disabled = !(item && item.status === "calculada" && gestor());
      controls.querySelector('[data-acao="reverter"]').disabled = !(item && item.status === "homologada" && podeReverter(item));
    };
    controls.children[0].onclick = () => selecionar(selecionados()[0]?.dataset.rowCodigo);
    controls.children[1].onclick = () => window.open("/restrict/painel/", "_blank", "noopener,noreferrer");
    controls.children[2].onclick = () => window.open("/public/painel/", "_blank", "noopener,noreferrer");
    controls.querySelector('[data-acao="homologar"]').onclick = () => alterarHomologacao(itemSelecionado(), true);
    controls.querySelector('[data-acao="reverter"]').onclick = () => alterarHomologacao(itemSelecionado(), false);
    state.draw();
    body.addEventListener("click", event => {
      const button = event.target.closest("[data-detalhes]");
      if (button) abrirDetalhes(button.dataset.detalhes, button);
      const visualizar = event.target.closest("[data-visualizar]");
      if (visualizar) selecionar(visualizar.dataset.visualizar);
    });
  }
  function renderTabela(item) {
    const linhas = D.dadosRanking(item).map(r => `<tr data-posicao="${r.posicao}" data-demanda="${esc(r.codigo || r.demanda_id)}" tabindex="0" aria-label="Enquadrar ${esc(r.nome)} no mapa"><td class="ranking-posicao">${r.posicao}º</td><td class="ranking-objeto-identidade"><strong>${esc(r.nome)}</strong><small>${esc(r.codigo)}</small></td><td>${indice(r.indiceRede)}</td><td>${indice(r.indiceGrade)}</td><td>${indice(r.indicePrioridade)}</td><td>${indice(r.score)}</td></tr>`).join("");
    $("ranking-objetos-tabela").innerHTML = `<table class="admin-table ranking-objetos-table" data-table-sort="off" aria-labelledby="ranking-objetos-titulo"><thead><tr><th>Posição</th><th>Objeto de demanda</th><th>Índice de favorabilidade de rede</th><th>Índice de favorabilidade territorial</th><th>Índice de prioridade</th><th>Índice geral de hierarquização</th></tr></thead><tbody>${linhas}</tbody></table>`;
    const table = $("ranking-objetos-tabela").querySelector("table");
    padronizarTabela(table, true);
    const focarLinha = event => {
      if (event.target.closest('input, button, a, select, textarea')) return;
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      const linha = event.target.closest("tr[data-demanda]");
      if (!linha) return;
      if (event.type === "keydown") event.preventDefault();
      if (!mapa) {
        Notify.warning("Mapa do ranking", "O mapa ainda não está disponível. Confira o aviso na seção do mapa.");
        return;
      }
      if (!mapa.focar(item.codigo, linha.dataset.demanda)) {
        Notify.warning("Mapa do ranking", "Não foi possível localizar a geometria desta demanda. Confira o aviso na seção do mapa.");
        return;
      }
      $("ranking-mapa-section").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    table.tBodies[0].addEventListener("click", focarLinha);
    table.tBodies[0].addEventListener("keydown", focarLinha);
  }
  function selecionar(codigo) {
    const item = hierarquizacoes.find(h => h.codigo === codigo);
    if (!item) return;
    codigoSelecionado = codigo;
    const plural = plurais[D.tipo(item)] || "objetos de demanda";
    $("ranking-objetos-titulo").textContent = `Ranking de ${plural} do grupo ${item.nome} aptos à implementação`;
    renderTabela(item);
    $("ranking-objetos-section").classList.remove("hidden");
    $("ranking-mapa-section").classList.remove("hidden");
    $("ranking-mapa-titulo").textContent = `Mapa do ranking de ${plural} do grupo ${item.nome}`;
    SLTStatusColors.renderLegend($("ranking-mapa-legenda"), {
      layout: "demandas", tipoDemanda: D.tipo(item), title: "Legenda das demandas", marcadorRanking: true,
    });
    if (mapa) {
      mapa.definirPoliticaPublicacao(h => h.codigo === codigoSelecionado);
      mapa.focar(codigo);
    }
    $("ranking-objetos-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pesosHtml(pesos) {
    if (!pesos || !Object.keys(pesos).length) return "Não registrados";
    return `<ul class="ranking-pesos">${Object.entries(pesos).map(([nome, peso]) => `<li>${esc(nome)}: ${esc(typeof peso === "object" ? JSON.stringify(peso) : peso)}</li>`).join("")}</ul>`;
  }
  function pesosSintese(config, sintese) {
    const c = sintese.contribuicoes || {};
    const valores = [c.favorabilidade_rede, c.favorabilidade_grade, c.prioridade];
    const pesos = config?.operador === "media_simples" ? [1 / 3, 1 / 3, 1 / 3]
      : [config?.peso_rede, config?.peso_grade, config?.peso_prioridade];
    if (!valores.every(Number.isFinite) || !pesos.every(Number.isFinite) || !Number.isFinite(sintese.score_final)
      || Math.abs(valores.reduce((soma, valor, i) => soma + valor * pesos[i], 0) - sintese.score_final) > 1e-10) {
      return "Não reconstituídos para esta demanda";
    }
    if (config?.operador === "media_simples") return "Rede: 1/3; territorial: 1/3; prioridade: 1/3";
    if (config?.operador === "media_ponderada") return `Rede: ${config.peso_rede ?? "não registrado"}; territorial: ${config.peso_grade ?? "não registrado"}; prioridade: ${config.peso_prioridade ?? "não registrado"}`;
    return "Não registrados";
  }
  function controlesColunasDetalhes(table) {
    const state = table.analysisControls;
    const filtro = table.closest(".ami-report-table").querySelector(".admin-filter-bar");
    const separador = document.createElement("span");
    separador.className = "ranking-filter-divider";
    separador.setAttribute("aria-hidden", "true");
    filtro.append(separador);
    const grupos = [
      { chave: "pesos", nome: "Pesos", icone: "fa-scale-balanced" },
      { chave: "indices", nome: "Índices das fases", icone: "fa-calculator" },
      { chave: "elegibilidade", nome: "Elegibilidade", icone: "fa-shield-halved" },
    ];
    grupos.forEach(grupo => {
      const headers = [...table.querySelectorAll(`th[data-grupo-colunas="${grupo.chave}"]`)];
      const colunas = headers.map(header => header.cellIndex);
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "admin-icon-btn ranking-column-toggle";
      botao.dataset.grupoColunas = grupo.chave;
      botao.setAttribute("aria-label", `Mostrar/ocultar ${grupo.nome.toLocaleLowerCase("pt-BR")}`);
      botao.setAttribute("aria-pressed", "false");
      botao.title = `Ocultar ${grupo.nome.toLocaleLowerCase("pt-BR")}`;
      botao.innerHTML = `<i class="fas ${grupo.icone}" aria-hidden="true"></i>`;
      botao.addEventListener("click", () => {
        const ocultar = botao.getAttribute("aria-pressed") !== "true";
        botao.setAttribute("aria-pressed", String(ocultar));
        botao.title = `${ocultar ? "Mostrar" : "Ocultar"} ${grupo.nome.toLocaleLowerCase("pt-BR")}`;
        headers.forEach(header => { header.hidden = ocultar; });
        state.rows.forEach(row => colunas.forEach(index => { row.cells[index].hidden = ocultar; }));
        state.draw();
        window.SLTTableFit?.();
      });
      filtro.append(botao);
    });
    const draw = state.draw;
    state.draw = () => {
      draw();
      const vazia = table.tBodies[0].querySelector("td[colspan]");
      if (vazia) vazia.colSpan = [...table.tHead.rows[0].cells].filter(cell => !cell.hidden).length;
    };
  }
  function abrirDetalhes(codigo, acionador) {
    const item = hierarquizacoes.find(h => h.codigo === codigo);
    if (!item) return;
    const cab = item.dados_hierarquizacao?.cabecalho_grupo || {};
    const ordenados = new Map(D.dadosRanking(item).map(r => [r.codigo, r]));
    const linhas = (item.dados_hierarquizacao?.objetos || []).map(objeto => {
      const c = objeto.cabecalho_objeto || {}, h = objeto.hierarquizacao || {};
      const f1 = h.fase_1 || {}, f2 = h.fase_2 || {}, f3 = h.fase_3 || {}, s = h.sintese || {};
      const r = ordenados.get(c.codigo);
      const pesosF2 = Object.fromEntries(Object.entries(f2.valor_por_criterio || {})
        .filter(([, criterio]) => criterio && criterio.peso != null).map(([chave, criterio]) => [criterio.nome || criterio.criterio || chave, criterio.peso]));
      return `<tr data-posicao="${r?.posicao || ''}"><td>${r?.posicao ? `${r.posicao}º` : "—"}</td>
        <td>${esc(c.nome || "Nome não informado")}<small>${esc(c.codigo)}</small></td>
        <td>${indice(r?.score ?? s.score_final)}</td><td>${esc(pesosSintese(cab.sintese, s))}</td>
        <td>${esc(f1.status_fase1 || "Não calculada")}</td><td>${indice(f1.resumo_elegibilidade?.indice_de_risco_ambiental_e_territorial)}</td>
        <td>${indice(r?.indiceRede ?? f2.indice_favorabilidade_rede ?? f2.valor_por_dimensao?.rede)}</td>
        <td>${indice(r?.indiceGrade ?? f2.indice_favorabilidade_grade ?? f2.valor_por_dimensao?.grade)}</td>
        <td>${pesosHtml(pesosF2)}</td><td>${indice(r?.indicePrioridade ?? f3.score_fase3)}</td>
        <td>${pesosHtml(f3.pesos_fase3)}</td></tr>`;
    }).join("");
    $("ranking-detalhes-titulo").textContent = `Detalhes da hierarquização — ${item.nome}`;
    $("ranking-detalhes-conteudo").innerHTML = `<dl class="ranking-detalhes-meta"><dt>Código</dt><dd>${esc(item.codigo)}</dd><dt>Tipo de demanda</dt><dd>${esc(nomesTipo[D.tipo(item)] || "Não informado")}</dd><dt>Descrição</dt><dd>${esc(item.descricao || "Não informada")}</dd><dt>Operador da síntese</dt><dd>${esc({media_simples: "Média simples", media_ponderada: "Média ponderada"}[cab.sintese?.operador] || "Não registrado")}</dd></dl>
      <p class="ahp-help-text">Resumo dos resultados e pesos salvos. A Fase 1 verifica a elegibilidade territorial e fornece o Índice de risco ambiental e territorial, utilizado na composição do Índice de prioridade da Fase 3, conforme os critérios e pesos da rodada. A síntese final combina os índices de favorabilidade de rede, favorabilidade territorial e prioridade, sem contabilizar o índice de risco separadamente. Valores ausentes não são substituídos por zero.</p>
      <div class="hier-table-shell"><table class="admin-table" data-table-sort="off" aria-label="Resumo das fases por demanda"><thead><tr><th>Posição final</th><th>Demanda</th><th>Índice geral de hierarquização</th><th data-grupo-colunas="pesos">Pesos da síntese</th><th data-grupo-colunas="elegibilidade">Elegibilidade territorial</th><th data-grupo-colunas="indices">Índice de risco ambiental e territorial</th><th data-grupo-colunas="indices">Índice de favorabilidade de rede</th><th data-grupo-colunas="indices">Índice de favorabilidade territorial</th><th data-grupo-colunas="pesos">Pesos da Fase 2</th><th data-grupo-colunas="indices">Índice de prioridade</th><th data-grupo-colunas="pesos">Pesos da Fase 3</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
    acionadorModal = acionador;
    $("ranking-detalhes-modal").classList.remove("hidden");
    padronizarTabela($("ranking-detalhes-conteudo").querySelector("table"), true);
    controlesColunasDetalhes($("ranking-detalhes-conteudo").querySelector("table"));
    $("ranking-detalhes-modal").querySelector("[data-ranking-modal-close]").focus();
    window.SLTTableFit?.();
  }
  function fecharModal() {
    $("ranking-detalhes-modal").classList.add("hidden");
    if (acionadorModal?.isConnected) acionadorModal.focus();
  }
  $("ranking-detalhes-modal").addEventListener("click", event => {
    if (event.target === event.currentTarget || event.target.closest("[data-ranking-modal-close]")) fecharModal();
  });
  $("ranking-detalhes-modal").addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); fecharModal(); }
    if (event.key !== "Tab") return;
    const elementos = [...event.currentTarget.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
    const primeiro = elementos[0], ultimo = elementos.at(-1);
    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
  });
  async function init() {
    try {
      if (!window.SLTAdminAuth?.currentUser) await window.SLTAdminAuth?.fetchMe();
    } catch { /* perfil indisponível: botões de homologação ficam desabilitados */ }
    try {
      hierarquizacoes = (await HierApi.listar()).filter(D.finalizada);
      renderHierarquizacoes();
      $("ranking-hier-loading").classList.add("hidden");
      if (hierarquizacoes.length) {
        const aviso = document.querySelector("[data-ranking-map-status]");
        aviso.textContent = "Carregando as geometrias reais das demandas…";
        aviso.classList.remove("hidden");
        try {
          const demandas = await SLTAdminApi.listPainelDemandas();
          mapa = SLTRankingMapa.criar(document.querySelector("[data-ranking-map]"), {
            hierarquizacoes, demandas, podeExibir: h => h.codigo === codigoSelecionado,
          });
          if (codigoSelecionado) mapa.focar(codigoSelecionado);
        } catch (error) {
          aviso.textContent = `Não foi possível carregar as geometrias reais: ${error.message}. Recarregue a página para tentar novamente.`;
          aviso.classList.remove("hidden");
        }
      }
      const codigo = new URLSearchParams(location.search).get("codigo");
      if (codigo) selecionar(codigo);
    } catch (error) {
      $("ranking-hier-loading").classList.add("hidden");
      $("ranking-hier-error").textContent = error.message || String(error);
      $("ranking-hier-error").classList.remove("hidden");
    }
  }
  init();
})();
