(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const tipoLabel = { plano: "plano", programa: "programa", projeto: "projeto" };
  const tipoPlural = { plano: "planos", programa: "programas", projeto: "projetos" };
  let hierarquizacoes = [];
  let selecionada = null;
  let mapa = null;
  let grupoMapa = null;
  const marcadores = new Map();

  function dataPt(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function finalizada(item) {
    return ["calculada", "homologada"].includes(item.status) && Array.isArray(item.ranking) && item.ranking.length;
  }

  function situacao(item) {
    return item.status === "homologada" ? "Finalizada e homologada" : "Finalizada — ranking calculado";
  }

  function botao(valor, item, classe) {
    return `<button type="button" class="ranking-hier-link ${classe}" data-codigo="${esc(item.codigo)}">${esc(valor || "—")}</button>`;
  }

  function renderHierarquizacoes() {
    const body = $("ranking-hier-tbody");
    if (!hierarquizacoes.length) {
      body.innerHTML = '<tr><td colspan="18" class="fase-empty">Nenhuma hierarquização finalizada foi encontrada.</td></tr>';
      return;
    }
    body.innerHTML = hierarquizacoes.map((item) => `<tr data-row-codigo="${esc(item.codigo)}">
      <td>${botao(item.codigo, item, "ranking-link-codigo")}</td>
      <td>${botao(item.config_codigo || item.config_id, item, "ranking-link-config")}</td>
      <td>${botao(item.nome, item, "ranking-link-nome")}</td>
      <td>${esc(item.descricao || "—")}</td>
      <td><span class="ranking-finalizado">${esc(situacao(item))}</span></td>
      <td>${item.dados_hierarquizacao?.cabecalho_grupo?.matriz_premissas_criterios ? "Disponível" : "—"}</td>
      <td>${item.dados_hierarquizacao?.objetos?.length || 0} demanda(s)</td>
      <td>${item.julgamento_projetos?.length || "—"}</td>
      <td>${item.pesos_projetos ? "Disponível" : "—"}</td>
      <td>${item.ranking.length} objeto(s)</td>
      <td>${esc(dataPt(item.homologadoEm))}</td>
      <td>${esc(item.homologadoPorNome || item.homologadoPor || "—")}</td>
      <td>${esc(item.criadoPorNome || item.criadoPor || "—")}</td>
      <td>${esc(dataPt(item.criadoEm))}</td>
      <td>${esc(dataPt(item.atualizadoEm))}</td>
      <td>${esc(tipoLabel[item.tipo_demanda] || item.tipo_demanda || "—")}</td>
      <td>${esc(item.grupo_id || "—")}</td>
      <td>Disponível</td>
    </tr>`).join("");
    body.querySelectorAll(".ranking-hier-link").forEach((button) => {
      button.addEventListener("click", () => selecionar(button.dataset.codigo));
    });
  }

  function objetoPorRanking(hierarquizacao, ranking) {
    const objetos = hierarquizacao.dados_hierarquizacao?.objetos || [];
    return objetos.find((objeto) => {
      const cab = objeto.cabecalho_objeto || {};
      return String(cab.demanda_id || "") === String(ranking.demanda_id || "") || cab.codigo === ranking.codigo;
    });
  }

  function indice(valor) {
    return Number.isFinite(Number(valor)) ? Number(valor).toFixed(4) : "—";
  }

  function dadosRanking(hierarquizacao) {
    return [...(hierarquizacao.ranking || [])]
      .sort((a, b) => Number(a.posicao) - Number(b.posicao))
      .map((ranking, indiceLista) => {
        const objeto = objetoPorRanking(hierarquizacao, ranking);
        const cab = objeto?.cabecalho_objeto || {};
        const fase2 = objeto?.hierarquizacao?.fase_2 || {};
        const fase3 = objeto?.hierarquizacao?.fase_3 || {};
        return {
          ...ranking,
          posicao: Number(ranking.posicao) || indiceLista + 1,
          nome: ranking.nome || cab.nome || "—",
          codigo: ranking.codigo || cab.codigo || "",
          latitude: cab.latitude,
          longitude: cab.longitude,
          geometria: cab.geometria,
          indiceRede: fase2.indice_favorabilidade_rede ?? fase2.valor_por_dimensao?.rede,
          indiceGrade: fase2.indice_favorabilidade_grade ?? fase2.valor_por_dimensao?.grade,
          indicePrioridade: fase3.score_fase3,
        };
      });
  }

  function renderTabela(itens) {
    const linhas = itens.map((item) => `<tr><td class="ranking-posicao">${item.posicao}º</td><td class="ranking-objeto-identidade"><strong>${esc(item.nome)}</strong><small>${esc(item.codigo)}</small></td><td>${indice(item.indiceRede)}</td><td>${indice(item.indiceGrade)}</td><td>${indice(item.indicePrioridade)}</td><td><strong>${indice(item.score)}</strong></td></tr>`).join("");
    $("ranking-objetos-tabela").innerHTML = `<table class="fase-table ranking-objetos-table"><thead><tr><th>Posição</th><th>Objeto de demanda</th><th>Índice de favorabilidade de rede</th><th>Índice de favorabilidade de grade</th><th>Índice de prioridade</th><th>Índice geral de hierarquização</th></tr></thead><tbody>${linhas}</tbody></table>`;
  }

  function pontoItem(item) {
    const lat = Number(item.latitude), lng = Number(item.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return L.latLng(lat, lng);
    if (item.geometria?.coordinates) {
      try {
        const layer = L.geoJSON({ type: item.geometria.tipo || item.geometria.type, coordinates: item.geometria.coordinates });
        const bounds = layer.getBounds();
        if (bounds.isValid()) return bounds.getCenter();
      } catch (_) { /* geometria inválida fica sem marcador */ }
    }
    return null;
  }

  function iconeOrdinal(item) {
    return L.divIcon({
      className: "ranking-marker-wrap",
      html: `<div class="ranking-marker-pin"><span>${item.posicao}º</span></div><div class="ranking-marker-label">${item.posicao}º</div>`,
      iconSize: [42, 58], iconAnchor: [18, 38],
    });
  }

  function focar(item) {
    const marker = marcadores.get(item.posicao);
    if (!marker || !mapa) return;
    mapa.setView(marker.getLatLng(), Math.max(mapa.getZoom(), 12), { animate: true });
    marker.openTooltip();
    document.querySelectorAll(".ranking-map-item").forEach((el) => el.classList.toggle("is-selected", Number(el.dataset.posicao) === item.posicao));
  }

  function renderMapa(itens) {
    $("ranking-map-list").innerHTML = itens.map((item) => `<li><button type="button" class="ranking-map-item" data-posicao="${item.posicao}"><span class="ranking-map-item-pos">${item.posicao}º</span><span><strong>${esc(item.nome)}</strong><small>${esc(item.codigo)} · índice ${indice(item.score)}</small></span></button></li>`).join("");
    if (!mapa) mapa = SLTPainelMapControls.initPainelMap("ranking-map");
    if (grupoMapa) mapa.removeLayer(grupoMapa);
    grupoMapa = L.featureGroup().addTo(mapa);
    marcadores.clear();
    itens.forEach((item) => {
      const ponto = pontoItem(item);
      if (!ponto) return;
      const marker = L.marker(ponto, { icon: iconeOrdinal(item), zIndexOffset: 10000 - item.posicao })
        .bindTooltip(`<strong>${esc(item.posicao)}º — ${esc(item.nome)}</strong><br>${esc(item.codigo)}`, { direction: "top", offset: [0, -34] })
        .addTo(grupoMapa);
      marker.on("click", () => focar(item));
      marcadores.set(item.posicao, marker);
    });
    document.querySelectorAll(".ranking-map-item").forEach((button) => button.addEventListener("click", () => {
      const item = itens.find((registro) => registro.posicao === Number(button.dataset.posicao));
      if (item) focar(item);
    }));
    setTimeout(() => {
      mapa.invalidateSize();
      if (grupoMapa.getLayers().length) mapa.fitBounds(grupoMapa.getBounds(), { padding: [35, 35], maxZoom: 12 });
    }, 0);
  }

  function selecionar(codigo) {
    selecionada = hierarquizacoes.find((item) => item.codigo === codigo);
    if (!selecionada) return;
    document.querySelectorAll("[data-row-codigo]").forEach((row) => row.classList.toggle("is-selected", row.dataset.rowCodigo === codigo));
    const plural = tipoPlural[selecionada.tipo_demanda] || "objetos";
    $("ranking-objetos-titulo").textContent = `Ranking de ${plural} aptos à implementação`;
    $("ranking-mapa-titulo").textContent = `Mapa do ranking de ${plural} aptos à implementação`;
    const itens = dadosRanking(selecionada);
    renderTabela(itens);
    $("ranking-objetos-section").classList.remove("hidden");
    $("ranking-mapa-section").classList.remove("hidden");
    renderMapa(itens);
  }

  async function init() {
    try {
      hierarquizacoes = (await HierApi.listar()).filter(finalizada);
      renderHierarquizacoes();
      $("ranking-hier-loading").classList.add("hidden");
      const codigo = new URLSearchParams(location.search).get("codigo");
      if (codigo && hierarquizacoes.some((item) => item.codigo === codigo)) selecionar(codigo);
    } catch (error) {
      $("ranking-hier-loading").classList.add("hidden");
      $("ranking-hier-error").textContent = error.message || error;
      $("ranking-hier-error").classList.remove("hidden");
    }
  }
  init();
})();
