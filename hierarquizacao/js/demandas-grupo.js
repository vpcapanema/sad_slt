(function () {
  "use strict";

  const ALIAS = {
    versao: "Versão",
    cabecalho_grupo: "Cabeçalho do grupo",
    objetos: "Objetos",
    demanda_id: "Identificador da demanda",
    codigo: "Código",
    nome: "Nome",
    descricao: "Descrição",
    tipo_demanda: "Tipo de demanda",
    quantidade_objetos: "Quantidade de objetos",
    matriz_premissas_criterios: "Matriz de premissas e critérios",
    fases_a_executar: "Fases a executar",
    pacotes: "Pacotes utilizados",
    criado_em: "Data de criação",
    cabecalho_objeto: "Cabeçalho do objeto",
    atributos: "Atributos",
    hierarquizacao: "Hierarquização",
    fase_1: "Elegibilidade territorial",
    fase_2: "Favorabilidade de grade e da rede",
    fase_3: "Priorização por atributos",
    sintese: "Síntese",
    restricao: "Restrição",
    risco: "Risco",
    intersecoes: "Interseções",
    resultado: "Resultado",
    executada: "Executada",
    status_fase1: "Resultado da Elegibilidade territorial",
    score_fase2: "Pontuação da Favorabilidade de grade e da rede",
    score_fase3: "Pontuação da Priorização por atributos",
    score_final: "Pontuação final",
    ranking_fase2: "Posição na Favorabilidade de grade e da rede",
    ranking_fase3: "Posição na Priorização por atributos",
    posicao_final: "Posição final",
  };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  function alias(key) {
    return ALIAS[key] || String(key).replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase());
  }

  function formatLeaf(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "string") {
      const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        return hour ? `${day}/${month}/${year} ${hour}:${minute}` : `${day}/${month}/${year}`;
      }
    }
    return String(value);
  }

  function itemLabel(value, index) {
    if (value && typeof value === "object") {
      const header = value.cabecalho_objeto || value;
      const name = header.nome || value.nome;
      const code = header.codigo || value.codigo;
      if (name) return code ? `${name} (${code})` : String(name);
      if (code) return String(code);
    }
    return `Item ${index + 1}`;
  }

  function jsonNode(key, value, alreadyLabeled) {
    const item = document.createElement("li");
    item.className = "jv-item";
    const label = alreadyLabeled ? String(key) : alias(String(key));
    if (value && typeof value === "object") {
      const entries = Array.isArray(value)
        ? value.map((child, index) => [itemLabel(child, index), child, true])
        : Object.entries(value).map(([childKey, child]) => [childKey, child, false]);
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const count = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
      summary.innerHTML = `<span class="jv-key">${esc(label)}</span> <span class="jv-count">${count}</span>`;
      details.appendChild(summary);
      let loaded = false;
      details.addEventListener("toggle", () => {
        if (!details.open || loaded) return;
        loaded = true;
        const list = document.createElement("ul");
        list.className = "jv-list";
        entries.forEach(([childKey, child, labeled]) => list.appendChild(jsonNode(childKey, child, labeled)));
        details.appendChild(list);
      });
      item.appendChild(details);
    } else {
      item.innerHTML = `<span class="jv-key">${esc(label)}:</span> <span class="jv-val">${esc(formatLeaf(value))}</span>`;
    }
    return item;
  }

  function field(label, value) {
    if (value === null || value === undefined || value === "") return null;
    const element = document.createElement("div");
    element.className = "jv-campo";
    element.innerHTML = `<span class="jv-key">${esc(label)}:</span> <span class="jv-val">${esc(formatLeaf(value))}</span>`;
    return element;
  }

  function groupElement(title) {
    const group = document.createElement("div");
    group.className = "demanda-grupo";
    const heading = document.createElement("h4");
    heading.className = "demanda-grupo-titulo";
    heading.textContent = title;
    group.appendChild(heading);
    return group;
  }

  function fieldGroup(title, fields) {
    const present = fields.filter(Boolean);
    if (!present.length) return null;
    const group = groupElement(title);
    const box = document.createElement("div");
    box.className = "demanda-campos";
    present.forEach((element) => box.appendChild(element));
    group.appendChild(box);
    return group;
  }

  function subtree(label, value) {
    const list = document.createElement("ul");
    list.className = "jv-list";
    if (value && typeof value === "object" && Object.keys(value).length) {
      list.appendChild(jsonNode(label, value, false));
    } else {
      list.innerHTML = `<li class="jv-item"><span class="jv-key">${esc(label)}:</span> <span class="jv-val">—</span></li>`;
    }
    return list;
  }

  function initializeMap(element, geometry, latitude, longitude) {
    const leaflet = window.L;
    if (!leaflet) {
      element.innerHTML = '<p class="jv-mapa-aviso">Mapa indisponível.</p>';
      return;
    }
    const hasGeometry = geometry && geometry.coordinates;
    if (!hasGeometry && (latitude == null || longitude == null)) {
      element.innerHTML = '<p class="jv-mapa-aviso">Geometria não disponível para esta demanda.</p>';
      return;
    }
    const map = leaflet.map(element, { attributionControl: false, scrollWheelZoom: false });
    leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    if (hasGeometry) {
      const geo = { type: geometry.tipo || geometry.type, coordinates: geometry.coordinates };
      const layer = leaflet.geoJSON(geo, { style: { color: "#003b5a", weight: 2, fillColor: "#3ec26e", fillOpacity: 0.2 } }).addTo(map);
      try {
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [12, 12], maxZoom: 15 });
        else map.setView([latitude, longitude], 13);
      } catch (_) {
        map.setView([latitude ?? -22.5, longitude ?? -48.5], 13);
      }
    } else {
      leaflet.marker([latitude, longitude]).addTo(map);
      map.setView([latitude, longitude], 13);
    }
    setTimeout(() => map.invalidateSize(), 80);
  }

  function objectBody(object) {
    const wrapper = document.createElement("div");
    wrapper.className = "demanda-corpo";
    [
      fieldGroup("Identificação", [
        field("Código", object.codigo),
        field("Nome", object.nome),
        field("Tipo de demanda", object.tipo_demanda),
        field("Situação", object.status ? statusLabel(object.status) : null),
        field("Descrição", object.descricao),
      ]),
      fieldGroup("Proponente e vínculo institucional", [
        field("Tipo de demandante", object.tipo_demandante),
        field("Instituição", object.instituicao_nome || object.instituicao_label),
        field("CNPJ", object.instituicao_cnpj),
        field("Representante", object.representante_nome),
        field("E-mail do representante", object.representante_email),
        field("Telefone do representante", object.representante_telefone),
        field("Diretoria", object.diretoria_id),
        field("Plano", object.plano_id),
        field("Programa", object.programa_id_alias || object.programa_nome || object.programa_codigo),
        field("Possui vínculo institucional", object.vinculo_institucional == null ? null : (object.vinculo_institucional ? "Sim" : "Não")),
        field("Tipo de vínculo", object.vinculo_tipo),
      ]),
    ].filter(Boolean).forEach((group) => wrapper.appendChild(group));

    const classification = groupElement("Classificação e complementos");
    classification.appendChild(subtree("Classificação", object.classificacao));
    classification.appendChild(subtree("Complementos", object.complementos));
    wrapper.appendChild(classification);

    const location = groupElement("Localização");
    const fields = document.createElement("div");
    fields.className = "demanda-campos";
    [
      field("Latitude", object.latitude),
      field("Longitude", object.longitude),
      field("Tipo de geometria", object.geometria_tipo || object.geometria?.tipo),
    ].filter(Boolean).forEach((element) => fields.appendChild(element));
    location.appendChild(fields);
    const map = document.createElement("div");
    map.className = "demanda-mapa";
    location.appendChild(map);
    wrapper.appendChild(location);
    setTimeout(() => initializeMap(map, object.geometria, object.latitude, object.longitude), 40);

    const audit = fieldGroup("Datas e auditoria", [
      field("Criado em", object.criado_em || object.criadoEm),
      field("Atualizado em", object.atualizado_em),
      field("Aprovado em", object.aprovado_em),
      field("Situação atualizada em", object.status_atualizado_em),
      field("Motivo da aprovação", object.motivo_aprovacao),
    ]);
    if (audit) wrapper.appendChild(audit);
    return wrapper;
  }

  function statusLabel(code) {
    if (!code) return "—";
    const status = window.SLTStatusColors?.getStatusDemanda?.(code);
    return status?.nome || code;
  }

  function objectItem(object) {
    const item = document.createElement("li");
    item.className = "jv-item";
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const name = object.nome || object.codigo || "Demanda";
    const code = object.codigo ? ` <span class="jv-count">(${esc(object.codigo)})</span>` : "";
    summary.innerHTML = `<span class="jv-key">${esc(name)}</span>${code}`;
    details.appendChild(summary);
    let loaded = false;
    details.addEventListener("toggle", () => {
      if (!details.open || loaded) return;
      loaded = true;
      details.appendChild(objectBody(object));
    });
    item.appendChild(details);
    return item;
  }

  function render(objects) {
    const list = document.createElement("ul");
    list.className = "jv-list jv-root";
    if (!Array.isArray(objects) || !objects.length) {
      list.innerHTML = '<li class="jv-item"><span class="jv-val">Nenhuma demanda vinculada a este grupo.</span></li>';
      return list;
    }
    objects.forEach((object) => list.appendChild(objectItem(object)));
    return list;
  }

  function showModal(id, title, content) {
    const modal = document.getElementById(id);
    if (!modal) return;
    const titleElement = modal.querySelector("[data-modal-title]");
    const body = modal.querySelector("[data-modal-body]");
    if (titleElement) titleElement.textContent = title;
    if (body) {
      body.replaceChildren();
      if (typeof content === "string") body.innerHTML = content;
      else if (content instanceof Node) body.appendChild(content);
    }
    modal.classList.remove("hidden");
  }

  let modalClosuresBound = false;
  function bindModalClosures() {
    if (modalClosuresBound) return;
    modalClosuresBound = true;
    document.querySelectorAll("[data-modal]").forEach((modal) => {
      const closeButton = modal.querySelector("[data-modal-close]");
      if (closeButton) closeButton.onclick = () => modal.classList.add("hidden");
      modal.onclick = (event) => {
        if (event.target === modal) modal.classList.add("hidden");
      };
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") document.querySelectorAll("[data-modal]").forEach((modal) => modal.classList.add("hidden"));
    });
  }

  window.SLTDemandasGrupo = { alias, itemLabel, jsonNode, render, showModal, bindModalClosures };
})();