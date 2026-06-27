(function (global) {
  // Widget reutilizável de "área de abrangência": seleciona unidades espaciais
  // da tabela geo (por regionalização) e mostra um preview em Leaflet.
  let seq = 0;

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function create(opts) {
    const container = opts.container;
    if (!container) throw new Error("Abrangência: container ausente.");
    const uid = `abr-${++seq}`;
    const selected = new Map(); // id -> { nome, tipo }
    let map = null;
    let layer = null;

    container.innerHTML = `
      <div class="abrangencia-widget">
        <div class="form-grid">
          <div>
            <label for="${uid}-tipo">Regionalização <span class="req">*</span></label>
            <select id="${uid}-tipo"><option value="">Carregando…</option></select>
          </div>
          <div>
            <label for="${uid}-unidade">Unidades</label>
            <select id="${uid}-unidade" multiple size="6" disabled>
              <option value="">Selecione a regionalização</option>
            </select>
          </div>
          <div class="full">
            <button type="button" class="btn btn-secondary" id="${uid}-add">Adicionar à abrangência</button>
          </div>
          <div class="full">
            <p class="field-help">Selecionadas:</p>
            <div id="${uid}-chips" class="abrangencia-chips"></div>
          </div>
          <div class="full">
            <div id="${uid}-map" class="abrangencia-map"></div>
            <p id="${uid}-status" class="field-help">Nenhuma unidade selecionada.</p>
          </div>
        </div>
      </div>`;

    const $ = (sufixo) => document.getElementById(`${uid}-${sufixo}`);

    function ensureMap() {
      if (map) return map;
      map = L.map(`${uid}-map`, { zoomControl: true }).setView([-22.5, -48.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      setTimeout(() => map.invalidateSize(), 60);
      return map;
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

    async function refreshMap() {
      const status = $("status");
      const ids = Array.from(selected.keys());
      ensureMap();
      if (layer) {
        map.removeLayer(layer);
        layer = null;
      }
      if (!ids.length) {
        status.textContent = "Nenhuma unidade selecionada.";
        return;
      }
      status.textContent = "Carregando geometria…";
      try {
        const fc = await SLTDemandasApi.geoUnidadesGeojson(ids);
        layer = L.geoJSON(fc, {
          style: { color: "#1d4ed8", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.18 },
        }).addTo(map);
        const b = layer.getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.1));
        status.textContent = `${ids.length} unidade(s) na abrangência.`;
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
          tipos.map((t) => `<option value="${escapeHtml(t.codigo)}">${escapeHtml(t.nome)}</option>`).join("");
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
    $("add").addEventListener("click", () => {
      const sel = $("unidade");
      Array.from(sel.selectedOptions).forEach((opt) => {
        if (opt.value) selected.set(opt.value, { nome: opt.textContent, tipo: $("tipo").value });
      });
      renderChips();
      refreshMap();
    });

    loadTipos();
    renderChips();

    return {
      getSelectedIds: () => Array.from(selected.keys()),
      reset: () => {
        selected.clear();
        renderChips();
        refreshMap();
      },
      invalidateSize: () => map && map.invalidateSize(),
    };
  }

  global.SLTAbrangencia = { create };
})(window);
