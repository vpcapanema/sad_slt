(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function setLayerVisibility(id, visible) {
    const map = window.gpApp.state.map;
    [`${id}-point`, `${id}-line`, id].forEach((layer) => {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
    });
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));

  async function requestCatalog(path, options = {}) {
    const response = await fetch(`/api/geoespacial${path}`, { credentials: "include", ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
    return body;
  }

  function catalogRow(icon, title, detail = "", actions = "", kind = "") {
    return `<div class="catalog-item ${kind ? `catalog-item--${kind}` : ""}"><i data-lucide="${icon}"></i><div class="catalog-item-copy"><span title="${escapeHtml(title)}">${escapeHtml(title)}</span>${detail ? `<small title="${escapeHtml(detail)}">${escapeHtml(detail)}</small>` : ""}</div>${actions}</div>`;
  }

  function renderToolbox(toolbox) {
    const groups = toolbox.grupos || [];
    const groupRows = groups.map((group) => {
      const tools = group.ferramentas || [];
      return `<button class="catalog-tree-node catalog-tree-node--group" type="button" data-catalog-group aria-expanded="true"><i class="tree-chevron" data-lucide="chevron-down"></i><i data-lucide="folder"></i><span>${escapeHtml(group.nome)}</span></button><div class="catalog-tree-children">${tools.map((tool) => `<button class="catalog-tool-row" type="button" data-open-operation="${escapeHtml(tool.id)}" title="${escapeHtml(tool.nome)}"><i data-lucide="settings-2"></i><span>${escapeHtml(tool.nome)}</span></button>`).join("")}</div>`;
    }).join("");
    return `<button class="catalog-tree-node" type="button" data-catalog-group aria-expanded="true"><i class="tree-chevron" data-lucide="chevron-down"></i><i data-lucide="briefcase"></i><strong>${escapeHtml(toolbox.nome)}</strong></button><div class="catalog-tree-children">${groupRows || '<div class="empty compact">Nenhuma ferramenta.</div>'}</div>`;
  }

  function renderProject(catalog) {
    const groups = [
      ["mapas", "Mapas", "map"], ["toolboxes", "Toolboxes", "briefcase"],
      ["bancos_de_dados", "Bancos de dados", "database"], ["pastas", "Pastas", "folder"],
      ["conexoes", "Conexões", "plug"],
    ];
    return groups.map(([key, title, icon]) => {
      const rows = catalog[key] || [];
      const content = key === "toolboxes"
        ? rows.map(renderToolbox).join("")
        : rows.map((item) => catalogRow(icon, item.nome, item.tipo || item.caminho || item.url || "", "", key)).join("");
      return `<button class="catalog-group-title catalog-group-title--${key}" type="button" data-catalog-group aria-expanded="true"><i class="tree-chevron" data-lucide="chevron-down"></i><i data-lucide="${icon}"></i><strong>${title}</strong></button><div class="catalog-group-children">${rows.length ? content : '<div class="empty compact">Nenhum recurso.</div>'}</div>`;
    }).join("");
  }

  function renderPortal(services, favorites = false) {
    if (!services.length) return '<div class="empty compact">Nenhum serviço público configurado.</div>';
    return services.map((service) => {
      const title = service.titulo || service.nome || service.servico_nome;
      const serviceId = service.id || service.servico_id;
      const consume = `<button class="icon-btn" data-use-service="${escapeHtml(serviceId)}" title="Selecionar serviço"><i data-lucide="plus"></i></button>`;
      const actions = favorites
        ? `${consume}<button class="icon-btn" data-unfavorite="${escapeHtml(serviceId)}" data-layer="${escapeHtml(service.camada || "")}" title="Remover dos favoritos"><i data-lucide="star-off"></i></button>`
        : `${consume}<button class="icon-btn" data-favorite="${escapeHtml(serviceId)}" title="Adicionar aos favoritos"><i data-lucide="star"></i></button>`;
      const detail = service.camada || service.descricao || service.url;
      const icon = service.tipo === "MAPBIOMAS" ? "land-plot" : service.tipo === "STAC" ? "satellite" : service.tipo === "WMS" || service.tipo === "WMTS" || service.tipo === "XYZ" ? "image" : "network";
      return `<div class="catalog-service-row catalog-service-row--${escapeHtml(service.tipo.toLowerCase())}"><i data-lucide="${icon}"></i><div class="catalog-service-copy"><span title="${escapeHtml(title)}">${escapeHtml(title)}</span><small title="${escapeHtml(detail)}"><b>${escapeHtml(service.tipo)}</b>${detail ? ` · ${escapeHtml(detail)}` : ""}</small></div><div class="catalog-service-actions">${actions}</div></div>`;
    }).join("");
  }

  async function loadCatalog(mode) {
    const tree = $("#gp-catalog-tree");
    tree.innerHTML = '<div class="empty compact">Carregando catálogo…</div>';
    try {
      if (mode === "projeto") tree.innerHTML = renderProject(await requestCatalog("/catalogo/projeto"));
      else {
        const services = await requestCatalog(mode === "portal" ? "/catalogo/portal/servicos" : "/catalogo/favoritos");
        tree.dataset.services = JSON.stringify(services);
        tree.innerHTML = renderPortal(services, mode === "favoritos");
      }
      window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } });
    } catch (error) {
      tree.innerHTML = `<div class="empty compact">${escapeHtml(error.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#gp-layer-list").addEventListener("click", (event) => {
      const zoom = event.target.closest("[data-zoom-layer]");
      if (!zoom) return;
      event.stopPropagation();
      window.gpApp.zoomToCatalogLayer(zoom.dataset.zoomLayer);
    });

    $("#gp-catalog-tree").addEventListener("click", (event) => {
      const operation = event.target.closest("[data-open-operation]");
      if (operation) {
        window.gpApp.openToolboxScope?.("geral");
        window.gpApp.selectOp?.(operation.dataset.openOperation);
        return;
      }
      const group = event.target.closest("[data-catalog-group]");
      if (!group) return;
      const collapsed = group.classList.toggle("collapsed");
      group.setAttribute("aria-expanded", String(!collapsed));
      group.nextElementSibling.hidden = collapsed;
    });

    $(".gp-contents .gp-pane-tabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-left-tab]");
      if (!tab) return;
      $$('[data-left-tab]').forEach((item) => item.classList.toggle("active", item === tab));
      const mode = tab.dataset.leftTab === "source" ? "source" : "drawing";
      window.gpApp.state.leftTab = mode;
      $(".gp-section-title").textContent = mode === "source" ? "Camadas por fonte" : "Ordem de desenho";
      window.gpApp.renderLayers?.();
    });

    $("#gp-layer-list").addEventListener("change", (event) => {
      if (event.target.type !== "checkbox") return;
      const id = event.target.closest("[data-layer]")?.dataset.layer;
      if (id) setLayerVisibility(id, event.target.checked);
    });

    $("#gp-catalog-search").addEventListener("input", (event) => {
      const term = event.target.value.toLocaleLowerCase("pt-BR");
      $$("#gp-catalog-tree .catalog-item, #gp-catalog-tree .catalog-tool-row, #gp-catalog-tree .catalog-service-row").forEach((row) => {
        row.hidden = !row.textContent.toLocaleLowerCase("pt-BR").includes(term);
      });
    });

    $(".gp-project-catalog .gp-pane-tabs").addEventListener("click", async (event) => {
      const tab = event.target.closest("[data-catalog-tab]");
      if (!tab) return;
      $$(".gp-project-catalog .gp-pane-tabs button").forEach((item) => item.classList.toggle("active", item === tab));
      await loadCatalog(tab.dataset.catalogTab);
    });

    $("#gp-catalog-tree").addEventListener("click", async (event) => {
      const favorite = event.target.closest("[data-favorite]");
      const unfavorite = event.target.closest("[data-unfavorite]");
      const consume = event.target.closest("[data-use-service]");
      if (!favorite && !unfavorite && !consume) return;
      try {
        if (consume) {
          const services = JSON.parse($("#gp-catalog-tree").dataset.services || "[]");
          const service = services.find((item) => String(item.id || item.servico_id) === consume.dataset.useService);
          if (!service) throw new Error("Serviço não encontrado no catálogo");
          if (window.gpPortal?.open) await window.gpPortal.open(service);
          else await window.gpApp.consumePortalService(service);
        } else if (favorite) await requestCatalog("/catalogo/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ servico_id: favorite.dataset.favorite }) });
        else await requestCatalog(`/catalogo/favoritos/${encodeURIComponent(unfavorite.dataset.unfavorite)}?camada=${encodeURIComponent(unfavorite.dataset.layer)}`, { method: "DELETE" });
        if (!consume) await loadCatalog($("[data-catalog-tab].active").dataset.catalogTab);
      } catch (error) { window.gpApp?.log?.(error.message, "error"); }
    });

    loadCatalog("projeto");
  });
})();
