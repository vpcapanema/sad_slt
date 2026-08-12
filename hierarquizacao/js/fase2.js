(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  let pacotes = [];
  const atual = () => hierarquizacoes.find((item) => item.codigo === $("fase-hierarquizacao").value);
  const pacoteAtual = () => pacotes.find((item) => item.pacote_id === $("pacote-fase2").value);
  const objetos = (h) => h?.dados_hierarquizacao?.objetos || [];

  const codigoCurto = (base) =>
    String(base || "f2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "f2";

  function bancadaWindow() {
    const frame = document.getElementById("gp-frame-fase2");
    return frame?.contentWindow || null;
  }

  function comBancada(cb) {
    const win = bancadaWindow();
    if (!win) return Promise.resolve();
    if (win.gpApp) return Promise.resolve(cb(win.gpApp));
    return new Promise((resolve) => {
      const frame = document.getElementById("gp-frame-fase2");
      frame?.addEventListener("load", () => resolve(win.gpApp ? cb(win.gpApp) : undefined), { once: true });
    });
  }

  function hierarquizacaoParaGeoJson(h) {
    const features = objetos(h)
      .map((item) => {
        const cab = item.cabecalho_objeto || item;
        const lon = Number(cab.longitude);
        const lat = Number(cab.latitude);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            demanda_id: cab.demanda_id || cab.codigo || null,
            codigo: cab.codigo || null,
            nome: cab.nome || null,
            status: cab.status || null,
            hierarquizacao: h.codigo,
          },
        };
      })
      .filter(Boolean);
    return { type: "FeatureCollection", features };
  }

  function enviarHierarquizacaoParaBancada(h) {
    if (!h) return;
    const geojson = hierarquizacaoParaGeoJson(h);
    if (!geojson.features.length) return;
    const id = `hier_${codigoCurto(h.codigo)}`;
    const nome = `Hierarquização · ${h.nome || h.codigo}`;
    comBancada((gpApp) => {
      try {
        gpApp.adicionarCamadaGeoJsonEmMemoria(id, nome, geojson, {
          tipo: "vetorial (memória)",
          origem: "Hierarquização Fase 2",
          geometria_tipo: "Point",
          simbologia: "status",
        });
      } catch (e) {
        console.warn("Falha ao adicionar hierarquização na bancada", e);
      }
    });
  }

  function metric(label, value) {
    return `<div class="fase-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
  }

  function renderPacote() {
    const pacote = pacoteAtual();
    const el = $("fase2-pacote-resumo");
    const saida = $("gp-favorabilidade");
    if (!pacote) {
      if (el) el.classList.add("hidden");
      if (saida) saida.innerHTML = '<p class="ahp-help-text">Selecione o pacote homologado.</p>';
      return;
    }
    const camadas = pacote.camadas || [];
    if (el) {
      el.innerHTML = `<div class="fase-summary-grid">${metric("Código", pacote.codigo)}${metric("Versão", pacote.versao)}${metric("Situação", pacote.status)}${metric("Camadas", camadas.length)}</div>`;
      el.classList.remove("hidden");
    }
    if (saida) saida.innerHTML = camadas.length ? camadas.map((camada) => `<div class="fase1-layer"><i class="fas fa-layer-group"></i><div><strong>${esc(camada.nome || camada.nome_publicacao || "Superfície homologada")}</strong><small>${esc(camada.tipo || "Raster")} · ${esc(camada.versao || pacote.versao || "—")}</small></div></div>`).join("") : '<p class="ahp-help-text">O pacote não informou camadas publicadas.</p>';
  }

  function renderResumo(h) {
    const layer = $("gp-demandas-fase2");
    if (!h) {
      if (layer) layer.innerHTML = '<p class="ahp-help-text">Selecione uma hierarquização.</p>';
      return;
    }
    window.SLTResumoFase?.camadaDemandas(layer, h);
    enviarHierarquizacaoParaBancada(h);
  }

  function ocultarResultados() {
    const ind = $("fase2-indicadores");
    const res = $("fase2-resultados");
    const audit = $("fase2-auditoria");
    const vazio = $("fase2-resultado-vazio");
    if (ind) ind.innerHTML = "";
    if (res) res.innerHTML = "";
    if (audit) {
      audit.innerHTML = "";
      audit.classList.add("hidden");
    }
    if (vazio) vazio.classList.remove("hidden");
  }

  function renderResultados(h) {
    if (!h) return;
    const docs = objetos(h);
    const processados = docs.filter((o) => o.hierarquizacao?.fase_2?.executada);
    const pontuados = docs.filter((o) => Number.isFinite(o.hierarquizacao?.fase_2?.score_fase2));
    const vazio = $("fase2-resultado-vazio");
    if (vazio) vazio.classList.add("hidden");
    $("fase2-indicadores").innerHTML = metric("Demandas da rodada", docs.length) + metric("Processadas", processados.length) + metric("Com score válido", pontuados.length) + metric("Sem cobertura/NoData", docs.length - pontuados.length);
    const rows = docs.map((o) => {
      const c = o.cabecalho_objeto || {};
      const f = o.hierarquizacao?.fase_2 || {};
      const value = f.score_fase2;
      const status = Number.isFinite(value) ? '<span class="fase-status fase-status--ok">Calculado</span>' : '<span class="fase-status fase-status--warn">Pendente</span>';
      return `<tr><td><strong>${esc(c.codigo)}</strong><br><small>${esc(c.nome || "")}</small></td><td>${esc(f.metodo_extracao || "—")}</td><td>${Number.isFinite(value) ? Number(value).toFixed(4) : "—"}</td><td>${esc(f.ranking_fase2 ?? "—")}</td><td>${status}</td></tr>`;
    }).join("");
    $("fase2-resultados").innerHTML = docs.length ? `<table class="fase-table"><thead><tr><th>Demanda</th><th>Método</th><th>Favorabilidade</th><th>Posição</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="fase-empty">A rodada não possui demandas.</div>';
    const report = h.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.fase_2;
    const audit = $("fase2-auditoria");
    if (report) { audit.innerHTML = `<strong>Auditoria da execução</strong><pre>${esc(JSON.stringify(report, null, 2))}</pre>`; audit.classList.remove("hidden"); } else audit.classList.add("hidden");
  }

  function erro(error) {
    const box = $("fase2-erro");
    if (box) {
      box.textContent = error.message || error;
      box.classList.remove("hidden");
    }
    if (window.SLTFeedback) window.SLTFeedback.error(error?.message || String(error), "Não foi possível continuar");
  }

  function moverControlesParaCards() {
    const mover = (hostId, ...labelIds) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      labelIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) host.appendChild(el);
      });
    };
    mover("gp-demandas-fase2-ctrl", "ctrl-hier");
    mover("gp-favorabilidade-ctrl", "ctrl-pacote", "ctrl-metodo");
    const origem = document.getElementById("fase2-controles-origem");
    if (origem) origem.removeAttribute("hidden");
  }

  async function init() {
    try {
      moverControlesParaCards();
      hierarquizacoes = await HierApi.listar();
      const elegiveis = hierarquizacoes.filter((item) => (item.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar || [1, 2, 3]).includes(2));
      $("fase-hierarquizacao").innerHTML = '<option value="">Selecione…</option>' + elegiveis.map((h) => `<option value="${esc(h.codigo)}">${esc(h.codigo)} — ${esc(h.nome)}</option>`).join("");
      if (queryCode) { $("fase-hierarquizacao").value = queryCode; renderResumo(atual()); ocultarResultados(); }
      $("fase-hierarquizacao").onchange = () => { renderResumo(atual()); ocultarResultados(); };
      pacotes = await HierApi.listarPacotes("fase2");
      $("pacote-fase2").innerHTML = '<option value="">Selecione…</option>' + pacotes.map((p) => `<option value="${esc(p.pacote_id)}">${esc(p.codigo)} — ${esc(p.nome)} · ${esc(p.versao)}</option>`).join("");
      $("pacote-fase2").onchange = renderPacote;
      $("executar-fase2").onclick = async () => {
        const h = atual(); const pacote = $("pacote-fase2").value;
        if (!h || !pacote) return erro("Selecione a hierarquização e o pacote homologado.");
        try {
          $("fase2-erro").classList.add("hidden");
          const updated = await HierApi.executarFase2(h.codigo, { pacote_id: pacote, metodo_extracao: $("metodo-fase2").value });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          renderResumo(updated);
          renderResultados(updated);
          if (window.SLTFeedback) window.SLTFeedback.success("Fase 2 executada. Confira os indicadores e o ranking abaixo.", "Extração concluída");
        } catch (error) { erro(error); }
      };
    } catch (error) { erro(error); }
  }
  init();
})();
