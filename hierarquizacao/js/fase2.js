(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  let camadas = [];
  const atual = () => hierarquizacoes.find((item) => item.codigo === $("fase-hierarquizacao").value);
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

  function renderCamadas() {
    const saida = $("gp-favorabilidade");
    const selecionadas = [$("camada-grade-fase2").value, $("camada-rede-fase2").value]
      .map((id) => camadas.find((camada) => camada.homologacao_id === id)).filter(Boolean);
    if (!selecionadas.length) {
      if (saida) saida.innerHTML = '<p class="ahp-help-text">Selecione as superfícies homologadas de grade e de rede.</p>';
      return;
    }
    if (saida) saida.innerHTML = selecionadas.map((camada) => `<div class="fase1-layer"><i class="fas fa-layer-group"></i><div><strong>${esc(camada.nome_publicacao || camada.nome || "Superfície homologada")}</strong><small>Raster · ${esc(camada.versao || "—")} · ${esc(camada.arquivo)}</small></div></div>`).join("");
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
    const pontuados = docs.filter((o) => Number.isFinite(o.hierarquizacao?.fase_2?.indice_favorabilidade_grade) && Number.isFinite(o.hierarquizacao?.fase_2?.indice_favorabilidade_rede));
    const vazio = $("fase2-resultado-vazio");
    if (vazio) vazio.classList.add("hidden");
    $("fase2-indicadores").innerHTML = metric("Demandas da rodada", docs.length) + metric("Processadas", processados.length) + metric("Com score válido", pontuados.length) + metric("Sem cobertura/NoData", docs.length - pontuados.length);
    const rows = docs.map((o) => {
      const c = o.cabecalho_objeto || {};
      const f = o.hierarquizacao?.fase_2 || {};
      const grade = f.indice_favorabilidade_grade;
      const rede = f.indice_favorabilidade_rede;
      const status = Number.isFinite(grade) && Number.isFinite(rede) ? '<span class="fase-status fase-status--ok">Calculado</span>' : '<span class="fase-status fase-status--warn">Pendente</span>';
      return `<tr><td>${status}</td><td><strong>${esc(c.codigo)}</strong><br><small>${esc(c.nome || "")}</small></td><td>${Number.isFinite(grade) ? Number(grade).toFixed(4) : "—"}</td><td>${Number.isFinite(rede) ? Number(rede).toFixed(4) : "—"}</td></tr>`;
    }).join("");
    $("fase2-resultados").innerHTML = rows || '<tr><td colspan="4" class="fase-empty">A rodada não possui demandas.</td></tr>';
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
    mover("gp-favorabilidade-ctrl", "ctrl-camada-grade", "ctrl-camada-rede");
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
      const respostaCamadas = await fetch("/api/geoespacial/biblioteca-canonica/arquivos?modulo=ambos", { credentials: "same-origin" });
      if (!respostaCamadas.ok) throw new Error("Não foi possível consultar a biblioteca canônica de camadas.");
      camadas = (await respostaCamadas.json()).filter((camada) => camada.registrada && camada.homologacao_id && /\.(tif|tiff)$/i.test(camada.arquivo || ""));
      const opcoes = '<option value="">Selecione…</option>' + camadas.map((camada) => `<option value="${esc(camada.homologacao_id)}">${esc(camada.nome_publicacao || camada.nome)} · ${esc(camada.versao || "—")}</option>`).join("");
      $("camada-grade-fase2").innerHTML = opcoes;
      $("camada-rede-fase2").innerHTML = opcoes;
      $("camada-grade-fase2").onchange = renderCamadas;
      $("camada-rede-fase2").onchange = renderCamadas;
      $("executar-fase2").onclick = async () => {
        const h = atual(); const grade = $("camada-grade-fase2").value; const rede = $("camada-rede-fase2").value;
        if (!h || !grade || !rede) return erro("Selecione a hierarquização e as duas superfícies homologadas.");
        if (grade === rede) return erro("Selecione camadas diferentes para grade e rede.");
        try {
          $("fase2-erro").classList.add("hidden");
          const updated = await HierApi.executarFase2(h.codigo, { camada_grade_id: grade, camada_rede_id: rede, metodo_extracao: "ponto" });
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
