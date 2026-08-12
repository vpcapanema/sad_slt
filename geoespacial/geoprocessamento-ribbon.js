(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);

  function message(text) {
    const status = $("#gp-save-state");
    status.textContent = text;
    clearTimeout(message.timer);
    message.timer = setTimeout(() => status.textContent = "Ambiente local", 3500);
  }

  function openToolbox(scope = "geral") {
    const app = $(".gp-app");
    const tab = $('[data-right-tab="tools"]');
    app.classList.remove("right-collapsed");
    tab.hidden = false;
    tab.click();
    window.gpApp.openToolboxScope?.(scope);
    $("#gp-tool-search").focus();
  }

  function activeLayerId() {
    return $("[data-layer].active")?.dataset.layer || window.gpApp.state.activeLayerId || null;
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));

  async function request(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json", ...(options.headers || {}) }, ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `Falha na solicitação (${response.status})`);
    return body;
  }

  function openPanel(title, html) {
    const app = $(".gp-app"), tab = $('[data-right-tab="tools"]');
    app.classList.remove("right-collapsed");
    tab.hidden = false;
    tab.click();
    $("#gp-right-title").textContent = title;
    $("#gp-tools-view").classList.remove("active");
    $("#gp-editor-view").classList.add("active");
    $("#gp-editor-view").innerHTML = html;
    window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
  }

  async function openSystemDirectory() {
    openPanel("Importar do sistema", '<div class="empty">Consultando o diretório…</div>');
    let atual = { caminho: "", pai: null, pastas: [], arquivos: [] };

    const fetchDir = async (caminho = "") => {
      atual = await request(`/api/geoespacial/camadas-arquivo/navegar?caminho=${encodeURIComponent(caminho || "")}`);
    };

    const breadcrumb = (caminho) => {
      const partes = caminho ? caminho.split("/") : [];
      const trilha = [`<button type="button" class="dir-crumb" data-nav-dir="">data/geoespacial</button>`];
      let acc = "";
      for (const parte of partes) {
        acc = acc ? `${acc}/${parte}` : parte;
        trilha.push(`<span class="dir-sep">/</span><button type="button" class="dir-crumb" data-nav-dir="${escapeHtml(acc)}">${escapeHtml(parte)}</button>`);
      }
      return `<nav class="dir-breadcrumb">${trilha.join("")}</nav>`;
    };

    const render = () => {
      const voltar = atual.caminho
        ? `<button type="button" class="tool-row dir-up" data-nav-dir="${escapeHtml(atual.pai || "")}"><i data-lucide="corner-left-up"></i><span class="tool-name">.. (voltar)</span></button>`
        : "";
      const pastas = (atual.pastas || []).map((p) =>
        `<button type="button" class="tool-row dir-folder" data-nav-dir="${escapeHtml(p.caminho)}"><i data-lucide="folder"></i><span class="tool-name">${escapeHtml(p.nome)}</span></button>`
      ).join("");
      const arquivos = (atual.arquivos || []).map((a) =>
        `<button type="button" class="tool-row dir-file" data-load-file="${escapeHtml(a.arquivo)}"><i data-lucide="file"></i><span class="tool-name">${escapeHtml(a.nome)}</span><span>${escapeHtml(a.formato || "")}</span></button>`
      ).join("");
      const vazio = (!pastas && !arquivos) ? '<div class="empty compact">Pasta vazia.</div>' : "";
      return `<div class="editor-head"><button class="icon-btn" data-directory-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>Importar do sistema</h2></div>`
        + `<div class="editor-body">`
        + `<p class="field-help">Navegue por data/geoespacial e suas subpastas. Clique numa pasta para abrir e num arquivo para carregar no mapa.</p>`
        + breadcrumb(atual.caminho)
        + `<div class="dir-list">${voltar}${pastas}${arquivos}${vazio}</div>`
        + `</div>`;
    };

    const paint = () => {
      $("#gp-editor-view").innerHTML = render();
      window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
      $("[data-directory-back]").onclick = () => window.gpApp.showTools();
    };

    try {
      await fetchDir("");
      paint();

      // onclick (não addEventListener) evita empilhar handlers a cada abertura do painel.
      $("#gp-editor-view").onclick = async (event) => {
        const nav = event.target.closest("[data-nav-dir]");
        if (nav) {
          try {
            await fetchDir(nav.dataset.navDir);
            paint();
          } catch (error) {
            message(`Falha ao abrir pasta: ${error.message}`);
          }
          return;
        }

        const button = event.target.closest("[data-load-file]");
        if (!button) return;
        button.disabled = true;
        const progress = window.gpApp.createTaskProgress($("#gp-editor-view"));
        try {
          const form = new FormData();
          form.append("arquivo", button.dataset.loadFile);
          const result = await request("/api/geoespacial/camadas-arquivo/carregar", { method: "POST", body: form, headers: {} });
          const resource = result.recursos?.[0];
          const id = resource?.id;
          if (!id) throw new Error("O arquivo não gerou uma camada carregável");
          const index = window.gpApp.state.layers.findIndex((layer) => layer.id === id);
          if (index >= 0) window.gpApp.state.layers[index] = resource;
          else window.gpApp.state.layers.push(resource);
          progress.note("Camada incorporada ao estado visual da sessão");
          await window.gpApp.addCatalogLayerToMap(id, true);
          window.gpApp.renderLayers();
          progress.note("Representação espacial desenhada no mapa");
          progress.complete();
          message("Camada vinculada ao Painel de Conteúdo.");
        } catch (error) {
          progress.fail(`Falha: ${error.message}`);
          message(error.message);
        } finally { button.disabled = false; }
      };
    } catch (error) {
      openPanel("Importar do sistema", `<div class="empty">${escapeHtml(error.message)}</div>`);
    }
  }

  function openHomologation() {
    const id = activeLayerId();
    const layer = window.gpApp.state.layers.find((item) => item.id === id);
    if (!layer) return message("Selecione a camada que será homologada.");
    openPanel("Homologar camada", `<div class="editor-head"><button class="icon-btn" data-homologation-back title="Voltar"><i data-lucide="arrow-left"></i></button><h2>Publicar na biblioteca</h2></div><form id="gp-homologation-form"><div class="editor-body"><p class="field-help">A publicação torna a camada e seu conteúdo imutáveis. As fases 1 e 2 poderão apenas consultá-la.</p><div class="field"><label>Camada</label><input value="${escapeHtml(layer.nome)}" readonly></div><div class="field"><label>Nome de publicação</label><input name="nome_publicacao" value="${escapeHtml(layer.nome)}" required></div><div class="field"><label>Módulo consumidor</label><select name="modulo_consumidor"><option value="ambos">Fases 1 e 2</option><option value="fase1">Fase 1</option><option value="fase2">Fase 2</option></select></div><div class="field"><label>Versão</label><input name="versao" value="v1" required></div><div class="field"><label>Finalidade</label><input name="finalidade"></div><div class="field"><label>Homologado por</label><input name="homologado_por"></div></div><div class="editor-actions"><button class="btn primary">Homologar definitivamente</button></div></form>`);
    $("[data-homologation-back]").onclick = () => window.gpApp.showTools();
    $("#gp-homologation-form").onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.submitter; submit.disabled = true;
      const payload = Object.fromEntries(new FormData(event.target));
      payload.metadados = {};
      const progress = window.gpApp.createTaskProgress(event.target);
      try {
        let job = await request(`/api/geoespacial/camadas/${encodeURIComponent(id)}/homologar-job`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        job = await window.gpApp.waitForJob(job, progress);
        const publication = job.resultado;
        progress.note(`Snapshot homologado confirmado: ${publication.id}`);
        progress.complete();
        window.gpApp.log(`Camada homologada e sincronizada — banco + ${publication.arquivo_biblioteca_canonica}`, "ok");
        message("Camada publicada (banco e biblioteca canônica).");
        setTimeout(() => openSystemDirectory(), 900);
      } catch (error) {
        progress.fail(`Falha: ${error.message}`);
        window.gpApp.log(`Homologação não concluída: ${error.message}`, "error");
        document.querySelector("#gp-log")?.classList.add("open");
        message(error.message);
        submit.disabled = false;
      }
    };
  }

  function openOperation(id, values = {}) {
    openToolbox();
    window.gpApp.selectOp(id);
    setTimeout(() => {
      const form = $("#gp-op-form");
      Object.entries(values).forEach(([name, value]) => {
        if (form?.elements[name]) {
          form.elements[name].value = value;
          form.elements[name].dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      window.gpApp.configureLoadOperation?.();
      window.gpCommands?.applyEnvironments(form);
      window.gpApp.configureSelectionScope?.();
    }, 0);
  }

  function selectOnMap() {
    const map = window.gpApp.state.map;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    map.once("click", (event) => {
      const features = map.queryRenderedFeatures(event.point).filter((feature) => !feature.layer.id.startsWith("basemap-"));
      $("#gp-selection").textContent = `${features.length} selecionada${features.length === 1 ? "" : "s"}`;
      map.dragPan.enable();
      map.getCanvas().style.cursor = "grab";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-ribbon-tools").addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "import-file") openOperation("OP-01", { tipo_entrada: "Local" });
      if (action === "tools") openToolbox("geral");
      if (action === "tools-vector-raster") openToolbox("vetor_raster");
      if (action === "tools-science") openToolbox("cientifica");
      if (action === "tools-interpolation") openToolbox("interpolacao");
      if (action === "run") {
        if ($("#gp-op-form")) $("#gp-op-form").requestSubmit();
        else { openToolbox(); message("Selecione um algoritmo para executar."); }
      }
      if (action === "import-wfs") {
        openOperation("OP-01", { tipo_entrada: "WFS" });
      }
      if (action === "load-system") openSystemDirectory();
      if (action === "basemap") {
        window.gpApp.showBasemapPanel();
      }
      if (action === "explore") {
        window.gpCommands.explore();
      }
      if (action === "select") window.gpCommands.selectOnMap();
      if (action === "clear") window.gpCommands.clearSelection();
      if (action === "fit") window.gpCommands.fitAllLayers().catch(error => message(error.message));
      if (action === "fit-selection") window.gpCommands.fitSelection();
      if (action === "attributes" && !$("[data-layer].active")) {
        message("Selecione uma camada no painel Conteúdo.");
      }
      if (action === "attributes" && activeLayerId()) window.gpApp.showAttributes(activeLayerId());
      if (action === "remove" && !$("[data-layer].active")) {
        message("Selecione uma camada antes de remover.");
      }
      if (action === "remove" && activeLayerId()) {
        window.gpApp.removeLayerFromMap(activeLayerId());
        message("Camada removida do mapa; permanece salva no sistema.");
      }
      if (action === "delete-layer" && !activeLayerId()) message("Selecione a camada que deseja excluir do sistema.");
      if (action === "delete-layer" && activeLayerId()) window.gpApp.deleteLayerFromSystem(activeLayerId()).catch(error => message(error.message));
      if (action === "properties" && activeLayerId()) {
        window.gpApp.showProperties(window.gpApp.state.layers.find(layer => layer.id === activeLayerId()));
      }
      if (action === "properties" && !activeLayerId()) message("Selecione uma camada no painel Conteúdo.");
      if (action === "validate" && activeLayerId()) openOperation("OP-02", { camada_id: activeLayerId() });
      if (action === "reproject" && activeLayerId()) openOperation("OP-03", { camada_id: activeLayerId() });
      if (action === "repair" && activeLayerId()) openOperation("OP-02-CORR", { camada_id: activeLayerId() });
      if (["validate", "reproject", "repair"].includes(action) && !activeLayerId()) message("Selecione uma camada no painel Conteúdo.");
      if (action === "save-result" || action === "save-layer") {
        if (activeLayerId()) openOperation("OP-27", { entrada: activeLayerId() });
        else message("Selecione uma camada ou raster.");
      }
      if (action === "add-result" && activeLayerId()) {
        const id=activeLayerId(),map=window.gpApp.state.map;[id,`${id}-line`,`${id}-point`].forEach(layer=>{if(map.getLayer(layer))map.setLayoutProperty(layer,"visibility","visible")});window.gpApp.zoomToCatalogLayer(id).catch(error => message(error.message));
      }
      if (action === "add-result" && !activeLayerId()) message("Selecione o resultado que deseja adicionar ao mapa.");
      if (["edit-function", "validate-function", "run-function"].includes(action)) window.gpApp.showLibrary("functions");
      if (["edit-flow", "validate-flow", "run-flow"].includes(action)) window.gpApp.showLibrary("flows");
      if (action === "new-function") window.gpApp.newFunction();
      if (action === "new-flow") window.gpApp.newFlow();
      if (action === "history") window.gpApp.showHistory();
      if (action === "environments") window.gpCommands.showEnvironments();
      if (action === "cancel" && !window.gpApp.cancelExecution()) message("Não há execução ativa para cancelar.");
      if (action === "duplicate") window.gpCommands.duplicateDefinition();
      if (action === "import-definition") window.gpCommands.importDefinition();
      if (action === "export-definition") window.gpCommands.exportDefinition();
      if (action === "calculate-field") window.gpCommands.calculateField();
      if (action === "select-attribute") window.gpCommands.selectByAttribute();
      if (action === "filter-layer") window.gpCommands.filterLayer();
      if (action === "refresh-source") window.gpCommands.refreshSource();
      if (action === "homologate-layer") openHomologation();
      if (action === "export") {
        const layer = window.gpApp.state.layers.find(item => item.id === activeLayerId());
        if (layer) openOperation(layer.tipo.toLowerCase().includes("raster") ? "OP-26" : "OP-25", {
          camada_id: layer.id, raster_id: layer.id,
        });
        else message("Selecione uma camada ou raster para exportar.");
      }
    });
  });
})();
