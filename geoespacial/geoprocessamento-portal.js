(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));

  async function request(path, options = {}) {
    const response = await fetch(`/api/geoespacial${path}`, {
      credentials: "include",
      headers: { Accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }

  function mapBbox() {
    const bounds = window.gpApp.state.map.getBounds();
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  }

  function formatStacPeriod(form) {
    const start = form.elements.data_inicio.value;
    const end = form.elements.data_fim.value;
    if (!start && !end) return undefined;
    if (!start || !end) throw new Error("Informe as datas inicial e final.");
    if (start > end) throw new Error("A data inicial deve ser anterior ou igual à data final.");
    return `${start}T00:00:00Z/${end}T23:59:59Z`;
  }

  function formatAvailableDate(value) {
    if (!value) return "não informado";
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
  }

  function configureCollectionPeriod(form, collections) {
    const collection = collections.find((item) => item.id === form.elements.colecao.value);
    const start = collection?.inicio?.slice(0, 10) || "";
    const hasOpenEnd = !collection?.fim;
    const end = collection?.fim?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const startInput = form.elements.data_inicio;
    const endInput = form.elements.data_fim;
    startInput.min = start;
    startInput.max = end;
    endInput.min = start;
    endInput.max = end;
    if (startInput.value && (startInput.value < start || startInput.value > end)) startInput.value = "";
    if (endInput.value && (endInput.value < start || endInput.value > end)) endInput.value = "";
    form.querySelector("[data-stac-temporal]").textContent = start
      ? `Série temporal disponível: ${formatAvailableDate(start)} a ${hasOpenEnd ? "hoje" : formatAvailableDate(end)}. Informe as duas datas para filtrar o período. A busca usa automaticamente a extensão atual do mapa.`
      : "A coleção não informa uma série temporal fechada. Informe as duas datas para filtrar o período. A busca usa automaticamente a extensão atual do mapa.";
    const syncRange = () => {
      endInput.min = startInput.value || start;
      startInput.max = endInput.value || end;
    };
    startInput.oninput = syncRange;
    endInput.oninput = syncRange;
  }

  function openPanel(title, html) {
    window.gpApp.openToolboxScope("geral");
    $("#gp-right-title").textContent = title;
    $("#gp-tools-view").classList.remove("active");
    const editor = $("#gp-editor-view");
    editor.classList.add("active");
    editor.innerHTML = html;
    editor.querySelector("[data-portal-back]").onclick = () => window.gpApp.showTools();
    window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
    return editor;
  }

  async function syncResource(result) {
    const resourceId = result.camada_id || result.raster_id;
    const visible = await window.gpApp.refreshLayers(true, resourceId ? [resourceId] : [], resourceId);
    if (resourceId && !visible.has(resourceId)) throw new Error("O recurso foi criado, mas não pôde ser exibido no mapa");
    window.gpApp.log(`${result.nome || "Recurso"} adicionado ao Conteúdo.`, "ok");
  }

  async function openStac(service) {
    const editor = openPanel("Pesquisar imagens", '<div class="editor-head"><button class="icon-btn" data-portal-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>Pesquisar imagens</h2><p>Catálogo STAC · extensão atual do mapa</p></div></div><div class="editor-body"><div class="empty compact">Carregando coleções...</div></div>');
    try {
      const collections = await request(`/catalogo/portal/${encodeURIComponent(service.id || service.servico_id)}/colecoes`);
      editor.querySelector(".editor-body").innerHTML = `<form class="portal-search-form"><div class="field"><label>Coleção</label><select name="colecao" required>${collections.map((collection) => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.titulo)}</option>`).join("")}</select></div><div class="field"><label>Data inicial</label><input name="data_inicio" type="date"></div><div class="field"><label>Data final</label><input name="data_fim" type="date"></div><p class="field-help" data-stac-temporal></p><div class="editor-actions"><button class="btn primary">Pesquisar</button></div></form><div class="portal-results"></div>`;
      const form = editor.querySelector("form");
      form.elements.colecao.onchange = () => configureCollectionPeriod(form, collections);
      configureCollectionPeriod(form, collections);
      form.onsubmit = async (event) => {
        event.preventDefault();
        const submit = event.submitter;
        submit.disabled = true;
        const results = editor.querySelector(".portal-results");
        results.innerHTML = '<div class="empty compact">Pesquisando cenas...</div>';
        try {
          const data = await request("/catalogo/portal/stac/buscar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ servico_id: service.id || service.servico_id, colecao: form.elements.colecao.value, periodo: formatStacPeriod(form), bbox: mapBbox() }) });
          results.innerHTML = data.length ? data.map((item, index) => `<section class="portal-result"><strong title="${escapeHtml(item.titulo)}">${escapeHtml(item.titulo)}</strong><small>${escapeHtml(item.data || "Data não informada")}</small><select data-stac-asset="${index}">${item.assets.map((asset, assetIndex) => `<option value="${assetIndex}">${escapeHtml(asset.titulo)}</option>`).join("")}</select><button class="icon-btn portal-add-to-map" type="button" data-import-stac="${index}" title="Adicionar ao mapa" aria-label="Adicionar ao mapa"><i data-lucide="map-plus"></i></button></section>`).join("") : '<div class="empty compact">Nenhuma cena encontrada nesta extensão e período.</div>';
          window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
          results.onclick = async (click) => {
            const button = click.target.closest("[data-import-stac]");
            if (!button) return;
            const item = data[Number(button.dataset.importStac)];
            const asset = item.assets[Number(results.querySelector(`[data-stac-asset="${button.dataset.importStac}"]`).value)];
            button.disabled = true;
            button.title = "Adicionando ao mapa";
            button.setAttribute("aria-label", "Adicionando ao mapa");
            button.innerHTML = '<i data-lucide="loader-circle" class="spinning"></i>';
            window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
            try {
              await syncResource(await request("/catalogo/portal/stac/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ servico_id: service.id || service.servico_id, url: asset.url, tipo: asset.tipo, titulo: `${item.titulo} · ${asset.titulo}`, bbox: mapBbox() }) }));
              button.title = "Adicionado ao mapa";
              button.setAttribute("aria-label", "Adicionado ao mapa");
              button.innerHTML = '<i data-lucide="circle-check"></i>';
              window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
            } catch (error) {
              button.disabled = false;
              button.title = error.message;
              button.setAttribute("aria-label", `Falha ao adicionar ao mapa: ${error.message}`);
              button.innerHTML = '<i data-lucide="map-plus"></i>';
              window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
            }
          };
        } catch (error) { results.innerHTML = `<div class="empty compact">${escapeHtml(error.message)}</div>`; }
        finally { submit.disabled = false; }
      };
    } catch (error) { editor.querySelector(".editor-body").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
  }

  function openOsm(service) {
    const editor = openPanel("Adicionar dados OpenStreetMap", '<div class="editor-head"><button class="icon-btn" data-portal-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>Adicionar dados OpenStreetMap</h2><p>Consulta limitada à extensão atual do mapa</p></div></div><form class="portal-osm-form"><div class="editor-body"><div class="field"><label>Feições</label><select name="tema"><option value="vias">Vias</option><option value="hidrografia">Hidrografia</option><option value="edificios">Edifícios</option></select></div><p class="field-help">O resultado será salvo como camada vetorial no Catálogo e adicionado ao mapa.</p></div><div class="editor-actions"><button class="btn primary">Adicionar ao mapa</button></div></form>');
    editor.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      button.textContent = "Consultando...";
      try {
        await syncResource(await request("/catalogo/portal/osm/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ servico_id: service.id || service.servico_id, tema: event.target.elements.tema.value, bbox: mapBbox() }) }));
        button.textContent = "Adicionado";
      } catch (error) { button.disabled = false; button.textContent = error.message; }
    };
  }

  async function openMapbiomas(service) {
    const editor = openPanel("MapBiomas", '<div class="editor-head"><button class="icon-btn" data-portal-back title="Voltar"><i data-lucide="arrow-left"></i></button><div><h2>MapBiomas</h2><p>Cobertura e uso anual da terra no Brasil</p></div></div><div class="editor-body"><div class="empty compact">Carregando coleções anuais...</div></div>');
    try {
      const collections = await request(`/catalogo/portal/${encodeURIComponent(service.id || service.servico_id)}/mapbiomas/colecoes`);
      editor.querySelector(".editor-body").innerHTML = `<form class="portal-search-form"><div class="field"><label>Coleção anual</label><select name="colecao">${collections.map((collection) => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.titulo)}</option>`).join("")}</select></div><div class="field"><label>Ano</label><select name="ano"></select></div><p class="field-help" data-mapbiomas-info></p><div class="editor-actions"><button class="btn primary" type="submit">Abrir download oficial</button></div></form>`;
      const form = editor.querySelector("form");
      const updateYears = () => {
        const collection = collections.find((item) => item.id === form.elements.colecao.value);
        form.elements.ano.innerHTML = Array.from({ length: collection.fim - collection.inicio + 1 }, (_, index) => collection.fim - index).map((year) => `<option value="${year}">${year}</option>`).join("");
        form.querySelector("[data-mapbiomas-info]").textContent = `${collection.descricao} Anos disponíveis: ${collection.inicio} a ${collection.fim}. O download é fornecido diretamente pelo MapBiomas sob licença CC-BY.`;
      };
      form.elements.colecao.onchange = updateYears;
      updateYears();
      form.onsubmit = (event) => {
        event.preventDefault();
        const collection = collections.find((item) => item.id === form.elements.colecao.value);
        window.open(collection.url, "_blank", "noopener");
        window.gpApp.log(`MapBiomas: fonte oficial aberta para ${form.elements.ano.value}.`, "ok");
      };
    } catch (error) { editor.querySelector(".editor-body").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
  }

  async function open(service) {
    if (service.tipo === "STAC") return openStac(service);
    if (service.tipo === "OGCAPI") return openOsm(service);
    if (service.tipo === "MAPBIOMAS") return openMapbiomas(service);
    return window.gpApp.consumePortalService(service);
  }

  window.gpPortal = { open };
})();