(function (global) {
  // Widget reutilizável de "área de abrangência": seleciona unidades espaciais
  // da tabela geo (por regionalização) e mostra um preview em Leaflet.
  let seq = 0;

  const DEFAULT_VIEW = { center: [-22.5, -48.5], zoom: 6 };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applySubsectionNumbers(container, sectionNumber) {
    if (!sectionNumber) return;
    container.querySelectorAll(".cadastro-subsec-num").forEach((el, idx) => {
      el.textContent = `${sectionNumber}.${idx + 1}`;
    });
  }

  function create(opts) {
    const container = opts.container;
    if (!container) throw new Error("Abrangência: container ausente.");
    const uid = `abr-${++seq}`;
    const selected = new Map(); // id -> { nome, tipo }
    let map = null;
    let layer = null;
    let parentLayer = null;
    let contentBounds = null;
    let parentBounds = null;
    let parentFc = null;
    let parentLabel = "";

    container.innerHTML = `
      <div class="abrangencia-widget">
        <div class="form-subsection abrangencia-granularidade">
          <h3><span class="cadastro-subsec-num">1.1</span> Granularidade territorial</h3>
          <p class="step-intro">Escolha a regionalização, selecione uma ou mais unidades territoriais e adicione-as à abrangência.</p>

          <div class="abrangencia-field abrangencia-field--regionalizacao">
            <label for="${uid}-tipo">Regionalização <span class="req">*</span></label>
            <select id="${uid}-tipo"><option value="">Carregando…</option></select>
          </div>

          <div class="abrangencia-unidades-grupo">
            <label for="${uid}-unidade">Unidade(s) territorial(is)</label>
            <select id="${uid}-unidade" class="abrangencia-unidades-select" multiple size="5" disabled>
              <option value="">Selecione a regionalização</option>
            </select>
            <button type="button" class="btn btn-secondary abrangencia-add" id="${uid}-add">Adicionar à abrangência</button>
          </div>

          <div class="abrangencia-selecionadas">
            <p class="field-help">Selecionadas:</p>
            <div id="${uid}-chips" class="abrangencia-chips"></div>
          </div>
        </div>

        <div class="form-subsection abrangencia-preview-sec">
          <h3><span class="cadastro-subsec-num">1.2</span> Preview da abrangência</h3>
          <p class="step-intro">Confira no mapa a composição territorial das unidades adicionadas.</p>
          <p id="${uid}-parent-hint" class="field-help abrangencia-parent-hint hidden" aria-live="polite"></p>
          <div class="abrangencia-map-shell">
            <div id="${uid}-map" class="abrangencia-map"></div>
          </div>
          <p id="${uid}-status" class="field-help">Nenhuma unidade selecionada.</p>
          <div id="${uid}-spatial-ack-row" class="spatial-ack-row hidden">
            <p id="${uid}-spatial-warn" class="error-msg" role="alert"></p>
            <label class="spatial-ack-label">
              <input type="checkbox" id="${uid}-spatial-ack">
              Confirmo que desejo cadastrar fora da abrangência vinculada.
            </label>
          </div>
        </div>
      </div>`;

    applySubsectionNumbers(container, opts.sectionNumber);

    const $ = (sufixo) => document.getElementById(`${uid}-${sufixo}`);

    const PARENT_STYLE = {
      color: "#b45309",
      weight: 2,
      dashArray: "6 4",
      fillColor: "#f59e0b",
      fillOpacity: 0.14,
    };

    const USER_STYLE = {
      color: "#1d4ed8",
      weight: 3,
      fillColor: "#3b82f6",
      fillOpacity: 0.28,
    };

    function fitMapView() {
      ensureMap();
      const boxes = [];
      if (parentBounds?.isValid()) boxes.push(parentBounds);
      if (contentBounds?.isValid()) boxes.push(contentBounds);
      if (!boxes.length) {
        map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
        return;
      }
      let combined = boxes[0];
      for (let i = 1; i < boxes.length; i++) combined = combined.extend(boxes[i]);
      map.fitBounds(combined.pad(0.1));
    }

    function resetMapView() {
      fitMapView();
    }

    function updateParentHint() {
      const hint = $("parent-hint");
      if (!hint) return;
      if (parentFc?.features?.length) {
        hint.textContent = parentLabel
          ? `Contorno tracejado: abrangência do ${parentLabel} (referência do vínculo institucional).`
          : "Contorno tracejado: abrangência do vínculo institucional (referência para validação espacial).";
        hint.classList.remove("hidden");
      } else {
        hint.textContent = "";
        hint.classList.add("hidden");
      }
    }

    function renderParentLayer() {
      ensureMap();
      if (parentLayer) {
        map.removeLayer(parentLayer);
        parentLayer = null;
        parentBounds = null;
      }
      if (!parentFc?.features?.length) {
        updateParentHint();
        fitMapView();
        return;
      }
      parentLayer = L.geoJSON(parentFc, {
        interactive: false,
        pane: "abrParentPane",
        style: PARENT_STYLE,
      }).addTo(map);
      parentLayer.bringToBack();
      const b = parentLayer.getBounds();
      parentBounds = b.isValid() ? b : null;
      updateParentHint();
      fitMapView();
    }

    function setParentReference(fc, label) {
      parentFc = fc?.features?.length ? fc : null;
      parentLabel = label || "";
      renderParentLayer();
    }

    function ensureMap() {
      if (map) return map;
      map = L.map(`${uid}-map`, { zoomControl: false }).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
      map.createPane("abrParentPane");
      map.getPane("abrParentPane").style.zIndex = 350;
      map.createPane("abrUserPane");
      map.getPane("abrUserPane").style.zIndex = 450;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const HomeControl = L.Control.extend({
        options: { position: "topleft" },
        onAdd() {
          const wrap = L.DomUtil.create("div", "abrangencia-map-home-control leaflet-bar");
          const btn = L.DomUtil.create("button", "abrangencia-map-home", wrap);
          btn.type = "button";
          btn.title = "Restaurar visualização original";
          btn.setAttribute("aria-label", "Restaurar visualização original");
          btn.innerHTML = "&#8962;";
          L.DomEvent.disableClickPropagation(btn);
          L.DomEvent.on(btn, "click", (e) => {
            L.DomEvent.stop(e);
            resetMapView();
          });
          return wrap;
        },
      });
      map.addControl(new HomeControl());

      setTimeout(() => map.invalidateSize(), 60);
      return map;
    }

    function initBasemap() {
      ensureMap();
      map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
      requestAnimationFrame(() => {
        if (map) map.invalidateSize();
      });
    }

    function renderChips() {
      const wrap = $("chips");
      if (!selected.size) {
        wrap.innerHTML = '<span class="field-help">—</span>';
        return;
      }
      wrap.innerHTML = Array.from(selected.entries())
        .map(
          ([id, info]) =>
            `<span class="abrangencia-chip" data-id="${escapeHtml(id)}">${escapeHtml(info.nome)}<button type="button" aria-label="Remover">×</button></span>`
        )
        .join("");
      wrap.querySelectorAll(".abrangencia-chip button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.parentElement.dataset.id;
          selected.delete(id);
          renderChips();
          refreshMap();
        });
      });
    }

    let lastContainment = null;

    function resetSpatialAck() {
      const ack = $("spatial-ack");
      if (ack) ack.checked = false;
    }

    async function updateSpatialWarning(ids) {
      const row = $("spatial-ack-row");
      const warn = $("spatial-warn");
      if (!row || !warn) return;
      if (!global.SLTSpatialConstraint?.hasParent() || !ids?.length) {
        lastContainment = null;
        row.classList.add("hidden");
        warn.textContent = "";
        resetSpatialAck();
        opts.onSpatialAnalysis?.(null);
        return;
      }
      try {
        const result = await SLTDemandasApi.analyzeContainmentPrograma({
          unidade_ids: ids,
          parent_unidade_ids: SLTSpatialConstraint.getParentIds(),
        });
        lastContainment = result;
        if (result.status === "inside") {
          row.classList.add("hidden");
          warn.textContent = "";
          resetSpatialAck();
        } else {
          warn.textContent = result.message;
          row.classList.remove("hidden");
          resetSpatialAck();
        }
        opts.onSpatialAnalysis?.(result);
      } catch (err) {
        lastContainment = null;
        row.classList.add("hidden");
        warn.textContent = "";
        opts.onSpatialAnalysis?.(null);
      }
    }

    async function refreshMap() {
      const status = $("status");
      const ids = Array.from(selected.keys());
      ensureMap();
      if (layer) {
        map.removeLayer(layer);
        layer = null;
      }
      contentBounds = null;
      if (!ids.length) {
        status.textContent = parentFc?.features?.length
          ? "Nenhuma unidade selecionada para este programa. Use o mapa como referência do plano vinculado."
          : "Nenhuma unidade selecionada.";
        fitMapView();
        updateSpatialWarning([]);
        return;
      }
      status.textContent = "Carregando geometria…";
      try {
        const fc = await SLTDemandasApi.geoUnidadesGeojson(ids);
        layer = L.geoJSON(fc, {
          pane: "abrUserPane",
          style: USER_STYLE,
        }).addTo(map);
        if (parentLayer) parentLayer.bringToBack();
        layer.bringToFront();
        const b = layer.getBounds();
        contentBounds = b.isValid() ? b : null;
        fitMapView();
        status.textContent = `${ids.length} unidade(s) na abrangência.`;
        updateSpatialWarning(ids);
      } catch (err) {
        status.textContent = "Não foi possível carregar a geometria.";
      }
    }

    async function loadTipos() {
      try {
        const tipos = await SLTDemandasApi.listGeoTipos();
        const sel = $("tipo");
        sel.innerHTML =
          '<option value="">Selecione…</option>' +
          tipos
            .map((t) => {
              const label =
                t.descricao && t.descricao !== t.nome ? t.descricao : t.nome;
              return `<option value="${escapeHtml(t.codigo)}">${escapeHtml(label)}</option>`;
            })
            .join("");
      } catch (err) {
        $("tipo").innerHTML = '<option value="">Falha ao carregar regionalizações</option>';
      }
    }

    async function loadUnidades(tipo) {
      const sel = $("unidade");
      if (!tipo) {
        sel.disabled = true;
        sel.innerHTML = '<option value="">Selecione a regionalização</option>';
        return;
      }
      sel.disabled = true;
      sel.innerHTML = '<option value="">Carregando…</option>';
      try {
        const unidades = await SLTDemandasApi.listGeoUnidades(tipo);
        sel.innerHTML = unidades
          .map((u) => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.nome)}</option>`)
          .join("");
        sel.disabled = false;
      } catch (err) {
        sel.innerHTML = '<option value="">Falha ao carregar unidades</option>';
      }
    }

    $("tipo").addEventListener("change", (e) => loadUnidades(e.target.value));
    $("add").addEventListener("click", async () => {
      const sel = $("unidade");
      const pending = Array.from(sel.selectedOptions).filter((opt) => opt.value);
      if (!pending.length) return;

      pending.forEach((opt) => {
        if (opt.value) selected.set(opt.value, { nome: opt.textContent, tipo: $("tipo").value });
      });
      renderChips();
      refreshMap();
    });

    loadTipos();
    renderChips();
    initBasemap();

    return {
      getSelectedIds: () => Array.from(selected.keys()),
      getSelectedItems: () =>
        Array.from(selected.entries()).map(([id, info]) => ({ id, nome: info.nome, tipo: info.tipo })),
      reset: () => {
        selected.clear();
        renderChips();
        refreshMap();
      },
      invalidateSize: () => {
        ensureMap();
        setTimeout(() => {
          if (!map) return;
          map.invalidateSize();
          renderParentLayer();
          if (layer) {
            const b = layer.getBounds();
            contentBounds = b.isValid() ? b : null;
          }
          fitMapView();
        }, 120);
      },
      setParentReference,
      clearParentReference: () => setParentReference(null),
      isOutsideParent: () => Boolean(lastContainment && lastContainment.status !== "inside"),
      getContainment: () => lastContainment,
      isSpatialAcknowledged: () => {
        if (!lastContainment || lastContainment.status === "inside") return true;
        return Boolean($("spatial-ack")?.checked);
      },
      setSubsectionNumbers: (sectionNumber) => applySubsectionNumbers(container, sectionNumber),
    };
  }

  global.SLTAbrangencia = { create };
})(window);
